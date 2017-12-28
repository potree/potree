const THREE = require('three');
const toInterleavedBufferAttribute = require('../utils/toInterleavedBufferAttribute');
const InterleavedBuffer = require('../InterleavedBuffer');
const InterleavedBufferAttribute = require('../InterleavedBufferAttribute');
const PointAttribute = require('../loader/PointAttribute');

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
	let children = [];

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

	let url = this.pcoGeometry.url + '?node=' + this.number;
	let xhr = new XMLHttpRequest();
	xhr.open('GET', url, true);
	xhr.responseType = 'arraybuffer';

	let node = this;

	xhr.onreadystatechange = function () {
		if (!(xhr.readyState === 4 && xhr.status === 200)) {
			return;
		}

		let buffer = xhr.response;
		let sourceView = new DataView(buffer);
		let numPoints = buffer.byteLength / 17;
		let bytesPerPoint = 28;

		let data = new ArrayBuffer(numPoints * bytesPerPoint);
		let targetView = new DataView(data);

		let attributes = [
			PointAttribute.POSITION_CARTESIAN,
			PointAttribute.RGBA_PACKED,
			PointAttribute.INTENSITY,
			PointAttribute.CLASSIFICATION
		];

		let iAttributes = attributes
			.map(toInterleavedBufferAttribute)
			.filter(ia => ia != null);
		iAttributes.push(new InterleavedBufferAttribute('index', 4, 4, 'UNSIGNED_BYTE', true));
		let iBuffer = new InterleavedBuffer(data, iAttributes, numPoints);

		let tightBoundingBox = new THREE.Box3();
		// debugger;

		for (let i = 0; i < numPoints; i++) {
			let x = sourceView.getFloat32(i * 17 + 0, true) + node.boundingBox.min.x;
			let y = sourceView.getFloat32(i * 17 + 4, true) + node.boundingBox.min.y;
			let z = sourceView.getFloat32(i * 17 + 8, true) + node.boundingBox.min.z;
			let r = sourceView.getUint8(i * 17 + 12, true);
			let g = sourceView.getUint8(i * 17 + 13, true);
			let b = sourceView.getUint8(i * 17 + 14, true);
			let intensity = sourceView.getUint8(i * 17 + 15, true);
			let classification = sourceView.getUint8(i * 17 + 16, true);

			tightBoundingBox.expandByPoint(new THREE.Vector3(x, y, z));

			targetView.setFloat32(i * bytesPerPoint + 0, x, true);
			targetView.setFloat32(i * bytesPerPoint + 4, y, true);
			targetView.setFloat32(i * bytesPerPoint + 8, z, true);

			targetView.setUint8(i * bytesPerPoint + 12, r);
			targetView.setUint8(i * bytesPerPoint + 13, g);
			targetView.setUint8(i * bytesPerPoint + 14, b);
			targetView.setUint8(i * bytesPerPoint + 15, 255);

			targetView.setFloat32(i * bytesPerPoint + 16, intensity, true);
			targetView.setUint8(i * bytesPerPoint + 20, classification, true);
			targetView.setUint32(i * bytesPerPoint + 24, i, true);
		}

		node.numPoints = iBuffer.numElements;
		node.buffer = iBuffer;
		// node.tightBoundingBox = tightBoundingBox;
		node.loaded = true;
		node.loading = false;
		PointCloudArena4DGeometryNode.nodesLoading--;
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
