
Potree.PointCloudHeightMaterial = function(){

	this.min = 0;
	this.max = 1;
	
	var attributes = {};
	var uniforms = {
		uCol:   { type: "c", value: new THREE.Color( 0xffffff ) },
		size:   { type: "f", value: 1500 },
		uMin:	{ type: "f", value: this.min },
		uMax:	{ type: "f", value: this.max }
	};
	
	this.setValues({
				uniforms: uniforms,
				attributes: attributes,
				vertexShader: Potree.PointCloudHeightMaterial.vs_points.join("\n"),
				fragmentShader: Potree.PointCloudHeightMaterial.fs_points_rgb.join("\n"),
				vertexColors: THREE.VertexColors,
	
				alphaTest: 0.9,
			});
};

Potree.PointCloudHeightMaterial.prototype = new THREE.ShaderMaterial();

Potree.PointCloudHeightMaterial.prototype.setBoundingBox = function(boundingBox){
	this.min = boundingBox.min.y;
	this.max = boundingBox.max.y;
	
	this.uniforms.uMin.value = this.min;
	this.uniforms.uMax.value = this.max;
	
}

Potree.PointCloudHeightMaterial.vs_points = [
 "uniform float size;                                          ",
 "uniform float uMin;                                          ",
 "uniform float uMax;                                          ",
 "                                                             ",
 "varying vec3 vColor;                                         ",
 "                                                             ",
 "void main() {                                                ",
 "	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 ); ",
 "	vec4 world = modelMatrix * vec4( position, 1.0 ); ",
 "	float w = (world.y - uMin) / (uMax-uMin);            ",
 "	w = clamp(w-0.1, 0.0, 1.0);            ",
 "	//vColor = 0.2*vec3(0.788, 0.64, 0.16) * (1.0-w) + vec3(0.67, 0.62, 0.53) * w;  ",
 "	vColor = vec3(1.0, 0.0, 0.0) * (w) ;  ",
 "                                                             ",
 "	gl_PointSize = size * 1.0 / length( mvPosition.xyz );      ",
 "	gl_PointSize = max(gl_PointSize, 3.0);                      ",
 "	gl_Position = projectionMatrix * mvPosition;               ",
 "}                                                            "];

Potree.PointCloudHeightMaterial.fs_points_rgb = [
 "varying vec3 vColor;                                         ",
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
 "}                                                            "];














