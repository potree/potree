
Potree.PointCloudArena4DGeometryNode = function () {
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

Potree.PointCloudArena4DGeometryNode.nodesLoading = 0;

Potree.PointCloudArena4DGeometryNode.prototype.isGeometryNode = function () {
	return true;
};

Potree.PointCloudArena4DGeometryNode.prototype.isTreeNode = function () {
	return false;
};

Potree.PointCloudArena4DGeometryNode.prototype.isLoaded = function () {
	return this.loaded;
};

Potree.PointCloudArena4DGeometryNode.prototype.getBoundingSphere = function () {
	return this.boundingSphere;
};

Potree.PointCloudArena4DGeometryNode.prototype.getBoundingBox = function () {
	return this.boundingBox;
};

Potree.PointCloudArena4DGeometryNode.prototype.getChildren = function () {
	let children = [];

	if (this.left) {
		children.push(this.left);
	}

	if (this.right) {
		children.push(this.right);
	}

	return children;
};

Potree.PointCloudArena4DGeometryNode.prototype.getBoundingBox = function () {
	return this.boundingBox;
};

Potree.PointCloudArena4DGeometryNode.prototype.getLevel = function () {
	return this.level;
};

Potree.PointCloudArena4DGeometryNode.prototype.load = function () {
	if (this.loaded || this.loading) {
		return;
	}

	if (Potree.PointCloudArena4DGeometryNode.nodesLoading >= 5) {
		return;
	}

	this.loading = true;

	Potree.PointCloudArena4DGeometryNode.nodesLoading++;

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
			Potree.PointAttribute.POSITION_CARTESIAN,
			Potree.PointAttribute.RGBA_PACKED,
			Potree.PointAttribute.INTENSITY,
			Potree.PointAttribute.CLASSIFICATION,
		];

		let iAttributes = attributes
			.map(pa => Potree.toInterleavedBufferAttribute(pa))
			.filter(ia => ia != null);
		iAttributes.push(new Potree.InterleavedBufferAttribute("index", 4, 4, "UNSIGNED_BYTE", true));
		let iBuffer = new Potree.InterleavedBuffer(data, iAttributes, numPoints);

		let tightBoundingBox = new THREE.Box3();

		//debugger;

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
		//node.tightBoundingBox = tightBoundingBox;
		node.loaded = true;
		node.loading = false;
		Potree.PointCloudArena4DGeometryNode.nodesLoading--;
	};

	xhr.send(null);
};

Potree.PointCloudArena4DGeometryNode.prototype.dispose = function () {
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
};

Potree.PointCloudArena4DGeometryNode.prototype.getNumPoints = function () {
	return this.numPoints;
};

Potree.PointCloudArena4DGeometry = function () {
	this.numPoints = 0;
	this.version = 0;
	this.boundingBox = null;
	this.numNodes = 0;
	this.name = null;
	this.provider = null;
	this.url = null;
	this.root = null;
	this.levels = 0;
	this._spacing = null;
	this.pointAttributes = new Potree.PointAttributes([
		'POSITION_CARTESIAN',
		'COLOR_PACKED'
	]);
};

Potree.PointCloudArena4DGeometry.prototype = Object.create(THREE.EventDispatcher.prototype);

Potree.PointCloudArena4DGeometry.load = function (url, callback) {
	let xhr = new XMLHttpRequest();
	xhr.open('GET', url + '?info', true);

	xhr.onreadystatechange = function () {
		try {
			if (xhr.readyState === 4 && xhr.status === 200) {
				let response = JSON.parse(xhr.responseText);

				let geometry = new Potree.PointCloudArena4DGeometry();
				geometry.url = url;
				geometry.name = response.Name;
				geometry.provider = response.Provider;
				geometry.numNodes = response.Nodes;
				geometry.numPoints = response.Points;
				geometry.version = response.Version;
				geometry.boundingBox = new THREE.Box3(
					new THREE.Vector3().fromArray(response.BoundingBox.slice(0, 3)),
					new THREE.Vector3().fromArray(response.BoundingBox.slice(3, 6))
				);
				if (response.Spacing) {
					geometry.spacing = response.Spacing;
				}

				let offset = geometry.boundingBox.min.clone().multiplyScalar(-1);

				geometry.boundingBox.min.add(offset);
				geometry.boundingBox.max.add(offset);
				geometry.offset = offset;

				let center = geometry.boundingBox.getCenter();
				let radius = geometry.boundingBox.getSize().length() / 2;
				geometry.boundingSphere = new THREE.Sphere(center, radius);

				geometry.loadHierarchy();

				callback(geometry);
			} else if (xhr.readyState === 4) {
				callback(null);
			}
		} catch (e) {
			console.error(e.message);
			callback(null);
		}
	};

	xhr.send(null);
};

Potree.PointCloudArena4DGeometry.prototype.loadHierarchy = function () {
	let url = this.url + '?tree';
	let xhr = new XMLHttpRequest();
	xhr.open('GET', url, true);
	xhr.responseType = 'arraybuffer';

	let scope = this;

	xhr.onreadystatechange = function () {
		if (!(xhr.readyState === 4 && xhr.status === 200)) {
			return;
		}

		let buffer = xhr.response;
		let numNodes = buffer.byteLength /	3;
		let view = new DataView(buffer);
		let stack = [];
		let root = null;

		let levels = 0;

		// TODO Debug: let start = new Date().getTime();
		// read hierarchy
		for (let i = 0; i < numNodes; i++) {
			let mask = view.getUint8(i * 3 + 0, true);
			// TODO Unused: let numPoints = view.getUint16(i * 3 + 1, true);

			let hasLeft = (mask & 1) > 0;
			let hasRight = (mask & 2) > 0;
			let splitX = (mask & 4) > 0;
			let splitY = (mask & 8) > 0;
			let splitZ = (mask & 16) > 0;
			let split = null;
			if (splitX) {
				split = 'X';
			} else if (splitY) {
				split = 'Y';
			} if (splitZ) {
				split = 'Z';
			}

			let node = new Potree.PointCloudArena4DGeometryNode();
			node.hasLeft = hasLeft;
			node.hasRight = hasRight;
			node.split = split;
			node.isLeaf = !hasLeft && !hasRight;
			node.number = i;
			node.left = null;
			node.right = null;
			node.pcoGeometry = scope;
			node.level = stack.length;
			levels = Math.max(levels, node.level);

			if (stack.length > 0) {
				let parent = stack[stack.length - 1];
				node.boundingBox = parent.boundingBox.clone();
				let parentBBSize = parent.boundingBox.getSize();

				if (parent.hasLeft && !parent.left) {
					parent.left = node;
					parent.children.push(node);

					if (parent.split === 'X') {
						node.boundingBox.max.x = node.boundingBox.min.x + parentBBSize.x / 2;
					} else if (parent.split === 'Y') {
						node.boundingBox.max.y = node.boundingBox.min.y + parentBBSize.y / 2;
					} else if (parent.split === 'Z') {
						node.boundingBox.max.z = node.boundingBox.min.z + parentBBSize.z / 2;
					}

					let center = node.boundingBox.getCenter();
					let radius = node.boundingBox.getSize().length() / 2;
					node.boundingSphere = new THREE.Sphere(center, radius);
				} else {
					parent.right = node;
					parent.children.push(node);

					if (parent.split === 'X') {
						node.boundingBox.min.x = node.boundingBox.min.x + parentBBSize.x / 2;
					} else if (parent.split === 'Y') {
						node.boundingBox.min.y = node.boundingBox.min.y + parentBBSize.y / 2;
					} else if (parent.split === 'Z') {
						node.boundingBox.min.z = node.boundingBox.min.z + parentBBSize.z / 2;
					}

					let center = node.boundingBox.getCenter();
					let radius = node.boundingBox.getSize().length() / 2;
					node.boundingSphere = new THREE.Sphere(center, radius);
				}
			} else {
				root = node;
				root.boundingBox = scope.boundingBox.clone();
				let center = root.boundingBox.getCenter();
				let radius = root.boundingBox.getSize().length() / 2;
				root.boundingSphere = new THREE.Sphere(center, radius);
			}

			let bbSize = node.boundingBox.getSize();
			node.spacing = ((bbSize.x + bbSize.y + bbSize.z) / 3) / 75;

			stack.push(node);

			if (node.isLeaf) {
				let done = false;
				while (!done && stack.length > 0) {
					stack.pop();

					let top = stack[stack.length - 1];

					done = stack.length > 0 && top.hasRight && top.right == null;
				}
			}
		}
		// TODO Debug:
		// let end = new Date().getTime();
		// let parseDuration = end - start;
		// let msg = parseDuration;
		// document.getElementById("lblDebug").innerHTML = msg;

		scope.root = root;
		scope.levels = levels;
		// console.log(this.root);

		scope.dispatchEvent({type: 'hierarchy_loaded'});
	};

	xhr.send(null);
};

Object.defineProperty(Potree.PointCloudArena4DGeometry.prototype, 'spacing', {
	get: function () {
		if (this._spacing) {
			return this._spacing;
		} else if (this.root) {
			return this.root.spacing;
		} else {
			// TODO ???: null;
		}
	},
	set: function (value) {
		this._spacing = value;
	}
});
