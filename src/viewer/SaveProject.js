

function createPointcloudData(pointcloud) {

	let material = pointcloud.material;

	let ranges = [];
	
	for(let [name, value] of material.ranges){
		ranges.push({
			name: name,
			value: value,
		});
	}

	if(typeof material.elevationRange[0] === "number"){
		ranges.push({
			name: "elevationRange",
			value: material.elevationRange,
		});
	}
	if(typeof material.intensityRange[0] === "number"){
		ranges.push({
			name: "intensityRange",
			value: material.intensityRange,
		});
	}

	let pointSizeTypeName = Object.entries(Potree.PointSizeType).find(e => e[1] === material.pointSizeType)[0];

	let jsonMaterial = {
		activeAttributeName: material.activeAttributeName,
		ranges: ranges,
		size: material.size,
		minSize: material.minSize,
		pointSizeType: pointSizeTypeName,
		matcap: material.matcap,
	};

	const pcdata = {
		name: pointcloud.name,
		url: pointcloud.pcoGeometry.url,
		position: pointcloud.position.toArray(),
		rotation: pointcloud.rotation.toArray(),
		scale: pointcloud.scale.toArray(),
		material: jsonMaterial,
	};

	return pcdata;
}

function createProfileData(profile){
	const data = {
		uuid: profile.uuid,
		name: profile.name,
		points: profile.points.map(p => p.toArray()),
		height: profile.height,
		width: profile.width,
	};

	return data;
}

function createVolumeData(volume){
	const data = {
		uuid: volume.uuid,
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

function createCameraAnimationData(animation){

	const controlPoints = animation.controlPoints.map( cp => {
		const cpdata = {
			position: cp.position.toArray(),
			target: cp.target.toArray(),
		};

		return cpdata;
	});

	const data = {
		uuid: animation.uuid,
		name: animation.name,
		duration: animation.duration,
		t: animation.t,
		curveType: animation.curveType,
		visible: animation.visible,
		controlPoints: controlPoints,
	};

	return data;
}

function createMeasurementData(measurement){

	const data = {
		uuid: measurement.uuid,
		name: measurement.name,
		points: measurement.points.map(p => p.position.toArray()),
		showDistances: measurement.showDistances,
		showCoordinates: measurement.showCoordinates,
		showArea: measurement.showArea,
		closed: measurement.closed,
		showAngles: measurement.showAngles,
		showHeight: measurement.showHeight,
		showCircle: measurement.showCircle,
		showAzimuth: measurement.showAzimuth,
		showEdges: measurement.showEdges,
		color: measurement.color.toArray(),
	};

	return data;
}

function createOrientedImagesData(images){
	const data = {
		cameraParamsPath: images.cameraParamsPath,
		imageParamsPath: images.imageParamsPath,
	};

	return data;
}

function createGeopackageData(geopackage){
	const data = {
		path: geopackage.path,
	};

	return data;
}

function createAnnotationData(annotation){

	const data = {
		uuid: annotation.uuid,
		title: annotation.title.toString(),
		description: annotation.description,
		position: annotation.position.toArray(),
		offset: annotation.offset.toArray(),
		children: [],
	};

	if(annotation.cameraPosition){
		data.cameraPosition = annotation.cameraPosition.toArray();
	}

	if(annotation.cameraTarget){
		data.cameraTarget = annotation.cameraTarget.toArray();
	}

	if(typeof annotation.radius !== "undefined"){
		data.radius = annotation.radius;
	}

	return data;
}

function createAnnotationsData(viewer){
	
	const map = new Map();

	viewer.scene.annotations.traverseDescendants(a => {
		const aData = createAnnotationData(a);

		map.set(a, aData);
	});

	for(const [annotation, data] of map){
		for(const child of annotation.children){
			const childData = map.get(child);
			data.children.push(childData);
		}
	}

	const annotations = viewer.scene.annotations.children.map(a => map.get(a));

	return annotations;
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

function createClassificationData(viewer){
	const classifications = viewer.classifications;

	const data = classifications;

	return data;
}

export function saveProject(viewer) {

	const scene = viewer.scene;

	const data = {
		type: "Potree",
		version: 1.7,
		settings: createSettingsData(viewer),
		view: createViewData(viewer),
		classification: createClassificationData(viewer),
		pointclouds: scene.pointclouds.map(createPointcloudData),
		measurements: scene.measurements.map(createMeasurementData),
		volumes: scene.volumes.map(createVolumeData),
		cameraAnimations: scene.cameraAnimations.map(createCameraAnimationData),
		profiles: scene.profiles.map(createProfileData),
		annotations: createAnnotationsData(viewer),
		orientedImages: scene.orientedImages.map(createOrientedImagesData),
		geopackages: scene.geopackages.map(createGeopackageData),
		// objects: createSceneContentData(viewer),
	};

	return data;
}
