const THREE = require('three');

module.exports = (value) => {
	if (value instanceof THREE.Vector3) {
		return value.x.toFixed(2) + ', ' + value.y.toFixed(2) + ', ' + value.z.toFixed(2);
	} else {
		return '' + value + '';
	}
};
