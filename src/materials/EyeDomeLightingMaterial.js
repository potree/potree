
// see http://john-chapman-graphics.blogspot.co.at/2013/01/ssao-tutorial.html



Potree.EyeDomeLightingMaterial = function(parameters){
	THREE.Material.call( this );

	parameters = parameters || {};
	
	var kernelSize = 16;
	var kernel = Potree.EyeDomeLightingMaterial.generateKernel(kernelSize);
	var randomMap = Potree.EyeDomeLightingMaterial.generateRandomTexture();
	
	var neighbours = new Float32Array(8*2);
	for(var c = 0; c < 8; c++){
		neighbours[2*c+0] = Math.cos(c * Math.PI / 4);
		neighbours[2*c+1] = Math.sin(c * Math.PI / 4);
	}
	
	var lightDir = new THREE.Vector3(0.0, 0.0, 1.0).normalize();
	
	var uniforms = {
		screenWidth: 	{ type: "f", 	value: 0 },
		screenHeight: 	{ type: "f", 	value: 0 },
		near: 			{ type: "f", 	value: 0 },
		far: 			{ type: "f", 	value: 0 },
		pixScale: 		{ type: "f", 	value: 1.0 },
		expScale: 		{ type: "f", 	value: 100.0 },
		zoom: 			{ type: "f", 	value: 3.0 },
		lightDir:		{ type: "v3",	value: lightDir },
		neighbours:		{ type: "2fv", 	value: neighbours },
		depthMap: 		{ type: "t", 	value: null },
		colorMap: 		{ type: "t", 	value: null }
	};
	
	this.setValues({
		uniforms: uniforms,
		vertexShader: Potree.Shaders["edl.vs"],
		fragmentShader: Potree.Shaders["edl.fs"],
	});
	
};


Potree.EyeDomeLightingMaterial.prototype = new THREE.ShaderMaterial();

Potree.EyeDomeLightingMaterial.generateRandomTexture = function(kernelSize){
	var width = 4;
	var height = 4;
	
	var map = THREE.ImageUtils.generateDataTexture( width, height, new THREE.Color() );
	map.magFilter = THREE.NearestFilter;
	var data = map.image.data;
	
	for(var x = 0; x < width; x++){
		for(var y = 0; y < height; y++){
			var value = Math.random();
			var i = x + width * y;
			
			data[3*i+0] = 255 * value;
			data[3*i+1] = 255 * value;
			data[3*i+2] = 255 * value;
			
			//value = 255 * (x / 3);
			//data[3*i+0] = value;
			//data[3*i+1] = value;
			//data[3*i+2] = value;
			
			
		}
	}
	
	return map;
};


Potree.EyeDomeLightingMaterial.generateKernel = function(kernelSize){
	var kernel = new Float32Array(3*kernelSize);
	
	for(var i = 0; i < kernelSize; i++){
	
		var x = Math.random() * 2 - 1;
		var y = Math.random() * 2 - 1;
		var z = Math.random();
		var length = Math.sqrt( x*x + y*y + z*z );
		var scale = Math.random();
		scale = scale * scale;
		
		x = scale * x / length;
		y = scale * y / length;
		z = scale * z / length;
		
		kernel[3*i + 0] = x;
		kernel[3*i + 1] = y;
		kernel[3*i + 2] = z;
	}

		return kernel;
};















