

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
	var cBuff = new ArrayBuffer(numPoints*3*4);
	var iBuff = new ArrayBuffer(numPoints*4);
	var clBuff = new ArrayBuffer(numPoints);
	
	var positions = new Float32Array(pBuff);
	var colors = new Float32Array(cBuff);
	var intensities = new Float32Array(iBuff);
	var classifications = new Uint8Array(clBuff);
	
	
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
		
		positions[3*i+0] = x * scale[0] + offset[0] - mins[0];
		positions[3*i+1] = y * scale[1] + offset[1] - mins[1];
		positions[3*i+2] = z * scale[2] + offset[2] - mins[2];
		
		
		// INTENSITY
		tempUint8[0] = bufferView[i*pointSize+12];
		tempUint8[1] = bufferView[i*pointSize+13];
		var intensity = tempUint16[0];
		intensities[i] = intensity;
		
		
		// CLASSIFICATION
		var classification = bufferView[i*pointSize+16];
		classifications[i] = classification;
		
		
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
			
			colors[3*i+0] = r;
			colors[3*i+1] = g;
			colors[3*i+2] = b;
		}
	}
	
	var message = {
		position: pBuff, 
		color: cBuff, 
		intensity: iBuff,
		classification: clBuff};
		
	var transferables = [
		message.position,
		message.color, 
		message.intensity,
		message.classification];
		
	postMessage(message, transferables);
}

//onmessage = function(event){
//	var buffer = event.data.buffer;
//	var numPoints = event.data.numPoints;
//	var pointSize = event.data.pointSize;
//	var pointFormatID = event.data.pointFormatID;
//	var scale = event.data.scale;
//	var offset = event.data.offset;
//	var mins = event.data.mins;
//	var maxs = event.data.maxs;
//	
//	var decoder = new LASDecoder(buffer, pointFormatID, pointSize, numPoints, scale, offset);
//	
//	var pBuff = new ArrayBuffer(numPoints*3*4);
//	var cBuff = new ArrayBuffer(numPoints*3*4);
//	var iBuff = new ArrayBuffer(numPoints*4);
//	var positions = new Float32Array(pBuff);
//	var colors = new Float32Array(cBuff);
//	var intensities = new Float32Array(iBuff);
//	
//	for(var i = 0; i < numPoints; i++){
//		var p = decoder.getPoint(i);
//		
//		positions[3*i] =   p.position[0] * decoder.scale[0] + decoder.offset[0] - mins[0];
//		positions[3*i+1] = p.position[1] * decoder.scale[1] + decoder.offset[1] - mins[1];
//		positions[3*i+2] = p.position[2] * decoder.scale[2] + decoder.offset[2] - mins[2];
//		
//		colors[3*i] = p.color[0] /255;
//		colors[3*i+1] = p.color[1] / 255;
//		colors[3*i+2] = p.color[2] / 255;
//		
//		intensities[i] = p.intensity;
//	}
//	
//	var message = {position: pBuff, color: cBuff, intensity: iBuff};
//	postMessage(message, [message.position, message.color, message.intensity]);
//}