const THREE = require('three');

module.exports = (mouse, camera, renderer, pointclouds) => {
	let nmouse = {
		x: (mouse.x / renderer.domElement.clientWidth) * 2 - 1,
		y: -(mouse.y / renderer.domElement.clientHeight) * 2 + 1
	};

	// let vector = new THREE.Vector3( nmouse.x, nmouse.y, 0.5 );
	// vector.unproject(camera);

	// let direction = vector.sub(camera.position).normalize();
	// let ray = new THREE.Ray(camera.position, direction);

	let raycaster = new THREE.Raycaster();
	raycaster.setFromCamera(nmouse, camera);
	let ray = raycaster.ray;

	let selectedPointcloud = null;
	let closestDistance = Infinity;
	let closestIntersection = null;
	let closestPoint = null;

	for (let pointcloud of pointclouds) {
		let point = pointcloud.pick(renderer, camera, ray, {x: mouse.x, y: renderer.domElement.clientHeight - mouse.y});

		if (!point) {
			continue;
		}

		let distance = camera.position.distanceTo(point.position);

		if (distance < closestDistance) {
			closestDistance = distance;
			selectedPointcloud = pointcloud;
			closestIntersection = point.position;
			closestPoint = point;
		}
	}

	if (selectedPointcloud) {
		return {
			location: closestIntersection,
			distance: closestDistance,
			pointcloud: selectedPointcloud,
			point: closestPoint
		};
	} else {
		return null;
	}
};
