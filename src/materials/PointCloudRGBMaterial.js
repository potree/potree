
Potree.PointCloudRGBMaterial = function(parameters){
	parameters = parameters || {};

	var color = new THREE.Color( 0x000000 );
	var map = THREE.ImageUtils.generateDataTexture( 2048, 1, color );
	map.magFilter = THREE.NearestFilter;
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
 "uniform float size;                                                  ",
 "uniform float minSize;                                               ",
 "uniform sampler2D visibleNodes;                                      ",
 "uniform float nodeSize;                                              ",
 "                                                                     ",
 "                                                                     ",
 "varying vec3 vColor;                                                 ",
 "                                                                     ",
 "                                                                     ",
 "                                                                     ",
 "/**                                                                  ",
 " * number of 1-bits up to inclusive index position                   ",
 " * number is treated as if it were an integer in the range 0-255     ",
 " *                                                                   ",
 " */                                                                  ",
 "float numberOfOnes(float number, float index){                       ",
 "	float tmp = mod(number, pow(2.0, index + 1.0));                    ",
 "	float numOnes = 0.0;                                               ",
 "	for(float i = 0.0; i < 8.0; i++){                                  ",
 "		if(mod(tmp, 2.0) != 0.0){                                      ",
 "			numOnes++;                                                 ",
 "		}                                                              ",
 "		tmp = floor(tmp / 2.0);                                        ",
 "	}                                                                  ",
 "	return numOnes;                                                    ",
 "}                                                                    ",
 "                                                                     ",
 "                                                                     ",
 "/**                                                                  ",
 " * checks whether the bit at index is 1                              ",
 " * number is treated as if it were an integer in the range 0-255     ",
 " *                                                                   ",
 " */                                                                  ",
 "bool isBitSet(float number, float index){                            ",
 "	return mod(floor(number / pow(2.0, index)), 2.0) != 0.0;           ",
 "}                                                                    ",
 "                                                                     ",
 "                                                                     ",
 "/**                                                                  ",
 " * find the octree depth at the point position                       ",
 " */                                                                  ",
 "float getOctreeDepth(){                                                    ",
 "	vec3 offset = vec3(0.0, 0.0, 0.0);                                 ",
 "	float iOffset = 0.0;                                               ",
 "	float depth = 0.0;                                                 ",
 "	const float octreeLevels = 6.0;                                    ",
 "	for(float i = 0.0; i <= octreeLevels; i++){                        ",
 "		                                                               ",
 "		float nodeSizeAtLevel = nodeSize / pow(2.0, i);                ",
 "		vec3 index3d = (position - offset) / nodeSizeAtLevel;          ",
 "		index3d = floor(index3d + 0.5);                                ",
 "		float index = 4.0*index3d.x + 2.0*index3d.y + index3d.z;       ",
 "		                                                               ",
 "		vec4 value = texture2D(visibleNodes, vec2(iOffset / 2048.0, 0.0));                                                           ",
 "		float mask = value.r * 255.0;                                  ",
 "		if(isBitSet(mask, index)){                                     ",
 "			// there are more visible child nodes at this position     ",
 "			iOffset = iOffset + value.g * 255.0 + numberOfOnes(mask, index - 1.0);                                                       ",
 "			depth++;                                                   ",
 "		}else{                                                         ",
 "			// no more visible child nodes at this position            ",
 "			return depth;                                              ",
 "		}                                                              ",
 "		offset = offset + (vec3(1.0, 1.0, 1.0) * nodeSizeAtLevel * 0.5) * index3d;                                                           ",
 "	}                                                                  ",
 "		                                                               ",
 "	return depth;                                                      ",
 "}                                                                    ",
 "                                                                     ",
 "                                                                     ",
 "                                                                     ",
 "                                                                     ",
 "void main() {                                                        ",
 "	vColor = color;                                                    ",
 "	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );         ",
 "                                                                     ",
 "	gl_Position = projectionMatrix * mvPosition;                       ",
 "                                                                     ",
 "	gl_PointSize = size * ( 300.0 / length( mvPosition.xyz ) );        ",
 "  gl_PointSize = gl_PointSize / pow(1.9, getOctreeDepth());                ",
 "	gl_PointSize = max(minSize, gl_PointSize);                       ",
 "                                                                     ",
 "                                                                     ",
 "                                                                     ",
 " //if(depth == 0.0){                                                 ",
 " //   vColor = vec3(1.0, 0.0, 0.0);                                  ",
 " //}else if(depth == 1.0){                            ",
 " //   vColor = vec3(0.0, 1.0, 0.0);                         ",
 " //}else if(depth == 2.0){                            ",
 " //   vColor = vec3(0.0, 0.0, 1.0);                         ",
 " //}else if(depth == 3.0){                            ",
 " //   vColor = vec3(1.0, 1.0, 0.0);                         ",
 " //}else if(depth == 4.0){                            ",
 " //   vColor = vec3(1.0, 0.0, 1.0);                         ",
 " //}else if(depth == 5.0){                            ",
 " //   vColor = vec3(0.0, 1.0, 1.0);                         ",
 " //}else if(depth == 6.0){                            ",
 " //   vColor = vec3(1.0, 1.0, 1.0);                         ",
 " //}else if(depth == 7.0){                            ",
 " //   vColor = vec3(0.5, 1.0, 0.5);                         ",
 " //}else if(depth == 8.0){                            ",
 " //   vColor = vec3(1.0, 0.5, 0.5);                         ",
 " //}else if(depth == 9.0){                            ",
 " //   vColor = vec3(0.5, 0.5, 1.0);                         ",
 " //}                                                           ",
 "                                                             ",
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














