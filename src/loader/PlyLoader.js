

/**
 * List of possible ply file types
 * 
 * @class
 */
function PlyFileType(){}
PlyFileType.ASCII = "ascii";
PlyFileType.BINARY_LITTLE_ENDIAN = "binary_little_endian";
PlyFileType.BINARY_BIG_ENDIAN = "binary_big_endian";

/**
 * represents a property definition in a ply file
 * 
 * @class
 * 
 */
function PlyProperty(name, type){
	this.name = name;
	this.type = type;
}


/**
 * 
 * @class
 */
function PlyPropertyDataType(name, size){
	this.name = name;
	this.size = size;
}

/**
 * represent an element in a ply file. (such as vertex/face/...)
 * 
 * @class
 * 
 */
function PlyElement(name){
	this.name = name;
	this.properties = new Array();
	this.size = 0;
}

PlyPropertyDataType.char   = new PlyPropertyDataType("char", 1);
PlyPropertyDataType.uchar  = new PlyPropertyDataType("uchar", 1);
PlyPropertyDataType.short  = new PlyPropertyDataType("short", 2);
PlyPropertyDataType.ushort = new PlyPropertyDataType("ushort", 2);
PlyPropertyDataType.int    = new PlyPropertyDataType("int", 4);
PlyPropertyDataType.uint   = new PlyPropertyDataType("uint", 4);
PlyPropertyDataType.float  = new PlyPropertyDataType("float", 4);
PlyPropertyDataType.double = new PlyPropertyDataType("double", 8);

/**
 * holds ply header data
 * 
 * @class
 * 
 */
function PlyHeader(){
	this.type = null;
	this.byteSize = 0;
	this.elements = new Array();
}

/**
 * Contains ply header and a buffer with byte-data 
 * 
 * @class
 */
function PlyFile(buffer){
	this.buffer = buffer;
	this.header = new PlyHeader();
}

/**
 * This listener is called while a ply file is beeing loaded
 * 
 * @class
 */
function PlyLoaderListener(){
	
}

PlyLoaderListener.prototype.finishedLoading = function(pointcloud){
	
};

PlyLoaderListener.prototype.pointsLoaded = function(numLoadedPoints, numPoints){
	
};

PlyLoaderListener.prototype.onProgress = function(progress){
	
};

/**
 * 
 * @class
 */
function PlyLoader(){
	
}

/**
 * Loads source in a background task. 
 * Once loading is finished, listener.finishedLoading(pointCloud) is called.
 */
PlyLoader.load = function(source, listener){
	var plyFile = new PlyFile();
	var worker = new Worker("src/loader/PlyLoaderWorker.js");
	worker.onmessage = function(event){
		if(event.data.type === "header"){
			plyFile.header = PlyLoader.parseHeader(event.data.header);
		}else if(event.data.type === "progress"){
			listener.pointsLoaded(event.data.pointsLoaded, plyFile.header.elements[0].size);
		}else if(event.data.type === "result"){
			var pointBuffer = event.data.buffer;
			var aabb = event.data.aabb;
			var vertexElement = plyFile.header.elements[0];
			var pointAttributes = PlyLoader.pointAttributesFromProperties(vertexElement.properties, true);
			var numPoints = pointBuffer.byteLength / pointAttributes.byteSize;
			var pointCloud = new PointCloud("test", pointAttributes);
			pointCloud.setVertexBufferData(pointBuffer);
			pointCloud.size = numPoints;
			pointCloud.aabb = new AABB();
			var min = V3.$(aabb.lx, aabb.ly, aabb.lz);
			var max = V3.$(aabb.ux, aabb.uy, aabb.uz);
			pointCloud.aabb.setDimensionByMinMax(min, max);
			
			listener.finishedLoading(pointCloud);
		}else if(event.data.type === "log"){
			console.log(event.data.message);
		}else if(event.data.type === "fileLoadProgress"){
			listener.fileLoadProgress(event.data.percentage);
		}else{
			alert(event.data);
		}
	};
	worker.postMessage(source);
};

PlyLoader.parseHeader = function PlyLoader_parseHeader(header){
	var lines = header.split('\n');
	var plyHeader = new PlyHeader();
	plyHeader.byteSize = header.length;
	var vertexElement = new PlyElement("vertex");
	plyHeader.elements.push(vertexElement);
	
	var formatPattern = /^format (ascii|binary_little_endian).*/;
	var elementPattern = /element (\w*) (\d*)/;
	var propertyPattern = /property (char|uchar|short|ushort|int|uint|float|double) (\w*)/;
	
	while(lines.length > 0){
	//for(var i = 0; i < lines.length; i++){
		var line = lines.shift();
		
		if(line === "ply"){
		}else if(line.search(formatPattern) >= 0){
			var result = line.match(formatPattern);
			plyHeader.type = PlyFileType[result[1].toUpperCase()];
		}else if(line.search(elementPattern) >= 0){
			var result = line.match(elementPattern);
			var name = result[1];
			var count = parseInt(result[2]);
			
			if(name !== "vertex"){
				throw "As of now, only ply files with 'vertex' as the first element are supported.";
			}
			
			vertexElement.size = count;
			// handle properties
			while(lines[0].search(propertyPattern) >= 0){
				var result = lines.shift().match(propertyPattern);
				var name = result[2];
				var type = PlyPropertyDataType[result[1]];
				var property = new PlyProperty(name, type);
				vertexElement.properties.push(property);
			}
			break;
		}
	}
	
	return plyHeader;
};

PlyLoader.pointAttributesFromProperties = function PlyLoader_pointAttributesFromProperties(properties, forTargetBuffer){
	if(forTargetBuffer === undefined){
		forTargetBuffer = false;
	}
	var pointAttributes = new PointAttributes();
	var i = 0; 
	while(i < properties.length){
		var property = properties[i];
		
		if(property.name === "x"){
			var p0 = property;
			var p1 = properties[i+1];
			var p2 = properties[i+2];
			
			if(p1.name !== "y" || p2.name !== "z"){
				throw "unsupported ply format";
			}
			
			if((p0.type.name + p1.type.name + p2.type.name) !== "floatfloatfloat"){
				throw "unsupported ply format";
			}
			
			pointAttributes.add(PointAttribute.POSITION_CARTESIAN);
			i+=3;
		}else if(property.name === "nx"){
			var p0 = property;
			var p1 = properties[i+1];
			var p2 = properties[i+2];
			
			if(p1.name !== "ny" || p2.name !== "nz"){
				throw "unsupported ply format";
			}
			
			if((p0.type.name + p1.type.name + p2.type.name) !== "floatfloatfloat"){
				throw "unsupported ply format";
			}
			
			pointAttributes.add(PointAttribute.NORMAL_FLOATS);
			i+=3;
		}else if(property.name === "red"){
			if(properties[i+3] != null && properties[i+3].name === "alpha"){
				var c0 = property;
				var c1 = properties[i+1];
				var c2 = properties[i+2];
				var c3 = properties[i+3];
				
				if(c1.name !== "green" || c2.name !== "blue" || c3.name !== "alpha"){
					throw "unsupported ply format";
				}
				
				if((c0.type.name + c1.type.name + c2.type.name + c3.type.name) !== "ucharucharucharuchar"){
					throw "unsupported ply format";
				}
				
				pointAttributes.add(PointAttribute.RGBA_PACKED);
				i += 4;
			}else{
				var c0 = property;
				var c1 = properties[i+1];
				var c2 = properties[i+2];
				
				if(c1.name !== "green" || c2.name !== "blue"){
					throw "unsupported ply format";
				}
				
				if((c0.type.name + c1.type.name + c2.type.name) !== "ucharucharuchar"){
					throw "unsupported ply format";
				}
				
				if(forTargetBuffer){
					pointAttributes.add(PointAttribute.RGBA_PACKED);
				}else{
					pointAttributes.add(PointAttribute.RGB_PACKED);
				}
				i+=3;
			}
			
		}else{
			
			if(!forTargetBuffer){
				var attribute = new PointAttribute(PointAttributeNames.FILLER, 
						PointAttributeTypes.DATA_TYPE_INT8, property.size);
				pointAttributes.add(attribute);
			}
			i++;
		}
	}
	
	return pointAttributes;
};

