

/**
 * 
 * @class
 * @see http://graphics.ucsd.edu/~matthias/Papers/HighQualitySplattingOnGPUs.pdf
 * 
 */
function GaussFillMaterial(name){
	if(!GaussFillMaterial.isSupported()){
		throw new Error("GaussFillMaterial is not supported on your system. OES_texture_float extension is not available.");
	}
	
	Material.call(this, name);
	this.depthShader = new Shader(name + "_depth", "gaussFill/gaussFillDepthPass.vs", "gaussFill/gaussFillDepthPass.fs");
	this.colorShader = new Shader(name + "_filtered_color", "gaussFill/gaussFillPointsPass.vs", "gaussFill/gaussFillPointsPass.fs");
	this.spreadXShader = new Shader(name + "_spreadX", "drawTexture.vs", "gaussFill/gaussFillSpreadXPass.fs");
	this.spreadYShader = new Shader(name + "_spreadY", "drawTexture.vs", "gaussFill/gaussFillSpreadYPass.fs");
	this.normalizationShader = new Shader(name + "normalization", "drawTexture.vs", "gaussFill/gaussFillNormalizationPass.fs");
	this.depthFBO = new Framebuffer(Potree.canvas.width, Potree.canvas.height);
	this.colorFBO = new Framebuffer(Potree.canvas.width, Potree.canvas.height);
	this.spreadXFBO = new FramebufferFloat32(Potree.canvas.width, Potree.canvas.height);
	this.spreadYFBO = new FramebufferFloat32(Potree.canvas.width, Potree.canvas.height);
	
	this.illuminationMode = IlluminationMode.PHONG;
	this.pointSize = 1.0;
	this.blendDepth = 0.1;
	
	this.gaussKernel = [0.0216149, 0.0439554, 0.0778778, 0.118718, 0.153857, 0.167953, 0.153857, 0.118718, 0.0778778, 0.0439554, 0.0216149];
	
	for(var i = 0; i < this.gaussKernel.length; i++){
		this.gaussKernel[i] = Math.pow(this.gaussKernel[i] + 0.1, 20);
	}
}

GaussFillMaterial.prototype = new Material(inheriting);

GaussFillMaterial.isSupported = function(){
	if (gl.getExtension("OES_texture_float") == null) {
		return false;
	}else{
		return true;
	}
}

GaussFillMaterial.prototype.render = function(sceneNode, renderer){
	var transform = sceneNode.globalTransformation;
	var pointClouds = new Array();
	
	if(sceneNode instanceof PointCloudSceneNode){
		pointClouds.push(sceneNode.pointCloud);
	}else if(sceneNode instanceof PointcloudOctreeSceneNode){
		var renderQueue = sceneNode.mno.renderQueue;
		for(var i = 0; i < renderQueue.length; i++){
			var node = renderQueue.get(i);
			pointClouds.push(node.pointCloud);
		}
	}
	this.renderPointClouds(transform, pointClouds, renderer);
};

GaussFillMaterial.prototype.renderPointClouds = function(transform, pointClouds, renderer){
	var oldBuffer = Framebuffer.getActiveBuffer();
	var camera = renderer.camera;
	var lights = renderer.lights;
	
	this.depthPass(transform, pointClouds, camera);
	this.pointsPass(transform, pointClouds, camera);
	this.spreadXPass(transform, pointClouds, camera);
	this.spreadYPass(transform, pointClouds, camera);
	this.normalizationPass(oldBuffer, camera, lights);
	
//	oldBuffer.drawTexture(this.colorFBO.texture, [0,0], [1,1]);
//	oldBuffer.drawTexture(this.normalFBO.texture, [-1,0], [0,1]);
//	oldBuffer.drawTexture(this.depthFBO.texture, [-1,0], [0,1]);
//	oldBuffer.drawTexture(this.depthFBO.texture, [-1,-1], [1,1]);
};

/**
 * create depth map.
 * this pass renders into the depthFBO which is defined as a floating point texture. 
 * linear depth is stored in the first value of each pixel.
 * 
 */
GaussFillMaterial.prototype.depthPass = function(transform, pointClouds, camera){
	
	this.depthFBO.bind();
	this.depthFBO.setSize(Potree.canvas.clientWidth, Potree.canvas.clientHeight);
	gl.viewport(0, 0, Potree.canvas.clientWidth, Potree.canvas.clientHeight);
	gl.clearColor(0,0,0,0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	gl.disable(gl.BLEND);
	gl.enable(gl.DEPTH_TEST);
	gl.depthMask(true);
	
	{// uniforms
		gl.useProgram(this.depthShader.program);
		gl.uniformMatrix4fv(this.depthShader.uniforms.uWorld, false, transform);
		gl.uniformMatrix4fv(this.depthShader.uniforms.uView, false, camera.viewMatrix);
		gl.uniformMatrix4fv(this.depthShader.uniforms.uProj, false, camera.projectionMatrix);
		gl.uniform1f(this.depthShader.uniforms.uPointSize, this.pointSize);
		gl.uniform1f(this.depthShader.uniforms.uNear, camera.nearClipPlane);
		gl.uniform1f(this.depthShader.uniforms.uFar, camera.farClipPlane);
		gl.uniform1f(this.depthShader.uniforms.uBlendDepth, this.blendDepth);
		gl.uniform2f(this.depthShader.uniforms.uWindowSize, Potree.canvas.clientWidth, Potree.canvas.clientHeight);
		
		var nearHeight = 2*camera.nearClipPlane*Math.tan(camera.fieldOfView*Math.PI/360);
		var nearWidth =  nearHeight*camera.aspectRatio;
		gl.uniform2f(this.depthShader.uniforms.uNearWindowSize, nearWidth, nearHeight);
		
	}
	
	for(var i = 0; i < pointClouds.length; i++){
		var pointCloud = pointClouds[i];
		var pointAttributes = pointCloud.pointAttributes;
		
		gl.bindBuffer(gl.ARRAY_BUFFER, pointCloud.vbo);
		var offset = 0;
		for(var j = 0; j < pointAttributes.size; j++){
			var attribute = pointAttributes.attributes[j];
			
			if(attribute === PointAttribute.POSITION_CARTESIAN){
				gl.enableVertexAttribArray(this.depthShader.attributes.aVertexPosition);
				gl.vertexAttribPointer(this.depthShader.attributes.aVertexPosition, 3, gl.FLOAT, false,pointAttributes.byteSize, offset);
			}else if(attribute === PointAttribute.RGBA_PACKED){
				if(this.depthShader.attributes.aVertexColour != null){
					gl.enableVertexAttribArray(this.depthShader.attributes.aVertexColour);
					gl.vertexAttribPointer(this.depthShader.attributes.aVertexColour, 3, gl.UNSIGNED_BYTE, false,pointAttributes.byteSize, offset);
				}
			}else if(attribute === PointAttribute.NORMAL_FLOATS){
				if(this.depthShader.attributes.aNormal != null){
					gl.enableVertexAttribArray(this.depthShader.attributes.aNormal);
					gl.vertexAttribPointer(this.depthShader.attributes.aNormal, 3, gl.FLOAT, false,pointAttributes.byteSize, offset);
				}
			}
			offset += attribute.byteSize;
		}
		
		gl.drawArrays(gl.POINTS, 0, pointCloud.size);
		gl.disableVertexAttribArray(this.depthShader.attributes.aVertexPosition);
		gl.disableVertexAttribArray(this.depthShader.attributes.aVertexColour);
		gl.disableVertexAttribArray(this.depthShader.attributes.aNormal);
	}
	
};

GaussFillMaterial.prototype.pointsPass = function(transform, pointClouds, camera){
	// color fbo
	this.colorFBO.bind();
	this.colorFBO.setSize(Potree.canvas.clientWidth, Potree.canvas.clientHeight);
	gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depthFBO.renderbuffer);
	this.colorFBO.checkBuffer();
	gl.viewport(0, 0, Potree.canvas.clientWidth, Potree.canvas.clientHeight);
	gl.clearColor(0,0,0,0);
	gl.clear(gl.COLOR_BUFFER_BIT);
	gl.disable(gl.BLEND);
	gl.enable(gl.DEPTH_TEST);
//	gl.disable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);
	gl.depthMask(false);
	
	{ // color uniforms
		gl.useProgram(this.colorShader.program);
		gl.uniformMatrix4fv(this.colorShader.uniforms.uWorld, false, transform);
		gl.uniformMatrix4fv(this.colorShader.uniforms.uView, false, camera.viewMatrix);
		gl.uniformMatrix4fv(this.colorShader.uniforms.uProj, false, camera.projectionMatrix);
		gl.uniform1f(this.colorShader.uniforms.uNear, camera.nearClipPlane);
		gl.uniform1f(this.colorShader.uniforms.uFar, camera.farClipPlane);
		gl.uniform1f(this.colorShader.uniforms.uPointSize, this.pointSize);
	}
	
	for(var i = 0; i < pointClouds.length; i++){
		var pointCloud = pointClouds[i];
		var pointAttributes = pointCloud.pointAttributes;
		
		gl.bindBuffer(gl.ARRAY_BUFFER, pointCloud.vbo);
		var offset = 0;
		for(var j = 0; j < pointAttributes.size; j++){
			var attribute = pointAttributes.attributes[j];
			
			if(attribute === PointAttribute.POSITION_CARTESIAN){
				gl.enableVertexAttribArray(this.colorShader.attributes.aVertexPosition);
				gl.vertexAttribPointer(this.colorShader.attributes.aVertexPosition, 3, gl.FLOAT, false,pointAttributes.byteSize, offset);
			}else if(attribute === PointAttribute.RGBA_PACKED){
				if(this.colorShader.attributes.aVertexColour != null){
					gl.enableVertexAttribArray(this.colorShader.attributes.aVertexColour);
					gl.vertexAttribPointer(this.colorShader.attributes.aVertexColour, 3, gl.UNSIGNED_BYTE, false,pointAttributes.byteSize, offset);
				}
			}else if(attribute === PointAttribute.NORMAL_FLOATS){
				if(this.colorShader.attributes.aNormal != null){
					gl.enableVertexAttribArray(this.colorShader.attributes.aNormal);
					gl.vertexAttribPointer(this.colorShader.attributes.aNormal, 3, gl.FLOAT, false,pointAttributes.byteSize, offset);
				}
			}
			offset += attribute.byteSize;
		}
		
		gl.drawArrays(gl.POINTS, 0, pointCloud.size);
		
		gl.disableVertexAttribArray(this.depthShader.attributes.aVertexPosition);
		gl.disableVertexAttribArray(this.depthShader.attributes.aVertexColour);
		gl.disableVertexAttribArray(this.depthShader.attributes.aNormal);
	}
	gl.depthFunc(gl.LESS);
	gl.depthMask(true);
};

GaussFillMaterial.prototype.spreadXPass = function(oldBuffer, camera, lights){
	// color fbo
	this.spreadXFBO.bind();
	this.spreadXFBO.setSize(Potree.canvas.clientWidth, Potree.canvas.clientHeight);
	gl.viewport(0, 0, Potree.canvas.clientWidth, Potree.canvas.clientHeight);
	gl.disable(gl.BLEND);
	
	gl.clearColor(0,0,0,0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	gl.useProgram(this.spreadXShader.program);
	gl.disable(gl.DEPTH_TEST);
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.ONE, gl.ONE);
	
	gl.activeTexture(gl.TEXTURE0 + 1);
	gl.bindTexture(gl.TEXTURE_2D, this.colorFBO.texture.glid);
	gl.uniform1i(this.spreadXShader.uniforms.uColor, 1);
	gl.uniform2f(this.spreadXShader.uniforms.uWindowSize, Potree.canvas.clientWidth, Potree.canvas.clientHeight);
	gl.uniform1fv(this.spreadXShader.uniforms["uKernel[0]"],this.gaussKernel);
	
	this.spreadXFBO.drawFullscreenQuad(this.spreadXShader);
};

GaussFillMaterial.prototype.spreadYPass = function(oldBuffer, camera, lights){
	// color fbo
	this.spreadYFBO.bind();
	this.spreadYFBO.setSize(Potree.canvas.clientWidth, Potree.canvas.clientHeight);
	gl.viewport(0, 0, Potree.canvas.clientWidth, Potree.canvas.clientHeight);
	gl.disable(gl.BLEND);
	
	gl.clearColor(0,0,0,0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	gl.useProgram(this.spreadYShader.program);
	gl.disable(gl.DEPTH_TEST);
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.ONE, gl.ONE);
	
	gl.activeTexture(gl.TEXTURE0 + 1);
	gl.bindTexture(gl.TEXTURE_2D, this.spreadXFBO.texture.glid);
	gl.uniform1i(this.spreadYShader.uniforms.uColor, 1);
	gl.uniform2f(this.spreadYShader.uniforms.uWindowSize, Potree.canvas.clientWidth, Potree.canvas.clientHeight);
	gl.uniform1fv(this.spreadYShader.uniforms["uKernel[0]"],this.gaussKernel);
	
	this.spreadYFBO.drawFullscreenQuad(this.spreadYShader);
};


var startTime = new Date().getTime();

/**
 * normalize output from second pass.
 * rgb values are divided by the weight(stored in the alpha component) and alpha is set to 1. 
 * renders into the buffer which was active before this material was used.
 * 
 */
GaussFillMaterial.prototype.normalizationPass = function(oldBuffer, camera, lights){
	oldBuffer.bind();
	
//	var cColor = Potree.Settings.backgroundColor;
//	gl.clearColor(cColor[0], cColor[1], cColor[2], cColor[3]);
	gl.clearColor(0,0,0,1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	gl.useProgram(this.normalizationShader.program);
	gl.disable(gl.DEPTH_TEST);
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.ONE, gl.ONE);
	
	// color
	gl.activeTexture(gl.TEXTURE0 + 1);
//	gl.bindTexture(gl.TEXTURE_2D, this.colorFBO.texture.glid);
	gl.bindTexture(gl.TEXTURE_2D, this.spreadYFBO.texture.glid);
	gl.uniform1i(this.normalizationShader.uniforms.uColor, 1);
	
	oldBuffer.drawFullscreenQuad(this.normalizationShader);
};
