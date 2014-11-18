
Potree.PointCloudIndexMaterial = function(parameters){
	parameters = parameters || {};
	
	var attributes = {};
	var uniforms = {
		size:   { type: "f", value: 10 },
		minSize:   { type: "f", value: 2 },
		pcIndex:   { type: "f", value: 0 }
	};
	
	var pointSize = parameters.size || 1.0;
	var minSize = parameters.minSize || 2.0;
	
	this.setValues({
		uniforms: uniforms,
		attributes: attributes,
		vertexShader: Potree.PointCloudIndexMaterial.vs_points.join("\n"),
		fragmentShader: Potree.PointCloudIndexMaterial.fs_points_index.join("\n"),
		size: pointSize,
		pcIndex: 0,
		minSize: minSize
	});
};

Potree.PointCloudIndexMaterial.prototype = new THREE.RawShaderMaterial();

Object.defineProperty(Potree.PointCloudIndexMaterial.prototype, "size", {
	get: function(){
		return this.uniforms.size.value;
	},
	set: function(value){
		this.uniforms.size.value = value;
	}
});

Object.defineProperty(Potree.PointCloudIndexMaterial.prototype, "minSize", {
	get: function(){
		return this.uniforms.minSize.value;
	},
	set: function(value){
		this.uniforms.minSize.value = value;
	}
});

Object.defineProperty(Potree.PointCloudIndexMaterial.prototype, "pcIndex", {
	get: function(){
		return this.uniforms.pcIndex.value;
	},
	set: function(value){
		this.uniforms.pcIndex.value = value;
	}
});

Potree.PointCloudIndexMaterial.vs_points = [
 "                                        ",
 "precision highp float;                                        ",
 "precision highp int;                                          ",
 "                                                              ",
 "attribute vec3 position;                                         ",
 "attribute vec4 indices;                                         ",
 "                                                             ",
 "uniform mat4 modelViewMatrix;                                                             ",
 "uniform mat4 projectionMatrix;                                                             ",
 "uniform float size;                                          ",
 "uniform float minSize;                                          ",
 "                                                             ",
 "varying vec4 vIndex;                                        ",
 "                                                             ",
 "void main() {                                                ",
 "	vIndex = indices;                                            ",
 "	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 ); ",
 "                                                             ",
 "	gl_PointSize = size * ( 300.0 / length( mvPosition.xyz ) );      ",
 "	gl_PointSize = max(minSize, gl_PointSize);      ",
 "	gl_Position = projectionMatrix * mvPosition;               ",
 "}                                                            "];
 
 Potree.PointCloudIndexMaterial.fs_points_index = [
 "                                        ",
 "precision highp float;                                        ",
 "precision highp int;                                          ",
 "                                                              ",
 "uniform float pcIndex;                                        ",
 "                                                              ",
 "varying vec4 vIndex;                                                            ",
 "uniform float size;                                          ",
 "                                                                              ",
 "void main() {                                                                 ",
 "	                                                                            ",
 "	//float a = pow(2.0*(gl_PointCoord.x - 0.5), 2.0);                            ",
 "	//float b = pow(2.0*(gl_PointCoord.y - 0.5), 2.0);                            ",
 "	//float c = 1.0 - (a + b);                                                    ",
 "  //                                                                            ",
 "	//if(c < 0.0){                                                                ",
 "	//	discard;                                                                ",
 "	//}                                                                           ",
 "	                                                                            ",
 "	gl_FragColor = vIndex;                                                                            ",
 "	gl_FragColor.a = pcIndex / 256.0;                                                                            ",
 "	                                                                            ",
 "}                                                                              "];




