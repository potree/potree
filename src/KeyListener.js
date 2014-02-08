
/**
 * @class 
 */
function KeyListener(){

}

KeyListener.pressedKeys = new Array();

KeyListener.listener = new Array();

KeyListener.addListener = function(listener){
	if(!KeyListener.listener.contains(listener)){
		KeyListener.listener.push(listener);
	}
};

KeyListener.removeListener = function(listener){
	KeyListener.listener.remove(listener);
};

KeyListener.keyDown = function(event){
	if(!KeyListener.pressedKeys.contains(event.which)){
		KeyListener.pressedKeys.push(event.which);
	}
	
	for(var i = 0; i < KeyListener.listener.length; i++){
		KeyListener.listener[i].invokeKeyDown(event);
	}
	
	event.stopPropagation();
};

KeyListener.keyUp = function(event){
	KeyListener.pressedKeys.remove(event.which);
	for(var i = 0; i < KeyListener.listener.length; i++){
		KeyListener.listener[i].invokeKeyUp(event);
	}
};

KeyListener.keyPress = function(event){
	for(var i = 0; i < KeyListener.listener.length; i++){
		KeyListener.listener[i].invokeKeyPress(event);
	}
};