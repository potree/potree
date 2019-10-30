

import {Annotation} from "../Annotation.js";
import {Measure} from "../utils/Measure.js";

function loadPointCloud(viewer, data){

	const names = viewer.scene.pointclouds.map(p => p.name);
	const alreadyExists = names.includes(data.name);

	if(alreadyExists){
		return;
	}

	Potree.loadPointCloud(data.url, data.name, (e) => {
		const {pointcloud} = e;

		pointcloud.position.set(...data.position);
		pointcloud.rotation.set(...data.rotation);
		pointcloud.scale.set(...data.scale);

		viewer.scene.addPointCloud(pointcloud);
	});
}

function loadMeasurement(viewer, data){

	const measure = new Measure();

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

function loadView(viewer, view){
	viewer.scene.view.position.set(...view.position);
	viewer.scene.view.lookAt(...view.target);
}

function loadAnnotationItem(item){
	const annotation = new Annotation({
		position: item.position,
		title: item.title,
	});

	annotation.offset.set(...item.offset);

	return annotation;
}

function loadAnnotations(viewer, data){

	const {items, hierarchy} = data;

	const annotations = items.map(loadAnnotationItem);

	for(const annotation of annotations){
		viewer.scene.annotations.add(annotation);
	}

}

function loadProfile(viewer, data){
	
	// const {name, points} = data;

	// let profile = new Potree.Profile();
	// profile.name = "Elevation Profile";
	// profile.setWidth(6)
	// profile.addMarker(new THREE.Vector3(2561699.409, 1205164.310, 478.648));
	// profile.addMarker(new THREE.Vector3(2561659.311, 1205242.101, 491.235));
	
	// viewer.scene.addProfile(profile);

}

function loadClassification(viewer, data){

	const classifications = data;

	viewer.setClassifications(classifications);
}


export function loadSaveData(viewer, data){

	if(data.type !== "Potree"){
		console.error("not a valid Potree project");
		return;
	}

	loadSettings(viewer, data.settings);

	loadView(viewer, data.view);

	for(const pointcloud of data.pointclouds){
		loadPointCloud(viewer, pointcloud);
	}

	for(const measure of data.measurements){
		loadMeasurement(viewer, measure);
	}

	for(const volume of data.volumes){
		loadVolume(viewer, volume);
	}

	for(const profile of data.profiles){
		loadProfile(viewer, profile);
	}

	loadAnnotations(viewer, data.annotations);

	loadClassification(viewer, data.classifications);

}