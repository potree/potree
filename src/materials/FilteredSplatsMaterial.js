

/**
 * Implementation of the "High-Quality Splatting on Today's GPUs" paper.
 * 
 * @class
 * @see http://graphics.ucsd.edu/~matthias/Papers/HighQualitySplattingOnGPUs.pdf
 * 
 */
function FilteredSplatsMaterial(name){
	if(!FilteredSplatsMaterial.isSupported()){
		throw new Error("FilteredSplatsMaterial is not supported on your system. OES_texture_float extension is not available.");
	}

	Material.call(this, name);
	this.depthShader = new Shader(name + "_depth", "filteredSplats/filteredSplatsDepthPass.vs", "filteredSplats/filteredSplatsDepthPass.fs");
	this.normalShader = new Shader(name + "_filtered_normal", "filteredSplats/filteredSplatsAttributePass.vs", "filteredSplats/filteredSplatsNormalAttributePass.fs");
	this.colorShader = new Shader(name + "_filtered_color", "filteredSplats/filteredSplatsAttributePass.vs", "filteredSplats/filteredSplatsColorAttributePass.fs");
	this.normalizationShader = new Shader(name + "normalization", "drawTexture.vs", "filteredSplats/filteredSplatsShadingPass.fs");
	this.depthFBO = new FramebufferFloat32(Potree.canvas.width, Potree.canvas.height);
	this.normalFBO = new FramebufferFloat32(Potree.canvas.width, Potree.canvas.height);
	this.colorFBO = new FramebufferFloat32(Potree.canvas.width, Potree.canvas.height);
	
	this.illuminationMode = IlluminationMode.PHONG;
	this.pointSize = 1.0;
	this.blendDepth = 0.1;
}

FilteredSplatsMaterial.prototype = new Material(inheriting);

FilteredSplatsMaterial.isSupported = function(){
	if (gl.getExtension("OES_texture_float") == null) {
		return false;
	}else{
		return true;
	}
}

FilteredSplatsMaterial.prototype.render = function(sceneNode, renderer){
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

FilteredSplatsMaterial.prototype.renderPointClouds = function(transform, pointClouds, renderer){
	var oldBuffer = Framebuffer.getActiveBuffer();
	
	// depth and position
	this.depthPass(transform, pointClouds, renderer);
	
	// attributes
	this.colorPass(transform, pointClouds, renderer);
	if(this.illuminationMode === IlluminationMode.PHONG || this.illuminationMode === IlluminationMode.NORMALS){
		this.normalPass(transform, pointClouds, renderer);
	}
	
	// normalization and shading
	this.shadingPass(oldBuffer, renderer);
	
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
FilteredSplatsMaterial.prototype.depthPass = function(transform, pointClouds, renderer){
	var camera = renderer.camera;
	var lights = renderer.lights;
	
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

FilteredSplatsMaterial.prototype.colorPass = function(transform, pointClouds, renderer){
	var camera = renderer.camera;
	
	// color fbo
	this.colorFBO.bind();
	this.colorFBO.setSize(Potree.canvas.clientWidth, Potree.canvas.clientHeight);
	gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depthFBO.renderbuffer);
	this.colorFBO.checkBuffer();
	gl.viewport(0, 0, Potree.canvas.clientWidth, Potree.canvas.clientHeight);
	gl.clearColor(0,0,0,0);
	gl.clear(gl.COLOR_BUFFER_BIT);
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.ONE, gl.ONE);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LESS);
	gl.depthMask(false);
	
	{ // color uniforms
		gl.useProgram(this.colorShader.program);
		gl.uniformMatrix4fv(this.colorShader.uniforms.uWorld, false, transform);
		gl.uniformMatrix4fv(this.colorShader.uniforms.uView, false, camera.viewMatrix);
		gl.uniformMatrix4fv(this.colorShader.uniforms.uProj, false, camera.projectionMatrix);
		gl.uniform1f(this.colorShader.uniforms.uPointSize, this.pointSize);
		gl.uniform1f(this.colorShader.uniforms.uNear, camera.nearClipPlane);
		gl.uniform1f(this.colorShader.uniforms.uFar, camera.farClipPlane);
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

FilteredSplatsMaterial.prototype.normalPass = function(transform, pointClouds, renderer){
	var camera = renderer.camera;
	
	// normal fbo
	this.normalFBO.bind();
	this.normalFBO.setSize(Potree.canvas.clientWidth, Potree.canvas.clientHeight);
	gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depthFBO.renderbuffer);
	this.normalFBO.checkBuffer();
	gl.viewport(0, 0, Potree.canvas.clientWidth, Potree.canvas.clientHeight);
	gl.clearColor(0,0,0,0);
	gl.clear(gl.COLOR_BUFFER_BIT);
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.ONE, gl.ONE);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LESS);
	gl.depthMask(false);
	
	{ // normal uniforms
		gl.useProgram(this.normalShader.program);
		gl.uniformMatrix4fv(this.normalShader.uniforms.uWorld, false, transform);
		gl.uniformMatrix4fv(this.normalShader.uniforms.uView, false, camera.viewMatrix);
		gl.uniformMatrix4fv(this.normalShader.uniforms.uProj, false, camera.projectionMatrix);
		gl.uniform1f(this.normalShader.uniforms.uPointSize, this.pointSize);
		gl.uniform1f(this.normalShader.uniforms.uNear, camera.nearClipPlane);
		gl.uniform1f(this.normalShader.uniforms.uFar, camera.farClipPlane);
		
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
				gl.enableVertexAttribArray(this.normalShader.attributes.aVertexPosition);
				gl.vertexAttribPointer(this.normalShader.attributes.aVertexPosition, 3, gl.FLOAT, false,pointAttributes.byteSize, offset);
			}else if(attribute === PointAttribute.RGBA_PACKED){
				if(this.normalShader.attributes.aVertexColour != null){
					gl.enableVertexAttribArray(this.normalShader.attributes.aVertexColour);
					gl.vertexAttribPointer(this.normalShader.attributes.aVertexColour, 3, gl.UNSIGNED_BYTE, false,pointAttributes.byteSize, offset);
				}
			}else if(attribute === PointAttribute.NORMAL_FLOATS){
				if(this.normalShader.attributes.aNormal != null){
					gl.enableVertexAttribArray(this.normalShader.attributes.aNormal);
					gl.vertexAttribPointer(this.normalShader.attributes.aNormal, 3, gl.FLOAT, false,pointAttributes.byteSize, offset);
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

var startTime = new Date().getTime();

/**
 * normalize output from second pass.
 * rgb values are divided by the weight(stored in the alpha component) and alpha is set to 1. 
 * renders into the buffer which was active before this material was used.
 * 
 */
FilteredSplatsMaterial.prototype.shadingPass = function(oldBuffer, renderer){
	var camera = renderer.camera;
	var lights = renderer.lights;
	
	oldBuffer.bind();
	
//	var cColor = Potree.Settings.backgroundColor;
//	gl.clearColor(cColor[0], cColor[1], cColor[2], cColor[3]);
	gl.clearColor(0,0,0,1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	gl.useProgram(this.normalizationShader.program);
	gl.disable(gl.DEPTH_TEST);
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.ONE, gl.ONE);
	
	// normal
//	if(this.illuminationMode === IlluminationMode.PHONG || this.illuminationMode === IlluminationMode.NORMALS){
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.normalFBO.texture.glid);
		gl.uniform1i(this.normalizationShader.uniforms.uNormal, 0);
//	}
		
	// color
//	if(this.illuminationMode === IlluminationMode.FLAT || this.illuminationMode === IlluminationMode.PHONG){
		gl.activeTexture(gl.TEXTURE0 + 1);
		gl.bindTexture(gl.TEXTURE_2D, this.colorFBO.texture.glid);
		gl.uniform1i(this.normalizationShader.uniforms.uColor, 1);
//	}
	
	// position
//	if(this.illuminationMode === IlluminationMode.PHONG || this.illuminationMode === IlluminationMode.POSITIONS){
		gl.activeTexture(gl.TEXTURE0 + 2);
		gl.bindTexture(gl.TEXTURE_2D, this.depthFBO.texture.glid);
		gl.uniform1i(this.normalizationShader.uniforms.uPosition, 2);
//	}
	
	gl.uniform1i(this.normalizationShader.uniforms.uIlluminationMode, this.illuminationMode.value);
	
	if(this.illuminationMode === IlluminationMode.PHONG){
		for(var i = 0; i < lights.length; i++){
			var light = lights[i];
			var pos = light.globalPosition;
			
			gl.uniform3f(this.normalizationShader.uniforms.uLightPos, pos.x, pos.y, pos.z);
			gl.uniform3f(this.normalizationShader.uniforms.uLightColor, light.red, light.green, light.blue);
			oldBuffer.drawFullscreenQuad(this.normalizationShader);
		}
	}else{
		oldBuffer.drawFullscreenQuad(this.normalizationShader);
	}
};
