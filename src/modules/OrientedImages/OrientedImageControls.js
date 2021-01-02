
import * as THREE from "../../../libs/three.js/build/three.module.js";
import {EventDispatcher} from "../../EventDispatcher.js";

 
export class OrientedImageControls extends EventDispatcher{
	
	constructor(viewer){
		super();
		
		this.viewer = viewer;
		this.renderer = viewer.renderer;

		this.originalCam = viewer.scene.getActiveCamera();
		this.shearCam = viewer.scene.getActiveCamera().clone();
		this.shearCam.rotation.set(this.originalCam.rotation.toArray());
		this.shearCam.updateProjectionMatrix();
		this.shearCam.updateProjectionMatrix = () => {
			return this.shearCam.projectionMatrix;
		};

		this.image = null;

		this.fadeFactor = 20;
		this.fovDelta = 0;

		this.fovMin = 0.1;
		this.fovMax = 120;

		this.shear = [0, 0];

		// const style = ``;
		this.elUp =    $(`<input type="button" value="🡅" style="position: absolute; top: 10px; left: calc(50%); z-index: 1000" />`);
		this.elRight = $(`<input type="button" value="🡆" style="position: absolute; top: calc(50%); right: 10px; z-index: 1000" />`);
		this.elDown =  $(`<input type="button" value="🡇" style="position: absolute; bottom: 10px; left: calc(50%); z-index: 1000" />`);
		this.elLeft =  $(`<input type="button" value="🡄" style="position: absolute; top: calc(50%); left: 10px; z-index: 1000" />`);
		this.elExit = $(`<input type="button" value="Back to 3D view" style="position: absolute; bottom: 10px; right: 10px; z-index: 1000" />`);

		this.elExit.click( () => {
			this.release();
		});

		this.elUp.click(() => {
			const fovY = viewer.getFOV();
			const top = Math.tan(THREE.Math.degToRad(fovY / 2));
			this.shear[1] += 0.1 * top;
		});

		this.elRight.click(() => {
			const fovY = viewer.getFOV();
			const top = Math.tan(THREE.Math.degToRad(fovY / 2));
			this.shear[0] += 0.1 * top;
		});

		this.elDown.click(() => {
			const fovY = viewer.getFOV();
			const top = Math.tan(THREE.Math.degToRad(fovY / 2));
			this.shear[1] -= 0.1 * top;
		});

		this.elLeft.click(() => {
			const fovY = viewer.getFOV();
			const top = Math.tan(THREE.Math.degToRad(fovY / 2));
			this.shear[0] -= 0.1 * top;
		});

		this.scene = null;
		this.sceneControls = new THREE.Scene();

		let scroll = (e) => {
			this.fovDelta += -e.delta * 1.0;
		};

		this.addEventListener('mousewheel', scroll);
		//this.addEventListener("mousemove", onMove);
	}

	hasSomethingCaptured(){
		return this.image !== null;
	}

	capture(image){
		if(this.hasSomethingCaptured()){
			return;
		}

		this.image = image;

		this.originalFOV = this.viewer.getFOV();
		this.originalControls = this.viewer.getControls();

		this.viewer.setControls(this);
		this.viewer.scene.overrideCamera = this.shearCam;

		const elCanvas = this.viewer.renderer.domElement;
		const elRoot = $(elCanvas.parentElement);

		this.shear = [0, 0];


		elRoot.append(this.elUp);
		elRoot.append(this.elRight);
		elRoot.append(this.elDown);
		elRoot.append(this.elLeft);
		elRoot.append(this.elExit);
	}

	release(){
		this.image = null;

		this.viewer.scene.overrideCamera = null;

		this.elUp.detach();
		this.elRight.detach();
		this.elDown.detach();
		this.elLeft.detach();
		this.elExit.detach();

		this.viewer.setFOV(this.originalFOV);
		this.viewer.setControls(this.originalControls);
	}

	setScene (scene) {
		this.scene = scene;
	}

	update (delta) {
		// const view = this.scene.view;

		// let prevTotal = this.shearCam.projectionMatrix.elements.reduce( (a, i) => a + i, 0);

		//const progression = Math.min(1, this.fadeFactor * delta);
		//const attenuation = Math.max(0, 1 - this.fadeFactor * delta);
		const progression = 1;
		const attenuation = 0;

		const oldFov = this.viewer.getFOV();
		let fovProgression =  progression * this.fovDelta;
		let newFov = oldFov * ((1 + fovProgression / 10));

		newFov = Math.max(this.fovMin, newFov);
		newFov = Math.min(this.fovMax, newFov);

		let diff = newFov / oldFov;

		const mouse = this.viewer.inputHandler.mouse;
		const canvasSize = this.viewer.renderer.getSize(new THREE.Vector2());
		const uv = [
			(mouse.x / canvasSize.x),
			((canvasSize.y - mouse.y) / canvasSize.y)
		];

		const fovY = newFov;
		const aspect = canvasSize.x / canvasSize.y;
		const top = Math.tan(THREE.Math.degToRad(fovY / 2));
		const height = 2 * top;
		const width = aspect * height;

		const shearRangeX = [
			this.shear[0] - 0.5 * width,
			this.shear[0] + 0.5 * width,
		];

		const shearRangeY = [
			this.shear[1] - 0.5 * height,
			this.shear[1] + 0.5 * height,
		];

		const shx = (1 - uv[0]) * shearRangeX[0] + uv[0] * shearRangeX[1];
		const shy = (1 - uv[1]) * shearRangeY[0] + uv[1] * shearRangeY[1];

		const shu = (1 - diff);

		const newShear =  [
			(1 - shu) * this.shear[0] + shu * shx,
			(1 - shu) * this.shear[1] + shu * shy,
		];
		
		this.shear = newShear;
		this.viewer.setFOV(newFov);
		
		const {originalCam, shearCam} = this;

		originalCam.fov = newFov;
		originalCam.updateMatrixWorld()
		originalCam.updateProjectionMatrix();
		shearCam.copy(originalCam);
		shearCam.rotation.set(...originalCam.rotation.toArray());

		shearCam.updateMatrixWorld();
		shearCam.projectionMatrix.copy(originalCam.projectionMatrix);

		const [sx, sy] = this.shear;
		const mShear = new THREE.Matrix4().set(
			1, 0, sx, 0,
			0, 1, sy, 0,
			0, 0, 1, 0,
			0, 0, 0, 1,
		);

		const proj = shearCam.projectionMatrix;
		proj.multiply(mShear);
		shearCam.projectionMatrixInverse.copy(proj).invert();

		let total = shearCam.projectionMatrix.elements.reduce( (a, i) => a + i, 0);

		this.fovDelta *= attenuation;
	}
};
