

import {ClipTask, ClipMethod, CameraMode} from "../defines.js";
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

import {InputHandler} from "../navigation/InputHandler.js";
import {NavigationCube} from "./NavigationCube.js";
import {OrbitControls} from "../navigation/OrbitControls.js";
import {FirstPersonControls} from "../navigation/FirstPersonControls.js";
import {EarthControls} from "../navigation/EarthControls.js";
import {DeviceOrientationControls} from "../navigation/DeviceOrientationControls.js";
import { EventDispatcher } from "../EventDispatcher.js";



export class Viewer extends EventDispatcher{
	
	constructor(domElement, args = {}){
		super();

		this.renderArea = domElement;
		this.guiLoaded = false;	
		this.guiLoadTasks = [];

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
		this.useEDL = false;
		this.classifications = {
			0: { visible: true, name: 'never classified' },
			1: { visible: true, name: 'unclassified' },
			2: { visible: true, name: 'ground' },
			3: { visible: true, name: 'low vegetation' },
			4: { visible: true, name: 'medium vegetation' },
			5: { visible: true, name: 'high vegetation' },
			6: { visible: true, name: 'building' },
			7: { visible: true, name: 'low point(noise)' },
			8: { visible: true, name: 'key-point' },
			9: { visible: true, name: 'water' },
			12: { visible: true, name: 'overlap' }
		};

		this.moveSpeed = 10;

		this.LENGTH_UNITS = {
			METER: {code: 'm'},
			FEET: {code: 'ft'},
			INCH: {code: '\u2033'}
		};
		this.lengthUnit = this.LENGTH_UNITS.METER;

		this.showBoundingBox = false;
		this.showAnnotations = true;
		this.freeze = false;
		this.clipTask = ClipTask.HIGHLIGHT;
		this.clipMethod = ClipMethod.INSIDE_ANY;

		this.filterReturnNumberRange = [1, 7];
		this.filterNumberOfReturnsRange = [1, 7];
		this.filterGPSTimeRange = [0, Infinity];
		this.filterGPSTimeExtent = [0, 1];

		this.potreeRenderer = null;
		this.edlRenderer = null;
		this.renderer = null;
		this.pRenderer = null;

		this.scene = null;
		this.overlay = null;
		this.overlayCamera = null;

		this.inputHandler = null;

		this.clippingTool =  null;
		this.transformationTool = null;
		this.navigationCube = null;
		
		this.skybox = null;
		this.clock = new THREE.Clock();
		this.background = null;
		this.defaultGPSTimeChanged = false;

		this.initThree();

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
		this.setScene(scene);

		{
			this.inputHandler = new InputHandler(this);
			this.inputHandler.setScene(this.scene);

			this.clippingTool = new ClippingTool(this);
			this.transformationTool = new TransformationTool(this);
			this.navigationCube = new NavigationCube(this);
			this.navigationCube.visible = false;
			
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
			this.setClipTask(ClipTask.HIGHLIGHT);
			this.setClipMethod(ClipMethod.INSIDE_ANY);
			this.setPointBudget(1*1000*1000);
			this.setShowBoundingBox(false);
			this.setFreeze(false);
			this.setNavigationMode(OrbitControls);
			this.setBackground('gradient');

			this.scaleFactor = 1;

			this.loadSettingsFromURL();
		}

		// start rendering!
		if(args.useDefaultRenderLoop === undefined || args.useDefaultRenderLoop === true){
			requestAnimationFrame(this.loop.bind(this));
		}

		this.loadGUI = this.loadGUI.bind(this);

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

	getControls (navigationMode) {
		if (navigationMode === OrbitControls) {
			return this.orbitControls;
		} else if (navigationMode === FirstPersonControls) {
			return this.fpControls;
		} else if (navigationMode === EarthControls) {
			return this.earthControls;
		} else if (navigationMode === DeviceOrientationControls) {
			return this.deviceControls;
		} else {
			return null;
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
	};

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
		$('#potree_description')[0].innerHTML = value;
	};

	setNavigationMode (value) {
		this.scene.view.navigationMode = value;
	};

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
		value = Boolean(value);
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
	};

	setClassificationVisibility (key, value) {
		if (!this.classifications[key]) {
			this.classifications[key] = {visible: value, name: 'no name'};
			this.dispatchEvent({'type': 'classification_visibility_changed', 'viewer': this});
		} else if (this.classifications[key].visible !== value) {
			this.classifications[key].visible = value;
			this.dispatchEvent({'type': 'classification_visibility_changed', 'viewer': this});
		}
	};

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

	setFilterGPSTimeExtent(from, to){
		this.filterGPSTimeExtent = [from, to];
		this.dispatchEvent({'type': 'filter_gps_time_extent_changed', 'viewer': this});
	}

	setLengthUnit (value) {
		switch (value) {
			case 'm':
				this.lengthUnit = this.LENGTH_UNITS.METER;
				break;
			case 'ft':
				this.lengthUnit = this.LENGTH_UNITS.FEET;
				break;
			case 'in':
				this.lengthUnit = this.LENGTH_UNITS.INCH;
				break;
		}

		this.dispatchEvent({'type': 'length_unit_changed', 'viewer': this, value: value});
	}

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

	showAbout () {
		$(function () {
			$('#about-panel').dialog();
		});
	};

	getBoundingBox (pointclouds) {
		return this.scene.getBoundingBox(pointclouds);
	};

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
			// this.fpControls.addEventListener("double_click_move", (event) => {
			//	let distance = event.targetLocation.distanceTo(event.position);
			//	this.setMoveSpeed(Math.pow(distance, 0.4));
			// });
			// this.fpControls.addEventListener("move_speed_changed", (event) => {
			//	this.setMoveSpeed(this.fpControls.moveSpeed);
			// });
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

	loadGUI(callback){

		this.onGUILoaded(callback);

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

			viewer.renderArea.insertBefore(imgMapToggle, viewer.renderArea.children[0]);
			viewer.renderArea.insertBefore(imgMenuToggle, viewer.renderArea.children[0]);

			this.mapView = new MapView(this);
			this.mapView.init();

			i18n.init({
				lng: 'en',
				resGetPath: Potree.resourcePath + '/lang/__lng__/__ns__.json',
				preload: ['en', 'fr', 'de', 'jp'],
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
	}

	setLanguage (lang) {
		i18n.setLng(lang);
		$('body').i18n();
	}

	setServer (server) {
		this.server = server;
	}

	initThree () {
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

		let canvas = document.createElement("canvas");

		//let context = canvas.getContext('webgl2', contextAttributes );
		//if(!context){
			let context = canvas.getContext('webgl', contextAttributes );
			Potree.Features.WEBGL2.isSupported = () => {
				return false;
			};
		//}


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

		// enable frag_depth extension for the interpolation shader, if available
		let gl = this.renderer.context;
		gl.getExtension('EXT_frag_depth');
		gl.getExtension('WEBGL_depth_texture');
		
		if(gl instanceof WebGLRenderingContext){
			let extVAO = gl.getExtension('OES_vertex_array_object');

			if(!extVAO){
				throw new Error("OES_vertex_array_object extension not supported");
			}

			gl.createVertexArray = extVAO.createVertexArrayOES.bind(extVAO);
			gl.bindVertexArray = extVAO.bindVertexArrayOES.bind(extVAO);
		}else if(gl instanceof WebGL2RenderingContext){
			gl.getExtension("EXT_color_buffer_float");
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

		let renderAreaWidth = this.renderer.getSize().width;
		let renderAreaHeight = this.renderer.getSize().height;

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
				screenPos.x = renderAreaWidth * (screenPos.x + 1) / 2;
				screenPos.y = renderAreaHeight * (1 - (screenPos.y + 1) / 2);


				// SCREEN SIZE
				if(viewer.scene.cameraMode == CameraMode.PERSPECTIVE) {
					let fov = Math.PI * viewer.scene.cameraP.fov / 180;
					let slope = Math.tan(fov / 2.0);
					let projFactor =  0.5 * renderAreaHeight / (slope * distance);
					screenSize = radius * projFactor;
				} else {
					screenSize = Utils.projectedRadiusOrtho(radius, viewer.scene.cameraO.projectionMatrix, renderAreaWidth, renderAreaHeight);
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

	update(delta, timestamp){

		if(Potree.measureTimings) performance.mark("update-start");

		// if(window.urlToggle === undefined){
		//	window.urlToggle = 0;
		// }else{
		//
		//	if(window.urlToggle > 1){
		//		{
		//
		//			let currentValue = Utils.getParameterByName("position");
		//			let strPosition = "["
		//				+ this.scene.view.position.x.toFixed(3) + ";"
		//				+ this.scene.view.position.y.toFixed(3) + ";"
		//				+ this.scene.view.position.z.toFixed(3) + "]";
		//			if(currentValue !== strPosition){
		//				Utils.setParameter("position", strPosition);
		//			}
		//
		//		}
		//
		//		{
		//			let currentValue = Utils.getParameterByName("target");
		//			let pivot = this.scene.view.getPivot();
		//			let strTarget = "["
		//				+ pivot.x.toFixed(3) + ";"
		//				+ pivot.y.toFixed(3) + ";"
		//				+ pivot.z.toFixed(3) + "]";
		//			if(currentValue !== strTarget){
		//				Utils.setParameter("target", strTarget);
		//			}
		//		}
		//
		//		window.urlToggle = 0;
		//	}
		//
		//	window.urlToggle += delta;
		//}
		
		{
			let u = Math.sin(0.0005 * timestamp) * 0.5 - 0.4;
			
			let x = Math.cos(u);
			let y = Math.sin(u);
			
			this.shadowTestCam.position.set(7 * x, 7 * y, 8.561);
			this.shadowTestCam.lookAt(new THREE.Vector3(0, 0, 0));
		}
		
		
		let scene = this.scene;
		let camera = scene.getActiveCamera();
		
		Potree.pointLoadLimit = Potree.pointBudget * 2;

		this.scene.directionalLight.position.copy(camera.position);
		this.scene.directionalLight.lookAt(new THREE.Vector3().addVectors(camera.position, camera.getWorldDirection(new THREE.Vector3())));

		for (let pointcloud of this.scene.pointclouds) {
			if (!pointcloud.material._defaultIntensityRangeChanged) {
				let root = pointcloud.pcoGeometry.root;
				if (root != null && root.loaded) {
					let attributes = pointcloud.pcoGeometry.root.geometry.attributes;
					if (attributes.intensity) {
						let array = attributes.intensity.array;

						// chose max value from the 0.75 percentile
						let ordered = [];
						for (let j = 0; j < array.length; j++) {
							ordered.push(array[j]);
						}
						ordered.sort();
						let capIndex = parseInt((ordered.length - 1) * 0.75);
						let cap = ordered[capIndex];

						if (cap <= 1) {
							pointcloud.material.intensityRange = [0, 1];
						} else if (cap <= 256) {
							pointcloud.material.intensityRange = [0, 255];
						} else {
							pointcloud.material.intensityRange = [0, cap];
						}

					}
					// pointcloud._intensityMaxEvaluated = true;
				}
			}

			if(this.defaultGPSTimeChanged === false){

				let root = pointcloud.pcoGeometry.root;
				if (root != null && root.loaded) {
					if(root.gpsTime){

						let gpsTime = root.gpsTime;
						let min = gpsTime.offset;
						let max = gpsTime.offset + gpsTime.range;
						let border = (max - min) * 0.1;

						this.setFilterGPSTimeExtent(min - border, max + border);
						//this.setFilterGPSTimeRange(0, 1000 * 1000 * 1000);
						this.setFilterGPSTimeRange(min, max);

						this.defaultGPSTimeChanged = true;
					}
				}

			}
			
			pointcloud.showBoundingBox = this.showBoundingBox;
			pointcloud.generateDEM = this.generateDEM;
			pointcloud.minimumNodePixelSize = this.minNodeSize;
		}

		// update classification visibility
		for (let pointcloud of this.scene.pointclouds) {
			let classification = pointcloud.material.classification;
			let somethingChanged = false;
			for (let key of Object.keys(this.classifications)) {
				let w = this.classifications[key].visible ? 1 : 0;

				if (classification[key]) {
					if (classification[key].w !== w) {
						classification[key].w = w;
						somethingChanged = true;
					}
				} else if (classification.DEFAULT) {
					classification[key] = classification.DEFAULT;
					somethingChanged = true;
				} else {
					classification[key] = new THREE.Vector4(0.3, 0.6, 0.6, 0.5);
					somethingChanged = true;
				}
			}

			if (somethingChanged) {
				pointcloud.material.recomputeClassification();
			}
		}

		for (let pointcloud of this.scene.pointclouds) {
			if(!pointcloud.visible){
				continue;
			}

			let material = pointcloud.material;

			material.uniforms.uFilterReturnNumberRange.value = this.filterReturnNumberRange;
			material.uniforms.uFilterNumberOfReturnsRange.value = this.filterNumberOfReturnsRange;
			material.uniforms.uFilterGPSTimeClipRange.value = this.filterGPSTimeRange;
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

			if(result.lowestSpacing !== Infinity){
				let near = result.lowestSpacing * 10.0;
				let far = -this.getBoundingBox().applyMatrix4(camera.matrixWorldInverse).min.z;

				far = Math.max(far * 1.5, 1000);
				near = Math.min(100.0, Math.max(0.01, near));
				far = Math.max(far, near + 1000);

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
		
		// Navigation mode changed?
		if (this.getControls(scene.view.navigationMode) !== this.controls) {
			if (this.controls) {
				this.controls.enabled = false;
				this.inputHandler.removeInputListener(this.controls);
			}

			this.controls = this.getControls(scene.view.navigationMode);
			this.controls.enabled = true;
			this.inputHandler.addInputListener(this.controls);
		}
		
		if (this.getControls(scene.view.navigationMode) === this.deviceControls) {
			this.controls.setScene(scene);
			this.controls.update(delta);

			this.scene.cameraP.position.copy(scene.view.position);
			this.scene.cameraO.position.copy(scene.view.position);
		} else if (this.controls !== null) {
			this.controls.setScene(scene);
			this.controls.update(delta);

			this.scene.cameraP.position.copy(scene.view.position);
			this.scene.cameraP.rotation.order = "ZXY";
			this.scene.cameraP.rotation.x = Math.PI / 2 + this.scene.view.pitch;
			this.scene.cameraP.rotation.z = this.scene.view.yaw;

			this.scene.cameraO.position.copy(scene.view.position);
			this.scene.cameraO.rotation.order = "ZXY";
			this.scene.cameraO.rotation.x = Math.PI / 2 + this.scene.view.pitch;
			this.scene.cameraO.rotation.z = this.scene.view.yaw;
		}
		
		camera.updateMatrix();
		camera.updateMatrixWorld();
		camera.matrixWorldInverse.getInverse(camera.matrixWorld);

		{
			if(this._previousCamera === undefined){
				this._previousCamera = this.scene.getActiveCamera().clone();
				this._previousCamera.rotation.copy(this.scene.getActiveCamera());
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
			this._previousCamera.rotation.copy(this.scene.getActiveCamera());

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
			
			let clipBoxes = boxes.map( box => {
				box.updateMatrixWorld();
				let boxInverse = new THREE.Matrix4().getInverse(box.matrixWorld);
				let boxPosition = box.getWorldPosition(new THREE.Vector3());
				return {box: box, inverse: boxInverse, position: boxPosition};
			});

			let clipPolygons = this.scene.polygonClipVolumes.filter(vol => vol.initialized);
			
			// set clip volumes in material
			for(let pointcloud of this.scene.pointclouds.filter(pc => pc.visible)){
				pointcloud.material.setClipBoxes(clipBoxes);
				pointcloud.material.setClipPolygons(clipPolygons, this.clippingTool.maxPolygonVertices);
				pointcloud.material.clipTask = this.clipTask;
				pointcloud.material.clipMethod = this.clipMethod;
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
	
	render(){
		if(Potree.measureTimings) performance.mark("render-start");

		{ // resize
			let width = this.scaleFactor * this.renderArea.clientWidth;
			let height = this.scaleFactor * this.renderArea.clientHeight;
			let pixelRatio = this.renderer.getPixelRatio();
			let aspect = width / height;

			this.scene.cameraP.aspect = aspect;
			this.scene.cameraP.updateProjectionMatrix();

			//let frustumScale = viewer.moveSpeed * 2.0;
			let frustumScale = this.scene.view.radius;
			this.scene.cameraO.left = -frustumScale;
			this.scene.cameraO.right = frustumScale;		
			this.scene.cameraO.top = frustumScale * 1 / aspect;
			this.scene.cameraO.bottom = -frustumScale * 1 / aspect;		
			this.scene.cameraO.updateProjectionMatrix();

			this.scene.cameraScreenSpace.top = 1/aspect;
			this.scene.cameraScreenSpace.bottom = -1/aspect;
			this.scene.cameraScreenSpace.updateProjectionMatrix();
			
			this.renderer.setSize(width, height);
		}

		try{


		if(this.useRep){
			if (!this.repRenderer) {
				this.repRenderer = new RepRenderer(this);
			}
			this.repRenderer.render(this.renderer);
		}else if(this.useHQ){
			if (!this.hqRenderer) {
				this.hqRenderer = new HQSplatRenderer(this);
			}
			this.hqRenderer.useEDL = this.useEDL;
			this.hqRenderer.render(this.renderer);
		}else{
			if (this.useEDL && Features.SHADER_EDL.isSupported()) {
				if (!this.edlRenderer) {
					this.edlRenderer = new EDLRenderer(this);
				}
				this.edlRenderer.render(this.renderer);
			} else {
				if (!this.potreeRenderer) {
					this.potreeRenderer = new PotreeRenderer(this);
				}
				this.potreeRenderer.render();
			}
		}

		//if(this.useRep){
		//	if (!this.repRenderer) {
		//		this.repRenderer = new RepRenderer(this);
		//	}
		//	this.repRenderer.render(this.renderer);
		//} else if (this.useHQ && Features.SHADER_SPLATS.isSupported()) {
		//	if (!this.hqRenderer) {
		//		this.hqRenderer = new HQSplatRenderer(this);
		//	}
		//	this.hqRenderer.render(this.renderer);
		//} else if (this.useEDL && Features.SHADER_EDL.isSupported()) {
		//	if (!this.edlRenderer) {
		//		this.edlRenderer = new EDLRenderer(this);
		//	}
		//	this.edlRenderer.render(this.renderer);
		//} else {
		//	if (!this.potreeRenderer) {
		//		this.potreeRenderer = new PotreeRenderer(this);
		//	}

		//	this.potreeRenderer.render();
		//}

		this.renderer.render(this.overlay, this.overlayCamera);

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
		requestAnimationFrame(this.loop.bind(this));

		let queryAll;
		if(Potree.measureTimings){
			performance.mark("loop-start");
		}

		this.update(this.clock.getDelta(), timestamp);

		this.render();

		if(Potree.measureTimings){
			performance.mark("loop-end");
			performance.measure("loop", "loop-start", "loop-end");
		}
		
		this.resolveTimings(timestamp);

		Potree.framenumber++;
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
