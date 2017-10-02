const zoomTo = require('./zoomTo');

module.exports = (camera, node) => {
	camera.position.set(0, 0, 1);
	camera.rotation.set(0, 0, 0);
	zoomTo(camera, node, 1);
};
