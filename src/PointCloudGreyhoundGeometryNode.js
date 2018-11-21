

import { EventDispatcher } from "./EventDispatcher";
import { PointCloudTreeNode } from "./PointCloudTree";


export class PointCloudGreyhoundGeometryNode extends PointCloudTreeNode{

	constructor(name, pcoGeometry, boundingBox, scale, offset){

		this.id = PointCloudGreyhoundGeometryNode.IDCount++;

		this.name = name;
		this.index = parseInt(name.charAt(name.length - 1));
		this.pcoGeometry = pcoGeometry;
		this.geometry = null;
		this.boundingBox = boundingBox;
		this.boundingSphere = boundingBox.getBoundingSphere(new THREE.Sphere());
		this.scale = scale;
		this.offset = offset;
		this.children = {};
		this.numPoints = 0;
		this.level = null;
		this.loaded = false;
		this.oneTimeDisposeHandlers = [];
		this.baseLoaded = false;

		let bounds = this.boundingBox.clone();
		bounds.min.sub(this.pcoGeometry.boundingBox.getCenter(new THREE.Vector3()));
		bounds.max.sub(this.pcoGeometry.boundingBox.getCenter(new THREE.Vector3()));

		if (this.scale) {
			bounds.min.multiplyScalar(1 / this.scale);
			bounds.max.multiplyScalar(1 / this.scale);
		}

		// This represents the bounds for this node in the reference frame of the
		// global bounds from `info`, centered around the origin, and then scaled
		// by our selected scale.
		this.greyhoundBounds = bounds;

		// This represents the offset between the coordinate system described above
		// and our pcoGeometry bounds.
		this.greyhoundOffset = this.pcoGeometry.offset.clone().add(
			this.pcoGeometry.boundingBox.getSize(new THREE.Vector3()).multiplyScalar(0.5)
		);
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

	getLevel(){
		return this.level;
	}

	getChildren(){
		let children = [];

		for (let i = 0; i < 8; ++i) {
			if (this.children[i]) {
				children.push(this.children[i]);
			}
		}

		return children;
	}

	getURL(){
		let schema = this.pcoGeometry.schema;
		let bounds = this.greyhoundBounds;

		let boundsString =
					bounds.min.x + ',' + bounds.min.y + ',' + bounds.min.z + ',' +
					bounds.max.x + ',' + bounds.max.y + ',' + bounds.max.z;

		let url = '' + this.pcoGeometry.serverURL +
					'read?depthBegin=' +
					(this.baseLoaded ? (this.level + this.pcoGeometry.baseDepth) : 0) +
					'&depthEnd=' + (this.level + this.pcoGeometry.baseDepth + 1) +
					'&bounds=[' + boundsString + ']' +
					'&schema=' + JSON.stringify(schema) +
					'&compress=true';

		if (this.scale) {
			url += '&scale=' + this.scale;
		}

		if (this.greyhoundOffset) {
			let offset = this.greyhoundOffset;
			url += '&offset=[' + offset.x + ',' + offset.y + ',' + offset.z + ']';
		}

		if (!this.baseLoaded) this.baseLoaded = true;

		return url;
	}

	addChild(child){
		this.children[child.index] = child;
		child.parent = this;
	}

	load(){
		if (
			this.loading === true ||
			this.loaded === true ||
			Potree.numNodesLoading >= Potree.maxNodesLoading) {
			return;
		}

		this.loading = true;
		Potree.numNodesLoading++;

		if (
			this.level % this.pcoGeometry.hierarchyStepSize === 0 &&
			this.hasChildren) {
			this.loadHierarchyThenPoints();
		} else {
			this.loadPoints();
		}
	}

	loadPoints(){
		this.pcoGeometry.loader.load(this);
	}

	loadHierarchyThenPoints(){
		// From Greyhound (Cartesian) ordering for the octree to Potree-default
		let transform = [0, 2, 1, 3, 4, 6, 5, 7];

		let makeBitMask = function (node) {
			let mask = 0;
			Object.keys(node).forEach(function (key) {
				if (key === 'swd') mask += 1 << transform[0];
				else if (key === 'nwd') mask += 1 << transform[1];
				else if (key === 'swu') mask += 1 << transform[2];
				else if (key === 'nwu') mask += 1 << transform[3];
				else if (key === 'sed') mask += 1 << transform[4];
				else if (key === 'ned') mask += 1 << transform[5];
				else if (key === 'seu') mask += 1 << transform[6];
				else if (key === 'neu') mask += 1 << transform[7];
			});
			return mask;
		};

		let parseChildrenCounts = function (base, parentName, stack) {
			let keys = Object.keys(base);
			let child;
			let childName;

			keys.forEach(function (key) {
				if (key === 'n') return;
				switch (key) {
					case 'swd':
						child = base.swd; childName = parentName + transform[0];
						break;
					case 'nwd':
						child = base.nwd; childName = parentName + transform[1];
						break;
					case 'swu':
						child = base.swu; childName = parentName + transform[2];
						break;
					case 'nwu':
						child = base.nwu; childName = parentName + transform[3];
						break;
					case 'sed':
						child = base.sed; childName = parentName + transform[4];
						break;
					case 'ned':
						child = base.ned; childName = parentName + transform[5];
						break;
					case 'seu':
						child = base.seu; childName = parentName + transform[6];
						break;
					case 'neu':
						child = base.neu; childName = parentName + transform[7];
						break;
					default:
						break;
				}

				stack.push({
					children: makeBitMask(child),
					numPoints: child.n,
					name: childName
				});

				parseChildrenCounts(child, childName, stack);
			});
		};

		// Load hierarchy.
		let callback = function (node, greyhoundHierarchy) {
			let decoded = [];
			node.numPoints = greyhoundHierarchy.n;
			parseChildrenCounts(greyhoundHierarchy, node.name, decoded);

			let nodes = {};
			nodes[node.name] = node;
			let pgg = node.pcoGeometry;

			for (let i = 0; i < decoded.length; i++) {
				let name = decoded[i].name;
				let numPoints = decoded[i].numPoints;
				let index = parseInt(name.charAt(name.length - 1));
				let parentName = name.substring(0, name.length - 1);
				let parentNode = nodes[parentName];
				let level = name.length - 1;
				let boundingBox = Potree.GreyhoundLoader.createChildAABB(
					parentNode.boundingBox, index);

				let currentNode = new Potree.PointCloudGreyhoundGeometryNode(
					name, pgg, boundingBox, node.scale, node.offset);

				currentNode.level = level;
				currentNode.numPoints = numPoints;
				currentNode.hasChildren = decoded[i].children > 0;
				currentNode.spacing = pgg.spacing / Math.pow(2, level);
				parentNode.addChild(currentNode);
				nodes[name] = currentNode;
			}

			node.loadPoints();
		};

		if (this.level % this.pcoGeometry.hierarchyStepSize === 0) {
			let depthBegin = this.level + this.pcoGeometry.baseDepth;
			let depthEnd = depthBegin + this.pcoGeometry.hierarchyStepSize + 2;

			let bounds = this.greyhoundBounds;

			let boundsString =
				bounds.min.x + ',' + bounds.min.y + ',' + bounds.min.z + ',' +
				bounds.max.x + ',' + bounds.max.y + ',' + bounds.max.z;

			let hurl = '' + this.pcoGeometry.serverURL +
				'hierarchy?bounds=[' + boundsString + ']' +
				'&depthBegin=' + depthBegin +
				'&depthEnd=' + depthEnd;

			if (this.scale) {
				hurl += '&scale=' + this.scale;
			}

			if (this.greyhoundOffset) {
				let offset = this.greyhoundOffset;
				hurl += '&offset=[' + offset.x + ',' + offset.y + ',' + offset.z + ']';
			}

			let xhr = Potree.XHRFactory.createXMLHttpRequest();
			xhr.open('GET', hurl, true);

			let that = this;
			xhr.onreadystatechange = () => {
				if (xhr.readyState === 4) {
					if (xhr.status === 200 || xhr.status === 0) {
						let greyhoundHierarchy = JSON.parse(xhr.responseText) || { };
						callback(that, greyhoundHierarchy);
					} else {
						console.log(
							'Failed to load file! HTTP status:', xhr.status,
							'file:', hurl
						);
					}
				}
			};

			try {
				xhr.send(null);
			} catch (e) {
				console.log('fehler beim laden der punktwolke: ' + e);
			}
		}
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


}

PointCloudGreyhoundGeometryNode.IDCount = 0;
