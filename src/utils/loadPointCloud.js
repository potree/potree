/* eslint-disable standard/no-callback-literal */
const PointCloudOctree = require('./PointCloudOctree');
const PointCloudArena4D = require('./arena4d/PointCloudArena4D');

module.exports = function (path, name, callback) {
	let loaded = function (pointcloud) {
		pointcloud.name = name;
		callback({type: 'pointcloud_loaded', pointcloud: pointcloud});
	};

	// load pointcloud
	if (!path) {
		// TODO: callback? comment? Hello? Bueller? Anyone?
	} else if (path.indexOf('greyhound://') === 0) {
		// We check if the path string starts with 'greyhound:', if so we assume it's a greyhound server URL.
		require('../loader/GreyhoundLoader').load(path, function (geometry) {
			if (!geometry) {
				callback({type: 'loading_failed'});
			} else {
				let pointcloud = new PointCloudOctree(geometry);
				loaded(pointcloud);
			}
		});
	} else if (path.indexOf('cloud.js') > 0) {
		require('../loader/POCLoader').load(path, function (geometry) {
			if (!geometry) {
				callback({type: 'loading_failed'});
			} else {
				let pointcloud = new PointCloudOctree(geometry);
				loaded(pointcloud);
			}
		});
	} else if (path.indexOf('.vpc') > 0) {
		require('../loader/PointCloudArena4DGeometry').load(path, function (geometry) {
			if (!geometry) {
				callback({type: 'loading_failed'});
			} else {
				let pointcloud = new PointCloudArena4D(geometry);
				loaded(pointcloud);
			}
		});
	} else {
		callback({'type': 'loading_failed'});
	}
};
