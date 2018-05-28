var toVector3 = function(v, offset) {
    return new THREE.Vector3().fromArray(v, offset || 0);
}

var toBox3 = function(b) {
    return new THREE.Box3(this.toVector3(b), this.toVector3(b, 3));
};

var toArray = function(b) {
    return [b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z];
}

Potree.PointCloudEptGeometry = class {
	constructor(url, info, hier) {
        let version = info.version;
        let schema = info.schema;
        let srs = info.srs;
        let bounds = info.bounds;
        let boundsConforming = info.boundsConforming;

        // TODO This is unused.
        let offset = info.offset || [0, 0, 0];
        let scale = info.scale || 0.01;
        if (Array.isArray(scale)) {
            scale = Math.min(scale[0], scale[1], scale[2]);
        }

        let dataStorage = info.dataStorage || 'laz';
        let hierarchyStorage = info.hierarchyStorage || 'json';

        // Now convert to three.js types.
        bounds = toBox3(bounds);
        boundsConforming = toBox3(boundsConforming);
        offset = toVector3(offset);     // TODO
        offset = bounds.min.clone();
        offset = toVector3([0, 0, 0]);  // TODO

        bounds.min.sub(offset);
        bounds.max.sub(offset);
        boundsConforming.min.sub(offset);
        boundsConforming.max.sub(offset);

        this.url = url;
        this.info = info;

        this.ticks = info.ticks;
        this.boundingBox = bounds;
        this.offset = offset;
        this.tightBoundingBox = boundsConforming;
        this.boundingSphere = this.boundingBox.getBoundingSphere();
        this.tightBoundingSphere = this.tightBoundingBox.getBoundingSphere();
        this.version = new Potree.Version('1.6');

        this.projection = info.projection;
        this.pointAttributes = 'LAZ';
        this.spacing =
            (this.boundingBox.max.x - this.boundingBox.min.x) /
            Math.pow(2, this.ticks);

        // TODO Fetch on demand.
        this.hierarchy = hier;

        // TODO Switch on storage type.
        this.loader = new Potree.EptLazLoader();

        // TODO remove.
        this.hierarchyStepSize = info.hierarchyStepSize || 1;
	}
};

Potree.EptKey = class {
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

        if (a)  min.x += dst.x / 2;
        else    max.x -= dst.x / 2;

        if (b)  min.y += dst.y / 2;
        else    max.y -= dst.y / 2;

        if (c)  min.z += dst.z / 2;
        else    max.z -= dst.z / 2;

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

Potree.PointCloudEptGeometryNode = class extends Potree.PointCloudTreeNode {
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

		this.id = Potree.PointCloudEptGeometryNode.NextId++;
		this.geometry = null;
		this.boundingBox = this.key.b;
        this.tightBoundingBox = this.boundingBox;
        this.spacing = this.ept.spacing / Math.pow(2, this.key.d);
		this.boundingSphere = this.boundingBox.getBoundingSphere();

        // TODO Look at hierarchy here and load if needed.
        this.hasChildren = false;
		this.children = { };
		this.numPoints = 0;

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
	url() { return this.ept.url + this.filename(); }
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

        // TODO For now the hierarchy is entirely loaded at the start.
        if (!this.key.d) this.loadHierarchyThenPoints();
        else this.loadPoints();
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

	loadPoints(){
		this.ept.loader.load(this);
	}

	loadHierarchyThenPoints(){
        let nodes = { };
        nodes[this.filename()] = this;

        var added = 0;

        Object.keys(this.ept.hierarchy).sort().forEach((v) => {
            let [d, x, y, z] = v.split('-').map((n) => parseInt(n, 10));

            var a = x & 1;
            var b = y & 1;
            var c = z & 1;

            let parentName =
                (d - 1) + '-' + (x >> 1) + '-' + (y >> 1) + '-' + (z >> 1);

            var parentNode = nodes[parentName];
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
            node.numPoints = this.ept.hierarchy[v];

            // TODO Determine from hierarchy?  For now this is set once a child
            // node is traversed.
            // node.hasChildren =

            var step = (a << 2) | (b << 1) | c;
            var name = parentName + step;
            var name = this.toPotreeName(d, x, y, z);

            parentNode.addChild(node);
            nodes[key.name()] = node;
        });

        this.loadPoints();
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

Potree.PointCloudEptGeometryNode.NextId = 0;

Object.assign(
        Potree.PointCloudEptGeometryNode.prototype,
        THREE.EventDispatcher.prototype);

