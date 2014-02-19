

/**
 * @class renders points with a fixed pixel size. 
 * @augments Material
 * @author Markus Schütz
 */
function FixedPointSizeMaterial(name){
	Material.call(this, name);
	this.shader = new Shader(name, "fixedPointSize.vs", "colouredPoint.fs");
	
	this.pointSize = 1.0;
}

FixedPointSizeMaterial.prototype = new Material(inheriting);

FixedPointSizeMaterial.prototype.render = function(sceneNode, renderer){
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
	
	if(renderer.fboColor != null){
		this.renderPointClouds(transform, pointClouds, renderer);
	}
};

FixedPointSizeMaterial.prototype.renderPointClouds = function(transform, pointClouds, renderer){
	var camera = renderer.camera;
	var lights = renderer.lights;
	
	renderer.fboColor.bind();
	gl.enable(gl.DEPTH_TEST);
	gl.disable(gl.BLEND);
	
	gl.useProgram(this.shader.program);
	
	{ // uniforms
		gl.uniformMatrix4fv(this.shader.uniforms.uWorld, false, transform);
		gl.uniformMatrix4fv(this.shader.uniforms.uView, false, camera.viewMatrix);
		gl.uniformMatrix4fv(this.shader.uniforms.uProj, false, camera.projectionMatrix);
		gl.uniform1f(this.shader.uniforms.uPointSize, this.pointSize);
		gl.uniform2f(this.shader.uniforms.uViewportSize, Potree.canvas.clientWidth, Potree.canvas.clientHeight);
	}
	
	for(var i = 0; i < pointClouds.length; i++){
		var pointCloud = pointClouds[i];
		var pointAttributes = pointCloud.pointAttributes;
		
		gl.bindBuffer(gl.ARRAY_BUFFER, pointCloud.vbo);
		var offset = 0;
		for(var j = 0; j < pointAttributes.size; j++){
			var attribute = pointAttributes.attributes[j];
			
			if(attribute == PointAttribute.POSITION_CARTESIAN){
				gl.enableVertexAttribArray(this.shader.attributes.aVertexPosition);
				gl.vertexAttribPointer(this.shader.attributes.aVertexPosition, 3, gl.FLOAT, false,pointAttributes.byteSize, offset);
			}else if(attribute == PointAttribute.COLOR_PACKED){
				if(this.shader.attributes.aVertexColour != null){
					gl.enableVertexAttribArray(this.shader.attributes.aVertexColour);
					gl.vertexAttribPointer(this.shader.attributes.aVertexColour, 3, gl.UNSIGNED_BYTE, false,pointAttributes.byteSize, offset);
				}
			}else if(attribute == PointAttribute.NORMAL_FLOATS){
				if(this.shader.attributes.aNormal != null){
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