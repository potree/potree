
/**
 * 
 * @param camera
 * @augments CamHandler
 * @author Markus Schuetz
 */
function OrbitCamHandler(camera){
	this.camera = camera;
	this.rotateSpeed = 0.2;
	this.zoomSpeed = 0.2;
	this.pivot = V3.$(0,0,0);
}

OrbitCamHandler.prototype = new CamHandler();

OrbitCamHandler.prototype.update = function(time){};

OrbitCamHandler.prototype.invokeMouseDrag = function(event, pressedKeys, diffX, diffY){
	// rotate around pivot point
	var amount = -this.rotateSpeed*timeSinceLastFrame;
	this.camera.rotateAroundPivot(amount*diffX, amount*diffY, this.pivot);
};

OrbitCamHandler.prototype.invokeMouseWheel = function(delta){
	// zoom in/out
	var dir = this.camera.getGlobalDirection();
	var v = V3.scale(dir, delta*timeSinceLastFrame*this.zoomSpeed);
	this.camera.transform = M4x4.mul(M4x4.makeTranslate3(v.x, v.y, v.z), this.camera.transform);
};
