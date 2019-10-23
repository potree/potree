

function loadPointCloud(viewer, data){
	Potree.loadPointCloud(data.url, data.name, () => {

	});
}

function loadMeasurement(viewer, data){

	const measure = new Potree.Measure();

	measure.name = data.name;
	measure.showDistances = data.showDistances;
	measure.showCoordinates = data.showCoordinates;
	measure.showArea = data.showArea;
	measure.closed = data.closed;
	measure.showAngles = data.showAngles;
	measure.showHeight = data.showHeight;
	// color

	for(const point of data.points){
		const pos = new THREE.Vector3(...point);
		measure.addMarker(pos);
	}

	viewer.scene.addMeasurement(measure);

}

function loadVolume(viewer, data){
	let volume = new Potree[data.type];

	volume.name = data.name;
	volume.position.set(...data.position);
	volume.rotation.set(...data.rotation);
	volume.scale.set(...data.scale);
	volume.visible = data.visible;
	volume.clip = data.clip;

	viewer.scene.addVolume(volume);
}

function loadSettings(viewer, data){

	viewer.setPointBudget(data.pointBudget);
	viewer.setFOV(data.fov);
	viewer.setEDLEnabled(data.edlEnabled);
	viewer.setEDLRadius(data.edlRadius);
	viewer.setEDLStrength(data.edlStrength);
	viewer.setBackground(data.background);
	viewer.setMinNodeSize(data.minNodeSize);
	viewer.setShowBoundingBox(data.showBoundingBoxes);

}


export function loadSaveData(viewer, data){

	if(data.type !== "Potree"){
		console.error("not a valid Potree project");
		return;
	}

	loadSettings(viewer, data.settings);

	for(const measure of data.measurements){
		loadMeasurement(viewer, measure);
	}

	for(const volume of data.volumes){
		loadVolume(viewer, volume);
	}

	for(const profile of data.profiles){
		loadProfile(viewer, profile);
	}

}