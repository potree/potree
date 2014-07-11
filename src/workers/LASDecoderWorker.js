

var pointFormatReaders = {
	0: function(dv) {
		return {
			"position": [ dv.getInt32(0, true), dv.getInt32(4, true), dv.getInt32(8, true)],
			"intensity": dv.getUint16(12, true),
			"classification": dv.getUint8(16, true)
		};
	},
	1: function(dv) {
		return {
			"position": [ dv.getInt32(0, true), dv.getInt32(4, true), dv.getInt32(8, true)],
			"intensity": dv.getUint16(12, true),
			"classification": dv.getUint8(16, true)
		};
	},
	2: function(dv) {
		return {
			"position": [ dv.getInt32(0, true), dv.getInt32(4, true), dv.getInt32(8, true)],
			"intensity": dv.getUint16(12, true),
			"classification": dv.getUint8(16, true),
			"color": [dv.getUint16(20, true), dv.getUint16(22, true), dv.getUint16(24, true)]
		};
	},
	3: function(dv) {
		return {
			"position": [ dv.getInt32(0, true), dv.getInt32(4, true), dv.getInt32(8, true)],
			"intensity": dv.getUint16(12, true),
			"classification": dv.getUint8(16, true),
			"color": [dv.getUint16(28, true), dv.getUint16(30, true), dv.getUint16(32, true)]
		};
	}
};
	
	
// Decodes LAS records into points
//
var LASDecoder = function(buffer, pointFormatID, pointSize, pointsCount, scale, offset) {
	this.arrayb = buffer;
	this.decoder = pointFormatReaders[pointFormatID];
	this.pointsCount = pointsCount;
	this.pointSize = pointSize;
	this.scale = scale;
	this.offset = offset;
};

LASDecoder.prototype.getPoint = function(index) {
	if (index < 0 || index >= this.pointsCount)
		throw new Error("Point index out of range");

	var dv = new DataView(this.arrayb, index * this.pointSize, this.pointSize);
	return this.decoder(dv);
};

onmessage = function(event){
	var buffer = event.data.buffer;
	var numPoints = event.data.numPoints;
	var pointSize = event.data.pointSize;
	var pointFormatID = event.data.pointFormatID;
	var scale = event.data.scale;
	var offset = event.data.offset;
	
	var decoder = new LASDecoder(buffer, pointFormatID, pointSize, numPoints, scale, offset);
	
	var pBuff = new ArrayBuffer(numPoints*3*4);
	var cBuff = new ArrayBuffer(numPoints*3*4);
	var positions = new Float32Array(pBuff);
	var colors = new Float32Array(cBuff);
	//var positions = new Float32Array(numPoints*3);
	//var colors = new Float32Array(numPoints*3);
	
	for(var i = 0; i < numPoints; i++){
		var p = decoder.getPoint(i);
		
		positions[3*i] =   p.position[0] * decoder.scale[0] + decoder.offset[0];
		positions[3*i+1] = p.position[1] * decoder.scale[1] + decoder.offset[1];
		positions[3*i+2] = p.position[2] * decoder.scale[2] + decoder.offset[2];
		
		colors[3*i] = p.color[0] /255;
		colors[3*i+1] = p.color[1] / 255;
		colors[3*i+2] = p.color[2] / 255;
	}
	
	var message = {position: pBuff, color: cBuff};
	postMessage(message, [message.position, message.color]);
}