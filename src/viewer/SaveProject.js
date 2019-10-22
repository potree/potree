

function createPointcloudData(pointcloud) {

	const pcdata = {
		name: pointcloud.name,
		url: pointcloud.pcoGeometry.url,
	};

	return pcdata;
}

function createProfileData(profile){
	const data = {
		name: profile.name,
		points: profile.points.map(p => p.toArray()),
		height: profile.height,
		width: profile.width,
	};

	return data;
}

function createVolumeData(volume){
	const data = {
		type: volume.constructor.name,
		name: volume.name,
		position: volume.position.toArray(),
		rotation: volume.rotation.toArray(),
		scale: volume.scale.toArray(),
		visible: volume.visible,
		clip: volume.clip,
	};

	return data;
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
		volumes: scene.volumes.map(createVolumeData),
		profiles: scene.profiles.map(createProfileData),
		objects: createSceneContentData(viewer),
	};

	return data;
}
