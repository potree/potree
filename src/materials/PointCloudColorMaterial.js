
Potree.PointCloudColorMaterial = function(parameters){
	parameters = parameters || {};

	var color = parameters.color || new THREE.Color().setRGB(1, 0, 0);
	var size = parameters.size || 1.0;
	
	var attributes = {};
	var uniforms = {
		uCol:   { type: "c", value: color },
		size:   { type: "f", value: 1 }
	};
	
	this.setValues({
		uniforms: uniforms,
		attributes: attributes,
		vertexShader: Potree.PointCloudColorMaterial.vs_points.join("\n"),
		fragmentShader: Potree.PointCloudColorMaterial.fs_points_rgb.join("\n"),
		vertexColors: THREE.VertexColors,
		size: size,
		alphaTest: 0.9,
	});
};

Potree.PointCloudColorMaterial.prototype = new THREE.ShaderMaterial();

Object.defineProperty(Potree.PointCloudColorMaterial.prototype, "size", {
	get: function(){
		return this.uniforms.size.value;
	},
	set: function(value){
		this.uniforms.size.value = value;
	}
});

Object.defineProperty(Potree.PointCloudColorMaterial.prototype, "color", {
	get: function(){
		return this.uniforms.uCol.value;
	},
	set: function(value){
		this.uniforms.uCol.value.copy(value);
	}
});

Potree.PointCloudColorMaterial.vs_points = [
 "uniform float size;                                          ",
 "uniform vec3 uCol;                                           ",
 "varying vec3 vColor;                                         ",
 "                                                             ",
 "void main() {                                                ",
 "	vColor = uCol;                                             ",
 "	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 ); ",
 "                                                             ",
 "	gl_PointSize = size * ( 300.0 / length( mvPosition.xyz ) );      ",
 "	gl_PointSize = max(2.0, gl_PointSize);      ",
 "	gl_Position = projectionMatrix * mvPosition;               ",
 "}                                                            "];

Potree.PointCloudColorMaterial.fs_points_rgb = [
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














