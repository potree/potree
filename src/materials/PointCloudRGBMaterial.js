
Potree.PointCloudRGBMaterial = function(parameters){
	parameters = parameters || {};
	
	var attributes = {};
	var uniforms = {
		color:   { type: "c", value: new THREE.Color( 0xffffff ) },
		size:   { type: "f", value: 10 }
	};
	
	var pointSize = parameters.size || 1.0;
	
	this.setValues({
		uniforms: uniforms,
		attributes: attributes,
		vertexShader: Potree.PointCloudRGBMaterial.vs_points.join("\n"),
		fragmentShader: Potree.PointCloudRGBMaterial.fs_points_rgb.join("\n"),
		vertexColors: THREE.VertexColors,
		size: pointSize,
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

Potree.PointCloudRGBMaterial.vs_points = [
 "uniform float size;                                          ",
 "varying vec3 vColor;                                         ",
 "                                                             ",
 "void main() {                                                ",
 "	vColor = color;                                            ",
 "	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 ); ",
 "                                                             ",
 "	gl_PointSize = size * ( 300.0 / length( mvPosition.xyz ) );      ",
 "	gl_PointSize = max(2.0, gl_PointSize);      ",
 "	gl_Position = projectionMatrix * mvPosition;               ",
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














