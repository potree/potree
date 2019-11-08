

import {Annotation} from "../Annotation.js";
import {Measure} from "../utils/Measure.js";
import {CameraAnimation} from "../modules/CameraAnimation/CameraAnimation.js";

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

	const duplicate = viewer.scene.measurements.find(measure => measure.uuid === data.uuid);
	if(duplicate){
		return;
	}

	const measure = new Measure();

	measure.uuid = data.uuid;
	measure.name = data.name;
	measure.showDistances = data.showDistances;
	measure.showCoordinates = data.showCoordinates;
	measure.showArea = data.showArea;
	measure.closed = data.closed;
	measure.showAngles = data.showAngles;
	measure.showHeight = data.showHeight;
	measure.showCircle = data.showCircle;
	measure.showAzimuth = data.showAzimuth;
	measure.showEdges = data.showEdges;
	// color

	for(const point of data.points){
		const pos = new THREE.Vector3(...point);
		measure.addMarker(pos);
	}

	viewer.scene.addMeasurement(measure);

}

function loadVolume(viewer, data){

	const duplicate = viewer.scene.volumes.find(volume => volume.uuid === data.uuid);
	if(duplicate){
		return;
	}

	let volume = new Potree[data.type];

	volume.uuid = data.uuid;
	volume.name = data.name;
	volume.position.set(...data.position);
	volume.rotation.set(...data.rotation);
	volume.scale.set(...data.scale);
	volume.visible = data.visible;
	volume.clip = data.clip;

	viewer.scene.addVolume(volume);
}

function loadCameraAnimation(viewer, data){

	const duplicate = viewer.scene.cameraAnimations.find(a => a.uuid === data.uuid);
	if(duplicate){
		return;
	}

	const animation = new CameraAnimation(viewer);

	animation.uuid = data.uuid;
	animation.name = data.name;
	animation.duration = data.duration;
	animation.t = data.t;
	animation.curveType = data.curveType;
	animation.visible = data.visible;
	animation.controlPoints = [];

	for(const cpdata of data.controlPoints){
		const cp = animation.createControlPoint();

		cp.position.set(...cpdata.position);
		cp.target.set(...cpdata.target);
	}

	viewer.scene.addCameraAnimation(animation);
}

function loadOrientedImages(viewer, images){

	const {cameraParamsPath, imageParamsPath} = images;

	const duplicate = viewer.scene.orientedImages.find(i => i.imageParamsPath === imageParamsPath);
	if(duplicate){
		return;
	}

	Potree.OrientedImageLoader.load(cameraParamsPath, imageParamsPath, viewer).then( images => {
		viewer.scene.addOrientedImages(images);
	});

}

function loadSettings(viewer, data){
	if(!data){
		return;
	}

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

	annotation.uuid = item.uuid;
	annotation.offset.set(...item.offset);

	return annotation;
}

function loadAnnotations(viewer, data){

	if(!data){
		return;
	}

	const {items, hierarchy} = data;

	const existingAnnotations = [];
	viewer.scene.annotations.traverseDescendants(annotation => {
		existingAnnotations.push(annotation);
	});

	for(const item of items){

		const duplicate = existingAnnotations.find(ann => ann.uuid === item.uuid);
		if(duplicate){
			continue;
		}

		const annotation = loadAnnotationItem(item);
		viewer.scene.annotations.add(annotation);
	}

}

function loadProfile(viewer, data){
	
	const {name, points} = data;

	const duplicate = viewer.scene.profiles.find(profile => profile.uuid === data.uuid);
	if(duplicate){
		return;
	}

	let profile = new Potree.Profile();
	profile.name = name;
	profile.uuid = data.uuid;

	profile.setWidth(data.width);

	for(const point of points){
		profile.addMarker(new THREE.Vector3(...point));
	}
	
	viewer.scene.addProfile(profile);
}

function loadClassification(viewer, data){
	if(!data){
		return;
	}

	const classifications = data;

	viewer.setClassifications(classifications);
}

export function loadProject(viewer, data){

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

	for(const animation of data.cameraAnimations){
		loadCameraAnimation(viewer, animation);
	}

	for(const profile of data.profiles){
		loadProfile(viewer, profile);
	}

	for(const images of data.orientedImages){
		loadOrientedImages(viewer, images);
	}

	loadAnnotations(viewer, data.annotations);

	loadClassification(viewer, data.classification);
}