
/**
 * Create pointclouds using math!
 * 
 * @class
 */
function ProceduralPointcloudGenerator(){
	
}

ProceduralPointcloudGenerator.generate = function(xStart, xEnd, xStep, zStart, zEnd, zStep, genFunc){
	
	var points = ((xEnd - xStart) / xStep) * ((zEnd - zStart) / zStep);
	var buffer = new ArrayBuffer(points*16);
	var floatView = new Float32Array(buffer);
	var byteView = new Uint8Array(buffer);
	
//	var pointAttributes = {
//			'numAttributes' : 2,
//			'bytesPerPoint' : 16,
//			'attributes' : {}
//		};
//	pointAttributes.attributes[0] = PointAttributes.POSITION_CARTESIAN;
//	pointAttributes.attributes[1] = PointAttributes.COLOR_PACKED;
	var pointAttributes = new PointAttributes();
	pointAttributes.add(PointAttribute.POSITION_CARTESIAN);
	pointAttributes.add(PointAttribute.RGBA_PACKED);
	
	var offset = 0;
	for(var x = xStart; x <= xEnd; x+= xStep){
		for(var z = zStart; z <= zEnd; z += zStep){
			var values = genFunc(x,z);
			var y = values[0];
			var r = values[1];
			var g = values[2];
			var b = values[3];
			var a = 255;
			
			var floatOffset = offset / 4;
			floatView[floatOffset+0] = x + 0.01;
			floatView[floatOffset+1] = y + 0.01;
			floatView[floatOffset+2] = z + 0.01;
			byteView[offset+12] = r;
			byteView[offset+13] = g;
			byteView[offset+14] = b;
			byteView[offset+15] = a;
			offset += 16;
		}
	}
	
	var pointCloud = new PointCloud("test", pointAttributes);
	pointCloud.setVertexBufferData(buffer);
	pointCloud.size = points;
	
	return pointCloud;
	
};

