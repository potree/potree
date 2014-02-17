

/**
 * @class renders points with a fixed pixel size. 
 * @augments Material
 * @author Markus Schuetz
 */
function FixedPointSizeMaterial(name){
	Material.call(this, name);
	this.shader = new Shader(name, "fixedPointSize.vs", "colouredPoint.fs");
	
	this.pointSize = 1.0;
}

FixedPointSizeMaterial.prototype = new Material(inheriting);

FixedPointSizeMaterial.prototype.render = function(mno, mnoSceneNode, camera){
	var mnoNodes = mno.renderQueue.nodeList;
	for(var i = 0; i < mnoNodes.size(); i++){
		var node = mnoNodes[i];
		var pointCloud = node.pointCloud;
		var pointAttributes = mnoSceneNode.mno.pointAttributes;

		gl.useProgram(this.shader.program);
		
		{ // uniforms
			gl.uniformMatrix4fv(this.shader.uWorld, false, mnoSceneNode.globalTransformation);
			gl.uniformMatrix4fv(this.shader.uView, false, camera.viewMatrix);
			gl.uniformMatrix4fv(this.shader.uProjection, false, camera.projectionMatrix);
			gl.uniform1f(this.shader.uPointSize, node.opacity * this.pointSize);
			gl.uniform2f(this.shader.uViewportSize, Potree.canvas.clientWidth, Potree.canvas.clientHeight);
		}
		
		gl.bindBuffer(gl.ARRAY_BUFFER, pointCloud.vbo);
		var offset = 0;
		for(var j = 0; j < pointAttributes.numAttributes; j++){
			var attribute = pointAttributes.attributes[j];
			
			if(attribute.name === PointAttributeNames.POSITION_CARTESIAN){
				gl.enableVertexAttribArray(this.shader.aVertexPosition);
				gl.vertexAttribPointer(this.shader.aVertexPosition, 3, gl.FLOAT, false,pointAttributes.bytesPerPoint, offset);
			}else if(attribute.name === PointAttributeNames.COLOR_PACKED){
				if(this.shader.aVertexColour != null){
					gl.enableVertexAttribArray(this.shader.aVertexColour);
					gl.vertexAttribPointer(this.shader.aVertexColour, 3, gl.UNSIGNED_BYTE, false,pointAttributes.bytesPerPoint, offset);
				}
			}else if(attribute.name === PointAttributeNames.NORMAL_FLOATS){
				if(this.shader.aNormal != null){
					gl.enableVertexAttribArray(this.shader.aNormal);
					gl.vertexAttribPointer(this.shader.aNormal, 3, gl.FLOAT, false,pointAttributes.bytesPerPoint, offset);
				}
			}
			offset += attribute.type.size * attribute.numElements;
		}
		
		gl.drawArrays(gl.POINTS, 0, node.points);
		Potree.drawnPoints += node.points;
		Potree.drawCalls += 1;
		
		gl.disableVertexAttribArray(this.shader.aVertexPosition);
		gl.disableVertexAttribArray(this.shader.aVertexColour);
		gl.disableVertexAttribArray(this.shader.aNormal);
	}
};