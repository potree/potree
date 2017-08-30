/**
 * A single point attribute such as color/normal/.. and its data format/number of elements/...
 *
 * @class
 * @param name
 * @param type
 * @param size
 * @returns
 */
const PointAttribute = function (name, type, numElements) {
	this.name = name;
	this.type = type;
	this.numElements = numElements;
	this.byteSize = this.numElements * this.type.size;
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
