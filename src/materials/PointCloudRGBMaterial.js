
Potree.PointCloudRGBMaterial = function(parameters){
	parameters = parameters || {};

	var color = new THREE.Color( 0x000000 );
	var map = THREE.ImageUtils.generateDataTexture( 64, 64, color );
	this.visibleNodesTexture = map;
	
	var pointSize = parameters.size || 1.0;
	var minSize = parameters.minSize || 2.0;
	var nodeSize = 1.0;
	
	var attributes = {};
	var uniforms = {
		color:   { type: "c", value: new THREE.Color( 0xffffff ) },
		size:   { type: "f", value: 10 },
		minSize:   { type: "f", value: 2 },
		nodeSize:   { type: "f", value: nodeSize },
		visibleNodes:   { type: "t", value: this.visibleNodesTexture }
	};
	
	
	
	this.setValues({
		uniforms: uniforms,
		attributes: attributes,
		vertexShader: Potree.PointCloudRGBMaterial.vs_points.join("\n"),
		fragmentShader: Potree.PointCloudRGBMaterial.fs_points_rgb.join("\n"),
		vertexColors: THREE.VertexColors,
		size: pointSize,
		minSize: minSize,
		nodeSize: nodeSize,
		alphaTest: 0.9,
	});
};

Potree.PointCloudRGBMaterial.prototype = new THREE.ShaderMaterial();

Object.defineProperty(Potree.PointCloudRGBMaterial.prototype, "size", {
	get: function(){
		return this.uniforms.size.value;
	},
	set: function(value){
		this.uniforms.size.value = value;
	}
});

Object.defineProperty(Potree.PointCloudRGBMaterial.prototype, "minSize", {
	get: function(){
		return this.uniforms.minSize.value;
	},
	set: function(value){
		this.uniforms.minSize.value = value;
	}
});

Potree.PointCloudRGBMaterial.vs_points = [
 "uniform float size;                                          ",
 "uniform float minSize;                                          ",
 "uniform sampler2D visibleNodes;                                                             ",
 "uniform float nodeSize;                                                             ",
 "                                                             ",
 "varying vec3 vColor;                                         ",
 "                                                             ",
 "                                                             ",
 "void main() {                                                ",
 "	vColor = color;                                            ",
 "	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 ); ",
 "                                                             ",
 "  vec4 value = texture2D(visibleNodes, vec2(0.0, 0.0));                                                            ",
 "  float mask = value.r * 255.0;                                                           ",
 "                                                             ",
 "	gl_PointSize = size * ( 300.0 / length( mvPosition.xyz ) );      ",
 "	gl_PointSize = max(minSize, gl_PointSize);      ",
 "	gl_Position = projectionMatrix * mvPosition;               ",
 "                                                             ",
 "                                                             ",
 "  vec3 index3d = position / nodeSize;                                                           ",
 "                                                             ",
 "  // without it, the z/y bounds are incorrect. why?          ",
 "  index3d.z = index3d.z + 0.033;                                                           ",
 "  index3d.y = index3d.y + 0.033;                                                           ",
 "                                                             ",
 "  index3d = floor(index3d + 0.5);                                                           ",
 "  float index = 4.0*index3d.x + 2.0*index3d.y + index3d.z;           ",
 "                                                             ",
 "  if(mod(floor((mask / pow(2.0, index))), 2.0) == 0.0){                     ",
 "  	gl_PointSize = gl_PointSize * 2.0;                                                           ",
 "  }                                                           ",
 "                                                             ",
 "  //vColor.rgb = value.rgb;                                                           ",
 "  //vColor.rgb = vec3(1.0, 1.0, 1.0) * pow(2.0, index) / 256.0;                                                           ",
 "                                                             ",
 "  //vColor = index3d;                                                           ",
 "  //vColor.r = 0.0;                                                           ",
 "  //vColor.b = 0.0;                                                           ",
 "}                                                            "];

Potree.PointCloudRGBMaterial.fs_points_rgb = [
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














