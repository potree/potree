module.exports = (camera, node) => {
	camera.position.set(0, 1, 0);
	camera.rotation.set(-Math.PI / 2, 0, 0);
	Potree.utils.zoomTo(camera, node, 1);
};
