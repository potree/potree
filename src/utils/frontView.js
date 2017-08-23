Potree.utils.frontView = (camera, node) => {
	camera.position.set(0, 0, 1);
	camera.rotation.set(0, 0, 0);
	camera.zoomTo(node, 1);
};
