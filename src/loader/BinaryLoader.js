
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
	
	var scope = this;

	//var url = node.pcoGeometry.octreeDir + "/" + node.getHierarchyPath() + "/" + node.name;
	//if(this.version.newerThan("1.3")){
	//	url += ".bin";
	//}
	
	var url = node.getURL();
	
	if(this.version.equalOrHigher("1.4")){
		url += ".bin";
	}
	
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
	var numPoints = buffer.byteLength / node.pcoGeometry.pointAttributes.byteSize;
	
	// http://jsperf.com/uint8array-vs-dataview3/3
	function CustomView(buffer) {
		this.buffer = buffer;
		this.u8 = new Uint8Array(buffer);
		
		var tmp = new ArrayBuffer(4);
		var tmpf = new Float32Array(tmp);
		var tmpu8 = new Uint8Array(tmp);
		
		this.getUint32 = function (i) {
			return (this.u8[i+3] << 24) | (this.u8[i+2] << 16) | (this.u8[i+1] << 8) | this.u8[i];
		}
		
		this.getUint16 = function (i) {
			return (this.u8[i+1] << 8) | this.u8[i];
		}
		
		this.getFloat = function(i){
			tmpu8[0] = this.u8[i+0];
			tmpu8[1] = this.u8[i+1];
			tmpu8[2] = this.u8[i+2];
			tmpu8[3] = this.u8[i+3];
			
			return tmpf[0];
		}
		
		this.getUint8 = function(i){
			return this.u8[i];
		}
	}
	var cv = new CustomView(buffer);
	
	var iIndices = new Uint32Array(indices);
	
	var pointAttributes = node.pcoGeometry.pointAttributes;
	
	var offset = 0;
	for(var i = 0; i < pointAttributes.attributes.length; i++){
		var pointAttribute = pointAttributes.attributes[i];
		
		if(pointAttribute === PointAttribute.POSITION_CARTESIAN){
		
			var positions = new Float32Array(numPoints*3);
			
			for(var j = 0; j < numPoints; j++){
				if(this.version.newerThan("1.3")){
					positions[3*j+0] = (cv.getUint32(offset + j*pointAttributes.byteSize+0) * this.scale) + node.boundingBox.min.x;
					positions[3*j+1] = (cv.getUint32(offset + j*pointAttributes.byteSize+4) * this.scale) + node.boundingBox.min.y;
					positions[3*j+2] = (cv.getUint32(offset + j*pointAttributes.byteSize+8) * this.scale) + node.boundingBox.min.z;
				}else{
					positions[3*j+0] = cv.getFloat(j*pointAttributes.byteSize+0) + node.pcoGeometry.offset.x;
					positions[3*j+1] = cv.getFloat(j*pointAttributes.byteSize+4) + node.pcoGeometry.offset.y;
					positions[3*j+2] = cv.getFloat(j*pointAttributes.byteSize+8) + node.pcoGeometry.offset.z;
				}
			}
			
			geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
			
		}else if(pointAttribute === PointAttribute.COLOR_PACKED){
		
			var colors = new Float32Array(numPoints*3);
			
			for(var j = 0; j < numPoints; j++){
				colors[3*j+0] = cv.getUint8(offset + j*pointAttributes.byteSize + 0) / 255;
				colors[3*j+1] = cv.getUint8(offset + j*pointAttributes.byteSize + 1) / 255;
				colors[3*j+2] = cv.getUint8(offset + j*pointAttributes.byteSize + 2) / 255;
			}
			
			geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3));
			
		}else if(pointAttribute === PointAttribute.INTENSITY){
		
			var intensities = new Float32Array(numPoints);
		
			for(var j = 0; j < numPoints; j++){
				var intensity = cv.getUint16(offset + j*pointAttributes.byteSize);
				intensities[j] = intensity;
			}
			
			geometry.addAttribute('intensity', new THREE.BufferAttribute(intensities, 1));
			
		}else if(pointAttribute === PointAttribute.CLASSIFICATION){
		
			var classifications = new Float32Array(numPoints);
		
			for(var j = 0; j < numPoints; j++){
				var classification = cv.getUint8(offset + j*pointAttributes.byteSize);
				classifications[j] = classification;
			}
			
			geometry.addAttribute('classification', new THREE.BufferAttribute(classifications, 1));
			
		}
		
		offset += pointAttribute.byteSize;
		
	}
	
	var indices = new ArrayBuffer(numPoints*4);
	for(var i = 0; i < numPoints; i++){
		iIndices[i] = i;
	}
	geometry.addAttribute('indices', new THREE.BufferAttribute(indices, 1));
	

	
	
	
	geometry.boundingBox = node.boundingBox;
	node.geometry = geometry;
	node.loaded = true;
	node.loading = false;
	node.pcoGeometry.numNodesLoading--;
};


