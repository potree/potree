
/**
 * Specify how points are to be shaded
 * 
 * @class
 */
var IlluminationMode = {
		FLAT 	 : {value:0, name: "Flat"},
		PHONG	 : {value:1, name: "Phong"},
		NORMALS	 : {value:2, name: "Normals"},
		POSITION : {value:3, name: "Position"} 
};

/**
 * specify how points are to be rasterized
 * 
 * @class
 */
var PointCloudRenderMode = {
		FIXED_CIRCLE 	: {value:0, name: "fixed circle"},
		WEIGHTED_CIRCLE	: {value:1, name: "weighted circle"},
		FILTERED_SPLAT 	: {value:3, name: "filtered splat"},
		GAUSS_FILL : {value:4, name: "gauss fill"}
};

/**
 * Eierlegende wollmilchsau.
 * combines different materials.
 * 
 * @param name
 * @class
 * @augments Material
 * @author Markus Schuetz
 */
function PointCloudMaterial(name){
	Material.call(this, name);
	
	this.renderMode = PointCloudRenderMode.WEIGHTED_CIRCLE;
	
	if(FilteredSplatsMaterial.isSupported()){
		this.filteredMaterial = new FilteredSplatsMaterial(name + "_filtered");
	}else{
		this.filteredMaterial = null;
	}
	this.weightedMaterial = new WeightedPointSizeMaterial(name + "_weighted");
	this.fixedMaterial = new FixedPointSizeMaterial(name + "_fixed");
	
	if(GaussFillMaterial.isSupported()){
		this.gaussFillMaterial = new GaussFillMaterial(name + "_fill");
	}else{
		this.gaussFillMaterial = null;
	}
	
	this.activeMaterial = this.weightedMaterial;
	this.pointSize = 0.2;
	this.blendDepth = 0.1;
	this.illuminationMode = IlluminationMode.FLAT;
}

PointCloudMaterial.prototype = new Material(inheriting);

PointCloudMaterial.prototype.render = function(sceneNode, renderer){
	if(renderer.fboDepthAsRGBA != null){
		this.weightedMaterial.render(sceneNode, renderer);
	}else{
		this.activeMaterial.render(sceneNode, renderer);
	}
};

Object.defineProperty(PointCloudMaterial.prototype, 'renderMode', {
	set: function(renderMode){
		this._renderMode = renderMode;
		
		if(this.renderMode === PointCloudRenderMode.FIXED_CIRCLE){
			this.activeMaterial = this.fixedMaterial;
		}else if(this.renderMode === PointCloudRenderMode.WEIGHTED_CIRCLE){
			this.activeMaterial = this.weightedMaterial;
		}else if(this.renderMode === PointCloudRenderMode.FILTERED_SPLAT){
			if(FilteredSplatsMaterial.isSupported()){
				this.activeMaterial = this.filteredMaterial;
			}else{
				this.activeMaterial = this.weightedMaterial;
				console.log("FILTERED_SPLAT material is not supported on your system. ");
			}
		}else if(this.renderMode === PointCloudRenderMode.GAUSS_FILL){
			if(GaussFillMaterial.isSupported()){
				this.activeMaterial = this.gaussFillMaterial;
			}else{
				this.activeMaterial = this.weightedMaterial;
				console.log("GAUSS_FILL material is not supported on your system. ");
			}
		}
	},
	get: function(){
		return this._renderMode;
	}
});

Object.defineProperty(PointCloudMaterial.prototype, 'pointSize', {
	set: function(pointSize){
		this._pointSize = pointSize;
		if(this.filteredMaterial !== null){
			this.filteredMaterial.pointSize = pointSize;
		}
		this.weightedMaterial.pointSize = pointSize;
		this.fixedMaterial.pointSize = pointSize;
		if(this.gaussFillMaterial !== null){
			this.gaussFillMaterial.pointSize = pointSize;
		}
	},
	get: function(){
		return this._pointSize;
	}
});

Object.defineProperty(PointCloudMaterial.prototype, 'blendDepth', {
	set: function(blendDepth){
		this._blendDepth = blendDepth;
		if(this.filteredMaterial != null){
			this.filteredMaterial.blendDepth = blendDepth;
		}
	},
	get: function(){
		return this._blendDepth;
	}
});

Object.defineProperty(PointCloudMaterial.prototype, 'illuminationMode', {
	set: function(illuminationMode){
		this._illuminationMode = illuminationMode;
		if(FilteredSplatsMaterial.isSupported()){
			this.filteredMaterial.illuminationMode = illuminationMode;
		}
		this.weightedMaterial.illuminationMode = illuminationMode;
		this.fixedMaterial.illuminationMode = illuminationMode;
	},
	get: function(){
		return this._illuminationMode;
	}
});
