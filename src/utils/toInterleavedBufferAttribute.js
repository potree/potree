const PointAttribute = require('../loader/PointAttribute');
const InterleavedBufferAttribute = require('../InterleavedBufferAttribute');

module.exports = function toInterleavedBufferAttribute (pointAttribute) {
	let att = null;

	if (pointAttribute.name === PointAttribute.POSITION_CARTESIAN.name) {
		att = new InterleavedBufferAttribute('position', 12, 3, 'FLOAT', false);
	} else if (pointAttribute.name === PointAttribute.COLOR_PACKED.name) {
		att = new InterleavedBufferAttribute('color', 4, 4, 'UNSIGNED_BYTE', true);
	} else if (pointAttribute.name === PointAttribute.INTENSITY.name) {
		att = new InterleavedBufferAttribute('intensity', 4, 1, 'FLOAT', false);
	} else if (pointAttribute.name === PointAttribute.CLASSIFICATION.name) {
		att = new InterleavedBufferAttribute('classification', 1, 1, 'UNSIGNED_BYTE', false);
	} else if (pointAttribute.name === PointAttribute.NORMAL_SPHEREMAPPED.name) {
		att = new InterleavedBufferAttribute('normal', 12, 3, 'FLOAT', false);
	} else if (pointAttribute.name === PointAttribute.NORMAL_OCT16.name) {
		att = new InterleavedBufferAttribute('normal', 12, 3, 'FLOAT', false);
	} else if (pointAttribute.name === PointAttribute.NORMAL.name) {
		att = new InterleavedBufferAttribute('normal', 12, 3, 'FLOAT', false);
	}

	return att;
};
