
export class OctreeGeometry{

	constructor(){
		this.url = null;
		this.spacing = 0;
		this.boundingBox = null;
		this.root = null;
		this.pointAttributes = null;
		this.loader = null;
	}

};

export class OctreeGeometryNode{

	constructor(name, octreeGeometry, boundingBox){
		this.id = OctreeGeometryNode.IDCount++;
		this.name = name;
		this.index = parseInt(name.charAt(name.length - 1));
		this.octreeGeometry = octreeGeometry;
		this.boundingBox = boundingBox;
		this.boundingSphere = boundingBox.getBoundingSphere(new THREE.Sphere());
		this.children = {};
		this.numPoints = 0;
		this.level = null;
		this.oneTimeDisposeHandlers = [];
	}

	isGeometryNode(){
		return true;
	}

	getLevel(){
		return this.level;
	}

	isTreeNode(){
		return false;
	}

	isLoaded(){
		return this.loaded;
	}

	getBoundingSphere(){
		return this.boundingSphere;
	}

	getBoundingBox(){
		return this.boundingBox;
	}

	getChildren(){
		let children = [];

		for (let i = 0; i < 8; i++) {
			if (this.children[i]) {
				children.push(this.children[i]);
			}
		}

		return children;
	}

	getBoundingBox(){
		return this.boundingBox;
	}

	loadPoints(){
		this.octreeGeometry.loader.load(this);
	}

	load(){
		if (this.loading === true || this.loaded === true || Potree.numNodesLoading >= Potree.maxNodesLoading) {
			return;
		}

		this.loading = true;

		Potree.numNodesLoading++;

		this.loadPoints();
	}

	getNumPoints(){
		return this.numPoints;
	}

	dispose(){
		if (this.geometry && this.parent != null) {
			this.geometry.dispose();
			this.geometry = null;
			this.loaded = false;

			// this.dispatchEvent( { type: 'dispose' } );
			for (let i = 0; i < this.oneTimeDisposeHandlers.length; i++) {
				let handler = this.oneTimeDisposeHandlers[i];
				handler();
			}
			this.oneTimeDisposeHandlers = [];
		}
	}

};

OctreeGeometryNode.IDCount = 0;