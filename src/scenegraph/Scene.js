
/**
 * @class
 */
function Scene(name){
	this.name = name;
	this.rootNode = new SceneNode("root");
	this.rootNode.scene = this;
	this.cameras = new Object();
	this.cameras["default"] = new Camera("default");
	this.cameras["default"].scene = this;
	this.lights = new Object();
	this.activeCamera = this.cameras["default"];
}

Object.defineProperty(Scene.prototype, "nodes", {
	get: function(){
		var nodes = new Array();
		nodes.push(this.rootNode);
		nodes.push(this.rootNode.descendants);
	}
});

