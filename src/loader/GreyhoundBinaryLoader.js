




Potree.GreyhoundBinaryLoader = class{

	constructor(version, boundingBox, scale){
		if (typeof (version) === 'string') {
			this.version = new Potree.Version(version);
		} else {
			this.version = version;
		}

		this.boundingBox = boundingBox;
		this.scale = scale;
	}

	load(node){
		if (node.loaded) return;

		let scope = this;
		let url = node.getURL();

		let xhr = Potree.XHRFactory.createXMLHttpRequest();
		xhr.open('GET', url, true);
		xhr.responseType = 'arraybuffer';
		xhr.overrideMimeType('text/plain; charset=x-user-defined');

		xhr.onreadystatechange = function () {
			if (xhr.readyState === 4) {
				if (xhr.status === 200 || xhr.status === 0) {
					let buffer = xhr.response;
					scope.parse(node, buffer);
				} else {
					console.log(
						'Failed to load file! HTTP status:', xhr.status,
						'file:', url);
				}
			}
		};

		try {
			xhr.send(null);
		} catch (e) {
			console.log('error loading point cloud: ' + e);
		}
	}

	parse(node, buffer){
		let NUM_POINTS_BYTES = 4;

		let view = new DataView(
			buffer, buffer.byteLength - NUM_POINTS_BYTES, NUM_POINTS_BYTES);
		let numPoints = view.getUint32(0, true);
		let pointAttributes = node.pcoGeometry.pointAttributes;

		node.numPoints = numPoints;

		let workerPath = Potree.scriptPath + '/workers/GreyhoundBinaryDecoderWorker.js';
		let worker = Potree.workerPool.getWorker(workerPath);

		worker.onmessage = function (e) {

			let data = e.data;
			let iAttributes = pointAttributes.attributes
				.map(pa => Potree.toInterleavedBufferAttribute(pa))
				.filter(ia => ia != null);
			iAttributes.push(new Potree.InterleavedBufferAttribute("index", 4, 4, "UNSIGNED_BYTE", true));
			let iBuffer = new Potree.InterleavedBuffer(data.data, iAttributes, numPoints);

			let tightBoundingBox = new THREE.Box3(
				new THREE.Vector3().fromArray(data.tightBoundingBox.min),
				new THREE.Vector3().fromArray(data.tightBoundingBox.max)
			);

			Potree.workerPool.returnWorker(workerPath, worker);

			tightBoundingBox.max.sub(tightBoundingBox.min);
			tightBoundingBox.min.set(0, 0, 0);

			node.numPoints = iBuffer.numElements;
			node.buffer = iBuffer;
			node.mean = new THREE.Vector3(...data.mean);
			node.tightBoundingBox = tightBoundingBox;
			node.loaded = true;
			node.loading = false;
			node.pcoGeometry.numNodesLoading--;
		};

		let bb = node.boundingBox;
		let nodeOffset = node.pcoGeometry.boundingBox.getCenter().sub(node.boundingBox.min);

		let message = {
			buffer: buffer,
			pointAttributes: pointAttributes,
			version: this.version.version,
			schema: node.pcoGeometry.schema,
			min: [bb.min.x, bb.min.y, bb.min.z],
			max: [bb.max.x, bb.max.y, bb.max.z],
			offset: nodeOffset.toArray(),
			scale: this.scale,
			normalize: node.pcoGeometry.normalize
		};

		worker.postMessage(message, [message.buffer]);
	}
}
