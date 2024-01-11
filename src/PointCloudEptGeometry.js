import {PointCloudTreeNode} from "./PointCloudTree.js";
import {PointAttributes, PointAttribute, PointAttributeTypes} from "./loader/PointAttributes.js";
import * as THREE from "../libs/three.js/build/three.module.js";

class U {
	static toVector3(v, offset) {
		return new THREE.Vector3().fromArray(v, offset || 0);
	}

	static toBox3(b) {
		return new THREE.Box3(U.toVector3(b), U.toVector3(b, 3));
	};

	static findDim(schema, name) {
		var dim = schema.find((dim) => dim.name == name);
		if (!dim) throw new Error('Failed to find ' + name + ' in schema');
		return dim;
	}

	static sphereFrom(b) {
		return b.getBoundingSphere(new THREE.Sphere());
	}

	static toPotreeName([d, x, y, z]) {
		var name = 'r';

		for (var i = 0; i < d; ++i) {
			var shift = d - i - 1;
			var mask = 1 << shift;
			var step = 0;

			if (x & mask) step += 4;
			if (y & mask) step += 2;
			if (z & mask) step += 1;

			name += step;
		}

		return name;
	}

	static maybeSrs(srs) {
		try { 
			proj4(srs) 
			return srs
		} catch (e) {}
	}
};

class BaseGeometry {
	constructor({ 
		cube,
		boundsConforming,
		spacing,
		srs,
	}) {
		this.cube = cube;

		this.boundingBox = U.toBox3(cube);
		this.tightBoundingBox = U.toBox3(boundsConforming);
		this.boundingSphere = U.sphereFrom(this.boundingBox);
		this.tightBoundingSphere = U.sphereFrom(this.tightBoundingBox);
		this.offset = U.toVector3([0, 0, 0]);
		this.version = new Potree.Version('1.7');

		this.loader = new Potree.CopcLaszipLoader();

		this.spacing = spacing;
		this.projection = srs || null;
		try {
			proj4(this.projection);
		} catch(e) {
			this.projection = null;
		}

		const attributes = new PointAttributes();
		attributes.add(PointAttribute.POSITION_CARTESIAN);
		attributes.add(new PointAttribute("rgba", PointAttributeTypes.DATA_TYPE_UINT8, 4));
		attributes.add(new PointAttribute("intensity", PointAttributeTypes.DATA_TYPE_UINT16, 1));
		attributes.add(new PointAttribute("classification", PointAttributeTypes.DATA_TYPE_UINT8, 1));
		attributes.add(new PointAttribute("gps-time", PointAttributeTypes.DATA_TYPE_FLOAT, 1));
		attributes.add(new PointAttribute("returnNumber", PointAttributeTypes.DATA_TYPE_UINT8, 1));
		attributes.add(new PointAttribute("number of returns", PointAttributeTypes.DATA_TYPE_UINT8, 1));
		attributes.add(new PointAttribute("return number", PointAttributeTypes.DATA_TYPE_UINT8, 1));
		attributes.add(new PointAttribute("source id", PointAttributeTypes.DATA_TYPE_UINT16, 1));
		this.pointAttributes = attributes;
	}
}

export class PointCloudCopcGeometry extends BaseGeometry {
	static parse({ header, info, wkt }) {
		return {
			cube: info.cube,
			boundsConforming: [...header.min, ...header.max],
			spacing: info.spacing,
			srs: wkt,
		}
	}

	constructor(getter, copc) {
		super(PointCloudCopcGeometry.parse(copc))

		this.type = 'copc';
		this.getter = getter
		this.copc = copc;
		this.pages = { '0-0-0-0': copc.info.rootHierarchyPage }

		this.loader = new Potree.CopcLaszipLoader();
	}

	async loadHierarchyPage(key) {
		const { Copc, Key } = window.Copc
		const page = this.pages[Key.toString(key)]
		return Copc.loadHierarchyPage(this.getter, page)
	}
};

export class PointCloudEptGeometry extends BaseGeometry {
	static parse(ept) {
		const { bounds: cube, boundsConforming, span, srs: filesrs } = ept

		const spacing = (cube[3] - cube[0]) / span

		let srs
		if (filesrs) {
			const { authority, horizontal, wkt } = filesrs
			if (authority && horizontal) {
				srs = U.maybeSrs(`${authority}:${horizontal}`)
			}
			if (!srs && wkt) srs = U.maybeSrs(wkt)
		}

		return { cube, boundsConforming, spacing, srs }
	}

	constructor(base, ept) {
		super(PointCloudEptGeometry.parse(ept))

		this.type = 'ept';
		this.base = base;
		this.ept = ept;

		this.loader = (() => {
			switch (ept.dataType) {
				case 'laszip': return new Potree.EptLaszipLoader()
				case 'binary': return new Potree.EptBinaryLoader()
				case 'zstandard': return new Potree.EptZstandardLoader()
				default: throw new Error('Invalid data type: ' + ept.dataType)
			}
		})()
	}

	async loadHierarchyPage(key) {
		const { Ept, Key } = window.Copc

		const filename = `${this.base}/ept-hierarchy/${Key.toString(key)}.json`
		const response = await fetch(filename);
		const json = await response.json();
		return Ept.Hierarchy.parse(json)
	}
}

export class PointCloudCopcGeometryNode extends PointCloudTreeNode {
	constructor(owner, key, bounds) {
		super();

		const { Key } = Copc

		this.owner = owner
		this.key = key || Key.create(0, 0, 0, 0)
		this.bounds = bounds || owner.cube

		this.id = PointCloudCopcGeometryNode.IDCount++;
		this.geometry = null;
		this.boundingBox = U.toBox3(this.bounds)
		this.tightBoundingBox = this.boundingBox;
		this.spacing = this.owner.spacing / Math.pow(2, Key.depth(this.key));
		this.boundingSphere = U.sphereFrom(this.boundingBox);

		// These are set during hierarchy loading.
		this.hasChildren = false;
		this.children = { };
		this.nodeinfo = undefined
		this.numPoints = -1;

		this.level = Key.depth(this.key);
		this.loaded = false;
		this.loading = false;
		this.oneTimeDisposeHandlers = [];

		this.name = U.toPotreeName(this.key);
		this.index = parseInt(this.name.charAt(this.name.length - 1));
	}

	isGeometryNode() { return true; }
	getLevel() { return this.level; }
	isTreeNode() { return false; }
	isLoaded() { return this.loaded; }
	getBoundingSphere() { return this.boundingSphere; }
	getBoundingBox() { return this.boundingBox; }
	getNumPoints() { 
		return this.nodeinfo ? this.nodeinfo.pointCount : -1; 
	}

	getChildren() {
		let children = [];

		for (let i = 0; i < 8; i++) {
			if (this.children[i]) {
				children.push(this.children[i]);
			}
		}

		return children;
	}

	addChild(child) {
		this.children[child.index] = child;
		child.parent = this;
	}

	async load() {
		if (this.loaded || this.loading) return;
		if (Potree.numNodesLoading >= Potree.maxNodesLoading) return;

		this.loading = true;
		++Potree.numNodesLoading;

		if (!this.nodeinfo) await this.loadHierarchy();
		this.loadPoints();
	}

	loadPoints(){
		this.owner.loader.load(this);
	}

	async loadHierarchy() {
		const { Bounds, Key } = window.Copc
		const ourkeyname = Key.toString(this.key)

		let nodemap = { };
		nodemap[ourkeyname] = this;
		this.hasChildren = false;

		const { nodes, pages } = await this.owner.loadHierarchyPage(this.key)

		// Since we want to traverse top-down, and 10 comes lexicographically 
		// before 9 (for example), do a deep sort.
		const keys = Object.keys({ ...nodes, ...pages })
			.map(Key.create)
			.sort(Key.compare)

		keys.forEach((key) => {
			const keyname = Key.toString(key)
			if (keyname === ourkeyname) {
				this.nodeinfo = nodes[keyname]
				return;
			}

			const [_d, x, y, z] = key
			const step = [x & 1, y & 1, z & 1]

			let parentName = Key.toString(Key.up(key))
			let parentNode = nodemap[parentName];
			if (!parentNode) return;
			parentNode.hasChildren = true;

			const bounds = Bounds.step(parentNode.bounds, step)
			const node = new Potree.PointCloudCopcGeometryNode(
				this.owner,
				key, 
				bounds);
			parentNode.addChild(node);
			nodemap[keyname] = node;

			// For data nodes, add their point data offset/point counts.
			const nodeinfo = nodes[keyname]
			if (nodeinfo) node.nodeinfo = nodeinfo

			// And for leaf nodes whose data is in a different hierarchy page, 
			// store the info for the hierarchy page in our page map.  This is
			// only applicable for COPC data since we need hierarchy page 
			// ranges to fetch them - EPT data on the other hand we just need
			// the node key to fetch the file.
			const pageinfo = pages[keyname]
			if (this.owner.pages && pageinfo) {
				this.owner.pages[keyname] = pageinfo
			}
		})
	}

	doneLoading(bufferGeometry, tightBoundingBox, np, mean) {
		bufferGeometry.boundingBox = this.boundingBox;
		this.geometry = bufferGeometry;
		this.tightBoundingBox = tightBoundingBox;
		this.numPoints = np;
		this.mean = mean;
		this.loaded = true;
		this.loading = false;
		--Potree.numNodesLoading;
	}

	dispose() {
		if (this.geometry && this.parent) {
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

export class PointCloudVpcGeometry extends BaseGeometry {
	static parse(json) {
		let xmin, ymin, zmin, xmax, ymax, zmax;

		for(const feature of json.features) {
			const box = feature.properties['proj:bbox'];
			xmin = xmin === undefined ? box[0] : Math.min(box[0], xmin);
			ymin = ymin === undefined ? box[1] : Math.min(box[1], ymin);
			zmin = zmin === undefined ? box[2] : Math.min(box[2], zmin);
			xmax = xmax === undefined ? box[3] : Math.max(box[3], xmax);
			ymax = ymax === undefined ? box[4] : Math.max(box[4], ymax);
			zmax = zmax === undefined ? box[5] : Math.max(box[5], zmax);
		}

		const cube = {xmin, ymin, zmin, xmax, ymax, zmax};
		const boundsConforming = cube;
		return ({cube, boundsConforming, spacing: null, srs: null});
	}

	constructor(json) {
		super(PointCloudVpcGeometry.parse(json));

		this.type = 'vpc';
		this.json = json;
		this.linksToCopcFiles = [];
		this.attributes = this.pointAttributes;
		this.children = [];

		for(const feature of json.features) {
			const url = feature.assets.data.href;
			this.linksToCopcFiles.push(url);
		}
	}

	async add(geomeotry) {
		this.children.push(geomeotry);
		console.log(geomeotry.pointAttributes.attributes);

		for (const attribute of geomeotry.pointAttributes.attributes) {
			const name = attribute.name;
			const range = attribute.range;
			// console.log(attribute);
			console.log(range);
			// await new Promise(res => setTimeout(res, 500));
			// console.log(range['0']);
			// console.log(range['1']);
			console.log(JSON.stringify(range));
			const currentAttribute = this.pointAttributes.attributes.find(a => a.name === name);
			const currentRange = currentAttribute.range;
			// console.log(currentRange);
			currentRange[0] = Math.min(currentRange[0], range[0]);
			currentRange[1] = Math.max(currentRange[1], range[1]);
		}
	}

	isTreeNode() {
		return true;
	}

	// getBoundingBox() {
	// 	return this.boundingBox;
	// }

	// getLevel() {
	// 	return 0;
	// }
}

export class VpcNode extends PointCloudTreeNode {
	constructor(geometry) {
		super();
		this.geometry = geometry;
		this.boundingBox = geometry.boundingBox;
		this.children = [];
		this.oneTimeDisposeHandlers = [];
		this.boundingSphere = U.sphereFrom(this.boundingBox);
	}

	async load() {
		// ???
	}

	getChildren () {
		return this.children;
	}

	getBoundingBox () {
		return this.boundingBox;
	}

	isLoaded () {
		return true;
	}

	isGeometryNode () {
		return true;
	}

	isTreeNode () {
		return false;
	}

	getLevel () {
		return null;
	}

	getBoundingSphere () {
		return this.boundingSphere;
	}

	getNumPoints() {
		return 0;
	}
}

PointCloudCopcGeometryNode.IDCount = 0;
