
Potree.BinaryLoader = function(version, boundingBox, scale){
	if(typeof(version) === "string"){
		this.version = new Potree.Version(version);
	}else{
		this.version = version;
	}
	
	this.boundingBox = boundingBox;
	this.scale = scale;
};

Potree.BinaryLoader.prototype.newerVersion = function(version){

};

Potree.BinaryLoader.prototype.load = function(node){

	if(node.loaded){
		return;
	}

	var url = node.pcoGeometry.octreeDir + "/" + node.name;
	if(this.version.newerThan("1.3")){
		url += ".bin";
	}
	
	var scope = this;
	
	var xhr = new XMLHttpRequest();
	xhr.open('GET', url, true);
	xhr.responseType = 'arraybuffer';
	xhr.overrideMimeType('text/plain; charset=x-user-defined');
	xhr.onreadystatechange = function() {
		if (xhr.readyState === 4) {
			if (xhr.status === 200 || xhr.status === 0) {
				var buffer = xhr.response;
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
	var geometry = new THREE.BufferGeometry();
	var numPoints = buffer.byteLength / 16;
	
	var positions = new Float32Array(numPoints*3);
	var colors = new Float32Array(numPoints*3);
	var indices = new ArrayBuffer(numPoints*4);
	var color = new THREE.Color();
	
	var fView = new Float32Array(buffer);
	var iView = new Int32Array(buffer);
	var uiView = new Uint8Array(buffer);
	
	var iIndices = new Uint32Array(indices);
	
	for(var i = 0; i < numPoints; i++){
		if(this.version.newerThan("1.3")){
			positions[3*i+0] = (iView[4*i+0] * this.scale) + node.boundingBox.min.x;
			positions[3*i+1] = (iView[4*i+1] * this.scale) + node.boundingBox.min.y;
			positions[3*i+2] = (iView[4*i+2] * this.scale) + node.boundingBox.min.z;
		}else{
			positions[3*i+0] = fView[4*i+0] + node.pcoGeometry.offset.x;
			positions[3*i+1] = fView[4*i+1] + node.pcoGeometry.offset.y;
			positions[3*i+2] = fView[4*i+2] + node.pcoGeometry.offset.z;
		}
		
		color.setRGB(uiView[16*i+12], uiView[16*i+13], uiView[16*i+14]);
		colors[3*i+0] = color.r / 255;
		colors[3*i+1] = color.g / 255;
		colors[3*i+2] = color.b / 255;
		
		iIndices[i] = i;
	}
	
	geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
	geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3));
	geometry.addAttribute('indices', new THREE.BufferAttribute(indices, 1));
	geometry.boundingBox = node.boundingBox;
	node.geometry = geometry;
	node.loaded = true;
	node.loading = false;
	node.pcoGeometry.numNodesLoading--;
};


