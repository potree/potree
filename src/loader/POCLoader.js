

/**
 * @class Loads mno files and returns a PointcloudOctree
 * for a description of the mno binary file format, read mnoFileFormat.txt
 * 
 * @author Markus Schuetz
 */
function POCLoader(){
	
}
 
/**
 * @return a point cloud octree with the root node data loaded. 
 * loading of descendants happens asynchronously when they're needed
 * 
 * @param file the xml mno file
 * @param loadingFinishedListener executed after loading the binary has been finished
 */
POCLoader.load = function load(file) {
	try{
		var pco = new PointcloudOctree();
		var xhr = new XMLHttpRequest();
		xhr.open('GET', file, false);
		xhr.send(null);
		if(xhr.status === 200 || xhr.status === 0){
			var fMno = JSON.parse(xhr.responseText);
			
			pco.octreeDir = file + "/../data";
			var pointAttributes = POCLoader.loadPointAttributes(fMno);
			pco.setPointAttributes(pointAttributes);
			
			{ // load Root
				var mRoot = new PointcloudOctreeNode("r", pco);
				var aabb = new AABB();
				aabb.setDimensionByMinMax(
						[ fMno.boundingBox.lx, fMno.boundingBox.ly, fMno.boundingBox.lz ],  
						[ fMno.boundingBox.ux, fMno.boundingBox.uy, fMno.boundingBox.uz ]);
				mRoot.setAABB(aabb);
				mRoot.points = fMno.hierarchy[0][1];
				pco.rootNode = mRoot;
			}
			
			// load remaining hierarchy
			for( var i = 1; i < fMno.hierarchy.length; i++){
				var nodeName = fMno.hierarchy[i][0];
				var points = fMno.hierarchy[i][1];
				var mNode = new PointcloudOctreeNode(nodeName, pco);
				mNode.points = points;
				pco.rootNode.addChild(mNode);
				var childIndex = parseInt(mNode.name.charAt(mNode.name.length-1));
				var childAABB = POCLoader.createChildAABB(mNode.parent.aabb, childIndex);
				mNode.setAABB(childAABB);
			}
			
		}
		
		var pcoNode = new PointcloudOctreeSceneNode(pco);
		return pcoNode;
	}catch(e){
//		Logger.error("loading failed: '" + file + "'");
//		Logger.error(e);
		console.log("loading failed: '" + file + "'");
		console.log(e);
	}
};

POCLoader.loadPointAttributes = function(mno){
	
	var fpa = mno.pointAttributes;
	var pa = new PointAttributes();
	
	for(var i = 0; i < fpa.length; i++){   
		var pointAttribute = PointAttribute[fpa[i]];
		pa.add(pointAttribute);
	}                                                                     
	
	return pa;
//	var fpa = mno.pointAttributes;
//	var pa = {
//		'numAttributes' : fpa.length,
//		'bytesPerPoint' : 0,
//		'attributes' : {}
//	};
//	
//	for(var i = 0; i < fpa.length; i++){
//		var pointAttribute = PointAttributes[fpa[i]];
//		pa.attributes[i] = pointAttribute; 
//		var bytes = pointAttribute.type.size * pointAttribute.numElements;
//		pa.bytesPerPoint += bytes;
//	}
//	
//	return pa;
};


/**
 * creates an aabb that covers the area of the childnode at childIndex
 * 
 * @param aabb aabb of the parent
 * @param childIndex index of the childs region
 * @returns {AABB}
 */
POCLoader.createChildAABB = function(aabb, childIndex){
	var min = aabb.objectSpaceMin;
	var max = aabb.objectSpaceMax;
	var caabb = new AABB();
	// (aabb.max - aabb.minPos) * 0.5
	var dHalfLength = V3.scale(V3.sub(max,min), 0.5);
	var xHalfLength = [ dHalfLength[0], 0, 0 ];
	var yHalfLength = [ 0, dHalfLength[1], 0 ];
	var zHalfLength = [ 0, 0, dHalfLength[2] ];

	{
		var cmin = min;
		// max = min + (aabb.max - aabb.min) * 0.5;
		var cmax = V3.add(min, dHalfLength);
		var caabb = new AABB();
		caabb.setDimensionByMinMax(cmin, cmax);
	}

	if (childIndex === 1) {
		var min = V3.add(caabb.min, zHalfLength);
		var max = V3.add(caabb.max, zHalfLength);
		caabb.setDimensionByMinMax(min, max);
		caabb.setColor([0.0, 0.0, 1.0, 1.0]);
	}else if (childIndex === 3) {
		var min = V3.add(V3.add(caabb.min, zHalfLength), yHalfLength);
		var max = V3.add(V3.add(caabb.max, zHalfLength), yHalfLength);
		caabb.setDimensionByMinMax(min, max);
		caabb.setColor([1.0, 1.0, 0.0, 1.0]);
	}else if (childIndex === 0) {
		caabb.setColor([1.0, 0.0, 0.0, 1.0]);
	}else if (childIndex === 2) {
		var min = V3.add(caabb.min, yHalfLength);
		var max = V3.add(caabb.max, yHalfLength);
		caabb.setDimensionByMinMax(min, max);
		caabb.setColor([0.0, 1.0, 0.0, 1.0]);
	}else if (childIndex === 5) {
		var min = V3.add(V3.add(caabb.min, zHalfLength), xHalfLength);
		var max = V3.add(V3.add(caabb.max, zHalfLength), xHalfLength);
		caabb.setDimensionByMinMax(min, max);
		caabb.setColor([1.0, 1.0, 1.0, 1.0]);
	}else if (childIndex === 7) {
		var min = V3.add(caabb.min, dHalfLength);
		var max = V3.add(caabb.max, dHalfLength);
		caabb.setDimensionByMinMax(min, max);
		caabb.setColor([0.0, 0.0, 0.0, 1.0]);
	}else if (childIndex === 4) {
		var min = V3.add(caabb.min, xHalfLength);
		var max = V3.add(caabb.max, xHalfLength);
		caabb.setDimensionByMinMax(min, max);
		caabb.setColor([1.0, 0.0, 1.0, 1.0]);
	}else if (childIndex === 6) {
		var min = V3.add(V3.add(caabb.min, xHalfLength), yHalfLength);
		var max = V3.add(V3.add(caabb.max, xHalfLength), yHalfLength);
		caabb.setDimensionByMinMax(min, max);
		caabb.setColor([0.0, 1.0, 1.0, 1.0]);
	}
	
	return caabb;
};


