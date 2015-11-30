
//
// Algorithm by Christian Boucheny
// shader code taken and adapted from CloudCompare
//
// see
// https://github.com/cloudcompare/trunk/tree/master/plugins/qEDL/shaders/EDL
// http://www.kitware.com/source/home/post/9
// https://tel.archives-ouvertes.fr/tel-00438464/document p. 115+ (french)




Potree.EyeDomeLightingMaterial = function(parameters){
	THREE.Material.call( this );

	parameters = parameters || {};
	
	var neighbourCount = 8;
	var neighbours = new Float32Array(neighbourCount*2);
	for(var c = 0; c < neighbourCount; c++){
		neighbours[2*c+0] = Math.cos(2 * c * Math.PI / neighbourCount);
		neighbours[2*c+1] = Math.sin(2 * c * Math.PI / neighbourCount);
	}
	
	//var neighbourCount = 32;
	//var neighbours = new Float32Array(neighbourCount*2);
	//for(var c = 0; c < neighbourCount; c++){
	//	var r = (c / neighbourCount) * 4 + 0.1;
	//	neighbours[2*c+0] = Math.cos(2 * c * Math.PI / neighbourCount) * r;
	//	neighbours[2*c+1] = Math.sin(2 * c * Math.PI / neighbourCount) * r;
	//}
	
	var lightDir = new THREE.Vector3(0.0, 0.0, 1.0).normalize();
	
	var uniforms = {
		screenWidth: 	{ type: "f", 	value: 0 },
		screenHeight: 	{ type: "f", 	value: 0 },
		near: 			{ type: "f", 	value: 0 },
		far: 			{ type: "f", 	value: 0 },
		expScale: 		{ type: "f", 	value: 100.0 },
		edlScale: 		{ type: "f", 	value: 1.0 },
		radius: 		{ type: "f", 	value: 3.0 },
		lightDir:		{ type: "v3",	value: lightDir },
		neighbours:		{ type: "2fv", 	value: neighbours },
		depthMap: 		{ type: "t", 	value: null },
		colorMap: 		{ type: "t", 	value: null },
		opacity:		{ type: "f",	value: 1.0}
	};
	
	this.setValues({
		uniforms: uniforms,
		vertexShader: Potree.Shaders["edl.vs"],
		fragmentShader: Potree.Shaders["edl.fs"],
	});
	
};


Potree.EyeDomeLightingMaterial.prototype = new THREE.ShaderMaterial();














