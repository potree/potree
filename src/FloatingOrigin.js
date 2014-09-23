

function FloatingOrigin(camera){
	this.camera = camera;
	this.offset = new THREE.Vector3();
	this.referenceFrames = [];
	this.threshold = 10000;
	
}

FloatingOrigin.prototype.addReferenceFrame = function(frame){
	this.referenceFrames.push(frame);
}

FloatingOrigin.prototype.update = function(){
	var offset = new THREE.Vector3();
	if(this.camera.position.length() > this.threshold){
		offset.copy(camera.position);
	}
	
	camera.position.sub(offset);
	this.offset.add(offset);
	
	for(var i = 0;  i < this.referenceFrames.length; i++){
		var frame = this.referenceFrames[i];
		frame.position.sub(offset);
	}
}


