
/**
 * @class render an object without illumination
 * @augments Material
 * @author Markus Schuetz
 */
function FlatMaterial(name, color){
	Material.call(this, name);
	this.flatShader = new Shader( name, "flatShader.vs", "flatShader.fs");
	
	if(color != null){
		this.color = color;
	}else{
		this.color = [1.0, 0.0, 0.0, 1.0];
	}
}

FlatMaterial.prototype = new Material(inheriting);

FlatMaterial.prototype.setColor = function(color){
	this.color = color;
};

/**
 * 
 * 
 * @param object may be either a SubMesh or a PointcloudOctree
 * @param sceneNode
 * @param camera
 */
FlatMaterial.prototype.render = function(object, sceneNode, renderer){
	if(object instanceof AABB){
		this.renderAABB(object, sceneNode, renderer);
	}else if(object instanceof SubMesh){
		this.renderSubMesh(object, sceneNode, renderer);
	}
};


FlatMaterial.prototype.renderSubMesh = function(subMesh, meshNode, renderer){
	var camera = renderer.camera;
	var lights = renderer.lights;
	var shader = this.flatShader;
	
	var scene = camera.scene;
	var mesh = meshNode.mesh;
	gl.useProgram(shader.program);

	// uniforms
	gl.uniformMatrix4fv(shader.uniforms.uWorld, false, meshNode.globalTransformation);
	gl.uniformMatrix4fv(shader.uniforms.uView, false, camera.viewMatrix);
	gl.uniformMatrix4fv(shader.uniforms.uProj, false, camera.projectionMatrix);
	var viewPos = camera.globalPosition;
	gl.uniform3f(shader.uniforms.uViewPos, viewPos[0], viewPos[1], viewPos[2]);
	gl.uniform4f(shader.uniforms.uColor, this.color[0], this.color[1], this.color[2], this.color[3]);
	
	// vertex attributes
	gl.enableVertexAttribArray(shader.attributes.aVertexPosition);
	gl.bindBuffer(gl.ARRAY_BUFFER, subMesh.vbos["POSITION"]);
	gl.vertexAttribPointer(shader.attributes.aVertexPosition, 3, gl.FLOAT, false, 0, 0);
	
	if(subMesh.vbos["TEXCOORD_0"] != null && shader.attributes.aTextureCoord != null ){
		gl.enableVertexAttribArray(shader.attributes.aTextureCoord);
		gl.bindBuffer(gl.ARRAY_BUFFER, subMesh.vbos["TEXCOORD_0"]);
		gl.vertexAttribPointer(shader.attributes.aTextureCoord, 2, gl.FLOAT, false, 0, 0);
	}
	
	if(subMesh.ibo != null){
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, subMesh.ibo);
		gl.drawElements(mesh.glType, subMesh.indices.length, gl.UNSIGNED_SHORT, 0);
	}else if(subMesh.vertexCount != null){
		gl.lineWidth(10.0);
		gl.drawArrays(mesh.glType, 0, subMesh.vertexCount);
	}
};