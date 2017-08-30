const Version = require('../Version');
const GreyhoundUtils = require('./GreyhoundUtils');
const PointCloudGreyhoundGeometry = require('../PointCloudGreyhoundGeometry');
const PointAttributes = require('./PointAttributes');
const GreyhoundBinaryLoader = require('./GreyhoundBinaryLoader');
const PointCloudGreyhoundGeometryNode = require('../PointCloudGreyhoundGeometryNode');
const PointAttributes = require('./PointAttributes');
const PointAttribute = require('./PointAttribute');
const THREE = require('three');

const GreyhoundLoader = function () { };
GreyhoundLoader.loadInfoJSON = function load (url, callback) { };

/**
 * @return a point cloud octree with the root node data loaded.
 * loading of descendants happens asynchronously when they're needed
 *
 * @param url
 * @param loadingFinishedListener executed after loading the binary has been
 * finished
 */
GreyhoundLoader.load = function load (url, callback) {
	var HIERARCHY_STEP_SIZE = 5;

	try {
		// We assume everything ater the string 'greyhound://' is the server url
		var serverURL = url.split('greyhound://')[1];
		if (serverURL.split('http://').length === 1) {
			serverURL = 'http://' + serverURL;
		}

		GreyhoundUtils.fetch(serverURL + 'info', function (err, data) {
			if (err) throw new Error(err);

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
			var greyhoundInfo = JSON.parse(data);
			var version = new Version('1.4');

			var bounds = greyhoundInfo.bounds;
			// TODO Unused: var boundsConforming = greyhoundInfo.boundsConforming;

			// TODO Unused: var width = bounds[3] - bounds[0];
			// TODO Unused: var depth = bounds[4] - bounds[1];
			// TODO Unused: var height = bounds[5] - bounds[2];
			// TODO Unused: var radius = width / 2;
			var scale = greyhoundInfo.scale || 0.01;
			if (Array.isArray(scale)) {
				scale = Math.min(scale[0], scale[1], scale[2]);
			}

			if (GreyhoundUtils.getQueryParam('scale')) {
				scale = parseFloat(GreyhoundUtils.getQueryParam('scale'));
			}

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
			var red = false;
			var green = false;
			var blue = false;

			greyhoundInfo.schema.forEach(function (entry) {
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
			var pgg = new PointCloudGreyhoundGeometry();
			pgg.serverURL = serverURL;
			pgg.spacing = (bounds[3] - bounds[0]) / Math.pow(2, baseDepth);
			pgg.baseDepth = baseDepth;
			pgg.hierarchyStepSize = HIERARCHY_STEP_SIZE;

			pgg.schema = GreyhoundUtils.createSchema(attributes);
			var pointSize = GreyhoundUtils.pointSizeFrom(pgg.schema);

			pgg.pointAttributes = new PointAttributes(attributes);
			pgg.pointAttributes.byteSize = pointSize;

			var boundingBox = new THREE.Box3(
				new THREE.Vector3().fromArray(bounds, 0),
				new THREE.Vector3().fromArray(bounds, 3)
			);

			var offset = boundingBox.min.clone();

			boundingBox.max.sub(boundingBox.min);
			boundingBox.min.set(0, 0, 0);

			pgg.projection = greyhoundInfo.srs;
			pgg.boundingBox = boundingBox;
			pgg.boundingSphere = boundingBox.getBoundingSphere();

			pgg.scale = scale;
			pgg.offset = offset;

			console.log('Scale:', scale);
			console.log('Offset:', offset);
			console.log('Bounds:', boundingBox);

			pgg.loader = new GreyhoundBinaryLoader(version, boundingBox, pgg.scale);

			var nodes = {};

			{ // load root
				var name = 'r';

				var root = new PointCloudGreyhoundGeometryNode(
					name, pgg, boundingBox,
					scale, offset
				);

				root.level = 0;
				root.hasChildren = true;
				root.numPoints = greyhoundInfo.numPoints;
				root.spacing = pgg.spacing;
				pgg.root = root;
				pgg.root.load();
				nodes[name] = root;
			}

			pgg.nodes = nodes;

			GreyhoundUtils.getNormalization(serverURL, greyhoundInfo.baseDepth,
				function (_, normalize) {
					if (normalize.color) pgg.normalize.color = true;
					if (normalize.intensity) pgg.normalize.intensity = true;

					callback(pgg);
				}
			);
		});
	} catch (e) {
		console.log("loading failed: '" + url + "'");
		console.log(e);

		callback();
	}
};

GreyhoundLoader.loadPointAttributes = function (mno) {
	var fpa = mno.pointAttributes;
	var pa = new PointAttributes();

	for (var i = 0; i < fpa.length; i++) {
		var pointAttribute = PointAttribute[fpa[i]];
		pa.add(pointAttribute);
	}

	return pa;
};

GreyhoundLoader.createChildAABB = function (aabb, childIndex) {
	var min = aabb.min;
	var max = aabb.max;
	var dHalfLength = new THREE.Vector3().copy(max).sub(min).multiplyScalar(0.5);
	var xHalfLength = new THREE.Vector3(dHalfLength.x, 0, 0);
	var yHalfLength = new THREE.Vector3(0, dHalfLength.y, 0);
	var zHalfLength = new THREE.Vector3(0, 0, dHalfLength.z);

	var cmin = min;
	var cmax = new THREE.Vector3().add(min).add(dHalfLength);

	if (childIndex === 1) {
		min = new THREE.Vector3().copy(cmin).add(zHalfLength);
		max = new THREE.Vector3().copy(cmax).add(zHalfLength);
	} else if (childIndex === 3) {
		min = new THREE.Vector3().copy(cmin).add(zHalfLength).add(yHalfLength);
		max = new THREE.Vector3().copy(cmax).add(zHalfLength).add(yHalfLength);
	} else if (childIndex === 0) {
		min = cmin;
		max = cmax;
	} else if (childIndex === 2) {
		min = new THREE.Vector3().copy(cmin).add(yHalfLength);
		max = new THREE.Vector3().copy(cmax).add(yHalfLength);
	} else if (childIndex === 5) {
		min = new THREE.Vector3().copy(cmin).add(zHalfLength).add(xHalfLength);
		max = new THREE.Vector3().copy(cmax).add(zHalfLength).add(xHalfLength);
	} else if (childIndex === 7) {
		min = new THREE.Vector3().copy(cmin).add(dHalfLength);
		max = new THREE.Vector3().copy(cmax).add(dHalfLength);
	} else if (childIndex === 4) {
		min = new THREE.Vector3().copy(cmin).add(xHalfLength);
		max = new THREE.Vector3().copy(cmax).add(xHalfLength);
	} else if (childIndex === 6) {
		min = new THREE.Vector3().copy(cmin).add(xHalfLength).add(yHalfLength);
		max = new THREE.Vector3().copy(cmax).add(xHalfLength).add(yHalfLength);
	}

	return new THREE.Box3(min, max);
};

module.exports = GreyhoundLoader;
