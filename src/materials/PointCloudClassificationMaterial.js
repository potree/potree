
Potree.PointCloudClassificationMaterial = function(parameters){
	parameters = parameters || {};
	
	var size = parameters.size || 1.0;
	this.min = parameters.min || 0;
	this.max = parameters.max || 1;

	var attributes = {
		classification:   { type: "f", value: [] }
	};
	var uniforms = {
		color:   { type: "c", value: new THREE.Color( 0xffffff ) },
		size:   { type: "f", value: 1 }
	};	
	
	this.setValues({
		uniforms: uniforms,
		attributes: attributes,
		vertexShader: Potree.PointCloudClassificationMaterial.vs_points.join("\n"),
		fragmentShader: Potree.PointCloudClassificationMaterial.fs_points_rgb.join("\n"),
		vertexColors: THREE.VertexColors,
		size: size,
		alphaTest: 0.9
	});
};

Potree.PointCloudClassificationMaterial.prototype = new THREE.ShaderMaterial();

Object.defineProperty(Potree.PointCloudClassificationMaterial.prototype, "size", {
	get: function(){
		return this.uniforms.size.value;
	},
	set: function(value){
		this.uniforms.size.value = value;
	}
});

Potree.PointCloudClassificationMaterial.vs_points = [
 "attribute float classification;                                          ",
 "uniform float size;                                          ",
 "varying vec3 vColor;                                         ",
 "                                                             ",
 "void main() {                                                ",
 "	if(classification == 0.0){ ",
 "	   vColor = vec3(0.5, 0.5, 0.5); ",
 "	}else if(classification == 1.0){ ",
 "	   vColor = vec3(0.5, 0.5, 0.5); ",
 "	}else if(classification == 2.0){ ",
 "	   vColor = vec3(1.0, 0.0, 0.0); ",
 "	}else if(classification == 3.0){ ",
 "	   vColor = vec3(0.0, 1.0, 0.0); ",
 "	}else if(classification == 9.0){ ",
 "	   vColor = vec3(0.0, 0.0, 1.0); ",
 "	}else{ ",
 "	   vColor = vec3(0.0, 1.0, 0.0); ",
 "	} ",
 "	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 ); ",
 "                                                             ",
 "	gl_PointSize = size * ( 300.0 / length( mvPosition.xyz ) );      ",
 "	gl_PointSize = max(2.0, gl_PointSize);      ",
 "	gl_Position = projectionMatrix * mvPosition;               ",
 "}                                                            "];

Potree.PointCloudClassificationMaterial.fs_points_rgb = [
 "varying vec3 vColor;                                         ",
 "                                                             ",
 "void main() {                                                ",
 "	                                                           ",
 "	//float a = pow(2.0*(gl_PointCoord.x - 0.5), 2.0);           ",
 "	//float b = pow(2.0*(gl_PointCoord.y - 0.5), 2.0);           ",
 "	//float c = 1.0 - (a + b);                                   ",
 "  //                                                           ",
 "	//if(c < 0.0){                                               ",
 "	//	discard;                                               ",
 "	//}                                                          ",
 "	                                                           ",
 "	gl_FragColor = vec4(vColor, 1.0);                          ",
 "}                                                            "];














