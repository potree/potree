var nodesLoadTimes = {};
var baseLoaded = false;

Potree.PointCloudGreyhoundGeometryNode = function(
        name, pcoGeometry, boundingBox, scale, offset) {
	this.id = Potree.PointCloudGreyhoundGeometryNode.IDCount++;
	this.name = name;
	this.index = parseInt(name.charAt(name.length-1));
	this.pcoGeometry = pcoGeometry;
	this.geometry = null;
	this.boundingBox = boundingBox;
	this.boundingSphere = boundingBox.getBoundingSphere();
    this.scale = scale;
    this.offset = offset;
	this.children = {};
	this.numPoints = 0;
	this.level = null;
	this.loaded = false;
	this.oneTimeDisposeHandlers = [];
};

Potree.PointCloudGreyhoundGeometryNode.IDCount = 0;

Potree.PointCloudGreyhoundGeometryNode.prototype =
    Object.create(Potree.PointCloudTreeNode.prototype);

Potree.PointCloudGreyhoundGeometryNode.prototype.isGeometryNode = function() {
	return true;
};

Potree.PointCloudGreyhoundGeometryNode.prototype.isTreeNode = function() {
	return false;
};

Potree.PointCloudGreyhoundGeometryNode.prototype.isLoaded = function() {
	return this.loaded;
};

Potree.PointCloudGreyhoundGeometryNode.prototype.getBoundingSphere = function() {
	return this.boundingSphere;
};

Potree.PointCloudGreyhoundGeometryNode.prototype.getBoundingBox = function() {
	return this.boundingBox;
};

Potree.PointCloudGreyhoundGeometryNode.prototype.getLevel = function(){
	return this.level;
};

Potree.PointCloudGreyhoundGeometryNode.prototype.getChildren = function() {
	var children = [];

	for (var i = 0; i < 8; ++i) {
		if (this.children[i]) {
			children.push(this.children[i]);
		}
	}

	return children;
};

Potree.PointCloudGreyhoundGeometryNode.prototype.getURL = function() {
    var schema = this.pcoGeometry.schema;

	let bbSize = this.boundingBox.getSize();
		
	let bounds = this.boundingBox.clone()
	bounds.min.sub(this.pcoGeometry.boundingBox.getCenter());
	bounds.max.sub(this.pcoGeometry.boundingBox.getCenter());
		
	if(this.scale){
		bounds.min.multiplyScalar( 1 / this.scale);
		bounds.max.multiplyScalar( 1 / this.scale);
	}

    var boundsString =
        bounds.min.x + ',' + bounds.min.y + ',' + bounds.min.z + ',' +
        bounds.max.x + ',' + bounds.max.y + ',' + bounds.max.z;

    var url = ''+this.pcoGeometry.serverURL +
        'read?depthBegin=' +
        (baseLoaded ? (this.level + this.pcoGeometry.baseDepth) : 0) +
        '&depthEnd=' + (this.level + this.pcoGeometry.baseDepth + 1) +
        '&bounds=[' + boundsString + ']' +
        '&schema=' + JSON.stringify(schema) +
        '&compress=true';

    if (this.scale) {
        url += '&scale=' + this.scale;
    }
	{
		//let offset = this.offset.clone().add(bbSize.clone().multiplyScalar(0.5));
		let offset = this.pcoGeometry.offset.clone().add(this.pcoGeometry.boundingBox.getSize().multiplyScalar(0.5));
		url += '&offset=[' + offset.x + ',' + offset.y + ',' + offset.z + ']';
	}
	
	if(this.level === 1){
		let a = 1;
	}

    if (!baseLoaded) baseLoaded = true;

    return url;
};

Potree.PointCloudGreyhoundGeometryNode.prototype.addChild = function(child) {
	this.children[child.index] = child;
	child.parent = this;
};

Potree.PointCloudGreyhoundGeometryNode.prototype.load = function(){
	if (
            this.loading === true ||
            this.loaded === true ||
            this.pcoGeometry.numNodesLoading > 3) {
		return;
	}

	this.loading = true;
	this.pcoGeometry.numNodesLoading++;

	if (
            this.level % this.pcoGeometry.hierarchyStepSize === 0 &&
            this.hasChildren) {
		this.loadHierarchyThenPoints();
	}
    else {
		this.loadPoints();
	}
};

Potree.PointCloudGreyhoundGeometryNode.prototype.loadPoints = function(){
	this.pcoGeometry.loader.load(this);
};


Potree.PointCloudGreyhoundGeometryNode.prototype.loadHierarchyThenPoints =
        function() {
    // From Greyhound (Cartesian) ordering for the octree to Potree-default
	var transform = [0, 2, 1, 3, 4, 6, 5, 7];

    var makeBitMask = function(node) {
        var mask = 0;
        Object.keys(node).forEach(function(key) {
            if      (key === 'swd') mask += 1 << transform[0];
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

    var parseChildrenCounts = function(base, parentName, stack) {
        var keys = Object.keys(base);
        var child;
        var childName;

        keys.forEach(function(key) {
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
	var callback = function(node, greyhoundHierarchy) {
		var decoded = [];
		node.numPoints = greyhoundHierarchy.n;
        parseChildrenCounts(greyhoundHierarchy, node.name, decoded);

		var nodes = {};
		nodes[node.name] = node;
		var pgg = node.pcoGeometry;

		for( var i = 0; i < decoded.length; i++){
			var name = decoded[i].name;
			var numPoints = decoded[i].numPoints;
			var index = parseInt(name.charAt(name.length-1));
			var parentName = name.substring(0, name.length-1);
			var parentNode = nodes[parentName];
			var level = name.length-1;
			var boundingBox = Potree.GreyhoundLoader.createChildAABB(
                    parentNode.boundingBox, index);

			var currentNode = new Potree.PointCloudGreyhoundGeometryNode(
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
        var depthBegin = this.level + this.pcoGeometry.baseDepth;
        var depthEnd = depthBegin + this.pcoGeometry.hierarchyStepSize + 2;
		
        let bbSize = this.boundingBox.getSize();
		let bounds = new THREE.Box3(
			bbSize.clone().multiplyScalar(-0.5),
			bbSize.clone().multiplyScalar(0.5));
			
		if(this.scale){
			bounds.min.multiplyScalar( 1 / this.scale);
			bounds.max.multiplyScalar( 1 / this.scale);
		}

        var boundsString =
            bounds.min.x + ',' + bounds.min.y + ',' + bounds.min.z + ',' +
            bounds.max.x + ',' + bounds.max.y + ',' + bounds.max.z;

		var hurl = '' + this.pcoGeometry.serverURL +
            'hierarchy?bounds=[' + boundsString + ']' +
            '&depthBegin=' + depthBegin +
            '&depthEnd=' + depthEnd;
			
		if (this.scale) {
			hurl += '&scale=' + this.scale;
		}
		
		{
			let offset = this.offset.clone().add(bbSize.clone().multiplyScalar(0.5));
			hurl += '&offset=[' + offset.x + ',' + offset.y + ',' + offset.z + ']';
		}
			
		var xhr = new XMLHttpRequest();
		xhr.open('GET', hurl, true);

        var that = this;
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4) {
				if (xhr.status === 200 || xhr.status === 0) {
                    var greyhoundHierarchy = JSON.parse(xhr.responseText) || { };
                    callback(that, greyhoundHierarchy);
				} else {
                    console.log(
                            'Failed to load file! HTTP status:', xhr.status,
                            'file:', hurl);
				}
			}
		};

		try {
			xhr.send(null);
		}
        catch(e) {
			console.log("fehler beim laden der punktwolke: " + e);
		}
	}
};


Potree.PointCloudGreyhoundGeometryNode.prototype.getNumPoints = function(){
	return this.numPoints;
};


Potree.PointCloudGreyhoundGeometryNode.prototype.dispose = function(){
	if (this.geometry && this.parent != null) {
		this.geometry.dispose();
		this.geometry = null;
		this.loaded = false;

		//this.dispatchEvent( { type: 'dispose' } );
		for (var i = 0; i < this.oneTimeDisposeHandlers.length; i++) {
			var handler = this.oneTimeDisposeHandlers[i];
			handler();
		}
		this.oneTimeDisposeHandlers = [];
	}
};

//THREE.EventDispatcher.prototype.apply(
//        Potree.PointCloudGreyhoundGeometryNode.prototype);
Object.assign( Potree.PointCloudGreyhoundGeometryNode.prototype, THREE.EventDispatcher.prototype );

