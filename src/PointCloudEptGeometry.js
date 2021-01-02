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
};

export class PointCloudEptGeometry {
	constructor(url, info) {
		let version = info.version;
		let schema = info.schema;
		let bounds = info.bounds;
		let boundsConforming = info.boundsConforming;

		let xyz = [
			U.findDim(schema, 'X'),
			U.findDim(schema, 'Y'),
			U.findDim(schema, 'Z')
		];
		let scale = xyz.map((d) => d.scale || 1);
		let offset = xyz.map((d) => d.offset || 0);
		this.eptScale = U.toVector3(scale);
		this.eptOffset = U.toVector3(offset);

		this.url = url;
		this.info = info;
		this.type = 'ept';

		this.schema = schema;
		this.span = info.span || info.ticks;
		this.boundingBox = U.toBox3(bounds);
		this.tightBoundingBox = U.toBox3(boundsConforming);
		this.offset = U.toVector3([0, 0, 0]);
		this.boundingSphere = U.sphereFrom(this.boundingBox);
		this.tightBoundingSphere = U.sphereFrom(this.tightBoundingBox);
		this.version = new Potree.Version('1.7');

		this.projection = null;
		this.fallbackProjection = null;

		if (info.srs && info.srs.horizontal) {
			this.projection = info.srs.authority + ':' + info.srs.horizontal;
		}

		if (info.srs.wkt) {
			if (!this.projection) this.projection = info.srs.wkt;
			else this.fallbackProjection = info.srs.wkt;
		}

		{ 
			// TODO [mschuetz]: named projections that proj4 can't handle seem to cause problems.
			// remove them for now

			try{
				proj4(this.projection);
			}catch(e){
				this.projection = null;
			}

		

		}

		
		{
			const attributes = new PointAttributes();

			attributes.add(PointAttribute.POSITION_CARTESIAN);
			attributes.add(new PointAttribute("rgba", PointAttributeTypes.DATA_TYPE_UINT8, 4));
			attributes.add(new PointAttribute("intensity", PointAttributeTypes.DATA_TYPE_UINT16, 1));
			attributes.add(new PointAttribute("classification", PointAttributeTypes.DATA_TYPE_UINT8, 1));
			attributes.add(new PointAttribute("gps-time", PointAttributeTypes.DATA_TYPE_DOUBLE, 1));
			attributes.add(new PointAttribute("returnNumber", PointAttributeTypes.DATA_TYPE_UINT8, 1));
			attributes.add(new PointAttribute("number of returns", PointAttributeTypes.DATA_TYPE_UINT8, 1));
			attributes.add(new PointAttribute("return number", PointAttributeTypes.DATA_TYPE_UINT8, 1));
			attributes.add(new PointAttribute("source id", PointAttributeTypes.DATA_TYPE_UINT16, 1));

			this.pointAttributes = attributes;
		}



		this.spacing =
			(this.boundingBox.max.x - this.boundingBox.min.x) / this.span;

		let hierarchyType = info.hierarchyType || 'json';

		const dataType = info.dataType;
		if (dataType == 'laszip') {
			this.loader = new Potree.EptLaszipLoader();
		}
		else if (dataType == 'binary') {
			this.loader = new Potree.EptBinaryLoader();
		}
		else if (dataType == 'zstandard') {
			this.loader = new Potree.EptZstandardLoader();
		}
		else {
			throw new Error('Could not read data type: ' + dataType);
		}
	}
};

export class EptKey {
	constructor(ept, b, d, x, y, z) {
		this.ept = ept;
		this.b = b;
		this.d = d;
		this.x = x || 0;
		this.y = y || 0;
		this.z = z || 0;
	}

	name() {
		return this.d + '-' + this.x + '-' + this.y + '-' + this.z;
	}

	step(a, b, c) {
		let min = this.b.min.clone();
		let max = this.b.max.clone();
		let dst = new THREE.Vector3().subVectors(max, min);

		if (a)	min.x += dst.x / 2;
		else	max.x -= dst.x / 2;

		if (b)	min.y += dst.y / 2;
		else	max.y -= dst.y / 2;

		if (c)	min.z += dst.z / 2;
		else	max.z -= dst.z / 2;

		return new Potree.EptKey(
				this.ept,
				new THREE.Box3(min, max),
				this.d + 1,
				this.x * 2 + a,
				this.y * 2 + b,
				this.z * 2 + c);
	}

	children() {
		var result = [];
		for (var a = 0; a < 2; ++a) {
			for (var b = 0; b < 2; ++b) {
				for (var c = 0; c < 2; ++c) {
					var add = this.step(a, b, c).name();
					if (!result.includes(add)) result = result.concat(add);
				}
			}
		}
		return result;
	}
}

export class PointCloudEptGeometryNode extends PointCloudTreeNode {
	constructor(ept, b, d, x, y, z) {
		super();

		this.ept = ept;
		this.key = new Potree.EptKey(
				this.ept,
				b || this.ept.boundingBox,
				d || 0,
				x,
				y,
				z);

		this.id = PointCloudEptGeometryNode.IDCount++;
		this.geometry = null;
		this.boundingBox = this.key.b;
		this.tightBoundingBox = this.boundingBox;
		this.spacing = this.ept.spacing / Math.pow(2, this.key.d);
		this.boundingSphere = U.sphereFrom(this.boundingBox);

		// These are set during hierarchy loading.
		this.hasChildren = false;
		this.children = { };
		this.numPoints = -1;

		this.level = this.key.d;
		this.loaded = false;
		this.loading = false;
		this.oneTimeDisposeHandlers = [];

		let k = this.key;
		this.name = this.toPotreeName(k.d, k.x, k.y, k.z);
		this.index = parseInt(this.name.charAt(this.name.length - 1));
	}

	isGeometryNode() { return true; }
	getLevel() { return this.level; }
	isTreeNode() { return false; }
	isLoaded() { return this.loaded; }
	getBoundingSphere() { return this.boundingSphere; }
	getBoundingBox() { return this.boundingBox; }
	url() { return this.ept.url + 'ept-data/' + this.filename(); }
	getNumPoints() { return this.numPoints; }

	filename() { return this.key.name(); }

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

	load() {
		if (this.loaded || this.loading) return;
		if (Potree.numNodesLoading >= Potree.maxNodesLoading) return;

		this.loading = true;
		++Potree.numNodesLoading;

		if (this.numPoints == -1) this.loadHierarchy();
		this.loadPoints();
	}

	loadPoints(){
		this.ept.loader.load(this);
	}

	async loadHierarchy() {
		let nodes = { };
		nodes[this.filename()] = this;
		this.hasChildren = false;

		let eptHierarchyFile =
			`${this.ept.url}ept-hierarchy/${this.filename()}.json`;

		let response = await fetch(eptHierarchyFile);
		let hier = await response.json();

		// Since we want to traverse top-down, and 10 comes
		// lexicographically before 9 (for example), do a deep sort.
		var keys = Object.keys(hier).sort((a, b) => {
			let [da, xa, ya, za] = a.split('-').map((n) => parseInt(n, 10));
			let [db, xb, yb, zb] = b.split('-').map((n) => parseInt(n, 10));
			if (da < db) return -1; if (da > db) return 1;
			if (xa < xb) return -1; if (xa > xb) return 1;
			if (ya < yb) return -1; if (ya > yb) return 1;
			if (za < zb) return -1; if (za > zb) return 1;
			return 0;
		});

		keys.forEach((v) => {
			let [d, x, y, z] = v.split('-').map((n) => parseInt(n, 10));
			let a = x & 1, b = y & 1, c = z & 1;
			let parentName =
				(d - 1) + '-' + (x >> 1) + '-' + (y >> 1) + '-' + (z >> 1);

			let parentNode = nodes[parentName];
			if (!parentNode) return;
			parentNode.hasChildren = true;

			let key = parentNode.key.step(a, b, c);

			let node = new Potree.PointCloudEptGeometryNode(
					this.ept,
					key.b,
					key.d,
					key.x,
					key.y,
					key.z);

			node.level = d;
			node.numPoints = hier[v];

			parentNode.addChild(node);
			nodes[key.name()] = node;
		});
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

	toPotreeName(d, x, y, z) {
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

	dispose() {
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

PointCloudEptGeometryNode.IDCount = 0;

