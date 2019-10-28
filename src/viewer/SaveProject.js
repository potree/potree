

function createPointcloudData(pointcloud) {

	const pcdata = {
		name: pointcloud.name,
		url: pointcloud.pcoGeometry.url,
		position: pointcloud.position.toArray(),
		rotation: pointcloud.rotation.toArray(),
		scale: pointcloud.scale.toArray(),
		activeAttributeName: pointcloud.material.activeAttributeName,
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

function createAnnotationData(annotation){
	const data = {
		title: annotation.title,
		description: annotation.description,
		position: annotation.position.toArray(),
		offset: annotation.offset.toArray(),
	};

	if(annotation.cameraPosition){
		data.cameraPosition = annotation.cameraPosition.toArray();
	}

	if(annotation.cameraTarget){
		annotation.cameraTarget = annotation.cameraTarget.toArray();
	}

	if(typeof annotation.radius !== "undefined"){
		annotation.radius = annotation.radius;
	}

	return data;
}

function createAnnotationsData(viewer){
	
	const annotations = [];
	const annMap = new Map();

	viewer.scene.annotations.traverseDescendants(a => {
		annotations.push(a);

		annMap.set(a, annMap.size);
	});

	const root = {};
	const stack = [
		{
			from: viewer.scene.annotations,
			to: root,
		}
	];

	const hierarchy = {}
	const mapping = new Map();
	mapping.set(viewer.scene.annotations, hierarchy);

	while(stack.length > 0){
		const entry = stack.shift();

		for (let child of entry.from.children) {
			let id = annMap.get(child);
			entry.to[id] = {
				from: child,
				to: {},
			};

			const node = {};
			mapping.set(child, node);
			mapping.get(entry.from)[id] = node;

			stack.push(entry.to[id]);
		}
	}


	return {
		items: annotations.map(createAnnotationData),
		hierarchy: hierarchy,
	};
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

function createViewData(viewer){
	const view = viewer.scene.view;

	const data = {
		position: view.position.toArray(),
		target: view.getPivot().toArray(),
	};

	return data;
}

export function createSaveData(viewer) {

	const scene = viewer.scene;

	const data = {
		type: "Potree",
		version: 1.7,
		settings: createSettingsData(viewer),
		view: createViewData(viewer),
		pointclouds: scene.pointclouds.map(createPointcloudData),
		measurements: scene.measurements.map(createMeasurementData),
		volumes: scene.volumes.map(createVolumeData),
		profiles: scene.profiles.map(createProfileData),
		annotations: createAnnotationsData(viewer),
		objects: createSceneContentData(viewer),
	};

	return data;
}
