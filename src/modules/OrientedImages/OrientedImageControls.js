
import {MOUSE} from "../defines.js";
import {Utils} from "../utils.js";
import {EventDispatcher} from "../EventDispatcher.js";

 
export class OrientedImageControls extends EventDispatcher{
	
	constructor(viewer){
		super();
		
		this.viewer = viewer;
		this.renderer = viewer.renderer;

		this.fadeFactor = 20;

		this.scene = null;
		this.sceneControls = new THREE.Scene();

		let scroll = (e) => {
			this.fovDelta += -e.delta;
		};

		this.addEventListener('mousewheel', scroll);
	}

	setScene (scene) {
		this.scene = scene;
	}

	update (delta) {
		const view = this.scene.view;

		const progression = Math.min(1, this.fadeFactor * delta);
		const attenuation = Math.max(0, 1 - this.fadeFactor * delta);

		console.log(this.fovDelta);

		this.fovDelta *= this.attenuation;
	}
};
