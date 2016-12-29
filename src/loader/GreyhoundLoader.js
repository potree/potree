/**
 * @class Loads greyhound metadata and returns a PointcloudOctree
 *
 * @author Maarten van Meersbergen
 * @author Oscar Martinez Rubi
 * @author Connor Manning
 */
var getQueryParam = function(name) {
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(window.location.href);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

Potree.GreyhoundLoader = function() { };
Potree.GreyhoundLoader.loadInfoJSON = function load(url, callback) { }

var createSchema = function(attributes) {
    var schema = [
        { "name": "X", "size": 4, "type": "signed" },
        { "name": "Y", "size": 4, "type": "signed" },
        { "name": "Z", "size": 4, "type": "signed" }
    ];

	// Once we include options in the UI to load a dynamic list of available
    // attributes for visualization (f.e. Classification, Intensity etc.)
	// we will be able to ask for that specific attribute from the server,
    // where we are now requesting all attributes for all points all the time.
	// If we do that though, we also need to tell Potree to redraw the points
    // that are already loaded (with different attributes).
	// This is not default behaviour.
    attributes.forEach(function(item) {
        if(item === 'COLOR_PACKED') {
            schema.push({ "name": "Red",      "size": 2, "type": "unsigned" });
            schema.push({ "name": "Green",    "size": 2, "type": "unsigned" });
            schema.push({ "name": "Blue",     "size": 2, "type": "unsigned" });
        } else if(item === 'INTENSITY'){
            schema.push({ "name": "Intensity", "size": 2, "type": "unsigned" });
        } else if(item === 'CLASSIFICATION') {
            schema.push(
                    { "name": "Classification", "size": 1, "type": "unsigned" });
        }
    });

  return schema;
}

/**
 * @return a point cloud octree with the root node data loaded.
 * loading of descendants happens asynchronously when they're needed
 *
 * @param url
 * @param loadingFinishedListener executed after loading the binary has been finished
 */
Potree.GreyhoundLoader.load = function load(url, callback) {
	var HIERARCHY_STEP_SIZE = 4;

	try {
		// We assume everything ater the string 'greyhound://' is the server url
		var serverURL = url.split('greyhound://')[1];
        if (serverURL.split('http://').length == 1) {
            serverURL = 'http://' + serverURL;
        }

		var xhr = new XMLHttpRequest();
		xhr.open('GET', serverURL + 'info', true);

		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4 && (xhr.status === 200 || xhr.status === 0)){
				/* We parse the result of the info query, which should be a JSON
                 * datastructure somewhat like:
                {
                  "bounds": [635577, 848882, -1000, 639004, 853538, 2000],
                  "numPoints": 10653336,
                  "schema": [
                      { "name": "X", "size": 8, "type": "floating" },
                      { "name": "Y", "size": 8, "type": "floating" },
                      { "name": "Z", "size": 8, "type": "floating" },
                      { "name": "Intensity", "size": 2, "type": "unsigned" },
                      { "name": "OriginId", "size": 4, "type": "unsigned" },
                      { "name": "Red", "size": 2, "type": "unsigned" },
                      { "name": "Green", "size": 2, "type": "unsigned" },
                      { "name": "Blue", "size": 2, "type": "unsigned" }
                  ],
                  "srs": "<omitted for brevity>",
                  "type": "octree"
                }
				*/
				var greyhoundInfo = JSON.parse(xhr.responseText);
				var version = new Potree.Version('1.4');

                var bounds = greyhoundInfo.bounds;
                var boundsConforming = greyhoundInfo.boundsConforming;

                var width = bounds[3] - bounds[0];
                var depth = bounds[4] - bounds[1];
                var height= bounds[5] - bounds[2];
                var radius = width / 2;

                var scale = greyhoundInfo.scale;
                if (!scale) {
					//scale = 1;
                    if (radius < 2500) scale = 0.01;
                    else if (radius < 10000) scale = 0.1;
                    else scale = 1.0;
                } else if (Array.isArray(scale)) {
                    scale = Math.min(scale[0], scale[1], scale[2]);
                }

                console.log('Scale:', scale);
                console.log('Offset:', offset);

				var baseDepth = Math.max(8, greyhoundInfo.baseDepth);

				// Ideally we want to change this bit completely, since
                // greyhound's options are wider than the default options for
                // visualizing pointclouds. If someone ever has time to build a
                // custom ui element for greyhound, the schema options from
                // this info request should be given to the UI, so the user can
                // choose between them. The selected option can then be
                // directly requested from the server in the
                // PointCloudGreyhoundGeometryNode without asking for
                // attributes that we are not currently visualizing.  We assume
                // XYZ are always available.
				var attributes = ['POSITION_CARTESIAN'];

				// To be careful, we only add COLOR_PACKED as an option if all
                // colors are actually found.
				var red = false, green = false, blue = false;

				greyhoundInfo.schema.forEach(function(entry) {
					// Intensity and Classification are optional.
					if (entry.name === 'Intensity') {
						attributes.push('INTENSITY');
					}
					if (entry.name === 'Classification') {
						attributes.push('CLASSIFICATION');
					}

					if (entry.name === 'Red') red = true;
                    else if (entry.name === 'Green') green = true;
                    else if (entry.name === 'Blue') blue = true;
				});

				if (red && green && blue) attributes.push('COLOR_PACKED');

                // Fill in geometry fields.
				var pgg = new Potree.PointCloudGreyhoundGeometry();
				pgg.serverURL = serverURL;
				pgg.spacing = (bounds[3] - bounds[0]) / Math.pow(2, baseDepth);
				pgg.baseDepth = baseDepth;
				pgg.hierarchyStepSize = HIERARCHY_STEP_SIZE;

                var pointSize = 0;
                pgg.schema = createSchema(attributes);
                pgg.schema.forEach(function(entry) {
                    pointSize += entry.size;
                });

				pgg.pointAttributes = new Potree.PointAttributes(attributes);
                pgg.pointAttributes.byteSize = pointSize;

				var boundingBox = new THREE.Box3(
					new THREE.Vector3().fromArray(bounds, 0),
					new THREE.Vector3().fromArray(bounds, 3));
				
				var offset = boundingBox.min.clone();
				
				boundingBox.max.sub(boundingBox.min);
				boundingBox.min.set(0, 0, 0);

				pgg.projection = greyhoundInfo.srs;
				pgg.boundingBox = boundingBox;
				pgg.boundingSphere = boundingBox.getBoundingSphere();

				pgg.scale = scale;
				pgg.offset = offset;

				pgg.loader = new Potree.GreyhoundBinaryLoader(
                        version, boundingBox, pgg.scale);

				var nodes = {};

				{ // load root
					var name = "r";

					var root = new Potree.PointCloudGreyhoundGeometryNode(
                            name, pgg, boundingBox,
                            scale, offset);

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
	}
    catch(e) {
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
