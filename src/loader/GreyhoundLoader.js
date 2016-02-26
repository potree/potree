

/**
 * @class Loads greyhound metadata and returns a PointcloudOctree
 *
 * @author Maarten van Meersbergen
 * @author Oscar Martinez Rubi
 * @author Connor Manning
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
		// We assume everything ater the string 'greyhound:' is the server url
		var serverURL = url.split('greyhound:')[1];
		var xhr = new XMLHttpRequest();
		xhr.open('GET', serverURL+'info', true);

		xhr.onreadystatechange = function() {
			if(xhr.readyState === 4 && (xhr.status === 200 || xhr.status === 0)){
				/* We parse the result of the info query, which should be a JSON datastructure somewhat like:
					{
					  "bounds": [635577, 848882, -1000, 639004, 853538, 2000],
					  "numPoints": 10653336,
					  "schema": [{
					    "name": "X",
					    "size": 8,
					    "type": "floating"
					  }, {
					    "name": "Y",
					    "size": 8,
					    "type": "floating"
					  }, {
					    "name": "Z",
					    "size": 8,
					    "type": "floating"
					  }, {
					    "name": "Intensity",
					    "size": 2,
					    "type": "unsigned"
					  }, {
					    "name": "Origin",
					    "size": 4,
					    "type": "unsigned"
					  }, {
					    "name": "Red",
					    "size": 2,
					    "type": "unsigned"
					  }, {
					    "name": "Green",
					    "size": 2,
					    "type": "unsigned"
					  }, {
					    "name": "Blue",
					    "size": 2,
					    "type": "unsigned"
					  }],
					  "srs": "PROJCS[\"NAD_1983_HARN_Lambert_Conformal_Conic\",GEOGCS[\"GCS_North_American_1983_HARN\",DATUM[\"NAD83_High_Accuracy_Regional_Network\",SPHEROID[\"GRS_1980\",6378137,298.257222101,AUTHORITY[\"EPSG\",\"7019\"]],AUTHORITY[\"EPSG\",\"6152\"]],PRIMEM[\"Greenwich\",0],UNIT[\"degree\",0.0174532925199433]],PROJECTION[\"Lambert_Conformal_Conic_2SP\"],PARAMETER[\"standard_parallel_1\",43],PARAMETER[\"standard_parallel_2\",45.5],PARAMETER[\"latitude_of_origin\",41.75],PARAMETER[\"central_meridian\",-120.5],PARAMETER[\"false_easting\",1312335.958005249],PARAMETER[\"false_northing\",0],UNIT[\"foot\",0.3048,AUTHORITY[\"EPSG\",\"9002\"]]]",
					  "type": "octree"
					}
				*/
				var greyhoundInfo = JSON.parse(xhr.responseText);
				var version = new Potree.Version('1.4');

				var bounds = greyhoundInfo.bounds;
				var baseDepth = Math.max(8, greyhoundInfo.baseDepth);

				var pgg = new Potree.PointCloudGreyhoundGeometry();
				pgg.serverURL = serverURL;
				pgg.spacing = (bounds[3]-bounds[0])/2^baseDepth;
				pgg.baseDepth = baseDepth;
				pgg.hierarchyStepSize = HIERARCHY_STEP_SIZE;

				// Ideally we want to change this bit completely, since greyhound's options are wider
				// than the default options for visualizing pointclouds. If someone ever has time to
				// build a custom ui element for greyhound, the schema options from this info request
				// should be given to the UI, so the user can choose between them. The selected option
				// can then be directly requested from the server in the PointCloudGreyhoundGeometryNode
				// without asking for attributes that we are not currently visualizing.

				//We assume XYZ are always available.
				var attributes = ['POSITION_CARTESIAN'];

				//To be careful, we only add COLOR_PACKED as an option if all 3 colors are actually found.
				var red = false;
				var green = false;
				var blue = false;

				greyhoundInfo.schema.forEach(function(entry) {
					// Intensity and Classification are optional.
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
				pgg.pointAttributes = new Potree.PointAttributes(attributes);

				var min = new THREE.Vector3(bounds[0], bounds[1], bounds[2]);
				var max = new THREE.Vector3(bounds[3], bounds[4], bounds[5]);
				var boundingBox = new THREE.Box3(min, max);
				var tightBoundingBox = boundingBox.clone();

				var nodeOffset = new THREE.Vector3(0,0,0);
				var globalOffset = new THREE.Vector3(0,0,0);

				var extent = {'x': max.x - min.x, 'y': max.y - min.y, 'z': max.z - min.z};

				globalOffset.set(min.x, min.y, min.z);

				pgg.projection = greyhoundInfo.srs;
				pgg.boundingBox = boundingBox;
				pgg.tightBoundingBox = tightBoundingBox;
				pgg.boundingSphere = boundingBox.getBoundingSphere();
				pgg.tightBoundingSphere = tightBoundingBox.getBoundingSphere();

				// Ideally, we would want to be able to ask for a scale and an offset as well.
				// Once that is possible in Greyhound, this will need to be changed.
				pgg.bbOffset = globalOffset;
				pgg.offset = nodeOffset;
				pgg.scale = SCALE; //greyhoundInfo.scale;

				pgg.loader = new Potree.GreyhoundBinaryLoader(version, boundingBox, pgg.scale);

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
