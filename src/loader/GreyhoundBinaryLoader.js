function networkToNative(val) {
    return ((val & 0x00FF) << 24) |
           ((val & 0xFF00) <<  8) |
           ((val >> 8)  & 0xFF00) |
           ((val >> 24) & 0x00FF);
}

Potree.GreyhoundBinaryLoader = function(version, boundingBox, scale){
	if (typeof(version) === "string") {
		this.version = new Potree.Version(version);
	}
    else {
		this.version = version;
	}

	this.boundingBox = boundingBox;
	this.scale = scale;
};

Potree.GreyhoundBinaryLoader.prototype.load = function(node){
	if (node.loaded) return;

    var scope = this;
	var url = node.getURL();

	var xhr = new XMLHttpRequest();
	xhr.open('GET', url, true);
	xhr.responseType = 'arraybuffer';
	xhr.overrideMimeType('text/plain; charset=x-user-defined');

	xhr.onreadystatechange = function() {
		if (xhr.readyState === 4) {
			if (xhr.status === 200 || xhr.status === 0) {
				var buffer = xhr.response;
				scope.parse(node, buffer);
			}
            else {
				console.log(
                        'Failed to load file! HTTP status:', xhr.status,
                        'file:', url);
			}
		}
	};

	try {
		xhr.send(null);
	}
    catch(e) {
		console.log("error loading point cloud: " + e);
	}
};

Potree.GreyhoundBinaryLoader.prototype.parse = function(node, buffer){
	var NUM_POINTS_BYTES = 4;

    var view = new DataView(
            buffer, buffer.byteLength - NUM_POINTS_BYTES, NUM_POINTS_BYTES);
    var numPoints = networkToNative(view.getUint32(0));
	var pointAttributes = node.pcoGeometry.pointAttributes;

    node.numPoints = numPoints;

	var ww = Potree.workers.greyhoundBinaryDecoder.getWorker();
	ww.onmessage = function(e){
		var data = e.data;
		var buffers = data.attributeBuffers;
		var tightBoundingBox = new THREE.Box3(
			new THREE.Vector3().fromArray(data.tightBoundingBox.min),
			new THREE.Vector3().fromArray(data.tightBoundingBox.max)
		);

		Potree.workers.greyhoundBinaryDecoder.returnWorker(ww);

		var geometry = new THREE.BufferGeometry();

        var addAttribute = function(name, buffer, size) {
            geometry.addAttribute(
                    name,
                    new THREE.BufferAttribute(new Float32Array(buffer), size));
        };

		for (var property in buffers) {
			if (buffers.hasOwnProperty(property)) {
				var buffer = buffers[property].buffer;
				var attribute = buffers[property].attribute;
				var numElements = attribute.numElements;

                var pointAttributes = Potree.PointAttributeNames;

                switch (parseInt(property)) {
                    case pointAttributes.POSITION_CARTESIAN:
                        addAttribute('position', buffer, 3);
						//let fb = new Float32Array(buffer);
						//console.log(fb);
                        break;
                    case pointAttributes.COLOR_PACKED:
                        addAttribute('color', buffer, 3);
                        break;
                    case pointAttributes.INTENSITY:
                        addAttribute('intensity', buffer, 1);
                        break;
                    case pointAttributes.CLASSITICATION:
                        addAttribute('classification', buffer, 1);
                        break;
                    case pointAttributes.NORMAL_SPHEREMAPPED:
                    case pointAttributes.NORMAL_OCT16:
                    case pointAttributes.NORMAL:
                        addAttribute('normal', buffer, 3);
                        break;
                    default:
                        break;
                }
			}
		}

        addAttribute('indices', data.indices, 1);

		if (!geometry.attributes.normal) {
            addAttribute('normal', new Float32Array(numPoints * 3), 3);
        }

		geometry.boundingBox = node.boundingBox;
		node.geometry = geometry;
		node.tightBoundingBox = tightBoundingBox;
		node.loaded = true;
		node.loading = false;
		--node.pcoGeometry.numNodesLoading;
	};

    var bb = node.boundingBox;
    var pco = node.pcoGeometry;
	
	
	//let nodeOffset = node.boundingBox.getSize().multiplyScalar(0.5);
	//let nodeOffset = new THREE.Vector3(0, 0, 0);
	let nodeOffset = node.pcoGeometry.boundingBox.getCenter();

	var message = {
		buffer: buffer,
		pointAttributes: pointAttributes,
		version: this.version.version,
        schema: node.pcoGeometry.schema,
		min: [bb.min.x, bb.min.y, bb.min.z],
		max: [bb.max.x, bb.max.y, bb.max.z],
		offset: nodeOffset.toArray(),
        scale: this.scale
	};

	ww.postMessage(message, [message.buffer]);
};

