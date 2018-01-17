
Potree.BinaryLoader = function (version, boundingBox, scale) {
	if (typeof (version) === 'string') {
		this.version = new Potree.Version(version);
	} else {
		this.version = version;
	}

	this.boundingBox = boundingBox;
	this.scale = scale;
};

Potree.BinaryLoader.prototype.load = function (node) {
	if (node.loaded) {
		return;
	}

	let scope = this;

	let url = node.getURL();

	if (this.version.equalOrHigher('1.4')) {
		url += '.bin';
	}

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
				console.log('Failed to load file! HTTP status: ' + xhr.status + ', file: ' + url);
			}
		}
	};
	try {
		xhr.send(null);
	} catch (e) {
		console.log('fehler beim laden der punktwolke: ' + e);
	}
};

Potree.BinaryLoader.prototype.parse = function (node, buffer) {
	let pointAttributes = node.pcoGeometry.pointAttributes;
	let numPoints = buffer.byteLength / node.pcoGeometry.pointAttributes.byteSize;

	if (this.version.upTo('1.5')) {
		node.numPoints = numPoints;
	}

	let workerPath = Potree.scriptPath + '/workers/BinaryDecoderWorker.js';
	let worker = Potree.workerPool.getWorker(workerPath);

	worker.onmessage = function (e) {

		let data = e.data;
		let iAttributes = pointAttributes.attributes
			.map(pa => Potree.toInterleavedBufferAttribute(pa))
			.filter(ia => ia != null);
		iAttributes.push(new Potree.InterleavedBufferAttribute("index", 4, 4, "UNSIGNED_BYTE", true));
		let iBuffer = new Potree.InterleavedBuffer(data.data, iAttributes, numPoints);

		//console.log(data.estimatedSpacing);

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
		node.estimatedSpacing = data.estimatedSpacing;
		node.pcoGeometry.numNodesLoading--;
	};

	let message = {
		buffer: buffer,
		pointAttributes: pointAttributes,
		version: this.version.version,
		min: [ node.boundingBox.min.x, node.boundingBox.min.y, node.boundingBox.min.z ],
		offset: [node.pcoGeometry.offset.x, node.pcoGeometry.offset.y, node.pcoGeometry.offset.z],
		scale: this.scale,
		spacing: node.spacing,
		hasChildren: node.hasChildren,
	};
	worker.postMessage(message, [message.buffer]);
};
