
import * as THREE from "../../libs/three.js/build/three.module.js";
import {GeoJSONExporter} from "../exporter/GeoJSONExporter.js"
import {DXFExporter} from "../exporter/DXFExporter.js"
import {Volume, SphereVolume} from "../utils/Volume.js"
import {PolygonClipVolume} from "../utils/PolygonClipVolume.js"
import {PropertiesPanel} from "./PropertyPanels/PropertiesPanel.js"
import {PointCloudTree} from "../PointCloudTree.js"
import {Profile} from "../utils/Profile.js"
import {Measure} from "../utils/Measure.js"
import {Annotation} from "../Annotation.js"
import {CameraMode, ClipTask, ClipMethod} from "../defines.js"
import {ScreenBoxSelectTool} from "../utils/ScreenBoxSelectTool.js"
import {Utils} from "../utils.js"
import {CameraAnimation} from "../modules/CameraAnimation/CameraAnimation.js"
import {HierarchicalSlider} from "./HierarchicalSlider.js"
import {OrientedImage} from "../modules/OrientedImages/OrientedImages.js";
import {Images360} from "../modules/Images360/Images360.js";

import JSON5 from "../../libs/json5-2.1.3/json5.mjs";

export class Sidebar{

	constructor(viewer){
		this.viewer = viewer;

		this.measuringTool = viewer.measuringTool;
		this.profileTool = viewer.profileTool;
		this.volumeTool = viewer.volumeTool;

		this.dom = $("#sidebar_root");
	}

	createToolIcon(icon, title, callback){
		let element = $(`
			<img src="${icon}"
				style="width: 32px; height: 32px"
				class="button-icon"
				data-i18n="${title}" />
		`);

		element.click(callback);

		return element;
	}

	init(){

		this.initAccordion();
		this.initAppearance();
		this.initToolbar();
		this.initScene();
		this.initNavigation();
		this.initFilters();
		this.initClippingTool();
		this.initSettings();
		
		$('#potree_version_number').html(Potree.version.major + "." + Potree.version.minor + Potree.version.suffix);
	}

		

	initToolbar(){

		// ANGLE
		let elToolbar = $('#tools');
		elToolbar.append(this.createToolIcon(
			Potree.resourcePath + '/icons/angle.png',
			'[title]tt.angle_measurement',
			() => {
				$('#menu_measurements').next().slideDown();
				let measurement = this.measuringTool.startInsertion({
					showDistances: false,
					showAngles: true,
					showArea: false,
					closed: true,
					maxMarkers: 3,
					name: 'Angle'});

				let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
				let jsonNode = measurementsRoot.children.find(child => child.data.uuid === measurement.uuid);
				$.jstree.reference(jsonNode.id).deselect_all();
				$.jstree.reference(jsonNode.id).select_node(jsonNode.id);
			}
		));

		// POINT
		elToolbar.append(this.createToolIcon(
			Potree.resourcePath + '/icons/point.svg',
			'[title]tt.point_measurement',
			() => {
				$('#menu_measurements').next().slideDown();
				let measurement = this.measuringTool.startInsertion({
					showDistances: false,
					showAngles: false,
					showCoordinates: true,
					showArea: false,
					closed: true,
					maxMarkers: 1,
					name: 'Point'});

				let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
				let jsonNode = measurementsRoot.children.find(child => child.data.uuid === measurement.uuid);
				$.jstree.reference(jsonNode.id).deselect_all();
				$.jstree.reference(jsonNode.id).select_node(jsonNode.id);
			}
		));

		// DISTANCE
		elToolbar.append(this.createToolIcon(
			Potree.resourcePath + '/icons/distance.svg',
			'[title]tt.distance_measurement',
			() => {
				$('#menu_measurements').next().slideDown();
				let measurement = this.measuringTool.startInsertion({
					showDistances: true,
					showArea: false,
					closed: false,
					name: 'Distance'});

				let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
				let jsonNode = measurementsRoot.children.find(child => child.data.uuid === measurement.uuid);
				$.jstree.reference(jsonNode.id).deselect_all();
				$.jstree.reference(jsonNode.id).select_node(jsonNode.id);
			}
		));

		// HEIGHT
		elToolbar.append(this.createToolIcon(
			Potree.resourcePath + '/icons/height.svg',
			'[title]tt.height_measurement',
			() => {
				$('#menu_measurements').next().slideDown();
				let measurement = this.measuringTool.startInsertion({
					showDistances: false,
					showHeight: true,
					showArea: false,
					closed: false,
					maxMarkers: 2,
					name: 'Height'});

				let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
				let jsonNode = measurementsRoot.children.find(child => child.data.uuid === measurement.uuid);
				$.jstree.reference(jsonNode.id).deselect_all();
				$.jstree.reference(jsonNode.id).select_node(jsonNode.id);
			}
		));

		// CIRCLE
		elToolbar.append(this.createToolIcon(
			Potree.resourcePath + '/icons/circle.svg',
			'[title]tt.circle_measurement',
			() => {
				$('#menu_measurements').next().slideDown();
				let measurement = this.measuringTool.startInsertion({
					showDistances: false,
					showHeight: false,
					showArea: false,
					showCircle: true,
					showEdges: false,
					closed: false,
					maxMarkers: 3,
					name: 'Circle'});

				let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
				let jsonNode = measurementsRoot.children.find(child => child.data.uuid === measurement.uuid);
				$.jstree.reference(jsonNode.id).deselect_all();
				$.jstree.reference(jsonNode.id).select_node(jsonNode.id);
			}
		));

		// AZIMUTH
		elToolbar.append(this.createToolIcon(
			Potree.resourcePath + '/icons/azimuth.svg',
			'Azimuth',
			() => {
				$('#menu_measurements').next().slideDown();
				let measurement = this.measuringTool.startInsertion({
					showDistances: false,
					showHeight: false,
					showArea: false,
					showCircle: false,
					showEdges: false,
					showAzimuth: true,
					closed: false,
					maxMarkers: 2,
					name: 'Azimuth'});

				let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
				let jsonNode = measurementsRoot.children.find(child => child.data.uuid === measurement.uuid);
				$.jstree.reference(jsonNode.id).deselect_all();
				$.jstree.reference(jsonNode.id).select_node(jsonNode.id);
			}
		));

		// AREA
		elToolbar.append(this.createToolIcon(
			Potree.resourcePath + '/icons/area.svg',
			'[title]tt.area_measurement',
			() => {
				$('#menu_measurements').next().slideDown();
				let measurement = this.measuringTool.startInsertion({
					showDistances: true,
					showArea: true,
					closed: true,
					name: 'Area'});

				let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
				let jsonNode = measurementsRoot.children.find(child => child.data.uuid === measurement.uuid);
				$.jstree.reference(jsonNode.id).deselect_all();
				$.jstree.reference(jsonNode.id).select_node(jsonNode.id);
			}
		));

		// VOLUME
		elToolbar.append(this.createToolIcon(
			Potree.resourcePath + '/icons/volume.svg',
			'[title]tt.volume_measurement',
			() => {
				let volume = this.volumeTool.startInsertion(); 

				let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
				let jsonNode = measurementsRoot.children.find(child => child.data.uuid === volume.uuid);
				$.jstree.reference(jsonNode.id).deselect_all();
				$.jstree.reference(jsonNode.id).select_node(jsonNode.id);
			}
		));

		// SPHERE VOLUME
		elToolbar.append(this.createToolIcon(
			Potree.resourcePath + '/icons/sphere_distances.svg',
			'[title]tt.volume_measurement',
			() => { 
				let volume = this.volumeTool.startInsertion({type: SphereVolume}); 

				let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
				let jsonNode = measurementsRoot.children.find(child => child.data.uuid === volume.uuid);
				$.jstree.reference(jsonNode.id).deselect_all();
				$.jstree.reference(jsonNode.id).select_node(jsonNode.id);
			}
		));

		// PROFILE
		elToolbar.append(this.createToolIcon(
			Potree.resourcePath + '/icons/profile.svg',
			'[title]tt.height_profile',
			() => {
				$('#menu_measurements').next().slideDown(); ;
				let profile = this.profileTool.startInsertion();

				let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
				let jsonNode = measurementsRoot.children.find(child => child.data.uuid === profile.uuid);
				$.jstree.reference(jsonNode.id).deselect_all();
				$.jstree.reference(jsonNode.id).select_node(jsonNode.id);
			}
		));

		// ANNOTATION
		elToolbar.append(this.createToolIcon(
			Potree.resourcePath + '/icons/annotation.svg',
			'[title]tt.annotation',
			() => {
				$('#menu_measurements').next().slideDown(); ;
				let annotation = this.viewer.annotationTool.startInsertion();

				let annotationsRoot = $("#jstree_scene").jstree().get_json("annotations");
				let jsonNode = annotationsRoot.children.find(child => child.data.uuid === annotation.uuid);
				$.jstree.reference(jsonNode.id).deselect_all();
				$.jstree.reference(jsonNode.id).select_node(jsonNode.id);
			}
		));

		// REMOVE ALL
		elToolbar.append(this.createToolIcon(
			Potree.resourcePath + '/icons/reset_tools.svg',
			'[title]tt.remove_all_measurement',
			() => {
				this.viewer.scene.removeAllMeasurements();
			}
		));


		{ // SHOW / HIDE Measurements
			let elShow = $("#measurement_options_show");
			elShow.selectgroup({title: "Show/Hide labels"});

			elShow.find("input").click( (e) => {
				const show = e.target.value === "SHOW";
				this.measuringTool.showLabels = show;
			});

			let currentShow = this.measuringTool.showLabels ? "SHOW" : "HIDE";
			elShow.find(`input[value=${currentShow}]`).trigger("click");
		}
	}

	initScene(){

		let elScene = $("#menu_scene");
		let elObjects = elScene.next().find("#scene_objects");
		let elProperties = elScene.next().find("#scene_object_properties");
		

		{
			let elExport = elScene.next().find("#scene_export");

			let geoJSONIcon = `${Potree.resourcePath}/icons/file_geojson.svg`;
			let dxfIcon = `${Potree.resourcePath}/icons/file_dxf.svg`;
			let potreeIcon = `${Potree.resourcePath}/icons/file_potree.svg`;

			elExport.append(`
				Export: <br>
				<a href="#" download="measure.json"><img name="geojson_export_button" src="${geoJSONIcon}" class="button-icon" style="height: 24px" /></a>
				<a href="#" download="measure.dxf"><img name="dxf_export_button" src="${dxfIcon}" class="button-icon" style="height: 24px" /></a>
				<a href="#" download="potree.json5"><img name="potree_export_button" src="${potreeIcon}" class="button-icon" style="height: 24px" /></a>
			`);

			let elDownloadJSON = elExport.find("img[name=geojson_export_button]").parent();
			elDownloadJSON.click( (event) => {
				let scene = this.viewer.scene;
				let measurements = [...scene.measurements, ...scene.profiles, ...scene.volumes];

				if(measurements.length > 0){
					let geoJson = GeoJSONExporter.toString(measurements);

					let url = window.URL.createObjectURL(new Blob([geoJson], {type: 'data:application/octet-stream'}));
					elDownloadJSON.attr('href', url);
				}else{
					this.viewer.postError("no measurements to export");
					event.preventDefault();
				}
			});

			let elDownloadDXF = elExport.find("img[name=dxf_export_button]").parent();
			elDownloadDXF.click( (event) => {
				let scene = this.viewer.scene;
				let measurements = [...scene.measurements, ...scene.profiles, ...scene.volumes];

				if(measurements.length > 0){
					let dxf = DXFExporter.toString(measurements);

					let url = window.URL.createObjectURL(new Blob([dxf], {type: 'data:application/octet-stream'}));
					elDownloadDXF.attr('href', url);
				}else{
					this.viewer.postError("no measurements to export");
					event.preventDefault();
				}
			});

			let elDownloadPotree = elExport.find("img[name=potree_export_button]").parent();
			elDownloadPotree.click( (event) => {

				let data = Potree.saveProject(this.viewer);
				let dataString = JSON5.stringify(data, null, "\t")

				let url = window.URL.createObjectURL(new Blob([dataString], {type: 'data:application/octet-stream'}));
				elDownloadPotree.attr('href', url);
			});
		}

		let propertiesPanel = new PropertiesPanel(elProperties, this.viewer);
		propertiesPanel.setScene(this.viewer.scene);
		
		localStorage.removeItem('jstree');

		let tree = $(`<div id="jstree_scene"></div>`);
		elObjects.append(tree);

		tree.jstree({
			'plugins': ["checkbox", "state"],
			'core': {
				"dblclick_toggle": false,
				"state": {
					"checked" : true
				},
				'check_callback': true,
				"expand_selected_onload": true
			},
			"checkbox" : {
				"keep_selected_style": true,
				"three_state": false,
				"whole_node": false,
				"tie_selection": false,
			},
		});

		let createNode = (parent, text, icon, object) => {
			let nodeID = tree.jstree('create_node', parent, { 
					"text": text, 
					"icon": icon,
					"data": object
				}, 
				"last", false, false);
			
			if(object.visible){
				tree.jstree('check_node', nodeID);
			}else{
				tree.jstree('uncheck_node', nodeID);
			}

			return nodeID;
		}

		let pcID = tree.jstree('create_node', "#", { "text": "<b>Point Clouds</b>", "id": "pointclouds"}, "last", false, false);
		let measurementID = tree.jstree('create_node', "#", { "text": "<b>Measurements</b>", "id": "measurements" }, "last", false, false);
		let annotationsID = tree.jstree('create_node', "#", { "text": "<b>Annotations</b>", "id": "annotations" }, "last", false, false);
		let otherID = tree.jstree('create_node', "#", { "text": "<b>Other</b>", "id": "other" }, "last", false, false);
		let vectorsID = tree.jstree('create_node', "#", { "text": "<b>Vectors</b>", "id": "vectors" }, "last", false, false);
		let imagesID = tree.jstree('create_node', "#", { "text": "<b> Images</b>", "id": "images" }, "last", false, false);

		tree.jstree("check_node", pcID);
		tree.jstree("check_node", measurementID);
		tree.jstree("check_node", annotationsID);
		tree.jstree("check_node", otherID);
		tree.jstree("check_node", vectorsID);
		tree.jstree("check_node", imagesID);

		tree.on('create_node.jstree', (e, data) => {
			tree.jstree("open_all");
		});

		tree.on("select_node.jstree", (e, data) => {
			let object = data.node.data;
			propertiesPanel.set(object);

			this.viewer.inputHandler.deselectAll();

			if(object instanceof Volume){
				this.viewer.inputHandler.toggleSelection(object);
			}

			$(this.viewer.renderer.domElement).focus();
		});

		tree.on("deselect_node.jstree", (e, data) => {
			propertiesPanel.set(null);
		});

		tree.on("delete_node.jstree", (e, data) => {
			propertiesPanel.set(null);
		});

		tree.on('dblclick','.jstree-anchor', (e) => {

			let instance = $.jstree.reference(e.target);
			let node = instance.get_node(e.target);
			let object = node.data;

			// ignore double click on checkbox
			if(e.target.classList.contains("jstree-checkbox")){
				return;
			}

			if(object instanceof PointCloudTree){
				let box = this.viewer.getBoundingBox([object]);
				let node = new THREE.Object3D();
				node.boundingBox = box;
				this.viewer.zoomTo(node, 1, 500);
			}else if(object instanceof Measure){
				let points = object.points.map(p => p.position);
				let box = new THREE.Box3().setFromPoints(points);
				if(box.getSize(new THREE.Vector3()).length() > 0){
					let node = new THREE.Object3D();
					node.boundingBox = box;
					this.viewer.zoomTo(node, 2, 500);
				}
			}else if(object instanceof Profile){
				let points = object.points;
				let box = new THREE.Box3().setFromPoints(points);
				if(box.getSize(new THREE.Vector3()).length() > 0){
					let node = new THREE.Object3D();
					node.boundingBox = box;
					this.viewer.zoomTo(node, 1, 500);
				}
			}else if(object instanceof Volume){
				
				let box = object.boundingBox.clone().applyMatrix4(object.matrixWorld);

				if(box.getSize(new THREE.Vector3()).length() > 0){
					let node = new THREE.Object3D();
					node.boundingBox = box;
					this.viewer.zoomTo(node, 1, 500);
				}
			}else if(object instanceof Annotation){
				object.moveHere(this.viewer.scene.getActiveCamera());
			}else if(object instanceof PolygonClipVolume){
				let dir = object.camera.getWorldDirection(new THREE.Vector3());
				let target;

				if(object.camera instanceof THREE.OrthographicCamera){
					dir.multiplyScalar(object.camera.right)
					target = new THREE.Vector3().addVectors(object.camera.position, dir);
					this.viewer.setCameraMode(CameraMode.ORTHOGRAPHIC);
				}else if(object.camera instanceof THREE.PerspectiveCamera){
					dir.multiplyScalar(this.viewer.scene.view.radius);
					target = new THREE.Vector3().addVectors(object.camera.position, dir);
					this.viewer.setCameraMode(CameraMode.PERSPECTIVE);
				}
				
				this.viewer.scene.view.position.copy(object.camera.position);
				this.viewer.scene.view.lookAt(target);
			}else if(object.type === "SpotLight"){
				let distance = (object.distance > 0) ? object.distance / 4 : 5 * 1000;
				let position = object.position;
				let target = new THREE.Vector3().addVectors(
					position, 
					object.getWorldDirection(new THREE.Vector3()).multiplyScalar(distance));

				this.viewer.scene.view.position.copy(object.position);
				this.viewer.scene.view.lookAt(target);
			}else if(object instanceof THREE.Object3D){
				let box = new THREE.Box3().setFromObject(object);

				if(box.getSize(new THREE.Vector3()).length() > 0){
					let node = new THREE.Object3D();
					node.boundingBox = box;
					this.viewer.zoomTo(node, 1, 500);
				}
			}else if(object instanceof OrientedImage){
				// TODO zoom to images

				// let box = new THREE.Box3().setFromObject(object);

				// if(box.getSize(new THREE.Vector3()).length() > 0){
				// 	let node = new THREE.Object3D();
				// 	node.boundingBox = box;
				// 	this.viewer.zoomTo(node, 1, 500);
				// }
			}else if(object instanceof Images360){
				// TODO
			}else if(object instanceof Geopackage){
				// TODO
			}
		});

		tree.on("uncheck_node.jstree", (e, data) => {
			let object = data.node.data;

			if(object){
				object.visible = false;
			}
		});

		tree.on("check_node.jstree", (e, data) => {
			let object = data.node.data;

			if(object){
				object.visible = true;
			}
		});


		let onPointCloudAdded = (e) => {
			let pointcloud = e.pointcloud;
			let cloudIcon = `${Potree.resourcePath}/icons/cloud.svg`;
			let node = createNode(pcID, pointcloud.name, cloudIcon, pointcloud);

			pointcloud.addEventListener("visibility_changed", () => {
				if(pointcloud.visible){
					tree.jstree('check_node', node);
				}else{
					tree.jstree('uncheck_node', node);
				}
			});
		};

		let onMeasurementAdded = (e) => {
			let measurement = e.measurement;
			let icon = Utils.getMeasurementIcon(measurement);
			createNode(measurementID, measurement.name, icon, measurement);
		};

		let onVolumeAdded = (e) => {
			let volume = e.volume;
			let icon = Utils.getMeasurementIcon(volume);
			let node = createNode(measurementID, volume.name, icon, volume);

			volume.addEventListener("visibility_changed", () => {
				if(volume.visible){
					tree.jstree('check_node', node);
				}else{
					tree.jstree('uncheck_node', node);
				}
			});
		};

		let onProfileAdded = (e) => {
			let profile = e.profile;
			let icon = Utils.getMeasurementIcon(profile);
			createNode(measurementID, profile.name, icon, profile);
		};

		let onAnnotationAdded = (e) => {
			let annotation = e.annotation;

			let annotationIcon = `${Potree.resourcePath}/icons/annotation.svg`;
			let parentID = this.annotationMapping.get(annotation.parent);
			let annotationID = createNode(parentID, annotation.title, annotationIcon, annotation);
			this.annotationMapping.set(annotation, annotationID);

			annotation.addEventListener("annotation_changed", (e) => {
				let annotationsRoot = $("#jstree_scene").jstree().get_json("annotations");
				let jsonNode = annotationsRoot.children.find(child => child.data.uuid === annotation.uuid);
				
				$.jstree.reference(jsonNode.id).rename_node(jsonNode.id, annotation.title);
			});
		};

		let onCameraAnimationAdded = (e) => {
			const animation = e.animation;

			const animationIcon = `${Potree.resourcePath}/icons/camera_animation.svg`;
			createNode(otherID, "animation", animationIcon, animation);
		};

		let onOrientedImagesAdded = (e) => {
			const images = e.images;

			const imagesIcon = `${Potree.resourcePath}/icons/picture.svg`;
			const node = createNode(imagesID, "images", imagesIcon, images);

			images.addEventListener("visibility_changed", () => {
				if(images.visible){
					tree.jstree('check_node', node);
				}else{
					tree.jstree('uncheck_node', node);
				}
			});
		};

		let onImages360Added = (e) => {
			const images = e.images;

			const imagesIcon = `${Potree.resourcePath}/icons/picture.svg`;
			const node = createNode(imagesID, "360° images", imagesIcon, images);

			images.addEventListener("visibility_changed", () => {
				if(images.visible){
					tree.jstree('check_node', node);
				}else{
					tree.jstree('uncheck_node', node);
				}
			});
		};

		const onGeopackageAdded = (e) => {
			const geopackage = e.geopackage;

			const geopackageIcon = `${Potree.resourcePath}/icons/triangle.svg`;
			const tree = $(`#jstree_scene`);
			const parentNode = "vectors";

			for(const layer of geopackage.node.children){
				const name = layer.name;

				let shpPointsID = tree.jstree('create_node', parentNode, { 
						"text": name, 
						"icon": geopackageIcon,
						"object": layer,
						"data": layer,
					}, 
					"last", false, false);
				tree.jstree(layer.visible ? "check_node" : "uncheck_node", shpPointsID);
			}

		};

		this.viewer.scene.addEventListener("pointcloud_added", onPointCloudAdded);
		this.viewer.scene.addEventListener("measurement_added", onMeasurementAdded);
		this.viewer.scene.addEventListener("profile_added", onProfileAdded);
		this.viewer.scene.addEventListener("volume_added", onVolumeAdded);
		this.viewer.scene.addEventListener("camera_animation_added", onCameraAnimationAdded);
		this.viewer.scene.addEventListener("oriented_images_added", onOrientedImagesAdded);
		this.viewer.scene.addEventListener("360_images_added", onImages360Added);
		this.viewer.scene.addEventListener("geopackage_added", onGeopackageAdded);
		this.viewer.scene.addEventListener("polygon_clip_volume_added", onVolumeAdded);
		this.viewer.scene.annotations.addEventListener("annotation_added", onAnnotationAdded);

		let onMeasurementRemoved = (e) => {
			let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
			let jsonNode = measurementsRoot.children.find(child => child.data.uuid === e.measurement.uuid);
			
			tree.jstree("delete_node", jsonNode.id);
		};

		let onVolumeRemoved = (e) => {
			let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
			let jsonNode = measurementsRoot.children.find(child => child.data.uuid === e.volume.uuid);
			
			tree.jstree("delete_node", jsonNode.id);
		};

		let onPolygonClipVolumeRemoved = (e) => {
			let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
			let jsonNode = measurementsRoot.children.find(child => child.data.uuid === e.volume.uuid);
			
			tree.jstree("delete_node", jsonNode.id);
		};

		let onProfileRemoved = (e) => {
			let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
			let jsonNode = measurementsRoot.children.find(child => child.data.uuid === e.profile.uuid);
			
			tree.jstree("delete_node", jsonNode.id);
		};

		this.viewer.scene.addEventListener("measurement_removed", onMeasurementRemoved);
		this.viewer.scene.addEventListener("volume_removed", onVolumeRemoved);
		this.viewer.scene.addEventListener("polygon_clip_volume_removed", onPolygonClipVolumeRemoved);
		this.viewer.scene.addEventListener("profile_removed", onProfileRemoved);

		{
			let annotationIcon = `${Potree.resourcePath}/icons/annotation.svg`;
			this.annotationMapping = new Map(); 
			this.annotationMapping.set(this.viewer.scene.annotations, annotationsID);
			this.viewer.scene.annotations.traverseDescendants(annotation => {
				let parentID = this.annotationMapping.get(annotation.parent);
				let annotationID = createNode(parentID, annotation.title, annotationIcon, annotation);
				this.annotationMapping.set(annotation, annotationID);
			});
		}

		const scene = this.viewer.scene;
		for(let pointcloud of scene.pointclouds){
			onPointCloudAdded({pointcloud: pointcloud});
		}

		for(let measurement of scene.measurements){
			onMeasurementAdded({measurement: measurement});
		}

		for(let volume of [...scene.volumes, ...scene.polygonClipVolumes]){
			onVolumeAdded({volume: volume});
		}

		for(let animation of scene.cameraAnimations){
			onCameraAnimationAdded({animation: animation});
		}

		for(let images of scene.orientedImages){
			onOrientedImagesAdded({images: images});
		}

		for(let images of scene.images360){
			onImages360Added({images: images});
		}

		for(const geopackage of scene.geopackages){
			onGeopackageAdded({geopackage: geopackage});
		}

		for(let profile of scene.profiles){
			onProfileAdded({profile: profile});
		}

		{
			createNode(otherID, "Camera", null, new THREE.Camera());
		}

		this.viewer.addEventListener("scene_changed", (e) => {
			propertiesPanel.setScene(e.scene);

			e.oldScene.removeEventListener("pointcloud_added", onPointCloudAdded);
			e.oldScene.removeEventListener("measurement_added", onMeasurementAdded);
			e.oldScene.removeEventListener("profile_added", onProfileAdded);
			e.oldScene.removeEventListener("volume_added", onVolumeAdded);
			e.oldScene.removeEventListener("polygon_clip_volume_added", onVolumeAdded);
			e.oldScene.removeEventListener("measurement_removed", onMeasurementRemoved);

			e.scene.addEventListener("pointcloud_added", onPointCloudAdded);
			e.scene.addEventListener("measurement_added", onMeasurementAdded);
			e.scene.addEventListener("profile_added", onProfileAdded);
			e.scene.addEventListener("volume_added", onVolumeAdded);
			e.scene.addEventListener("polygon_clip_volume_added", onVolumeAdded);
			e.scene.addEventListener("measurement_removed", onMeasurementRemoved);
		});

	}

	initClippingTool(){


		this.viewer.addEventListener("cliptask_changed", (event) => {
			console.log("TODO");
		});

		this.viewer.addEventListener("clipmethod_changed", (event) => {
			console.log("TODO");
		});

		{
			let elClipTask = $("#cliptask_options");
			elClipTask.selectgroup({title: "Clip Task"});

			elClipTask.find("input").click( (e) => {
				this.viewer.setClipTask(ClipTask[e.target.value]);
			});

			let currentClipTask = Object.keys(ClipTask)
				.filter(key => ClipTask[key] === this.viewer.clipTask);
			elClipTask.find(`input[value=${currentClipTask}]`).trigger("click");
		}

		{
			let elClipMethod = $("#clipmethod_options");
			elClipMethod.selectgroup({title: "Clip Method"});

			elClipMethod.find("input").click( (e) => {
				this.viewer.setClipMethod(ClipMethod[e.target.value]);
			});

			let currentClipMethod = Object.keys(ClipMethod)
				.filter(key => ClipMethod[key] === this.viewer.clipMethod);
			elClipMethod.find(`input[value=${currentClipMethod}]`).trigger("click");
		}

		let clippingToolBar = $("#clipping_tools");

		// CLIP VOLUME
		clippingToolBar.append(this.createToolIcon(
			Potree.resourcePath + '/icons/clip_volume.svg',
			'[title]tt.clip_volume',
			() => {
				let item = this.volumeTool.startInsertion({clip: true}); 

				let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
				let jsonNode = measurementsRoot.children.find(child => child.data.uuid === item.uuid);
				$.jstree.reference(jsonNode.id).deselect_all();
				$.jstree.reference(jsonNode.id).select_node(jsonNode.id);
			}
		));

		// CLIP POLYGON
		clippingToolBar.append(this.createToolIcon(
			Potree.resourcePath + "/icons/clip-polygon.svg",
			"[title]tt.clip_polygon",
			() => {
				let item = this.viewer.clippingTool.startInsertion({type: "polygon"});

				let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
				let jsonNode = measurementsRoot.children.find(child => child.data.uuid === item.uuid);
				$.jstree.reference(jsonNode.id).deselect_all();
				$.jstree.reference(jsonNode.id).select_node(jsonNode.id);
			}
		));

		{// SCREEN BOX SELECT
			let boxSelectTool = new ScreenBoxSelectTool(this.viewer);

			clippingToolBar.append(this.createToolIcon(
				Potree.resourcePath + "/icons/clip-screen.svg",
				"[title]tt.screen_clip_box",
				() => {
					if(!(this.viewer.scene.getActiveCamera() instanceof THREE.OrthographicCamera)){
						this.viewer.postMessage(`Switch to Orthographic Camera Mode before using the Screen-Box-Select tool.`, 
							{duration: 2000});
						return;
					}
					
					let item = boxSelectTool.startInsertion();

					let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
					let jsonNode = measurementsRoot.children.find(child => child.data.uuid === item.uuid);
					$.jstree.reference(jsonNode.id).deselect_all();
					$.jstree.reference(jsonNode.id).select_node(jsonNode.id);
				}
			));
		}

		{ // REMOVE CLIPPING TOOLS
			clippingToolBar.append(this.createToolIcon(
				Potree.resourcePath + "/icons/remove.svg",
				"[title]tt.remove_all_clipping_volumes",
				() => {

					this.viewer.scene.removeAllClipVolumes();
				}
			));
		}

	}

	initFilters(){
		this.initClassificationList();
		this.initReturnFilters();
		this.initGPSTimeFilters();
		this.initPointSourceIDFilters();

	}

	initReturnFilters(){
		let elReturnFilterPanel = $('#return_filter_panel');

		{ // RETURN NUMBER
			let sldReturnNumber = elReturnFilterPanel.find('#sldReturnNumber');
			let lblReturnNumber = elReturnFilterPanel.find('#lblReturnNumber');

			sldReturnNumber.slider({
				range: true,
				min: 0, max: 7, step: 1,
				values: [0, 7],
				slide: (event, ui) => {
					this.viewer.setFilterReturnNumberRange(ui.values[0], ui.values[1])
				}
			});

			let onReturnNumberChanged = (event) => {
				let [from, to] = this.viewer.filterReturnNumberRange;

				lblReturnNumber[0].innerHTML = `${from} to ${to}`;
				sldReturnNumber.slider({values: [from, to]});
			};

			this.viewer.addEventListener('filter_return_number_range_changed', onReturnNumberChanged);

			onReturnNumberChanged();
		}

		{ // NUMBER OF RETURNS
			let sldNumberOfReturns = elReturnFilterPanel.find('#sldNumberOfReturns');
			let lblNumberOfReturns = elReturnFilterPanel.find('#lblNumberOfReturns');

			sldNumberOfReturns.slider({
				range: true,
				min: 0, max: 7, step: 1,
				values: [0, 7],
				slide: (event, ui) => {
					this.viewer.setFilterNumberOfReturnsRange(ui.values[0], ui.values[1])
				}
			});

			let onNumberOfReturnsChanged = (event) => {
				let [from, to] = this.viewer.filterNumberOfReturnsRange;

				lblNumberOfReturns[0].innerHTML = `${from} to ${to}`;
				sldNumberOfReturns.slider({values: [from, to]});
			};

			this.viewer.addEventListener('filter_number_of_returns_range_changed', onNumberOfReturnsChanged);

			onNumberOfReturnsChanged();
		}
	}

	initGPSTimeFilters(){

		let elGPSTimeFilterPanel = $('#gpstime_filter_panel');

		{
			let slider = new HierarchicalSlider({
				levels: 4,
				slide: (event) => {
					this.viewer.setFilterGPSTimeRange(...event.values);
				},
			});

			let initialized = false;

			let initialize = () => {
				
				let elRangeContainer = $("#gpstime_multilevel_range_container");
				elRangeContainer[0].prepend(slider.element);

				let extent = this.viewer.getGpsTimeExtent();

				slider.setRange(extent);
				slider.setValues(extent);


				initialized = true;
			};

			this.viewer.addEventListener("update", (e) => {
				let extent = this.viewer.getGpsTimeExtent();
				let gpsTimeAvailable = extent[0] !== Infinity;

				if(!initialized && gpsTimeAvailable){
					initialize();
				}

				slider.setRange(extent);
			});
		}


		{
			
			const txtGpsTime = elGPSTimeFilterPanel.find("#txtGpsTime");
			const btnFindGpsTime = elGPSTimeFilterPanel.find("#btnFindGpsTime");

			let targetTime = null;

			txtGpsTime.on("input", (e) => {
				const str = txtGpsTime.val();

				if(!isNaN(str)){
					const value = parseFloat(str);
					targetTime = value;

					txtGpsTime.css("background-color", "")
				}else{
					targetTime = null;

					txtGpsTime.css("background-color", "#ff9999")
				}

			});

			btnFindGpsTime.click( () => {
				
				if(targetTime !== null){
					viewer.moveToGpsTimeVicinity(targetTime);
				}
			});
		}

	}

	initPointSourceIDFilters() {
		let elPointSourceIDFilterPanel = $('#pointsourceid_filter_panel');

		{
			let slider = new HierarchicalSlider({
				levels: 4,
				range: [0, 65535],
				precision: 1,
				slide: (event) => {
					let values = event.values;
					this.viewer.setFilterPointSourceIDRange(values[0], values[1]);
				}
			});

			let initialized = false;

			let initialize = () => {
				elPointSourceIDFilterPanel[0].prepend(slider.element);

				initialized = true;
			};

			this.viewer.addEventListener("update", (e) => {
				let extent = this.viewer.filterPointSourceIDRange;

				if(!initialized){
					initialize();

					slider.setValues(extent);
				}
				
			});
		}

		// let lblPointSourceID = elPointSourceIDFilterPanel.find("#lblPointSourceID");
		// let elPointSourceID = elPointSourceIDFilterPanel.find("#spnPointSourceID");

		// let slider = new ZoomableSlider();
		// elPointSourceID[0].appendChild(slider.element);
		// slider.update();

		// slider.change( () => {
		// 	let range = slider.chosenRange;
		// 	this.viewer.setFilterPointSourceIDRange(range[0], range[1]);
		// });

		// let onPointSourceIDExtentChanged = (event) => {
		// 	let range = this.viewer.filterPointSourceIDExtent;
		// 	slider.setVisibleRange(range);
		// };

		// let onPointSourceIDChanged = (event) => {
		// 	let range = this.viewer.filterPointSourceIDRange;

		// 	let precision = 1;
		// 	let from = `${Utils.addCommas(range[0].toFixed(precision))}`;
		// 	let to = `${Utils.addCommas(range[1].toFixed(precision))}`;
		// 	lblPointSourceID[0].innerHTML = `${from} to ${to}`;

		// 	slider.setRange(range);
		// };

		// this.viewer.addEventListener('filter_point_source_id_range_changed', onPointSourceIDChanged);
		// this.viewer.addEventListener('filter_point_source_id_extent_changed', onPointSourceIDExtentChanged);

	}

	initClassificationList(){
		let elClassificationList = $('#classificationList');

		let addClassificationItem = (code, name) => {
			const classification = this.viewer.classifications[code];
			const inputID = 'chkClassification_' + code;
			const colorPickerID = 'colorPickerClassification_' + code;

			const checked = classification.visible ? "checked" : "";

			let element = $(`
				<li>
					<label style="whitespace: nowrap; display: flex">
						<input id="${inputID}" type="checkbox" ${checked}/>
						<span style="flex-grow: 1">${name}</span>
						<input id="${colorPickerID}" style="zoom: 0.5" />
					</label>
				</li>
			`);

			const elInput = element.find('input');
			const elColorPicker = element.find(`#${colorPickerID}`);

			elInput.click(event => {
				this.viewer.setClassificationVisibility(code, event.target.checked);
			});

			let defaultColor = classification.color.map(c => c *  255).join(", ");
			defaultColor = `rgb(${defaultColor})`;


			elColorPicker.spectrum({
				// flat: true,
				color: defaultColor,
				showInput: true,
				preferredFormat: 'rgb',
				cancelText: '',
				chooseText: 'Apply',
				move: color => {
					let rgb = color.toRgb();
					const c = [rgb.r / 255, rgb.g / 255, rgb.b / 255, 1];
					classification.color = c;
				},
				change: color => {
					let rgb = color.toRgb();
					const c = [rgb.r / 255, rgb.g / 255, rgb.b / 255, 1];
					classification.color = c;
				}
			});

			elClassificationList.append(element);
		};

		const addToggleAllButton = () => { // toggle all button
			const element = $(`
				<li>
					<label style="whitespace: nowrap">
						<input id="toggleClassificationFilters" type="checkbox" checked/>
						<span>show/hide all</span>
					</label>
				</li>
			`);

			let elInput = element.find('input');

			elInput.click(event => {
				this.viewer.toggleAllClassificationsVisibility();
			});

			elClassificationList.append(element);
		}

		const addInvertButton = () => { 
			const element = $(`
				<li>
					<input type="button" value="invert" />
				</li>
			`);

			let elInput = element.find('input');

			elInput.click( () => {
				const classifications = this.viewer.classifications;
	
				for(let key of Object.keys(classifications)){
					let value = classifications[key];
					this.viewer.setClassificationVisibility(key, !value.visible);
				}
			});

			elClassificationList.append(element);
		};

		const populate = () => {
			addToggleAllButton();
			for (let classID in this.viewer.classifications) {
				addClassificationItem(classID, this.viewer.classifications[classID].name);
			}
			addInvertButton();
		};

		populate();

		this.viewer.addEventListener("classifications_changed", () => {
			elClassificationList.empty();
			populate();
		});

		this.viewer.addEventListener("classification_visibility_changed", () => {

			{ // set checked state of classification buttons
				for(const classID of Object.keys(this.viewer.classifications)){
					const classValue = this.viewer.classifications[classID];

					let elItem = elClassificationList.find(`#chkClassification_${classID}`);
					elItem.prop("checked", classValue.visible);
				}
			}

			{ // set checked state of toggle button based on state of all other buttons
				let numVisible = 0;
				let numItems = 0;
				for(const key of Object.keys(this.viewer.classifications)){
					if(this.viewer.classifications[key].visible){
						numVisible++;
					}
					numItems++;
				}
				const allVisible = numVisible === numItems;

				let elToggle = elClassificationList.find("#toggleClassificationFilters");
				elToggle.prop("checked", allVisible);
			}
		});
	}

	initAccordion(){
		$('.accordion > h3').each(function(){
			let header = $(this);
			let content = $(this).next();

			//header.addClass('accordion-header ui-widget');
			//content.addClass('accordion-content ui-widget');

			content.hide();

			header.click(() => {
				content.slideToggle();
			});
		});

		let languages = [
			["EN", "en"],
			["FR", "fr"],
			["DE", "de"],
			["JP", "jp"],
			["ES", "es"],
			["SE", "se"],
			["ZH", "zh"],
			["IT", "it"],
			["CA", "ca"]
		];

		let elLanguages = $('#potree_languages');
		for(let i = 0; i < languages.length; i++){
			let [key, value] = languages[i];
			let element = $(`<a>${key}</a>`);
			element.click(() => this.viewer.setLanguage(value));

			if(i === 0){
				element.css("margin-left", "30px");
			}
			
			elLanguages.append(element);

			if(i < languages.length - 1){
				elLanguages.append($(document.createTextNode(' - ')));	
			}
		}


		// to close all, call
		// $(".accordion > div").hide()

		// to open the, for example, tool menu, call:
		// $("#menu_tools").next().show()
	}

	initAppearance(){

		const sldPointBudget = this.dom.find('#sldPointBudget');

		sldPointBudget.slider({
			value: this.viewer.getPointBudget(),
			min: 100 * 1000,
			max: 10 * 1000 * 1000,
			step: 1000,
			slide: (event, ui) => { this.viewer.setPointBudget(ui.value); }
		});

		this.dom.find('#sldFOV').slider({
			value: this.viewer.getFOV(),
			min: 20,
			max: 100,
			step: 1,
			slide: (event, ui) => { this.viewer.setFOV(ui.value); }
		});

		$('#sldEDLRadius').slider({
			value: this.viewer.getEDLRadius(),
			min: 1,
			max: 4,
			step: 0.01,
			slide: (event, ui) => { this.viewer.setEDLRadius(ui.value); }
		});

		$('#sldEDLStrength').slider({
			value: this.viewer.getEDLStrength(),
			min: 0,
			max: 5,
			step: 0.01,
			slide: (event, ui) => { this.viewer.setEDLStrength(ui.value); }
		});

		$('#sldEDLOpacity').slider({
			value: this.viewer.getEDLOpacity(),
			min: 0,
			max: 1,
			step: 0.01,
			slide: (event, ui) => { this.viewer.setEDLOpacity(ui.value); }
		});

		this.viewer.addEventListener('point_budget_changed', (event) => {
			$('#lblPointBudget')[0].innerHTML = Utils.addCommas(this.viewer.getPointBudget());
			sldPointBudget.slider({value: this.viewer.getPointBudget()});
		});

		this.viewer.addEventListener('fov_changed', (event) => {
			$('#lblFOV')[0].innerHTML = parseInt(this.viewer.getFOV());
			$('#sldFOV').slider({value: this.viewer.getFOV()});
		});

		this.viewer.addEventListener('use_edl_changed', (event) => {
			$('#chkEDLEnabled')[0].checked = this.viewer.getEDLEnabled();
		});

		this.viewer.addEventListener('edl_radius_changed', (event) => {
			$('#lblEDLRadius')[0].innerHTML = this.viewer.getEDLRadius().toFixed(1);
			$('#sldEDLRadius').slider({value: this.viewer.getEDLRadius()});
		});

		this.viewer.addEventListener('edl_strength_changed', (event) => {
			$('#lblEDLStrength')[0].innerHTML = this.viewer.getEDLStrength().toFixed(1);
			$('#sldEDLStrength').slider({value: this.viewer.getEDLStrength()});
		});

		this.viewer.addEventListener('background_changed', (event) => {
			$("input[name=background][value='" + this.viewer.getBackground() + "']").prop('checked', true);
		});

		$('#lblPointBudget')[0].innerHTML = Utils.addCommas(this.viewer.getPointBudget());
		$('#lblFOV')[0].innerHTML = parseInt(this.viewer.getFOV());
		$('#lblEDLRadius')[0].innerHTML = this.viewer.getEDLRadius().toFixed(1);
		$('#lblEDLStrength')[0].innerHTML = this.viewer.getEDLStrength().toFixed(1);
		$('#chkEDLEnabled')[0].checked = this.viewer.getEDLEnabled();
		
		{
			let elBackground = $(`#background_options`);
			elBackground.selectgroup();

			elBackground.find("input").click( (e) => {
				this.viewer.setBackground(e.target.value);
			});

			let currentBackground = this.viewer.getBackground();
			$(`input[name=background_options][value=${currentBackground}]`).trigger("click");
		}

		$('#chkEDLEnabled').click( () => {
			this.viewer.setEDLEnabled($('#chkEDLEnabled').prop("checked"));
		});
	}

	initNavigation(){
		let elNavigation = $('#navigation');
		let sldMoveSpeed = $('#sldMoveSpeed');
		let lblMoveSpeed = $('#lblMoveSpeed');

		elNavigation.append(this.createToolIcon(
			Potree.resourcePath + '/icons/earth_controls_1.png',
			'[title]tt.earth_control',
			() => { this.viewer.setControls(this.viewer.earthControls); }
		));

		elNavigation.append(this.createToolIcon(
			Potree.resourcePath + '/icons/fps_controls.svg',
			'[title]tt.flight_control',
			() => {
				this.viewer.setControls(this.viewer.fpControls);
				this.viewer.fpControls.lockElevation = false;
			}
		));

		elNavigation.append(this.createToolIcon(
			Potree.resourcePath + '/icons/helicopter_controls.svg',
			'[title]tt.heli_control',
			() => { 
				this.viewer.setControls(this.viewer.fpControls);
				this.viewer.fpControls.lockElevation = true;
			}
		));

		elNavigation.append(this.createToolIcon(
			Potree.resourcePath + '/icons/orbit_controls.svg',
			'[title]tt.orbit_control',
			() => { this.viewer.setControls(this.viewer.orbitControls); }
		));

		elNavigation.append(this.createToolIcon(
			Potree.resourcePath + '/icons/focus.svg',
			'[title]tt.focus_control',
			() => { this.viewer.fitToScreen(); }
		));

		elNavigation.append(this.createToolIcon(
			Potree.resourcePath + "/icons/navigation_cube.svg",
			"[title]tt.navigation_cube_control",
			() => {this.viewer.toggleNavigationCube()}
		));

		elNavigation.append(this.createToolIcon(
			Potree.resourcePath + "/images/compas.svg",
			"[title]tt.compass",
			() => {
				const visible = !this.viewer.compass.isVisible();
				this.viewer.compass.setVisible(visible);
			}
		));

		elNavigation.append(this.createToolIcon(
			Potree.resourcePath + "/icons/camera_animation.svg",
			"[title]tt.camera_animation",
			() => {
				const animation = CameraAnimation.defaultFromView(this.viewer);

				viewer.scene.addCameraAnimation(animation);
			}
		));


		elNavigation.append("<br>");


		elNavigation.append(this.createToolIcon(
			Potree.resourcePath + "/icons/left.svg",
			"[title]tt.left_view_control",
			() => {this.viewer.setLeftView()}
		));

		elNavigation.append(this.createToolIcon(
			Potree.resourcePath + "/icons/right.svg",
			"[title]tt.right_view_control",
			() => {this.viewer.setRightView()}
		));

		elNavigation.append(this.createToolIcon(
			Potree.resourcePath + "/icons/front.svg",
			"[title]tt.front_view_control",
			() => {this.viewer.setFrontView()}
		));

		elNavigation.append(this.createToolIcon(
			Potree.resourcePath + "/icons/back.svg",
			"[title]tt.back_view_control",
			() => {this.viewer.setBackView()}
		));

		elNavigation.append(this.createToolIcon(
			Potree.resourcePath + "/icons/top.svg",
			"[title]tt.top_view_control",
			() => {this.viewer.setTopView()}
		));

		elNavigation.append(this.createToolIcon(
			Potree.resourcePath + "/icons/bottom.svg",
			"[title]tt.bottom_view_control",
			() => {this.viewer.setBottomView()}
		));





		let elCameraProjection = $(`
			<selectgroup id="camera_projection_options">
				<option id="camera_projection_options_perspective" value="PERSPECTIVE">Perspective</option>
				<option id="camera_projection_options_orthigraphic" value="ORTHOGRAPHIC">Orthographic</option>
			</selectgroup>
		`);
		elNavigation.append(elCameraProjection);
		elCameraProjection.selectgroup({title: "Camera Projection"});
		elCameraProjection.find("input").click( (e) => {
			this.viewer.setCameraMode(CameraMode[e.target.value]);
		});
		let cameraMode = Object.keys(CameraMode)
			.filter(key => CameraMode[key] === this.viewer.scene.cameraMode);
		elCameraProjection.find(`input[value=${cameraMode}]`).trigger("click");

		let speedRange = new THREE.Vector2(1, 10 * 1000);

		let toLinearSpeed = (value) => {
			return Math.pow(value, 4) * speedRange.y + speedRange.x;
		};

		let toExpSpeed = (value) => {
			return Math.pow((value - speedRange.x) / speedRange.y, 1 / 4);
		};

		sldMoveSpeed.slider({
			value: toExpSpeed(this.viewer.getMoveSpeed()),
			min: 0,
			max: 1,
			step: 0.01,
			slide: (event, ui) => { this.viewer.setMoveSpeed(toLinearSpeed(ui.value)); }
		});

		this.viewer.addEventListener('move_speed_changed', (event) => {
			lblMoveSpeed.html(this.viewer.getMoveSpeed().toFixed(1));
			sldMoveSpeed.slider({value: toExpSpeed(this.viewer.getMoveSpeed())});
		});

		lblMoveSpeed.html(this.viewer.getMoveSpeed().toFixed(1));
	}


	initSettings(){

		{
			$('#sldMinNodeSize').slider({
				value: this.viewer.getMinNodeSize(),
				min: 0,
				max: 1000,
				step: 0.01,
				slide: (event, ui) => { this.viewer.setMinNodeSize(ui.value); }
			});

			this.viewer.addEventListener('minnodesize_changed', (event) => {
				$('#lblMinNodeSize').html(parseInt(this.viewer.getMinNodeSize()));
				$('#sldMinNodeSize').slider({value: this.viewer.getMinNodeSize()});
			});
			$('#lblMinNodeSize').html(parseInt(this.viewer.getMinNodeSize()));
		}

		{
			let elSplatQuality = $("#splat_quality_options");
			elSplatQuality.selectgroup({title: "Splat Quality"});

			elSplatQuality.find("input").click( (e) => {
				if(e.target.value === "standard"){
					this.viewer.useHQ = false;
				}else if(e.target.value === "hq"){
					this.viewer.useHQ = true;
				}
			});

			let currentQuality = this.viewer.useHQ ? "hq" : "standard";
			elSplatQuality.find(`input[value=${currentQuality}]`).trigger("click");
		}

		$('#show_bounding_box').click(() => {
			this.viewer.setShowBoundingBox($('#show_bounding_box').prop("checked"));
		});

		$('#set_freeze').click(() => {
			this.viewer.setFreeze($('#set_freeze').prop("checked"));
		});
	}

}
