
Potree.toInterleavedBufferAttribute = function toInterleavedBufferAttribute(pointAttribute){
	let att = null;
	
	if (pointAttribute.name === Potree.PointAttribute.POSITION_CARTESIAN.name) {
		att = new Potree.InterleavedBufferAttribute("position", 12, 3, "FLOAT", false);
	} else if (pointAttribute.name === Potree.PointAttribute.COLOR_PACKED.name) {
		att = new Potree.InterleavedBufferAttribute("color", 4, 4, "UNSIGNED_BYTE", true);
	} else if (pointAttribute.name === Potree.PointAttribute.CLASSIFICATION.name) {
		att = new Potree.InterleavedBufferAttribute("classification", 1, 1, "UNSIGNED_BYTE", false);
	}
	
	return att;
}
