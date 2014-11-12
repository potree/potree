
Potree.PointCloudRGBInterpolationMaterial = function(parameters){
	parameters = parameters || {};
	
	var attributes = {};
	var uniforms = {
		color:   { type: "c", value: new THREE.Color( 0xffffff ) },
		size:   { type: "f", value: 10 },
		minSize:   { type: "f", value: 2 },
		blendDepth:   { type: "f", value: 0.01 }
	};
	
	var pointSize = parameters.size || 1.0;
	var minSize = parameters.minSize || 2.0;
	
	// check of extension is enabled and fallback if it's not.
	var vs;
	var fs;
	if(Potree.PointCloudRGBInterpolationMaterial.isSupported()){
		vs = Potree.PointCloudRGBInterpolationMaterial.vs_points.join("\n");
		fs = Potree.PointCloudRGBInterpolationMaterial.fs_points_rgb.join("\n");
	}else{
		vs = Potree.PointCloudRGBMaterial.vs_points.join("\n");
		fs = Potree.PointCloudRGBMaterial.fs_points_rgb.join("\n");
	}

	this.setValues({
		uniforms: uniforms,
		attributes: attributes,
		vertexShader: vs,
		fragmentShader: fs,
		vertexColors: THREE.VertexColors,
		size: pointSize,
		minSize: minSize,
		alphaTest: 0.9,
	});
};

Potree.PointCloudRGBInterpolationMaterial.prototype = new THREE.ShaderMaterial();

Potree.PointCloudRGBInterpolationMaterial.isSupported = function(){
	var canvas = document.createElement('canvas');
	var context = canvas.getContext('webgl');
	if(context){
		var frag_depth_ext = context.getExtension('EXT_frag_depth');
		return frag_depth_ext;
	}else{
		return false;
	}
}

Object.defineProperty(Potree.PointCloudRGBInterpolationMaterial.prototype, "size", {
	get: function(){
		return this.uniforms.size.value;
	},
	set: function(value){
		this.uniforms.size.value = value;
	}
});

Object.defineProperty(Potree.PointCloudRGBInterpolationMaterial.prototype, "minSize", {
	get: function(){
		return this.uniforms.minSize.value;
	},
	set: function(value){
		this.uniforms.minSize.value = value;
	}
});

Object.defineProperty(Potree.PointCloudRGBInterpolationMaterial.prototype, "blendDepth", {
	get: function(){
		return this.uniforms.blendDepth.value;
	},
	set: function(value){
		this.uniforms.blendDepth.value = value;
	}
});

Potree.PointCloudRGBInterpolationMaterial.vs_points = [
 "                                         ",
 "                                         ",
 "                                         ",
 "uniform float size;                                          ",
 "uniform float minSize;                                          ",
 "varying vec3 vColor;                                         ",
 "                                                             ",
 "void main() {                                                ",
 "	vColor = color;                                            ",
 "	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 ); ",
 "                                                             ",
 "	gl_PointSize = size * ( 300.0 / length( mvPosition.xyz ) );      ",
 "	gl_PointSize = max(minSize, gl_PointSize);      ",
 "	gl_Position = projectionMatrix * mvPosition;               ",
 "}                                                            "];

Potree.PointCloudRGBInterpolationMaterial.fs_points_rgb = [
 "#extension GL_EXT_frag_depth : enable                                         ",
 "varying vec3 vColor;                                         ",
 "uniform float blendDepth;                                    ",
 "                                                             ",
 "                                                             ",
 "void main() {                                                ",
 "	                                                           ",
 "	float a = pow(2.0*(gl_PointCoord.x - 0.5), 2.0);           ",
 "	float b = pow(2.0*(gl_PointCoord.y - 0.5), 2.0);           ",
 "	float c = 1.0 - (a + b);                                   ",
 "                                                             ",
 "	if(c < 0.0){                                               ",
 "		discard;                                               ",
 "	}                                                          ",
 "	                                                           ",
 "	gl_FragColor = vec4(vColor, 1.0);                          ",
 "  gl_FragDepthEXT = gl_FragCoord.z + blendDepth*(1.0-pow(c, 1.0)) * gl_FragCoord.w ;                                                            ",
 "	                                                           ",
 "	//float dist = gl_FragCoord.z / gl_FragCoord.w;                                                           ",
 "	//float fog = clamp(dist / 2000.0, 0.0, 1.0);                                                           ",
 "	//fog = min(fog, 0.6);                                                           ",
 "	//gl_FragColor = gl_FragColor * (1.0-fog) + vec4(170.0, 180.0, 190, 1.0) * fog / 256.0;                                                           ",
 "  //gl_FragColor.a = 1.0;                                                            ",
 "}                                                            "];










