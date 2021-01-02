
import * as THREE from "../../libs/three.js/build/three.module.js";
import {EventDispatcher} from "../EventDispatcher.js";

Potree.PointCloudArena4DGeometryNode = class PointCloudArena4DGeometryNode{

	constructor(){
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
	}

	isGeometryNode(){
		return true;
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

		if (this.left) {
			children.push(this.left);
		}

		if (this.right) {
			children.push(this.right);
		}

		return children;
	}

	getBoundingBox(){
		return this.boundingBox;
	}

	getLevel(){
		return this.level;
	}

	load(){
		if (this.loaded || this.loading) {
			return;
		}

		if (Potree.numNodesLoading >= Potree.maxNodesLoading) {
			return;
		}

		this.loading = true;

		Potree.numNodesLoading++;

		let url = this.pcoGeometry.url + '?node=' + this.number;
		let xhr = Potree.XHRFactory.createXMLHttpRequest();
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


			let position = new Float32Array(numPoints * 3);
			let color = new Uint8Array(numPoints * 4);
			let intensities = new Float32Array(numPoints);
			let classifications = new Uint8Array(numPoints);
			let indices = new ArrayBuffer(numPoints * 4);
			let u32Indices = new Uint32Array(indices);

			let tightBoundingBox = new THREE.Box3();

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

				position[i * 3 + 0] = x;
				position[i * 3 + 1] = y;
				position[i * 3 + 2] = z;

				color[i * 4 + 0] = r;
				color[i * 4 + 1] = g;
				color[i * 4 + 2] = b;
				color[i * 4 + 3] = 255;

				intensities[i] = intensity;
				classifications[i] = classification;

				u32Indices[i] = i;
			}

			let geometry = new THREE.BufferGeometry();

			geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
			geometry.setAttribute('color', new THREE.BufferAttribute(color, 4, true));
			geometry.setAttribute('intensity', new THREE.BufferAttribute(intensities, 1));
			geometry.setAttribute('classification', new THREE.BufferAttribute(classifications, 1));
			{
				let bufferAttribute = new THREE.BufferAttribute(new Uint8Array(indices), 4, true);
				//bufferAttribute.normalized = true;
				geometry.setAttribute('indices', bufferAttribute);
			}
		
			node.geometry = geometry;
			node.numPoints = numPoints;
			node.loaded = true;
			node.loading = false;
			Potree.numNodesLoading--;
		};

		xhr.send(null);
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

	getNumPoints(){
		return this.numPoints;
	}
};





Potree.PointCloudArena4DGeometry = class PointCloudArena4DGeometry extends EventDispatcher{

	constructor(){
		super();

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
	}

	static load(url, callback) {
		let xhr = Potree.XHRFactory.createXMLHttpRequest();
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

					let center = geometry.boundingBox.getCenter(new THREE.Vector3());
					let radius = geometry.boundingBox.getSize(new THREE.Vector3()).length() / 2;
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

	loadHierarchy(){
		let url = this.url + '?tree';
		let xhr = Potree.XHRFactory.createXMLHttpRequest();
		xhr.open('GET', url, true);
		xhr.responseType = 'arraybuffer';

		xhr.onreadystatechange = () => {
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
				node.pcoGeometry = this;
				node.level = stack.length;
				levels = Math.max(levels, node.level);

				if (stack.length > 0) {
					let parent = stack[stack.length - 1];
					node.boundingBox = parent.boundingBox.clone();
					let parentBBSize = parent.boundingBox.getSize(new THREE.Vector3());

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

						let center = node.boundingBox.getCenter(new THREE.Vector3());
						let radius = node.boundingBox.getSize(new THREE.Vector3()).length() / 2;
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

						let center = node.boundingBox.getCenter(new THREE.Vector3());
						let radius = node.boundingBox.getSize(new THREE.Vector3()).length() / 2;
						node.boundingSphere = new THREE.Sphere(center, radius);
					}
				} else {
					root = node;
					root.boundingBox = this.boundingBox.clone();
					let center = root.boundingBox.getCenter(new THREE.Vector3());
					let radius = root.boundingBox.getSize(new THREE.Vector3()).length() / 2;
					root.boundingSphere = new THREE.Sphere(center, radius);
				}

				let bbSize = node.boundingBox.getSize(new THREE.Vector3());
				node.spacing = ((bbSize.x + bbSize.y + bbSize.z) / 3) / 75;
				node.estimatedSpacing = node.spacing;

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

			this.root = root;
			this.levels = levels;
			// console.log(this.root);

			this.dispatchEvent({type: 'hierarchy_loaded'});
		};

		xhr.send(null);
	};

	get spacing(){
		if (this._spacing) {
			return this._spacing;
		} else if (this.root) {
			return this.root.spacing;
		} else {
			// TODO ???: null;
		}
	}

	set spacing(value){
		this._spacing = value;
	}

};

