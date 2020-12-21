
import {EventDispatcher} from "../EventDispatcher.js";


function computeMove(vrControls, controller){

	if(!controller || !controller.inputSource || !controller.inputSource.gamepad){
		return null;
	}

	let pad = controller.inputSource.gamepad;

	let axes = pad.axes;
	let scale = vrControls.node.scale.x;
	let amount = axes[1] * viewer.getMoveSpeed() / scale;

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

	constructor(){
		this.moveFactor = 1;
	}

	start(){

	}
	
	end(){

	}

	update(vrControls, delta){

		let primary = vrControls.cPrimary;
		let secondary = vrControls.cSecondary;

		if(secondary && secondary.inputSource && secondary.inputSource.gamepad){
			let pad = secondary.inputSource.gamepad;
			let axes = pad.axes;

			let sign = Math.abs(axes[1]) > 0.5 ? -Math.sign(axes[1]) : 0;

			if(sign > 0){
				this.moveFactor *= 1.01;
			}else if(sign < 0){
				this.moveFactor *= 0.99
			}

		}

		let move =  computeMove(vrControls, primary);

		if(move){
			move.multiplyScalar(-delta * this.moveFactor);

			vrControls.node.position.add(move);
		}

		let scale = vrControls.node.scale.x;

		let camVR = vrControls.viewer.renderer.xr.cameraVR;
		
		let vrPos = camVR.getWorldPosition(new THREE.Vector3());
		let vrDir = camVR.getWorldDirection(new THREE.Vector3());
		let vrTarget = vrPos.clone().add(vrDir.multiplyScalar(scale));

		vrControls.viewer.scene.view.setView(vrPos, vrTarget);
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
		}

		this.line.node.visible = true;

		this.startState = vrControls.node.clone();
	}

	end(vrControls){
		this.line.node.visible = false;
	}

	update(vrControls, delta){

		let start_c1 = vrControls.toScene(vrControls.cPrimary.start.position.clone());
		let start_c2 = vrControls.toScene(vrControls.cSecondary.start.position.clone());
		let start_center = start_c1.clone().add(start_c2).multiplyScalar(0.5);
		let start_c1_c2 = start_c2.clone().sub(start_c1);
		let end_c1 = vrControls.toScene(vrControls.cPrimary.position.clone());
		let end_c2 = vrControls.toScene(vrControls.cSecondary.position.clone());
		let end_center = end_c1.clone().add(end_c2).multiplyScalar(0.5);
		let end_c1_c2 = end_c2.clone().sub(end_c1);

		let d1 = start_c1.distanceTo(start_c2);
		let d2 = end_c1.distanceTo(end_c2);

		let angleStart = new THREE.Vector2(start_c1_c2.x, start_c1_c2.y).angle();
		let angleEnd = new THREE.Vector2(end_c1_c2.x, end_c1_c2.y).angle();
		let angleDiff = angleEnd - angleStart;
		
		let scale = d1 / d2;

		let mToOrigin = new THREE.Matrix4().makeTranslation(-start_center.x, -start_center.y, -start_center.z);
		let mRotate = new THREE.Matrix4().makeRotationZ(-angleDiff);
		let mToStart = new THREE.Matrix4().makeTranslation(start_center.x, start_center.y, start_center.z);
		let mScale = new THREE.Matrix4().makeScale(scale, scale, scale);

		let node = this.startState.clone();
		node.updateMatrix();
		node.matrixAutoUpdate = false;

		let diff = start_center.clone().sub(end_center);
		let mTranslate = new THREE.Matrix4().makeTranslation(diff.x, diff.y, diff.z);
		
		node.applyMatrix4(mToOrigin);
		node.applyMatrix4(mRotate);
		node.applyMatrix4(mScale);
		node.applyMatrix4(mToStart);
		node.applyMatrix4(mTranslate);

		node.matrix.decompose( node.position, node.quaternion, node.scale );

		console.log(node.scale);

		vrControls.node.position.copy(node.position);
		vrControls.node.quaternion.copy(node.quaternion);
		vrControls.node.scale.copy(node.scale);
		vrControls.node.updateMatrix();


		{
			let scale = vrControls.node.scale.x;
			let camVR = vrControls.viewer.renderer.xr.cameraVR;
			
			let vrPos = camVR.getWorldPosition(new THREE.Vector3());
			let vrDir = camVR.getWorldDirection(new THREE.Vector3());
			let vrTarget = vrPos.clone().add(vrDir.multiplyScalar(scale));

			vrControls.viewer.scene.view.setView(vrPos, vrTarget);
			vrControls.viewer.setMoveSpeed(scale);
		}

		this.line.set(vrControls.toVR(end_c1), vrControls.toVR(end_c2));

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


		this.dbgSphere1 = Potree.Utils.debugSphere(
			viewer.sceneVR, new THREE.Vector3(0, 0, 0), 0.02, 0x00ff00);
		this.dbgSphere2 = Potree.Utils.debugSphere(
			viewer.scene.scene, new THREE.Vector3(0, 0, 0), 0.3, 0xff0000);
		this.dbgSphere1.material.side = THREE.BackSide;
		this.dbgSphere2.material.side = THREE.BackSide;

		let xr = viewer.renderer.xr;

		{ // setup primary controller
			let controller = xr.getController(0);

			let sg = new THREE.SphereGeometry(0.02, 32, 32);
			let sm = new THREE.MeshNormalMaterial();
			let sphere = new THREE.Mesh(sg, sm);

			controller.add(sphere);
			controller.visible = true;
			
			this.viewer.sceneVR.add(controller);

			controller.addEventListener( 'connected', function ( event ) {
				const xrInputSource = event.data;
				controller.inputSource = xrInputSource;
			});

			controller.addEventListener( 'selectstart', () => {this.onTriggerStart(controller)});
			controller.addEventListener( 'selectend', () => {this.onTriggerEnd(controller)});

			this.cPrimary =  controller;

		}

		{ // setup secondary controller
			let controller = xr.getController(1);

			let sg = new THREE.SphereGeometry(0.02, 32, 32);
			let sm = new THREE.MeshBasicMaterial({color: 0xff0000});
			let sphere = new THREE.Mesh(sg, sm);

			controller.add(sphere);
			controller.visible = true;
			
			this.viewer.sceneVR.add(controller);

			controller.addEventListener( 'connected', function ( event ) {
				const xrInputSource = event.data;
				controller.inputSource = xrInputSource;
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
		let camera = new THREE.PerspectiveCamera();

		let reference = this.viewer.scene.getActiveCamera();

		// let scale = this.node.scale.x;
		let scale = this.viewer.getMoveSpeed();
		camera.near = 0.1;
		camera.far = 10000;
		// camera.near = reference.near / scale;
		// camera.far = reference.far / scale;
		camera.up.set(0, 0, 1);
		camera.lookAt(new THREE.Vector3(0, -1, 0));
		camera.updateMatrix();
		camera.updateMatrixWorld();

		camera.position.copy(this.node.position);
		camera.position.z -= 0.6 * scale;
		camera.rotation.copy(this.node.rotation);
		camera.scale.set(scale, scale, scale);
		camera.updateMatrix();
		camera.updateMatrixWorld();
		camera.matrixAutoUpdate = false;
		camera.parent = camera;

		return camera;
	}



	update(delta){

		this.mode.update(this, delta);

	}
};