const PointAttributeNames = {};

PointAttributeNames.POSITION_CARTESIAN = 0; // float x, y, z;
PointAttributeNames.COLOR_PACKED = 1; // byte r, g, b, a; 	I = [0,1]
PointAttributeNames.COLOR_FLOATS_1 = 2; // float r, g, b; 		I = [0,1]
PointAttributeNames.COLOR_FLOATS_255	= 3; // float r, g, b; 		I = [0,255]
PointAttributeNames.NORMAL_FLOATS = 4; // float x, y, z;
PointAttributeNames.FILLER = 5;
PointAttributeNames.INTENSITY = 6;
PointAttributeNames.CLASSIFICATION = 7;
PointAttributeNames.NORMAL_SPHEREMAPPED = 8;
PointAttributeNames.NORMAL_OCT16 = 9;
PointAttributeNames.NORMAL = 10;

module.exports = PointAttributeNames;
