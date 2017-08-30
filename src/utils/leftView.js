module.exports = (camera, node) => {
	camera.position.set(-1, 0, 0);
	camera.rotation.set(0, -Math.PI / 2, 0);
	Potree.utils.zoomTo(camera, node, 1);
};
