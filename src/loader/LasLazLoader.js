const Version = require('../Version');
const LasLazBatcher = require('./LasLazBatcher');
const laslaz = require('../../libs/plasio/js/laslaz');
const LASDecoder = laslaz.LASDecoder;
const LASFile = laslaz.LASFile;

/**
 * laslaz code taken and adapted from plas.io js-laslaz
 *	http://plas.io/
 *  https://github.com/verma/plasio
 *
 * Thanks to Uday Verma and Howard Butler
 *
 */

module.exports = class LasLazLoader {
	constructor (version) {
		if (typeof (version) === 'string') {
			this.version = new Version(version);
		} else {
			this.version = version;
		}
	}

	static progressCB () {
	}

	load (node) {
		if (node.loaded) {
			return;
		}

		let pointAttributes = node.pcoGeometry.pointAttributes;

		let url = node.getURL();

		if (this.version.equalOrHigher('1.4')) {
			url += '.' + pointAttributes.toLowerCase();
		}

		let scope = this;

		let xhr = new XMLHttpRequest();
		xhr.open('GET', url, true);
		xhr.responseType = 'arraybuffer';
		xhr.overrideMimeType('text/plain; charset=x-user-defined');
		xhr.onreadystatechange = function () {
			if (xhr.readyState === 4) {
				if (xhr.status === 200) {
					let buffer = xhr.response;
					scope.parse(node, buffer);
				} else {
					console.log('Failed to load file! HTTP status: ' + xhr.status + ', file: ' + url);
				}
			}
		};

		xhr.send(null);
	}

	parse (node, buffer) {
		let lf = new LASFile(buffer);
		let handler = new LasLazBatcher(node);
		
		let p = new Promise( (resolve, reject) => {
			
			lf.open()
				.then(function () {
					lf.isOpen = true;
					resolve(lf);
				});
			
		}).then(function (lf) {
			return lf.getHeader().then(function (h) {
				return [lf, h];
			});
		}).then(function (v) {
			let lf = v[0];
			let header = v[1];

			let skip = 1;
			let totalRead = 0;
			let totalToRead = (skip <= 1 ? header.pointsCount : header.pointsCount / skip);
			let reader = function () {
				let p = lf.readData(1000000, 0, skip);
				return p.then(function (data) {
					handler.push(new LASDecoder(data.buffer,
						header.pointsFormatId,
						header.pointsStructSize,
						data.count,
						header.scale,
						header.offset,
						header.mins, header.maxs));

					totalRead += data.count;
					LasLazLoader.progressCB(totalRead / totalToRead);

					if (data.hasMoreData) {
						return reader();
					} else {
						header.totalRead = totalRead;
						header.versionAsString = lf.versionAsString;
						header.isCompressed = lf.isCompressed;
						return [lf, header, handler];
					}
				});
			};

			return reader();
		}).then(function (v) {
			let lf = v[0];
			// we're done loading this file
			//
			LasLazLoader.progressCB(1);

			// Close it
			return lf.close().then(function () {
				lf.isOpen = false;
			});
		});

	}

	handle (node, url) {

	}
};
