Potree.PointCloudOctreeNode = class PointCloudOctreeNode extends Potree.PointCloudTreeNode {
	constructor () {
		super();

		this.children = {};
		this.sceneNode = null;
		this.octree = null;
	}

	getNumPoints () {
		return this.geometryNode.numPoints;
	};

	isLoaded () {
		return true;
	};

	isTreeNode () {
		return true;
	};

	isGeometryNode () {
		return false;
	};

	getLevel () {
		return this.geometryNode.level;
	};

	getBoundingSphere () {
		return this.geometryNode.boundingSphere;
	};

	getBoundingBox () {
		return this.geometryNode.boundingBox;
	};

	getChildren () {
		let children = [];

		for (let i = 0; i < 8; i++) {
			if (this.children[i]) {
				children.push(this.children[i]);
			}
		}

		return children;
	};

	get name () {
		return this.geometryNode.name;
	}
};
