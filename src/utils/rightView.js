Potree.utils.rightView = (camera, node) => {
	camera.position.set(1, 0, 0);
	camera.rotation.set(0, Math.PI / 2, 0);
	camera.zoomTo(node, 1);
};
