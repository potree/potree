import {PointAttributeNames} from "./loader/PointAttributes.js";
import {PointCloudTreeNode} from "./PointCloudTree.js";
import {XHRFactory} from "./XHRFactory.js";
import {Utils} from "./utils.js";

export class PointCloudOctreeGeometry{

	constructor(){
		this.url = null;
		this.octreeDir = null;
		this.spacing = 0;
		this.boundingBox = null;
		this.root = null;
		this.nodes = null;
		this.pointAttributes = null;
		this.hierarchyStepSize = -1;
		this.loader = null;
	}
	
}

export class PointCloudOctreeGeometryNode extends PointCloudTreeNode{

	constructor(name, pcoGeometry, boundingBox){
		super();

		this.id = PointCloudOctreeGeometryNode.IDCount++;
		this.name = name;
		this.index = parseInt(name.charAt(name.length - 1));
		this.pcoGeometry = pcoGeometry;
		this.geometry = null;
		this.boundingBox = boundingBox;
		this.boundingSphere = boundingBox.getBoundingSphere(new THREE.Sphere());
		this.children = {};
		this.numPoints = 0;
		this.level = null;
		this.loaded = false;
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

	getURL(){
		let url = '';

		let version = this.pcoGeometry.loader.version;

		if (version.equalOrHigher('1.5')) {
			url = this.pcoGeometry.octreeDir + '/' + this.getHierarchyPath() + '/' + this.name;
		} else if (version.equalOrHigher('1.4')) {
			url = this.pcoGeometry.octreeDir + '/' + this.name;
		} else if (version.upTo('1.3')) {
			url = this.pcoGeometry.octreeDir + '/' + this.name;
		}

		return url;
	}

	getHierarchyPath(){
		let path = 'r/';

		let hierarchyStepSize = this.pcoGeometry.hierarchyStepSize;
		let indices = this.name.substr(1);

		let numParts = Math.floor(indices.length / hierarchyStepSize);
		for (let i = 0; i < numParts; i++) {
			path += indices.substr(i * hierarchyStepSize, hierarchyStepSize) + '/';
		}

		path = path.slice(0, -1);

		return path;
	}

	addChild(child) {
		this.children[child.index] = child;
		child.parent = this;
	}

	load(){
		if (this.loading === true || this.loaded === true || Potree.numNodesLoading >= Potree.maxNodesLoading) {
			return;
		}

		this.loading = true;

		Potree.numNodesLoading++;

		if (this.pcoGeometry.loader.version.equalOrHigher('1.5')) {
			if ((this.level % this.pcoGeometry.hierarchyStepSize) === 0 && this.hasChildren) {
				this.loadHierachyThenPoints();
			} else {
				this.loadPoints();
			}
		} else {
			this.loadPoints();
		}
	}

	loadPoints(){
		this.pcoGeometry.loader.load(this);
	}

	parse(data, version) {
		
		// Needed by GLOctTreeNode as we load GPU data only in the renderer.
		this.attributeBuffers = data.attributeBuffers;

		const buffers = data.attributeBuffers;
		const geometry = new THREE.BufferGeometry();
		for(let property in buffers){
			const buffer = buffers[property].buffer;

			if (parseInt(property) === PointAttributeNames.POSITION_CARTESIAN) {
				geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(buffer), 3));
			} else if (parseInt(property) === PointAttributeNames.COLOR_PACKED) {
				geometry.addAttribute('color', new THREE.BufferAttribute(new Uint8Array(buffer), 4, true));
			} else if (parseInt(property) === PointAttributeNames.INTENSITY) {
				geometry.addAttribute('intensity', new THREE.BufferAttribute(new Float32Array(buffer), 1));
			} else if (parseInt(property) === PointAttributeNames.CLASSIFICATION) {
				geometry.addAttribute('classification', new THREE.BufferAttribute(new Uint8Array(buffer), 1));
			} else if (parseInt(property) === PointAttributeNames.RETURN_NUMBER) {
				geometry.addAttribute('returnNumber', new THREE.BufferAttribute(new Uint8Array(buffer), 1));
			} else if (parseInt(property) === PointAttributeNames.NUMBER_OF_RETURNS) {
				geometry.addAttribute('numberOfReturns', new THREE.BufferAttribute(new Uint8Array(buffer), 1));
			} else if (parseInt(property) === PointAttributeNames.SOURCE_ID) {
				geometry.addAttribute('pointSourceID', new THREE.BufferAttribute(new Uint16Array(buffer), 1));
			} else if (parseInt(property) === PointAttributeNames.NORMAL_SPHEREMAPPED) {
				geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(buffer), 3));
			} else if (parseInt(property) === PointAttributeNames.NORMAL_OCT16) {
				geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(buffer), 3));
			} else if (parseInt(property) === PointAttributeNames.NORMAL) {
				geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(buffer), 3));
			} else if (parseInt(property) === PointAttributeNames.INDICES) {
				const bufferAttribute = new THREE.BufferAttribute(new Uint8Array(buffer), 4);
				bufferAttribute.normalized = true;
				geometry.addAttribute('indices', bufferAttribute);
			} else if (parseInt(property) === PointAttributeNames.SPACING) {
				const bufferAttribute = new THREE.BufferAttribute(new Float32Array(buffer), 1);
				geometry.addAttribute('spacing', bufferAttribute);
			} else if (parseInt(property) === PointAttributeNames.GPS_TIME) {
				const bufferAttribute = new THREE.BufferAttribute(new Float32Array(buffer), 1);
				geometry.addAttribute('gpsTime', bufferAttribute);

				this.gpsTime = {
					offset: buffers[property].offset,
					range: buffers[property].range,
				};
			}
		}
		this.geometry = geometry;

		const tightBoundingBox = new THREE.Box3(
			new THREE.Vector3().fromArray(data.tightBoundingBox.min),
			new THREE.Vector3().fromArray(data.tightBoundingBox.max)
		);
		tightBoundingBox.max.sub(tightBoundingBox.min);
		tightBoundingBox.min.set(0, 0, 0);

		const numPoints = data.buffer.byteLength / pointAttributes.byteSize;
		
		this.numPoints = numPoints;
		this.mean = new THREE.Vector3(...data.mean);
		this.tightBoundingBox = tightBoundingBox;
		this.loaded = true;
		this.loading = false;
		this.estimatedSpacing = data.estimatedSpacing;
		Potree.numNodesLoading--;

		this.dispatchEvent('loaded', {
			numPoints
		});
	}

	loadHierachyThenPoints(){
		let node = this;

		// load hierarchy
		let callback = function (node, hbuffer) {
			let view = new DataView(hbuffer);

			let stack = [];
			let children = view.getUint8(0);
			let numPoints = view.getUint32(1, true);
			node.numPoints = numPoints;
			stack.push({children: children, numPoints: numPoints, name: node.name});

			let decoded = [];

			let offset = 5;
			while (stack.length > 0) {
				let snode = stack.shift();
				let mask = 1;
				for (let i = 0; i < 8; i++) {
					if ((snode.children & mask) !== 0) {
						let childName = snode.name + i;

						let childChildren = view.getUint8(offset);
						let childNumPoints = view.getUint32(offset + 1, true);

						stack.push({children: childChildren, numPoints: childNumPoints, name: childName});

						decoded.push({children: childChildren, numPoints: childNumPoints, name: childName});

						offset += 5;
					}

					mask = mask * 2;
				}

				if (offset === hbuffer.byteLength) {
					break;
				}
			}

			// console.log(decoded);

			let nodes = {};
			nodes[node.name] = node;
			let pco = node.pcoGeometry;

			for (let i = 0; i < decoded.length; i++) {
				let name = decoded[i].name;
				let decodedNumPoints = decoded[i].numPoints;
				let index = parseInt(name.charAt(name.length - 1));
				let parentName = name.substring(0, name.length - 1);
				let parentNode = nodes[parentName];
				let level = name.length - 1;
				let boundingBox = Utils.createChildAABB(parentNode.boundingBox, index);

				let currentNode = new PointCloudOctreeGeometryNode(name, pco, boundingBox);
				currentNode.level = level;
				currentNode.numPoints = decodedNumPoints;
				currentNode.hasChildren = decoded[i].children > 0;
				currentNode.spacing = pco.spacing / Math.pow(2, level);
				parentNode.addChild(currentNode);
				nodes[name] = currentNode;
			}

			node.loadPoints();
		};
		if ((node.level % node.pcoGeometry.hierarchyStepSize) === 0) {
			// let hurl = node.pcoGeometry.octreeDir + "/../hierarchy/" + node.name + ".hrc";
			let hurl = node.pcoGeometry.octreeDir + '/' + node.getHierarchyPath() + '/' + node.name + '.hrc';

			let xhr = XHRFactory.createXMLHttpRequest();
			xhr.open('GET', hurl, true);
			xhr.responseType = 'arraybuffer';
			xhr.overrideMimeType('text/plain; charset=x-user-defined');
			xhr.onreadystatechange = () => {
				if (xhr.readyState === 4) {
					if (xhr.status === 200 || xhr.status === 0) {
						let hbuffer = xhr.response;
						callback(node, hbuffer);
					} else {
						console.log('Failed to load file! HTTP status: ' + xhr.status + ', file: ' + hurl);
						Potree.numNodesLoading--;
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

PointCloudOctreeGeometryNode.IDCount = 0;
