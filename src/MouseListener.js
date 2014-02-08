
/**
 * 
 * @class
 */
function MouseListener(){
}

MouseListener.x = null;
MouseListener.y = null;
MouseListener.pressedKeys = new Array();

MouseListener.listener = new Array();

MouseListener.addListener = function(listener){
	if(!MouseListener.listener.contains(listener)){
		MouseListener.listener.push(listener);
	}
};

MouseListener.removeListener = function(listener){
	MouseListener.listener.remove(listener);
};

MouseListener.mouseDown = function(event){
	MouseListener.pressedKeys.push(event.button);

	for(var i = 0; i < MouseListener.listener.length; i++){
		MouseListener.listener[i].invokeMouseDown(event);
	}
	
	return false;
};

MouseListener.mouseUp = function(event){
	MouseListener.pressedKeys.remove(event.button);
	for(var i = 0; i < MouseListener.listener.length; i++){
		MouseListener.listener[i].invokeMouseUp(event);
	}
	
	return false;
};

MouseListener.mouseWheel = function(event){
	var evt=window.event || event; //equalize event object
    var delta=evt.detail? evt.detail*(-120) : evt.wheelDelta; //check for detail first so Opera uses that instead of wheelDelta
	
    var ret = true;
	for(var i = 0; i < MouseListener.listener.length; i++){
		ret = ret && MouseListener.listener[i].invokeMouseWheel(delta, event);
	}
	return ret;
};

MouseListener.mouseMove = function(event){
	if(MouseListener.x == null){
		MouseListener.x = event.screenX;
		MouseListener.y = event.screenY;
	}
	
	var diffX = event.screenX - MouseListener.x;
	var diffY = event.screenY - MouseListener.y;
	MouseListener.x = event.screenX;
	MouseListener.y = event.screenY;
	
	
	
	if(MouseListener.pressedKeys.length > 0){
		for(var i = 0; i < MouseListener.listener.length; i++){
			MouseListener.listener[i].invokeMouseDrag(event, MouseListener.pressedKeys, diffX, diffY);
		}
	}else{
		for(var i = 0; i < MouseListener.listener.length; i++){
			MouseListener.listener[i].invokeMouseMove(event, diffX, diffY);
		}
	}
	
	return true;
	
};