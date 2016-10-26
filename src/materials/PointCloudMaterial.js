

//
//
//
// how to calculate the radius of a projected sphere in screen space
// http://stackoverflow.com/questions/21648630/radius-of-projected-sphere-in-screen-space
// http://stackoverflow.com/questions/3717226/radius-of-projected-sphere
//

Potree.Gradients = {
	RAINBOW: [
		[0, new THREE.Color(0.278, 0, 0.714)],
		[1/6, new THREE.Color(0, 0, 1)],
		[2/6, new THREE.Color(0, 1, 1)],
		[3/6, new THREE.Color(0, 1, 0)],
		[4/6, new THREE.Color(1, 1, 0)],
		[5/6, new THREE.Color(1, 0.64, 0)],
		[1, new THREE.Color(1, 0, 0)]
	],
	GRAYSCALE: [
		[0, new THREE.Color(0,0,0)],
		[1, new THREE.Color(1,1,1)]
	]
};

Potree.Classification = {
	"DEFAULT": {
		0: 			new THREE.Vector4(0.5, 0.5,0.5, 1.0),
		1: 			new THREE.Vector4(0.5, 0.5,0.5, 1.0),
		2: 			new THREE.Vector4(0.63, 0.32, 0.18, 1.0),
		3: 			new THREE.Vector4(0.0, 1.0, 0.0, 1.0),
		4: 			new THREE.Vector4(0.0, 0.8, 0.0, 1.0),
		5: 			new THREE.Vector4(0.0, 0.6, 0.0, 1.0),
		6: 			new THREE.Vector4(1.0, 0.66, 0.0, 1.0),
		7:			new THREE.Vector4(1.0, 0, 1.0, 1.0),
		8: 			new THREE.Vector4(1.0, 0, 0.0, 1.0),
		9: 			new THREE.Vector4(0.0, 0.0, 1.0, 1.0),
		12:			new THREE.Vector4(1.0, 1.0, 0.0, 1.0),
		"DEFAULT": 	new THREE.Vector4(0.3, 0.6, 0.6, 0.5)
	}
};



Potree.PointSizeType = {
	FIXED: 		0,
	ATTENUATED: 1,
	ADAPTIVE: 	2
};

Potree.PointShape = {
	SQUARE: 0,
	CIRCLE: 1
};

Potree.PointColorType = {
	RGB: 				0,
	COLOR: 				1,
	DEPTH: 				2,
	HEIGHT: 			3,
	ELEVATION: 			3,
	INTENSITY: 			4,
	INTENSITY_GRADIENT:	5,
	LOD: 				6,
	LEVEL_OF_DETAIL: 	6,
	POINT_INDEX: 		7,
	CLASSIFICATION: 	8,
	RETURN_NUMBER: 		9,
	SOURCE: 			10,
	NORMAL: 			11,
	PHONG: 				12,
	RGB_HEIGHT: 		13,
	COMPOSITE: 			50
};

Potree.ClipMode = {
	DISABLED: 			0,
	CLIP_OUTSIDE: 		1,
	HIGHLIGHT_INSIDE:	2
};

Potree.TreeType = {
	OCTREE:				0,
	KDTREE:				1
};

Potree.PointCloudMaterial = function(parameters){
	THREE.Material.call( this );

	parameters = parameters || {};

	this.visibleNodesTexture = Potree.utils.generateDataTexture( 2048, 1, new THREE.Color( 0xffffff ) );
	this.visibleNodesTexture.minFilter = THREE.NearestFilter;
	this.visibleNodesTexture.magFilter = THREE.NearestFilter;
	
	let pointSize = parameters.size || 1.0;
	let minSize = parameters.minSize || 1.0;
	let maxSize = parameters.maxSize || 50.0;
	let treeType = parameters.treeType || Potree.TreeType.OCTREE;
	
	this._pointSizeType = Potree.PointSizeType.ATTENUATED;
	this._pointShape = Potree.PointShape.SQUARE;
	this._interpolate = false;
	this._pointColorType = Potree.PointColorType.RGB;
	this._useClipBox = false;
	this.numClipBoxes = 0;
	this._clipMode = Potree.ClipMode.DISABLED;
	this._weighted = false;
	this._depthMap = null;
	this._gradient = Potree.Gradients.RAINBOW;
	this._classification = Potree.Classification.DEFAULT;
	this.gradientTexture = Potree.PointCloudMaterial.generateGradientTexture(this._gradient);
	this.classificationTexture = Potree.PointCloudMaterial.generateClassificationTexture(this._classification);
	this.lights = false;
	this.fog = false;
	this._treeType = treeType;
	this._useEDL = false;
	
	this.attributes = {
		position: 			{ type: "fv", value: [] },
		color: 				{ type: "fv", value: [] },
		normal: 			{ type: "fv", value: [] },
		intensity: 			{ type: "f", value: [] },
		classification: 	{ type: "f", value: [] },
		returnNumber: 		{ type: "f", value: [] },
		numberOfReturns: 	{ type: "f", value: [] },
		pointSourceID: 		{ type: "f", value: [] },
		normal:				{ type: "f", value: [] }
	};
	
	this.uniforms = {
		spacing:			{ type: "f", value: 1.0 },
		blendHardness:		{ type: "f", value: 2.0 },
		blendDepthSupplement:	{ type: "f", value: 0.0 },
		fov:				{ type: "f", value: 1.0 },
		screenWidth:		{ type: "f", value: 1.0 },
		screenHeight:		{ type: "f", value: 1.0 },
		near:				{ type: "f", value: 0.1 },
		far:				{ type: "f", value: 1.0 },
		uColor:   			{ type: "c", value: new THREE.Color( 0xffffff ) },
		opacity:   			{ type: "f", value: 1.0 },
		size:   			{ type: "f", value: pointSize },
		minSize:   			{ type: "f", value: minSize },
		maxSize:   			{ type: "f", value: maxSize },
		octreeSize:			{ type: "f", value: 0 },
		bbSize:				{ type: "fv", value: [0,0,0] },
		heightMin:			{ type: "f", value: 0.0 },
		heightMax:			{ type: "f", value: 1.0 },
		intensityMin:		{ type: "f", value: 0.0 },
		intensityMax:		{ type: "f", value: 1.0 },
		clipBoxCount:		{ type: "f", value: 0 },
		visibleNodes:		{ type: "t", value: this.visibleNodesTexture },
		pcIndex:   			{ type: "f", value: 0 },
		gradient: 			{ type: "t", value: this.gradientTexture },
		classificationLUT: 	{ type: "t", value: this.classificationTexture },
		clipBoxes:			{ type: "Matrix4fv", value: [] },
		clipBoxPositions:	{ type: "fv", value: null },
		depthMap: 			{ type: "t", value: null },
		diffuse:			{ type: "fv", value: [1,1,1]},
		transition:         { type: "f", value: 0.5 },
		intensityRange:     { type: "fv", value: [0, 65000] },
		intensityGamma:     { type: "f", value: 1 },
		intensityContrast:	{ type: "f", value: 0 },
		intensityBrightness:{ type: "f", value: 0 },
		rgbGamma:     		{ type: "f", value: 1 },
		rgbContrast:		{ type: "f", value: 0 },
		rgbBrightness:		{ type: "f", value: 0 },
		wRGB:				{ type: "f", value: 1 },
		wIntensity:			{ type: "f", value: 0 },
		wElevation:			{ type: "f", value: 0 },
		wClassification:	{ type: "f", value: 0 },
		wReturnNumber:		{ type: "f", value: 0 },
		wSourceID:		{ type: "f", value: 0 },
	};
	
	this.defaultAttributeValues.normal = [0,0,0];
	this.defaultAttributeValues.classification = [0,0,0];
	
	this.vertexShader = this.getDefines() + Potree.Shaders["pointcloud.vs"];
	this.fragmentShader = this.getDefines() + Potree.Shaders["pointcloud.fs"];
	this.vertexColors = THREE.VertexColors;
};

Potree.PointCloudMaterial.prototype = new THREE.RawShaderMaterial();


//Potree.PointCloudMaterial.prototype.copyFrom = function(source){
//	
//	for(let uniform of source.uniforms){
//		this.uniforms.value = source.uniforms.value;
//	}
//	
//	this.pointSizeType = source.pointSizeType;
//	
//};
//
//Potree.PointCloudMaterial.prototype.clone = function(){
//	let material = new Potree.PointCloudMaterial();
//	material.copyFrom(this);
//	
//	return material;
//};

Potree.PointCloudMaterial.prototype.updateShaderSource = function(){
	
	this.vertexShader = this.getDefines() + Potree.Shaders["pointcloud.vs"];
	this.fragmentShader = this.getDefines() + Potree.Shaders["pointcloud.fs"];
	
	if(this.depthMap){
		this.uniforms.depthMap.value = this.depthMap;
		this.depthMap = depthMap;
		//this.setValues({
		//	depthMap: this.depthMap,
		//});
	}
	
	if(this.opacity === 1.0){
		this.blending = THREE.NoBlending;
		this.transparent = false;
		this.depthTest = true;
		this.depthWrite = true;
	}else{
		this.blending = THREE.AdditiveBlending;
		this.transparent = true;
		this.depthTest = false;
		this.depthWrite = true;
	}
		
	if(this.weighted){	
		this.blending = THREE.AdditiveBlending;
		this.transparent = true;
		this.depthTest = true;
		this.depthWrite = false;	
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
	}
	
	if(this.pointShape === Potree.PointShape.SQUARE){
		defines += "#define square_point_shape\n";
	}else if(this.pointShape === Potree.PointShape.CIRCLE){
		defines += "#define circle_point_shape\n";
	}
	
	if(this._interpolate){
		defines += "#define use_interpolation\n";
	}
	
	if(this._useEDL){
		defines += "#define use_edl\n";
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
	}else if(this._pointColorType === Potree.PointColorType.LOD){
		defines += "#define color_type_lod\n";
	}else if(this._pointColorType === Potree.PointColorType.POINT_INDEX){
		defines += "#define color_type_point_index\n";
	}else if(this._pointColorType === Potree.PointColorType.CLASSIFICATION){
		defines += "#define color_type_classification\n";
	}else if(this._pointColorType === Potree.PointColorType.RETURN_NUMBER){
		defines += "#define color_type_return_number\n";
	}else if(this._pointColorType === Potree.PointColorType.SOURCE){
		defines += "#define color_type_source\n";
	}else if(this._pointColorType === Potree.PointColorType.NORMAL){
		defines += "#define color_type_normal\n";
	}else if(this._pointColorType === Potree.PointColorType.PHONG){
		defines += "#define color_type_phong\n";
	}else if(this._pointColorType === Potree.PointColorType.RGB_HEIGHT){
		defines += "#define color_type_rgb_height\n";
	}else if(this._pointColorType === Potree.PointColorType.COMPOSITE){
		defines += "#define color_type_composite\n";
	}
	
	if(this.clipMode === Potree.ClipMode.DISABLED){
		defines += "#define clip_disabled\n";
	}else if(this.clipMode === Potree.ClipMode.CLIP_OUTSIDE){
		defines += "#define clip_outside\n";
	}else if(this.clipMode === Potree.ClipMode.HIGHLIGHT_INSIDE){
		defines += "#define clip_highlight_inside\n";
	}
	
	if(this._treeType === Potree.TreeType.OCTREE){
		defines += "#define tree_type_octree\n";
	}else if(this._treeType === Potree.TreeType.KDTREE){
		defines += "#define tree_type_kdtree\n";
	}
	
	if(this.weighted){
		defines += "#define weighted_splats\n";
	}
	
	if(this.numClipBoxes > 0){
		defines += "#define use_clip_box\n";
	}

	return defines;
};

Potree.PointCloudMaterial.prototype.setClipBoxes = function(clipBoxes){
	if(!clipBoxes){
		return;
	}

	this.clipBoxes = clipBoxes;
	var doUpdate = (this.numClipBoxes != clipBoxes.length) && (clipBoxes.length === 0 || this.numClipBoxes === 0);

	this.numClipBoxes = clipBoxes.length;
	this.uniforms.clipBoxCount.value = this.numClipBoxes;
	
	if(doUpdate){
		this.updateShaderSource();
	}
	
	this.uniforms.clipBoxes.value = new Float32Array(this.numClipBoxes * 16);
	this.uniforms.clipBoxPositions.value = new Float32Array(this.numClipBoxes * 3);
	
	for(var i = 0; i < this.numClipBoxes; i++){
		var box = clipBoxes[i];
		
		this.uniforms.clipBoxes.value.set(box.inverse.elements, 16*i);

		this.uniforms.clipBoxPositions.value[3*i+0] = box.position.x;
		this.uniforms.clipBoxPositions.value[3*i+1] = box.position.y;
		this.uniforms.clipBoxPositions.value[3*i+2] = box.position.z;
	}
};


Object.defineProperty(Potree.PointCloudMaterial.prototype, "gradient", {
	get: function(){
		return this._gradient;
	},
	set: function(value){
		if(this._gradient !== value){
			this._gradient = value;
			this.gradientTexture = Potree.PointCloudMaterial.generateGradientTexture(this._gradient);
			this.uniforms.gradient.value = this.gradientTexture;
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "classification", {
	get: function(){
		return this._classification;
	},
	set: function(value){
		//if(this._classification !== value){
			this._classification = value;
			this.classificationTexture = Potree.PointCloudMaterial.generateClassificationTexture(this._classification);
			this.uniforms.classificationLUT.value = this.classificationTexture;
		//}
	}
});

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
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "opacity", {
	get: function(){
		return this.uniforms.opacity.value;
	},
	set: function(value){
		if(this.uniforms.opacity){
			if(this.uniforms.opacity.value !== value){
				this.uniforms.opacity.value = value;
				this.updateShaderSource();
			}
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

Object.defineProperty(Potree.PointCloudMaterial.prototype, "useEDL", {
	get: function(){
		return this._useEDL;
	},
	set: function(value){
		if(this._useEDL !== value){
			this._useEDL = value;
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


Object.defineProperty(Potree.PointCloudMaterial.prototype, "treeType", {
	get: function(){
		return this._treeType;
	},
	set: function(value){
		if(this._treeType != value){
			this._treeType = value;
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "bbSize", {
	get: function(){
		return this.uniforms.bbSize.value;
	},
	set: function(value){
		this.uniforms.bbSize.value = value;
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

/**
 * Generates a look-up texture for gradient values (height, intensity, ...)
 *
 */
Potree.PointCloudMaterial.generateGradientTexture = function(gradient) {
	var size = 64;

	// create canvas
	canvas = document.createElement( 'canvas' );
	canvas.width = size;
	canvas.height = size;

	// get context
	var context = canvas.getContext( '2d' );

	// draw gradient
	context.rect( 0, 0, size, size );
	var ctxGradient = context.createLinearGradient( 0, 0, size, size );
	
	for(var i = 0;i < gradient.length; i++){
		var step = gradient[i];
		
		ctxGradient.addColorStop(step[0], "#" + step[1].getHexString());
	} 
    
	context.fillStyle = ctxGradient;
	context.fill();
	
	var texture = new THREE.Texture( canvas );
	texture.needsUpdate = true;
	textureImage = texture.image;

	return texture;
};

/**
 * Generates a look up texture for classification colors
 *
 */
Potree.PointCloudMaterial.generateClassificationTexture  = function(classification){
	var width = 256;
	var height = 256;
	var size = width*height;
	
	var data = new Uint8Array(4*size);
	
	for(var x = 0; x < width; x++){
		for(var y = 0; y < height; y++){
			var u = 2 * (x / width) - 1;
			var v = 2 * (y / height) - 1;
			
			var i = x + width*y;
			
			var color;
			if(classification[x]){
				color = classification[x];
			}else{
				color = classification.DEFAULT;
			}
			
			
			data[4*i+0] = 255 * color.x;
			data[4*i+1] = 255 * color.y;
			data[4*i+2] = 255 * color.z;
			data[4*i+3] = 255 * color.w;
		}
	}
	
	var texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
	texture.magFilter = THREE.NearestFilter;
	texture.needsUpdate = true;
	
	return texture;
};