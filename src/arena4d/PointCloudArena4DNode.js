const PointCloudTreeNode = require('../tree/PointCloudTreeNode');

class PointCloudArena4DNode extends PointCloudTreeNode {
	constructor () {
		super();

		this.left = null;
		this.right = null;
		this.sceneNode = null;
		this.kdtree = null;
	}

	getNumPoints () {
		return this.geometryNode.numPoints;
	}

	isLoaded () {
		return true;
	}

	isTreeNode () {
		return true;
	}

	isGeometryNode () {
		return false;
	}

	getLevel () {
		return this.geometryNode.level;
	}

	getBoundingSphere () {
		return this.geometryNode.boundingSphere;
	}

	getBoundingBox () {
		return this.geometryNode.boundingBox;
	}

	toTreeNode (child) {
		var geometryNode = null;

		if (this.left === child) {
			geometryNode = this.left;
		} else if (this.right === child) {
			geometryNode = this.right;
		}

		if (!geometryNode.loaded) {
			return;
		}

		var node = new PointCloudArena4DNode();
		var sceneNode = THREE.PointCloud(geometryNode.geometry, this.kdtree.material);
		sceneNode.visible = false;

		node.kdtree = this.kdtree;
		node.geometryNode = geometryNode;
		node.sceneNode = sceneNode;
		node.parent = this;
		node.left = this.geometryNode.left;
		node.right = this.geometryNode.right;
	}

	getChildren () {
		var children = [];

		if (this.left) {
			children.push(this.left);
		}

		if (this.right) {
			children.push(this.right);
		}

		return children;
	}
};

// TODO: here used to stand:
//       Potree.PointCloudOctreeNode.prototype = Object.create(Potree.PointCloudTreeNode.prototype);
//       Which I assume used to mean
//       Potree.PointCloudArena4DNode.prototype = Object.create(Potree.PointCloudTreeNode.prototype);
//       This was maybe just not necessary?

module.exports = PointCloudArena4DNode;
