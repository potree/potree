var nodesLoadTimes = {};

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
  //Determine what schema to ask the greyhound server for.
  var material = viewer.getMaterial();

  var schema = [{
    "name": "X",
    "size": 4,
    "type": "signed"
  }, {
    "name": "Y",
    "size": 4,
    "type": "signed"
  }, {
    "name": "Z",
    "size": 4,
    "type": "signed"
  }];

  this.pcoGeometry.pointAttributes.attributes.forEach(function(item) {
    if(material === Potree.PointColorType.RGB && item.name === Potree.PointAttributeNames.COLOR_PACKED) {
      schema.push({
        "name": "Red",
        "size": 1,
        "type": "unsigned"
      });
      schema.push({
        "name": "Green",
        "size": 1,
        "type": "unsigned"
      });
      schema.push({
        "name": "Blue",
        "size": 1,
        "type": "unsigned"
      });
    } else if(material === Potree.PointColorType.INTENSITY && item.name === Potree.PointAttributeNames.INTENSITY){
      schema.push({
        "name": "Intensity",
        "size": 2,
        "type": "unsigned"
      });
  	} else if(material === Potree.PointColorType.CLASSIFICATION && item.name === Potree.PointAttributeNames.CLASSIFICATION){
      schema.push({
        "name": "Classification",
        "size": 1,
        "type": "unsigned"
      });
  	}
  });

  this.pcoGeometry.pointAttributes.byteSize = 0;
  schema.forEach(function(entry) {
    this.pcoGeometry.pointAttributes.byteSize += entry.size;
  }.bind(this));
  // else if(material === Potree.PointColorType.LOD){
  //
	// }
  // // else if(material === Potree.PointColorType.POINT_INDEX){
  //
	// }

	// console.log(JSON.stringify(schema));

  var bb = this.boundingBox;
  var offset = this.pcoGeometry.offset;
  //var boundsString = (bb.min.x-offset.x) + ',' + (bb.min.y-offset.y) + ',' + (bb.min.z-offset.z) + ',' + (bb.max.x-offset.x) + ',' + (bb.max.y-offset.y) + ',' + (bb.max.z-offset.z);
  var boundsString = (bb.min.x) + ',' + (bb.min.y) + ',' + (bb.min.z) + ',' + (bb.max.x) + ',' + (bb.max.y) + ',' + (bb.max.z);

  var url = ''+this.pcoGeometry.serverURL + 'read?depth=' + (this.level+this.pcoGeometry.baseDepth) + '&bounds=[' + boundsString + ']' + '&schema='+JSON.stringify(schema); //+'&scale=' +this.pcoGeometry.scale;

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

  var makeBitMask = function(node) {
    var keys = Object.keys(node);
    var mask = 0;

    keys.forEach(function(key) {
      if (key === 'swd') {
        mask += 1 << 0;
      } else if (key === 'nwd') {
        mask += 1 << 1;
      } else if (key === 'swu') {
        mask += 1 << 2;
      } else if (key === 'nwu') {
        mask += 1 << 3;
      } else if (key === 'sed') {
        mask += 1 << 4;
      } else if (key === 'ned') {
        mask += 1 << 5;
      } else if (key === 'seu') {
        mask += 1 << 6;
      } else if (key === 'neu') {
        mask += 1 << 7;
      }
    });
    return mask;
  };

  var parseChildrenCounts = function(base, parentName, stack) {
    var keys = Object.keys(base);
    var child;
    var childName;
    keys.forEach(function(key) {
      if (key !== 'count') {
        if (key === 'swd') {
          child = base.swd;
          childName = parentName+0;
        } else if (key === 'nwd') {
          child = base.nwd;
          childName = parentName+1;
        } else if (key === 'swu') {
          child = base.swu;
          childName = parentName+2;
        } else if (key === 'nwu') {
          child = base.nwu;
          childName = parentName+3;
        } else if (key === 'sed') {
          child = base.sed;
          childName = parentName+4;
        } else if (key === 'ned') {
          child = base.ned;
          childName = parentName+5;
        } else if (key === 'seu') {
          child = base.seu;
          childName = parentName+6;
        } else if (key === 'neu') {
          child = base.neu;
          childName = parentName+7;
        }

        stack.push({children: makeBitMask(child), numPoints: child.count, name: childName});
        parseChildrenCounts(child, childName, stack);
      }
    });
  };

	// load hierarchy
	var callback = function(node, greyhoundHierarchy){

		var decoded = [];
		node.numPoints = greyhoundHierarchy.count;
    parseChildrenCounts(greyhoundHierarchy, node.name, decoded);


		//console.log(decoded);

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
			var boundingBox = Potree.GreyhoundLoader.createChildAABB(parentNode.boundingBox, index);

			var currentNode = new Potree.PointCloudGreyhoundGeometryNode(name, pgg, boundingBox);
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
    var offset = node.pcoGeometry.offset;
    // var boundsString = (bb.min.x-offset.x) + ',' + (bb.min.y-offset.y) + ',' + (bb.min.z-offset.z) + ',' + (bb.max.x-offset.x) + ',' + (bb.max.y-offset.y) + ',' + (bb.max.z-offset.z);
    var boundsString = (bb.min.x) + ',' + (bb.min.y) + ',' + (bb.min.z) + ',' + (bb.max.x) + ',' + (bb.max.y) + ',' + (bb.max.z);

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
