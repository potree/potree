
import {Shaders} from "../../build/shaders/shaders.js";

export class NormalizationMaterial extends THREE.RawShaderMaterial{

	constructor(parameters = {}){
		super();

		let uniforms = {
			uDepthMap:		{ type: 't', value: null },
			uWeightMap:		{ type: 't', value: null },
		};

		this.setValues({
			uniforms: uniforms,
			vertexShader: this.getDefines() + Shaders['normalize.vs'],
			fragmentShader: this.getDefines() + Shaders['normalize.fs'],
		});
	}

	getDefines() {
		let defines = '';

		return defines;
	}

	updateShaderSource() {

		let vs = this.getDefines() + Shaders['normalize.vs'];
		let fs = this.getDefines() + Shaders['normalize.fs'];

		this.setValues({
			vertexShader: vs,
			fragmentShader: fs
		});

		this.needsUpdate = true;
	}

}

