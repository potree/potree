
import * as THREE from "../../libs/three.js/build/three.module.js";
import {EventDispatcher} from "../EventDispatcher.js";
import { XRControllerModelFactory } from '../../libs/three.js/webxr/XRControllerModelFactory.js';
import {Line2} from "../../libs/three.js/lines/Line2.js";
import {LineGeometry} from "../../libs/three.js/lines/LineGeometry.js";
import {LineMaterial} from "../../libs/three.js/lines/LineMaterial.js";

let fakeCam = new THREE.PerspectiveCamera();

function toScene(vec, ref){
	let node = ref.clone();
	node.updateMatrix();
	node.updateMatrixWorld();

	let result = vec.clone().applyMatrix4(node.matrix);
	result.z -= 0.8 * node.scale.x;

	return result;
};

function computeMove(vrControls, controller){

	if(!controller || !controller.inputSource || !controller.inputSource.gamepad){
		return null;
	}

	let pad = controller.inputSource.gamepad;

	let axes = pad.axes;
	// [0,1] are for touchpad, [2,3] for thumbsticks?
	let y = 0;
	if(axes.length === 2){
		y = axes[1];
	}else if(axes.length === 4){
		y = axes[3];
	}

	y = Math.sign(y) * (2 * y) ** 2;

	let maxSize = 0;
	for(let pc of viewer.scene.pointclouds){
		let size = pc.boundingBox.min.distanceTo(pc.boundingBox.max);
		maxSize = Math.max(maxSize, size);
	}
	let multiplicator = Math.pow(maxSize, 0.5) / 2;

	let scale = vrControls.node.scale.x;
	let moveSpeed = viewer.getMoveSpeed();
	let amount = multiplicator * y * (moveSpeed ** 0.5) / scale;


	let rotation = new THREE.Quaternion().setFromEuler(controller.rotation);
	let dir = new THREE.Vector3(0, 0, -1);
	dir.applyQuaternion(rotation);

	let move = dir.clone().multiplyScalar(amount);

	let p1 = vrControls.toScene(controller.position);
	let p2 = vrControls.toScene(controller.position.clone().add(move));

	move = p2.clone().sub(p1);
	
	return move;
};


class FlyMode{

	constructor(vrControls){
		this.moveFactor = 1;
		this.dbgLabel = null;
	}

	start(vrControls){
		if(!this.dbgLabel){
			this.dbgLabel = new Potree.TextSprite("abc");
			this.dbgLabel.name = "debug label";
			vrControls.viewer.sceneVR.add(this.dbgLabel);
			this.dbgLabel.visible = false;
		}
	}
	
	end(){

	}

	update(vrControls, delta){

		let primary = vrControls.cPrimary;
		let secondary = vrControls.cSecondary;

		let move1 = computeMove(vrControls, primary);
		let move2 = computeMove(vrControls, secondary);


		if(!move1){
			move1 = new THREE.Vector3();
		}

		if(!move2){
			move2 = new THREE.Vector3();
		}

		let move = move1.clone().add(move2);

		move.multiplyScalar(-delta * this.moveFactor);
		vrControls.node.position.add(move);
		

		let scale = vrControls.node.scale.x;

		let camVR = vrControls.viewer.renderer.xr.getCamera(fakeCam);
		
		let vrPos = camVR.getWorldPosition(new THREE.Vector3());
		let vrDir = camVR.getWorldDirection(new THREE.Vector3());
		let vrTarget = vrPos.clone().add(vrDir.multiplyScalar(scale));

		let scenePos = toScene(vrPos, vrControls.node);
		let sceneDir = toScene(vrPos.clone().add(vrDir), vrControls.node).sub(scenePos);
		sceneDir.normalize().multiplyScalar(scale);
		let sceneTarget = scenePos.clone().add(sceneDir);

		vrControls.viewer.scene.view.setView(scenePos, sceneTarget);

		if(Potree.debug.message){
			this.dbgLabel.visible = true;
			this.dbgLabel.setText(Potree.debug.message);
			this.dbgLabel.scale.set(0.1, 0.1, 0.1);
			this.dbgLabel.position.copy(primary.position);
		}
	}
};

class TranslationMode{

	constructor(){
		this.controller = null;
		this.startPos = null;
		this.debugLine = null;
	}

	start(vrControls){
		this.controller = vrControls.triggered.values().next().value;
		this.startPos = vrControls.node.position.clone();
	}
	
	end(vrControls){

	}

	update(vrControls, delta){

		let start = this.controller.start.position;
		let end = this.controller.position;

		start = vrControls.toScene(start);
		end = vrControls.toScene(end);

		let diff = end.clone().sub(start);
		diff.set(-diff.x, -diff.y, -diff.z);

		let pos = new THREE.Vector3().addVectors(this.startPos, diff);

		vrControls.node.position.copy(pos);
	}

};

class RotScaleMode{

	constructor(){
		this.line = null;
		this.startState = null;
	}

	start(vrControls){
		if(!this.line){
			this.line = Potree.Utils.debugLine(
				vrControls.viewer.sceneVR, 
				new THREE.Vector3(0, 0, 0),
				new THREE.Vector3(0, 0, 0),
				0xffff00,
			);

			this.dbgLabel = new Potree.TextSprite("abc");
			this.dbgLabel.scale.set(0.1, 0.1, 0.1);
			vrControls.viewer.sceneVR.add(this.dbgLabel);
		}

		this.line.node.visible = true;

		this.startState = vrControls.node.clone();
	}

	end(vrControls){
		this.line.node.visible = false;
		this.dbgLabel.visible = false;
	}

	update(vrControls, delta){

		let start_c1 = vrControls.cPrimary.start.position.clone();
		let start_c2 = vrControls.cSecondary.start.position.clone();
		let start_center = start_c1.clone().add(start_c2).multiplyScalar(0.5);
		let start_c1_c2 = start_c2.clone().sub(start_c1);
		let end_c1 = vrControls.cPrimary.position.clone();
		let end_c2 = vrControls.cSecondary.position.clone();
		let end_center = end_c1.clone().add(end_c2).multiplyScalar(0.5);
		let end_c1_c2 = end_c2.clone().sub(end_c1);

		let d1 = start_c1_c2.length();
		let d2 = end_c1_c2.length();

		let angleStart = new THREE.Vector2(start_c1_c2.x, start_c1_c2.z).angle();
		let angleEnd = new THREE.Vector2(end_c1_c2.x, end_c1_c2.z).angle();
		let angleDiff = angleEnd - angleStart;
		
		let scale = d2 / d1;

		let node = this.startState.clone();
		node.updateMatrix();
		node.matrixAutoUpdate = false;

		let mToOrigin = new THREE.Matrix4().makeTranslation(...toScene(start_center, this.startState).multiplyScalar(-1).toArray());
		let mToStart = new THREE.Matrix4().makeTranslation(...toScene(start_center, this.startState).toArray());
		let mRotate = new THREE.Matrix4().makeRotationZ(angleDiff);
		let mScale = new THREE.Matrix4().makeScale(1 / scale, 1 / scale, 1 / scale);

		node.applyMatrix4(mToOrigin);
		node.applyMatrix4(mRotate);
		node.applyMatrix4(mScale);
		node.applyMatrix4(mToStart);

		let oldScenePos = toScene(start_center, this.startState);
		let newScenePos = toScene(end_center, node);
		let toNew = oldScenePos.clone().sub(newScenePos);
		let mToNew = new THREE.Matrix4().makeTranslation(...toNew.toArray());
		node.applyMatrix4(mToNew);

		node.matrix.decompose(node.position, node.quaternion, node.scale );

		vrControls.node.position.copy(node.position);
		vrControls.node.quaternion.copy(node.quaternion);
		vrControls.node.scale.copy(node.scale);
		vrControls.node.updateMatrix();

		{
			let scale = vrControls.node.scale.x;
			let camVR = vrControls.viewer.renderer.xr.getCamera(fakeCam);
			
			let vrPos = camVR.getWorldPosition(new THREE.Vector3());
			let vrDir = camVR.getWorldDirection(new THREE.Vector3());
			let vrTarget = vrPos.clone().add(vrDir.multiplyScalar(scale));

			let scenePos = toScene(vrPos, this.startState);
			let sceneDir = toScene(vrPos.clone().add(vrDir), this.startState).sub(scenePos);
			sceneDir.normalize().multiplyScalar(scale);
			let sceneTarget = scenePos.clone().add(sceneDir);

			vrControls.viewer.scene.view.setView(scenePos, sceneTarget);
			vrControls.viewer.setMoveSpeed(scale);
		}

		{ // update "GUI"
			this.line.set(end_c1, end_c2);

			let scale = vrControls.node.scale.x;
			this.dbgLabel.visible = true;
			this.dbgLabel.position.copy(end_center);
			this.dbgLabel.setText(`scale: 1 : ${scale.toFixed(2)}`);
			this.dbgLabel.scale.set(0.05, 0.05, 0.05);
		}

	}

};


export class VRControls extends EventDispatcher{

	constructor(viewer){
		super(viewer);

		this.viewer = viewer;

		viewer.addEventListener("vr_start", this.onStart.bind(this));
		viewer.addEventListener("vr_end", this.onEnd.bind(this));

		this.node = new THREE.Object3D();
		this.node.up.set(0, 0, 1);
		this.triggered = new Set();

		let xr = viewer.renderer.xr;

		{ // lights
			
			const light = new THREE.PointLight( 0xffffff, 5, 0, 1 );
			light.position.set(0, 2, 0);
			this.viewer.sceneVR.add(light)
		}

		this.menu = null;

		const controllerModelFactory = new XRControllerModelFactory();

		let sg = new THREE.SphereGeometry(1, 32, 32);
		let sm = new THREE.MeshNormalMaterial();

		{ // setup primary controller
			let controller = xr.getController(0);

			let grip = xr.getControllerGrip(0);
			grip.name = "grip(0)";

			// ADD CONTROLLERMODEL
			grip.add( controllerModelFactory.createControllerModel( grip ) );
			this.viewer.sceneVR.add(grip);

			// ADD SPHERE
			let sphere = new THREE.Mesh(sg, sm);
			sphere.scale.set(0.005, 0.005, 0.005);

			controller.add(sphere);
			controller.visible = true;
			this.viewer.sceneVR.add(controller);

			{ // ADD LINE
				
				let lineGeometry = new LineGeometry();

				lineGeometry.setPositions([
					0, 0, -0.15,
					0, 0, 0.05,
				]);

				let lineMaterial = new LineMaterial({ 
					color: 0xff0000, 
					linewidth: 2, 
					resolution:  new THREE.Vector2(1000, 1000),
				});

				const line = new Line2(lineGeometry, lineMaterial);
				
				controller.add(line);
			}


			controller.addEventListener( 'connected', function ( event ) {
				const xrInputSource = event.data;
				controller.inputSource = xrInputSource;
				// initInfo(controller);
			});

			controller.addEventListener( 'selectstart', () => {this.onTriggerStart(controller)});
			controller.addEventListener( 'selectend', () => {this.onTriggerEnd(controller)});

			this.cPrimary =  controller;

		}

		{ // setup secondary controller
			let controller = xr.getController(1);

			let grip = xr.getControllerGrip(1);

			// ADD CONTROLLER MODEL
			let model = controllerModelFactory.createControllerModel( grip );
			grip.add(model);
			this.viewer.sceneVR.add( grip );

			// ADD SPHERE
			let sphere = new THREE.Mesh(sg, sm);
			sphere.scale.set(0.005, 0.005, 0.005);
			controller.add(sphere);
			controller.visible = true;
			this.viewer.sceneVR.add(controller);

			{ // ADD LINE
				
				let lineGeometry = new LineGeometry();

				lineGeometry.setPositions([
					0, 0, -0.15,
					0, 0, 0.05,
				]);

				let lineMaterial = new LineMaterial({ 
					color: 0xff0000, 
					linewidth: 2, 
					resolution:  new THREE.Vector2(1000, 1000),
				});

				const line = new Line2(lineGeometry, lineMaterial);
				
				controller.add(line);
			}

			controller.addEventListener( 'connected', (event) => {
				const xrInputSource = event.data;
				controller.inputSource = xrInputSource;
				this.initMenu(controller);
			});

			controller.addEventListener( 'selectstart', () => {this.onTriggerStart(controller)});
			controller.addEventListener( 'selectend', () => {this.onTriggerEnd(controller)});

			this.cSecondary =  controller;
		}

		this.mode_fly = new FlyMode();
		this.mode_translate = new TranslationMode();
		this.mode_rotScale = new RotScaleMode();
		this.setMode(this.mode_fly);
	}

	createSlider(label, min, max){

		let sg = new THREE.SphereGeometry(1, 8, 8);
		let cg = new THREE.CylinderGeometry(1, 1, 1, 8);
		let matHandle = new THREE.MeshBasicMaterial({color: 0xff0000});
		let matScale = new THREE.MeshBasicMaterial({color: 0xff4444});
		let matValue = new THREE.MeshNormalMaterial();

		let node = new THREE.Object3D("slider");
		let nLabel = new Potree.TextSprite(`${label}: 0`);
		let nMax = new THREE.Mesh(sg, matHandle);
		let nMin = new THREE.Mesh(sg, matHandle);
		let nValue = new THREE.Mesh(sg, matValue);
		let nScale = new THREE.Mesh(cg, matScale);

		nLabel.scale.set(0.2, 0.2, 0.2);
		nLabel.position.set(0, 0.35, 0);

		nMax.scale.set(0.02, 0.02, 0.02);
		nMax.position.set(0, 0.25, 0);

		nMin.scale.set(0.02, 0.02, 0.02);
		nMin.position.set(0, -0.25, 0);

		nValue.scale.set(0.02, 0.02, 0.02);
		nValue.position.set(0, 0, 0);

		nScale.scale.set(0.005, 0.5, 0.005);

		node.add(nLabel);
		node.add(nMax);
		node.add(nMin);
		node.add(nValue);
		node.add(nScale);

		return node;
	}

	createInfo(){ 

		let texture = new THREE.TextureLoader().load(`${Potree.resourcePath}/images/vr_controller_help.jpg`);
		let plane = new THREE.PlaneBufferGeometry(1, 1, 1, 1);
		let infoMaterial = new THREE.MeshBasicMaterial({map: texture});
		let infoNode = new THREE.Mesh(plane, infoMaterial);

		return infoNode;
	}

	initMenu(controller){

		if(this.menu){
			return;
		}

		let node = new THREE.Object3D("vr menu");

		// let nSlider = this.createSlider("speed", 0, 1);
		// let nInfo = this.createInfo();

		// // node.add(nSlider);
		// node.add(nInfo);

		// {
		// 	node.rotation.set(-1.5, 0, 0)
		// 	node.scale.set(0.3, 0.3, 0.3);
		// 	node.position.set(-0.2, -0.002, -0.1)

		// 	// nInfo.position.set(0.5, 0, 0);
		// 	nInfo.scale.set(0.8, 0.6, 0);

		// 	// controller.add(node);
		// }

		// node.position.set(-0.3, 1.2, 0.2);
		// node.scale.set(0.3, 0.2, 0.3);
		// node.lookAt(new THREE.Vector3(0, 1.5, 0.1));

		// this.viewer.sceneVR.add(node);

		this.menu = node;

		// window.vrSlider = nSlider;
		window.vrMenu = node;

	}


	toScene(vec){
		let camVR = this.getCamera();

		let mat = camVR.matrixWorld;
		let result = vec.clone().applyMatrix4(mat);

		return result;
	}

	toVR(vec){
		let camVR = this.getCamera();

		let mat = camVR.matrixWorld.clone();
		mat.invert();
		let result = vec.clone().applyMatrix4(mat);

		return result;
	}

	setMode(mode){

		if(this.mode === mode){
			return;
		}

		if(this.mode){
			this.mode.end(this);
		}

		for(let controller of [this.cPrimary, this.cSecondary]){

			let start = {
				position: controller.position.clone(),
				rotation: controller.rotation.clone(),
			};

			controller.start = start;
		}
		
		this.mode = mode;
		this.mode.start(this);
	}

	onTriggerStart(controller){
		this.triggered.add(controller);

		if(this.triggered.size === 0){
			this.setMode(this.mode_fly);
		}else if(this.triggered.size === 1){
			this.setMode(this.mode_translate);
		}else if(this.triggered.size === 2){
			this.setMode(this.mode_rotScale);
		}
	}

	onTriggerEnd(controller){
		this.triggered.delete(controller);

		if(this.triggered.size === 0){
			this.setMode(this.mode_fly);
		}else if(this.triggered.size === 1){
			this.setMode(this.mode_translate);
		}else if(this.triggered.size === 2){
			this.setMode(this.mode_rotScale);
		}
	}

	onStart(){

		let position = this.viewer.scene.view.position.clone();
		let direction = this.viewer.scene.view.direction;
		direction.multiplyScalar(-1);

		let target = position.clone().add(direction);
		target.z = position.z;

		let scale = this.viewer.getMoveSpeed();

		this.node.position.copy(position);
		this.node.lookAt(target);
		this.node.scale.set(scale, scale, scale);
		this.node.updateMatrix();
		this.node.updateMatrixWorld();
	}

	onEnd(){
		
	}


	setScene(scene){
		this.scene = scene;
	}

	getCamera(){
		let reference = this.viewer.scene.getActiveCamera();
		let camera = new THREE.PerspectiveCamera();

		// let scale = this.node.scale.x;
		let scale = this.viewer.getMoveSpeed();
		//camera.near = 0.01 / scale;
		camera.near = 0.1;
		camera.far = 1000;
		// camera.near = reference.near / scale;
		// camera.far = reference.far / scale;
		camera.up.set(0, 0, 1);
		camera.lookAt(new THREE.Vector3(0, -1, 0));
		camera.updateMatrix();
		camera.updateMatrixWorld();

		camera.position.copy(this.node.position);
		camera.rotation.copy(this.node.rotation);
		camera.scale.set(scale, scale, scale);
		camera.updateMatrix();
		camera.updateMatrixWorld();
		camera.matrixAutoUpdate = false;
		camera.parent = camera;

		return camera;
	}

	update(delta){

		

		// if(this.mode === this.mode_fly){
		// 	let ray = new THREE.Ray(origin, direction);
			
		// 	for(let object of this.selectables){

		// 		if(object.intersectsRay(ray)){
		// 			object.onHit(ray);
		// 		}

		// 	}

		// }

		this.mode.update(this, delta);

		

	}
};