
import {EventDispatcher} from "../EventDispatcher.js";

export class VRControls extends EventDispatcher{

	constructor(viewer){
		super(viewer);

		this.viewer = viewer;

		viewer.addEventListener("vr_start", this.onStart.bind(this));
		viewer.addEventListener("vr_end", this.onEnd.bind(this));

		this.node = new THREE.Object3D();
		this.node.up.set(0, 0, 1);

		let xr = viewer.renderer.xr;
		this.cPrimary = xr.getController(0);
		this.cSecondary = xr.getController(1);
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

	computeMove(controller){

		if(!controller || !controller.inputSource || !controller.inputSource.gamepad){
			return null;
		}

		let pad = controller.inputSource.gamepad;

		let axes = pad.axes;
		let scale = this.node.scale.x;
		let amount = axes[1] * viewer.getMoveSpeed() / scale;

		let rotation = new THREE.Quaternion().setFromEuler(controller.rotation);
		let dir = new THREE.Vector3(0, 0, -1);
		dir.applyQuaternion(rotation);

		let move = dir.clone().multiplyScalar(amount);

		let p1 = controller.position.clone().applyMatrix4(this.node.matrixWorld);
		let m1 = move.clone().add(controller.position).applyMatrix4(this.node.matrixWorld);

		move = m1.clone().sub(p1);
		

		return move;
	}

	setScene(scene){
		this.scene = scene;
	}

	getCamera(){
		let camera = new THREE.PerspectiveCamera();
		camera.near = 0.01;
		camera.far = 10000;
		camera.up.set(0, 0, 1);
		camera.lookAt(new THREE.Vector3(0, -1, 0));
		camera.updateMatrix();
		camera.updateMatrixWorld();

		let scale = this.viewer.getMoveSpeed();
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
		let {renderer} = this.viewer;

		let move = this.computeMove(this.cPrimary);

		if(move){
			move.multiplyScalar(-delta);

			this.node.position.add(move);
		}

		let scale = this.node.scale.x;

		let camVR = this.viewer.renderer.xr.cameraVR;
		
		let vrPos = camVR.getWorldPosition(new THREE.Vector3());
		let vrDir = camVR.getWorldDirection(new THREE.Vector3());
		let vrTarget = vrPos.clone().add(vrDir.multiplyScalar(scale));

		this.viewer.scene.view.setView(vrPos, vrTarget);

	}
};