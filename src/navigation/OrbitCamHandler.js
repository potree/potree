
/**
 * 
 * @param camera
 * @class fly like a bird
 * @augments CamHandler
 * @author Markus Schütz
 */
function OrbitCamHandler(camera){
	this.camera = camera;
	this.x = 0;
	this.y = 0;
	this.speedMultiplier = 0.2;
	this.distance = 8.0;
	this.aX = 0.0;
	this.aY = 2.0;
}

OrbitCamHandler.prototype = new CamHandler();

OrbitCamHandler.prototype.update = function(time){
};

OrbitCamHandler.prototype.invokeMouseDrag = function(event, pressedKeys, diffX, diffY){
	if(pressedKeys.length == 1 && pressedKeys.contains(0) && KeyListener.pressedKeys.contains(18)){
//		this.camera.translate((this.speedMultiplier * -diffX) / 10.0, (this.speedMultiplier * diffY) / 10.0, 0);
		this.camera.transform =  M4x4.translate3((this.speedMultiplier * -diffX) / 10.0, (this.speedMultiplier * diffY) / 10.0, 0, this.camera.transform);
		this.qualityToggle = 0.1;
	}else if(pressedKeys.length == 1 && pressedKeys.contains(0)){
		this.aY += 0.2*timeSinceLastFrame*diffX;
		
		this.update();
	} 
};

OrbitCamHandler.prototype.invokeMouseWheel = function(delta){
	this.distance -= 0.05*delta * timeSinceLastFrame;
	this.distance = Math.max(this.distance, 2.0);
	this.distance = Math.min(this.distance, 20.0);
	
	this.update();
};

OrbitCamHandler.prototype.update = function(){
	var transform = M4x4.I;
	transform = M4x4.rotate(this.aY, [ 0, 1, 0], transform);
	transform = M4x4.translate3(0,3,this.distance, transform);
	this.camera.transform = transform;
}

