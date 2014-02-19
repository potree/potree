
/**
 * @class
 * @augments SceneNode
 * 
 */
function Camera(name) {
	SceneNode.call(this, name);
	this._nearClipPlane = 0.1;
	this._farClipPlane = 250.0;
	this._fieldOfView = 60.0;
	this._aspectRatio = 1;
	this._viewMatrix = null;
	this._projectionMatrix = null;
	this.updateViewMatrix();
	this.updateProjectionMatrix();
}

Camera.prototype = new SceneNode(inheriting);
Camera.base = SceneNode.prototype;

Object.defineProperties(Camera.prototype, {
	"farClipPlane" : {
		set: function(farClipPlane){
			this._farClipPlane = farClipPlane;
			this.updateProjectionMatrix();
		},
		get: function(){
			return this._farClipPlane;
		}
	},
	"nearClipPlane" : {
		set: function(nearClipPlane){
			this._nearClipPlane = nearClipPlane;
			this.updateProjectionMatrix();
		},
		get: function(){
			return this._nearClipPlane;
		}
	},
	"transform": {
		set: function(transform){
			Object.getOwnPropertyDescriptor(Camera.base, 'transform').set.call(this, transform);
			this.updateViewMatrix();
		},
		get: function(){
			return this._transform;
		}
	},
	"frustum": {
		get: function(){
			return Frustum.fromCamera(this);
		}
	},
	"projectionMatrix": {
		get: function(){
			return this._projectionMatrix;
		}
	},
	"inverseProjectionMatrix": {
		get: function(){
			return this._inverseProjectionMatrix;
		}
	},
	"viewMatrix": {
		get: function(){
			return this._viewMatrix;
		},
		set: function(viewMatrix){
			this._viewMatrix = viewMatrix;
		}
	},
	"fieldOfView": {
		set: function(fieldOfView){
			this._fieldOfView = fieldOfView;
			this.updateProjectionMatrix();
		},
		get: function(){
			return this._fieldOfView;
		}
	},
	"aspectRatio": {
		set: function(aspectRatio){
			this._aspectRatio = aspectRatio;
			this.updateProjectionMatrix();
		},
		get: function(){
			return this._aspectRatio;
		}
	}
});

Camera.prototype.updateProjectionMatrix = function(){
	this._projectionMatrix = M4x4.makePerspective(this.fieldOfView, this.aspectRatio,
			this.nearClipPlane, this.farClipPlane);
	this._inverseProjectionMatrix = M4x4.makeInversePerspective(this.fieldOfView, this.aspectRatio,
			this.nearClipPlane, this.farClipPlane);
};

/**
 * calculates the current view matrix and stores it in _viewMatrix. use .viewMatrix if you want to get the matrix.
 */
Camera.prototype.updateViewMatrix = function(){
	this.viewMatrix = this.getInverseGlobalTransformation();
};

Camera.prototype.translate = function(x, y, z){
	Camera.base.translate.call(this, x, y, z);
	this.updateViewMatrix();
};

/**
 * nx and ny are in range [0,1]
 * origin is at the bottom left
 */
Camera.prototype.getDirection = function(nx, ny){
	var ymax = this.nearClipPlane * Math.tan(this.fieldOfView * Math.PI / 360.0);
    var ymin = -ymax;
    var xmin = ymin * this.aspectRatio;
    var xmax = ymax * this.aspectRatio;
    
    var x = (1-nx)*xmin + nx*xmax;
    var y = (1-ny)*ymin + ny*ymax;
    var z = this.nearClipPlane;
    var dir = V3.normalize(V3.$(x,y,-z));
    dir = V3.transform(dir, this.globalTransformation);
    dir = V3.sub(dir, this.globalPosition);
    
    return V3.normalize(dir);
};

/**
 * nx and ny are in range [0,1]
 * origin is at the bottom left
 */
Camera.prototype.getFarClipIntersection = function(nx, ny){
	var ymax = this.nearClipPlane * Math.tan(this.fieldOfView * Math.PI / 360.0);
    var ymin = -ymax;
    var xmin = ymin * this.aspectRatio;
    var xmax = ymax * this.aspectRatio;
    
    var x = (1-nx)*xmin + nx*xmax;
    var y = (1-ny)*ymin + ny*ymax;
    var z = this.nearClipPlane;
    var dir = V3.normalize(V3.$(x,y,-z));
    
    var plane = new Plane(this.farClipPlane, V3.$(0,0,1));
    var I = plane.intersection(V3.$(0,0,0), dir);
    
    return I;
};

/**
 * nx and ny are in range [0,1]
 * origin is at the bottom left
 */
Camera.prototype.getNearClipIntersection = function(nx, ny){
	var ymax = this.nearClipPlane * Math.tan(this.fieldOfView * Math.PI / 360.0);
    var ymin = -ymax;
    var xmin = ymin * this.aspectRatio;
    var xmax = ymax * this.aspectRatio;
    
    var x = (1-nx)*xmin + nx*xmax;
    var y = (1-ny)*ymin + ny*ymax;
    var z = this.nearClipPlane;
    var dir = V3.normalize(V3.$(x,y,-z));
    
    var plane = new Plane(this.nearClipPlane, V3.$(0,0,1));
    var I = plane.intersection(V3.$(0,0,0), dir);
    
    return I;
};






