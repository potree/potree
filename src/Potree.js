

function Potree(){

}

Potree.init = function(args){
	var args_ = args || {};

	Potree.pointLoadLimit = args_.pointLoadLimit || 50*1000*1000;
	Potree.lru = new LRU();
}


/**
 *
 * amount: minimum number of points to remove
 */
Potree.removeLeastRecentlyUsed = function(amount){
	
	
	var freed = 0;
	do{
		var node = this.lru.first.node;
		var parent = node.parent;
		var geometry = node.geometry;
		var pcoGeometry = node.pcoGeometry;
		var proxy = new Potree.PointCloudOctreeProxyNode(pcoGeometry);
	
		var result = Potree.removeNode(node);
		freed += result.freed;
		
		parent.add(proxy);
		
		if(result.numDeletedNodes == 0){
			break;
		}
	}while(freed < amount);
}

Potree.removeNode = function(node){
	//console.log("removeNode(" + node.name + ")");
	
	var freed = 0;
	var numDeletedNodes = 0;
	var descendants = [];
	
	node.traverse(function(object){
		descendants.push(object);
	});
	
	for(var i = 0; i < descendants.length; i++){
		var descendant = descendants[i];
		if(descendant instanceof THREE.PointCloud){
			freed += descendant.pcoGeometry.numPoints;
			descendant.pcoGeometry.dispose();
			descendant.geometry.dispose();
			Potree.lru.remove(descendant);
			numDeletedNodes++;
		}
	}
	
	Potree.lru.remove(node);
	node.parent.remove(node);
	
	return {
		"freed": freed,
		"numDeletedNodes": numDeletedNodes
	};
}






