
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
	var children = [];

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
		Potree.PointCloudArena4DGeometryNode.nodesLoading--;

		geometry.boundingBox = scope.boundingBox;
		geometry.boundingSphere = scope.boundingSphere;

		scope.numPoints = numPoints;

		scope.loading = false;
	};

	xhr.send(null);
};

Potree.PointCloudArena4DGeometryNode.prototype.dispose = function () {
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
	var xhr = new XMLHttpRequest();
	xhr.open('GET', url + '?info', true);

	xhr.onreadystatechange = function () {
		try {
			if (xhr.readyState === 4 && xhr.status === 200) {
				var response = JSON.parse(xhr.responseText);

				var geometry = new Potree.PointCloudArena4DGeometry();
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

				var offset = geometry.boundingBox.min.clone().multiplyScalar(-1);

				geometry.boundingBox.min.add(offset);
				geometry.boundingBox.max.add(offset);
				geometry.offset = offset;

				var center = geometry.boundingBox.getCenter();
				var radius = geometry.boundingBox.getSize().length() / 2;
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
	var url = this.url + '?tree';
	var xhr = new XMLHttpRequest();
	xhr.open('GET', url, true);
	xhr.responseType = 'arraybuffer';

	var scope = this;

	xhr.onreadystatechange = function () {
		if (!(xhr.readyState === 4 && xhr.status === 200)) {
			return;
		}

		var buffer = xhr.response;
		var numNodes = buffer.byteLength /	3;
		var view = new DataView(buffer);
		var stack = [];
		var root = null;

		var levels = 0;

		// TODO Debug: var start = new Date().getTime();
		// read hierarchy
		for (var i = 0; i < numNodes; i++) {
			var mask = view.getUint8(i * 3 + 0, true);
			// TODO Unused: var numPoints = view.getUint16(i * 3 + 1, true);

			var hasLeft = (mask & 1) > 0;
			var hasRight = (mask & 2) > 0;
			var splitX = (mask & 4) > 0;
			var splitY = (mask & 8) > 0;
			var splitZ = (mask & 16) > 0;
			var split = null;
			if (splitX) {
				split = 'X';
			} else if (splitY) {
				split = 'Y';
			} if (splitZ) {
				split = 'Z';
			}

			var node = new Potree.PointCloudArena4DGeometryNode();
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
				var parent = stack[stack.length - 1];
				node.boundingBox = parent.boundingBox.clone();
				var parentBBSize = parent.boundingBox.getSize();

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
				var center = root.boundingBox.getCenter();
				var radius = root.boundingBox.getSize().length() / 2;
				root.boundingSphere = new THREE.Sphere(center, radius);
			}

			var bbSize = node.boundingBox.getSize();
			node.spacing = ((bbSize.x + bbSize.y + bbSize.z) / 3) / 75;

			stack.push(node);

			if (node.isLeaf) {
				var done = false;
				while (!done && stack.length > 0) {
					stack.pop();

					var top = stack[stack.length - 1];

					done = stack.length > 0 && top.hasRight && top.right == null;
				}
			}
		}
		// TODO Debug:
		// var end = new Date().getTime();
		// var parseDuration = end - start;
		// var msg = parseDuration;
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
