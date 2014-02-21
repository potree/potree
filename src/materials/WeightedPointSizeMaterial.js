
/**
 * 
 * @class  point size depends on distance from eye.
 * this may change so that point size depends on more factors like child node visibility, density of a node, etc.  
 * 
 * @augments Material
 * @author Markus Schuetz
 */
function WeightedPointSizeMaterial(name){
	Material.call(this, name);
	this.shader = new Shader(name + "_color", "pointSize.vs", "colouredPoint.fs");
	this.posShader = new Shader(name + "_position", "weightedPoints/weightedPointsPosition.vs", "weightedPoints/weightedPointsPosition.fs");
	this.rgbaDepthShader = new Shader(name + "_depthRGBA", "weightedPoints/weightedPointsDepthAsRGBA.vs", "weightedPoints/weightedPointsDepthAsRGBA.fs");
	
	this.pointSize = 0.3;
}

WeightedPointSizeMaterial.prototype = new Material(inheriting);

WeightedPointSizeMaterial.prototype.render = function(sceneNode, renderer){
	var transform = sceneNode.globalTransformation;
	var pointClouds = new Array();
	
	if(sceneNode instanceof PointCloudSceneNode){
		pointClouds.push(sceneNode.pointCloud);
	}else if(sceneNode instanceof PointcloudOctreeSceneNode){
		var renderQueue = sceneNode.mno.renderQueue;
		for(var i = 0; i < renderQueue.length; i++){
			var node = renderQueue.get(i);
//			if(node.level > 2){
//				continue;
//			}
			pointClouds.push(node.pointCloud);
		}
	}
	
	if(renderer.fboColor != null){
		this.renderPointClouds(transform, pointClouds, renderer);
	}
	if(renderer.fboPosition != null){
		this.renderPointCloudsPosition(transform, pointClouds, renderer);
	}
	if(renderer.fboDepthAsRGBA != null){
		this.renderPointCloudsDepthAsRGBA(transform, pointClouds, renderer);
	}
};

WeightedPointSizeMaterial.prototype.renderPointCloudsDepthAsRGBA = function renderPointCloudsDepthAsRGBA(transform, pointClouds, renderer){
	var camera = renderer.camera;
	var lights = renderer.lights;
	
	renderer.fboDepthAsRGBA.bind();
	gl.enable(gl.DEPTH_TEST);
	gl.disable(gl.BLEND);
	
	var shader = this.rgbaDepthShader;
	var uniforms = shader.uniforms;
	var attributes = shader.attributes;
	
	gl.useProgram(shader.program);
	
	{ // uniforms
		gl.uniformMatrix4fv(uniforms.uWorld, false, transform);
		gl.uniformMatrix4fv(uniforms.uView, false, camera.viewMatrix);
		gl.uniformMatrix4fv(uniforms.uProj, false, camera.projectionMatrix);
		gl.uniform1f(uniforms.uPointSizeMultiplicator, this.pointSize);
		gl.uniform2f(uniforms.uViewportSize, Potree.canvas.clientWidth, Potree.canvas.clientHeight);
	}
	
	for(var i = 0; i < pointClouds.length; i++){
		var pointCloud = pointClouds[i];
		var pointAttributes = pointCloud.pointAttributes;
		
		gl.bindBuffer(gl.ARRAY_BUFFER, pointCloud.vbo);
		var offset = 0;
		for(var j = 0; j < pointAttributes.size; j++){
			var attribute = pointAttributes.attributes[j];
			
			if(attribute === PointAttribute.POSITION_CARTESIAN){
				gl.enableVertexAttribArray(attributes.aVertexPosition);
				gl.vertexAttribPointer(attributes.aVertexPosition, 3, gl.FLOAT, false,pointAttributes.byteSize, offset);
			}
			offset += attribute.byteSize;
		}
		
		gl.drawArrays(gl.POINTS, 0, pointCloud.size);
		
		gl.disableVertexAttribArray(attributes.aNormal);
	}
	
};


WeightedPointSizeMaterial.prototype.renderPointCloudsPosition = function renderPointCloudsPosition(transform, pointClouds, renderer){
	var camera = renderer.camera;
	var lights = renderer.lights;
	
	renderer.fboPosition.bind();
	gl.enable(gl.DEPTH_TEST);
	gl.disable(gl.BLEND);
	
	for(var i = 0; i < pointClouds.length; i++){
		var pointCloud = pointClouds[i];
		var pointAttributes = pointCloud.pointAttributes;
		gl.useProgram(this.posShader.program);
		
		{ // uniforms
			gl.uniformMatrix4fv(this.posShader.uniforms.uWorld, false, transform);
			gl.uniformMatrix4fv(this.posShader.uniforms.uView, false, camera.viewMatrix);
			gl.uniformMatrix4fv(this.posShader.uniforms.uProj, false, camera.projectionMatrix);
			gl.uniform1f(this.posShader.uniforms.uPointSizeMultiplicator, this.pointSize);
			gl.uniform2f(this.posShader.uniforms.uViewportSize, Potree.canvas.clientWidth, Potree.canvas.clientHeight);
		}
		
		gl.bindBuffer(gl.ARRAY_BUFFER, pointCloud.vbo);
		var offset = 0;
		for(var j = 0; j < pointAttributes.size; j++){
			var attribute = pointAttributes.attributes[j];
			
			if(attribute === PointAttribute.POSITION_CARTESIAN){
				gl.enableVertexAttribArray(this.posShader.attributes.aVertexPosition);
				gl.vertexAttribPointer(this.posShader.attributes.aVertexPosition, 3, gl.FLOAT, false,pointAttributes.byteSize, offset);
			}
			offset += attribute.byteSize;
		}
		
		gl.drawArrays(gl.POINTS, 0, pointCloud.size);
		
		gl.disableVertexAttribArray(this.posShader.attributes.aNormal);
	}
};

WeightedPointSizeMaterial.prototype.renderPointClouds = function renderPointClouds(transform, pointClouds, renderer){
	var camera = renderer.camera;
	var lights = renderer.lights;
	
	renderer.fboColor.bind();
	gl.enable(gl.DEPTH_TEST);
	gl.disable(gl.BLEND);
	
	for(var i = 0; i < pointClouds.length; i++){
		var pointCloud = pointClouds[i];
		var pointAttributes = pointCloud.pointAttributes;
		gl.useProgram(this.shader.program);
		
		{ // uniforms
			gl.uniformMatrix4fv(this.shader.uniforms.uWorld, false, transform);
			gl.uniformMatrix4fv(this.shader.uniforms.uView, false, camera.viewMatrix);
			gl.uniformMatrix4fv(this.shader.uniforms.uProj, false, camera.projectionMatrix);
			gl.uniform1f(this.shader.uniforms.uPointSizeMultiplicator, this.pointSize);
			gl.uniform2f(this.shader.uniforms.uViewportSize, Potree.canvas.clientWidth, Potree.canvas.clientHeight);
		}
		
		gl.bindBuffer(gl.ARRAY_BUFFER, pointCloud.vbo);
		var offset = 0;
		for(var j = 0; j < pointAttributes.size; j++){
			var attribute = pointAttributes.attributes[j];
			
			if(attribute === PointAttribute.POSITION_CARTESIAN){
				gl.enableVertexAttribArray(this.shader.attributes.aVertexPosition);
				gl.vertexAttribPointer(this.shader.attributes.aVertexPosition, 3, gl.FLOAT, false,pointAttributes.byteSize, offset);
			}else if(attribute === PointAttribute.RGBA_PACKED){
				if(this.shader.attributes.aVertexColour !== null){
					gl.enableVertexAttribArray(this.shader.attributes.aVertexColour);
					gl.vertexAttribPointer(this.shader.attributes.aVertexColour, 3, gl.UNSIGNED_BYTE, false,pointAttributes.byteSize, offset);
				}
			}else if(attribute === PointAttribute.RGB_PACKED){
				if(this.shader.attributes.aVertexColour !== null){
					gl.enableVertexAttribArray(this.shader.attributes.aVertexColour);
					gl.vertexAttribPointer(this.shader.attributes.aVertexColour, 3, gl.UNSIGNED_BYTE, false,pointAttributes.byteSize, offset);
				}
			}else if(attribute === PointAttribute.NORMAL_FLOATS){
				if(this.shader.attributes.aNormal !== null){
					gl.enableVertexAttribArray(this.shader.attributes.aNormal);
					gl.vertexAttribPointer(this.shader.attributes.aNormal, 3, gl.FLOAT, false,pointAttributes.byteSize, offset);
				}
			}
			offset += attribute.byteSize;
		}
		
		gl.drawArrays(gl.POINTS, 0, pointCloud.size);
		
		gl.disableVertexAttribArray(this.shader.attributes.aVertexPosition);
		gl.disableVertexAttribArray(this.shader.attributes.aVertexColour);
		gl.disableVertexAttribArray(this.shader.attributes.aNormal);
	}
};