

export const PointAttributeNames = {
	POSITION_CARTESIAN: 0, // float x, y, z;
	COLOR_PACKED: 1, // byte r, g, b, a; 	I: [0,1]
	COLOR_FLOATS_1: 2, // float r, g, b; 	I: [0,1]
	COLOR_FLOATS_255: 3, // float r, g, b; 	I: [0,255]
	NORMAL_FLOATS: 4, // float x, y, z;
	FILLER: 5,
	INTENSITY: 6,
	CLASSIFICATION: 7,
	NORMAL_SPHEREMAPPED: 8,
	NORMAL_OCT16: 9,
	NORMAL: 10,
	RETURN_NUMBER: 11,
	NUMBER_OF_RETURNS: 12,
	SOURCE_ID: 13,
	INDICES: 14,
	SPACING: 15,
	GPS_TIME: 16,
};


/**
 * Some types of possible point attribute data formats
 *
 * @class
 */
const PointAttributeTypes = {
	DATA_TYPE_DOUBLE: {ordinal: 0, size: 8},
	DATA_TYPE_FLOAT: {ordinal: 1, size: 4},
	DATA_TYPE_INT8: {ordinal: 2, size: 1},
	DATA_TYPE_UINT8: {ordinal: 3, size: 1},
	DATA_TYPE_INT16: {ordinal: 4, size: 2},
	DATA_TYPE_UINT16: {ordinal: 5, size: 2},
	DATA_TYPE_INT32: {ordinal: 6, size: 4},
	DATA_TYPE_UINT32: {ordinal: 7, size: 4},
	DATA_TYPE_INT64: {ordinal: 8, size: 8},
	DATA_TYPE_UINT64: {ordinal: 9, size: 8}
};

let i = 0;
for (let obj in PointAttributeTypes) {
	PointAttributeTypes[i] = PointAttributeTypes[obj];
	i++;
}

export {PointAttributeTypes};


class PointAttribute{
	
	constructor(name, type, numElements){
		this.name = name;
		this.type = type;
		this.numElements = numElements;
		this.byteSize = this.numElements * this.type.size;
	}

};

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

PointAttribute.INTENSITY = new PointAttribute(
	PointAttributeNames.INTENSITY,
	PointAttributeTypes.DATA_TYPE_UINT16, 1);

PointAttribute.CLASSIFICATION = new PointAttribute(
	PointAttributeNames.CLASSIFICATION,
	PointAttributeTypes.DATA_TYPE_UINT8, 1);

PointAttribute.NORMAL_SPHEREMAPPED = new PointAttribute(
	PointAttributeNames.NORMAL_SPHEREMAPPED,
	PointAttributeTypes.DATA_TYPE_UINT8, 2);

PointAttribute.NORMAL_OCT16 = new PointAttribute(
	PointAttributeNames.NORMAL_OCT16,
	PointAttributeTypes.DATA_TYPE_UINT8, 2);

PointAttribute.NORMAL = new PointAttribute(
	PointAttributeNames.NORMAL,
	PointAttributeTypes.DATA_TYPE_FLOAT, 3);
	
PointAttribute.RETURN_NUMBER = new PointAttribute(
	PointAttributeNames.RETURN_NUMBER,
	PointAttributeTypes.DATA_TYPE_UINT8, 1);
	
PointAttribute.NUMBER_OF_RETURNS = new PointAttribute(
	PointAttributeNames.NUMBER_OF_RETURNS,
	PointAttributeTypes.DATA_TYPE_UINT8, 1);
	
PointAttribute.SOURCE_ID = new PointAttribute(
	PointAttributeNames.SOURCE_ID,
	PointAttributeTypes.DATA_TYPE_UINT16, 1);

PointAttribute.INDICES = new PointAttribute(
	PointAttributeNames.INDICES,
	PointAttributeTypes.DATA_TYPE_UINT32, 1);

PointAttribute.SPACING = new PointAttribute(
	PointAttributeNames.SPACING,
	PointAttributeTypes.DATA_TYPE_FLOAT, 1);

PointAttribute.GPS_TIME = new PointAttribute(
	PointAttributeNames.GPS_TIME,
	PointAttributeTypes.DATA_TYPE_DOUBLE, 1);

export {PointAttribute};

export class PointAttributes{

	constructor(pointAttributes){
		this.attributes = [];
		this.byteSize = 0;
		this.size = 0;

		if (pointAttributes != null) {
			for (let i = 0; i < pointAttributes.length; i++) {
				let pointAttributeName = pointAttributes[i];
				let pointAttribute = PointAttribute[pointAttributeName];
				this.attributes.push(pointAttribute);
				this.byteSize += pointAttribute.byteSize;
				this.size++;
			}
		}
	}


	add(pointAttribute){
		this.attributes.push(pointAttribute);
		this.byteSize += pointAttribute.byteSize;
		this.size++;
	};

	hasColors(){
		for (let name in this.attributes) {
			let pointAttribute = this.attributes[name];
			if (pointAttribute.name === PointAttributeNames.COLOR_PACKED) {
				return true;
			}
		}

		return false;
	};

	hasNormals(){
		for (let name in this.attributes) {
			let pointAttribute = this.attributes[name];
			if (
				pointAttribute === PointAttribute.NORMAL_SPHEREMAPPED ||
				pointAttribute === PointAttribute.NORMAL_FLOATS ||
				pointAttribute === PointAttribute.NORMAL ||
				pointAttribute === PointAttribute.NORMAL_OCT16) {
				return true;
			}
		}

		return false;
	};

}
