

function createPointcloudData(pointcloud) {

	const pcdata = {
		name: pointcloud.name,
		url: pointcloud.pcoGeometry.url,
	};

	return pcdata;
}

function createMeasurementData(measurement){
	const data = {
		name: measurement.name,
		points: measurement.points.map(p => p.position.toArray()),
		showDistances: measurement.showDistances,
		showCoordinates: measurement.showCoordinates,
		showArea: measurement.showArea,
		closed: measurement.closed,
		showAngles: measurement.showAngles,
		showHeight: measurement.showHeight,
		color: measurement.color.toArray(),

	};

	return data;
}

function createSettingsData(viewer){
	return {
		pointBudget: viewer.getPointBudget(),
		fov: viewer.getFOV(),
		edlEnabled: viewer.getEDLEnabled(),
		edlRadius: viewer.getEDLRadius(),
		edlStrength: viewer.getEDLStrength(),
		background: viewer.getBackground(),
		minNodeSize: viewer.getMinNodeSize(),
		showBoundingBoxes: viewer.getShowBoundingBox(),
	};
}

export function createSaveData(viewer) {

	const scene = viewer.scene;

	const data = {
		type: "Potree",
		settings: createSettingsData(viewer),
		pointclouds: scene.pointclouds.map(createPointcloudData),
		measurements: scene.measurements.map(createMeasurementData),
	};

	return data;
}
