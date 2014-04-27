

///**
// * Some types of possible point attributes
// * 
// * @class
// */
//var PointAttributeNames = {
//	POSITION_CARTESIAN 	: 0,	// float x, y, z;
//	COLOR_PACKED		: 1,	// byte r, g, b, a; 	I = [0,1]
//	COLOR_FLOATS_1		: 2,	// float r, g, b; 		I = [0,1]
//	COLOR_FLOATS_255	: 3,	// float r, g, b; 		I = [0,255]
//	NORMAL_FLOATS		: 4,  	// float x, y, z;
//	FILLER				: 5
//};
//
//var i = 0;
//for(var obj in PointAttributeNames){
//	PointAttributeNames[i] = PointAttributeNames[obj];
//	i++;
//}

function PointAttributeNames(){
	
}

PointAttributeNames.POSITION_CARTESIAN 	= 0;	// float x, y, z;
PointAttributeNames.COLOR_PACKED		= 1;	// byte r, g, b, a; 	I = [0,1]
PointAttributeNames.COLOR_FLOATS_1		= 2;	// float r, g, b; 		I = [0,1]
PointAttributeNames.COLOR_FLOATS_255	= 3;	// float r, g, b; 		I = [0,255]
PointAttributeNames.NORMAL_FLOATS		= 4;  	// float x, y, z;
PointAttributeNames.FILLER				= 5;
/**
 * Some types of possible point attribute data formats
 * 
 * @class
 */
var PointAttributeTypes = {
	DATA_TYPE_DOUBLE	: {ordinal : 0, size: 8},
	DATA_TYPE_FLOAT		: {ordinal : 1, size: 4},
	DATA_TYPE_INT8		: {ordinal : 2, size: 1},
	DATA_TYPE_UINT8		: {ordinal : 3, size: 1},
	DATA_TYPE_INT16		: {ordinal : 4, size: 2},
	DATA_TYPE_UINT16	: {ordinal : 5, size: 2},
	DATA_TYPE_INT32		: {ordinal : 6, size: 4},
	DATA_TYPE_UINT32	: {ordinal : 7, size: 4},
	DATA_TYPE_INT64		: {ordinal : 8, size: 8},
	DATA_TYPE_UINT64	: {ordinal : 9, size: 8}
};

var i = 0;
for(var obj in PointAttributeTypes){
	PointAttributeTypes[i] = PointAttributeTypes[obj];
	i++;
}

/**
 * A single point attribute such as color/normal/.. and its data format/number of elements/... 
 * 
 * @class
 * @param name 
 * @param type
 * @param size
 * @returns
 */
function PointAttribute(name, type, numElements){
	this.name = name;
	this.type = type; 
	this.numElements = numElements;
	this.byteSize = this.numElements * this.type.size;
}

PointAttribute.POSITION_CARTESIAN = new PointAttribute(
		PointAttributeNames.POSITION_CARTESIAN,
		PointAttributeTypes.DATA_TYPE_FLOAT, 3);

PointAttribute.RGBA_PACKED = new PointAttribute(
		PointAttributeNames.COLOR_PACKED,
		PointAttributeTypes.DATA_TYPE_INT8, 4);

PointAttribute.COLOR_PACKED = PointAttribute.RGBA_PACKED;

PointAttribute.RGB_PACKED = new PointAttribute(
		PointAttributeNames.COLOR_PACKED,
		PointAttributeTypes.DATA_TYPE_INT8, 3);

PointAttribute.NORMAL_FLOATS = new PointAttribute(
		PointAttributeNames.NORMAL_FLOATS,
		PointAttributeTypes.DATA_TYPE_FLOAT, 3);

PointAttribute.FILLER_1B = new PointAttribute(
		PointAttributeNames.FILLER,
		PointAttributeTypes.DATA_TYPE_UINT8, 1);

/**
 * Ordered list of PointAttributes used to identify how points are aligned in a buffer.
 * 
 * @class
 * 
 */
function PointAttributes(pointAttributes){
	this.attributes = new Array();
	this.byteSize = 0;
	this.size = 0;
	
	if(pointAttributes != null){
		// does not work in chrome v24
//		for(var pointAttribute of pointAttributes){
//			this.attributes.push(pointAttribute);
//			this.byteSize += pointAttribute.byteSize;
//			this.size++;
//		}
		
		for(var name in pointAttributes){
			var pointAttribute = pointAttributes[name];
			this.attributes.push(pointAttribute);
			this.byteSize += pointAttribute.byteSize;
			this.size++;
		}
	}
}

PointAttributes.prototype.add = function(pointAttribute){
	this.attributes.push(pointAttribute);
	this.byteSize += pointAttribute.byteSize;
	this.size++;
};

PointAttributes.prototype.hasColors = function(){
	for(var name in this.attributes){
		var pointAttribute = this.attributes[name];
		if(pointAttribute.name === PointAttributeNames.COLOR_PACKED){
			return true;
		}
	}
	
	return false;
};

PointAttributes.prototype.hasNormals = function(){
	for(var name in this.attributes){
		var pointAttribute = this.attributes[name];
		if(pointAttribute === PointAttribute.NORMAL_FLOATS){
			return true;
		}
	}
	
	return false;
};


