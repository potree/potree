

function Plane(name, parent){
	SceneNode.call(this, name, parent);
	var tesselationX = 100;
	var tesselationZ = 100;
	this._mesh = null;
	this.tesselationX = tesselationX;
	this.tesselationZ = tesselationZ;
}

Plane.prototype = new SceneNode(inheriting);

Object.defineProperty(Plane.prototype, "mesh", {
	get: function(){
		if(this._mesh  == null){
			this._mesh  = new Mesh("plane");
			var subMesh = new SubMesh(this._mesh);
			this._mesh .addSubMesh(subMesh);
			
			
			var vertices = [];
			var normals = [];
			var texCoords = [];
			var indices = [];
			
			for(var x = 0; x <= this.tesselationX; x++){
				for(var z = 0; z <= this.tesselationZ; z++){
					var posX = (x / this.tesselationX) - 0.5;
					var posY = 0;
					var posZ = (z / this.tesselationZ) - 0.5;
					
					vertices.push(posX);
					vertices.push(posY);
					vertices.push(posZ);

					normals.push(0);
					normals.push(1);
					normals.push(0);
					
					texCoords.push(x / this.tesselationX);
					texCoords.push(z / this.tesselationZ);
				}
			}
			
			for(var x = 0; x < this.tesselationX; x++){
				for(var z = 0; z < this.tesselationZ; z++){
					var zOffset = x*(this.tesselationZ+1);
					indices.push(zOffset + z);
					indices.push(zOffset + z + 1);
					indices.push((x+1)*(this.tesselationZ+1) + z);
					
					indices.push((x+1)*(this.tesselationZ+1) + z);
					indices.push(zOffset + z + 1);
					indices.push((x+1)*(this.tesselationZ+1) + z+1);
				}
			}
			
			
			subMesh.setVertexBufferData("POSITION", new Float32Array(vertices));
			subMesh.setVertexBufferData("NORMAL", new Float32Array(normals));
			subMesh.setVertexBufferData("TEXCOORD_0", new Float32Array(texCoords));
			subMesh.setIndexBufferData(new Uint16Array(indices));
			
			var material = MaterialManager.getMaterial("default");
			this._mesh.setMaterial(material);
		}
		
		return this._mesh;
	}
});

Plane.prototype.render = function(renderQueue, camera){
	this.mesh.render(this, renderQueue, camera);
};