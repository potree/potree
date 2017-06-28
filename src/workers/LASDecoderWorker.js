

//var pointFormatReaders = {
//	0: function(dv) {
//		return {
//			"position": [ dv.getInt32(0, true), dv.getInt32(4, true), dv.getInt32(8, true)],
//			"intensity": dv.getUint16(12, true),
//			"classification": dv.getUint8(16, true)
//		};
//	},
//	1: function(dv) {
//		return {
//			"position": [ dv.getInt32(0, true), dv.getInt32(4, true), dv.getInt32(8, true)],
//			"intensity": dv.getUint16(12, true),
//			"classification": dv.getUint8(16, true)
//		};
//	},
//	2: function(dv) {
//		return {
//			"position": [ dv.getInt32(0, true), dv.getInt32(4, true), dv.getInt32(8, true)],
//			"intensity": dv.getUint16(12, true),
//			"classification": dv.getUint8(16, true),
//			"color": [dv.getUint16(20, true), dv.getUint16(22, true), dv.getUint16(24, true)]
//		};
//	},
//	3: function(dv) {
//		return {
//			"position": [ dv.getInt32(0, true), dv.getInt32(4, true), dv.getInt32(8, true)],
//			"intensity": dv.getUint16(12, true),
//			"classification": dv.getUint8(16, true),
//			"color": [dv.getUint16(28, true), dv.getUint16(30, true), dv.getUint16(32, true)]
//		};
//	}
//};
//	
//	
// Decodes LAS records into points
//
//var LASDecoder = function(buffer, pointFormatID, pointSize, pointsCount, scale, offset) {
//	this.arrayb = buffer;
//	this.decoder = pointFormatReaders[pointFormatID];
//	this.pointsCount = pointsCount;
//	this.pointSize = pointSize;
//	this.scale = scale;
//	this.offset = offset;
//};
//
//LASDecoder.prototype.getPoint = function(index) {
//	if (index < 0 || index >= this.pointsCount)
//		throw new Error("Point index out of range");
//
//	var dv = new DataView(this.arrayb, index * this.pointSize, this.pointSize);
//	return this.decoder(dv);
//};

onmessage = function(event){
	var buffer = event.data.buffer;
	var numPoints = event.data.numPoints;
	var pointSize = event.data.pointSize;
	var pointFormatID = event.data.pointFormatID;
	var scale = event.data.scale;
	var offset = event.data.offset;
	var mins = event.data.mins;
	var maxs = event.data.maxs;
	
	var temp = new ArrayBuffer(4);
	var tempUint8 = new Uint8Array(temp);
	var tempUint16 = new Uint16Array(temp);
	var tempFloat32 = new Float32Array(temp);
	var tempInt32 = new Int32Array(temp);
	var bufferView = new Uint8Array(buffer);
	
	var pBuff = new ArrayBuffer(numPoints*3*4);
	var cBuff = new ArrayBuffer(numPoints*3);
	var iBuff = new ArrayBuffer(numPoints*4);
	var clBuff = new ArrayBuffer(numPoints);
	var rnBuff = new ArrayBuffer(numPoints);
	var nrBuff = new ArrayBuffer(numPoints);
	var psBuff = new ArrayBuffer(numPoints * 2);
	
	var positions = new Float32Array(pBuff);
	var colors = new Uint8Array(cBuff);
	var intensities = new Float32Array(iBuff);
	var classifications = new Uint8Array(clBuff);
	var returnNumbers = new Uint8Array(rnBuff);
	var numberOfReturns = new Uint8Array(nrBuff);
	var pointSourceIDs = new Uint16Array(psBuff);
	var tightBoundingBox = {
		min: [ Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY],
		max: [ Number.NEGATIVE_INFINITY , Number.NEGATIVE_INFINITY , Number.NEGATIVE_INFINITY ]
	};
	
	let mean = [0, 0, 0];
	
	
	// temp arrays seem to be significantly faster than DataViews
	// at the moment: http://jsperf.com/dataview-vs-temporary-float64array
	for(var i = 0; i < numPoints; i++){
	
		// POSITION
		tempUint8[0] = bufferView[i*pointSize+0];
		tempUint8[1] = bufferView[i*pointSize+1];
		tempUint8[2] = bufferView[i*pointSize+2];
		tempUint8[3] = bufferView[i*pointSize+3];
		var x = tempInt32[0];
		
		tempUint8[0] = bufferView[i*pointSize+4];
		tempUint8[1] = bufferView[i*pointSize+5];
		tempUint8[2] = bufferView[i*pointSize+6];
		tempUint8[3] = bufferView[i*pointSize+7];
		var y = tempInt32[0];
		
		tempUint8[0] = bufferView[i*pointSize+8];
		tempUint8[1] = bufferView[i*pointSize+9];
		tempUint8[2] = bufferView[i*pointSize+10];
		tempUint8[3] = bufferView[i*pointSize+11];
		var z = tempInt32[0];
		
		x = x * scale[0] + offset[0] - event.data.mins[0]; 
		y = y * scale[1] + offset[1] - event.data.mins[1]; 
		z = z * scale[2] + offset[2] - event.data.mins[2]; 
		
		positions[3*i+0] = x;
		positions[3*i+1] = y;
		positions[3*i+2] = z;
		
		mean[0] += x / numPoints;
		mean[1] += y / numPoints;
		mean[2] += z / numPoints;
		
		tightBoundingBox.min[0] = Math.min(tightBoundingBox.min[0], positions[3*i+0]);
		tightBoundingBox.min[1] = Math.min(tightBoundingBox.min[1], positions[3*i+1]);
		tightBoundingBox.min[2] = Math.min(tightBoundingBox.min[2], positions[3*i+2]);
		
		tightBoundingBox.max[0] = Math.max(tightBoundingBox.max[0], positions[3*i+0]);
		tightBoundingBox.max[1] = Math.max(tightBoundingBox.max[1], positions[3*i+1]);
		tightBoundingBox.max[2] = Math.max(tightBoundingBox.max[2], positions[3*i+2]);
		
		// INTENSITY
		tempUint8[0] = bufferView[i*pointSize+12];
		tempUint8[1] = bufferView[i*pointSize+13];
		var intensity = tempUint16[0];
		intensities[i] = intensity;
		
		// RETURN NUMBER, stored in the first 3 bits - 00000111
		var returnNumber = bufferView[i*pointSize+14] & 7;
		returnNumbers[i] = returnNumber;
		
		// NUMBER OF RETURNS, stored in 00111000
		numberOfReturns[i] = (bufferView[i*pointSize+14] & 56) / 8;
		
		// CLASSIFICATION
		var classification = bufferView[i*pointSize+15];
		classifications[i] = classification;
		
		// POINT SOURCE ID
		tempUint8[0] = bufferView[i*pointSize+18];
		tempUint8[1] = bufferView[i*pointSize+19];
		var pointSourceID = tempUint16[0];
		pointSourceIDs[i] = pointSourceID;
		
		// COLOR, if available
		if(pointFormatID === 2){
			tempUint8[0] = bufferView[i*pointSize+20];
			tempUint8[1] = bufferView[i*pointSize+21];
			var r = tempUint16[0];
			
			tempUint8[0] = bufferView[i*pointSize+22];
			tempUint8[1] = bufferView[i*pointSize+23];
			var g = tempUint16[0];
			
			tempUint8[0] = bufferView[i*pointSize+24];
			tempUint8[1] = bufferView[i*pointSize+25];
			var b = tempUint16[0];
			
			colors[3*i+0] = r / 256;
			colors[3*i+1] = g / 256;
			colors[3*i+2] = b / 256;
		}
	}
	
	var indices = new ArrayBuffer(numPoints*4);
	var iIndices = new Uint32Array(indices);
	for(var i = 0; i < numPoints; i++){
		iIndices[i] = i;
	}
	
	var message = {
		mean: mean,
		position: pBuff, 
		color: cBuff, 
		intensity: iBuff,
		classification: clBuff,
		returnNumber: rnBuff,
		numberOfReturns: nrBuff,
		pointSourceID: psBuff,
		tightBoundingBox: tightBoundingBox,
		indices: indices
	};
		
	var transferables = [
		message.position,
		message.color, 
		message.intensity,
		message.classification,
		message.returnNumber,
		message.numberOfReturns,
		message.pointSourceID,
		message.indices];
		
	postMessage(message, transferables);
};
