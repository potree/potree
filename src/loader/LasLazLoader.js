

import {Version} from "../Version.js";
import {XHRFactory} from "../XHRFactory.js";

/**
 * laslaz code taken and adapted from plas.io js-laslaz
 *	http://plas.io/
 *  https://github.com/verma/plasio
 *
 * Thanks to Uday Verma and Howard Butler
 *
 */

export class LasLazLoader {

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

		let xhr = XHRFactory.createXMLHttpRequest();
		xhr.open('GET', url, true);
		xhr.responseType = 'arraybuffer';
		xhr.overrideMimeType('text/plain; charset=x-user-defined');
		xhr.onreadystatechange = () => {
			if (xhr.readyState === 4) {
				if (xhr.status === 200) {
					let buffer = xhr.response;
					this.parse(node, buffer);
				} else {
					console.log('Failed to load file! HTTP status: ' + xhr.status + ', file: ' + url);
				}
			}
		};

		xhr.send(null);
	}

	parse(node, buffer){
		let lf = new LASFile(buffer);
		let handler = new LasLazBatcher(node);


		//
		// DEBUG
		//
		// invoke the laz decompress worker thousands of times to check for memory leaks
		// until 2018/03/05, it tended to run out of memory at ~6230 invocations
		// 
		//
		//lf.open()
		//.then( msg => {
		//	lf.isOpen = true;
		//	return lf;
		//}).catch( msg => {
		//	console.log("failed to open file. :(");	
		//}).then( lf => {
		//	return lf.getHeader().then(function (h) {
		//		return [lf, h];
		//	});
		//}).then( v => {
		//	let lf = v[0];
		//	let header = v[1];

		//	lf.readData(1000000, 0, 1)
		//	.then( v => {
		//		console.log("read");

		//		this.parse(node, buffer);
		//	}).then (v => {
		//		lf.close();	
		//	});

		//})



		lf.open()
		.then( msg => {
			lf.isOpen = true;
			return lf;
		}).catch( msg => {
			console.log("failed to open file. :(");	
		}).then( lf => {
			return lf.getHeader().then(function (h) {
				return [lf, h];
			});
		}).then( v => {
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
		}).then( v => {
			let lf = v[0];
			// we're done loading this file
			//
			LasLazLoader.progressCB(1);

			// Close it
			return lf.close().then(function () {
				lf.isOpen = false;

				return v.slice(1);
			}).catch(e => {
				// If there was a cancellation, make sure the file is closed, if the file is open
				// close and then fail
				if (lf.isOpen) {
					return lf.close().then(function () {
						lf.isOpen = false;
						throw e;
					});
				}
				throw e;	
			});	
		});
	}

	handle (node, url) {

	}
};

export class LasLazBatcher{

	constructor (node) {
		this.node = node;
	}

	push (lasBuffer) {
		let workerPath = Potree.scriptPath + '/workers/LASDecoderWorker.js';
		let worker = Potree.workerPool.getWorker(workerPath);
		let node = this.node;

		worker.onmessage = (e) => {
			let geometry = new THREE.BufferGeometry();
			let numPoints = lasBuffer.pointsCount;

			let positions = new Float32Array(e.data.position);
			let colors = new Uint8Array(e.data.color);
			let intensities = new Float32Array(e.data.intensity);
			let classifications = new Uint8Array(e.data.classification);
			let returnNumbers = new Uint8Array(e.data.returnNumber);
			let numberOfReturns = new Uint8Array(e.data.numberOfReturns);
			let pointSourceIDs = new Uint16Array(e.data.pointSourceID);
			let indices = new Uint8Array(e.data.indices);

			geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
			geometry.addAttribute('color', new THREE.BufferAttribute(colors, 4, true));
			geometry.addAttribute('intensity', new THREE.BufferAttribute(intensities, 1));
			geometry.addAttribute('classification', new THREE.BufferAttribute(classifications, 1));
			geometry.addAttribute('returnNumber', new THREE.BufferAttribute(returnNumbers, 1));
			geometry.addAttribute('numberOfReturns', new THREE.BufferAttribute(numberOfReturns, 1));
			geometry.addAttribute('pointSourceID', new THREE.BufferAttribute(pointSourceIDs, 1));
			//geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(numPoints * 3), 3));
			geometry.addAttribute('indices', new THREE.BufferAttribute(indices, 4));
			geometry.attributes.indices.normalized = true;

			let tightBoundingBox = new THREE.Box3(
				new THREE.Vector3().fromArray(e.data.tightBoundingBox.min),
				new THREE.Vector3().fromArray(e.data.tightBoundingBox.max)
			);

			geometry.boundingBox = this.node.boundingBox;
			this.node.tightBoundingBox = tightBoundingBox;

			this.node.geometry = geometry;
			this.node.numPoints = numPoints;
			this.node.loaded = true;
			this.node.loading = false;
			Potree.numNodesLoading--;
			this.node.mean = new THREE.Vector3(...e.data.mean);

			//debugger;

			Potree.workerPool.returnWorker(workerPath, worker);
		};

		let message = {
			buffer: lasBuffer.arrayb,
			numPoints: lasBuffer.pointsCount,
			pointSize: lasBuffer.pointSize,
			pointFormatID: 2,
			scale: lasBuffer.scale,
			offset: lasBuffer.offset,
			mins: lasBuffer.mins,
			maxs: lasBuffer.maxs
		};
		worker.postMessage(message, [message.buffer]);
	};
}
