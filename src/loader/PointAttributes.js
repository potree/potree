
/**
 * Some types of possible point attribute data formats
 *
 * @class
 */
const PointAttributeTypes = {
	DATA_TYPE_DOUBLE: {ordinal: 0, name: "double", size: 8},
	DATA_TYPE_FLOAT:  {ordinal: 1, name: "float",  size: 4},
	DATA_TYPE_INT8:   {ordinal: 2, name: "int8",   size: 1},
	DATA_TYPE_UINT8:  {ordinal: 3, name: "uint8",  size: 1},
	DATA_TYPE_INT16:  {ordinal: 4, name: "int16",  size: 2},
	DATA_TYPE_UINT16: {ordinal: 5, name: "uint16", size: 2},
	DATA_TYPE_INT32:  {ordinal: 6, name: "int32",  size: 4},
	DATA_TYPE_UINT32: {ordinal: 7, name: "uint32", size: 4},
	DATA_TYPE_INT64:  {ordinal: 8, name: "int64",  size: 8},
	DATA_TYPE_UINT64: {ordinal: 9, name: "uint64", size: 8}
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
		this.description = "";
		this.range = [Infinity, -Infinity];
	}

};

PointAttribute.POSITION_CARTESIAN = new PointAttribute(
	"POSITION_CARTESIAN", PointAttributeTypes.DATA_TYPE_FLOAT, 3);

PointAttribute.RGBA_PACKED = new PointAttribute(
	"COLOR_PACKED", PointAttributeTypes.DATA_TYPE_INT8, 4);

PointAttribute.COLOR_PACKED = PointAttribute.RGBA_PACKED;

PointAttribute.RGB_PACKED = new PointAttribute(
	"COLOR_PACKED", PointAttributeTypes.DATA_TYPE_INT8, 3);

PointAttribute.NORMAL_FLOATS = new PointAttribute(
	"NORMAL_FLOATS", PointAttributeTypes.DATA_TYPE_FLOAT, 3);

PointAttribute.INTENSITY = new PointAttribute(
	"INTENSITY", PointAttributeTypes.DATA_TYPE_UINT16, 1);

PointAttribute.CLASSIFICATION = new PointAttribute(
	"CLASSIFICATION", PointAttributeTypes.DATA_TYPE_UINT8, 1);

PointAttribute.NORMAL_SPHEREMAPPED = new PointAttribute(
	"NORMAL_SPHEREMAPPED", PointAttributeTypes.DATA_TYPE_UINT8, 2);

PointAttribute.NORMAL_OCT16 = new PointAttribute(
	"NORMAL_OCT16", PointAttributeTypes.DATA_TYPE_UINT8, 2);

PointAttribute.NORMAL = new PointAttribute(
	"NORMAL", PointAttributeTypes.DATA_TYPE_FLOAT, 3);
	
PointAttribute.RETURN_NUMBER = new PointAttribute(
	"RETURN_NUMBER", PointAttributeTypes.DATA_TYPE_UINT8, 1);
	
PointAttribute.NUMBER_OF_RETURNS = new PointAttribute(
	"NUMBER_OF_RETURNS", PointAttributeTypes.DATA_TYPE_UINT8, 1);
	
PointAttribute.SOURCE_ID = new PointAttribute(
	"SOURCE_ID", PointAttributeTypes.DATA_TYPE_UINT16, 1);

PointAttribute.INDICES = new PointAttribute(
	"INDICES", PointAttributeTypes.DATA_TYPE_UINT32, 1);

PointAttribute.SPACING = new PointAttribute(
	"SPACING", PointAttributeTypes.DATA_TYPE_FLOAT, 1);

PointAttribute.GPS_TIME = new PointAttribute(
	"GPS_TIME", PointAttributeTypes.DATA_TYPE_DOUBLE, 1);

export {PointAttribute};

export class PointAttributes{

	constructor(pointAttributes){
		this.attributes = [];
		this.byteSize = 0;
		this.size = 0;
		this.vectors = [];

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

	addVector(vector){
		this.vectors.push(vector);
	}

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
