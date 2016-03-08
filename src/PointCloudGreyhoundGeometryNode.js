var nodesLoadTimes = {};
var baseLoaded = false;

Potree.PointCloudGreyhoundGeometryNode = function(
        name, pcoGeometry, boundingBox, scale, offset){
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

Potree.PointCloudGreyhoundGeometryNode.prototype.getURL = function(){
    var material = viewer.getMaterial();
    var schema = this.pcoGeometry.schema;

    var bb = this.boundingBox;
    var offset = this.offset;

    var scale = this.pcoGeometry.scale;
    var boundsString =
        (bb.min.x * scale + offset.x) + ',' +
        (bb.min.y * scale + offset.y) + ',' +
        (bb.min.z * scale + offset.z) + ',' +
        (bb.max.x * scale + offset.x) + ',' +
        (bb.max.y * scale + offset.y) + ',' +
        (bb.max.z * scale + offset.z);

    var offsetString = offset.x + ',' + offset.y + ',' + offset.z;

    var url = ''+this.pcoGeometry.serverURL +
        'read?depthBegin=' +
        (baseLoaded ? (this.level + this.pcoGeometry.baseDepth) : 0) +
        '&depthEnd=' + (this.level + this.pcoGeometry.baseDepth + 1) +
        '&bounds=[' + boundsString + ']' +
        '&schema=' + JSON.stringify(schema) +
        '&scale=' + scale +
        '&offset=[' + offsetString + ']' +
        '&compress=true';

    if (!baseLoaded) baseLoaded = true;

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
		this.loadHierarchyThenPoints();
	}else{
		this.loadPoints();
	}
};

Potree.PointCloudGreyhoundGeometryNode.prototype.loadPoints = function(){
	this.pcoGeometry.loader.load(this);
};


Potree.PointCloudGreyhoundGeometryNode.prototype.loadHierarchyThenPoints = function(){
	var node = this;

    //From Greyhound (Cartesian) ordering for the octree to Potree-default
	var transform = [0, 2, 1, 3, 4, 6, 5, 7];

  var makeBitMask = function(node) {
    var keys = Object.keys(node);
    var mask = 0;

    keys.forEach(function(key) {
      if        (key === 'swd') {
        mask += 1 << transform[0];
      } else if (key === 'nwd') {
        mask += 1 << transform[1];
      } else if (key === 'swu') {
        mask += 1 << transform[2];
      } else if (key === 'nwu') {
        mask += 1 << transform[3];
      } else if (key === 'sed') {
        mask += 1 << transform[4];
      } else if (key === 'ned') {
        mask += 1 << transform[5];
      } else if (key === 'seu') {
        mask += 1 << transform[6];
      } else if (key === 'neu') {
        mask += 1 << transform[7];
      }
    });

    return mask;
  };

  var parseChildrenCounts = function(base, parentName, stack) {
    var keys = Object.keys(base);
    var child;
    var childName;
    keys.forEach(function(key) {
      if (key !== 'n') {
        if        (key === 'swd') {
          child = base.swd;
          childName = parentName+transform[0];
        } else if (key === 'nwd') {
          child = base.nwd;
          childName = parentName+transform[1];
        } else if (key === 'swu') {
          child = base.swu;
          childName = parentName+transform[2];
        } else if (key === 'nwu') {
          child = base.nwu;
          childName = parentName+transform[3];
        } else if (key === 'sed') {
          child = base.sed;
          childName = parentName+transform[4];
        } else if (key === 'ned') {
          child = base.ned;
          childName = parentName+transform[5];
        } else if (key === 'seu') {
          child = base.seu;
          childName = parentName+transform[6];
        } else if (key === 'neu') {
          child = base.neu;
          childName = parentName+transform[7];
        }

        stack.push({
            children: makeBitMask(child),
            numPoints: child.n,
            name: childName
        });

        parseChildrenCounts(child, childName, stack);
      }
    });
  };

	// load hierarchy
	var callback = function(node, greyhoundHierarchy){

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
			parentNode.addChild(currentNode);
			nodes[name] = currentNode;
		}

		node.loadPoints();

	};
	if((node.level % node.pcoGeometry.hierarchyStepSize) === 0){
        var depthBegin = node.level + node.pcoGeometry.baseDepth;
        var depthEnd = depthBegin + node.pcoGeometry.hierarchyStepSize + 1;
        var bb = this.boundingBox;
        var scale = this.pcoGeometry.scale;

        // Going back into Greyhound-space, i.e. the space of the actual points
        // in the dataset.  Add the offset to get there.
        var offset = node.offset;
        var boundsString =
            (bb.min.x * scale + offset.x) + ',' +
            (bb.min.y * scale + offset.y) + ',' +
            (bb.min.z * scale + offset.z) + ',' +
            (bb.max.x * scale + offset.x) + ',' +
            (bb.max.y * scale + offset.y) + ',' +
            (bb.max.z * scale + offset.z);

		var hurl = ''+this.pcoGeometry.serverURL + 'hierarchy?bounds=[' + boundsString + ']' + '&depthBegin=' + depthBegin + '&depthEnd=' + depthEnd;
		var xhr = new XMLHttpRequest();
		xhr.open('GET', hurl, true);

		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4) {
				if (xhr.status === 200 || xhr.status === 0) {
                    var greyhoundHierarchy = JSON.parse(xhr.responseText);
                    callback(node, greyhoundHierarchy);
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
