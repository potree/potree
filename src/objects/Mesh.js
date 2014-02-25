

/**
 * @class
 * @author Markus Schuetz
 */
MeshType = {
	TRIANGLES : 0,
	LINES: 1,
	POINTS: 2
};

/**
 * 
 * @param name
 * @class
 * @author Markus Schuetz
 */
function Mesh(name){
	this.name = name;
	this.subMeshes = new Array();
	this.setType(MeshType.TRIANGLES);
	this._material = null;
	
	// depending on MeshType, this can be either lineWidth or pointSize
	this.primitiveSize = 1.0;
}

Mesh.prototype.setType = function(type){
	this.type = type;
	if(type === MeshType.TRIANGLES){
		this.glType = gl.TRIANGLES;
	}else if(type === MeshType.LINES){
		this.glType = gl.LINES;
	}else if(type === MeshType.POINTS){
		this.glType = gl.POINTS;
	}else{
		throw "unknown mesh type: " + type + ". use one of the MeshType members.";
	}
};

Mesh.prototype.render = function(meshNode, renderer){
	for(var i = 0; i < this.subMeshes.length; i++){
		var subMesh = this.subMeshes[i];
		subMesh.render(meshNode, renderer);
	}
};

Mesh.prototype.addSubMesh = function(subMesh){
	this.subMeshes.push(subMesh);
};

Mesh.prototype.setMaterial = function(material){
	this.material = material;
};

Object.defineProperty(Mesh.prototype, "material", {
	get: function(){
		return this._material;
	},
	set: function(material){
		this._material = material;
		for(var i = 0; i < this.subMeshes.length; i++){
			var subMesh = this.subMeshes[i];
			subMesh.material = material;
		}
	}
});

/**
 * 
 * @param mesh
 * @class
 * @author Markus Schuetz
 */
function SubMesh(mesh){
	this.mesh = mesh;
	// beinhaltet alle vertex buffer des meshes
	this.vbos = new Object();
	// index buffer
	this.ibo = null;
	this.vertexCount = 0;
//	this.material = null;
	this.indices = null;
	this._material = null;
}

SubMesh.prototype.setMaterial = function(material){
	this.material = material;
};

Object.defineProperty(SubMesh.prototype, "material", {
	get: function(){
		return this._material;
	},
	set: function(material){
		this._material = material;
	}
});


SubMesh.prototype.setVertexBufferData = function(name, data){
	// wenn vertex buffer noch nicht vorhanden -> neuen erstellen
	if(this.vbos[name] == null){
		this.vbos[name] = gl.createBuffer();
	}

	gl.bindBuffer(gl.ARRAY_BUFFER, this.vbos[name]);
	gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
};

SubMesh.prototype.setIndexBufferData = function(data){
	if(this.ibo == null){
		this.ibo = gl.createBuffer();
	}
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);
	this.indices = data;
};

SubMesh.prototype.render = function(meshNode, renderer){
	this.material.renderSubMesh(this, meshNode, renderer);
};


















