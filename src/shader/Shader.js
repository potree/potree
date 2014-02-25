
/**
 * @class
 * This class is meant to be subclassed for every glsl shader.
 * uniforms and attributes have to be specified in initUniforms and initAttributes
 * 
 */
function Shader(name, vertexShader, fragmentShader){
	if (arguments[0] === inheriting) return;
	
	if(name == null){
		name = "Shader_" + Shader.count;
	}
	
	this.vertexShaderName = null;
	this.fragmentShaderName = null;
	this.program = null;
	this.name = name;
	this.setVertexShaderName(vertexShader);
	this.setFragmentShaderName(fragmentShader);
	
	this.relink();
	this.initUniforms();
	this.initAttributes();
	
	ShaderManager.addShader(this);
	
	Shader.count++;
}

Shader.count = 0;

/**
 * List of possible shader attributes
 * 
 * @class
 */
function ShaderAttribute(){}

ShaderAttribute.Position = 	"aVertexPosition";
ShaderAttribute.Color = 	"aVertexColor";
ShaderAttribute.Normal = 	"aVertexNormal";

Shader.prototype.initUniforms = function(){
	this.uniforms = {};
	var count = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
	for(var i = 0; i < count; i++){
		var info = gl.getActiveUniform(this.program, i);
		var name = info.name;
		this.uniforms[name] = gl.getUniformLocation(this.program, name);
	}
};

Shader.prototype.initAttributes = function(){
	this.attributes = {};
	var count = gl.getProgramParameter(this.program, gl.ACTIVE_ATTRIBUTES);
	for(var i = 0; i < count; i++){
		var info = gl.getActiveAttrib(this.program, i);
		var name = info.name;
		this.attributes[name] = gl.getAttribLocation(this.program, name);
	}
};

Shader.prototype.relink = function(){
	if(this.vertexShaderName == null){
		console.log("Shader.vertexShaderName is null -> Shader won't be linked");
	}
	if(this.fragmentShaderName == null){
		console.log("Shader.fragmentShaderName is null -> Shader won't be linked");
	}
	
	if(this.program !== null){
		gl.deleteProgram(program);
	}
	this.program = gl.createProgram();
	var vertexShader = ShaderManager.getVertexShader(this.vertexShaderName);
	var fragmentShader = ShaderManager.getFragmentShader(this.fragmentShaderName);
	gl.attachShader(this.program, vertexShader);
	gl.attachShader(this.program, fragmentShader);
	
	gl.linkProgram(this.program);
	if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
		console.log(gl.getProgramInfoLog(this.program));
		return;
	}
};

Shader.prototype.setVertexShaderName = function(name){
	this.vertexShaderName = name;
};

Shader.prototype.setFragmentShaderName = function(name){
	this.fragmentShaderName = name;
};

