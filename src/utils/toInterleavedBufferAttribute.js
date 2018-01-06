
Potree.toInterleavedBufferAttribute = function toInterleavedBufferAttribute(pointAttribute){
	let att = null;
	
	if (pointAttribute.name === Potree.PointAttribute.POSITION_CARTESIAN.name) {
		att = new Potree.InterleavedBufferAttribute("position", 12, 3, "FLOAT", false);
	} else if (pointAttribute.name === Potree.PointAttribute.COLOR_PACKED.name) {
		att = new Potree.InterleavedBufferAttribute("color", 4, 4, "UNSIGNED_BYTE", true);
	} else if (pointAttribute.name === Potree.PointAttribute.INTENSITY.name) {
		att = new Potree.InterleavedBufferAttribute("intensity", 4, 1, "FLOAT", false);
	} else if (pointAttribute.name === Potree.PointAttribute.CLASSIFICATION.name) {
		att = new Potree.InterleavedBufferAttribute("classification", 4, 1, "FLOAT", false);
	} else if (pointAttribute.name === Potree.PointAttribute.RETURN_NUMBER.name) {
		att = new Potree.InterleavedBufferAttribute("returnNumber", 4, 1, "FLOAT", false);
	} else if (pointAttribute.name === Potree.PointAttribute.NUMBER_OF_RETURNS.name) {
		att = new Potree.InterleavedBufferAttribute("numberOfReturns", 4, 1, "FLOAT", false);
	} else if (pointAttribute.name === Potree.PointAttribute.SOURCE_ID.name) {
		att = new Potree.InterleavedBufferAttribute("pointSourceID", 4, 1, "FLOAT", false);
	} else if (pointAttribute.name === Potree.PointAttribute.NORMAL_SPHEREMAPPED.name) {
		att = new Potree.InterleavedBufferAttribute("normal", 12, 3, "FLOAT", false);
	} else if (pointAttribute.name === Potree.PointAttribute.NORMAL_OCT16.name) {
		att = new Potree.InterleavedBufferAttribute("normal", 12, 3, "FLOAT", false);
	} else if (pointAttribute.name === Potree.PointAttribute.NORMAL.name) {
		att = new Potree.InterleavedBufferAttribute("normal", 12, 3, "FLOAT", false);
	}
	
	return att;
};
