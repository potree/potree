
Potree.BinaryLoader = function(version, boundingBox, scale){
	if(typeof(version) === "string"){
		this.version = new Potree.Version(version);
	}else{
		this.version = version;
	}

	this.boundingBox = boundingBox;
	this.scale = scale;
};

Potree.BinaryLoader.prototype.load = function(node){
	if(node.loaded){
		return;
	}

	let scope = this;

	let url = node.getURL();

	if(this.version.equalOrHigher("1.4")){
		url += ".bin";
	}

	let xhr = new XMLHttpRequest();
	xhr.open('GET', url, true);
	xhr.responseType = 'arraybuffer';
	xhr.overrideMimeType('text/plain; charset=x-user-defined');
	xhr.onreadystatechange = function() {
		if (xhr.readyState === 4) {
			if (xhr.status === 200 || xhr.status === 0) {
				let buffer = xhr.response;
				scope.parse(node, buffer);
			} else {
				console.log('Failed to load file! HTTP status: ' + xhr.status + ", file: " + url);
			}
		}
	};
	try{
		xhr.send(null);
	}catch(e){
		console.log("fehler beim laden der punktwolke: " + e);
	}
};

Potree.BinaryLoader.prototype.parse = function(node, buffer){

	let numPoints = buffer.byteLength / node.pcoGeometry.pointAttributes.byteSize;
	let pointAttributes = node.pcoGeometry.pointAttributes;

	if(this.version.upTo("1.5")){
		node.numPoints = numPoints;
	}

	let workerPath = Potree.scriptPath + "/workers/BinaryDecoderWorker.js";
	let worker = Potree.workerPool.getWorker(workerPath);
	
	worker.onmessage = function(e){
		let data = e.data;
		let buffers = data.attributeBuffers;
		let tightBoundingBox = new THREE.Box3(
			new THREE.Vector3().fromArray(data.tightBoundingBox.min),
			new THREE.Vector3().fromArray(data.tightBoundingBox.max)
		);

		Potree.workerPool.returnWorker(workerPath, worker);

		let geometry = new THREE.BufferGeometry();

		for(let property in buffers){
			if(buffers.hasOwnProperty(property)){
				let buffer = buffers[property].buffer;
				let attribute = buffers[property].attribute;
				let numElements = attribute.numElements;

				if(parseInt(property) === Potree.PointAttributeNames.POSITION_CARTESIAN){
					geometry.addAttribute("position", new THREE.BufferAttribute(new Float32Array(buffer), 3));
				}else if(parseInt(property) === Potree.PointAttributeNames.COLOR_PACKED){
					geometry.addAttribute("color", new THREE.BufferAttribute(new Uint8Array(buffer), 3, true));
				}else if(parseInt(property) === Potree.PointAttributeNames.INTENSITY){
					geometry.addAttribute("intensity", new THREE.BufferAttribute(new Float32Array(buffer), 1));
				}else if(parseInt(property) === Potree.PointAttributeNames.CLASSIFICATION){
					geometry.addAttribute("classification", new THREE.BufferAttribute(new Uint8Array(buffer), 1));
				}else if(parseInt(property) === Potree.PointAttributeNames.NORMAL_SPHEREMAPPED){
					geometry.addAttribute("normal", new THREE.BufferAttribute(new Float32Array(buffer), 3));
				}else if(parseInt(property) === Potree.PointAttributeNames.NORMAL_OCT16){
					geometry.addAttribute("normal", new THREE.BufferAttribute(new Float32Array(buffer), 3));
				}else if(parseInt(property) === Potree.PointAttributeNames.NORMAL){
					geometry.addAttribute("normal", new THREE.BufferAttribute(new Float32Array(buffer), 3));
				}
			}
		}
		geometry.addAttribute("indices", new THREE.BufferAttribute(new Float32Array(data.indices), 1));

		if(!geometry.attributes.normal){
			let buffer = new Float32Array(numPoints*3);
			geometry.addAttribute("normal", new THREE.BufferAttribute(new Float32Array(buffer), 3));
		}

		geometry.boundingBox = node.boundingBox;
		//geometry.boundingBox = tightBoundingBox;
		node.geometry = geometry;
		//node.boundingBox = tightBoundingBox;
		node.tightBoundingBox = tightBoundingBox;
		node.loaded = true;
		node.loading = false;
		node.pcoGeometry.numNodesLoading--;
	};

	let message = {
		buffer: buffer,
		pointAttributes: pointAttributes,
		version: this.version.version,
		min: [ node.boundingBox.min.x, node.boundingBox.min.y, node.boundingBox.min.z ],
		offset: [node.pcoGeometry.offset.x, node.pcoGeometry.offset.y, node.pcoGeometry.offset.z],
		scale: this.scale
	};
	worker.postMessage(message, [message.buffer]);

};
