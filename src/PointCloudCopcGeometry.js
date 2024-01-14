import {PointCloudTreeNode} from "./PointCloudTree.js";
import {BaseGeometry,U} from "./PointCloudEptGeometry.js"

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

		console.group("PointCloudCopcGeometry.constructor")
		console.log("this...", this)
		console.groupEnd()
	}

	async loadHierarchyPage(key) {
		const { Copc, Key } = window.Copc
		const page = this.pages[Key.toString(key)]
		const hierarchy = await Copc.loadHierarchyPage(this.getter, page)
		debugger
		return hierarchy
	}
};

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

		console.group("PointCloudCopcGeometryNode.constructor")
		console.log("this...", this)
		console.groupEnd()
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
		await this.loadPoints();
	}

	async loadPoints(){
		// debugger
		await this.owner.loader.load(this);
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

PointCloudCopcGeometryNode.IDCount = 0;
