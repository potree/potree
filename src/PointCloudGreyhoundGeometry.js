
var nodesLoadTimes = {};

Potree.PointCloudGreyhoundGeometry = function(){
  //PointCloudOctree only gets -> root, hierarchyStepSize, tightBoundingBox, spacing (not used), boundingBox
  //POCLoader sets url, octreeDir, spacing, hierarchyStepSize, pointAttributes, root, nodes, projection, boundingBox, tightBoundingBox, boundingSphere, tightBoundingSphere, offset

	this.url = null;
	this.octreeDir = null;
	this.spacing = 0;
	this.boundingBox = null;
	this.root = null;
	this.numNodesLoading = 0;
	this.nodes = null;
	this.pointAttributes = null;
	this.hierarchyStepSize = -1;
	this.loader = null;

	//we probably want
	this.serverURL = null;
};

Potree.PointCloudGreyhoundGeometryNode = function(name, pcoGeometry, boundingBox){
	this.id = Potree.PointCloudGreyhoundGeometryNode.IDCount++;
	this.name = name;
	this.index = parseInt(name.charAt(name.length-1));
	this.pcoGeometry = pcoGeometry;
	this.geometry = null;
	this.boundingBox = boundingBox;
	this.boundingSphere = boundingBox.getBoundingSphere();
	this.children = {};
	this.numPoints = 0;
	this.level = null;
	this.loaded = false;
	this.oneTimeDisposeHandlers = [];
};

Potree.PointCloudGreyhoundGeometryNode.IDCount = 0;

Potree.PointCloudGreyhoundGeometryNode.prototype = Object.create(Potree.PointCloudTreeNode.prototype);

Potree.PointCloudGreyhoundGeometryNode.prototype.isGeometryNode = function(){
	return true;
};

Potree.PointCloudGreyhoundGeometryNode.prototype.isTreeNode = function(){
	return false;
};

Potree.PointCloudGreyhoundGeometryNode.prototype.isLoaded = function(){
	return this.loaded;
};

Potree.PointCloudGreyhoundGeometryNode.prototype.getBoundingSphere = function(){
	return this.boundingSphere;
};

Potree.PointCloudGreyhoundGeometryNode.prototype.getBoundingBox = function(){
	return this.boundingBox;
};

Potree.PointCloudGreyhoundGeometryNode.prototype.getChildren = function(){
	var children = [];

	for(var i = 0; i < 8; i++){
		if(this.children[i]){
			children.push(this.children[i]);
		}
	}

	return children;
};

Potree.PointCloudGreyhoundGeometryNode.prototype.getBoundingBox = function(){
	return this.boundingBox;
};

Potree.PointCloudGreyhoundGeometryNode.prototype.getURL = function(){

	var bb = this.boundingBox;

	var url = this.pcoGeometry.serverURL + 'read?depth=' + this.level + 'bounds=[' + bb.min.x + ',' + bb.min.y + ',' + bb.min.z + ',' + bb.max.x + ',' + bb.max.y + ',' + bb.max.z + ']' ;
  //TODO: add schema depending on user choice

	return url;
};

Potree.PointCloudGreyhoundGeometryNode.prototype.addChild = function(child){
	this.children[child.index] = child;
	child.parent = this;
};

Potree.PointCloudGreyhoundGeometryNode.prototype.load = function(){
	if(this.loading === true || this.loaded === true ||this.pcoGeometry.numNodesLoading > 3){
		return;
	}

	this.loading = true;

	this.pcoGeometry.numNodesLoading++;

	if((this.level % this.pcoGeometry.hierarchyStepSize) === 0 && this.hasChildren){
		this.loadHierachyThenPoints();
	}else{
		this.loadPoints();
	}
};

Potree.PointCloudGreyhoundGeometryNode.prototype.loadPoints = function(){
	this.pcoGeometry.loader.load(this);
};


Potree.PointCloudGreyhoundGeometryNode.prototype.loadHierachyThenPoints = function(){

	var node = this;

	// load hierarchy
	var callback = function(node, hbuffer){
		var count = hbuffer.byteLength / 5;
		var view = new DataView(hbuffer);

		var stack = [];
		var children = view.getUint8(0);
		var numPoints = view.getUint32(1, true);
		node.numPoints = numPoints;
		stack.push({children: children, numPoints: numPoints, name: node.name});

		var decoded = [];

		var offset = 5;
		while(stack.length > 0){

			var snode = stack.shift();
			var mask = 1;
			for(var i = 0; i < 8; i++){
				if((snode.children & mask) !== 0){
					var childIndex = i;
					var childName = snode.name + i;

					var childChildren = view.getUint8(offset);
					var childNumPoints = view.getUint32(offset + 1, true);

					stack.push({children: childChildren, numPoints: childNumPoints, name: childName});

					decoded.push({children: childChildren, numPoints: childNumPoints, name: childName});

					offset += 5;
				}

				mask = mask * 2;
			}

			if(offset === hbuffer.byteLength){
				break;
			}

		}

		//console.log(decoded);

		var nodes = {};
		nodes[node.name] = node;
		var pco = node.pcoGeometry;


		for( var i = 0; i < decoded.length; i++){
			var name = decoded[i].name;
			var numPoints = decoded[i].numPoints;
			var index = parseInt(name.charAt(name.length-1));
			var parentName = name.substring(0, name.length-1);
			var parentNode = nodes[parentName];
			var level = name.length-1;
			var boundingBox = Potree.POCLoader.createChildAABB(parentNode.boundingBox, index);

			var currentNode = new Potree.PointCloudGreyhoundGeometryNode(name, pco, boundingBox);
			currentNode.level = level;
			currentNode.numPoints = numPoints;
			currentNode.hasChildren = decoded[i].children > 0;
			parentNode.addChild(currentNode);
			nodes[name] = currentNode;
		}

		node.loadPoints();

	};
	if((node.level % node.pcoGeometry.hierarchyStepSize) === 0){
		//var hurl = node.pcoGeometry.octreeDir + "/../hierarchy/" + node.name + ".hrc";
		var hurl = node.pcoGeometry.octreeDir + "/" + node.getHierarchyPath() + "/" + node.name + ".hrc";
		var hurl = this.pcoGeometry.serverURL + http://dev.greyhound.io/resource/autzen/hierarchy?bounds=[635577,848882,-1000,639004,853538,2000]&depthBegin=6&depthEnd=8
		var xhr = new XMLHttpRequest();
		xhr.open('GET', hurl, true);
		xhr.responseType = 'arraybuffer';
		xhr.overrideMimeType('text/plain; charset=x-user-defined');
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4) {
				if (xhr.status === 200 || xhr.status === 0) {
					var hbuffer = xhr.response;
					callback(node, hbuffer);
				} else {
					console.log('Failed to load file! HTTP status: ' + xhr.status + ", file: " + url);
				}
			}
		};
		try{
			xhr.send(null);
		}catch(e){
			console.log("fehler beim laden der punktwolke: " + e);
		}
	}

};


Potree.PointCloudGreyhoundGeometryNode.prototype.getNumPoints = function(){
	return this.numPoints;
};


Potree.PointCloudGreyhoundGeometryNode.prototype.dispose = function(){
	if(this.geometry && this.parent != null){
		this.geometry.dispose();
		this.geometry = null;
		this.loaded = false;

		//this.dispatchEvent( { type: 'dispose' } );
		for(var i = 0; i < this.oneTimeDisposeHandlers.length; i++){
			var handler = this.oneTimeDisposeHandlers[i];
			handler();
		}
		this.oneTimeDisposeHandlers = [];
	}
};

THREE.EventDispatcher.prototype.apply( Potree.PointCloudGreyhoundGeometryNode.prototype );
