

/**
 * @class Loads mno files and returns a PointcloudOctree
 * for a description of the mno binary file format, read mnoFileFormat.txt
 *
 * @author Markus Schuetz
 */
Potree.GreyhoundLoader = function(){

};

Potree.GreyhoundLoader.loadInfoJSON = function load(url, callback) {
}

/**
 * @return a point cloud octree with the root node data loaded.
 * loading of descendants happens asynchronously when they're needed
 *
 * @param url
 * @param loadingFinishedListener executed after loading the binary has been finished
 */
Potree.GreyhoundLoader.load = function load(url, callback) {
	var HIERARCHY_STEP_SIZE = 3;
	var SCALE = 1;

	try{
		var serverURL = url.split('greyhound:')[1];
		var xhr = new XMLHttpRequest();
		xhr.open('GET', serverURL+'info', true);


		xhr.onreadystatechange = function() {
			if(xhr.readyState === 4 && (xhr.status === 200 || xhr.status === 0)){
				var greyhoundInfo = JSON.parse(xhr.responseText);
				var version = new Potree.Version('1.4');

				var bounds = greyhoundInfo.bounds;
				var baseDepth = Math.max(8, greyhoundInfo.baseDepth);

				var pgg = new Potree.PointCloudGreyhoundGeometry();
				pgg.serverURL = serverURL;
				pgg.spacing = (bounds[3]-bounds[0])/2^baseDepth;
				pgg.baseDepth = baseDepth;
				pgg.hierarchyStepSize = HIERARCHY_STEP_SIZE;
				var attributes = ['POSITION_CARTESIAN'];

				var red = false;
				var green = false;
				var blue = false;

				greyhoundInfo.schema.forEach(function(entry) {
					if (entry.name === 'Intensity') {
						attributes.push('INTENSITY');
					}
					if (entry.name === 'Classification') {
						attributes.push('CLASSIFICATION');
					}

					if (entry.name === 'Red') {
						red = true;
					}
					if (entry.name === 'Green') {
						green = true;
					}
					if (entry.name === 'Blue') {
						blue = true;
					}
				});

				if (red&&green&&blue) {
					attributes.push('COLOR_PACKED');
				}

				var min = new THREE.Vector3(bounds[0], bounds[1], bounds[2]);
				var max = new THREE.Vector3(bounds[3], bounds[4], bounds[5]);
				var boundingBox = new THREE.Box3(min, max);
				var tightBoundingBox = boundingBox.clone();

				var nodeOffset = new THREE.Vector3(0,0,0);
				var globalOffset = new THREE.Vector3(0,0,0);

				var extent = {'x': max.x - min.x, 'y': max.y - min.y, 'z': max.z - min.z};

				// x = 1000 - 1200
				// min.x = 1000
				// extent.x = 200
				// min.x+0.5*extent.x = 1100

				// globalOffset.set(min.x+0.5*extent.x, min.y+0.5*extent.y, min.z+0.5*extent.z);
				globalOffset.set(min.x, min.y, min.z);

				// nodeOffset.set(-0.5*extent.x, -0.5*extent.y, -0.5*extent.z);

				// boundingBox.min.add(offset);
				// boundingBox.max.add(offset);

				// tightBoundingBox.min.add(offset);
				// tightBoundingBox.max.add(offset);

				pgg.projection = greyhoundInfo.srs;
				pgg.boundingBox = boundingBox;
				pgg.tightBoundingBox = tightBoundingBox;
				pgg.boundingSphere = boundingBox.getBoundingSphere();
				pgg.tightBoundingSphere = tightBoundingBox.getBoundingSphere();
				pgg.bbOffset = globalOffset;
				pgg.offset = nodeOffset;
				pgg.scale = SCALE; //greyhoundInfo.scale;

				pgg.loader = new Potree.GreyhoundBinaryLoader(version, boundingBox, pgg.scale);
				pgg.pointAttributes = new Potree.PointAttributes(attributes);

				var nodes = {};

				{ // load root
					var name = "r";

					var root = new Potree.PointCloudGreyhoundGeometryNode(name, pgg, boundingBox);
					root.level = 0;
					root.hasChildren = true;
					root.numPoints = greyhoundInfo.numPoints;
					pgg.root = root;
					pgg.root.load();
					nodes[name] = root;
				}

				pgg.nodes = nodes;

				callback(pgg);
			}
		};
		xhr.send(null);

	}catch(e){
		console.log("loading failed: '" + url + "'");
		console.log(e);

		callback();
	}
};

Potree.GreyhoundLoader.loadPointAttributes = function(mno){
	var fpa = mno.pointAttributes;
	var pa = new Potree.PointAttributes();

	for(var i = 0; i < fpa.length; i++){
		var pointAttribute = Potree.PointAttribute[fpa[i]];
		pa.add(pointAttribute);
	}

	return pa;
};


Potree.GreyhoundLoader.createChildAABB = function(aabb, childIndex){
	var V3 = THREE.Vector3;
	var min = aabb.min;
	var max = aabb.max;
	var dHalfLength = new THREE.Vector3().copy(max).sub(min).multiplyScalar(0.5);
	var xHalfLength = new THREE.Vector3(dHalfLength.x, 0, 0);
	var yHalfLength = new THREE.Vector3(0, dHalfLength.y, 0);
	var zHalfLength = new THREE.Vector3(0, 0, dHalfLength.z);

	var cmin = min;
	var cmax = new THREE.Vector3().add(min).add(dHalfLength);

	var min, max;
	if (childIndex === 1) {
		min = new THREE.Vector3().copy(cmin).add(zHalfLength);
		max = new THREE.Vector3().copy(cmax).add(zHalfLength);
	}else if (childIndex === 3) {
		min = new THREE.Vector3().copy(cmin).add(zHalfLength).add(yHalfLength);
		max = new THREE.Vector3().copy(cmax).add(zHalfLength).add(yHalfLength);
	}else if (childIndex === 0) {
		min = cmin;
		max = cmax;
	}else if (childIndex === 2) {
		min = new THREE.Vector3().copy(cmin).add(yHalfLength);
		max = new THREE.Vector3().copy(cmax).add(yHalfLength);
	}else if (childIndex === 5) {
		min = new THREE.Vector3().copy(cmin).add(zHalfLength).add(xHalfLength);
		max = new THREE.Vector3().copy(cmax).add(zHalfLength).add(xHalfLength);
	}else if (childIndex === 7) {
		min = new THREE.Vector3().copy(cmin).add(dHalfLength);
		max = new THREE.Vector3().copy(cmax).add(dHalfLength);
	}else if (childIndex === 4) {
		min = new THREE.Vector3().copy(cmin).add(xHalfLength);
		max = new THREE.Vector3().copy(cmax).add(xHalfLength);
	}else if (childIndex === 6) {
		min = new THREE.Vector3().copy(cmin).add(xHalfLength).add(yHalfLength);
		max = new THREE.Vector3().copy(cmax).add(xHalfLength).add(yHalfLength);
	}

	return new THREE.Box3(min, max);
};
