
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

		let xhr = Potree.XHRFactory.createXMLHttpRequest();
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
		let node = this.node;

		worker.onmessage = (e) => {
			let numPoints = lasBuffer.pointsCount;

			let attributes = [
				Potree.PointAttribute.POSITION_CARTESIAN,
				Potree.PointAttribute.RGBA_PACKED,
				Potree.PointAttribute.INTENSITY,
				Potree.PointAttribute.CLASSIFICATION,
				Potree.PointAttribute.RETURN_NUMBER,
				Potree.PointAttribute.NUMBER_OF_RETURNS,
				Potree.PointAttribute.SOURCE_ID,
			];

			let data = e.data;
			let iAttributes = attributes
				.map(pa => Potree.toInterleavedBufferAttribute(pa))
				.filter(ia => ia != null);
			iAttributes.push(new Potree.InterleavedBufferAttribute("index", 4, 4, "UNSIGNED_BYTE", true));
			let iBuffer = new Potree.InterleavedBuffer(data.data, iAttributes, numPoints);

			let tightBoundingBox = new THREE.Box3(
				new THREE.Vector3().fromArray(e.data.tightBoundingBox.min),
				new THREE.Vector3().fromArray(e.data.tightBoundingBox.max)
			);

			Potree.workerPool.returnWorker(workerPath, worker);

			node.estimatedSpacing = node.spacing;
			node.numPoints = iBuffer.numElements;
			node.buffer = iBuffer;
			node.mean = new THREE.Vector3(...data.mean);
			node.tightBoundingBox = tightBoundingBox;
			node.loaded = true;
			node.loading = false;
			node.pcoGeometry.numNodesLoading--;


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
