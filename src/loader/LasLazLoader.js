
/**
 * laslaz code taken and adapted from plas.io js-laslaz
 *	http://plas.io/
 *  https://github.com/verma/plasio
 *
 * Thanks to Uday Verma and Howard Butler
 *
 */

Potree.LasLazLoader = class LasLazLoader {
	constructor (version) {
		if (typeof (version) === 'string') {
			this.version = new Potree.Version(version);
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
		let handler = new Potree.LasLazBatcher(node);

		return Promise.resolve(lf).cancellable().then(function (lf) {
			return lf.open()
				.then(function () {
					lf.isOpen = true;
					return lf;
				})
				.catch(Promise.CancellationError, function (e) {
					// open message was sent at this point, but then handler was not called
					// because the operation was cancelled, explicitly close the file
					return lf.close().then(function () {
						throw e;
					});
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
					Potree.LasLazLoader.progressCB(totalRead / totalToRead);

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
			Potree.LasLazLoader.progressCB(1);

			// Close it
			return lf.close().then(function () {
				lf.isOpen = false;
				// Delay this a bit so that the user sees 100% completion
				//
				return Promise.delay(200).cancellable();
			}).then(function () {
				// trim off the first element (our LASFile which we don't really want to pass to the user)
				//
				return v.slice(1);
			});
		}).catch(Promise.CancellationError, function (e) {
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
	}

	handle (node, url) {

	}
};

Potree.LasLazBatcher = class LasLazBatcher {
	constructor (node) {
		this.node = node;
	}

	push (lasBuffer) {
		let workerPath = Potree.scriptPath + '/workers/LASDecoderWorker.js';
		let worker = Potree.workerPool.getWorker(workerPath);

		worker.onmessage = (e) => {
			let geometry = new THREE.BufferGeometry();
			let numPoints = lasBuffer.pointsCount;

			/*
			TODO Unused:
			let endsWith = function (str, suffix) {
				return str.indexOf(suffix, str.length - suffix.length) !== -1;
			};
			*/

			let positions = e.data.position;
			let colors = new Uint8Array(e.data.color);
			let intensities = e.data.intensity;
			let classifications = new Uint8Array(e.data.classification);
			let returnNumbers = new Uint8Array(e.data.returnNumber);
			let numberOfReturns = new Uint8Array(e.data.numberOfReturns);
			let pointSourceIDs = new Uint16Array(e.data.pointSourceID);
			// let indices = new ArrayBuffer(numPoints*4);
			// let iIndices = new Uint32Array(indices);

			// let box = new THREE.Box3();
			//
			// let fPositions = new Float32Array(positions);
			// for(let i = 0; i < numPoints; i++){
			//	box.expandByPoint(new THREE.Vector3(fPositions[3*i+0], fPositions[3*i+1], fPositions[3*i+2]));
			// }

			geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
			geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3, true));
			geometry.addAttribute('intensity', new THREE.BufferAttribute(new Float32Array(intensities), 1));
			geometry.addAttribute('classification', new THREE.BufferAttribute(classifications, 1));
			geometry.addAttribute('returnNumber', new THREE.BufferAttribute(returnNumbers, 1));
			geometry.addAttribute('numberOfReturns', new THREE.BufferAttribute(numberOfReturns, 1));
			geometry.addAttribute('pointSourceID', new THREE.BufferAttribute(pointSourceIDs, 1));
			geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(numPoints * 3), 3));

			let indicesAttribute = new THREE.Uint8BufferAttribute(e.data.indices, 4);
			indicesAttribute.normalized = true;
			geometry.addAttribute('indices', indicesAttribute);

			let tightBoundingBox = new THREE.Box3(
				new THREE.Vector3().fromArray(e.data.tightBoundingBox.min),
				new THREE.Vector3().fromArray(e.data.tightBoundingBox.max)
			);

			geometry.boundingBox = this.node.boundingBox;
			this.node.tightBoundingBox = tightBoundingBox;

			this.node.geometry = geometry;
			this.node.loaded = true;
			this.node.loading = false;
			this.node.pcoGeometry.numNodesLoading--;
			this.node.mean = new THREE.Vector3(...e.data.mean);

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
};
