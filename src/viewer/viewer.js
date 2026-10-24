
import * as THREE from "../../libs/three.js/build/three.module.js";
import {ClipTask, ClipMethod, CameraMode, LengthUnits, ElevationGradientRepeat} from "../defines.js";
import {Renderer} from "../PotreeRenderer.js";
import {PotreeRenderer} from "./PotreeRenderer.js";
import {EDLRenderer} from "./EDLRenderer.js";
import {HQSplatRenderer} from "./HQSplatRenderer.js";
import {Scene} from "./Scene.js";
import {ClippingTool} from "../utils/ClippingTool.js";
import {TransformationTool} from "../utils/TransformationTool.js";
import {Utils} from "../utils.js";
import {MapView} from "./map.js";
import {ProfileWindow, ProfileWindowController} from "./profile.js";
import {BoxVolume} from "../utils/Volume.js";
import {Features} from "../Features.js";
import {Message} from "../utils/Message.js";
import {Sidebar} from "./sidebar.js";

import {AnnotationTool} from "../utils/AnnotationTool.js";
import {MeasuringTool} from "../utils/MeasuringTool.js";
import {ProfileTool} from "../utils/ProfileTool.js";
import {VolumeTool} from "../utils/VolumeTool.js";

import {InputHandler} from "../navigation/InputHandler.js";
import {NavigationCube} from "./NavigationCube.js";
import {Compass} from "../utils/Compass.js";
import {OrbitControls} from "../navigation/OrbitControls.js";
import {FirstPersonControls} from "../navigation/FirstPersonControls.js";
import {EarthControls} from "../navigation/EarthControls.js";
import {DeviceOrientationControls} from "../navigation/DeviceOrientationControls.js";
import {VRControls} from "../navigation/VRControls.js";
import { EventDispatcher } from "../EventDispatcher.js";
import { ClassificationScheme } from "../materials/ClassificationScheme.js";
import { VRButton } from '../../libs/three.js/extra/VRButton.js';

import JSON5 from "../../libs/json5-2.1.3/json5.mjs";


export class Viewer extends EventDispatcher{
	
	constructor(domElement, args = {}){
		super();

		this.renderArea = domElement;
		this.guiLoaded = false;
		this.guiLoadTasks = [];

		this.onVrListeners = [];

		this.messages = [];
		this.elMessages = $(`
		<div id="message_listing" 
			style="position: absolute; z-index: 1000; left: 10px; bottom: 10px">
		</div>`);
		$(domElement).append(this.elMessages);
		
		try{

		{ // generate missing dom hierarchy
			if ($(domElement).find('#potree_map').length === 0) {
				let potreeMap = $(`
					<div id="potree_map" class="mapBox" style="position: absolute; left: 50px; top: 50px; width: 400px; height: 400px; display: none">
						<div id="potree_map_header" style="position: absolute; width: 100%; height: 25px; top: 0px; background-color: rgba(0,0,0,0.5); z-index: 1000; border-top-left-radius: 3px; border-top-right-radius: 3px;">
						</div>
						<div id="potree_map_content" class="map" style="position: absolute; z-index: 100; top: 25px; width: 100%; height: calc(100% - 25px); border: 2px solid rgba(0,0,0,0.5); box-sizing: border-box;"></div>
					</div>
				`);
				$(domElement).append(potreeMap);
			}

			if ($(domElement).find('#potree_description').length === 0) {
				let potreeDescription = $(`<div id="potree_description" class="potree_info_text"></div>`);
				$(domElement).append(potreeDescription);
			}

			if ($(domElement).find('#potree_annotations').length === 0) {
				let potreeAnnotationContainer = $(`
					<div id="potree_annotation_container" 
						style="position: absolute; z-index: 100000; width: 100%; height: 100%; pointer-events: none;"></div>`);
				$(domElement).append(potreeAnnotationContainer);
			}

			if ($(domElement).find('#potree_quick_buttons').length === 0) {
				let potreeMap = $(`
					<div id="potree_quick_buttons" class="quick_buttons_container" style="">
					</div>
				`);

				// {
				// 	let imgMenuToggle = document.createElement('img');
				// 	imgMenuToggle.src = new URL(Potree.resourcePath + '/icons/menu_button.svg').href;
				// 	imgMenuToggle.onclick = this.toggleSidebar;
				// 	// imgMenuToggle.classList.add('potree_menu_toggle');

				// 	potreeMap.append(imgMenuToggle);
				// }

				// {
				// 	let imgMenuToggle = document.createElement('img');
				// 	imgMenuToggle.src = new URL(Potree.resourcePath + '/icons/menu_button.svg').href;
				// 	imgMenuToggle.onclick = this.toggleSidebar;
				// 	// imgMenuToggle.classList.add('potree_menu_toggle');

				// 	potreeMap.append(imgMenuToggle);
				// }

				// {
				// 	let imgMenuToggle = document.createElement('img');
				// 	imgMenuToggle.src = new URL(Potree.resourcePath + '/icons/menu_button.svg').href;
				// 	imgMenuToggle.onclick = this.toggleSidebar;
				// 	// imgMenuToggle.classList.add('potree_menu_toggle');

				// 	potreeMap.append(imgMenuToggle);
				// }

				

				$(domElement).append(potreeMap);
			}
		}

		this.pointCloudLoadedCallback = args.onPointCloudLoaded || function () {};

		// if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
		//	defaultSettings.navigation = "Orbit";
		// }

		this.server = null;

		this.fov = 60;
		this.isFlipYZ = false;
		this.useDEMCollisions = false;
		this.generateDEM = false;
		this.minNodeSize = 30;
		this.edlStrength = 1.0;
		this.edlRadius = 1.4;
		this.edlOpacity = 1.0;
		this.useEDL = false;
		this.description = "";

		this.classifications = ClassificationScheme.DEFAULT;

		this.moveSpeed = 10;

		this.lengthUnit = LengthUnits.METER;
		this.lengthUnitDisplay = LengthUnits.METER;

		this.showBoundingBox = false;
		this.showAnnotations = true;
		this.freeze = false;
		this.clipTask = ClipTask.HIGHLIGHT;
		this.clipMethod = ClipMethod.INSIDE_ANY;

		this.elevationGradientRepeat = ElevationGradientRepeat.CLAMP;

		this.filterReturnNumberRange = [0, 7];
		this.filterNumberOfReturnsRange = [0, 7];
		this.filterGPSTimeRange = [-Infinity, Infinity];
		this.filterPointSourceIDRange = [0, 65535];

		this.potreeRenderer = null;
		this.edlRenderer = null;
		this.renderer = null;
		this.pRenderer = null;

		this.scene = null;
		this.sceneVR = null;
		this.overlay = null;
		this.overlayCamera = null;

		this.inputHandler = null;
		this.controls = null;

		this.clippingTool =  null;
		this.transformationTool = null;
		this.navigationCube = null;
		this.compass = null;
		
		this.skybox = null;
		this.clock = new THREE.Clock();
		this.background = null;

		this.initThree();

		if(args.noDragAndDrop){
			
		}else{
			this.initDragAndDrop();
		}

		if(typeof Stats !== "undefined"){
			this.stats = new Stats();
			this.stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
			document.body.appendChild( this.stats.dom );
		}

		{
			let canvas = this.renderer.domElement;
			canvas.addEventListener("webglcontextlost", (e) => {
				console.log(e);
				this.postMessage("WebGL context lost. \u2639");

				let gl = this.renderer.getContext();
				let error = gl.getError();
				console.log(error);
			}, false);
		}

		{
			this.overlay = new THREE.Scene();
			this.overlayCamera = new THREE.OrthographicCamera(
				0, 1,
				1, 0,
				-1000, 1000
			);
		}
		
		this.pRenderer = new Renderer(this.renderer);
		
		{
			let near = 2.5;
			let far = 10.0;
			let fov = 90;
			
			this.shadowTestCam = new THREE.PerspectiveCamera(90, 1, near, far);
			this.shadowTestCam.position.set(3.50, -2.80, 8.561);
			this.shadowTestCam.lookAt(new THREE.Vector3(0, 0, 4.87));
		}
		

		let scene = new Scene(this.renderer);
		
		{ // create VR scene
			this.sceneVR = new THREE.Scene();

			// let texture = new THREE.TextureLoader().load(`${Potree.resourcePath}/images/vr_controller_help.jpg`);

			// let plane = new THREE.PlaneBufferGeometry(1, 1, 1, 1);
			// let infoMaterial = new THREE.MeshBasicMaterial({map: texture});
			// let infoNode = new THREE.Mesh(plane, infoMaterial);
			// infoNode.position.set(-0.5, 1, 0);
			// infoNode.scale.set(0.4, 0.3, 1);
			// infoNode.lookAt(0, 1, 0)
			// this.sceneVR.add(infoNode);

			// window.infoNode = infoNode;
		}

		this.setScene(scene);

		{
			this.inputHandler = new InputHandler(this);
			this.inputHandler.setScene(this.scene);

			this.clippingTool = new ClippingTool(this);
			this.transformationTool = new TransformationTool(this);
			this.navigationCube = new NavigationCube(this);
			this.navigationCube.visible = false;

			this.compass = new Compass(this);
			
			this.createControls();

			this.clippingTool.setScene(this.scene);
			
			let onPointcloudAdded = (e) => {
				if (this.scene.pointclouds.length === 1) {
					let speed = e.pointcloud.boundingBox.getSize(new THREE.Vector3()).length();
					speed = speed / 5;
					this.setMoveSpeed(speed);
				}
			};

			let onVolumeRemoved = (e) => {
				this.inputHandler.deselect(e.volume);
			};

			this.addEventListener('scene_changed', (e) => {
				this.inputHandler.setScene(e.scene);
				this.clippingTool.setScene(this.scene);
				
				if(!e.scene.hasEventListener("pointcloud_added", onPointcloudAdded)){
					e.scene.addEventListener("pointcloud_added", onPointcloudAdded);
				}

				if(!e.scene.hasEventListener("volume_removed", onPointcloudAdded)){
					e.scene.addEventListener("volume_removed", onVolumeRemoved);
				}
				
			});

			this.scene.addEventListener("volume_removed", onVolumeRemoved);
			this.scene.addEventListener('pointcloud_added', onPointcloudAdded);
		}

		{ // set defaults
			this.setFOV(60);
			this.setEDLEnabled(false);
			this.setEDLRadius(1.4);
			this.setEDLStrength(0.4);
			this.setEDLOpacity(1.0);
			this.setClipTask(ClipTask.HIGHLIGHT);
			this.setClipMethod(ClipMethod.INSIDE_ANY);
			this.setPointBudget(1*1000*1000);
			this.setShowBoundingBox(false);
			this.setFreeze(false);
			this.setControls(this.orbitControls);
			this.setBackground('gradient');

			this.scaleFactor = 1;

			this.loadSettingsFromURL();
		}

		// start rendering!
		//if(args.useDefaultRenderLoop === undefined || args.useDefaultRenderLoop === true){
			//requestAnimationFrame(this.loop.bind(this));
		//}

		this.renderer.setAnimationLoop(this.loop.bind(this));

		this.loadGUI = this.loadGUI.bind(this);

		this.annotationTool = new AnnotationTool(this);
		this.measuringTool = new MeasuringTool(this);
		this.profileTool = new ProfileTool(this);
		this.volumeTool = new VolumeTool(this);

		}catch(e){
			this.onCrash(e);
		}
	}

	onCrash(error){

		$(this.renderArea).empty();

		if ($(this.renderArea).find('#potree_failpage').length === 0) {
			let elFailPage = $(`
			<div id="#potree_failpage" class="potree_failpage"> 
				
				<h1>Potree Encountered An Error </h1>

				<p>
				This may happen if your browser or graphics card is not supported.
				<br>
				We recommend to use 
				<a href="https://www.google.com/chrome/browser" target="_blank" style="color:initial">Chrome</a>
				or 
				<a href="https://www.mozilla.org/" target="_blank">Firefox</a>.
				</p>

				<p>
				Please also visit <a href="http://webglreport.com/" target="_blank">webglreport.com</a> and 
				check whether your system supports WebGL.
				</p>
				<p>
				If you are already using one of the recommended browsers and WebGL is enabled, 
				consider filing an issue report at <a href="https://github.com/potree/potree/issues" target="_blank">github</a>,<br>
				including your operating system, graphics card, browser and browser version, as well as the 
				error message below.<br>
				Please do not report errors on unsupported browsers.
				</p>

				<pre id="potree_error_console" style="width: 100%; height: 100%"></pre>
				
			</div>`);

			let elErrorMessage = elFailPage.find('#potree_error_console');
			elErrorMessage.html(error.stack);

			$(this.renderArea).append(elFailPage);
		}

		throw error;
	}

	// ------------------------------------------------------------------------------------
	// Viewer API
	// ------------------------------------------------------------------------------------

	setScene (scene) {
		if (scene === this.scene) {
			return;
		}

		let oldScene = this.scene;
		this.scene = scene;

		this.dispatchEvent({
			type: 'scene_changed',
			oldScene: oldScene,
			scene: scene
		});

		{ // Annotations
			$('.annotation').detach();

			// for(let annotation of this.scene.annotations){
			//	this.renderArea.appendChild(annotation.domElement[0]);
			// }

			this.scene.annotations.traverse(annotation => {
				this.renderArea.appendChild(annotation.domElement[0]);
			});

			if (!this.onAnnotationAdded) {
				this.onAnnotationAdded = e => {
				// console.log("annotation added: " + e.annotation.title);

					e.annotation.traverse(node => {

						$("#potree_annotation_container").append(node.domElement);
						//this.renderArea.appendChild(node.domElement[0]);
						node.scene = this.scene;
					});
				};
			}

			if (oldScene) {
				oldScene.annotations.removeEventListener('annotation_added', this.onAnnotationAdded);
			}
			this.scene.annotations.addEventListener('annotation_added', this.onAnnotationAdded);
		}
	};

	setControls(controls){
		if (controls !== this.controls) {
			if (this.controls) {
				this.controls.enabled = false;
				this.inputHandler.removeInputListener(this.controls);
			}

			this.controls = controls;
			this.controls.enabled = true;
			this.inputHandler.addInputListener(this.controls);
		}
	}

	getControls () {

		if(this.renderer.xr.isPresenting){
			return this.vrControls;
		}else{
			return this.controls;
		}
		
	}

	getMinNodeSize () {
		return this.minNodeSize;
	};

	setMinNodeSize (value) {
		if (this.minNodeSize !== value) {
			this.minNodeSize = value;
			this.dispatchEvent({'type': 'minnodesize_changed', 'viewer': this});
		}
	};

	getBackground () {
		return this.background;
	}

	setBackground(bg){
		if (this.background === bg) {
			return;
		}

		if(bg === "skybox"){
			this.skybox = Utils.loadSkybox(new URL(Potree.resourcePath + '/textures/skybox2/').href);
		}

		this.background = bg;
		this.dispatchEvent({'type': 'background_changed', 'viewer': this});
	}

	setDescription (value) {
		this.description = value;
		
		$('#potree_description').html(value);
		//$('#potree_description').text(value);
	}

	getDescription(){
		return this.description;
	}

	setShowBoundingBox (value) {
		if (this.showBoundingBox !== value) {
			this.showBoundingBox = value;
			this.dispatchEvent({'type': 'show_boundingbox_changed', 'viewer': this});
		}
	};

	getShowBoundingBox () {
		return this.showBoundingBox;
	};

	setMoveSpeed (value) {
		if (this.moveSpeed !== value) {
			this.moveSpeed = value;
			this.dispatchEvent({'type': 'move_speed_changed', 'viewer': this, 'speed': value});
		}
	};

	getMoveSpeed () {
		return this.moveSpeed;
	};

	setWeightClassification (w) {
		for (let i = 0; i < this.scene.pointclouds.length; i++) {
			this.scene.pointclouds[i].material.weightClassification = w;
			this.dispatchEvent({'type': 'attribute_weights_changed' + i, 'viewer': this});
		}
	};

	setFreeze (value) {
		value = Boolean(value);
		if (this.freeze !== value) {
			this.freeze = value;
			this.dispatchEvent({'type': 'freeze_changed', 'viewer': this});
		}
	};

	getFreeze () {
		return this.freeze;
	};

	getClipTask(){
		return this.clipTask;
	}

	getClipMethod(){
		return this.clipMethod;
	}

	setClipTask(value){
		if(this.clipTask !== value){

			this.clipTask = value;

			this.dispatchEvent({
				type: "cliptask_changed", 
				viewer: this});		
		}
	}

	setClipMethod(value){
		if(this.clipMethod !== value){

			this.clipMethod = value;
			
			this.dispatchEvent({
				type: "clipmethod_changed",
				viewer: this});
		}
	}

	setElevationGradientRepeat(value){
		if(this.elevationGradientRepeat !== value){

			this.elevationGradientRepeat = value;

			this.dispatchEvent({
				type: "elevation_gradient_repeat_changed", 
				viewer: this});
		}
	}

	setPointBudget (value) {
		if (Potree.pointBudget !== value) {
			Potree.pointBudget = parseInt(value);
			this.dispatchEvent({'type': 'point_budget_changed', 'viewer': this});
		}
	};

	getPointBudget () {
		return Potree.pointBudget;
	};

	setShowAnnotations (value) {
		if (this.showAnnotations !== value) {
			this.showAnnotations = value;
			this.dispatchEvent({'type': 'show_annotations_changed', 'viewer': this});
		}
	}

	getShowAnnotations () {
		return this.showAnnotations;
	}
	
	setDEMCollisionsEnabled(value){
		if(this.useDEMCollisions !== value){
			this.useDEMCollisions = value;
			this.dispatchEvent({'type': 'use_demcollisions_changed', 'viewer': this});
		};
	};

	getDEMCollisionsEnabled () {
		return this.useDEMCollisions;
	};

	setEDLEnabled (value) {
		value = Boolean(value) && Features.SHADER_EDL.isSupported();

		if (this.useEDL !== value) {
			this.useEDL = value;
			this.dispatchEvent({'type': 'use_edl_changed', 'viewer': this});
		}
	};

	getEDLEnabled () {
		return this.useEDL;
	};

	setEDLRadius (value) {
		if (this.edlRadius !== value) {
			this.edlRadius = value;
			this.dispatchEvent({'type': 'edl_radius_changed', 'viewer': this});
		}
	};

	getEDLRadius () {
		return this.edlRadius;
	};

	setEDLStrength (value) {
		if (this.edlStrength !== value) {
			this.edlStrength = value;
			this.dispatchEvent({'type': 'edl_strength_changed', 'viewer': this});
		}
	};

	getEDLStrength () {
		return this.edlStrength;
	};

	setEDLOpacity (value) {
		if (this.edlOpacity !== value) {
			this.edlOpacity = value;
			this.dispatchEvent({'type': 'edl_opacity_changed', 'viewer': this});
		}
	};

	getEDLOpacity () {
		return this.edlOpacity;
	};

	setFOV (value) {
		if (this.fov !== value) {
			this.fov = value;
			this.dispatchEvent({'type': 'fov_changed', 'viewer': this});
		}
	};

	getFOV () {
		return this.fov;
	};

	disableAnnotations () {
		this.scene.annotations.traverse(annotation => {
			annotation.domElement.css('pointer-events', 'none');

			// return annotation.visible;
		});
	};

	enableAnnotations () {
		this.scene.annotations.traverse(annotation => {
			annotation.domElement.css('pointer-events', 'auto');

			// return annotation.visible;
		});
	}

	setClassifications(classifications){
		this.classifications = classifications;

		this.dispatchEvent({'type': 'classifications_changed', 'viewer': this});
	}

	setClassificationVisibility (key, value) {
		if (!this.classifications[key]) {
			this.classifications[key] = {visible: value, name: 'no name'};
			this.dispatchEvent({'type': 'classification_visibility_changed', 'viewer': this});
		} else if (this.classifications[key].visible !== value) {
			this.classifications[key].visible = value;
			this.dispatchEvent({'type': 'classification_visibility_changed', 'viewer': this});
		}
	}

	toggleAllClassificationsVisibility(){

		let numVisible = 0;
		let numItems = 0;
		for(const key of Object.keys(this.classifications)){
			if(this.classifications[key].visible){
				numVisible++;
			}
			numItems++;
		}

		let visible = true;
		if(numVisible === numItems){
			visible = false;
		}

		let somethingChanged = false;

		for(const key of Object.keys(this.classifications)){
			if(this.classifications[key].visible !== visible){
				this.classifications[key].visible = visible;
				somethingChanged = true;
			}
		}

		if(somethingChanged){
			this.dispatchEvent({'type': 'classification_visibility_changed', 'viewer': this});
		}
	}

	setFilterReturnNumberRange(from, to){
		this.filterReturnNumberRange = [from, to];
		this.dispatchEvent({'type': 'filter_return_number_range_changed', 'viewer': this});
	}

	setFilterNumberOfReturnsRange(from, to){
		this.filterNumberOfReturnsRange = [from, to];
		this.dispatchEvent({'type': 'filter_number_of_returns_range_changed', 'viewer': this});
	}

	setFilterGPSTimeRange(from, to){
		this.filterGPSTimeRange = [from, to];
		this.dispatchEvent({'type': 'filter_gps_time_range_changed', 'viewer': this});
	}

	setFilterPointSourceIDRange(from, to){
		this.filterPointSourceIDRange = [from, to]
		this.dispatchEvent({'type': 'filter_point_source_id_range_changed', 'viewer': this});
	}

	setLengthUnit (value) {
		switch (value) {
			case 'm':
				this.lengthUnit = LengthUnits.METER;
				this.lengthUnitDisplay = LengthUnits.METER;
				break;
			case 'ft':
				this.lengthUnit = LengthUnits.FEET;
				this.lengthUnitDisplay = LengthUnits.FEET;
				break;
			case 'in':
				this.lengthUnit = LengthUnits.INCH;
				this.lengthUnitDisplay = LengthUnits.INCH;
				break;
		}

		this.dispatchEvent({ 'type': 'length_unit_changed', 'viewer': this, value: value});
	};

	setLengthUnitAndDisplayUnit(lengthUnitValue, lengthUnitDisplayValue) {
		switch (lengthUnitValue) {
			case 'm':
				this.lengthUnit = LengthUnits.METER;
				break;
			case 'ft':
				this.lengthUnit = LengthUnits.FEET;
				break;
			case 'in':
				this.lengthUnit = LengthUnits.INCH;
				break;
		}

		switch (lengthUnitDisplayValue) {
			case 'm':
				this.lengthUnitDisplay = LengthUnits.METER;
				break;
			case 'ft':
				this.lengthUnitDisplay = LengthUnits.FEET;
				break;
			case 'in':
				this.lengthUnitDisplay = LengthUnits.INCH;
				break;
		}

		this.dispatchEvent({ 'type': 'length_unit_changed', 'viewer': this, value: lengthUnitValue });
	};

	zoomTo(node, factor, animationDuration = 0){
		let view = this.scene.view;

		let camera = this.scene.cameraP.clone();
		camera.rotation.copy(this.scene.cameraP.rotation);
		camera.rotation.order = "ZXY";
		camera.rotation.x = Math.PI / 2 + view.pitch;
		camera.rotation.z = view.yaw;
		camera.updateMatrix();
		camera.updateMatrixWorld();
		camera.zoomTo(node, factor);

		let bs;
		if (node.boundingSphere) {
			bs = node.boundingSphere;
		} else if (node.geometry && node.geometry.boundingSphere) {
			bs = node.geometry.boundingSphere;
		} else {
			bs = node.boundingBox.getBoundingSphere(new THREE.Sphere());
		}
		bs = bs.clone().applyMatrix4(node.matrixWorld); 

		let startPosition = view.position.clone();
		let endPosition = camera.position.clone();
		let startTarget = view.getPivot();
		let endTarget = bs.center;
		let startRadius = view.radius;
		let endRadius = endPosition.distanceTo(endTarget);

		let easing = TWEEN.Easing.Quartic.Out;

		{ // animate camera position
			let pos = startPosition.clone();
			let tween = new TWEEN.Tween(pos).to(endPosition, animationDuration);
			tween.easing(easing);

			tween.onUpdate(() => {
				view.position.copy(pos);
			});

			tween.start();
		}

		{ // animate camera target
			let target = startTarget.clone();
			let tween = new TWEEN.Tween(target).to(endTarget, animationDuration);
			tween.easing(easing);
			tween.onUpdate(() => {
				view.lookAt(target);
			});
			tween.onComplete(() => {
				view.lookAt(target);
				this.dispatchEvent({type: 'focusing_finished', target: this});
			});

			this.dispatchEvent({type: 'focusing_started', target: this});
			tween.start();
		}
	};

	moveToGpsTimeVicinity(time){
		const result = Potree.Utils.findClosestGpsTime(time, viewer);

		const box  = result.node.pointcloud.deepestNodeAt(result.position).getBoundingBox();
		const diameter = box.min.distanceTo(box.max);

		const camera = this.scene.getActiveCamera();
		const offset = camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(diameter);
		const newCamPos = result.position.clone().sub(offset);

		this.scene.view.position.copy(newCamPos);
		this.scene.view.lookAt(result.position);
	}

	showAbout () {
		$(function () {
			$('#about-panel').dialog();
		});
	};

	getBoundingBox (pointclouds) {
		return this.scene.getBoundingBox(pointclouds);
	};

	getGpsTimeExtent(){
		const range = [Infinity, -Infinity];

		for(const pointcloud of this.scene.pointclouds){
			const attributes = pointcloud.pcoGeometry.pointAttributes.attributes;
			const aGpsTime = attributes.find(a => a.name === "gps-time");

			if(aGpsTime){
				range[0] = Math.min(range[0], aGpsTime.range[0]);
				range[1] = Math.max(range[1], aGpsTime.range[1]);
			}
		}

		return range;
	}

	fitToScreen (factor = 1, animationDuration = 0) {
		let box = this.getBoundingBox(this.scene.pointclouds);

		let node = new THREE.Object3D();
		node.boundingBox = box;

		this.zoomTo(node, factor, animationDuration);
		this.controls.stop();
	};

	toggleNavigationCube() {
		this.navigationCube.visible = !this.navigationCube.visible;
	}

	setView(view) {
		if(!view) return;

		switch(view) {
			case "F":
				this.setFrontView();
				break;
			case "B":
				this.setBackView();
				break;
			case "L":
				this.setLeftView();
				break;
			case "R":
				this.setRightView();
				break;
			case "U":
				this.setTopView();
				break;
			case "D":
				this.setBottomView();
				break;
		}
	}
	
	setTopView(){
		this.scene.view.yaw = 0;
		this.scene.view.pitch = -Math.PI / 2;

		this.fitToScreen();
	};
	
	setBottomView(){
		this.scene.view.yaw = -Math.PI;
		this.scene.view.pitch = Math.PI / 2;
		
		this.fitToScreen();
	};

	setFrontView(){
		this.scene.view.yaw = 0;
		this.scene.view.pitch = 0;

		this.fitToScreen();
	};
	
	setBackView(){
		this.scene.view.yaw = Math.PI;
		this.scene.view.pitch = 0;
		
		this.fitToScreen();
	};

	setLeftView(){
		this.scene.view.yaw = -Math.PI / 2;
		this.scene.view.pitch = 0;

		this.fitToScreen();
	};

	setRightView () {
		this.scene.view.yaw = Math.PI / 2;
		this.scene.view.pitch = 0;

		this.fitToScreen();
	};

	flipYZ () {
		this.isFlipYZ = !this.isFlipYZ;

		// TODO flipyz
		console.log('TODO');
	}
	
	setCameraMode(mode){
		this.scene.cameraMode = mode;

		for(let pointcloud of this.scene.pointclouds) {
			pointcloud.material.useOrthographicCamera = mode == CameraMode.ORTHOGRAPHIC;
		}
	}

	getProjection(){
		const pointcloud = this.scene.pointclouds[0];

		if(pointcloud){
			return pointcloud.projection;
		}else{
			return null;
		}
	}

	async loadProject(url){

		const response = await fetch(url);
	
		const text = await response.text();
		const json = JSON5.parse(text);
		// const json = JSON.parse(text);

		if(json.type === "Potree"){
			Potree.loadProject(viewer, json);
		}

		//Potree.loadProject(this, url);
	}

	saveProject(){
		return Potree.saveProject(this);
	}
	
	loadSettingsFromURL(){
		if(Utils.getParameterByName("pointSize")){
			this.setPointSize(parseFloat(Utils.getParameterByName("pointSize")));
		}
		
		if(Utils.getParameterByName("FOV")){
			this.setFOV(parseFloat(Utils.getParameterByName("FOV")));
		}
		
		if(Utils.getParameterByName("opacity")){
			this.setOpacity(parseFloat(Utils.getParameterByName("opacity")));
		}
		
		if(Utils.getParameterByName("edlEnabled")){
			let enabled = Utils.getParameterByName("edlEnabled") === "true";
			this.setEDLEnabled(enabled);
		}

		if (Utils.getParameterByName('edlRadius')) {
			this.setEDLRadius(parseFloat(Utils.getParameterByName('edlRadius')));
		}

		if (Utils.getParameterByName('edlStrength')) {
			this.setEDLStrength(parseFloat(Utils.getParameterByName('edlStrength')));
		}

		if (Utils.getParameterByName('pointBudget')) {
			this.setPointBudget(parseFloat(Utils.getParameterByName('pointBudget')));
		}

		if (Utils.getParameterByName('showBoundingBox')) {
			let enabled = Utils.getParameterByName('showBoundingBox') === 'true';
			if (enabled) {
				this.setShowBoundingBox(true);
			} else {
				this.setShowBoundingBox(false);
			}
		}

		if (Utils.getParameterByName('material')) {
			let material = Utils.getParameterByName('material');
			this.setMaterial(material);
		}

		if (Utils.getParameterByName('pointSizing')) {
			let sizing = Utils.getParameterByName('pointSizing');
			this.setPointSizing(sizing);
		}

		if (Utils.getParameterByName('quality')) {
			let quality = Utils.getParameterByName('quality');
			this.setQuality(quality);
		}

		if (Utils.getParameterByName('position')) {
			let value = Utils.getParameterByName('position');
			value = value.replace('[', '').replace(']', '');
			let tokens = value.split(';');
			let x = parseFloat(tokens[0]);
			let y = parseFloat(tokens[1]);
			let z = parseFloat(tokens[2]);

			this.scene.view.position.set(x, y, z);
		}

		if (Utils.getParameterByName('target')) {
			let value = Utils.getParameterByName('target');
			value = value.replace('[', '').replace(']', '');
			let tokens = value.split(';');
			let x = parseFloat(tokens[0]);
			let y = parseFloat(tokens[1]);
			let z = parseFloat(tokens[2]);

			this.scene.view.lookAt(new THREE.Vector3(x, y, z));
		}

		if (Utils.getParameterByName('background')) {
			let value = Utils.getParameterByName('background');
			this.setBackground(value);
		}

		// if(Utils.getParameterByName("elevationRange")){
		//	let value = Utils.getParameterByName("elevationRange");
		//	value = value.replace("[", "").replace("]", "");
		//	let tokens = value.split(";");
		//	let x = parseFloat(tokens[0]);
		//	let y = parseFloat(tokens[1]);
		//
		//	this.setElevationRange(x, y);
		//	//this.scene.view.target.set(x, y, z);
		// }
	};

	// ------------------------------------------------------------------------------------
	// Viewer Internals
	// ------------------------------------------------------------------------------------

	createControls () {
		{ // create FIRST PERSON CONTROLS
			this.fpControls = new FirstPersonControls(this);
			this.fpControls.enabled = false;
			this.fpControls.addEventListener('start', this.disableAnnotations.bind(this));
			this.fpControls.addEventListener('end', this.enableAnnotations.bind(this));
		}

		// { // create GEO CONTROLS
		//	this.geoControls = new GeoControls(this.scene.camera, this.renderer.domElement);
		//	this.geoControls.enabled = false;
		//	this.geoControls.addEventListener("start", this.disableAnnotations.bind(this));
		//	this.geoControls.addEventListener("end", this.enableAnnotations.bind(this));
		//	this.geoControls.addEventListener("move_speed_changed", (event) => {
		//		this.setMoveSpeed(this.geoControls.moveSpeed);
		//	});
		// }

		{ // create ORBIT CONTROLS
			this.orbitControls = new OrbitControls(this);
			this.orbitControls.enabled = false;
			this.orbitControls.addEventListener('start', this.disableAnnotations.bind(this));
			this.orbitControls.addEventListener('end', this.enableAnnotations.bind(this));
		}

		{ // create EARTH CONTROLS
			this.earthControls = new EarthControls(this);
			this.earthControls.enabled = false;
			this.earthControls.addEventListener('start', this.disableAnnotations.bind(this));
			this.earthControls.addEventListener('end', this.enableAnnotations.bind(this));
		}

		{ // create DEVICE ORIENTATION CONTROLS
			this.deviceControls = new DeviceOrientationControls(this);
			this.deviceControls.enabled = false;
			this.deviceControls.addEventListener('start', this.disableAnnotations.bind(this));
			this.deviceControls.addEventListener('end', this.enableAnnotations.bind(this));
		}

		{ // create VR CONTROLS
			this.vrControls = new VRControls(this);
			this.vrControls.enabled = false;
			this.vrControls.addEventListener('start', this.disableAnnotations.bind(this));
			this.vrControls.addEventListener('end', this.enableAnnotations.bind(this));
		}


	};

	toggleSidebar () {
		let renderArea = $('#potree_render_area');
		let isVisible = renderArea.css('left') !== '0px';

		if (isVisible) {
			renderArea.css('left', '0px');
		} else {
			renderArea.css('left', '300px');
		}
	};

	toggleMap () {
		// let map = $('#potree_map');
		// map.toggle(100);

		if (this.mapView) {
			this.mapView.toggle();
		}
	};

	onGUILoaded(callback){
		if(this.guiLoaded){
			callback();
		}else{
			this.guiLoadTasks.push(callback);
		}
	}

	promiseGuiLoaded(){
		return new Promise( resolve => {

			if(this.guiLoaded){
				resolve();
			}else{
				this.guiLoadTasks.push(resolve);
			}
		
		});
	}

	loadGUI(callback){

		if(callback){
			this.onGUILoaded(callback);
		}

		let viewer = this;
		let sidebarContainer = $('#potree_sidebar_container');
		sidebarContainer.load(new URL(Potree.scriptPath + '/sidebar.html').href, () => {
			sidebarContainer.css('width', '300px');
			sidebarContainer.css('height', '100%');

			let imgMenuToggle = document.createElement('img');
			imgMenuToggle.src = new URL(Potree.resourcePath + '/icons/menu_button.svg').href;
			imgMenuToggle.onclick = this.toggleSidebar;
			imgMenuToggle.classList.add('potree_menu_toggle');

			let imgMapToggle = document.createElement('img');
			imgMapToggle.src = new URL(Potree.resourcePath + '/icons/map_icon.png').href;
			imgMapToggle.style.display = 'none';
			imgMapToggle.onclick = e => { this.toggleMap(); };
			imgMapToggle.id = 'potree_map_toggle';

			

			let elButtons = $("#potree_quick_buttons").get(0);

			elButtons.append(imgMenuToggle);
			elButtons.append(imgMapToggle);


			VRButton.createButton(this.renderer).then(vrButton => {

				if(vrButton == null){
					console.log("VR not supported or active.");

					return;
				}

				this.renderer.xr.enabled = true;

				let element = vrButton.element;

				element.style.position = "";
				element.style.bottom = "";
				element.style.left = "";
				element.style.margin = "4px";
				element.style.fontSize = "100%";
				element.style.width = "2.5em";
				element.style.height = "2.5em";
				element.style.padding = "0";
				element.style.textShadow = "black 2px 2px 2px";
				element.style.display = "block";

				elButtons.append(element);

				vrButton.onStart(() => {
					this.dispatchEvent({type: "vr_start"});
				});

				vrButton.onEnd(() => {
					this.dispatchEvent({type: "vr_end"});
				});
			});

			this.mapView = new MapView(this);
			this.mapView.init();

			i18n.init({
				lng: 'en',
				resGetPath: Potree.resourcePath + '/lang/__lng__/__ns__.json',
				preload: ['en', 'fr', 'de', 'jp', 'se', 'es', 'zh', 'it','ca'],
				getAsync: true,
				debug: false
			}, function (t) {
				// Start translation once everything is loaded
				$('body').i18n();
			});

			$(() => {
				//initSidebar(this);
				let sidebar = new Sidebar(this);
				sidebar.init();

				this.sidebar = sidebar;

				//if (callback) {
				//	$(callback);
				//}

				let elProfile = $('<div>').load(new URL(Potree.scriptPath + '/profile.html').href, () => {
					$(document.body).append(elProfile.children());
					this.profileWindow = new ProfileWindow(this);
					this.profileWindowController = new ProfileWindowController(this);

					$('#profile_window').draggable({
						handle: $('#profile_titlebar'),
						containment: $(document.body)
					});
					$('#profile_window').resizable({
						containment: $(document.body),
						handles: 'n, e, s, w'
					});

					$(() => {
						this.guiLoaded = true;
						for(let task of this.guiLoadTasks){
							task();
						}

					});
				});

				

			});

			
		});

		return this.promiseGuiLoaded();
	}

	setLanguage (lang) {
		i18n.setLng(lang);
		$('body').i18n();
	}

	setServer (server) {
		this.server = server;
	}

	initDragAndDrop(){
		function allowDrag(e) {
			e.dataTransfer.dropEffect = 'copy';
			e.preventDefault();
		}

		let dropHandler = async (event) => {
			console.log(event);
			event.preventDefault();

			for(const item of event.dataTransfer.items){
				console.log(item);

				if(item.kind !== "file"){
					continue;
				}

				const file = item.getAsFile();

				const isJson5 = file.name.toLowerCase().endsWith(".json5");
				const isGeoPackage = file.name.toLowerCase().endsWith(".gpkg");

				if(isJson5){
					try{

						const text = await file.text();
						const json = JSON5.parse(text);

						if(json.type === "Potree"){
							Potree.loadProject(viewer, json);
						}
					}catch(e){
						console.error("failed to parse the dropped file as JSON");
						console.error(e);
					}
				}else if(isGeoPackage){
					const hasPointcloud = viewer.scene.pointclouds.length > 0;

					if(!hasPointcloud){
						let msg = "At least one point cloud is needed that specifies the ";
						msg += "coordinate reference system before loading vector data.";
						console.error(msg);
					}else{

						proj4.defs("WGS84", "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs");
						proj4.defs("pointcloud", this.getProjection());
						let transform = proj4("WGS84", "pointcloud");

						const buffer = await file.arrayBuffer();

						const params = {
							transform: transform,
							source: file.name,
						};
						
						const geo = await Potree.GeoPackageLoader.loadBuffer(buffer, params);
						viewer.scene.addGeopackage(geo);
					}
				}
				
			}
		};


		$("body")[0].addEventListener("dragenter", allowDrag);
		$("body")[0].addEventListener("dragover", allowDrag);
		$("body")[0].addEventListener("drop", dropHandler);
	}

	initThree () {

		console.log(`initializing three.js ${THREE.REVISION}`);

		let width = this.renderArea.clientWidth;
		let height = this.renderArea.clientHeight;

		let contextAttributes = {
			alpha: true,
			depth: true,
			stencil: false,
			antialias: false,
			//premultipliedAlpha: _premultipliedAlpha,
			preserveDrawingBuffer: true,
			powerPreference: "high-performance",
		};

		// let contextAttributes = {
		// 	alpha: false,
		// 	preserveDrawingBuffer: true,
		// };

		// let contextAttributes = {
		// 	alpha: false,
		// 	preserveDrawingBuffer: true,
		// };

		let canvas = document.createElement("canvas");

		let context = canvas.getContext('webgl', contextAttributes );

		this.renderer = new THREE.WebGLRenderer({
			alpha: true, 
			premultipliedAlpha: false,
			canvas: canvas,
			context: context});
		this.renderer.sortObjects = false;
		this.renderer.setSize(width, height);
		this.renderer.autoClear = false;
		this.renderArea.appendChild(this.renderer.domElement);
		this.renderer.domElement.tabIndex = '2222';
		this.renderer.domElement.style.position = 'absolute';
		this.renderer.domElement.addEventListener('mousedown', () => {
			this.renderer.domElement.focus();
		});
		//this.renderer.domElement.focus();

		// NOTE: If extension errors occur, pass the string into this.renderer.extensions.get(x) before enabling
		// enable frag_depth extension for the interpolation shader, if available
		let gl = this.renderer.getContext();
		gl.getExtension('EXT_frag_depth');
		gl.getExtension('WEBGL_depth_texture');
		gl.getExtension('WEBGL_color_buffer_float'); 	// Enable explicitly for more portability, EXT_color_buffer_float is the proper name in WebGL 2
		
		if(gl.createVertexArray == null){
			let extVAO = gl.getExtension('OES_vertex_array_object');

			if(!extVAO){
				throw new Error("OES_vertex_array_object extension not supported");
			}

			gl.createVertexArray = extVAO.createVertexArrayOES.bind(extVAO);
			gl.bindVertexArray = extVAO.bindVertexArrayOES.bind(extVAO);
		}
		
	}

	updateAnnotations () {

		if(!this.visibleAnnotations){
			this.visibleAnnotations = new Set();
		}

		this.scene.annotations.updateBounds();
		this.scene.cameraP.updateMatrixWorld();
		this.scene.cameraO.updateMatrixWorld();
		
		let distances = [];

		let renderAreaSize = this.renderer.getSize(new THREE.Vector2());

		let viewer = this;

		let visibleNow = [];
		this.scene.annotations.traverse(annotation => {

			if (annotation === this.scene.annotations) {
				return true;
			}

			if (!annotation.visible) {
				return false;
			}

			annotation.scene = this.scene;

			let element = annotation.domElement;

			let position = annotation.position.clone();
			position.add(annotation.offset);
			if (!position) {
				position = annotation.boundingBox.getCenter(new THREE.Vector3());
			}

			let distance = viewer.scene.cameraP.position.distanceTo(position);
			let radius = annotation.boundingBox.getBoundingSphere(new THREE.Sphere()).radius;

			let screenPos = new THREE.Vector3();
			let screenSize = 0;

			{
				// SCREEN POS
				screenPos.copy(position).project(this.scene.getActiveCamera());
				screenPos.x = renderAreaSize.x * (screenPos.x + 1) / 2;
				screenPos.y = renderAreaSize.y * (1 - (screenPos.y + 1) / 2);


				// SCREEN SIZE
				if(viewer.scene.cameraMode == CameraMode.PERSPECTIVE) {
					let fov = Math.PI * viewer.scene.cameraP.fov / 180;
					let slope = Math.tan(fov / 2.0);
					let projFactor =  0.5 * renderAreaSize.y / (slope * distance);
					screenSize = radius * projFactor;
				} else {
					screenSize = Utils.projectedRadiusOrtho(radius, viewer.scene.cameraO.projectionMatrix, renderAreaSize.x, renderAreaSize.y);
				}
			}

			element.css("left", screenPos.x + "px");
			element.css("top", screenPos.y + "px");
			//element.css("display", "block");

			let zIndex = 10000000 - distance * (10000000 / this.scene.cameraP.far);
			if(annotation.descriptionVisible){
				zIndex += 10000000;
			}
			element.css("z-index", parseInt(zIndex));

			if(annotation.children.length > 0){
				let expand = screenSize > annotation.collapseThreshold || annotation.boundingBox.containsPoint(this.scene.getActiveCamera().position);
				annotation.expand = expand;

				if (!expand) {
					//annotation.display = (screenPos.z >= -1 && screenPos.z <= 1);
					let inFrustum = (screenPos.z >= -1 && screenPos.z <= 1);
					if(inFrustum){
						visibleNow.push(annotation);
					}
				}

				return expand;
			} else {
				//annotation.display = (screenPos.z >= -1 && screenPos.z <= 1);
				let inFrustum = (screenPos.z >= -1 && screenPos.z <= 1);
				if(inFrustum){
					visibleNow.push(annotation);
				}
			}
			
		});

		let notVisibleAnymore = new Set(this.visibleAnnotations);
		for(let annotation of visibleNow){
			annotation.display = true;
			
			notVisibleAnymore.delete(annotation);
		}
		this.visibleAnnotations = visibleNow;

		for(let annotation of notVisibleAnymore){
			annotation.display = false;
		}

	}

	updateMaterialDefaults(pointcloud){
		// PROBLEM STATEMENT:
		// * [min, max] of intensity, source id, etc. are computed as point clouds are loaded
		// * the point cloud material won't know the range it should use until some data is loaded
		// * users can modify the range at runtime, but sensible default ranges should be 
		//   applied even if no GUI is present
		// * display ranges shouldn't suddenly change even if the actual range changes over time.
		//   e.g. the root node has intensity range [1, 478]. One of the descendants increases range to 
		//   [0, 2047]. We should not automatically change to the new range because that would result
		//   in sudden and drastic changes of brightness. We should adjust the min/max of the sidebar slider.

		const material = pointcloud.material;

		const attIntensity = pointcloud.getAttribute("intensity");
		
		if(attIntensity != null && material.intensityRange[0] === Infinity){
			material.intensityRange = [...attIntensity.range];
		}

		// const attIntensity = pointcloud.getAttribute("intensity");
		// if(attIntensity && material.intensityRange[0] === Infinity){
		// 	material.intensityRange = [...attIntensity.range];
		// }

		// let attributes = pointcloud.getAttributes();

		// for(let attribute of attributes.attributes){
		// 	if(attribute.range){
		// 		let range = [...attribute.range];
		// 		material.computedRange.set(attribute.name, range);
		// 		//material.setRange(attribute.name, range);
		// 	}
		// }


	}

	update(delta, timestamp){

		if(Potree.measureTimings) performance.mark("update-start");

		this.dispatchEvent({
			type: 'update_start',
			delta: delta,
			timestamp: timestamp});

		
		const scene = this.scene;
		const camera = scene.getActiveCamera();
		const visiblePointClouds = this.scene.pointclouds.filter(pc => pc.visible)
		
		Potree.pointLoadLimit = Potree.pointBudget * 2;

		const lTarget = camera.position.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(1000));
		this.scene.directionalLight.position.copy(camera.position);
		this.scene.directionalLight.lookAt(lTarget);


		for (let pointcloud of visiblePointClouds) {

			pointcloud.showBoundingBox = this.showBoundingBox;
			pointcloud.generateDEM = this.generateDEM;
			pointcloud.minimumNodePixelSize = this.minNodeSize;

			let material = pointcloud.material;

			material.uniforms.uFilterReturnNumberRange.value = this.filterReturnNumberRange;
			material.uniforms.uFilterNumberOfReturnsRange.value = this.filterNumberOfReturnsRange;
			material.uniforms.uFilterGPSTimeClipRange.value = this.filterGPSTimeRange;
			material.uniforms.uFilterPointSourceIDClipRange.value = this.filterPointSourceIDRange;

			material.classification = this.classifications;
			material.recomputeClassification();

			this.updateMaterialDefaults(pointcloud);
		}

		{
			if(this.showBoundingBox){
				let bbRoot = this.scene.scene.getObjectByName("potree_bounding_box_root");
				if(!bbRoot){
					let node = new THREE.Object3D();
					node.name = "potree_bounding_box_root";
					this.scene.scene.add(node);
					bbRoot = node;
				}

				let visibleBoxes = [];
				for(let pointcloud of this.scene.pointclouds){
					for(let node of pointcloud.visibleNodes.filter(vn => vn.boundingBoxNode !== undefined)){
						let box = node.boundingBoxNode;
						visibleBoxes.push(box);
					}
				}

				bbRoot.children = visibleBoxes;
			}
		}

		if (!this.freeze) {
			let result = Potree.updatePointClouds(scene.pointclouds, camera, this.renderer);


			// DEBUG - ONLY DISPLAY NODES THAT INTERSECT MOUSE
			//if(false){ 

			//	let renderer = viewer.renderer;
			//	let mouse = viewer.inputHandler.mouse;

			//	let nmouse = {
			//		x: (mouse.x / renderer.domElement.clientWidth) * 2 - 1,
			//		y: -(mouse.y / renderer.domElement.clientHeight) * 2 + 1
			//	};

			//	let pickParams = {};

			//	//if(params.pickClipped){
			//	//	pickParams.pickClipped = params.pickClipped;
			//	//}

			//	pickParams.x = mouse.x;
			//	pickParams.y = renderer.domElement.clientHeight - mouse.y;

			//	let raycaster = new THREE.Raycaster();
			//	raycaster.setFromCamera(nmouse, camera);
			//	let ray = raycaster.ray;

			//	for(let pointcloud of scene.pointclouds){
			//		let nodes = pointcloud.nodesOnRay(pointcloud.visibleNodes, ray);
			//		pointcloud.visibleNodes = nodes;

			//	}
			//}

			// const tStart = performance.now();
			// const worldPos = new THREE.Vector3();
			// const camPos = viewer.scene.getActiveCamera().getWorldPosition(new THREE.Vector3());
			// let lowestDistance = Infinity;
			// let numNodes = 0;

			// viewer.scene.scene.traverse(node => {
			// 	node.getWorldPosition(worldPos);

			// 	const distance = worldPos.distanceTo(camPos);

			// 	lowestDistance = Math.min(lowestDistance, distance);

			// 	numNodes++;

			// 	if(Number.isNaN(distance)){
			// 		console.error(":(");
			// 	}
			// });
			// const duration = (performance.now() - tStart).toFixed(2);

			// Potree.debug.computeNearDuration = duration;
			// Potree.debug.numNodes = numNodes;

			//console.log(lowestDistance.toString(2), duration);

			const tStart = performance.now();
			const campos = camera.position;
			let closestImage = Infinity;
			for(const images of this.scene.orientedImages){
				for(const image of images.images){
					const distance = image.mesh.position.distanceTo(campos);

					closestImage = Math.min(closestImage, distance);
				}
			}
			const tEnd = performance.now();

			if(result.lowestSpacing !== Infinity){
				let near = result.lowestSpacing * 10.0;
				let far = -this.getBoundingBox().applyMatrix4(camera.matrixWorldInverse).min.z;

				far = Math.max(far * 1.5, 10000);
				near = Math.min(100.0, Math.max(0.01, near));
				near = Math.min(near, closestImage);
				far = Math.max(far, near + 10000);

				if(near === Infinity){
					near = 0.1;
				}
				
				camera.near = near;
				camera.far = far;
			}else{
				// don't change near and far in this case
			}

			if(this.scene.cameraMode == CameraMode.ORTHOGRAPHIC) {
				camera.near = -camera.far;
			}
		} 
		
		this.scene.cameraP.fov = this.fov;
		
		let controls = this.getControls();
		if (controls === this.deviceControls) {
			this.controls.setScene(scene);
			this.controls.update(delta);

			this.scene.cameraP.position.copy(scene.view.position);
			this.scene.cameraO.position.copy(scene.view.position);
		} else if (controls !== null) {
			controls.setScene(scene);
			controls.update(delta);

			if(typeof debugDisabled === "undefined" ){
				this.scene.cameraP.position.copy(scene.view.position);
				this.scene.cameraP.rotation.order = "ZXY";
				this.scene.cameraP.rotation.x = Math.PI / 2 + this.scene.view.pitch;
				this.scene.cameraP.rotation.z = this.scene.view.yaw;
			}

			this.scene.cameraO.position.copy(scene.view.position);
			this.scene.cameraO.rotation.order = "ZXY";
			this.scene.cameraO.rotation.x = Math.PI / 2 + this.scene.view.pitch;
			this.scene.cameraO.rotation.z = this.scene.view.yaw;
		}
		
		camera.updateMatrix();
		camera.updateMatrixWorld();
		camera.matrixWorldInverse.copy(camera.matrixWorld).invert();

		{
			if(this._previousCamera === undefined){
				this._previousCamera = this.scene.getActiveCamera().clone();
				this._previousCamera.rotation.copy(this.scene.getActiveCamera().rotation);
			}

			if(!this._previousCamera.matrixWorld.equals(camera.matrixWorld)){
				this.dispatchEvent({
					type: "camera_changed",
					previous: this._previousCamera,
					camera: camera
				});
			}else if(!this._previousCamera.projectionMatrix.equals(camera.projectionMatrix)){
				this.dispatchEvent({
					type: "camera_changed",
					previous: this._previousCamera,
					camera: camera
				});
			}

			this._previousCamera = this.scene.getActiveCamera().clone();
			this._previousCamera.rotation.copy(this.scene.getActiveCamera().rotation);

		}

		{ // update clip boxes
			let boxes = [];
			
			// volumes with clipping enabled
			//boxes.push(...this.scene.volumes.filter(v => (v.clip)));
			boxes.push(...this.scene.volumes.filter(v => (v.clip && v instanceof BoxVolume)));

			// profile segments
			for(let profile of this.scene.profiles){
				boxes.push(...profile.boxes);
			}
			
			// Needed for .getInverse(), pre-empt a determinant of 0, see #815 / #816
			let degenerate = (box) => box.matrixWorld.determinant() !== 0;
			
			let clipBoxes = boxes.filter(degenerate).map( box => {
				box.updateMatrixWorld();
				
				let boxInverse = box.matrixWorld.clone().invert();
				let boxPosition = box.getWorldPosition(new THREE.Vector3());

				return {box: box, inverse: boxInverse, position: boxPosition};
			});

			let clipPolygons = this.scene.polygonClipVolumes.filter(vol => vol.initialized);
			
			// set clip volumes in material
			for(let pointcloud of visiblePointClouds){
				pointcloud.material.setClipBoxes(clipBoxes);
				pointcloud.material.setClipPolygons(clipPolygons, this.clippingTool.maxPolygonVertices);
				pointcloud.material.clipTask = this.clipTask;
				pointcloud.material.clipMethod = this.clipMethod;
			}
		}

		{
			for(let pointcloud of visiblePointClouds){
				pointcloud.material.elevationGradientRepeat = this.elevationGradientRepeat;
			}
		}
		
		{ // update navigation cube
			this.navigationCube.update(camera.rotation);
		}

		this.updateAnnotations();
		
		if(this.mapView){
			this.mapView.update(delta);
			if(this.mapView.sceneProjection){
				$( "#potree_map_toggle" ).css("display", "block");
				
			}
		}

		TWEEN.update(timestamp);

		this.dispatchEvent({
			type: 'update',
			delta: delta,
			timestamp: timestamp});
			
		if(Potree.measureTimings) {
			performance.mark("update-end");
			performance.measure("update", "update-start", "update-end");
		}
	}

	getPRenderer(){
		if(this.useHQ){
			if (!this.hqRenderer) {
				this.hqRenderer = new HQSplatRenderer(this);
			}
			this.hqRenderer.useEDL = this.useEDL;

			return this.hqRenderer;
		}else{
			if (this.useEDL && Features.SHADER_EDL.isSupported()) {
				if (!this.edlRenderer) {
					this.edlRenderer = new EDLRenderer(this);
				}

				return this.edlRenderer;
			} else {
				if (!this.potreeRenderer) {
					this.potreeRenderer = new PotreeRenderer(this);
				}

				return this.potreeRenderer;
			}
		}
	}

	renderVR(){

		let renderer = this.renderer;

		renderer.setClearColor(0x550000, 0);
		renderer.clear();

		let xr = renderer.xr;
		let dbg = new THREE.PerspectiveCamera();
		let xrCameras = xr.getCamera(dbg);

		if(xrCameras.cameras.length !== 2){
			return;
		}

		let makeCam = this.vrControls.getCamera.bind(this.vrControls);

		{ // clear framebuffer
			if(viewer.background === "skybox"){
				renderer.setClearColor(0xff0000, 1);
			}else if(viewer.background === "gradient"){
				renderer.setClearColor(0x112233, 1);
			}else if(viewer.background === "black"){
				renderer.setClearColor(0x000000, 1);
			}else if(viewer.background === "white"){
				renderer.setClearColor(0xFFFFFF, 1);
			}else{
				renderer.setClearColor(0x000000, 0);
			}

			renderer.clear();
		}

		// render background
		if(this.background === "skybox"){
			let {skybox} = this;

			let cam = makeCam();
			skybox.camera.rotation.copy(cam.rotation);
			skybox.camera.fov = cam.fov;
			skybox.camera.aspect = cam.aspect;
			
			// let dbg = new THREE.Object3D();
			let dbg = skybox.parent;
			// dbg.up.set(0, 0, 1);
			dbg.rotation.x = Math.PI / 2;

			// skybox.camera.parent = dbg;
			// dbg.children.push(skybox.camera);

			dbg.updateMatrix();
			dbg.updateMatrixWorld();

			skybox.camera.updateMatrix();
			skybox.camera.updateMatrixWorld();
			skybox.camera.updateProjectionMatrix();

			renderer.render(skybox.scene, skybox.camera);
			// renderer.render(skybox.scene, cam);
		}else if(this.background === "gradient"){
			// renderer.render(this.scene.sceneBG, this.scene.cameraBG);
		}

		this.renderer.xr.getSession().updateRenderState({
			depthNear: 0.1,
			depthFar: 10000
		});
		
		let cam = null;
		let view = null;

		{ // render world scene
			cam = makeCam();
			cam.position.z -= 0.8 * cam.scale.x;
			cam.parent = null;
			// cam.near = 0.05;
			cam.near = viewer.scene.getActiveCamera().near;
			cam.far = viewer.scene.getActiveCamera().far;
			cam.updateMatrix();
			cam.updateMatrixWorld();

			this.scene.scene.updateMatrix();
			this.scene.scene.updateMatrixWorld();
			this.scene.scene.matrixAutoUpdate = false;

			let camWorld = cam.matrixWorld.clone();
			view = camWorld.clone().invert();
			this.scene.scene.matrix.copy(view);
			this.scene.scene.matrixWorld.copy(view);

			cam.matrix.identity();
			cam.matrixWorld.identity();
			cam.matrixWorldInverse.identity();

			renderer.render(this.scene.scene, cam);

			this.scene.scene.matrixWorld.identity();

		}
		
		for(let pointcloud of this.scene.pointclouds){

			let viewport = xrCameras.cameras[0].viewport;

			pointcloud.material.useEDL = false;
			pointcloud.screenHeight = viewport.height;
			pointcloud.screenWidth = viewport.width;

			// automatically switch to paraboloids because they cause far less flickering in VR, 
			// when point sizes are larger than around 2 pixels
			// if(Features.SHADER_INTERPOLATION.isSupported()){
			// 	pointcloud.material.shape = Potree.PointShape.PARABOLOID;
			// }
		}
		
		// render point clouds
		for(let xrCamera of xrCameras.cameras){

			let v = xrCamera.viewport;
			renderer.setViewport(v.x, v.y, v.width, v.height);

			// xrCamera.fov = 90;

			{ // estimate VR fov
				let proj = xrCamera.projectionMatrix;
				let inv = proj.clone().invert();

				let p1 = new THREE.Vector4(0, 1, -1, 1).applyMatrix4(inv);
				let rad = p1.y
				let fov = 180 * (rad / Math.PI);

				xrCamera.fov = fov;
			}

			for(let pointcloud of this.scene.pointclouds){
				const {material} = pointcloud;
				material.useEDL = false;
			}

			let vrWorld = view.clone().invert();
			vrWorld.multiply(xrCamera.matrixWorld);
			let vrView = vrWorld.clone().invert();

			this.pRenderer.render(this.scene.scenePointCloud, xrCamera, null, {
				viewOverride: vrView,
			});

		}

		{ // render VR scene
			let cam = makeCam();
			cam.parent = null;

			renderer.render(this.sceneVR, cam);
		}

		renderer.resetState();

	}

	renderDefault(){
		let pRenderer = this.getPRenderer();

		{ // resize
			const width = this.scaleFactor * this.renderArea.clientWidth;
			const height = this.scaleFactor * this.renderArea.clientHeight;

			this.renderer.setSize(width, height);
			const pixelRatio = this.renderer.getPixelRatio();
			const aspect = width / height;

			const scene = this.scene;

			scene.cameraP.aspect = aspect;
			scene.cameraP.updateProjectionMatrix();

			let frustumScale = this.scene.view.radius;
			scene.cameraO.left = -frustumScale;
			scene.cameraO.right = frustumScale;
			scene.cameraO.top = frustumScale * 1 / aspect;
			scene.cameraO.bottom = -frustumScale * 1 / aspect;
			scene.cameraO.updateProjectionMatrix();

			scene.cameraScreenSpace.top = 1/aspect;
			scene.cameraScreenSpace.bottom = -1/aspect;
			scene.cameraScreenSpace.updateProjectionMatrix();
		}

		pRenderer.clear();

		pRenderer.render(this.renderer);
		this.renderer.render(this.overlay, this.overlayCamera);
	}
	
	render(){
		if(Potree.measureTimings) performance.mark("render-start");

		try{

			const vrActive = this.renderer.xr.isPresenting;

			if(vrActive){
				this.renderVR();
			}else{
				this.renderDefault();
			}

		}catch(e){
			this.onCrash(e);
		}
		
		if(Potree.measureTimings){
			performance.mark("render-end");
			performance.measure("render", "render-start", "render-end");
		}
	}

	resolveTimings(timestamp){
		if(Potree.measureTimings){
			if(!this.toggle){
				this.toggle = timestamp;
			}
			let duration = timestamp - this.toggle;
			if(duration > 1000.0){
			
				let measures = performance.getEntriesByType("measure");
				
				let names = new Set();
				for(let measure of measures){
					names.add(measure.name);
				}
				
				let groups = new Map();
				for(let name of names){
					groups.set(name, {
						measures: [],
						sum: 0,
						n: 0,
						min: Infinity,
						max: -Infinity
					});
				}
				
				for(let measure of measures){
					let group = groups.get(measure.name);
					group.measures.push(measure);
					group.sum += measure.duration;
					group.n++;
					group.min = Math.min(group.min, measure.duration);
					group.max = Math.max(group.max, measure.duration);
				}

				let glQueries = Potree.resolveQueries(this.renderer.getContext());
				for(let [key, value] of glQueries){

					let group = {
						measures: value.map(v => {return {duration: v}}),
						sum: value.reduce( (a, i) => a + i, 0),
						n: value.length,
						min: Math.min(...value),
						max: Math.max(...value)
					};

					let groupname = `[tq] ${key}`;
					groups.set(groupname, group);
					names.add(groupname);
				}
				
				for(let [name, group] of groups){
					group.mean = group.sum / group.n;
					group.measures.sort( (a, b) => a.duration - b.duration );
					
					if(group.n === 1){
						group.median = group.measures[0].duration;
					}else if(group.n > 1){
						group.median = group.measures[parseInt(group.n / 2)].duration;
					}
					
				}
				
				let cn = Array.from(names).reduce( (a, i) => Math.max(a, i.length), 0) + 5;
				let cmin = 10;
				let cmed = 10;
				let cmax = 10;
				let csam = 6;
				
				let message = ` ${"NAME".padEnd(cn)} |` 
					+ ` ${"MIN".padStart(cmin)} |`
					+ ` ${"MEDIAN".padStart(cmed)} |`
					+ ` ${"MAX".padStart(cmax)} |`
					+ ` ${"SAMPLES".padStart(csam)} \n`;
				message += ` ${"-".repeat(message.length) }\n`;
				
				names = Array.from(names).sort();
				for(let name of names){
					let group = groups.get(name);
					let min = group.min.toFixed(3);
					let median = group.median.toFixed(3);
					let max = group.max.toFixed(3);
					let n = group.n;
					
					message += ` ${name.padEnd(cn)} |`
						+ ` ${min.padStart(cmin)} |`
						+ ` ${median.padStart(cmed)} |`
						+ ` ${max.padStart(cmax)} |`
						+ ` ${n.toString().padStart(csam)}\n`;
				}
				message += `\n`;
				console.log(message);
				
				performance.clearMarks();
				performance.clearMeasures();
				this.toggle = timestamp;
			}
		}
	}

	loop(timestamp){

		if(this.stats){
			this.stats.begin();
		}

		if(Potree.measureTimings){
			performance.mark("loop-start");
		}

		this.update(this.clock.getDelta(), timestamp);
		this.render();

		// let vrActive = viewer.renderer.xr.isPresenting;
		// if(vrActive){
		// 	this.update(this.clock.getDelta(), timestamp);
		// 	this.render();
		// }else{

		// 	this.update(this.clock.getDelta(), timestamp);
		// 	this.render();
		// }


		if(Potree.measureTimings){
			performance.mark("loop-end");
			performance.measure("loop", "loop-start", "loop-end");
		}
		
		this.resolveTimings(timestamp);

		Potree.framenumber++;

		if(this.stats){
			this.stats.end();
		}
	}

	postError(content, params = {}){
		let message = this.postMessage(content, params);

		message.element.addClass("potree_message_error");

		return message;
	}

	postMessage(content, params = {}){
		let message = new Message(content);

		let animationDuration = 100;

		message.element.css("display", "none");
		message.elClose.click( () => {
			message.element.slideToggle(animationDuration);

			let index = this.messages.indexOf(message);
			if(index >= 0){
				this.messages.splice(index, 1);
			}
		});

		this.elMessages.prepend(message.element);

		message.element.slideToggle(animationDuration);

		this.messages.push(message);

		if(params.duration !== undefined){
			let fadeDuration = 500;
			let slideOutDuration = 200;
			setTimeout(() => {
				message.element.animate({
					opacity: 0	
				}, fadeDuration);
				message.element.slideToggle(slideOutDuration);
			}, params.duration)
		}

		return message;
	}
};
