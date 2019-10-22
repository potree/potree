
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

		this.fadeFactor = 20;
		this.fovDelta = 0;

		this.fovMin = 5;
		this.fovMax = 120;

		this.shear = [0, 0];

		const style = ``;
		this.elUp =    $(`<input type="button" value="🡅" style="position: absolute; top: 10px; left: calc(50%); z-index: 1000" />`);
		this.elRight = $(`<input type="button" value="🡆" style="position: absolute; top: calc(50%); right: 10px; z-index: 1000" />`);
		this.elDown =  $(`<input type="button" value="🡇" style="position: absolute; bottom: 10px; left: calc(50%); z-index: 1000" />`);
		this.elLeft =  $(`<input type="button" value="🡄" style="position: absolute; top: calc(50%); left: 10px; z-index: 1000" />`);

		this.elUp.click(() => {
			this.shear[1] += 0.1;
		});

		this.elRight.click(() => {
			this.shear[0] += 0.1;
		});

		this.elDown.click(() => {
			this.shear[1] -= 0.1;
		});

		this.elLeft.click(() => {
			this.shear[0] -= 0.1;
		});

		this.scene = null;
		this.sceneControls = new THREE.Scene();

		let scroll = (e) => {
			this.fovDelta += -e.delta * 1.0;
		};

		this.addEventListener('mousewheel', scroll);
	}

	hijackCamera(){
		this.viewer.scene.overrideCamera = this.shearCam;

		const elCanvas = this.viewer.renderer.domElement;
		const elRoot = $(elCanvas.parentElement);

		elRoot.append(this.elUp);
		elRoot.append(this.elRight);
		elRoot.append(this.elDown);
		elRoot.append(this.elLeft);


	}

	setScene (scene) {
		this.scene = scene;
	}

	update (delta) {
		const view = this.scene.view;

		const progression = Math.min(1, this.fadeFactor * delta);
		const attenuation = Math.max(0, 1 - this.fadeFactor * delta);

		let fov = this.viewer.getFOV();
		let fovProgression =  progression * this.fovDelta;
		fov = fov * ((1 + fovProgression / 10));

		fov = Math.max(this.fovMin, fov);
		fov = Math.min(this.fovMax, fov);

		this.viewer.setFOV(fov);

		// this.shear[0] += progression * this.fovDelta * 0.1;
		// this.shear[1] += progression * this.fovDelta * 0.1;

		const {originalCam, shearCam} = this;

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
		shearCam.projectionMatrixInverse.getInverse( proj );



		//console.log(this.fovDelta);

		this.fovDelta *= attenuation;
	}
};
