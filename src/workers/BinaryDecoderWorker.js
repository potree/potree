
// http://jsperf.com/uint8array-vs-dataview3/3
function CustomView(buffer) {
	this.buffer = buffer;
	this.u8 = new Uint8Array(buffer);

	var tmp = new ArrayBuffer(4);
	var tmpf = new Float32Array(tmp);
	var tmpu8 = new Uint8Array(tmp);

	this.getUint32 = function (i) {
		return (this.u8[i+3] << 24) | (this.u8[i+2] << 16) | (this.u8[i+1] << 8) | this.u8[i];
	};

	this.getUint16 = function (i) {
		return (this.u8[i+1] << 8) | this.u8[i];
	};

	this.getFloat = function(i){
		tmpu8[0] = this.u8[i+0];
		tmpu8[1] = this.u8[i+1];
		tmpu8[2] = this.u8[i+2];
		tmpu8[3] = this.u8[i+3];

		return tmpf[0];
	};

	this.getUint8 = function(i){
		return this.u8[i];
	};
}

Potree = {};


onmessage = function(event){
	var buffer = event.data.buffer;
	var pointAttributes = event.data.pointAttributes;
	var numPoints = buffer.byteLength / pointAttributes.byteSize;
	var cv = new CustomView(buffer);
	var version = new Potree.Version(event.data.version);
	var min = event.data.min;
	var nodeOffset = event.data.offset;
	var scale = event.data.scale;
	var tightBoxMin = [ Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
	var tightBoxMax = [ Number.NEGATIVE_INFINITY , Number.NEGATIVE_INFINITY , Number.NEGATIVE_INFINITY ];

	var attributeBuffers = {};
	debugger;

	var offset = 0;
	for(var i = 0; i < pointAttributes.attributes.length; i++){
		var pointAttribute = pointAttributes.attributes[i];

		if(pointAttribute.name === Potree.PointAttribute.POSITION_CARTESIAN.name){

			var buff = new ArrayBuffer(numPoints*4*3);
			var positions = new Float32Array(buff);

			for(var j = 0; j < numPoints; j++){
				if(version.newerThan("1.3")){
					console.log(('x: ' + cv.getUint32(offset + j*pointAttributes.byteSize+0) * scale) + min[0]);

					positions[3*j+0] = (cv.getUint32(offset + j*pointAttributes.byteSize+0) * scale) + min[0];
					positions[3*j+1] = (cv.getUint32(offset + j*pointAttributes.byteSize+4) * scale) + min[1];
					positions[3*j+2] = (cv.getUint32(offset + j*pointAttributes.byteSize+8) * scale) + min[2];
				}else{
					positions[3*j+0] = cv.getFloat(j*pointAttributes.byteSize+0) + nodeOffset[0];
					positions[3*j+1] = cv.getFloat(j*pointAttributes.byteSize+4) + nodeOffset[1];
					positions[3*j+2] = cv.getFloat(j*pointAttributes.byteSize+8) + nodeOffset[2];
				}

				tightBoxMin[0] = Math.min(tightBoxMin[0], positions[3*j+0]);
				tightBoxMin[1] = Math.min(tightBoxMin[1], positions[3*j+1]);
				tightBoxMin[2] = Math.min(tightBoxMin[2], positions[3*j+2]);

				tightBoxMax[0] = Math.max(tightBoxMax[0], positions[3*j+0]);
				tightBoxMax[1] = Math.max(tightBoxMax[1], positions[3*j+1]);
				tightBoxMax[2] = Math.max(tightBoxMax[2], positions[3*j+2]);
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute};

		}else if(pointAttribute.name === Potree.PointAttribute.COLOR_PACKED.name){

			var buff = new ArrayBuffer(numPoints*4*3);
			var colors = new Float32Array(buff);

			for(var j = 0; j < numPoints; j++){
				colors[3*j+0] = cv.getUint8(offset + j*pointAttributes.byteSize + 0) / 255;
				colors[3*j+1] = cv.getUint8(offset + j*pointAttributes.byteSize + 1) / 255;
				colors[3*j+2] = cv.getUint8(offset + j*pointAttributes.byteSize + 2) / 255;
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute};

		}else if(pointAttribute.name === Potree.PointAttribute.INTENSITY.name){

			var buff = new ArrayBuffer(numPoints*4);
			var intensities = new Float32Array(buff);

			for(var j = 0; j < numPoints; j++){
				var intensity = cv.getUint16(offset + j*pointAttributes.byteSize);
				intensities[j] = intensity;
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute};

		}else if(pointAttribute.name === Potree.PointAttribute.CLASSIFICATION.name){

			var buff = new ArrayBuffer(numPoints*4);
			var classifications = new Float32Array(buff);

			for(var j = 0; j < numPoints; j++){
				var classification = cv.getUint8(offset + j*pointAttributes.byteSize);
				classifications[j] = classification;
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute};

		}else if(pointAttribute.name === Potree.PointAttribute.NORMAL_SPHEREMAPPED.name){

			var buff = new ArrayBuffer(numPoints*4*3);
			var normals = new Float32Array(buff);

			for(var j = 0; j < numPoints; j++){
				var bx = cv.getUint8(offset + j * pointAttributes.byteSize + 0);
				var by = cv.getUint8(offset + j * pointAttributes.byteSize + 1);

				var ex = bx / 255;
				var ey = by / 255;

				var nx = ex * 2 - 1;
				var ny = ey * 2 - 1;
				var nz = 1;
				var nw = -1;

				var l = (nx * (-nx)) + (ny * (-ny)) + (nz * (-nw));
				nz = l;
				nx = nx * Math.sqrt(l);
				ny = ny * Math.sqrt(l);

				nx = nx * 2;
				ny = ny * 2;
				nz = nz * 2 - 1;

				normals[3*j + 0] = nx;
				normals[3*j + 1] = ny;
				normals[3*j + 2] = nz;
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute};
		}else if(pointAttribute.name === Potree.PointAttribute.NORMAL_OCT16.name){

			var buff = new ArrayBuffer(numPoints*4*3);
			var normals = new Float32Array(buff);
			for(var j = 0; j < numPoints; j++){
				var bx = cv.getUint8(offset + j * pointAttributes.byteSize + 0);
				var by = cv.getUint8(offset + j * pointAttributes.byteSize + 1);

				var u = (bx / 255) * 2 - 1;
				var v = (by / 255) * 2 - 1;

				var z = 1 - Math.abs(u) - Math.abs(v);

				var x = 0;
				var y = 0;
				if(z >= 0){
					x = u;
					y = v;
				}else{
					x = - (v/Math.sign(v) - 1) / Math.sign(u);
					y = - (u/Math.sign(u) - 1) / Math.sign(v);
				}

				var length = Math.sqrt(x*x + y*y + z*z);
				x = x / length;
				y = y / length;
				z = z / length;

				normals[3*j + 0] = x;
				normals[3*j + 1] = y;
				normals[3*j + 2] = z;
			}
			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute};
		}else if(pointAttribute.name === Potree.PointAttribute.NORMAL.name){

			var buff = new ArrayBuffer(numPoints*4*3);
			var normals = new Float32Array(buff);
			for(var j = 0; j < numPoints; j++){
				var x = cv.getFloat(offset + j * pointAttributes.byteSize + 0);
				var y = cv.getFloat(offset + j * pointAttributes.byteSize + 4);
				var z = cv.getFloat(offset + j * pointAttributes.byteSize + 8);

				normals[3*j + 0] = x;
				normals[3*j + 1] = y;
				normals[3*j + 2] = z;
			}
			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute};
		}

		offset += pointAttribute.byteSize;
	}

	var indices = new ArrayBuffer(numPoints*4);
	var iIndices = new Uint32Array(indices);
	for(var i = 0; i < numPoints; i++){
		iIndices[i] = i;
	}

	var message = {
		attributeBuffers: attributeBuffers,
		tightBoundingBox: { min: tightBoxMin, max: tightBoxMax },
		indices: indices
	};

	var transferables = [];

	for(var property in message.attributeBuffers){
		if(message.attributeBuffers.hasOwnProperty(property)){
			transferables.push(message.attributeBuffers[property].buffer);
		}
	}

	transferables.push(message.indices);

	postMessage(message, transferables);

};
