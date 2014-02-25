

/**
 * 
 * @param camera
 * @class Navgitation similar to google earth
 * @augments CamHandler
 * @author Markus Schuetz
 */
function EarthCamHandler(camera){
	this.camera = camera;
	this.velocity = [0,0,0];
	this.targetVelocity = [0,0,0];
	this.targetVelocityMultiplicator = 20.0;
	this.x = 0;
	this.y = 0;
	this.speedMultiplier = 0.2;
	this.qualityToggle = 0;
}

EarthCamHandler.prototype = new CamHandler();

EarthCamHandler.prototype.addTime = function(time){
	this.update(time);
};

EarthCamHandler.prototype.update = function(time){
	this.velocity[0] = 0.2 *this.velocity[0] + 0.8 * this.targetVelocity[0] * this.targetVelocityMultiplicator;
	this.velocity[1] = 0.2 *this.velocity[1] + 0.8 * this.targetVelocity[1] * this.targetVelocityMultiplicator;
	this.velocity[2] = 0.2 *this.velocity[2] + 0.8 * this.targetVelocity[2] * this.targetVelocityMultiplicator;
	
	var t = [this.velocity[0]* time, this.velocity[1]* time, this.velocity[2] * time];
	
	this.camera.transform =  M4x4.translate3(t[0], t[1], t[2], this.camera.transform);
};

EarthCamHandler.prototype.invokeKeyDown = function(event){
	if(event.which === KeyCodes.DOWN_ARROW || event.which == KeyCodes.S ){
		this.targetVelocity[2] = 1 * this.speedMultiplier;
	}else if(event.which === KeyCodes.UP_ARROW  || event.which == KeyCodes.W){
		this.targetVelocity[2] = -1 * this.speedMultiplier;
	}else if(event.which === KeyCodes.RIGHT_ARROW  || event.which == KeyCodes.D){
		this.targetVelocity[0] = 1 * this.speedMultiplier;
	}else if(event.which === KeyCodes.LEFT_ARROW  || event.which == KeyCodes.A){
		this.targetVelocity[0] = -1 * this.speedMultiplier;
	}
	
	
};

EarthCamHandler.prototype.invokeKeyUp = function(event){
	if(event.which === KeyCodes.DOWN_ARROW  || event.which == KeyCodes.S){
		this.targetVelocity[2] = 0;
	}else if(event.which === KeyCodes.UP_ARROW  || event.which == KeyCodes.W){
		this.targetVelocity[2] = 0;
	}else if(event.which === KeyCodes.RIGHT_ARROW  || event.which == KeyCodes.D){
		this.targetVelocity[0] = 0;
	}else if(event.which === KeyCodes.LEFT_ARROW  || event.which == KeyCodes.A){
		this.targetVelocity[0] = 0;
	}
	
};

EarthCamHandler.prototype.invokeKeyPress = function(event){

};

EarthCamHandler.prototype.invokeMouseDown = function(event){
	
};

EarthCamHandler.prototype.invokeMouseUp = function(event){
};

EarthCamHandler.prototype.invokeMouseMove = function(event, diffX, diffY){
	
};

EarthCamHandler.prototype.invokeMouseDrag = function(event, pressedKeys, diffX, diffY){
	if(pressedKeys.length === 1 && pressedKeys.contains(0)){
		var pos = this.camera.localPosition;
		
		var toOrigin = M4x4.translate3(-pos[0], -pos[1], -pos[2], M4x4.I);
		var rotY = M4x4.rotate(-diffX / 100.0, [0,1,0], M4x4.I);
		var rotX = M4x4.rotate(-diffY / 100.0, this.camera.getSideVector(), M4x4.I);
		var backToPos = M4x4.translate3(pos[0], pos[1], pos[2], M4x4.I);
		
		var transform = M4x4.mul(toOrigin, this.camera.transform);
		transform = M4x4.mul(rotX, transform);
		transform = M4x4.mul(backToPos, transform);
		this.camera.transform = transform;
		
		
		transform = M4x4.mul(toOrigin, this.camera.transform);
		transform = M4x4.mul(rotY, transform);
		transform = M4x4.mul(backToPos, transform);
		this.camera.transform = transform;
		this.qualityToggle = 0.1;
	} 
	
	
};

EarthCamHandler.prototype.invokeMouseWheel = function(delta){
	var amount = delta / 2000.0;
	this.speedMultiplier += amount;
	this.speedMultiplier = Math.max(0.01, Math.min(10.0, this.speedMultiplier));
};

