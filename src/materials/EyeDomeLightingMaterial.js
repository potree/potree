
//
// Algorithm by Christian Boucheny
// shader code taken and adapted from CloudCompare
//
// see
// https://github.com/cloudcompare/trunk/tree/master/plugins/qEDL/shaders/EDL
// http://www.kitware.com/source/home/post/9
// https://tel.archives-ouvertes.fr/tel-00438464/document p. 115+ (french)




Potree.EyeDomeLightingMaterial = function(parameters){
	THREE.Material.call( this );

	parameters = parameters || {};
	
	this._neighbourCount = 4;
	this.neighbours = new Float32Array(this.neighbourCount*2);
	for(var c = 0; c < this.neighbourCount; c++){
		this.neighbours[2*c+0] = Math.cos(2 * c * Math.PI / this.neighbourCount);
		this.neighbours[2*c+1] = Math.sin(2 * c * Math.PI / this.neighbourCount);
	}
	
	//var lightDir = new THREE.Vector3(0.0, 0.0, 1.0).normalize();
	
	var uniforms = {
		screenWidth: 	{ type: "f", 	value: 0 },
		screenHeight: 	{ type: "f", 	value: 0 },
		edlStrength: 		{ type: "f", 	value: 1.0 },
		radius: 		{ type: "f", 	value: 1.0 },
		neighbours:		{ type: "2fv", 	value: this.neighbours },
		depthMap: 		{ type: "t", 	value: null },
		colorMap: 		{ type: "t", 	value: null },
		opacity:		{ type: "f",	value: 1.0}
	};
	
	this.setValues({
		uniforms: uniforms,
		vertexShader: this.getDefines() + Potree.Shaders["edl.vs"],
		fragmentShader: this.getDefines() + Potree.Shaders["edl.fs"],
		lights: false
	});
	
};


Potree.EyeDomeLightingMaterial.prototype = new THREE.ShaderMaterial();


Potree.EyeDomeLightingMaterial.prototype.getDefines = function(){
	var defines = "";
	
	defines += "#define NEIGHBOUR_COUNT " + this.neighbourCount + "\n";

	return defines;
};

Potree.EyeDomeLightingMaterial.prototype.updateShaderSource = function(){
	var attributes = {};
	
	let PC = Potree.PointColorType;
	
	if([PC.INTENSITY, PC.INTENSITY_GRADIENT].includes(this.pointColorType)){
		attributes.intensity = { type: "f", value: [] };
	}else if(this.pointColorType === PC.CLASSIFICATION){
		//attributes.classification = { type: "f", value: [] };
	}else if(this.pointColorType === PC.RETURN_NUMBER){
		attributes.returnNumber = { type: "f", value: [] };
		attributes.numberOfReturns = { type: "f", value: [] };
	}else if(this.pointColorType === PC.SOURCE){
		attributes.pointSourceID = { type: "f", value: [] };
	}else if(this.pointColorType === PC.NORMAL || this.pointColorType === Potree.PointColorType.PHONG){
		attributes.normal = { type: "f", value: [] };
	}
	attributes.classification = { type: "f", value: 0 };
	
	var vs = this.getDefines() + Potree.Shaders["edl.vs"];
	var fs = this.getDefines() + Potree.Shaders["edl.fs"];

	this.setValues({
		vertexShader: vs,
		fragmentShader: fs
	});
	
	this.uniforms.neighbours.value = this.neighbours;
		
	this.needsUpdate = true;
};

Object.defineProperty(Potree.EyeDomeLightingMaterial.prototype, "neighbourCount", {
	get: function(){
		return this._neighbourCount;
	},
	set: function(value){
		if(this._neighbourCount !== value){
			this._neighbourCount = value;
			this.neighbours = new Float32Array(this._neighbourCount*2);
			for(var c = 0; c < this._neighbourCount; c++){
				this.neighbours[2*c+0] = Math.cos(2 * c * Math.PI / this._neighbourCount);
				this.neighbours[2*c+1] = Math.sin(2 * c * Math.PI / this._neighbourCount);
			}
			
			this.updateShaderSource();
		}
	}
});








