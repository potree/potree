

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

function createSceneContentData(viewer){

	const data = [];

	const potreeObjects = [];

	viewer.scene.scene.traverse(node => {
		if(node.potree){
			potreeObjects.push(node);
		}
	});

	for(const object of potreeObjects){
		
		if(object.potree.file){
			const saveObject = {
				file: object.potree.file,
			};

			data.push(saveObject);
		}


	}


	return data;
}

export function createSaveData(viewer) {

	const scene = viewer.scene;

	const data = {
		type: "Potree",
		version: 1.7,
		settings: createSettingsData(viewer),
		pointclouds: scene.pointclouds.map(createPointcloudData),
		measurements: scene.measurements.map(createMeasurementData),
		objects: createSceneContentData(viewer),
	};

	return data;
}
