const updateVisibility = require('./updateVisibility');
const context = require('../context');

module.exports = function (pointclouds, camera, renderer) {
	for (let i = 0; i < pointclouds.length; i++) {
		let pointcloud = pointclouds[i];
		for (let j = 0; j < pointcloud.profileRequests.length; j++) {
			pointcloud.profileRequests[j].update();
		}
	}

	let result = updateVisibility(pointclouds, camera, renderer);

	for (let i = 0; i < pointclouds.length; i++) {
		let pointcloud = pointclouds[i];
		pointcloud.updateMaterial(pointcloud.material, pointcloud.visibleNodes, camera, renderer);
		pointcloud.updateVisibleBounds();
	}

	context.getLRU().freeMemory();

	return result;
};
