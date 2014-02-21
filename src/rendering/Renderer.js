

/**
 * 
 * @class
 */
function Renderer(scene, fboColor){
	
	// outputs
	this.fboColor = fboColor;
	this.fboDepthAsRGBA = null;
	
	// inputs
	this.scene = scene;
	this.bgColor = [0, 0, 0, 1];
	this._viewport = [0, 0, 0, 0];
	
	// other
	this.fboWorldPosAt = null;
	this.worldPosCallbackQueue = new Array();
}

Renderer.prototype.viewport = function(x, y, width, height){
	this._viewport = [x, y, width, height];
	gl.viewport(x, y, width, height);
};

Renderer.prototype.worldPosAt = function(worldPosQueueElement){
	this.worldPosCallbackQueue.push(worldPosQueueElement);
};

Renderer.prototype._worldPosAt = function(x, y, width, height){
//	console.log("======");
//	console.log("worldPosAt(" + x + ", " + y + ", " + width + ", " + height + ")");
	
	var fboColor = this.fboColor;
	var fboDepthAsRGBA = this.fboDepthAsRGBA;
	this.fboColor = null;
	
	if(this.fboWorldPosAt == null){
		this.fboWorldPosAt = new Framebuffer(this._viewport[2], this._viewport[3]);
	}
	this.fboWorldPosAt.bind();
	gl.clearColor(this.bgColor.r, this.bgColor.g, this.bgColor.b, this.bgColor.a);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.enable(gl.SCISSOR_TEST);
	gl.scissor(x-width/2, y-width/2, width, height);
	this.fboDepthAsRGBA = this.fboWorldPosAt;
	this.render();
	
	var pixels = new Uint8Array(width*height*4);
	gl.readPixels(x-width/2, y-height/2, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
	
	var minDist = Infinity;
	var depthOfNearest = null;
	for(var i = 0; i < width*height; i++){
		var dx = i % width - width/2;
		var dy = i / height - height/2;
		var dist = dx*dx + dy*dy;
		var offset = i*4;
		var value = [ pixels[offset+0], pixels[offset+1], pixels[offset+2], pixels[offset+3] ];
		if( !(value[0] + value[1] + value[2] === 0 && value[3] === 255) && dist < minDist){
			depthOfNearest = value;
		}
	}
//	var value = [ pixels[0], pixels[1], pixels[2], pixels[3] ];
	
	var linearDepth = 50;
	if(depthOfNearest != null){ // calculate linearDepth
		var v0 = depthOfNearest[0] / 255;
		var v1 = depthOfNearest[1] / 255;
		var v2 = depthOfNearest[2] / 255;
		var v3 = depthOfNearest[3] / 255;
		var expDepth = (v0/(256*256*256) + v1/(256*256) + v2/256 + v3);
		var invProj = this.camera.inverseProjectionMatrix;
		linearDepth = Math.abs(V3.transform(V3.$(0,0,expDepth), invProj).z);
	}
	
	var worldPos = null;
	{ // calculate direction
		var nx = x / Potree.canvas.width;
		var ny = y / Potree.canvas.height;
		var dir = this.camera.getDirection(nx, ny);
		var iFar = this.camera.getFarClipIntersection(nx, ny);
		var iNear = this.camera.getNearClipIntersection(nx, ny);
		var fd = V3.length(iFar);
		var nd = V3.length(iNear);
		var distance = (linearDepth / this.camera.farClipPlane) * fd;
		worldPos = V3.add(this.camera.globalPosition, V3.scale(dir,distance));
	}
	
	{ // reset fbos
		this.fboColor = fboColor;
		this.fboDepthAsRGBA = fboDepthAsRGBA;
		gl.disable(gl.SCISSOR_TEST);
		gl.viewport(this._viewport[0], this._viewport[1], this._viewport[2],this._viewport[3]);
	}
	
	return worldPos;
};

Renderer.prototype.clear = function(){
	if(this.fboColor != null){
		this.fboColor.bind();
		gl.clearColor(this.bgColor.r, this.bgColor.g, this.bgColor.b, this.bgColor.a);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	}
};

Renderer.prototype.render = function(){
	this.clear();
	
	this.lights = new Array();
	var pointClouds = new Array();
	var pointCloudOctrees = new Array();
	var meshes = new Array();
	this.camera = this.scene.activeCamera;
	
	var stack = new Array();
	stack.push(this.scene.rootNode);
	while(stack.length > 0){
		var node = stack.pop();
		for(var i in node.children){
			stack.push(node.children[i]);
		}
		
		if(node instanceof Light){
			this.lights.push(node);
		}else if(node instanceof PointCloudSceneNode){
			pointClouds.push(node);
		}else if(node instanceof PointcloudOctreeSceneNode){
			pointCloudOctrees.push(node);
		}else if(node instanceof Sphere){
			meshes.push(node);
		}
	}
	
	for(var i = 0; i < pointClouds.length; i++){
		var node = pointClouds[i];
		node.render(this);
	}
	
	for(var i = 0; i < pointCloudOctrees.length; i++){
		var node = pointCloudOctrees[i];
		node.render(this);
	}
	
	for(var i = 0; i < meshes.length; i++){
		var node = meshes[i];
		node.render(this);
	}
	
	// process the worldPosAt queue
	if(this.fboDepthAsRGBA == null){
		for(var i = 0; i < this.worldPosCallbackQueue.length; i++){
			var q = this.worldPosCallbackQueue[i];
			var worldPos = this._worldPosAt(q.x, q.y, q.width, q.height);
			q.callback(worldPos);
		}
		this.worldPosCallbackQueue.length = 0;
	}
	
};
















