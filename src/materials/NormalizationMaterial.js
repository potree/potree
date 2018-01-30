
Potree.NormalizationMaterial = class NormalizationMaterial extends THREE.ShaderMaterial{

	constructor(parameters = {}){
		super();

		let uniforms = {
			uDepthMap:		{ type: 't', value: null },
			uWeightMap:		{ type: 't', value: null },
		};

		this.setValues({
			uniforms: uniforms,
			vertexShader: this.getDefines() + Potree.Shaders['normalize.vs'],
			fragmentShader: this.getDefines() + Potree.Shaders['normalize.fs'],
		});
	}

	getDefines() {
		let defines = '';

		return defines;
	}

	updateShaderSource() {

		let vs = this.getDefines() + Potree.Shaders['normalize.vs'];
		let fs = this.getDefines() + Potree.Shaders['normalize.fs'];

		this.setValues({
			vertexShader: vs,
			fragmentShader: fs
		});

		this.needsUpdate = true;
	}
};

