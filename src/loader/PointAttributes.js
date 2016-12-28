
Potree.PointAttributeNames = {};

Potree.PointAttributeNames.POSITION_CARTESIAN 	= 0;	// float x, y, z;
Potree.PointAttributeNames.COLOR_PACKED		= 1;	// byte r, g, b, a; 	I = [0,1]
Potree.PointAttributeNames.COLOR_FLOATS_1		= 2;	// float r, g, b; 		I = [0,1]
Potree.PointAttributeNames.COLOR_FLOATS_255	= 3;	// float r, g, b; 		I = [0,255]
Potree.PointAttributeNames.NORMAL_FLOATS		= 4;  	// float x, y, z;
Potree.PointAttributeNames.FILLER				= 5;
Potree.PointAttributeNames.INTENSITY			= 6;
Potree.PointAttributeNames.CLASSIFICATION		= 7;
Potree.PointAttributeNames.NORMAL_SPHEREMAPPED	= 8;
Potree.PointAttributeNames.NORMAL_OCT16		= 9;
Potree.PointAttributeNames.NORMAL				= 10;

/**
 * Some types of possible point attribute data formats
 *
 * @class
 */
Potree.PointAttributeTypes = {
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
for(var obj in Potree.PointAttributeTypes){
	Potree.PointAttributeTypes[i] = Potree.PointAttributeTypes[obj];
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
Potree.PointAttribute = function(name, type, numElements){
	this.name = name;
	this.type = type;
	this.numElements = numElements;
	this.byteSize = this.numElements * this.type.size;
};

Potree.PointAttribute.POSITION_CARTESIAN = new Potree.PointAttribute(
		Potree.PointAttributeNames.POSITION_CARTESIAN,
		Potree.PointAttributeTypes.DATA_TYPE_FLOAT, 3);

Potree.PointAttribute.RGBA_PACKED = new Potree.PointAttribute(
		Potree.PointAttributeNames.COLOR_PACKED,
		Potree.PointAttributeTypes.DATA_TYPE_INT8, 4);

Potree.PointAttribute.COLOR_PACKED = Potree.PointAttribute.RGBA_PACKED;

Potree.PointAttribute.RGB_PACKED = new Potree.PointAttribute(
		Potree.PointAttributeNames.COLOR_PACKED,
		Potree.PointAttributeTypes.DATA_TYPE_INT8, 3);

Potree.PointAttribute.NORMAL_FLOATS = new Potree.PointAttribute(
		Potree.PointAttributeNames.NORMAL_FLOATS,
		Potree.PointAttributeTypes.DATA_TYPE_FLOAT, 3);

Potree.PointAttribute.FILLER_1B = new Potree.PointAttribute(
		Potree.PointAttributeNames.FILLER,
		Potree.PointAttributeTypes.DATA_TYPE_UINT8, 1);

Potree.PointAttribute.INTENSITY = new Potree.PointAttribute(
		Potree.PointAttributeNames.INTENSITY,
		Potree.PointAttributeTypes.DATA_TYPE_UINT16, 1);

Potree.PointAttribute.CLASSIFICATION = new Potree.PointAttribute(
		Potree.PointAttributeNames.CLASSIFICATION,
		Potree.PointAttributeTypes.DATA_TYPE_UINT8, 1);

Potree.PointAttribute.NORMAL_SPHEREMAPPED = new Potree.PointAttribute(
		Potree.PointAttributeNames.NORMAL_SPHEREMAPPED,
		Potree.PointAttributeTypes.DATA_TYPE_UINT8, 2);

Potree.PointAttribute.NORMAL_OCT16 = new Potree.PointAttribute(
		Potree.PointAttributeNames.NORMAL_OCT16,
		Potree.PointAttributeTypes.DATA_TYPE_UINT8, 2);

Potree.PointAttribute.NORMAL = new Potree.PointAttribute(
		Potree.PointAttributeNames.NORMAL,
		Potree.PointAttributeTypes.DATA_TYPE_FLOAT, 3);

/**
 * Ordered list of PointAttributes used to identify how points are aligned in a buffer.
 *
 * @class
 *
 */
Potree.PointAttributes = function(pointAttributes){
	this.attributes = [];
	this.byteSize = 0;
	this.size = 0;

	if(pointAttributes != null){
		for(var i = 0; i < pointAttributes.length; i++){
			var pointAttributeName = pointAttributes[i];
			var pointAttribute = Potree.PointAttribute[pointAttributeName];
			this.attributes.push(pointAttribute);
			this.byteSize += pointAttribute.byteSize;
			this.size++;
		}
	}
};

Potree.PointAttributes.prototype.add = function(pointAttribute){
	this.attributes.push(pointAttribute);
	this.byteSize += pointAttribute.byteSize;
	this.size++;
};

Potree.PointAttributes.prototype.hasColors = function(){
	for(var name in this.attributes){
		var pointAttribute = this.attributes[name];
		if(pointAttribute.name === Potree.PointAttributeNames.COLOR_PACKED){
			return true;
		}
	}

	return false;
};

Potree.PointAttributes.prototype.hasNormals = function(){
	for(var name in this.attributes){
		var pointAttribute = this.attributes[name];
		if(
			pointAttribute === Potree.PointAttribute.NORMAL_SPHEREMAPPED ||
			pointAttribute === Potree.PointAttribute.NORMAL_FLOATS ||
			pointAttribute === Potree.PointAttribute.NORMAL ||
			pointAttribute === Potree.PointAttribute.NORMAL_OCT16){
			return true;
		}
	}

	return false;
};
