
// see http://john-chapman-graphics.blogspot.co.at/2013/01/ssao-tutorial.html



Potree.BlurMaterial = function(parameters){
	THREE.Material.call( this );

	parameters = parameters || {};
	
	var uniforms = {
		near: 			{ type: "f", value: 0 },
		far: 			{ type: "f", value: 0 },
		screenWidth: 	{ type: "f", value: 0 },
		screenHeight: 	{ type: "f", value: 0 },
		map: 			{ type: "t", value: null }
	};
	
	this.setValues({
		uniforms: uniforms,
		vertexShader: Potree.Shaders["blur.vs"],
		fragmentShader: Potree.Shaders["blur.fs"],
	});
	
};


Potree.BlurMaterial.prototype = new THREE.ShaderMaterial();









