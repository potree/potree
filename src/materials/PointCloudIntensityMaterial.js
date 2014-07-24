
Potree.PointCloudIntensityMaterial = function(){
	var attributes = {
		intensity:   { type: "f", value: [] }
	};
	var uniforms = {
		color:   { type: "c", value: new THREE.Color( 0xffffff ) },
		size:   { type: "f", value: 300 }
	};
	
	this.setValues({
		uniforms: uniforms,
		attributes: attributes,
		vertexShader: Potree.PointCloudIntensityMaterial.vs_points.join("\n"),
		fragmentShader: Potree.PointCloudIntensityMaterial.fs_points_rgb.join("\n"),
		vertexColors: THREE.VertexColors,
	
		alphaTest: 0.9,
	});
};

Potree.PointCloudIntensityMaterial.prototype = new THREE.ShaderMaterial();

Potree.PointCloudIntensityMaterial.vs_points = [
 "attribute float intensity;                                          ",
 "uniform float size;                                          ",
 "varying vec3 vColor;                                         ",
 "                                                             ",
 "void main() {                                                ",
 "	vColor = vec3(1.0, 1.0, 1.0) * (intensity / 600.0);                                            ",
 "	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 ); ",
 "                                                             ",
 "	gl_PointSize = size * 1.0 / length( mvPosition.xyz );      ",
 "	gl_Position = projectionMatrix * mvPosition;               ",
 "}                                                            "];

Potree.PointCloudIntensityMaterial.fs_points_rgb = [
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














