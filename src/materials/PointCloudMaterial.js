

//
//
//
// how to calculate the radius of a projected sphere in screen space
// http://stackoverflow.com/questions/21648630/radius-of-projected-sphere-in-screen-space
// http://stackoverflow.com/questions/3717226/radius-of-projected-sphere
//


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
	INTENSITY_GRADIENT: 5,
	OCTREE_DEPTH: 6,
	POINT_INDEX: 7,
	CLASSIFICATION: 8,
	RETURN_NUMBER: 9,
	SOURCE: 10
};

Potree.ClipMode = {
	DISABLED: 0,
	CLIP_OUTSIDE: 1,
	HIGHLIGHT_INSIDE: 2
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
	this._octreeLevels = 6.0;
	this._useClipBox = false;
	this.numClipBoxes = 0;
	this._clipMode = Potree.ClipMode.DISABLED;
	this._weighted = false;
	this._blendDepth = 0.1;
	this._depthMap;
	
	this.gradientTexture = Potree.PointCloudMaterial.generateGradient();
	
	var attributes = {};
	var uniforms = {
		spacing:		{ type: "f", value: 1.0 },
		fov:			{ type: "f", value: 1.0 },
		screenWidth:	{ type: "f", value: 1.0 },
		screenHeight:	{ type: "f", value: 1.0 },
		near:			{ type: "f", value: 0.1 },
		far:			{ type: "f", value: 1.0 },
		uColor:   		{ type: "c", value: new THREE.Color( 0xff0000 ) },
		opacity:   		{ type: "f", value: 1.0 },
		size:   		{ type: "f", value: 10 },
		minSize:   		{ type: "f", value: 2 },
		nodeSize:		{ type: "f", value: nodeSize },
		heightMin:		{ type: "f", value: 0.0 },
		heightMax:		{ type: "f", value: 1.0 },
		intensityMin:	{ type: "f", value: 0.0 },
		intensityMax:	{ type: "f", value: 1.0 },
		visibleNodes:	{ type: "t", value: this.visibleNodesTexture },
		pcIndex:   		{ type: "f", value: 0 },
		gradient: 		{ type: "t", value: this.gradientTexture },
		clipBoxes:		{ type: "Matrix4fv", value: [] },
		blendDepth:		{ type: "f", value: this._blendDepth },
		depthMap: 		{ type: "t", value: null },
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
		pcIndex: 0,
		alphaTest: 0.9
	});
};

Potree.PointCloudMaterial.prototype = new THREE.RawShaderMaterial();

Potree.PointCloudMaterial.prototype.updateShaderSource = function(){
	
	var attributes = {};
	if(this.pointColorType === Potree.PointColorType.INTENSITY
		|| this.pointColorType === Potree.PointColorType.INTENSITY_GRADIENT){
		attributes.intensity = { type: "f", value: [] };
	}else if(this.pointColorType === Potree.PointColorType.CLASSIFICATION){
		attributes.classification = { type: "f", value: [] };
	}else if(this.pointColorType === Potree.PointColorType.RETURN_NUMBER){
		attributes.returnNumber = { type: "f", value: [] };
	}else if(this.pointColorType === Potree.PointColorType.SOURCE){
		attributes.pointSourceID = { type: "f", value: [] };
	}
	
	this.setValues({
		attributes: attributes,
		vertexShader: this.getDefines() + Potree.PointCloudMaterial.vs_points.join("\n"),
		fragmentShader: this.getDefines() + Potree.PointCloudMaterial.fs_points_rgb.join("\n")
	});
	
	if(this.depthMap){
		this.uniforms.depthMap.value = this.depthMap;
		this.setValues({
			depthMap: this.depthMap,
		});
	}
	
	if(this.opacity === 1.0){
		this.setValues({
			blending: THREE.NoBlending,
			transparent: false,
			depthTest: true,
			depthWrite: true
		});
	}else{
		this.setValues({
			blending: THREE.AdditiveBlending,
			transparent: true,
			depthTest: false,
			depthWrite: true
		});
		//this.setValues({
		//	transparent: true
		//});
	}
		
	if(this.weighted){	
		this.setValues({
			blending: THREE.AdditiveBlending,
			transparent: true,
			depthTest: true,
			depthWrite: false
		});	
	}
		
		
		
		
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
		defines += "#define octreeLevels " + Math.max(0, this._octreeLevels - 2).toFixed(1) + "\n";
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
	}else if(this._pointColorType === Potree.PointColorType.INTENSITY_GRADIENT){
		defines += "#define color_type_intensity_gradient\n";
	}else if(this._pointColorType === Potree.PointColorType.OCTREE_DEPTH){
		defines += "#define color_type_octree_depth\n";
	}else if(this._pointColorType === Potree.PointColorType.POINT_INDEX){
		defines += "#define color_type_point_index\n";
	}else if(this._pointColorType === Potree.PointColorType.CLASSIFICATION){
		defines += "#define color_type_classification\n";
	}else if(this._pointColorType === Potree.PointColorType.RETURN_NUMBER){
		defines += "#define color_type_return_number\n";
	}else if(this._pointColorType === Potree.PointColorType.SOURCE){
		defines += "#define color_type_source\n";
	}
	
	if(this.clipMode === Potree.ClipMode.DISABLED){
		defines += "#define clip_disabled\n";
	}else if(this.clipMode === Potree.ClipMode.CLIP_OUTSIDE){
		defines += "#define clip_outside\n";
	}else if(this.clipMode === Potree.ClipMode.HIGHLIGHT_INSIDE){
		defines += "#define clip_highlight_inside\n";
	}
	
	if(this.weighted){
		defines += "#define weighted_splats\n";
	}
	
	if(this.numClipBoxes > 0){
		defines += "#define use_clip_box\n";
		defines += "#define clip_box_count " + this.numClipBoxes + "\n";
	}

	return defines;
};

Potree.PointCloudMaterial.prototype.setClipBoxes = function(clipBoxes){
	var numBoxes = clipBoxes.length;
	this.numClipBoxes = numBoxes;
	
	if(this.uniforms.clipBoxes.value.length / 16 !== numBoxes){
		this.uniforms.clipBoxes.value = new Float32Array(numBoxes * 16);
		this.updateShaderSource();
		
	}
	
	for(var i = 0; i < numBoxes; i++){
		var box = clipBoxes[i];
		
		this.uniforms.clipBoxes.value.set(box.elements, 16*i);
	}
	
	
};

Object.defineProperty(Potree.PointCloudMaterial.prototype, "spacing", {
	get: function(){
		return this.uniforms.spacing.value;
	},
	set: function(value){
		if(this.uniforms.spacing.value !== value){
			this.uniforms.spacing.value = value;
			//this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "blendDepth", {
	get: function(){
		return this.uniforms.blendDepth.value;
	},
	set: function(value){
		if(this.uniforms.blendDepth.value !== value){
			this.uniforms.blendDepth.value = value;
			//this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "useClipBox", {
	get: function(){
		return this._useClipBox;
	},
	set: function(value){
		if(this._useClipBox !== value){
			this._useClipBox = value;
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "weighted", {
	get: function(){
		return this._weighted;
	},
	set: function(value){
		if(this._weighted !== value){
			this._weighted = value;
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "fov", {
	get: function(){
		return this.uniforms.fov.value;
	},
	set: function(value){
		if(this.uniforms.fov.value !== value){
			this.uniforms.fov.value = value;
			//this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "screenWidth", {
	get: function(){
		return this.uniforms.screenWidth.value;
	},
	set: function(value){
		if(this.uniforms.screenWidth.value !== value){
			this.uniforms.screenWidth.value = value;
			//this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "screenHeight", {
	get: function(){
		return this.uniforms.screenHeight.value;
	},
	set: function(value){
		if(this.uniforms.screenHeight.value !== value){
			this.uniforms.screenHeight.value = value;
			//this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "near", {
	get: function(){
		return this.uniforms.near.value;
	},
	set: function(value){
		if(this.uniforms.near.value !== value){
			this.uniforms.near.value = value;
			//this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "far", {
	get: function(){
		return this.uniforms.far.value;
	},
	set: function(value){
		if(this.uniforms.far.value !== value){
			this.uniforms.far.value = value;
			//this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "opacity", {
	get: function(){
		return this.uniforms.opacity.value;
	},
	set: function(value){
		if(this.uniforms.opacity.value !== value){
			this.uniforms.opacity.value = value;
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "octreeLevels", {
	get: function(){
		return this._octreeLevels;
	},
	set: function(value){
		if(this._octreeLevels !== value){
			this._octreeLevels = value;
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "pointColorType", {
	get: function(){
		return this._pointColorType;
	},
	set: function(value){
		if(this._pointColorType !== value){
			this._pointColorType = value;
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "depthMap", {
	get: function(){
		return this._depthMap;
	},
	set: function(value){
		if(this._depthMap !== value){
			this._depthMap = value;
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "pointSizeType", {
	get: function(){
		return this._pointSizeType;
	},
	set: function(value){
		if(this._pointSizeType !== value){
			this._pointSizeType = value;
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "clipMode", {
	get: function(){
		return this._clipMode;
	},
	set: function(value){
		if(this._clipMode !== value){
			this._clipMode = value;
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "interpolate", {
	get: function(){
		return this._interpolate;
	},
	set: function(value){
		if(this._interpolate !== value){
			this._interpolate = value;
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "color", {
	get: function(){
		return this.uniforms.uColor.value;
	},
	set: function(value){
		if(this.uniforms.uColor.value !== value){
			this.uniforms.uColor.value.copy(value);
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "pointShape", {
	get: function(){
		return this._pointShape;
	},
	set: function(value){
		if(this._pointShape !== value){
			this._pointShape = value;
			this.updateShaderSource();
		}
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

Object.defineProperty(Potree.PointCloudMaterial.prototype, "pcIndex", {
	get: function(){
		return this.uniforms.pcIndex.value;
	},
	set: function(value){
		this.uniforms.pcIndex.value = value;
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
    gradient.addColorStop(0, "#4700b6");
    gradient.addColorStop(1/6, 'blue');
    gradient.addColorStop(2/6, 'aqua');
    gradient.addColorStop(3/6, 'green')
    gradient.addColorStop(4/6, 'yellow');
    gradient.addColorStop(5/6, 'orange');
	gradient.addColorStop(1, 'red');
 
    
	context.fillStyle = gradient;
	context.fill();
	
	var texture = new THREE.Texture( canvas );
	texture.needsUpdate = true;
	textureImage = texture.image;

	return texture;
}

Potree.PointCloudMaterial.vs_points = [
 "precision mediump float;                                                           ",
 "precision mediump int;                                                             ",
 "                                                                                   ",
 "attribute vec3 position;                                                           ",
 "attribute vec3 color;                                                              ",
 "attribute float intensity;                                                         ",
 "attribute float classification;                                                    ",
 "attribute float returnNumber;                                                      ",
 "attribute float pointSourceID;                                                     ",
 "attribute vec4 indices;                                                            ",
 "                                                                                   ",
 "uniform mat4 modelMatrix;                                                          ",
 "uniform mat4 modelViewMatrix;                                                      ",
 "uniform mat4 projectionMatrix;                                                     ",
 "uniform mat4 viewMatrix;                                                           ",
 "uniform mat3 normalMatrix;                                                         ",
 "uniform vec3 cameraPosition;                                                       ",
 "uniform float screenWidth;                                                         ",
 "uniform float screenHeight;                                                        ",
 "uniform float fov;                                                                 ",
 "uniform float spacing;                                                             ",
 "uniform float blendDepth;                                                             ",
 "uniform float near;                                                                ",
 "uniform float far;                                                                 ",
 "                                                                                   ",
 "#if defined use_clip_box                                                                                   ",
 "	uniform mat4 clipBoxes[clip_box_count];                                                                                   ",
 "#endif                                                                                   ",
 "                                                                                   ",
 "                                                                                   ",
 "uniform float heightMin;                                                           ",
 "uniform float heightMax;                                                           ",
 "uniform float intensityMin;                                                        ",
 "uniform float intensityMax;                                                        ",
 "uniform float size;                                                                ",
 "uniform float minSize;                                                             ",
 "uniform float nodeSize;                                                            ",
 "uniform vec3 uColor;                                                               ",
 "uniform float opacity;                                                                                   ",
 "                                                                                   ",
 "                                                                                   ",
 "uniform sampler2D visibleNodes;                                                    ",
 "uniform sampler2D gradient;                                                        ",
 "uniform sampler2D depthMap;                                                        ",
 "                                                                                   ",
 "varying float vOpacity;                                                                                   ",
 "varying vec3 vColor;                                                               ",
 "varying float vDepth;                                                                                   ",
 "varying float vLinearDepth;                                                                                   ",
 "                                                                                   ",
 "                                                                                   ",
 "#if defined(adaptive_point_size) || defined(color_type_octree_depth)               ",
 "/**                                                                                ",
 " * number of 1-bits up to inclusive index position                                 ",
 " * number is treated as if it were an integer in the range 0-255                   ",
 " *                                                                                 ",
 " */                                                                                ",
 "float numberOfOnes(float number, float index){                                     ",
 "	float tmp = mod(number, pow(2.0, index + 1.0));                                  ",
 "	float numOnes = 0.0;                                                             ",
 "	for(float i = 0.0; i < 8.0; i++){                                                ",
 "		if(mod(tmp, 2.0) != 0.0){                                                    ",
 "			numOnes++;                                                               ",
 "		}                                                                            ",
 "		tmp = floor(tmp / 2.0);                                                      ",
 "	}                                                                                ",
 "	return numOnes;                                                                  ",
 "}                                                                                  ",
 "                                                                                   ",
 "                                                                                   ",
 "/**                                                                                ",
 " * checks whether the bit at index is 1                                            ",
 " * number is treated as if it were an integer in the range 0-255                   ",
 " *                                                                                 ",
 " */                                                                                ",
 "bool isBitSet(float number, float index){                                          ",
 "	return mod(floor(number / pow(2.0, index)), 2.0) != 0.0;                         ",
 "}                                                                                  ",
 "                                                                                   ",
 "                                                                                   ",
 "/**                                                                                ",
 " * find the octree depth at the point position                                     ",
 " */                                                                                ",
 "float getOctreeDepth(){                                                            ",
 "	vec3 offset = vec3(0.0, 0.0, 0.0);                                               ",
 "	float iOffset = 0.0;                                                             ",
 "	float depth = 0.0;                                                               ",
 "	for(float i = 0.0; i <= octreeLevels + 1.0; i++){                                ",
 "		                                                                             ",
 "		float nodeSizeAtLevel = nodeSize / pow(2.0, i);                              ",
 "		vec3 index3d = (position - offset) / nodeSizeAtLevel;                        ",
 "		index3d = floor(index3d + 0.5);                                              ",
 "		float index = 4.0*index3d.x + 2.0*index3d.y + index3d.z;                     ",
 "		                                                                             ",
 "		vec4 value = texture2D(visibleNodes, vec2(iOffset / 2048.0, 0.0));           ",
 "		float mask = value.r * 255.0;                                                ",
 "		if(isBitSet(mask, index)){                                                   ",
 "			// there are more visible child nodes at this position                   ",
 "			iOffset = iOffset + value.g * 255.0 + numberOfOnes(mask, index - 1.0);   ",
 "			depth++;                                                                 ",
 "		}else{                                                                       ",
 "			// no more visible child nodes at this position                          ",
 "			return depth;                                                            ",
 "		}                                                                            ",
 "		offset = offset + (vec3(1.0, 1.0, 1.0) * nodeSizeAtLevel * 0.5) * index3d;   ",
 "	}                                                                                ",
 "		                                                                             ",
 "	return depth;                                                                    ",
 "}                                                                                  ",
 "                                                                                   ",
 "#endif                                                                             ",
 "                                                                                   ",
 "vec3 classificationColor(float classification){                                                                                   ",
 "	vec3 color = vec3(0.0, 0.0, 0.0);                                                                                   ",
 "  float c = mod(classification, 16.0);                                                                                   ",
 "	if(c == 0.0){ ",
 "	   color = vec3(0.5, 0.5, 0.5); ",
 "	}else if(c == 1.0){ ",
 "	   color = vec3(0.5, 0.5, 0.5); ",
 "	}else if(c == 2.0){ ",
 "	   color = vec3(0.63, 0.32, 0.18); ",
 "	}else if(c == 3.0){ ",
 "	   color = vec3(0.0, 1.0, 0.0); ",
 "	}else if(c == 4.0){ ",
 "	   color = vec3(0.0, 0.8, 0.0); ",
 "	}else if(c == 5.0){ ",
 "	   color = vec3(0.0, 0.6, 0.0); ",
 "	}else if(c == 6.0){ ",
 "	   color = vec3(1.0, 0.66, 0.0); ",
 "	}else if(c == 7.0){ ",
 "	   color = vec3(1.0, 0, 1.0); ",
 "	}else if(c == 8.0){ ",
 "	   color = vec3(1.0, 0, 0.0); ",
 "	}else if(c == 9.0){ ",
 "	   color = vec3(0.0, 0.0, 1.0); ",
 "	}else if(c == 12.0){ ",
 "	   color = vec3(1.0, 1.0, 0.0); ",
 "	}else{ ",
 "	   color = vec3(0.3, 0.6, 0.6); ",
 "	} ",
 "	                                                                                   ",
 "	return color;                                                                                   ",
 "}                                                                                   ",
 "                                                                                   ",
 "void main() {                                                                      ",
 "                                                                                   ",
 "	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );                       ",
 "	gl_Position = projectionMatrix * mvPosition;                                     ",
 "  //float pw = gl_Position.w;                                                                                 ",
 "  //float pd = gl_Position.z;                                                                                 ",
 "  //gl_Position = gl_Position / pw;                                                                                 ",
 "  //gl_Position.z = 2.0*((pw - near) / far)-1.0;                                                                                 ",
 "  vOpacity = opacity;                                                                                 ",
 "  vLinearDepth = -mvPosition.z;                                                                                 ",
 "  vDepth = mvPosition.z / gl_Position.w;                                                                                 ",
 "                                                                                   ",
 "  // COLOR TYPES                                                                   ",
 "                                                                                   ",
 "  #ifdef color_type_rgb                                                            ",
 "		vColor = color;                                                              ",
 "  #elif defined color_type_height                                                  ",
 "      vec4 world = modelMatrix * vec4( position, 1.0 );                            ",
 "      float w = (world.y - heightMin) / (heightMax-heightMin);                     ",
 "                                                                                   ",
 "  	vColor = texture2D(gradient, vec2(w,1.0-w)).rgb;                             ",
 "  #elif defined color_type_depth                                                   ",
 "      float d = -mvPosition.z ;                                                                             ",
 "      vColor = vec3(d, vDepth, 0.0);                                                                             ",
 "  #elif defined color_type_intensity                                               ",
 "      float w = (intensity - intensityMin) / intensityMax;                         ",
 "		vColor = vec3(w, w, w);                                                      ",
 "  	//vColor = texture2D(gradient, vec2(w,1.0-w)).rgb;                           ",
 "  #elif defined color_type_intensity_gradient                                      ",
 "      float w = (intensity - intensityMin) / intensityMax;                         ",
 "  	vColor = texture2D(gradient, vec2(w,1.0-w)).rgb;                             ",
 "  #elif defined color_type_color                                                   ",
 "  	vColor = uColor;                                                             ",
 "  #elif defined color_type_octree_depth                                            ",
 "  	float depth = getOctreeDepth();                                              ",
 "      float w = depth / 10.0;                                                      ",
 "  	vColor = texture2D(gradient, vec2(w,1.0-w)).rgb;                             ",
 "  #elif defined color_type_point_index                                             ",
 "  	vColor = indices.rgb;                                                        ",
 "  #elif defined color_type_classification                                             ",
 "  	vColor = classificationColor(classification);                               ",
 "  #elif defined color_type_return_number                                             ",
 "      float w = (returnNumber - 1.0) / 4.0 + 0.1;                                                      ",
 "  	vColor = texture2D(gradient, vec2(w, 1.0 - w)).rgb;                             ",
 "  #elif defined color_type_source                                             ",
 "      float w = mod(pointSourceID, 10.0) / 10.0;                                                                             ",
 "  	vColor = texture2D(gradient, vec2(w,1.0 - w)).rgb;                               ",
 "  #endif                                                                           ",
 "                                                                                   ",
 "                                                                                   ",
 "                                                                                   ",
 "  //                                                                               ",
 "  // POINT SIZE TYPES                                                              ",
 "  //                                                                               ",
 "  float r = spacing * 1.5;                                                                                 ",
 "  #if defined fixed_point_size                                                     ",
 "  	gl_PointSize = size;                                                         ",
 "  #elif defined attenuated_point_size                                              ",
 "		//gl_PointSize = size * ( 300.0 / length( mvPosition.xyz ) );                  ",
 "      gl_PointSize = (1.0 / tan(fov/2.0)) * size / (-mvPosition.z);                                                                                 ",
 "      gl_PointSize = gl_PointSize * screenHeight / 2.0;                                                                              ",
 "  #elif defined adaptive_point_size                                                ",
 "      //gl_PointSize = size * ( 300.0 / length( mvPosition.xyz ) );                  ",
 "      //gl_PointSize = (1.0 / tan(fov/2.0)) * r / sqrt( max(0.0, mvPosition.z * mvPosition.z - r * r));                                                                                 ",
 "      gl_PointSize = (1.0 / tan(fov/2.0)) * r / (-mvPosition.z);                                                                                 ",
 "      gl_PointSize = size * gl_PointSize * screenHeight / 2.0;                                                                              ",
 "  	gl_PointSize = gl_PointSize / pow(1.9, getOctreeDepth());                    ",
 "  #endif                                                                           ",
 "                                                                                    ",
 "	gl_PointSize = max(minSize, gl_PointSize);                                       ",
 "	gl_PointSize = min(50.0, gl_PointSize);                                          ",
 "                                                                                     ",
 "  // clip box                                                                                  ",
 "  #if defined use_clip_box                                                                                 ",
 "      bool insideAny = false;                                                                               ",
 "      for(int i = 0; i < clip_box_count; i++){                                                                               ",
 "      	vec4 clipPosition = clipBoxes[i] * modelMatrix * vec4( position, 1.0 );                                                                                     ",
 "      	bool inside = -0.5 <= clipPosition.x && clipPosition.x <= 0.5;                                                                             ",
 "      	inside = inside && -0.5 <= clipPosition.y && clipPosition.y <= 0.5;                                                                             ",
 "      	inside = inside && -0.5 <= clipPosition.z && clipPosition.z <= 0.5;                                                                             ",
 "      	insideAny = insideAny || inside;                                                                               ",
 "      }                                                                               ",
 "      if(!insideAny){                                                                               ",
 "                                                                                     ",
 "          #if defined clip_outside                                                                           ",
 "      		gl_Position = vec4(1000.0, 1000.0, 1000.0, 1.0);                                                                               ",
 "          #elif defined clip_highlight_inside && !defined(color_type_depth)                                                                           ",
 "         		float c = (vColor.r + vColor.g + vColor.b) / 6.0;                                                                           ",
 "          	//vColor = vec3(c, c, c);                                                                           ",
 "          #endif                                                                           ",
 "      }else{                                                                               ",
 "      	#if defined clip_highlight_inside                                                                               ",
 "      	vColor.r += 0.5;                                                                               ",
 "          #endif                                                                           ",
 "      }                                                                               ",
 "                                                                                     ",
 "  #endif                                                                                  ",
 "                                                                                   ",
 "                                                                                   ",
 "}                                                                                  "];

Potree.PointCloudMaterial.fs_points_rgb = [
 "#if defined use_interpolation                                                      ",
 "	#extension GL_EXT_frag_depth : enable                                            ",
 "#endif                                                                             ",
 "                                                                                   ",
 "precision mediump float;                                                             ",
 "precision mediump int;                                                               ",
 "                                                                                   ",
 "//uniform float opacity;                                                             ",
 "uniform float pcIndex;                                                             ",
 "uniform float screenWidth;                                                         ",
 "uniform float screenHeight;                                                        ",
 "uniform float blendDepth;                                                                                   ",
 "                                                                                   ",
 "uniform sampler2D depthMap;                                                                                   ",
 "                                                                                   ",
 "varying vec3 vColor;                                                               ",
 "varying float vOpacity;                                                                                    ",
 "varying float vLinearDepth;                                                                                    ",
 "varying float vDepth;                                                                                    ",
 "                                                                                   ",
 "void main() {                                                                      ",
 "	                                                                                 ",
 "	#if defined(circle_point_shape) || defined(use_interpolation) || defined (weighted_splats)                    ",
 "		float a = pow(2.0*(gl_PointCoord.x - 0.5), 2.0);                             ",
 "		float b = pow(2.0*(gl_PointCoord.y - 0.5), 2.0);                             ",
 "		float c = 1.0 - (a + b);                                                     ",
 "  	                                                                             ",
 "		if(c < 0.0){                                                                 ",
 "			discard;                                                                 ",
 "		}                                                                            ",
 "	#endif                                                                           ",
 "		                                                                                 ",
 "	#if defined weighted_splats                                                                                  ",
 "		vec2 uv = gl_FragCoord.xy / vec2(screenWidth, screenHeight);                                                                                 ",
 "		                                                                                 ",
 "	    float depth = texture2D(depthMap, uv).r;                                                                             ",
 "	    if(vLinearDepth > depth + blendDepth){                                                                             ",
 "	    	discard;                                                                             ",
 "	    }                                                                             ",
 "	#endif                                                                                 ",
 "	                                                                                 ",
 "	#if defined use_interpolation                                                    ",
 "		gl_FragDepthEXT = gl_FragCoord.z + 0.002*(1.0-pow(c, 1.0)) * gl_FragCoord.w; ",
 "	#endif                                                                           ",
 "	                                                                                 ",
 "	                                                                                 ",
 "	#if defined color_type_point_index                                               ",
 "		gl_FragColor = vec4(vColor, pcIndex / 255.0);                                ",
 "	#else                                                                            ",
 "		gl_FragColor = vec4(vColor, vOpacity);                                        ",
 "	#endif                                                                           ",
 "	                                                                                 ",
 "	                                                                                 ",
 "	#if defined weighted_splats                                                                                 ",
 "	    float w = pow(c, 2.0);                                                                             ",
 "		gl_FragColor.rgb = gl_FragColor.rgb * w;                                                                                 ",
 "		gl_FragColor.a = w;                                                                                 ",
 "	#endif                                                                                 ",
 "	                                                                                 ",
 "	                                                                                 ",
 "	                                                                                 ",
 "}                                                                                  "];

