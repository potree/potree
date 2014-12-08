
ViewerControls = function(renderer, camera, scene){
	
	var scope = this;
	
	this.domElement = renderer.domElement;
	this.listener = [];
	
	
	
	
	
	
	
	
	
	var onMouseDown = function(event){
		for(var i = 0; i < scope.listener.length; i++){
			scope.listener[i].onMouseDown(event);
		}
	};
	
	var onDoubleClick = function(event){
		for(var i = 0; i < scope.listener.length; i++){
			scope.listener[i].onDoubleClick(event);
		}
	};
	
	var onMouseWheel = function(event){
		for(var i = 0; i < scope.listener.length; i++){
			scope.listener[i].onMouseWheel(event);
		}
	};
	
	var onKeyDown = function(event){
		for(var i = 0; i < scope.listener.length; i++){
			scope.listener[i].onKeyDown(event);
		}
	};
	
	var onKeyUp = function(event){
		for(var i = 0; i < scope.listener.length; i++){
			scope.listener[i].onKeyUp(event);
		}
	};
	
	this.update = function(delta){
	
	};
	
	this.domElement.addEventListener( 'dblclick', onDoubleClick, false);
	this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
	this.domElement.addEventListener( 'mousedown', onMouseDown, false );
	this.domElement.addEventListener( 'mousewheel', onMouseWheel, false );
	this.domElement.addEventListener( 'DOMMouseScroll', onMouseWheel, false ); // firefox

	window.addEventListener( 'keydown', onKeyDown, false );
	window.addEventListener( 'keyup', onKeyUp, false );
};

