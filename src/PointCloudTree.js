



Potree.PointCloudTreeNode = function(){
	
	this.getChildren = function(){
		throw "override function";
	};
	
	this.getBoundingBox = function(){
		throw "override function";
	};

	this.isLoaded = function(){
		throw "override function";
	};
	
	this.isGeometryNode = function(){
		throw "override function";
	};
	
	this.isTreeNode = function(){
		throw "override function";
	};
	
	this.getLevel = function(){
		throw "override function";
	};

	this.getBoundingSphere = function(){
		throw "override function";
	};
	
};


Potree.PointCloudTree = function(){
	THREE.Object3D.call( this );
	
	this.initialized = function(){
		return this.root !== null;
	};

	
};

Potree.PointCloudTree.prototype = Object.create(THREE.Object3D.prototype);

