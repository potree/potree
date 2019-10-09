

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

}