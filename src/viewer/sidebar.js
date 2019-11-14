
import {MeasuringTool} from "../utils/MeasuringTool.js";
import {ProfileTool} from "../utils/ProfileTool.js";
import {VolumeTool} from "../utils/VolumeTool.js";
import {AnnotationTool} from "../utils/AnnotationTool.js";

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

import {EarthControls} from "../navigation/EarthControls.js"
import {FirstPersonControls} from "../navigation/FirstPersonControls.js"
import {OrbitControls} from "../navigation/OrbitControls.js"

import {ZoomableSlider} from "./ZoomableSlider.js"

export class Sidebar{

	constructor(viewer){
		this.viewer = viewer;

		this.measuringTool = new MeasuringTool(this.viewer);
		this.profileTool = new ProfileTool(this.viewer);
		this.volumeTool = new VolumeTool(this.viewer);
		this.annotationTool = new AnnotationTool(this.viewer);
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
		this.initTools();
		this.initScene();
		this.initNavigation();
		this.initFilters();
		this.initClippingTool();
		this.initSettings();
		this.initAnnotation();
		
		$('#potree_version_number').html(Potree.version.major + "." + Potree.version.minor + Potree.version.suffix);
	}

	initTools(){

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
					name: `<span data-i18n="scene.object_angle">`+i18n.t("scene.object_angle")+`</span>`});

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
					name: `<span data-i18n="scene.object_point">`+i18n.t("scene.object_point")+`</span>`});

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
					name: `<span data-i18n="scene.object_distance">`+i18n.t("scene.object_distance")+`</span>`});

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
					name: `<span data-i18n="scene.object_height">`+i18n.t("scene.object_height")+`</span>`});

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
					name: `<span data-i18n="scene.object_area">`+i18n.t("scene.object_area")+`</span>`});

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

		// REMOVE ALL
		elToolbar.append(this.createToolIcon(
			Potree.resourcePath + '/icons/reset_tools.svg',
			'[title]tt.remove_all_measurement',
			() => {
				this.viewer.scene.removeAllMeasurements();
			}
		));
	}

	initScene(){

		let elScene = $("#menu_scene");
		let elObjects = elScene.next().find("#scene_objects");
		let elProperties = elScene.next().find("#scene_object_properties");
		
		{
			let geoJSONIcon = `${Potree.resourcePath}/icons/file_geojson.svg`;
			let dxfIcon = `${Potree.resourcePath}/icons/file_dxf.svg`;

			let elExport = elScene.next().find("#scene_export");

			elExport.append(`
				<div style="vertical-align:middle"><span data-i18n=\"scene.export"></span>: 
				<a href="#" download="measure.json"><img data-i18n="[title]scene.export_json" name="geojson_export_button" src="${geoJSONIcon}" class="button-icon" style="height: 22px; vertical-align:-35%" /></a>
				<a href="#" download="measure.dxf"><img data-i18n="[title]scene.export_dxf" name="dxf_export_button" src="${dxfIcon}" class="button-icon" style="height: 22px; vertical-align:-35%" /></a></div>
			`);
			
			let elDownloadJSON = elExport.find("img[name=geojson_export_button]").parent();
			elDownloadJSON.click( (event) => {
				let scene = this.viewer.scene;
				let items;
				if(this.viewer.restrictedAccess){
					items = [...scene.measurements, ...scene.profiles, ...scene.volumes];
				} else {
					items = [...scene.measurements, ...scene.profiles, ...scene.volumes, ...scene.annotations.children];
				}
				
				console.log(scene.profiles.length);
				
				if(scene.polygonClipVolumes.length > 0)
					this.viewer.postError(`<span data-i18n=\"scene.export_limit">`+i18n.t("scene.export_limit")+`</span>`);
				
				if (items.length > 0) {
					let blob = GeoJSONExporter.toString(items);
                    let url = window.URL.createObjectURL(new Blob(([blob]), { type: 'data:application/octet-stream' }));
                    elDownloadJSON.attr('href', url);
				}
				else{
					this.viewer.postError(`<span data-i18n=\"scene.export_error">`+i18n.t("scene.export_error")+`</span>`);
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
					this.viewer.postError(`<span data-i18n=\"scene.export_error">`+i18n.t("scene.export_error")+`</span>`);
					event.preventDefault();
				}
			});
		}
		
		if(!this.viewer.restrictedAccess) {
			let geoJSONIcon = `${Potree.resourcePath}/icons/file_geojson.svg`;

			let elImport = elScene.next().find("#scene_import");

			elImport.append(`
				<div style="vertical-align:middle"><span data-i18n=\"scene.import"></span>: 
				<img name="geojson_import_button" data-i18n="[title]scene.import_select" src="${geoJSONIcon}" 
				class="button-icon" style="height: 22px; vertical-align:-35%" />
				<input type="file" id="importFilesList" name="files[]" accept=".json" multiple style="display:none;"/></div>
			`);
			
			let elUploadJSONList = $('#importFilesList')[0];
			let onOpenJSONFile = (e) => {
				let scene = this.viewer.scene;
				let files = e.target.files;
				
				for(let file of files) {
					let reader = new FileReader();
					reader.onload = receivedText;
					reader.readAsText(file);
				}
				function receivedText(e) {
					let imported_json = JSON.parse(e.target.result);
					
					for(let feature of imported_json.Features) {
						GeoJSONExporter.JSONToMeasurements(feature, scene);
					}
					if(imported_json.Annotations !== undefined) {
						for(let annotation of imported_json.Annotations) {
							GeoJSONExporter.JSONToAnnotations(annotation, scene.annotations);
						}
					}
					if(imported_json.Volumes !== undefined) {
						for(let volume of imported_json.Volumes) {
							GeoJSONExporter.JSONToVolumes(volume, scene);
						}
					}
					if(imported_json.Profiles !== undefined) {
						for(let profile of imported_json.Profiles) {
							GeoJSONExporter.JSONToProfiles(profile, scene);
						}
					}
				}
			};
			elUploadJSONList.addEventListener('change', onOpenJSONFile, false);
			
			let elUploadJSON = elImport.find("img[name=geojson_import_button]").parent();
			elUploadJSON.click( (event) => { elUploadJSONList.click(); });
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

		let pcID = tree.jstree('create_node', "#", { "text": "<b><span data-i18n=\"scene.pointclouds\"></span></b>", "id": "pointclouds"}, "last", false, false);
		let measurementID = tree.jstree('create_node', "#", { "text": "<b><span data-i18n=\"scene.measurements\"></span></b>", "id": "measurements" }, "last", false, false);
		let annotationsID = tree.jstree('create_node', "#", { "text": "<b><span data-i18n=\"scene.annotations\"></span></b>", "id": "annotations" }, "last", false, false);
		let otherID = tree.jstree('create_node', "#", { "text": "<b><span data-i18n=\"scene.other\"></span></b>", "id": "other" }, "last", false, false);
		
		tree.jstree("check_node", pcID);
		tree.jstree("check_node", measurementID);
		tree.jstree("check_node", annotationsID);
		tree.jstree("check_node", otherID);

		tree.on('create_node.jstree', (e, data) => {
			tree.jstree("open_all");
			$("#menu_scene").i18n();
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
			}else if(object instanceof THREE.SpotLight){
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
			}
		});

		tree.on("uncheck_node.jstree", (e, data) => {
			let object = data.node.data;

			if(object){
				object.visible = false;
			}

			for (let i = 0; i < data.node.children.length; i += 1) {
				const node = tree.jstree('get_node', data.node.children[i])
				if (node.data) {
					node.data.visible = false;
				}
			}
		});

		tree.on("check_node.jstree", (e, data) => {
			let object = data.node.data;

			if(object){
				object.visible = true;
			}
			
			for (let i = 0; i < data.node.children.length; i += 1) {
				const node = tree.jstree('get_node', data.node.children[i])
				if (node.data) {
					node.data.visible = true;
				}
			}
		});
		
		let onPointCloudAdded = (e) => {
			let pointcloud = e.pointcloud;
			let cloudIcon = `${Potree.resourcePath}/icons/cloud.svg`;
			let node = createNode(pcID, pointcloud.name, cloudIcon, pointcloud);
			tree.i18n();

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
			tree.i18n();
		};

		let onVolumeAdded = (e) => {
			let volume = e.volume;
			let icon = Utils.getMeasurementIcon(volume);
			let node = createNode(measurementID, volume.name, icon, volume);
			tree.i18n();

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
			tree.i18n();
		};

		let onAnnotationAdded = (e) => {			
			let annotation = e.annotation;
			let annotationIcon = `${Potree.resourcePath}/icons/annotation.svg`;
			let parentID = this.annotationMapping.get(annotation.parent);
			if(parentID == undefined)
				parentID = annotationsID;			
			
			let annotationID = createNode(parentID, annotation.title, annotationIcon, annotation);
			this.annotationMapping.set(annotation, annotationID);
			tree.i18n();
		};

		this.viewer.scene.addEventListener("pointcloud_added", onPointCloudAdded);
		this.viewer.scene.addEventListener("measurement_added", onMeasurementAdded);
		this.viewer.scene.addEventListener("profile_added", onProfileAdded);
		this.viewer.scene.addEventListener("volume_added", onVolumeAdded);
		this.viewer.scene.addEventListener("polygon_clip_volume_added", onVolumeAdded);
		this.viewer.scene.annotations.addEventListener("annotation_added", onAnnotationAdded);

		let onPointCloudRemoved = (e) => {
			let pointcloudsRoot = $("#jstree_scene").jstree().get_json("pointclouds");
			let jsonNode = pointcloudsRoot.children.find(child => child.data.uuid === e.pointcloud.uuid);
			
			tree.jstree("delete_node", jsonNode.id);
			tree.i18n();
		};
		
		let onMeasurementRemoved = (e) => {
			let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
			let jsonNode = measurementsRoot.children.find(child => child.data.uuid === e.measurement.uuid);
			
			tree.jstree("delete_node", jsonNode.id);
			tree.i18n();
		};

		let onVolumeRemoved = (e) => {
			let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
			let jsonNode = measurementsRoot.children.find(child => child.data.uuid === e.volume.uuid);
			
			tree.jstree("delete_node", jsonNode.id);
			tree.i18n();
		};

		let onProfileRemoved = (e) => {
			let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
			let jsonNode = measurementsRoot.children.find(child => child.data.uuid === e.profile.uuid);
			
			tree.jstree("delete_node", jsonNode.id);
			tree.i18n();
		};
		
		let onAnnotationRemoved = (e) => {
			tree.jstree("delete_node", this.annotationMapping.get(e.annotation));
			this.annotationMapping.delete(e.annotation);
			tree.i18n();
		};

		this.viewer.scene.addEventListener("pointcloud_removed", onPointCloudRemoved);
		this.viewer.scene.addEventListener("measurement_removed", onMeasurementRemoved);
		this.viewer.scene.addEventListener("volume_removed", onVolumeRemoved);
		this.viewer.scene.addEventListener("profile_removed", onProfileRemoved);
		this.viewer.scene.addEventListener("polygon_clip_volume_removed", onVolumeRemoved);
		this.viewer.scene.annotations.addEventListener("annotation_removed", onAnnotationRemoved);

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

		for(let pointcloud of this.viewer.scene.pointclouds){
			onPointCloudAdded({pointcloud: pointcloud});
		}

		for(let measurement of this.viewer.scene.measurements){
			onMeasurementAdded({measurement: measurement});
		}

		for(let volume of [...this.viewer.scene.volumes, ...this.viewer.scene.polygonClipVolumes]){
			onVolumeAdded({volume: volume});
		}

		for(let profile of this.viewer.scene.profiles){
			onProfileAdded({profile: profile});
		}

		{
			createNode(otherID, `<span data-i18n="scene.object_camera">`+i18n.t("scene.object_camera")+`</span>`, null, new THREE.Camera());
		}

		this.viewer.addEventListener("scene_changed", (e) => {
			propertiesPanel.setScene(e.scene);

			e.oldScene.removeEventListener("pointcloud_added", onPointCloudAdded);
			e.oldScene.removeEventListener("pointcloud_removed", onPointCloudRemoved);
			e.oldScene.removeEventListener("measurement_added", onMeasurementAdded);
			e.oldScene.removeEventListener("measurement_removed", onMeasurementRemoved);
			e.oldScene.removeEventListener("profile_added", onProfileAdded);
			e.oldScene.removeEventListener("profile_removed", onProfileRemoved);
			e.oldScene.removeEventListener("volume_added", onVolumeAdded);
			e.oldScene.removeEventListener("volume_removed", onVolumeRemoved);
			e.oldScene.removeEventListener("polygon_clip_volume_added", onVolumeAdded);
			e.oldScene.removeEventListener("polygon_clip_volume_removed", onVolumeRemoved);
			e.oldScene.annotations.removeEventListener("annotation_removed", onAnnotationRemoved);
			e.oldScene.annotations.removeEventListener("annotation_added", onAnnotationAdded);

			e.scene.addEventListener("pointcloud_added", onPointCloudAdded);
			e.scene.addEventListener("pointcloud_removed", onPointCloudRemoved);
			e.scene.addEventListener("measurement_added", onMeasurementAdded);
			e.scene.addEventListener("measurement_removed", onMeasurementRemoved);
			e.scene.addEventListener("profile_added", onProfileAdded);
			e.scene.addEventListener("profile_removed", onProfileRemoved);			
			e.scene.addEventListener("volume_added", onVolumeAdded);
			e.scene.addEventListener("volume_removed", onVolumeRemoved);
			e.scene.addEventListener("polygon_clip_volume_added", onVolumeAdded);
			e.scene.addEventListener("polygon_clip_volume_removed", onVolumeRemoved);
			e.scene.annotations.addEventListener("annotation_removed", onAnnotationRemoved);
			e.scene.annotations.addEventListener("annotation_added", onAnnotationAdded);
		});

		let onLanguageChanged = (e) => {
			propertiesPanel.refresh();
		}
		
		this.viewer.addEventListener("language_changed", onLanguageChanged);		
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
			elClipTask.selectgroup();

			elClipTask.find("input").click( (e) => {
				this.viewer.setClipTask(ClipTask[e.target.value]);
			});

			let currentClipTask = Object.keys(ClipTask)
				.filter(key => ClipTask[key] === this.viewer.clipTask);
			elClipTask.find(`input[value=${currentClipTask}]`).trigger("click");
		}

		{
			let elClipMethod = $("#clipmethod_options");
			elClipMethod.selectgroup();

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
						this.viewer.postMessage(`<span data-i18n=\"tt.screen_clip_msg">`+i18n.t("tt.screen_clip_msg")+`</span>`, {duration: 2000});
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

		let lblGPSTime = elGPSTimeFilterPanel.find("#lblGPSTime");
		let elGPS = elGPSTimeFilterPanel.find("#spnGPSTime");

		let slider = new ZoomableSlider();
		elGPS[0].appendChild(slider.element);
		slider.update();

		slider.change( () => {
			let range = slider.chosenRange;
			this.viewer.setFilterGPSTimeRange(range[0], range[1]);
		});

		let onGPSTimeExtentChanged = (event) => {
			let range = this.viewer.filterGPSTimeExtent;
			slider.setVisibleRange(range);
		};

		let onGPSTimeChanged = (event) => {
			let range = this.viewer.filterGPSTimeRange;

			let precision = 1;
			let from = `${Utils.addCommas(range[0].toFixed(precision))}`;
			let to = `${Utils.addCommas(range[1].toFixed(precision))}`;
			lblGPSTime[0].innerHTML = `${from} to ${to}`;
			
			slider.setRange(range);
		};

		this.viewer.addEventListener('filter_gps_time_range_changed', onGPSTimeChanged);
		this.viewer.addEventListener('filter_gps_time_extent_changed', onGPSTimeExtentChanged);

	}

	initClassificationList(){
		let elClassificationList = $('#classificationList');

		let addClassificationItem = (code, name) => {
			let inputID = 'chkClassification_' + code;

			let element = $(`
				<li>
					<label style="whitespace: nowrap">
						<input id="${inputID}" type="checkbox" checked/>
						<span data-i18n="filters.${name}"></span>
					</label>
				</li>
			`);

			let elInput = element.find('input');

			elInput.click(event => {
				this.viewer.setClassificationVisibility(code, event.target.checked);
			});

			elClassificationList.append(element);
		};

		for (var classID in this.viewer.classifications) {
			addClassificationItem(classID, this.viewer.classifications[classID].name);
		}
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
			["SE", "se"]
		];

		let elLanguages = $('#potree_languages');
		for(let i = 0; i < languages.length; i++){
			let [key, value] = languages[i];
			let element = $(`<a>${key}</a>`);
			element.click(() => viewer.setLanguage(value));
			
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

		$('#sldPointBudget').slider({
			value: this.viewer.getPointBudget(),
			min: 100 * 1000,
			max: 10 * 1000 * 1000,
			step: 1000,
			slide: (event, ui) => { this.viewer.setPointBudget(ui.value); }
		});

		$('#sldFOV').slider({
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

		this.viewer.addEventListener('point_budget_changed', (event) => {
			$('#lblPointBudget')[0].innerHTML = Utils.addCommas(this.viewer.getPointBudget());
			$('#sldPointBudget').slider({value: this.viewer.getPointBudget()});
		});

		this.viewer.addEventListener('fov_changed', (event) => {
			$('#lblFOV')[0].innerHTML = parseInt(this.viewer.getFOV());
			$('#sldFOV').slider({value: this.viewer.getFOV()});
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
			() => { this.viewer.setNavigationMode(EarthControls); }
		));

		elNavigation.append(this.createToolIcon(
			Potree.resourcePath + '/icons/fps_controls.svg',
			'[title]tt.flight_control',
			() => {
				this.viewer.setNavigationMode(FirstPersonControls);
				this.viewer.fpControls.lockElevation = false;
			}
		));

		elNavigation.append(this.createToolIcon(
			Potree.resourcePath + '/icons/helicopter_controls.svg',
			'[title]tt.heli_control',
			() => { 
				this.viewer.setNavigationMode(FirstPersonControls);
				this.viewer.fpControls.lockElevation = true;
			}
		));

		elNavigation.append(this.createToolIcon(
			Potree.resourcePath + '/icons/orbit_controls.svg',
			'[title]tt.orbit_control',
			() => { this.viewer.setNavigationMode(OrbitControls); }
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
		
		let elCameraProjection = $("#camera_projection_options");
		elCameraProjection.selectgroup();
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
			elSplatQuality.selectgroup();
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

	initAnnotation(){
		if(this.viewer.restrictedAccess) {
			$('#menu_annotations').css('display','none');
			return;
		}
		
		let elAnnotations = $("#menu_annotations");
		let elObjects = elAnnotations.next().find("#annotation_objects");
		
		let placeIconPath = Potree.resourcePath + '/icons/annotation.svg';
		let validIconPath = Potree.resourcePath + '/icons/valid.svg';
		let removeIconPath = Potree.resourcePath + '/icons/remove.svg';
		
		let elContent = $(`
			<label><span data-i18n="annotations.annotation_title"/></label>
			<input type="text" id="annotation_title" size="17" style="width: 100%"/>
			<br/>
			
			<table class="annotation_value_table">
				<tr>
					<th>x</th>
					<th>y</th>
					<th>z</th>
					<th></th>
				</tr>
				<tr>
					<td align="center" id="angle_cell_alpha" style="width: 30%"><input type="number" id="annotation_x" value="" step=any style="width: 90%"/> </td>
					<td align="center" id="angle_cell_betta" style="width: 30%"><input type="number" id="annotation_y" value="" step=any style="width: 90%;"/></td>
					<td align="center" id="angle_cell_gamma" style="width: 30%"><input type="number" id="annotation_z" value="" step=any style="width: 90%"/></td>
					<td align="right" style="width: 10%">
						<img name="place" data-i18n="[title]annotations.button_place" class="button-icon" src="${placeIconPath}" style="width: 16px; height: 16px"/>
					</td>
				</tr>
			</table>			
			<label><input type="checkbox" id="chkOrientationSave"/><span data-i18n="annotations.annotation_orientation_save"></span></label>
			<br/><br/>
			
			<textarea id="annotation_description" rows="6" data-i18n="[placeholder]annotations.annotation_description" style="text-align: center; width: 100%"/>
			<br/>
			
			<div style="display: flex; margin-top: 12px">
				<span></span>
				<span style="flex-grow: 1"></span>
				<img name="valid" class="button-icon" data-i18n="[title]scene.button_valid" src="${validIconPath}" style="width: 16px; height: 16px"/>
				<img name="remove" class="button-icon" data-i18n="[title]scene.button_remove" src="${removeIconPath}" style="width: 16px; height: 16px"/>
			</div>
		`);		
		elObjects.append(elContent);
		
		this.elAnnotationPlace = elContent.find("img[name=place]");
		this.elAnnotationPlace.click( () => {
			var camPos = this.viewer.scene.getActiveCamera().position.toArray();
			var camTar = this.viewer.scene.view.getPivot().toArray();
			this.annotationTool.startInsertion({
				closed: true,
				maxMarkers: 1,
				position: false,
				cameraPosition: camPos,
				cameraTarget: camTar,
				create: false
			})
		});
		
		this.elAnnotationValid = elContent.find("img[name=valid]");
		this.elAnnotationValid.click( () => {
			this.annotationTool.validAnnotation();
		});
		this.elAnnotationValid.hide();
		
		this.elAnnotationRemove = elContent.find("img[name=remove]");
		this.elAnnotationRemove.click( () => {
			this.annotationTool.cancelAnnotation();
		});
		
		this.elAnnotationTitle = $('#annotation_title')[0];
		this.elAnnotationTitle.addEventListener('input', this.annotationTool.onTitleChanged.bind(this.annotationTool));
		
		this.elAnnotationDescription = $('#annotation_description')[0];
		this.elAnnotationDescription.addEventListener('input', this.annotationTool.onDescriptionChanged.bind(this.annotationTool));
		
		this.elAnnotationPositionX = $('#annotation_x')[0];
		this.elAnnotationPositionY = $('#annotation_y')[0];
		this.elAnnotationPositionZ = $('#annotation_z')[0];
		this.elAnnotationPositionX.addEventListener('change', this.annotationTool.onPositionXChanged.bind(this.annotationTool));
		this.elAnnotationPositionY.addEventListener('change', this.annotationTool.onPositionYChanged.bind(this.annotationTool));
		this.elAnnotationPositionZ.addEventListener('change', this.annotationTool.onPositionZChanged.bind(this.annotationTool));
		
		this.elAnnotationOrientation = $('#chkOrientationSave')[0];
		this.elAnnotationOrientation.addEventListener('change', this.annotationTool.onOrientationSaveChanged.bind(this.annotationTool));
		
		let onUpdateAnnotationMarker = (e) => {
			if(e.clear === 'clear_all') {
				this.elAnnotationTitle.value = "";
				this.elAnnotationPositionX.value = "";
				this.elAnnotationPositionY.value = "";
				this.elAnnotationPositionZ.value = "";
				this.elAnnotationDescription.value = "";
				this.elAnnotationValid.hide();
			} else if(e.clear === 'clear_position') {
				this.elAnnotationPositionX.value = "";
				this.elAnnotationPositionY.value = "";
				this.elAnnotationPositionZ.value = "";
				this.elAnnotationValid.hide();
			} else {
				if(e.title)
					this.elAnnotationTitle.value = e.title;
				if(e.position) {
					this.elAnnotationPositionX.value = e.position.x;
					this.elAnnotationPositionY.value = e.position.y;
					this.elAnnotationPositionZ.value = e.position.z;
					this.elAnnotationValid.show();
				}
				if(e.description)
					this.elAnnotationDescription.value = e.description;
				if(e.orientation) {
					if(e.orientation === 'checked')
						this.elAnnotationOrientation.checked = true;
					else
						this.elAnnotationOrientation.checked = false;
				}
			}
		};
		this.annotationTool.addEventListener('annotation_marker_updated', onUpdateAnnotationMarker);
	}
}