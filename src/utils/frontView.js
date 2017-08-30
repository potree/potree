module.exports = (camera, node) => {
	camera.position.set(0, 0, 1);
	camera.rotation.set(0, 0, 0);
	Potree.utils.zoomTo(camera, node, 1);
};
