
Potree.PointSizeType = {
	FIXED: 0,
	ATTENUATED: 1,
	ADAPTIVE: 2
};

Potree.PointShape = {
	SQUARE: 0,
	CIRCLE: 1
};

Potree.PointColorType = {
	RGB: 0,
	COLOR: 1,
	DEPTH: 2,
	HEIGHT: 3,
	INTENSITY: 4,
	OCTREE_DEPTH: 5,
};

Potree.PointCloudMaterial = function(parameters){
	parameters = parameters || {};

	var color = new THREE.Color( 0x000000 );
	var map = THREE.ImageUtils.generateDataTexture( 2048, 1, color );
	map.magFilter = THREE.NearestFilter;
	this.visibleNodesTexture = map;
	
	var pointSize = parameters.size || 1.0;
	var minSize = parameters.minSize || 1.0;
	var nodeSize = 1.0;
	
	this._pointSizeType = Potree.PointSizeType.ATTENUATED;
	this._pointShape = Potree.PointShape.SQUARE;
	this._interpolate = false;
	this._pointColorType = Potree.PointColorType.RGB;
	
	this.gradientTexture = Potree.PointCloudMaterial.generateGradient();
	
	var attributes = {};
	var uniforms = {
		uColor:   { type: "c", value: new THREE.Color( 0xff0000 ) },
		size:   { type: "f", value: 10 },
		minSize:   { type: "f", value: 2 },
		nodeSize:   { type: "f", value: nodeSize },
		heightMin:   { type: "f", value: 0.0 },
		heightMax:   { type: "f", value: 1.0 },
		intensityMin:   { type: "f", value: 0.0 },
		intensityMax:   { type: "f", value: 1.0 },
		visibleNodes:   { type: "t", value: this.visibleNodesTexture },
		gradient: {type: "t", value: this.gradientTexture}
	};
	
	
	
	this.setValues({
		uniforms: uniforms,
		attributes: attributes,
		vertexShader: this.getDefines() + Potree.PointCloudMaterial.vs_points.join("\n"),
		fragmentShader: this.getDefines() + Potree.PointCloudMaterial.fs_points_rgb.join("\n"),
		vertexColors: THREE.VertexColors,
		size: pointSize,
		minSize: minSize,
		nodeSize: nodeSize,
		alphaTest: 0.9,
	});
};

Potree.PointCloudMaterial.prototype = new THREE.RawShaderMaterial();

Potree.PointCloudMaterial.prototype.updateShaderSource = function(){
	
	var attributes = {};
	if(this.pointColorType === Potree.PointColorType.INTENSITY){
		attributes.intensity = { type: "f", value: [] };
	}
	
	
	this.setValues({
		attributes: attributes,
		vertexShader: pointcloud.material.getDefines() + Potree.PointCloudMaterial.vs_points.join("\n"),
		fragmentShader: pointcloud.material.getDefines() + Potree.PointCloudMaterial.fs_points_rgb.join("\n")
	});
		
	this.needsUpdate = true;
};

Potree.PointCloudMaterial.prototype.getDefines = function(){

	var defines = "";
	
	if(this.pointSizeType === Potree.PointSizeType.FIXED){
		defines += "#define fixed_point_size\n";
	}else if(this.pointSizeType === Potree.PointSizeType.ATTENUATED){
		defines += "#define attenuated_point_size\n";
	}else if(this.pointSizeType === Potree.PointSizeType.ADAPTIVE){
		defines += "#define adaptive_point_size\n";
	}
	
	if(this.pointShape === Potree.PointShape.SQUARE){
		defines += "#define square_point_shape\n";
	}else if(this.pointShape === Potree.PointShape.CIRCLE){
		defines += "#define circle_point_shape\n";
	}
	
	if(this._interpolate){
		defines += "#define use_interpolation\n";
	}
	
	if(this._pointColorType === Potree.PointColorType.RGB){
		defines += "#define color_type_rgb\n";
	}else if(this._pointColorType === Potree.PointColorType.COLOR){
		defines += "#define color_type_color\n";
	}else if(this._pointColorType === Potree.PointColorType.DEPTH){
		defines += "#define color_type_depth\n";
	}else if(this._pointColorType === Potree.PointColorType.HEIGHT){
		defines += "#define color_type_height\n";
	}else if(this._pointColorType === Potree.PointColorType.INTENSITY){
		defines += "#define color_type_intensity\n";
	}else if(this._pointColorType === Potree.PointColorType.OCTREE_DEPTH){
		defines += "#define color_type_octree_depth\n";
	}

	return defines;
};

Object.defineProperty(Potree.PointCloudMaterial.prototype, "pointColorType", {
	get: function(){
		return this._pointColorType;
	},
	set: function(value){
		this._pointColorType = value;
		
		this.updateShaderSource();
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "pointSizeType", {
	get: function(){
		return this._pointSizeType;
	},
	set: function(value){
		this._pointSizeType = value;
		
		this.updateShaderSource();
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "interpolate", {
	get: function(){
		return this._interpolate;
	},
	set: function(value){
		this._interpolate = value;
		
		this.updateShaderSource();
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "color", {
	get: function(){
		return this.uniforms.uColor.value;
	},
	set: function(value){
		this.uniforms.uColor.value.copy(value);
		
		this.updateShaderSource();
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "pointShape", {
	get: function(){
		return this._pointShape;
	},
	set: function(value){
		this._pointShape = value;
		
		this.updateShaderSource();
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "size", {
	get: function(){
		return this.uniforms.size.value;
	},
	set: function(value){
		this.uniforms.size.value = value;
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "minSize", {
	get: function(){
		return this.uniforms.minSize.value;
	},
	set: function(value){
		this.uniforms.minSize.value = value;
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "heightMin", {
	get: function(){
		return this.uniforms.heightMin.value;
	},
	set: function(value){
		this.uniforms.heightMin.value = value;
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "heightMax", {
	get: function(){
		return this.uniforms.heightMax.value;
	},
	set: function(value){
		this.uniforms.heightMax.value = value;
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "intensityMin", {
	get: function(){
		return this.uniforms.intensityMin.value;
	},
	set: function(value){
		this.uniforms.intensityMin.value = value;
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "intensityMax", {
	get: function(){
		return this.uniforms.intensityMax.value;
	},
	set: function(value){
		this.uniforms.intensityMax.value = value;
	}
});

Potree.PointCloudMaterial.generateGradient = function() {
	var size = 64;

	// create canvas
	canvas = document.createElement( 'canvas' );
	canvas.width = size;
	canvas.height = size;

	// get context
	var context = canvas.getContext( '2d' );

	// draw gradient
	context.rect( 0, 0, size, size );
	var gradient = context.createLinearGradient( 0, 0, size, size );
    gradient.addColorStop(0, 'blue');
    gradient.addColorStop(1/5, 'aqua');
    gradient.addColorStop(2/5, 'green')
    gradient.addColorStop(3/5, 'yellow');
    gradient.addColorStop(4/5, 'orange');
	gradient.addColorStop(1, 'red');
 
    
	context.fillStyle = gradient;
	context.fill();
	
	var texture = new THREE.Texture( canvas );
	texture.needsUpdate = true;
	textureImage = texture.image;

	return texture;
}

Potree.PointCloudMaterial.vs_points = [
 "precision highp float;                                               ",
 "precision highp int;                                                 ",
 "                                                                     ",
 "attribute vec3 position;                                             ",
 "attribute vec3 color;                                                ",
 "attribute float intensity;                                                                     ",
 "                                                                     ",
 "uniform mat4 modelMatrix;                                            ",
 "uniform mat4 modelViewMatrix;                                        ",
 "uniform mat4 projectionMatrix;                                       ",
 "uniform mat4 viewMatrix;                                             ",
 "uniform mat3 normalMatrix;                                           ",
 "uniform vec3 cameraPosition;                                         ",
 "                                                                     ",
 "uniform float heightMin;                                                  ",
 "uniform float heightMax;                                                  ",
 "uniform float intensityMin;                                                  ",
 "uniform float intensityMax;                                                  ",
 "uniform float size;                                                  ",
 "uniform float minSize;                                               ",
 "uniform float nodeSize;                                              ",
 "uniform vec3 uColor;                                                                     ",
 "                                                                     ",
 "uniform sampler2D visibleNodes;                                      ",
 "uniform sampler2D gradient;                                          ",
 "                                                                     ",
 "                                                                     ",
 "varying vec3 vColor;                                                 ",
 "                                                                     ",
 "                                                                     ",
 "#ifdef adaptive_point_size                                                                     ",
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
 "float getOctreeDepth(){                                              ",
 "	vec3 offset = vec3(0.0, 0.0, 0.0);                                 ",
 "	float iOffset = 0.0;                                               ",
 "	float depth = 0.0;                                                 ",
 "	const float octreeLevels = 11.0;                                   ",
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
 "#endif                                                                     ",
 "                                                                     ",
 "                                                                     ",
 "                                                                     ",
 "void main() {                                                        ",
 "                                                                     ",
 "	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );         ",
 "	gl_Position = projectionMatrix * mvPosition;                       ",
 "                                                                     ",
 "  //                                                                 ",
 "  // COLOR TYPES                                                          ",
 "  //                                                                 ",
 "  #ifdef color_type_rgb                                              ",
 "		vColor = color;                                                    ",
 "  #elif defined color_type_height                                                                   ",
 "      vec4 world = modelMatrix * vec4( position, 1.0 );                                                               ",
 "      float w = (world.y - heightMin) / (heightMax-heightMin);                                                                ",
 "                                                                     ",
 "  	vColor = texture2D(gradient, vec2(w,1.0-w)).rgb;                                                                   ",
 "  #elif defined color_type_depth                                                                   ",
 "  	vColor = vec3(1.0, 1.0, 1.0) * gl_Position.w * 0.0001;                                                                   ",
 "  #elif defined color_type_intensity                                                                   ",
 "      float w = (intensity - intensityMin) / intensityMax;                                                               ",
 "  	vColor = texture2D(gradient, vec2(w,1.0-w)).rgb;                                                                   ",
 "  #elif defined color_type_color                                                                   ",
 "  	vColor = uColor;                                                                   ",
 "  #elif defined color_type_octree_depth                                                                   ",
 "  	float depth = getOctreeDepth();                                                                   ",
 "      float w = depth / 10.0;                                                               ",
 "  	vColor = texture2D(gradient, vec2(w,1.0-w)).rgb;                                                                   ",
 "  #endif                                                                   ",
 "                                                                     ",
 "                                                                     ",
 "  //                                                                   ",
 "  // POINT SIZE TYPES                                                                 ",
 "  //                                                                   ",
 "  #if defined fixed_point_size                                                                   ",
 "  	gl_PointSize = size;                                                                   ",
 "  #elif defined attenuated_point_size                                                                   ",
 "		gl_PointSize = size * ( 300.0 / length( mvPosition.xyz ) );        ",
 "  #elif defined adaptive_point_size                                                                   ",
 "      gl_PointSize = size * ( 300.0 / length( mvPosition.xyz ) );                                                               ",
 "  	gl_PointSize = gl_PointSize / pow(1.9, getOctreeDepth());                ",
 "  #endif                                                                   ",
 "                                                                     ",
 "	gl_PointSize = max(minSize, gl_PointSize);                       ",
 "	gl_PointSize = min(30.0, gl_PointSize);                       ",
 "                                                                     ",
 "                                                             ",
 "}                                                            "];

Potree.PointCloudMaterial.fs_points_rgb = [
 "#if defined use_interpolation                                                             ",
 "	#extension GL_EXT_frag_depth : enable                                                             ",
 "#endif                                                             ",
 "                                                             ",
 "precision highp float;                                                             ",
 "precision highp int;                                                               ",
 "                                                             ",
 "varying vec3 vColor;                                         ",
 "                                                             ",
 "                                                             ",
 "void main() {                                                ",
 "	                                                           ",
 "	#if defined(circle_point_shape) || defined(use_interpolation)                                                           ",
 "		float a = pow(2.0*(gl_PointCoord.x - 0.5), 2.0);           ",
 "		float b = pow(2.0*(gl_PointCoord.y - 0.5), 2.0);           ",
 "		float c = 1.0 - (a + b);                                   ",
 "  	                                                           ",
 "		if(c < 0.0){                                               ",
 "			discard;                                               ",
 "		}                                                          ",
 "	#endif                                                           ",
 "	                                                           ",
 "	#if defined use_interpolation                                                           ",
 "		gl_FragDepthEXT = gl_FragCoord.z + 0.1*(1.0-pow(c, 1.0)) * gl_FragCoord.w ;                                                           ",
 "	#endif                                                           ",
 "	                                                           ",
 "	gl_FragColor = vec4(vColor, 1.0);                          ",
 "	                                                           ",
 "	                                                           ",
 "}                                                            "];















// "                                                                     ",
// "                                                                     ",
// " //if(depth == 0.0){                                                 ",
// " //   vColor = vec3(1.0, 0.0, 0.0);                                  ",
// " //}else if(depth == 1.0){                            ",
// " //   vColor = vec3(0.0, 1.0, 0.0);                         ",
// " //}else if(depth == 2.0){                            ",
// " //   vColor = vec3(0.0, 0.0, 1.0);                         ",
// " //}else if(depth == 3.0){                            ",
// " //   vColor = vec3(1.0, 1.0, 0.0);                         ",
// " //}else if(depth == 4.0){                            ",
// " //   vColor = vec3(1.0, 0.0, 1.0);                         ",
// " //}else if(depth == 5.0){                            ",
// " //   vColor = vec3(0.0, 1.0, 1.0);                         ",
// " //}else if(depth == 6.0){                            ",
// " //   vColor = vec3(1.0, 1.0, 1.0);                         ",
// " //}else if(depth == 7.0){                            ",
// " //   vColor = vec3(0.5, 1.0, 0.5);                         ",
// " //}else if(depth == 8.0){                            ",
// " //   vColor = vec3(1.0, 0.5, 0.5);                         ",
// " //}else if(depth == 9.0){                            ",
// " //   vColor = vec3(0.5, 0.5, 1.0);                         ",
// " //}                                                           ",