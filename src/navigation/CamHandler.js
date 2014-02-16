
/**
 * 
 * @class CamHandlers define different types of navigation behaviour. This class is intended to be subclassed.
 * 
 * @author Markus Schuetz
 */
function CamHandler(){
	
}


CamHandler.prototype.addTime = function(time){
	// override in subclass
};

CamHandler.prototype.invokeKeyDown = function(event){
	// override in subclass
};

CamHandler.prototype.invokeKeyUp = function(event){
	// override in subclass
};

CamHandler.prototype.invokeKeyPress = function(event){
	// override in subclass
};

CamHandler.prototype.invokeMouseDown = function(event){
	// override in subclass
};

CamHandler.prototype.invokeMouseUp = function(event){
	// override in subclass
};

CamHandler.prototype.invokeMouseMove = function(event, diffX, diffY){
	// override in subclass
};

CamHandler.prototype.invokeMouseDrag = function(event, pressedKeys, diffX, diffY){
	// override in subclass
};

CamHandler.prototype.invokeMouseWheel = function(delta){
	// override in subclass
};