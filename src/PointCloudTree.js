



Potree.PointCloudTreeNode = class{
	
	constructor(){
		
	}
	
	getChildren(){
		throw "override function";
	};
	
	getBoundingBox(){
		throw "override function";
	};

	isLoaded(){
		throw "override function";
	};
	
	isGeometryNode(){
		throw "override function";
	};
	
	isTreeNode(){
		throw "override function";
	};
	
	getLevel(){
		throw "override function";
	};

	getBoundingSphere(){
		throw "override function";
	};
	
};


Potree.PointCloudTree = class PointCloudTree extends THREE.Object3D{
	
	constructor(){
		super();
	}
	
	initialized(){
		return this.root !== null;
	};

	
};

