
/**
 * @class
 * @augments SceneNode
 */
function MeshNode(name, mesh, parent){
	SceneNode.call(this, name, parent);
	this.mesh = mesh;
}

MeshNode.prototype = new SceneNode(inheriting);

MeshNode.prototype.render = function(camera){
	if(this.visible){
		this.mesh.render(this, camera);
	}
};
