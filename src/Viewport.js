
/**
 * @class
 */
function Viewport(canvas, camera) {
	this.canvas = canvas;
	this.camera = camera;
	this.velocity = [0,0,0];
	this.targetVelocity = [0,0,0];
	this.targetVelocityMultiplicator = 20.0;
	this.x = 0;
	this.y = 0;
	if (canvas != null) {
		this.width = canvas.width;
		this.height = canvas.height;
	}
	if(this.camera != null){
		this.camera.aspectRatio = this.width / this.height;
	}
}

Viewport.prototype.setCamera = function(camera) {
	this.camera = camera;
	this.camera.aspectRatio = this.width / this.height;
};

/**
 * 
 * @param canvas
 * @returns
 */
Viewport.prototype.setCanvas = function(canvas) {
	this.canvas = canvas;
	if (canvas != null) {
		this.width = canvas.width;
		this.height = canvas.height;
	}
	if(this.camera != null){
		this.camera.aspectRatio = this.width / this.height;
	}
};

Viewport.prototype.setDimension = function(x, y, width, height){
	this.x = 0;
	this.y = 0;
	this.width = width;
	this.height = height;
	if(this.camera != null){
		this.camera.aspectRatio = this.width / this.height;
	}
};

Viewport.prototype.addTime = function(time){
	this.velocity[0] = 0.2 *this.velocity[0] + 0.8 * this.targetVelocity[0] * this.targetVelocityMultiplicator;
	this.velocity[1] = 0.2 *this.velocity[1] + 0.8 * this.targetVelocity[1] * this.targetVelocityMultiplicator;
	this.velocity[2] = 0.2 *this.velocity[2] + 0.8 * this.targetVelocity[2] * this.targetVelocityMultiplicator;
	
	var t = [this.velocity[0]* time, this.velocity[1]* time, this.velocity[2] * time];
	
	this.camera.translate(t[0], t[1], t[2]);
};

Viewport.prototype.invokeKeyDown = function(event){
	if(event.which == 83 ){
		//s
		//this.camera.translate(0,0,1);
		this.targetVelocity[2] = 1;
	}else if(event.which == 87 ){
		//w
		//this.camera.translate(0,0,-1);
		this.targetVelocity[2] = -1;
	}else if(event.which == 68 ){
		//d
		//this.camera.translate(1,0,0);
		this.targetVelocity[0] = 1;
	}else if(event.which == 65 ){
		//a
		//this.camera.translate(-1,0,0);
		this.targetVelocity[0] = -1;
	}
};

Viewport.prototype.invokeKeyUp = function(event){
	if(event.which == 83 ){
		//s
		this.targetVelocity[2] = 0;
	}else if(event.which == 87 ){
		//w
		this.targetVelocity[2] = 0;
	}else if(event.which == 68 ){
		//d
		this.targetVelocity[0] = 0;
	}else if(event.which == 65 ){
		//a
		this.targetVelocity[0] = 0;
	}
};

Viewport.prototype.invokeKeyPress = function(event){

};

Viewport.prototype.invokeMouseDown = function(event){
};

Viewport.prototype.invokeMouseUp = function(event){
};

Viewport.prototype.invokeMouseMove = function(event, diffX, diffY){
	
};

Viewport.prototype.invokeMouseDrag = function(event, pressedKeys, diffX, diffY){
	if(pressedKeys.length == 1 && pressedKeys.contains(1)){
		if(event.altKey){
			var pos = this.camera.localPosition;
			
			var toOrigin = M4x4.translate3(-pos[0], -pos[1], -pos[2], M4x4.I);
			var rotY = M4x4.rotate(-diffX / 100.0, this.camera.getUpVector(), M4x4.I);
			var rotX = M4x4.rotate(-diffY / 100.0, this.camera.getSideVector(), M4x4.I);
			var rotY = M4x4.rotate(-diffX / 100.0, [0,1,0], M4x4.I);
			var rotX = M4x4.rotate(-diffY / 100.0, this.camera.getSideVector(), M4x4.I);
			var backToPos = M4x4.translate3(pos[0], pos[1], pos[2], M4x4.I);
			
			
			
			var transform = M4x4.mul(toOrigin, this.camera.transform);
			transform = M4x4.mul(rotX, transform);
			transform = M4x4.mul(backToPos, transform);
			this.camera.setTransform(transform);
			this.camera.resolveTransformation();
			
			
			var transform = M4x4.mul(toOrigin, this.camera.transform);
			transform = M4x4.mul(rotY, transform);
			transform = M4x4.mul(backToPos, transform);
			this.camera.setTransform(transform);
			this.camera.resolveTransformation();
			
		}else{
			this.camera.translate(-diffX / 10.0, diffY / 10.0, 0);
		}
	}
};

Viewport.prototype.invokeMouseWheel = function(delta){
	
	var amount = -delta / 100.0;
	this.camera.translate(0,0,amount);
	
	
	var scene = this.camera.scene;
	var root = scene.rootNode;
};



