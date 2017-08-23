Potree.utils.topView = (camera, node) => {
	camera.position.set(0, 1, 0);
	camera.rotation.set(-Math.PI / 2, 0, 0);
	camera.zoomTo(node, 1);
};
