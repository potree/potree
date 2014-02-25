

importScripts("PointAttributes.js");
importScripts("PlyLoader.js");

self.onmessage = function(message){
//	postMessage("onmessage");
	var plyFile = message.data;
	PlyBinaryWorker.load(plyFile);
};

/**
 * A worker thread class that loads data from ply files in the background.
 * 
 * @class
 * 
 */
function PlyBinaryWorker(){
	
}

PlyBinaryWorker.load = function PlyLoader_load(source){
//	postMessage("load");
	if(source instanceof Blob){
		PlyBinaryWorker.loadFromFile(source);
	}else if(source instanceof ArrayBuffer){
		PlyBinaryWorker.loadFromBuffer(source);
	}else if(typeof source === 'string'){
		PlyBinaryWorker.loadFromUrl(source);
	}
//	postMessage("sis: " + (source instanceof String));
};

PlyBinaryWorker.loadFromFile = function(source){
	var reader = new FileReaderSync();
	var buffer = reader.readAsArrayBuffer(source);
	PlyBinaryWorker.loadFromBuffer(buffer);
};

PlyBinaryWorker.loadFromUrl = function(source){
//	postMessage("fromUrl");
	var xhr = new XMLHttpRequest();
	xhr.open('GET', source, true);
	xhr.overrideMimeType('text/plain; charset=x-user-defined');
	xhr.responseType = 'arraybuffer';
	xhr.onprogress = function(evt){
		var pFinished = 100 * (evt.loaded / evt.total);
		postMessage({"type": "fileLoadProgress", "percentage": pFinished});
	}
	
	xhr.onreadystatechange = function(){
		if(xhr.readyState === 4){
			if (xhr.status === 200 || xhr.status === 0) {
				var buffer = xhr.response;
				PlyBinaryWorker.loadFromBuffer(buffer);
			} else {
				// post message failed
			}
		}else if(xhr.readyState === 3){
			
			
		}
	};
	
	try{
		xhr.send(null);
	}catch(e){
		// post message failed
	}
};

PlyBinaryWorker.loadFromAscii = function loadFromAscii(plyFile){
	var vertexElement = plyFile.header.elements[0];
	var plyPointAttributes = PlyLoader.pointAttributesFromProperties(vertexElement.properties);
	var pointAttributes = PlyLoader.pointAttributesFromProperties(vertexElement.properties, true);
	var pointBuffer = new ArrayBuffer(pointAttributes.byteSize * vertexElement.size);
	var pointDataView = new DataView(pointBuffer);
	var plyBuffer = plyFile.buffer;
	var plyBufferUint8 = new Uint8Array(plyBuffer, plyFile.header.byteSize);
	
	var currentLineStart = 0;
	var nextLineStart = 0;
	var getNextLineStart = function(){
		for(var i = currentLineStart+1; i < plyBufferUint8.byteLength; i++){
			if(plyBufferUint8[i] === "\n".charCodeAt(0)){
				return i;
			}
		}
		
		return null;
	};
	
	var linesRead = 0;
	var targetOffset = 0;
	var aabb = {
		lx: Infinity,
		ly: Infinity,
		lz: Infinity,
		ux: -Infinity,
		uy: -Infinity,
		uz: -Infinity
	};
	
	while(nextLineStart < plyBuffer.byteLength && nextLineStart != null && targetOffset < pointDataView.byteLength ){
		nextLineStart = getNextLineStart();
		var line = String.fromCharCode.apply(this, plyBufferUint8.subarray(currentLineStart, nextLineStart));
		var tokens = line.trim().split(" ");
//		if(tokens.length !== plyPointAttributes.attributes.length){
//			continue;
//		}
		
		for(var j = 0; j < plyPointAttributes.attributes.length; j++){
			var pointAttribute = plyPointAttributes.attributes[j];
			
			if(pointAttribute === PointAttribute.POSITION_CARTESIAN){
				var x = parseFloat(tokens.shift());
				var y = parseFloat(tokens.shift());
				var z = parseFloat(tokens.shift());
				pointDataView.setFloat32(targetOffset, x, true);
				pointDataView.setFloat32(targetOffset+4, y, true);
				pointDataView.setFloat32(targetOffset+8, z, true);
				
				if(!isNaN(x) && !isNaN(y) && !isNaN(z)){
					aabb.lx = Math.min(aabb.lx, x);
					aabb.ly = Math.min(aabb.ly, y);
					aabb.lz = Math.min(aabb.lz, z);
					aabb.ux = Math.max(aabb.ux, x);
					aabb.uy = Math.max(aabb.uy, y);
					aabb.uz = Math.max(aabb.uz, z);
				}
				
				targetOffset += 12;
			}else if(pointAttribute === PointAttribute.NORMAL_FLOATS){
				var nx = parseFloat(tokens.shift());
				var ny = parseFloat(tokens.shift());
				var nz = parseFloat(tokens.shift());
				pointDataView.setFloat32(targetOffset, nx, true);
				pointDataView.setFloat32(targetOffset+4, ny, true);
				pointDataView.setFloat32(targetOffset+8, nz, true);
				
				targetOffset += 12;
			}else if(pointAttribute === PointAttribute.RGB_PACKED){
				var r = parseInt(tokens.shift());
				var g = parseInt(tokens.shift());
				var b = parseInt(tokens.shift());
				pointDataView.setUint8(targetOffset, r);
				pointDataView.setUint8(targetOffset+1, g);
				pointDataView.setUint8(targetOffset+2, b);
				pointDataView.setUint8(targetOffset+3, 255);
				
				targetOffset += 4;
			}else if(pointAttribute === PointAttribute.RGBA_PACKED){
				var r = parseInt(tokens.shift());
				var g = parseInt(tokens.shift());
				var b = parseInt(tokens.shift());
				var a = parseInt(tokens.shift());
				pointDataView.setUint8(targetOffset, r);
				pointDataView.setUint8(targetOffset+1, g);
				pointDataView.setUint8(targetOffset+2, b);
				pointDataView.setUint8(targetOffset+3, a);
				targetOffset += 4;
			}
		}
		
		linesRead++;
		if((linesRead % (1000)) === 0){
			var message = {
				"type": "progress",
				"pointsLoaded": linesRead 
			};
			postMessage(message);
		}
		
		currentLineStart = nextLineStart;
		
//		if(linesRead >= 10000){
//			break;
//		}
	}
	
	
	var result = {
			"type": "result",
			"buffer": pointBuffer,
			"pointAttributes": pointAttributes,
			"aabb": aabb
	};
	postMessage(result);
	
};

PlyBinaryWorker.loadFromBinary = function loadFromBinary(plyFile){
	var littleEndian = true;
	if(plyFile.header.type === PlyFileType.BINARY_LITTLE_ENDIAN){
		littleEndian = true;
	}else{
		littleEndian = false;
	}
	
//	postMessage({"type": "log", "message": ("binary:" + littleEndian)});
	
	var vertexElement = plyFile.header.elements[0];
//	vertexElement.size = 10000;
	var plyPointAttributes = PlyLoader.pointAttributesFromProperties(vertexElement.properties);
	var pointAttributes = PlyLoader.pointAttributesFromProperties(vertexElement.properties, true);
	var pointBuffer = new ArrayBuffer(pointAttributes.byteSize * vertexElement.size);
	var pointDataView = new DataView(pointBuffer);
	var plyDataView = new DataView(plyFile.buffer, plyFile.header.byteSize);
	var aabb = {
			lx: Infinity,
			ly: Infinity,
			lz: Infinity,
			ux: -Infinity,
			uy: -Infinity,
			uz: -Infinity
		};
	
	for(var i = 0; i < vertexElement.size; i++){
		var targetOffset = i * pointAttributes.byteSize;
		var plyOffset = i * plyPointAttributes.byteSize;
		for(var j = 0; j < plyPointAttributes.attributes.length; j++){
			var pointAttribute = plyPointAttributes.attributes[j];
			
			if(pointAttribute === PointAttribute.POSITION_CARTESIAN){
				var x = plyDataView.getFloat32(plyOffset, littleEndian);
				var y = plyDataView.getFloat32(plyOffset+4, littleEndian);
				var z = plyDataView.getFloat32(plyOffset+8, littleEndian);
				pointDataView.setFloat32(targetOffset, x, true);
				pointDataView.setFloat32(targetOffset+4, y, true);
				pointDataView.setFloat32(targetOffset+8, z, true);
				
//				if(i <= 100){
//					var message = "plyOffset: " + plyOffset;
//					postMessage({"type": "log", "message": message});
//					message = ("x: " + x + ", y: " + y + ", z: " + z);
//					postMessage({"type": "log", "message": message});
//				}
				
				if(!isNaN(x) && !isNaN(y) && !isNaN(z)){
					aabb.lx = Math.min(aabb.lx, x);
					aabb.ly = Math.min(aabb.ly, y);
					aabb.lz = Math.min(aabb.lz, z);
					aabb.ux = Math.max(aabb.ux, x);
					aabb.uy = Math.max(aabb.uy, y);
					aabb.uz = Math.max(aabb.uz, z);
				}
				
				targetOffset += 12;
				plyOffset += 12;
			}else if(pointAttribute === PointAttribute.NORMAL_FLOATS){
				pointDataView.setFloat32(targetOffset, plyDataView.getFloat32(plyOffset, littleEndian), true);
				pointDataView.setFloat32(targetOffset+4, plyDataView.getFloat32(plyOffset+4, littleEndian), true);
				pointDataView.setFloat32(targetOffset+8, plyDataView.getFloat32(plyOffset+8, littleEndian), true);
				targetOffset += 12;
				plyOffset += 12;
			}else if(pointAttribute === PointAttribute.RGB_PACKED){
				pointDataView.setUint8(targetOffset, plyDataView.getUint8(plyOffset));
				pointDataView.setUint8(targetOffset+1, plyDataView.getUint8(plyOffset+1));
				pointDataView.setUint8(targetOffset+2, plyDataView.getUint8(plyOffset+2));
				pointDataView.setUint8(targetOffset+3, 255);
				targetOffset += 4;
				plyOffset += 3;
			}else if(pointAttribute === PointAttribute.RGBA_PACKED){
				pointDataView.setUint8(targetOffset, plyDataView.getUint8(plyOffset));
				pointDataView.setUint8(targetOffset+1, plyDataView.getUint8(plyOffset+1));
				pointDataView.setUint8(targetOffset+2, plyDataView.getUint8(plyOffset+2));
				pointDataView.setUint8(targetOffset+3, plyDataView.getUint8(plyOffset+3));
				targetOffset += 4;
				plyOffset += 4;
			}else{
				plyOffset += pointAttribute.byteSize;
			}
		}
		if(i % (10*1000) === 0){
			var message = {
				"type": "progress",
				"pointsLoaded": i 
			};
			postMessage(message);
		}
	}
	
	var result = {
			"type": "result",
			"buffer": pointBuffer,
			"pointAttributes": pointAttributes,
			"aabb": aabb
	};
	postMessage(result);
};

PlyBinaryWorker.loadFromBuffer = function PlyLoader_loadFromBuffer(buffer){
	var plyFile = new PlyFile(buffer);
	var possibleHeader = String.fromCharCode.apply(null, new Uint8Array(buffer, 0, 5000));
	var headerLength = possibleHeader.indexOf("end_header") + 11;
	if(headerLength === 0){
		throw "unable to read ply header";
	}
	
	var strHeader = possibleHeader.substr(0, headerLength);
	var plyHeader = PlyLoader.parseHeader(strHeader);
	plyFile.header = plyHeader;
	postMessage({
		"type": "header",
		"header": strHeader});
	
	if(plyFile.header.type === PlyFileType.ASCII){
		PlyBinaryWorker.loadFromAscii(plyFile);
	}else{
		PlyBinaryWorker.loadFromBinary(plyFile);
	}
};
