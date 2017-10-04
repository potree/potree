const THREE = require('three');

const PointCloudArena4DGeometryNode = function () {
	this.left = null;
	this.right = null;
	this.boundingBox = null;
	this.number = null;
	this.pcoGeometry = null;
	this.loaded = false;
	this.numPoints = 0;
	this.level = 0;
	this.children = [];
	this.oneTimeDisposeHandlers = [];
};

PointCloudArena4DGeometryNode.nodesLoading = 0;

PointCloudArena4DGeometryNode.prototype.isGeometryNode = function () {
	return true;
};

PointCloudArena4DGeometryNode.prototype.isTreeNode = function () {
	return false;
};

PointCloudArena4DGeometryNode.prototype.isLoaded = function () {
	return this.loaded;
};

PointCloudArena4DGeometryNode.prototype.getBoundingSphere = function () {
	return this.boundingSphere;
};

PointCloudArena4DGeometryNode.prototype.getBoundingBox = function () {
	return this.boundingBox;
};

PointCloudArena4DGeometryNode.prototype.getChildren = function () {
	var children = [];

	if (this.left) {
		children.push(this.left);
	}

	if (this.right) {
		children.push(this.right);
	}

	return children;
};

PointCloudArena4DGeometryNode.prototype.getBoundingBox = function () {
	return this.boundingBox;
};

PointCloudArena4DGeometryNode.prototype.getLevel = function () {
	return this.level;
};

PointCloudArena4DGeometryNode.prototype.load = function () {
	if (this.loaded || this.loading) {
		return;
	}

	if (PointCloudArena4DGeometryNode.nodesLoading >= 5) {
		return;
	}

	this.loading = true;

	PointCloudArena4DGeometryNode.nodesLoading++;

	var url = this.pcoGeometry.url + '?node=' + this.number;
	var xhr = new XMLHttpRequest();
	xhr.open('GET', url, true);
	xhr.responseType = 'arraybuffer';

	var scope = this;

	xhr.onreadystatechange = function () {
		if (!(xhr.readyState === 4 && xhr.status === 200)) {
			return;
		}

		var buffer = xhr.response;
		var view = new DataView(buffer);
		var numPoints = buffer.byteLength / 17;

		var positions = new Float32Array(numPoints * 3);
		var colors = new Uint8Array(numPoints * 3);
		var indices = new ArrayBuffer(numPoints * 4);
		var iIndices = new Uint32Array(indices);

		for (var i = 0; i < numPoints; i++) {
			var x = view.getFloat32(i * 17 + 0, true) + scope.boundingBox.min.x;
			var y = view.getFloat32(i * 17 + 4, true) + scope.boundingBox.min.y;
			var z = view.getFloat32(i * 17 + 8, true) + scope.boundingBox.min.z;
			var r = view.getUint8(i * 17 + 12, true);
			var g = view.getUint8(i * 17 + 13, true);
			var b = view.getUint8(i * 17 + 14, true);

			positions[i * 3 + 0] = x;
			positions[i * 3 + 1] = y;
			positions[i * 3 + 2] = z;

			colors[i * 3 + 0] = r;
			colors[i * 3 + 1] = g;
			colors[i * 3 + 2] = b;

			iIndices[i] = i;
		}

		var geometry = new THREE.BufferGeometry();
		geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
		geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3, true));
		geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(numPoints * 3), 3));

		let indicesAttribute = new THREE.Uint8BufferAttribute(indices, 4);
		indicesAttribute.normalized = true;
		geometry.addAttribute('indices', indicesAttribute);

		scope.geometry = geometry;
		scope.loaded = true;
		PointCloudArena4DGeometryNode.nodesLoading--;

		geometry.boundingBox = scope.boundingBox;
		geometry.boundingSphere = scope.boundingSphere;

		scope.numPoints = numPoints;

		scope.loading = false;
	};

	xhr.send(null);
};

PointCloudArena4DGeometryNode.prototype.dispose = function () {
	if (this.geometry && this.parent != null) {
		this.geometry.dispose();
		this.geometry = null;
		this.loaded = false;

		// this.dispatchEvent( { type: 'dispose' } );
		for (var i = 0; i < this.oneTimeDisposeHandlers.length; i++) {
			var handler = this.oneTimeDisposeHandlers[i];
			handler();
		}
		this.oneTimeDisposeHandlers = [];
	}
};

PointCloudArena4DGeometryNode.prototype.getNumPoints = function () {
	return this.numPoints;
};

module.exports = PointCloudArena4DGeometryNode;
