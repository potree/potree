const vs = require('./shaders/blur.vs');
const fs = require('./shaders/blur.fs');
// see http://john-chapman-graphics.blogspot.co.at/2013/01/ssao-tutorial.html

const BlurMaterial = function (parameters) {
	THREE.Material.call(this);

	parameters = parameters || {};

	var uniforms = {
		near: { type: 'f', value: 0 },
		far: { type: 'f', value: 0 },
		screenWidth: { type: 'f', value: 0 },
		screenHeight: { type: 'f', value: 0 },
		map: { type: 't', value: null }
	};

	this.setValues({
		uniforms: uniforms,
		vertexShader: vs(),
		fragmentShader: fs()
	});
};

BlurMaterial.prototype = new THREE.ShaderMaterial();
module.exports = BlurMaterial;
