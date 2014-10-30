

function Potree(){
	
}

Potree.pointLoadLimit = 50*1000*1000;

// contains WebWorkers with base64 encoded code
Potree.workers = {};









Potree.WorkerManager = function(code){
	this.code = code;
	this.instances = [];
	this.createdInstances = 0;
}

Potree.WorkerManager.prototype.getWorker = function(){
	var ww = this.instances.pop();
	
	if(ww === undefined){
		ww = Potree.utils.createWorker(this.code);
		this.createdInstances++;
	}
	
	return ww;
}


Potree.WorkerManager.prototype.returnWorker = function(worker){
	this.instances.push(worker);
}

/**
 * urls point to WebWorker code.
 * Code must not contain calls to importScripts, 
 * concatenation is done by this method.
 * 
 */
Potree.WorkerManager.fromUrls = function(urls){

	var code = "";
	for(var i = 0; i < urls.length; i++){
		var url = urls[i];
		var xhr = new XMLHttpRequest();
		xhr.open('GET', url, false);
		xhr.responseType = 'text';
		xhr.overrideMimeType('text/plain; charset=x-user-defined');
		xhr.send(null);
		
		if(xhr.status === 200){
			code += xhr.responseText + "\n";
		}
	}
	
	return new Potree.WorkerManager(code);
}

THREE.PerspectiveCamera.prototype.zoomTo = function(node, factor){
	if(factor === undefined){
		factor = 1;
	}

	node.updateMatrixWorld();
	this.updateMatrix();
	this.updateMatrixWorld();
	
	var box = Potree.utils.computeTransformedBoundingBox(node.boundingBox, node.matrixWorld);
	var dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.quaternion);
	var pos = box.center().sub(dir);
	
	var ps = [
		new THREE.Vector3(box.min.x, box.min.y, box.min.z),
		new THREE.Vector3(box.min.x, box.min.y, box.min.z),
		new THREE.Vector3(box.max.x, box.min.y, box.min.z),
		new THREE.Vector3(box.min.x, box.max.y, box.min.z),
		new THREE.Vector3(box.min.x, box.min.y, box.max.z),
		new THREE.Vector3(box.min.x, box.max.y, box.max.z),
		new THREE.Vector3(box.max.x, box.max.y, box.min.z),
		new THREE.Vector3(box.max.x, box.min.y, box.max.z),
		new THREE.Vector3(box.max.x, box.max.y, box.max.z)
	];
	
	var frustum = new THREE.Frustum();
	frustum.setFromMatrix(new THREE.Matrix4().multiplyMatrices(this.projectionMatrix, this.matrixWorldInverse));
	
	var max = Number.MIN_VALUE;
	for(var i = 0; i < ps.length; i++){
		var p  = ps[i];
		
		var distance = Number.MIN_VALUE;
		// iterate through left, right, top and bottom planes
		for(var j = 0; j < frustum.planes.length-2; j++){
			var plane = frustum.planes[j];
			var ray = new THREE.Ray(p, dir);
			var dI = ray.distanceToPlaneWithNegative(plane);
			distance = Math.max(distance, dI);
		}
		max = Math.max(max, distance);
	}
	var offset = dir.clone().multiplyScalar(-max);
	offset.multiplyScalar(factor);
	pos.add(offset);
	this.position.copy(pos);
	
}
THREE.Ray.prototype.distanceToPlaneWithNegative = function ( plane ) {
	var denominator = plane.normal.dot( this.direction );
	if ( denominator == 0 ) {

		// line is coplanar, return origin
		if( plane.distanceToPoint( this.origin ) == 0 ) {
			return 0;
		}

		// Null is preferable to undefined since undefined means.... it is undefined
		return null;
	}
	var t = - ( this.origin.dot( plane.normal ) + plane.constant ) / denominator;

	return t;
}


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
 * @param url
 * @param loadingFinishedListener executed after loading the binary has been finished
 */
POCLoader.load = function load(url, params) {
	var parameters = params || {};
	var toOrigin = parameters.toOrigin || false;

	try{
		var pco = new Potree.PointCloudOctreeGeometry();
		pco.url = url;
		var xhr = new XMLHttpRequest();
		xhr.open('GET', url, false);
		xhr.send(null);
		if(xhr.status === 200 || xhr.status === 0){
			var fMno = JSON.parse(xhr.responseText);
			if(Potree.utils.pathExists(fMno.octreeDir + "/r")){
				pco.octreeDir = fMno.octreeDir;
			}else{
				pco.octreeDir = url + "/../" + fMno.octreeDir;
			}
			
			pco.spacing = fMno.spacing;

			pco.pointAttributes = fMno.pointAttributes;
			
			var min = new THREE.Vector3(fMno.boundingBox.lx, fMno.boundingBox.ly, fMno.boundingBox.lz);
			var max = new THREE.Vector3(fMno.boundingBox.ux, fMno.boundingBox.uy, fMno.boundingBox.uz);
			var boundingBox = new THREE.Box3(min, max);
			var offset = new THREE.Vector3(0,0,0);
			
			if(toOrigin){
				offset.set(-min.x, -min.y, -min.z);
				boundingBox.min.add(offset);
				boundingBox.max.add(offset);
			}
			pco.boundingBox = boundingBox;
			pco.offset = offset;
			
			var nodes = {};
			
			{ // load root
				var name = "r";
				
				var root = new Potree.PointCloudOctreeGeometryNode(name, pco, boundingBox);
				root.level = 0;
				root.numPoints = fMno.hierarchy[0][1];
				pco.root = root;
				pco.root.load();
				nodes[name] = root;
			}
			
			// load remaining hierarchy
			for( var i = 1; i < fMno.hierarchy.length; i++){
				var name = fMno.hierarchy[i][0];
				var numPoints = fMno.hierarchy[i][1];
				var index = parseInt(name.charAt(name.length-1));
				var parentName = name.substring(0, name.length-1);
				var parentNode = nodes[parentName];
				var level = name.length-1;
				var boundingBox = POCLoader.createChildAABB(parentNode.boundingBox, index);
				
				var node = new Potree.PointCloudOctreeGeometryNode(name, pco, boundingBox);
				node.level = level;
				node.numPoints = numPoints;
				parentNode.addChild(node);
				nodes[name] = node;
			}
			
			pco.nodes = nodes;
			
		}
		
		return pco;
	}catch(e){
		console.log("loading failed: '" + url + "'");
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
};


POCLoader.createChildAABB = function(aabb, childIndex){
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





///**
// * Some types of possible point attributes
// * 
// * @class
// */
//var PointAttributeNames = {
//	POSITION_CARTESIAN 	: 0,	// float x, y, z;
//	COLOR_PACKED		: 1,	// byte r, g, b, a; 	I = [0,1]
//	COLOR_FLOATS_1		: 2,	// float r, g, b; 		I = [0,1]
//	COLOR_FLOATS_255	: 3,	// float r, g, b; 		I = [0,255]
//	NORMAL_FLOATS		: 4,  	// float x, y, z;
//	FILLER				: 5
//};
//
//var i = 0;
//for(var obj in PointAttributeNames){
//	PointAttributeNames[i] = PointAttributeNames[obj];
//	i++;
//}

function PointAttributeNames(){
	
}

PointAttributeNames.POSITION_CARTESIAN 	= 0;	// float x, y, z;
PointAttributeNames.COLOR_PACKED		= 1;	// byte r, g, b, a; 	I = [0,1]
PointAttributeNames.COLOR_FLOATS_1		= 2;	// float r, g, b; 		I = [0,1]
PointAttributeNames.COLOR_FLOATS_255	= 3;	// float r, g, b; 		I = [0,255]
PointAttributeNames.NORMAL_FLOATS		= 4;  	// float x, y, z;
PointAttributeNames.FILLER				= 5;
/**
 * Some types of possible point attribute data formats
 * 
 * @class
 */
var PointAttributeTypes = {
	DATA_TYPE_DOUBLE	: {ordinal : 0, size: 8},
	DATA_TYPE_FLOAT		: {ordinal : 1, size: 4},
	DATA_TYPE_INT8		: {ordinal : 2, size: 1},
	DATA_TYPE_UINT8		: {ordinal : 3, size: 1},
	DATA_TYPE_INT16		: {ordinal : 4, size: 2},
	DATA_TYPE_UINT16	: {ordinal : 5, size: 2},
	DATA_TYPE_INT32		: {ordinal : 6, size: 4},
	DATA_TYPE_UINT32	: {ordinal : 7, size: 4},
	DATA_TYPE_INT64		: {ordinal : 8, size: 8},
	DATA_TYPE_UINT64	: {ordinal : 9, size: 8}
};

var i = 0;
for(var obj in PointAttributeTypes){
	PointAttributeTypes[i] = PointAttributeTypes[obj];
	i++;
}

/**
 * A single point attribute such as color/normal/.. and its data format/number of elements/... 
 * 
 * @class
 * @param name 
 * @param type
 * @param size
 * @returns
 */
function PointAttribute(name, type, numElements){
	this.name = name;
	this.type = type; 
	this.numElements = numElements;
	this.byteSize = this.numElements * this.type.size;
}

PointAttribute.POSITION_CARTESIAN = new PointAttribute(
		PointAttributeNames.POSITION_CARTESIAN,
		PointAttributeTypes.DATA_TYPE_FLOAT, 3);

PointAttribute.RGBA_PACKED = new PointAttribute(
		PointAttributeNames.COLOR_PACKED,
		PointAttributeTypes.DATA_TYPE_INT8, 4);

PointAttribute.COLOR_PACKED = PointAttribute.RGBA_PACKED;

PointAttribute.RGB_PACKED = new PointAttribute(
		PointAttributeNames.COLOR_PACKED,
		PointAttributeTypes.DATA_TYPE_INT8, 3);

PointAttribute.NORMAL_FLOATS = new PointAttribute(
		PointAttributeNames.NORMAL_FLOATS,
		PointAttributeTypes.DATA_TYPE_FLOAT, 3);

PointAttribute.FILLER_1B = new PointAttribute(
		PointAttributeNames.FILLER,
		PointAttributeTypes.DATA_TYPE_UINT8, 1);

/**
 * Ordered list of PointAttributes used to identify how points are aligned in a buffer.
 * 
 * @class
 * 
 */
function PointAttributes(pointAttributes){
	this.attributes = new Array();
	this.byteSize = 0;
	this.size = 0;
	
	if(pointAttributes != null){
		// does not work in chrome v24
//		for(var pointAttribute of pointAttributes){
//			this.attributes.push(pointAttribute);
//			this.byteSize += pointAttribute.byteSize;
//			this.size++;
//		}
		
		for(var name in pointAttributes){
			var pointAttribute = pointAttributes[name];
			this.attributes.push(pointAttribute);
			this.byteSize += pointAttribute.byteSize;
			this.size++;
		}
	}
}

PointAttributes.prototype.add = function(pointAttribute){
	this.attributes.push(pointAttribute);
	this.byteSize += pointAttribute.byteSize;
	this.size++;
};

PointAttributes.prototype.hasColors = function(){
	for(var name in this.attributes){
		var pointAttribute = this.attributes[name];
		if(pointAttribute.name === PointAttributeNames.COLOR_PACKED){
			return true;
		}
	}
	
	return false;
};

PointAttributes.prototype.hasNormals = function(){
	for(var name in this.attributes){
		var pointAttribute = this.attributes[name];
		if(pointAttribute === PointAttribute.NORMAL_FLOATS){
			return true;
		}
	}
	
	return false;
};




function LasLazLoader(){

}

LasLazLoader.load = function(file, handler){		
	var xhr = new XMLHttpRequest();
	xhr.open('GET', file, true);
	xhr.responseType = 'arraybuffer';
	xhr.overrideMimeType('text/plain; charset=x-user-defined');
	xhr.onreadystatechange = function() {
		if (xhr.readyState === 4) {
			if (xhr.status === 200) {
				var buffer = xhr.response;
				LasLazLoader.loadData(buffer, handler);
			} else {
				console.log('Failed to load file! HTTP status: ' + xhr.status + ", file: " + file);
			}
		}
	};
	
	xhr.send(null);
}

LasLazLoader.progressCB = function(arg){

};

LasLazLoader.loadData = function loadData(buffer, handler){
	var lf = new LASFile(buffer);
	
	return Promise.resolve(lf).cancellable().then(function(lf) {
		return lf.open().then(function() {
			lf.isOpen = true;
			return lf;
		})
		.catch(Promise.CancellationError, function(e) {
			// open message was sent at this point, but then handler was not called
			// because the operation was cancelled, explicitly close the file
			return lf.close().then(function() {
				throw e;
			});
		});
	}).then(function(lf) {
		return lf.getHeader().then(function(h) {
			return [lf, h];
		});
	}).then(function(v) {
		var lf = v[0];
		var header = v[1];
		
		var skip = 1;
		var totalRead = 0;
		var totalToRead = (skip <= 1 ? header.pointsCount : header.pointsCount / skip);
		var reader = function() {
			var p = lf.readData(1000000, 0, skip);
			return p.then(function(data) {
				handler.push(new LASDecoder(data.buffer,
												   header.pointsFormatId,
												   header.pointsStructSize,
												   data.count,
												   header.scale,
												   header.offset,
												   header.mins, header.maxs));

				totalRead += data.count;
				LasLazLoader.progressCB(totalRead / totalToRead);

				if (data.hasMoreData)
					return reader();
				else {

					header.totalRead = totalRead;
					header.versionAsString = lf.versionAsString;
					header.isCompressed = lf.isCompressed;
					return [lf, header, handler];
				}
			});
		};
		
		return reader();
	}).then(function(v) {
		var lf = v[0];
		// we're done loading this file
		//
		LasLazLoader.progressCB(1);

		// Close it
		return lf.close().then(function() {
			lf.isOpen = false;
			// Delay this a bit so that the user sees 100% completion
			//
			return Promise.delay(200).cancellable();
		}).then(function() {
			// trim off the first element (our LASFile which we don't really want to pass to the user)
			//
			return v.slice(1);
		});
	}).catch(Promise.CancellationError, function(e) {
		// If there was a cancellation, make sure the file is closed, if the file is open
		// close and then fail
		if (lf.isOpen) 
			return lf.close().then(function() {
				lf.isOpen = false;
				throw e;
			});
		throw e;
	});
}

Potree.PointCloudRGBMaterial = function(parameters){
	parameters = parameters || {};
	
	var attributes = {};
	var uniforms = {
		color:   { type: "c", value: new THREE.Color( 0xffffff ) },
		size:   { type: "f", value: 10 }
	};
	
	var pointSize = parameters.size || 1.0;
	
	this.setValues({
		uniforms: uniforms,
		attributes: attributes,
		vertexShader: Potree.PointCloudRGBMaterial.vs_points.join("\n"),
		fragmentShader: Potree.PointCloudRGBMaterial.fs_points_rgb.join("\n"),
		vertexColors: THREE.VertexColors,
		size: pointSize,
		alphaTest: 0.9,
	});
};

Potree.PointCloudRGBMaterial.prototype = new THREE.ShaderMaterial();

Object.defineProperty(Potree.PointCloudRGBMaterial.prototype, "size", {
	get: function(){
		return this.uniforms.size.value;
	},
	set: function(value){
		this.uniforms.size.value = value;
	}
});

Potree.PointCloudRGBMaterial.vs_points = [
 "uniform float size;                                          ",
 "varying vec3 vColor;                                         ",
 "                                                             ",
 "void main() {                                                ",
 "	vColor = color;                                            ",
 "	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 ); ",
 "                                                             ",
 "	gl_PointSize = size * ( 300.0 / length( mvPosition.xyz ) );      ",
 "	gl_PointSize = max(2.0, gl_PointSize);      ",
 "	gl_Position = projectionMatrix * mvPosition;               ",
 "}                                                            "];

Potree.PointCloudRGBMaterial.fs_points_rgb = [
 "varying vec3 vColor;                                         ",
 "                                                             ",
 "void main() {                                                ",
 "	                                                           ",
 "	//float a = pow(2.0*(gl_PointCoord.x - 0.5), 2.0);           ",
 "	//float b = pow(2.0*(gl_PointCoord.y - 0.5), 2.0);           ",
 "	//float c = 1.0 - (a + b);                                   ",
 "  //                                                           ",
 "	//if(c < 0.0){                                               ",
 "	//	discard;                                               ",
 "	//}                                                          ",
 "	                                                           ",
 "	gl_FragColor = vec4(vColor, 1.0);                          ",
 "}                                                            "];
















Potree.PointCloudRGBInterpolationMaterial = function(parameters){
	parameters = parameters || {};
	
	var attributes = {};
	var uniforms = {
		color:   { type: "c", value: new THREE.Color( 0xffffff ) },
		size:   { type: "f", value: 10 },
		blendDepth:   { type: "f", value: 0.01 }
	};
	
	var pointSize = parameters.size || 1.0;
	
	var vs;
	var fs;
	var frag_depth_ext = renderer.context.getExtension('EXT_frag_depth');
	if(!frag_depth_ext){
		vs = Potree.PointCloudRGBMaterial.vs_points.join("\n");
		fs = Potree.PointCloudRGBMaterial.fs_points_rgb.join("\n");
	}else{
		vs = Potree.PointCloudRGBInterpolationMaterial.vs_points.join("\n");
		fs = Potree.PointCloudRGBInterpolationMaterial.fs_points_rgb.join("\n");
	}
	
	this.setValues({
		uniforms: uniforms,
		attributes: attributes,
		vertexShader: vs,
		fragmentShader: fs,
		vertexColors: THREE.VertexColors,
		size: pointSize,
		alphaTest: 0.9,
	});
};

Potree.PointCloudRGBInterpolationMaterial.prototype = new THREE.ShaderMaterial();

Object.defineProperty(Potree.PointCloudRGBInterpolationMaterial.prototype, "size", {
	get: function(){
		return this.uniforms.size.value;
	},
	set: function(value){
		this.uniforms.size.value = value;
	}
});

Object.defineProperty(Potree.PointCloudRGBInterpolationMaterial.prototype, "blendDepth", {
	get: function(){
		return this.uniforms.blendDepth.value;
	},
	set: function(value){
		this.uniforms.blendDepth.value = value;
	}
});

Potree.PointCloudRGBInterpolationMaterial.vs_points = [
 "                                         ",
 "                                         ",
 "                                         ",
 "uniform float size;                                          ",
 "varying vec3 vColor;                                         ",
 "                                                             ",
 "void main() {                                                ",
 "	vColor = color;                                            ",
 "	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 ); ",
 "                                                             ",
 "	gl_PointSize = size * ( 300.0 / length( mvPosition.xyz ) );      ",
 "	gl_PointSize = max(2.0, gl_PointSize);      ",
 "	gl_Position = projectionMatrix * mvPosition;               ",
 "}                                                            "];

Potree.PointCloudRGBInterpolationMaterial.fs_points_rgb = [
 "#extension GL_EXT_frag_depth : enable                                         ",
 "varying vec3 vColor;                                         ",
 "uniform float blendDepth;                                    ",
 "                                                             ",
 "                                                             ",
 "void main() {                                                ",
 "	                                                           ",
 "	float a = pow(2.0*(gl_PointCoord.x - 0.5), 2.0);           ",
 "	float b = pow(2.0*(gl_PointCoord.y - 0.5), 2.0);           ",
 "	float c = 1.0 - (a + b);                                   ",
 "                                                             ",
 "	if(c < 0.0){                                               ",
 "		discard;                                               ",
 "	}                                                          ",
 "	                                                           ",
 "	gl_FragColor = vec4(vColor, 1.0);                          ",
 "  gl_FragDepthEXT = gl_FragCoord.z + blendDepth*(1.0-pow(c, 1.0)) * gl_FragCoord.w ;                                                            ",
 "}                                                            "];
















Potree.PointCloudIntensityMaterial = function(parameters){
	parameters = parameters || {};
	
	var size = parameters.size || 1.0;
	this.min = parameters.min || 0;
	this.max = parameters.max || 1;

	var attributes = {
		intensity:   { type: "f", value: [] }
	};
	var uniforms = {
		color:   { type: "c", value: new THREE.Color( 0xffffff ) },
		size:   { type: "f", value: 1 },
		uMin:	{ type: "f", value: this.min },
		uMax:	{ type: "f", value: this.max }
	};	
	
	this.setValues({
		uniforms: uniforms,
		attributes: attributes,
		vertexShader: Potree.PointCloudIntensityMaterial.vs_points.join("\n"),
		fragmentShader: Potree.PointCloudIntensityMaterial.fs_points_rgb.join("\n"),
		vertexColors: THREE.VertexColors,
		size: size,
		alphaTest: 0.9
	});
};

Potree.PointCloudIntensityMaterial.prototype = new THREE.ShaderMaterial();

Object.defineProperty(Potree.PointCloudIntensityMaterial.prototype, "size", {
	get: function(){
		return this.uniforms.size.value;
	},
	set: function(value){
		this.uniforms.size.value = value;
	}
});

Potree.PointCloudIntensityMaterial.vs_points = [
 "attribute float intensity;                                          ",
 "uniform float size;                                          ",
 "uniform float uMin;                                          ",
 "uniform float uMax;                                          ",
 "varying vec3 vColor;                                         ",
 "                                                             ",
 "void main() {                                                ",
 "	vColor = vec3(1.0, 1.0, 1.0) * (intensity -uMin) / uMax;                                            ",
 "	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 ); ",
 "                                                             ",
 "	//gl_PointSize = size * 1.0 / length( mvPosition.xyz );      ",
 "	gl_PointSize = size * ( 300.0 / length( mvPosition.xyz ) );      ",
 "	gl_PointSize = max(2.0, gl_PointSize);      ",
 "	gl_Position = projectionMatrix * mvPosition;               ",
 "}                                                            "];

Potree.PointCloudIntensityMaterial.fs_points_rgb = [
 "varying vec3 vColor;                                         ",
 "                                                             ",
 "void main() {                                                ",
 "	                                                           ",
 "	//float a = pow(2.0*(gl_PointCoord.x - 0.5), 2.0);           ",
 "	//float b = pow(2.0*(gl_PointCoord.y - 0.5), 2.0);           ",
 "	//float c = 1.0 - (a + b);                                   ",
 "  //                                                           ",
 "	//if(c < 0.0){                                               ",
 "	//	discard;                                               ",
 "	//}                                                          ",
 "	                                                           ",
 "	gl_FragColor = vec4(vColor, 1.0);                          ",
 "}                                                            "];
















Potree.PointCloudHeightMaterial = function(parameters){
	parameters = parameters || {};
	
	var size = parameters.size || 1.0;
	this.min = parameters.min || 0;
	this.max = parameters.max || 1;
	
	var gradientTexture = Potree.PointCloudHeightMaterial.generateGradient();

	var attributes = {};
	var uniforms = {
		uCol:   { type: "c", value: new THREE.Color( 0xffffff ) },
		size:   { type: "f", value: 1 },
		uMin:	{ type: "f", value: this.min },
		uMax:	{ type: "f", value: this.max },
		gradient: {type: "t", value: gradientTexture}
	};
	
	this.setValues({
		uniforms: uniforms,
		attributes: attributes,
		vertexShader: Potree.PointCloudHeightMaterial.vs_points.join("\n"),
		fragmentShader: Potree.PointCloudHeightMaterial.fs_points_rgb.join("\n"),
		vertexColors: THREE.VertexColors,
		size: size,
		alphaTest: 0.9,
	});
};


Potree.PointCloudHeightMaterial.generateGradient = function() {
	var size = 64;

	// create canvas
	canvas = document.createElement( 'canvas' );
	canvas.width = size;
	canvas.height = size;

	// get context
	var context = canvas.getContext( '2d' );

	// draw gradient
	context.rect( 0, 0, size, size );
	var gradient = context.createLinearGradient( 0, 0, size, size );
    gradient.addColorStop(0, 'blue');
    gradient.addColorStop(1/5, 'aqua');
    gradient.addColorStop(2/5, 'green')
    gradient.addColorStop(3/5, 'yellow');
    gradient.addColorStop(4/5, 'orange');
	gradient.addColorStop(1, 'red');
 
    
	context.fillStyle = gradient;
	context.fill();
	
	var texture = new THREE.Texture( canvas );
	texture.needsUpdate = true;
	textureImage = texture.image;

	return texture;
}

Potree.PointCloudHeightMaterial.prototype = new THREE.ShaderMaterial();

Object.defineProperty(Potree.PointCloudHeightMaterial.prototype, "size", {
	get: function(){
		return this.uniforms.size.value;
	},
	set: function(value){
		this.uniforms.size.value = value;
	}
});

Potree.PointCloudHeightMaterial.prototype.setBoundingBox = function(boundingBox){
	this.min = boundingBox.min.y;
	this.max = boundingBox.max.y;
	
	this.uniforms.uMin.value = this.min;
	this.uniforms.uMax.value = this.max;
}

Potree.PointCloudHeightMaterial.vs_points = [
 "uniform float size;                                          ",
 "uniform float uMin;                                          ",
 "uniform float uMax;                                          ",
 "uniform sampler2D gradient;                                          ",
 "                                                             ",
 "varying vec3 vColor;                                         ",
 "                                                             ",
 "void main() {                                                ",
 "	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 ); ",
 "	vec4 world = modelMatrix * vec4( position, 1.0 ); ",
 "	float w = (world.y - uMin) / (uMax-uMin);            ",
 "                                                             ",
 "  vec4 gCol = texture2D(gradient, vec2(w,1.0-w));                                                           ",
 "  vColor = gCol.rgb;                                                           ",
 "                                                             ",
 "                                                             ",
 "	gl_PointSize = size * ( 300.0 / length( mvPosition.xyz ) );      ",
 "	gl_PointSize = max(2.0, gl_PointSize);      ",
 "	gl_Position = projectionMatrix * mvPosition;               ",
 "}                                                            "];

Potree.PointCloudHeightMaterial.fs_points_rgb = [
 "varying vec3 vColor;                                         ",
 "                                                             ",
 "void main() {                                                ",
 "	                                                           ",
 "	//float a = pow(2.0*(gl_PointCoord.x - 0.5), 2.0);           ",
 "	//float b = pow(2.0*(gl_PointCoord.y - 0.5), 2.0);           ",
 "	//float c = 1.0 - (a + b);                                   ",
 "  //                                                           ",
 "	//if(c < 0.0){                                               ",
 "	//	discard;                                               ",
 "	//}                                                          ",
 "	                                                           ",
 "	gl_FragColor = vec4(vColor, 1.0);                          ",
 "}                                                            "];
















Potree.PointCloudColorMaterial = function(parameters){
	parameters = parameters || {};

	var color = parameters.color || new THREE.Color().setRGB(1, 0, 0);
	var size = parameters.size || 1.0;
	
	var attributes = {};
	var uniforms = {
		uCol:   { type: "c", value: color },
		size:   { type: "f", value: 1 }
	};
	
	this.setValues({
		uniforms: uniforms,
		attributes: attributes,
		vertexShader: Potree.PointCloudColorMaterial.vs_points.join("\n"),
		fragmentShader: Potree.PointCloudColorMaterial.fs_points_rgb.join("\n"),
		vertexColors: THREE.VertexColors,
		size: size,
		alphaTest: 0.9,
	});
};

Potree.PointCloudColorMaterial.prototype = new THREE.ShaderMaterial();

Object.defineProperty(Potree.PointCloudColorMaterial.prototype, "size", {
	get: function(){
		return this.uniforms.size.value;
	},
	set: function(value){
		this.uniforms.size.value = value;
	}
});

Object.defineProperty(Potree.PointCloudColorMaterial.prototype, "color", {
	get: function(){
		return this.uniforms.uCol.value;
	},
	set: function(value){
		this.uniforms.uCol.value.copy(value);
	}
});

Potree.PointCloudColorMaterial.vs_points = [
 "uniform float size;                                          ",
 "uniform vec3 uCol;                                           ",
 "varying vec3 vColor;                                         ",
 "                                                             ",
 "void main() {                                                ",
 "	vColor = uCol;                                             ",
 "	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 ); ",
 "                                                             ",
 "	gl_PointSize = size * ( 300.0 / length( mvPosition.xyz ) );      ",
 "	gl_PointSize = max(2.0, gl_PointSize);      ",
 "	gl_Position = projectionMatrix * mvPosition;               ",
 "}                                                            "];

Potree.PointCloudColorMaterial.fs_points_rgb = [
 "varying vec3 vColor;                                         ",
 "                                                             ",
 "void main() {                                                ",
 "	                                                           ",
 "	//float a = pow(2.0*(gl_PointCoord.x - 0.5), 2.0);           ",
 "	//float b = pow(2.0*(gl_PointCoord.y - 0.5), 2.0);           ",
 "	//float c = 1.0 - (a + b);                                   ",
 "  //                                                           ",
 "	//if(c < 0.0){                                               ",
 "	//	discard;                                               ",
 "	//}                                                          ",
 "	                                                           ",
 "	gl_FragColor = vec4(vColor, 1.0);                          ",
 "}                                                            "];

















/**
 * @author mschuetz / http://mschuetz.at
 *
 * adapted from THREE.OrbitControls by 
 *
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 *
 * This set of controls performs first person navigation without mouse lock.
 * Instead, rotating the camera is done by dragging with the left mouse button.
 *
 * move: a/s/d/w or up/down/left/right
 * rotate: left mouse
 * pan: right mouse
 * change speed: mouse wheel
 *
 *
 */



THREE.FirstPersonControls = function ( object, domElement ) {
	this.object = object;
	this.domElement = ( domElement !== undefined ) ? domElement : document;
	
	// Set to false to disable this control
	this.enabled = true;

	this.rotateSpeed = 1.0;
	this.moveSpeed = 10.0;

	this.keys = { 
		LEFT: 37, 
		UP: 38, 
		RIGHT: 39, 
		BOTTOM: 40,
		A: 'A'.charCodeAt(0),
		S: 'S'.charCodeAt(0),
		D: 'D'.charCodeAt(0),
		W: 'W'.charCodeAt(0)
	};

	var scope = this;

	var rotateStart = new THREE.Vector2();
	var rotateEnd = new THREE.Vector2();
	var rotateDelta = new THREE.Vector2();

	var panStart = new THREE.Vector2();
	var panEnd = new THREE.Vector2();
	var panDelta = new THREE.Vector2();
	var panOffset = new THREE.Vector3();

	var offset = new THREE.Vector3();

	var phiDelta = 0;
	var thetaDelta = 0;
	var scale = 1;
	var pan = new THREE.Vector3();

	var lastPosition = new THREE.Vector3();

	var STATE = { NONE : -1, ROTATE : 0, SPEEDCHANGE : 1, PAN : 2 };

	var state = STATE.NONE;

	// for reset
	this.position0 = this.object.position.clone();

	// events

	var changeEvent = { type: 'change' };
	var startEvent = { type: 'start'};
	var endEvent = { type: 'end'};

	this.rotateLeft = function ( angle ) {
		thetaDelta -= angle;
	};

	this.rotateUp = function ( angle ) {
		phiDelta -= angle;
	};

	// pass in distance in world space to move left
	this.panLeft = function ( distance ) {

		var te = this.object.matrix.elements;

		// get X column of matrix
		panOffset.set( te[ 0 ], te[ 1 ], te[ 2 ] );
		panOffset.multiplyScalar( - distance );
		
		pan.add( panOffset );

	};

	// pass in distance in world space to move up
	this.panUp = function ( distance ) {

		var te = this.object.matrix.elements;

		// get Y column of matrix
		panOffset.set( te[ 4 ], te[ 5 ], te[ 6 ] );
		panOffset.multiplyScalar( distance );
		
		pan.add( panOffset );

	};
	
	// pass in distance in world space to move forward
	this.panForward = function ( distance ) {

		var te = this.object.matrix.elements;

		// get Y column of matrix
		panOffset.set( te[ 8 ], te[ 9 ], te[ 10 ] );
		panOffset.multiplyScalar( distance );
		
		pan.add( panOffset );

	};
	
	this.pan = function ( deltaX, deltaY ) {

		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

		if ( scope.object.fov !== undefined ) {
			// perspective
			var position = scope.object.position;
			var offset = position.clone();
			var targetDistance = offset.length();

			// half of the fov is center to top of screen
			targetDistance *= Math.tan( ( scope.object.fov / 2 ) * Math.PI / 180.0 );

			// we actually don't use screenWidth, since perspective camera is fixed to screen height
			scope.panLeft( 2 * deltaX * targetDistance / element.clientHeight );
			scope.panUp( 2 * deltaY * targetDistance / element.clientHeight );
		} else if ( scope.object.top !== undefined ) {

			// orthographic
			scope.panLeft( deltaX * (scope.object.right - scope.object.left) / element.clientWidth );
			scope.panUp( deltaY * (scope.object.top - scope.object.bottom) / element.clientHeight );
		} else {

			// camera neither orthographic or perspective
			console.warn( 'WARNING: FirstPersonControls.js encountered an unknown camera type - pan disabled.' );
		}
	};

	this.update = function (delta) {
		var position = this.object.position;
		
		if(delta !== undefined){
			if(this.moveRight){
				this.panLeft(-delta * this.moveSpeed);
			}
			if(this.moveLeft){
				this.panLeft(delta * this.moveSpeed);
			}
			if(this.moveForward){
				this.panForward(-delta * this.moveSpeed);
			}
			if(this.moveBackward){
				this.panForward(delta * this.moveSpeed);
			}
		}
		
		if(!pan.equals(new THREE.Vector3(0,0,0))){
			var event = {
				type: 'move',
				translation: pan.clone()
			};
			this.dispatchEvent(event);
		}
		
		position.add(pan);
		
		this.object.updateMatrix();
		var rot = new THREE.Matrix4().makeRotationY(thetaDelta);
		var res = new THREE.Matrix4().multiplyMatrices(rot, this.object.matrix);
		this.object.quaternion.setFromRotationMatrix(res);
		
		this.object.rotation.x += phiDelta;

		thetaDelta = 0;
		phiDelta = 0;
		scale = 1;
		pan.set( 0, 0, 0 );

		if ( lastPosition.distanceTo( this.object.position ) > 0 ) {
			this.dispatchEvent( changeEvent );

			lastPosition.copy( this.object.position );
		}
	};


	this.reset = function () {
		state = STATE.NONE;

		this.object.position.copy( this.position0 );
	};

	function onMouseDown( event ) {
		if ( scope.enabled === false ) return;
		event.preventDefault();

		if ( event.button === 0 ) {
			state = STATE.ROTATE;

			rotateStart.set( event.clientX, event.clientY );
		} else if ( event.button === 2 ) {
			state = STATE.PAN;

			panStart.set( event.clientX, event.clientY );
		}

		scope.domElement.addEventListener( 'mousemove', onMouseMove, false );
		scope.domElement.addEventListener( 'mouseup', onMouseUp, false );
		scope.dispatchEvent( startEvent );
	}

	function onMouseMove( event ) {
		if ( scope.enabled === false ) return;

		event.preventDefault();

		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

		if ( state === STATE.ROTATE ) {
			rotateEnd.set( event.clientX, event.clientY );
			rotateDelta.subVectors( rotateEnd, rotateStart );

			// rotating across whole screen goes 360 degrees around
			scope.rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed );

			// rotating up and down along whole screen attempts to go 360, but limited to 180
			scope.rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed );

			rotateStart.copy( rotateEnd );

		} else if ( state === STATE.PAN ) {
			panEnd.set( event.clientX, event.clientY );
			panDelta.subVectors( panEnd, panStart );
			//panDelta.multiplyScalar(this.moveSpeed).multiplyScalar(0.0001);
			panDelta.multiplyScalar(0.0005).multiplyScalar(scope.moveSpeed);
			
			scope.pan( panDelta.x, panDelta.y );

			panStart.copy( panEnd );
		}
	}

	function onMouseUp() {
		if ( scope.enabled === false ) return;

		scope.domElement.removeEventListener( 'mousemove', onMouseMove, false );
		scope.domElement.removeEventListener( 'mouseup', onMouseUp, false );
		scope.dispatchEvent( endEvent );
		state = STATE.NONE;

	}

	function onMouseWheel(event) {
		if ( scope.enabled === false || scope.noZoom === true ) return;

		event.preventDefault();

		var delta = 0;
		if ( event.wheelDelta !== undefined ) { // WebKit / Opera / Explorer 9
			delta = event.wheelDelta;
		} else if ( event.detail !== undefined ) { // Firefox
			delta = - event.detail;
		}

		scope.moveSpeed += scope.moveSpeed * 0.001 * delta;
		scope.moveSpeed = Math.max(0.1, scope.moveSpeed);

		scope.dispatchEvent( startEvent );
		scope.dispatchEvent( endEvent );
	}

	function onKeyDown( event ) {
		if ( scope.enabled === false) return;
		
		switch ( event.keyCode ) {
			case scope.keys.UP: scope.moveForward = true; break;
			case scope.keys.BOTTOM: scope.moveBackward = true; break;
			case scope.keys.LEFT: scope.moveLeft = true; break;
			case scope.keys.RIGHT: scope.moveRight = true; break;
			case scope.keys.W: scope.moveForward = true; break;
			case scope.keys.S: scope.moveBackward = true; break;
			case scope.keys.A: scope.moveLeft = true; break;
			case scope.keys.D: scope.moveRight = true; break;			
		}
	}
	
	function onKeyUp( event ) {
		switch ( event.keyCode ) {
			case scope.keys.W: scope.moveForward = false; break;
			case scope.keys.S: scope.moveBackward = false; break;
			case scope.keys.A: scope.moveLeft = false; break;
			case scope.keys.D: scope.moveRight = false; break;
			case scope.keys.UP: scope.moveForward = false; break;
			case scope.keys.BOTTOM: scope.moveBackward = false; break;
			case scope.keys.LEFT: scope.moveLeft = false; break;
			case scope.keys.RIGHT: scope.moveRight = false; break;
		}
	}

	this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
	this.domElement.addEventListener( 'mousedown', onMouseDown, false );
	this.domElement.addEventListener( 'mousewheel', onMouseWheel, false );
	this.domElement.addEventListener( 'DOMMouseScroll', onMouseWheel, false ); // firefox

	window.addEventListener( 'keydown', onKeyDown, false );
	window.addEventListener( 'keyup', onKeyUp, false );

};

THREE.FirstPersonControls.prototype = Object.create( THREE.EventDispatcher.prototype );


/**
 * 
 * @param node
 * @class an item in the lru list. 
 */
function LRUItem(node){
	this.previous = null;
	this.next = null;
	this.node = node;
}

/**
 * 
 * @class A doubly-linked-list of the least recently used elements.
 */
function LRU(){
	// the least recently used item
	this.first = null;
	// the most recently used item
	this.last = null;
	// a list of all items in the lru list
	this.items = {};
	this.elements = 0;
	this.numPoints = 0;
}

/**
 * number of elements in the list
 * 
 * @returns {Number}
 */
LRU.prototype.size = function(){
	return this.elements;
};

LRU.prototype.contains = function(node){
	return this.items[node.id] == null;
};

/**
 * makes node the most recently used item. if the list does not contain node, it will be added.
 * 
 * @param node
 */
LRU.prototype.touch = function(node){
	var item;
	if(this.items[node.id] == null){
		// add to list
		item = new LRUItem(node);
		item.previous = this.last;
		this.last = item;
		if(item.previous !== null){
			item.previous.next = item;
		}
		
		this.items[node.id] = item;
		this.elements++;
		
		if(this.first === null){
			this.first = item;
		}
		this.numPoints += node.numPoints;
	}else{
		// update in list
		item = this.items[node.id];
		if(item.previous === null){
			// handle touch on first element
			if(item.next !== null){
				this.first = item.next;
				this.first.previous = null;
				item.previous = this.last;
				item.next = null;
				this.last = item;
				item.previous.next = item;
			}
		}else if(item.next === null){
			// handle touch on last element
		}else{
			// handle touch on any other element
			item.previous.next = item.next;
			item.next.previous = item.previous;
			item.previous = this.last;
			item.next = null;
			this.last = item;
			item.previous.next = item;
		}
		
		
	}
};

/**
 * removes the least recently used item from the list and returns it. 
 * if the list was empty, null will be returned.
 */
LRU.prototype.remove = function remove(){
	if(this.first === null){
		return null;
	}
	var lru = this.first;

	// if the lru list contains at least 2 items, the item after the least recently used elemnt will be the new lru item. 
	if(lru.next !== null){
		this.first = lru.next;
		this.first.previous = null;
	}else{
		this.first = null;
		this.last = null;
	}
	
	delete this.items[lru.node.id];
	this.elements--;
	this.numPoints -= lru.node.numPoints;
	
//	Logger.info("removed node: " + lru.node.id);
	return lru.node;
};

LRU.prototype.getLRUItem = function(){
	if(this.first === null){
		return null;
	}
	var lru = this.first;
	
	return lru.node;
};

LRU.prototype.toString = function(){
	var string = "{ ";
	var curr = this.first;
	while(curr !== null){
		string += curr.node.id;
		if(curr.next !== null){
			string += ", ";
		}
		curr = curr.next;
	}
	string += "}";
	string += "(" + this.size() + ")";
	return string;
};



/**
 * Stands in place for invisible or unloaded octree nodes.
 * If a proxy node becomes visible and its geometry has not been loaded,
 * loading will begin.
 * If it is visible and the geometry has been loaded, the proxy node will 
 * be replaced with a point cloud node (THREE.PointCloud as of now)
 */
Potree.PointCloudOctreeProxyNode = function(geometryNode){
	THREE.Object3D.call( this );
	
	this.geometryNode = geometryNode;
	this.boundingBox = geometryNode.boundingBox;
	this.name = geometryNode.name;
	this.level = geometryNode.level;
	this.numPoints = geometryNode.numPoints;
}

Potree.PointCloudOctreeProxyNode.prototype = Object.create(THREE.Object3D.prototype);

Potree.PointCloudOctree = function(geometry, material){
	THREE.Object3D.call( this );
	
	Potree.PointCloudOctree.lru = Potree.PointCloudOctree.lru || new LRU();
	
	this.pcoGeometry = geometry;
	//this.boundingBox = this.pcoGeometry.boundingBox;
	this.boundingBox = this.pcoGeometry.root.boundingBox;
	this.material = material;
	this.maxVisibleNodes = 2000;
	this.maxVisiblePoints = 20*1000*1000;
	this.level = 0;
	
	this.LODDistance = 20;
	this.LODFalloff = 1.3;
	this.LOD = 4;
	this.showBoundingBox = false;
	this.loadQueue = [];
	
	
	var rootProxy = new Potree.PointCloudOctreeProxyNode(this.pcoGeometry.root);
	this.add(rootProxy);
}

Potree.PointCloudOctree.prototype = Object.create(THREE.Object3D.prototype);

Potree.PointCloudOctree.prototype.update = function(camera){
	this.numVisibleNodes = 0;
	this.numVisiblePoints = 0;
	this.loadQueue = [];
	
	// create frustum in object space
	camera.updateMatrixWorld();
	var frustum = new THREE.Frustum();
	var viewI = camera.matrixWorldInverse;
	var world = this.matrixWorld;
	var proj = camera.projectionMatrix;
	var fm = new THREE.Matrix4().multiply(proj).multiply(viewI).multiply(world);
	frustum.setFromMatrix( fm );
	
	// calculate camera position in object space
	var view = camera.matrixWorld;
	var worldI = new THREE.Matrix4().getInverse(world);
	var camMatrixObject = new THREE.Matrix4().multiply(worldI).multiply(view);
	var camObjPos = new THREE.Vector3().setFromMatrixPosition( camMatrixObject );
	
	var ray = new THREE.Ray(camera.position, new THREE.Vector3( 0, 0, -1 ).applyQuaternion( camera.quaternion ) );
	
	// check visibility
	var stack = [];
	stack.push(this);
	while(stack.length > 0){
		var object = stack.shift();
		
		if(object instanceof THREE.Mesh || object instanceof THREE.Line ){
			object.visible = true;
			continue;
		}
		
		var box = object.boundingBox;
		var distance = box.center().distanceTo(camObjPos);
		var radius = box.size().length() * 0.5;

		var visible = true;
		visible = visible && frustum.intersectsBox(box);
		if(object.level > 0){
			// cull detail nodes based in distance to camera
			visible = visible && Math.pow(radius, 0.8) / distance > (1 / this.LOD);
			visible = visible && (this.numVisiblePoints + object.numPoints < Potree.pointLoadLimit);
			visible = visible && (this.numVisibleNodes <= this.maxVisibleNodes);
			visible = visible && (this.numVisiblePoints <= this.maxVisiblePoints);

		}
		
		// trying to skip higher detail nodes, if parents already cover all holes
		//if(this.pcoGeometry !== undefined && this.pcoGeometry.spacing !== undefined){
		//	var spacing = this.pcoGeometry.spacing / Math.pow(2, object.level);
		//	spacing *= 10;
		//	if(spacing < this.material.size * 1.5){
		//		visible = false;
		//	}
		//}
		
		//if(object.level > 0){
		//	visible = parseInt(object.name.charAt(object.name.length-1)) == 0;
		//}
		
		object.visible = visible;
		
		if(!visible){
			this.hideDescendants(object);
			continue;
		}else if(visible && this.showBoundingBox && object instanceof THREE.PointCloud){
			if(object.boundingBoxNode === undefined && object.boundingBox !== undefined){
				var boxHelper = new THREE.BoxHelper(object);
				object.add(boxHelper);
				object.boundingBoxNode = boxHelper;
			}
		}else if(!this.showBoundingBox){
			if(object.boundingBoxNode !== undefined){
				object.remove(object.boundingBoxNode);
				object.boundingBoxNode = undefined;
			}
		}
		
		if(object instanceof THREE.PointCloud){
			this.numVisibleNodes++;
			this.numVisiblePoints += object.numPoints;
			Potree.PointCloudOctree.lru.touch(object);
			object.material = this.material;
		}else if (object instanceof Potree.PointCloudOctreeProxyNode) {
			var geometryNode = object.geometryNode;
			if(geometryNode.loaded === true){
				this.replaceProxy(object);
			}else{
				this.loadQueue.push({node: object, lod: Math.pow(radius, 0.8) / distance});
			}
		}
		
		for(var i = 0; i < object.children.length; i++){
			stack.push(object.children[i]);
		}
		
		//console.log(object.name);
	}
	
	if(this.loadQueue.length > 0){
		if(this.loadQueue.length >= 2){
			this.loadQueue.sort(function(a,b){return b.lod - a.lod});
		}
		
		for(var i = 0; i < Math.min(5, this.loadQueue.length); i++){
			this.loadQueue[i].node.geometryNode.load();
		}
	}
}


Potree.PointCloudOctree.prototype.replaceProxy = function(proxy){
	
	var geometryNode = proxy.geometryNode;
	if(geometryNode.loaded === true){
		var geometry = geometryNode.geometry;
		var node = new THREE.PointCloud(geometry, this.material);
		node.name = proxy.name;
		node.level = proxy.level;
		node.numPoints = proxy.numPoints;
		node.boundingBox = geometry.boundingBox;
		node.pcoGeometry = geometryNode;
		var parent = proxy.parent;
		parent.remove(proxy);
		parent.add(node);
		
		for(var i = 0; i < 8; i++){
			if(geometryNode.children[i] !== undefined){
				var child = geometryNode.children[i];
				var childProxy = new Potree.PointCloudOctreeProxyNode(child);
				node.add(childProxy);
			}
		}
	}
}

Potree.PointCloudOctree.prototype.hideDescendants = function(object){
	var stack = [];
	for(var i = 0; i < object.children.length; i++){
		var child = object.children[i];
		if(child.visible){
			stack.push(child);
		}
	}
	
	while(stack.length > 0){
		var object = stack.shift();
		
		object.visible = false;
		
		for(var i = 0; i < object.children.length; i++){
			var child = object.children[i];
			if(child.visible){
				stack.push(child);
			}
		}
	}
}

Potree.PointCloudOctree.prototype.moveToOrigin = function(){
    this.position.set(0,0,0);
    this.updateMatrixWorld();
    var box = this.boundingBox;
    var transform = this.matrixWorld;
    var tBox = Potree.utils.computeTransformedBoundingBox(box, transform);
    this.position.set(0,0,0).sub(tBox.center());
}

Potree.PointCloudOctree.prototype.moveToGroundPlane = function(){
    this.updateMatrixWorld();
    var box = this.boundingBox;
    var transform = this.matrixWorld;
    var tBox = Potree.utils.computeTransformedBoundingBox(box, transform);
    this.position.y += -tBox.min.y;
}

Potree.PointCloudOctree.prototype.getBoundingBoxWorld = function(){
	this.updateMatrixWorld();
    var box = this.boundingBox;
    var transform = this.matrixWorld;
    var tBox = Potree.utils.computeTransformedBoundingBox(box, transform);
	
	return tBox;
}

Potree.PointCloudOctree.prototype.getProfile = function(start, end, width, depth){
	var stack = [];
	stack.push(this);
	
	var side = new THREE.Vector3().subVectors(end, start).normalize();
	var up = new THREE.Vector3(0, 1, 0);
	var forward = new THREE.Vector3().crossVectors(side, up).normalize();
	var N = forward;
	var cutPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(N, start);
	
	var inside = [];
	
	
	while(stack.length > 0){
		var object = stack.shift();
		
		console.log("traversing: " + object.name);
		
		if(object instanceof THREE.PointCloud){
			var geometry = object.geometry;
			var positions = geometry.attributes.position;
			var p = positions.array;
			var pointCount = positions.length / positions.itemSize;
			
			for(var i = 0; i < pointCount; i++){
				var pos = new THREE.Vector3(p[3*i], p[3*i+1], p[3*i+2]);
				pos.applyMatrix4(this.matrixWorld);
				var distance = Math.abs(cutPlane.distanceToPoint(pos));
				
				if(distance < width/2){
					inside.push(pos);
				}
			}
		}
		
		if(object == this || object.level < depth){
			for(var i = 0; i < object.children.length; i++){
				stack.push(object.children[i]);
			}
		}
	}
	
	console.log("points inside: " + inside.length);
	
	return inside;
}

/**
 *
 * amount: minimum number of points to remove
 */
Potree.PointCloudOctree.disposeLeastRecentlyUsed = function(amount){
	
	
	var freed = 0;
	do{
		var node = this.lru.first.node;
		var parent = node.parent;
		var geometry = node.geometry;
		var pcoGeometry = node.pcoGeometry;
		var proxy = new Potree.PointCloudOctreeProxyNode(pcoGeometry);
	
		var result = Potree.PointCloudOctree.disposeNode(node);
		freed += result.freed;
		
		parent.add(proxy);
		
		if(result.numDeletedNodes == 0){
			break;
		}
	}while(freed < amount);
}

Potree.PointCloudOctree.disposeNode = function(node){
	
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
			Potree.PointCloudOctree.lru.remove(descendant);
			numDeletedNodes++;
		}
	}
	
	Potree.PointCloudOctree.lru.remove(node);
	node.parent.remove(node);
	
	return {
		"freed": freed,
		"numDeletedNodes": numDeletedNodes
	};
}

var nodesLoadTimes = {};

Potree.PointCloudOctreeGeometry = function(){
	Potree.PointCloudOctree.lru = Potree.PointCloudOctree.lru || new LRU();

	this.url = null;
	this.octreeDir = null;
	this.spacing = 0;
	this.boundingBox = null;
	this.root = null;
	this.numNodesLoading = 0;
	this.nodes = null;
	this.pointAttributes = null;
}

Potree.PointCloudOctreeGeometryNode = function(name, pcoGeometry, boundingBox){
	this.name = name;
	this.index = parseInt(name.charAt(name.length-1));
	this.pcoGeometry = pcoGeometry;
	this.boundingBox = boundingBox;
	this.children = {};
	this.numPoints = 0;
	this.level = null;
	
}

Potree.PointCloudOctreeGeometryNode.prototype.addChild = function(child){
	this.children[child.index] = child;
	child.parent = this;
}

Potree.PointCloudOctreeGeometryNode.prototype.load = function(){
	if(this.loading === true || this.pcoGeometry.numNodesLoading > 5){
		return;
	}else{
		this.loading = true;
	}
	
	if(Potree.PointCloudOctree.lru.numPoints + this.numPoints >= Potree.pointLoadLimit){
		Potree.PointCloudOctree.disposeLeastRecentlyUsed(this.numPoints);
	}
	
	
	this.pcoGeometry.numNodesLoading++;
	var pointAttributes = this.pcoGeometry.pointAttributes;
	if(pointAttributes === "LAS" || pointAttributes === "LAZ"){
		// load las or laz node files
		
		var url = this.pcoGeometry.octreeDir + "/" + this.name + "." + pointAttributes.toLowerCase();
		nodesLoadTimes[url] = {};
		nodesLoadTimes[url].start = new Date().getTime();
		LasLazLoader.load(url, new Potree.LasLazBatcher(this, url));
	} else if ( pointAttributes === "POT"){
		
		var callback = function(node, buffer){
			var dv = new DataView(buffer, 0, 4);
			var headerSize = dv.getUint32(0, true);
			var pointOffset = 4 + headerSize;
			
			var headerBuffer = buffer.slice(4, 4 + headerSize);
			var header = String.fromCharCode.apply(null, new Uint8Array(headerBuffer));
			header = JSON.parse(header);
			console.log(header);
			
			var pScale = header.attributes[0].scale;
			var pOffset = header.attributes[0].offset;
			var pEncoding = header.attributes[0].encoding;
			
			var scale = new THREE.Vector3(pScale[0], pScale[1], pScale[2]);
			var offset = new THREE.Vector3(pOffset[0], pOffset[1], pOffset[2]);
			var min = pEncoding.min;
			var max = pEncoding.max;
			var bits = pEncoding.bits;
			
			var pointBuffer = buffer.slice(pointOffset, pointOffset + buffer.byteLength - pointOffset);
			var br = new BitReader(pointBuffer);
			
			var X = br.read(32);
			var Y = br.read(32);
			var Z = br.read(32);
			
			var r = br.read(8);
			var g = br.read(8);
			var b = br.read(8);
			
			var geometry = new THREE.BufferGeometry();
			var numPoints = header.pointcount;
			
			var positions = new Float32Array(numPoints*3);
			var colors = new Float32Array(numPoints*3);
			var color = new THREE.Color();
			
			for(var i = 0; i < header.pointcount - 1; i++){
				
				dx = br.read(bits[0]) + min[0]; 
				dy = br.read(bits[1]) + min[1]; 
				dz = br.read(bits[2]) + min[2]; 
				
				X = X + dx;
				Y = Y + dy;
				Z = Z + dz;
				
				x = X * scale.x + offset.x;
				y = Y * scale.y + offset.y; 
				z = Z * scale.z + offset.z;
				
				r = br.read(8);
				g = br.read(8);
				b = br.read(8);
				
				positions[3*i+0] = x;// + node.pcoGeometry.offset.x;
				positions[3*i+1] = y;// + node.pcoGeometry.offset.y;
				positions[3*i+2] = z;// + node.pcoGeometry.offset.z;
				
				colors[3*i+0] = r / 255;
				colors[3*i+1] = g / 255;
				colors[3*i+2] = b / 255;
			}
			
			geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
			geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3));
			geometry.boundingBox = node.boundingBox;
			node.geometry = geometry;
			node.loaded = true;
			node.loading = false;
			node.pcoGeometry.numNodesLoading--;
			
		};
		
		Potree.BinaryNodeLoader.load(this, "pot", callback);
		
	} else {
		// load binary node files
		
		var url = this.pcoGeometry.octreeDir + "/" + this.name;
		nodesLoadTimes[url] = {};
		nodesLoadTimes[url].start = new Date().getTime();
		var callback = function(node, buffer){
			var geometry = new THREE.BufferGeometry();
			var numPoints = buffer.byteLength / 16;
			
			var positions = new Float32Array(numPoints*3);
			var colors = new Float32Array(numPoints*3);
			var color = new THREE.Color();
			
			var fView = new Float32Array(buffer);
			var uiView = new Uint8Array(buffer);
			
			for(var i = 0; i < numPoints; i++){
				positions[3*i+0] = fView[4*i+0] + node.pcoGeometry.offset.x;
				positions[3*i+1] = fView[4*i+1] + node.pcoGeometry.offset.y;
				positions[3*i+2] = fView[4*i+2] + node.pcoGeometry.offset.z;
				
				color.setRGB(uiView[16*i+12], uiView[16*i+13], uiView[16*i+14]);
				colors[3*i+0] = color.r / 255;
				colors[3*i+1] = color.g / 255;
				colors[3*i+2] = color.b / 255;
			}
			
			geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
			geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3));
			geometry.boundingBox = node.boundingBox;
			node.geometry = geometry;
			node.loaded = true;
			node.loading = false;
			node.pcoGeometry.numNodesLoading--;
			
			nodesLoadTimes[url].end = new Date().getTime();
			
			var time = nodesLoadTimes[url].end - nodesLoadTimes[url].start;
		};
		
		nodesLoadTimes[url] = {};
		nodesLoadTimes[url].start = new Date().getTime();
		Potree.BinaryNodeLoader.load(this, "", callback);
	}
}

Potree.BinaryNodeLoader = function(){

}

Potree.BinaryNodeLoader.load = function(node, extension, callback){
	var url = node.pcoGeometry.octreeDir + "/" + node.name;
	if(extension !== undefined && extension.length > 0){
		url += "." + extension;
	}
	var xhr = new XMLHttpRequest();
	xhr.open('GET', url, true);
	xhr.responseType = 'arraybuffer';
	xhr.overrideMimeType('text/plain; charset=x-user-defined');
	xhr.onreadystatechange = function() {
		if (xhr.readyState === 4) {
			if (xhr.status === 200 || xhr.status === 0) {
				var buffer = xhr.response;
				callback(node, buffer);
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


Potree.LasLazBatcher = function(node, url){	
	this.push = function(lasBuffer){
		var ww = Potree.workers.lasdecoder.getWorker();
		var mins = new THREE.Vector3(lasBuffer.mins[0], lasBuffer.mins[1], lasBuffer.mins[2]);
		var maxs = new THREE.Vector3(lasBuffer.maxs[0], lasBuffer.maxs[1], lasBuffer.maxs[2]);
		mins.add(node.pcoGeometry.offset);
		maxs.add(node.pcoGeometry.offset);
		
		ww.onmessage = function(e){
			var geometry = new THREE.BufferGeometry();
			var numPoints = lasBuffer.pointsCount;
			
			var endsWith = function(str, suffix) {
				return str.indexOf(suffix, str.length - suffix.length) !== -1;
			}
			
			var positions = e.data.position;
			var colors = e.data.color;
			var intensities = e.data.intensity;
			var classifications = new Uint8Array(e.data.classification);
			var classifications_f = new Float32Array(classifications.byteLength);
			
			var box = new THREE.Box3();
			
			var fPositions = new Float32Array(positions);
			for(var i = 0; i < numPoints; i++){			
				//fPositions[3*i+0] += node.pcoGeometry.offset.x;
				//fPositions[3*i+1] += node.pcoGeometry.offset.y;
				//fPositions[3*i+2] += node.pcoGeometry.offset.z;
				
				classifications_f[i] = classifications[i];
				
				box.expandByPoint(new THREE.Vector3(fPositions[3*i+0], fPositions[3*i+1], fPositions[3*i+2]));
			}
			
			geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
			geometry.addAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
			geometry.addAttribute('intensity', new THREE.BufferAttribute(new Float32Array(intensities), 1));
			geometry.addAttribute('classification', new THREE.BufferAttribute(new Float32Array(classifications_f), 1));
			//geometry.boundingBox = node.boundingBox;
			geometry.boundingBox = new THREE.Box3(mins, maxs);
			node.boundingBox = geometry.boundingBox;
			
			node.geometry = geometry;
			node.loaded = true;
			node.loading = false;
			node.pcoGeometry.numNodesLoading--;
			
			nodesLoadTimes[url].end = new Date().getTime();
			
			var time = nodesLoadTimes[url].end - nodesLoadTimes[url].start;
			Potree.workers.lasdecoder.returnWorker(ww);
		};
		
		var message = {
			buffer: lasBuffer.arrayb,
			numPoints: lasBuffer.pointsCount,
			pointSize: lasBuffer.pointSize,
			pointFormatID: 2,
			scale: lasBuffer.scale,
			offset: lasBuffer.offset,
			mins: [node.pcoGeometry.boundingBox.min.x, node.pcoGeometry.boundingBox.min.y, node.pcoGeometry.boundingBox.min.z],
			maxs: [node.pcoGeometry.boundingBox.max.x, node.pcoGeometry.boundingBox.max.y, node.pcoGeometry.boundingBox.max.z],
			bbOffset: [node.pcoGeometry.offset.x, node.pcoGeometry.offset.y, node.pcoGeometry.offset.z]
		};
		ww.postMessage(message, [message.buffer]);
	}
};

Potree.PointCloudOctreeGeometryNode.prototype.dispose = function(){
	delete this.geometry;
	this.loaded = false;
}



Potree.utils = function(){
	
};

Potree.utils.pathExists = function(url){
	var req = new XMLHttpRequest();
	req.open('GET', url, false);
	req.send(null);
	if (req.status !== 200) {
		return false;
	}
	return true;
}

/**
 * adapted from mhluska at https://github.com/mrdoob/three.js/issues/1561
 */
Potree.utils.computeTransformedBoundingBox = function (box, transform) {

	var vertices = [
        new THREE.Vector3(box.min.x, box.min.y, box.min.z).applyMatrix4(transform),
        new THREE.Vector3(box.min.x, box.min.y, box.min.z).applyMatrix4(transform),
        new THREE.Vector3(box.max.x, box.min.y, box.min.z).applyMatrix4(transform),
        new THREE.Vector3(box.min.x, box.max.y, box.min.z).applyMatrix4(transform),
        new THREE.Vector3(box.min.x, box.min.y, box.max.z).applyMatrix4(transform),
        new THREE.Vector3(box.min.x, box.max.y, box.max.z).applyMatrix4(transform),
        new THREE.Vector3(box.max.x, box.max.y, box.min.z).applyMatrix4(transform),
        new THREE.Vector3(box.max.x, box.min.y, box.max.z).applyMatrix4(transform),
        new THREE.Vector3(box.max.x, box.max.y, box.max.z).applyMatrix4(transform)
    ];
	
	var boundingBox = new THREE.Box3();
	boundingBox.setFromPoints( vertices );
	
	return boundingBox;
}

/**
 * add separators to large numbers
 * 
 * @param nStr
 * @returns
 */
Potree.utils.addCommas = function(nStr){
	nStr += '';
	x = nStr.split('.');
	x1 = x[0];
	x2 = x.length > 1 ? '.' + x[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	}
	return x1 + x2;
}

/**
 * create worker from a string
 *
 * code from http://stackoverflow.com/questions/10343913/how-to-create-a-web-worker-from-a-string
 */
Potree.utils.createWorker = function(code){
	 var blob = new Blob([code], {type: 'application/javascript'});
	 var worker = new Worker(URL.createObjectURL(blob));
	 
	 return worker;
}

Potree.utils.loadSkybox = function(path){
	var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 100000 );
	var scene = new THREE.Scene();

	var format = ".jpg";
	var urls = [
		path + 'px' + format, path + 'nx' + format,
		path + 'py' + format, path + 'ny' + format,
		path + 'pz' + format, path + 'nz' + format
	];
	
	var textureCube = THREE.ImageUtils.loadTextureCube( urls, new THREE.CubeRefractionMapping() );
	var material = new THREE.MeshBasicMaterial( { color: 0xffffff, envMap: textureCube, refractionRatio: 0.95 } );
	
	var shader = THREE.ShaderLib[ "cube" ];
	shader.uniforms[ "tCube" ].value = textureCube;

	var material = new THREE.ShaderMaterial( {

		fragmentShader: shader.fragmentShader,
		vertexShader: shader.vertexShader,
		uniforms: shader.uniforms,
		depthWrite: false,
		side: THREE.BackSide

	} ),

	mesh = new THREE.Mesh( new THREE.BoxGeometry( 100, 100, 100 ), material );
	scene.add( mesh );
	
	return {"camera": camera, "scene": scene};
}

Potree.utils.createGrid = function createGrid(width, length, spacing, color){
	var material = new THREE.LineBasicMaterial({
		color: color || 0x888888
	});
	
	var geometry = new THREE.Geometry();
	for(var i = 0; i <= length; i++){
		 geometry.vertices.push(new THREE.Vector3(-(spacing*width)/2, 0, i*spacing-(spacing*length)/2));
		 geometry.vertices.push(new THREE.Vector3(+(spacing*width)/2, 0, i*spacing-(spacing*length)/2));
	}
	
	for(var i = 0; i <= width; i++){
		 geometry.vertices.push(new THREE.Vector3(i*spacing-(spacing*width)/2, 0, -(spacing*length)/2));
		 geometry.vertices.push(new THREE.Vector3(i*spacing-(spacing*width)/2, 0, +(spacing*length)/2));
	}
	
	var line = new THREE.Line(geometry, material, THREE.LinePieces);
	line.receiveShadow = true;
	return line;
}

/**
 * adapted from http://stemkoski.github.io/Three.js/Sprite-Text-Labels.html
 */

Potree.TextSprite = function(text){
	var texture = new THREE.Texture();
	var spriteMaterial = new THREE.SpriteMaterial( 
		{ map: texture, useScreenCoordinates: false} );
	THREE.Sprite.call(this, spriteMaterial);
	
	this.borderThickness = 4;
	this.fontface = "Arial";
	this.fontsize = 28;
	this.borderColor = { r:0, g:0, b:0, a:1.0 };
	this.backgroundColor = { r:255, g:255, b:255, a:1.0 };
	this.text = "";
	
	this.setText(text);
};

Potree.TextSprite.prototype = new THREE.Sprite();

Potree.TextSprite.prototype.setText = function(text){
	this.text = text;
	
	this.update();
}

Potree.TextSprite.prototype.setBorderColor = function(color){
	this.borderColor = color;
	
	this.update();
}

Potree.TextSprite.prototype.setBackgroundColor = function(color){
	this.backgroundColor = color;
	
	this.update();
}

Potree.TextSprite.prototype.update = function(){

	var canvas = document.createElement('canvas');
	var context = canvas.getContext('2d');
	context.font = "Bold " + this.fontsize + "px " + this.fontface;
	
	// get size data (height depends only on font size)
	var metrics = context.measureText( this.text );
	var textWidth = metrics.width;
	var spriteWidth = textWidth + 2 * this.borderThickness;
	var spriteHeight = this.fontsize * 1.4 + 2 * this.borderThickness;
	
	var canvas = document.createElement('canvas');
	var context = canvas.getContext('2d');
	context.canvas.width = spriteWidth;
	context.canvas.height = spriteHeight;
	context.font = "Bold " + this.fontsize + "px " + this.fontface;
	
	// background color
	context.fillStyle   = "rgba(" + this.backgroundColor.r + "," + this.backgroundColor.g + ","
								  + this.backgroundColor.b + "," + this.backgroundColor.a + ")";
	// border color
	context.strokeStyle = "rgba(" + this.borderColor.r + "," + this.borderColor.g + ","
								  + this.borderColor.b + "," + this.borderColor.a + ")";
								  
	context.lineWidth = this.borderThickness;
	this.roundRect(context, this.borderThickness/2, this.borderThickness/2, 
		textWidth + this.borderThickness, this.fontsize * 1.4 + this.borderThickness, 6);						  
		
	// text color
	
	
	context.strokeStyle = "rgba(0, 0, 0, 1.0)";
	context.strokeText( this.text, this.borderThickness, this.fontsize + this.borderThickness);
	
	context.fillStyle = "rgba(255, 255, 255, 1.0)";
	context.fillText( this.text, this.borderThickness, this.fontsize + this.borderThickness);
	
								  
	var texture = new THREE.Texture(canvas); 
	texture.needsUpdate = true;	
	
	//var spriteMaterial = new THREE.SpriteMaterial( 
	//	{ map: texture, useScreenCoordinates: false } );
	this.material.map = texture;
		
	this.scale.set(spriteWidth*0.01,spriteHeight*0.01,1.0);
		
	//this.material = spriteMaterial;						  
}

Potree.TextSprite.prototype.roundRect = function(ctx, x, y, w, h, r) {
	ctx.beginPath();
	ctx.moveTo(x+r, y);
	ctx.lineTo(x+w-r, y);
	ctx.quadraticCurveTo(x+w, y, x+w, y+r);
	ctx.lineTo(x+w, y+h-r);
	ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
	ctx.lineTo(x+r, y+h);
	ctx.quadraticCurveTo(x, y+h, x, y+h-r);
	ctx.lineTo(x, y+r);
	ctx.quadraticCurveTo(x, y, x+r, y);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();   
}




Potree.MeasuringTool = function(scene, camera, domElement){
	
	var scope = this;
	
	this.scene = scene;
	this.camera = camera;

	this.domElement = domElement;
	this.mouse = {x: 0, y: 0};
	
	var STATE = {
		DEFAULT: 0,
		PICKING: 1
	};
	
	var state = STATE.DEFAULT;
	
	this.activeMeasurement;
	this.measurements = [];
	this.sceneMeasurement = new THREE.Scene();
	this.sceneRoot = new THREE.Object3D();
	this.sceneMeasurement.add(this.sceneRoot);
	
	function Measure(){
		this.points = [];
		this.spheres = [];
		this.edges = [];
		this.sphereLabels = [];
		this.edgeLabels = [];
	}

	
	function onDoubleClick(event){
		var I = getMousePointCloudIntersection();
		if(I){
			var pos = I.clone();
		
			var sphereMaterial = new THREE.MeshNormalMaterial({shading: THREE.SmoothShading})
			var sphereGeometry = new THREE.SphereGeometry(0.4, 10, 10);
			
			var sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
			sphere.position.copy(I);
			scope.sceneRoot.add(sphere);
			
			var sphereEnd = new THREE.Mesh(sphereGeometry, sphereMaterial);
			sphereEnd.position.copy(I);
			scope.sceneRoot.add(sphereEnd);
			
			var msg = pos.x.toFixed(2) + " / " + pos.y.toFixed(2) + " / " + pos.z.toFixed(2);
			
			var label = new Potree.TextSprite(msg);
			label.setBorderColor({r:0, g:255, b:0, a:1.0});
			label.material.depthTest = false;
			label.material.opacity = 0;
			label.position.copy(I);
			label.position.y += 0.5;
			scope.sceneRoot.add( label );
			
			var labelEnd = new Potree.TextSprite(msg);
			labelEnd.setBorderColor({r:0, g:255, b:0, a:1.0});
			labelEnd.material.depthTest = false;
			labelEnd.material.opacity = 0;
			labelEnd.position.copy(I);
			labelEnd.position.y += 0.5;
			scope.sceneRoot.add( labelEnd );
			
			var lc = new THREE.Color( 0xff0000 );
			var lineGeometry = new THREE.Geometry();
			lineGeometry.vertices.push(I.clone(), I.clone());
			lineGeometry.colors.push(lc, lc, lc);
			var lineMaterial = new THREE.LineBasicMaterial( { vertexColors: THREE.VertexColors } );
			lineMaterial.depthTest = false;
			sConnection = new THREE.Line(lineGeometry, lineMaterial);
			scope.sceneRoot.add(sConnection);
			
			var edgeLabel = new Potree.TextSprite(0);
			edgeLabel.setBorderColor({r:0, g:255, b:0, a:0.0});
			edgeLabel.setBackgroundColor({r:0, g:255, b:0, a:0.0});
			edgeLabel.material.depthTest = false;
			edgeLabel.position.copy(I);
			edgeLabel.position.y += 0.5;
			scope.sceneRoot.add( edgeLabel );
			
			
			//floatingOrigin.addReferenceFrame(sphere);
			//floatingOrigin.addReferenceFrame(sphereEnd);
			//floatingOrigin.addReferenceFrame(label);
			//floatingOrigin.addReferenceFrame(labelEnd);
			//floatingOrigin.addReferenceFrame(sConnection);
			//floatingOrigin.addReferenceFrame(edgeLabel);
			
			if(state === STATE.DEFAULT){
				state = STATE.PICKING;
				scope.activeMeasurement = new Measure();
				
				scope.activeMeasurement.spheres.push(sphere);
			}else if(state === STATE.PICKING){
			
			}
			
			scope.activeMeasurement.points.push(I);
			
			scope.activeMeasurement.spheres.push(sphereEnd);
			scope.activeMeasurement.sphereLabels.push(label);
			scope.activeMeasurement.sphereLabels.push(labelEnd);
			scope.activeMeasurement.edges.push(sConnection);
			scope.activeMeasurement.edgeLabels.push(edgeLabel);
			
			
			var event = {
				type: 'newpoint',
				position: pos.clone()
			};
			scope.dispatchEvent(event);
			
		}
	};
	
	function onMouseMove(event){
		scope.mouse.x = ( event.clientX / scope.domElement.clientWidth ) * 2 - 1;
		scope.mouse.y = - ( event.clientY / scope.domElement.clientHeight ) * 2 + 1;
		
		if(state == STATE.PICKING && scope.activeMeasurement){
			var I = getMousePointCloudIntersection();
			
			if(I){
				var pos = I.clone();
				var l = scope.activeMeasurement.spheres.length;
				var sphere = scope.activeMeasurement.spheres[l-1];
				var label = scope.activeMeasurement.sphereLabels[l-1];
				var edge = scope.activeMeasurement.edges[l-2];
				var edgeLabel = scope.activeMeasurement.edgeLabels[l-2];
				
				var msg = pos.x.toFixed(2) + " / " + pos.y.toFixed(2) + " / " + pos.z.toFixed(2);
				label.setText(msg);
				
				sphere.position.copy(I);
				label.position.copy(I);
				label.position.y += 0.5;
				
				edge.geometry.vertices[1].copy(I);
				edge.geometry.verticesNeedUpdate = true;
				edge.geometry.computeBoundingSphere();
				
				var edgeLabelPos = edge.geometry.vertices[1].clone().add(edge.geometry.vertices[0]).multiplyScalar(0.5);
				var edgeLabelText = edge.geometry.vertices[0].distanceTo(edge.geometry.vertices[1]).toFixed(2);
				edgeLabel.position.copy(edgeLabelPos);
				edgeLabel.setText(edgeLabelText);
				edgeLabel.scale.multiplyScalar(10);
			}
			
		}
	};
	
	function onRightClick(event){
		if(state == STATE.PICKING){
			var sphere = scope.activeMeasurement.spheres.pop();
			var edge = scope.activeMeasurement.edges.pop();
			var sphereLabel = scope.activeMeasurement.sphereLabels.pop();
			var edgeLabel = scope.activeMeasurement.edgeLabels.pop();
			
			scope.sceneRoot.remove(sphere);
			scope.sceneRoot.remove(edge);
			scope.sceneRoot.remove(sphereLabel);
			scope.sceneRoot.remove(edgeLabel);
		
			scope.measurements.push(scope.activeMeasurement);
			scope.activeMeasurement = undefined;
		
			state = STATE.DEFAULT;
		}
	}
	
	function onMouseDown(event){
		if(event.which === 3){	
			onRightClick(event);
		}
	}
	
	function getMousePointCloudIntersection(){
		var vector = new THREE.Vector3( scope.mouse.x, scope.mouse.y, 0.5 );
		var projector = new THREE.Projector();
		projector.unprojectVector( vector, scope.camera );
		
		var raycaster = new THREE.Raycaster();
		raycaster.params = {"PointCloud" : {threshold: 1}};
		raycaster.ray.set( scope.camera.position, vector.sub( scope.camera.position ).normalize() );
		
		var pointClouds = [];
		scope.scene.traverse(function(object){
			if(object instanceof Potree.PointCloudOctree){
				pointClouds.push(object);
			}
		});
		
		var intersects = raycaster.intersectObjects(pointClouds, true);
		
		if(intersects.length > 0){
			var I = intersects[0];			
			
			return I.point;
		}else{
			return undefined;
		}
	}
	
	this.domElement.addEventListener("dblclick", onDoubleClick, false);
	this.domElement.addEventListener( 'mousemove', onMouseMove, false );
	this.domElement.addEventListener( 'mousedown', onMouseDown, false );
};


Potree.MeasuringTool.prototype = Object.create( THREE.EventDispatcher.prototype );

Potree.ProfileTool = function(width, height, depth){

	THREE.Object3D.call( this );

	var boxGeometry = new THREE.BoxGeometry(1,1,1,1,1,1);
	var boxMaterial = new THREE.MeshBasicMaterial({color: 0xFF0000, transparent: true, opacity: 0.3});
	
	this.profileFrustum = new THREE.Mesh(boxGeometry, boxMaterial);
	this.add(this.profileFrustum);
	
	this.camera = new THREE.OrthographicCamera( -width / 2, width / 2, height / 2, -height / 2, 1, 1 + depth );
	this.add(this.camera);
	this.setDimension(width, height, depth);
	
	this.rtProfile = new THREE.WebGLRenderTarget( 512, 512, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter, format: THREE.RGBFormat } );
	
	this.hudGeometry = new THREE.BoxGeometry(2,2,1);
	this.hudMaterial = new THREE.MeshBasicMaterial( { color: 0xffffff, map: this.rtProfile } );
	this.hudMaterial.depthTest = false;
	this.hudElement = new THREE.Mesh(this.hudGeometry, this.hudMaterial);
	this.hudElement.scale.set(1,1,1);
	this.hudElement.position.set(0, 0, 0);
}

Potree.ProfileTool.prototype = Object.create( THREE.Object3D.prototype );

Potree.ProfileTool.prototype.setDimension = function(width, height, depth){
	this.profileFrustum.scale.set(width, height, depth);
	this.width = width;
	this.height = height;
	this.depth = depth;
		
	this.camera.left = -width / 2;
	this.camera.right = width / 2;
	this.camera.top = height / 2;
	this.camera.bottom = -height / 2;
	this.camera.updateProjectionMatrix();
}

Potree.ProfileTool.prototype.setOrientation = function(forward, side){
	var oldPosition = this.position.clone();
	this.position.add(forward);
	this.lookAt(oldPosition);
	this.position.copy(oldPosition);
	
	this.camera.position.copy(oldPosition.clone().add(forward));
	this.camera.lookAt(oldPosition);
}

Potree.ProfileTool.prototype.render = function(renderer, scene){
	this.camera.matrixWorld.copy(this.matrixWorld);
	
	//TODO maybe we should store old sizes in a map instead of the objects
	scene.traverse(function(object){
		if(object instanceof Potree.PointCloudOctree){
			object.material.oldSize = object.material.size;
			object.material.size = 0;
		}
	});
	
	
	renderer.render(scene, this.camera, this.rtProfile, true);
	
	
	scene.traverse(function(object){
		if(object instanceof Potree.PointCloudOctree){
			object.material.size = object.material.oldSize;
		}
	});
	
	//this.hudElement.scale.x = 0.5;
	//this.hudElement.scale.y = 0.5 * (renderer.domElement.clientWidth / renderer.domElement.clientHeight) * (this.height / this.width);
	//this.hudElement.position.x = 0.7;
	//this.hudElement.position.y = -0.7;
	
}









Potree.TranslationTool = function(camera) {
	THREE.Object3D.call( this );
	var scope = this;

	this.camera = camera;

	this.geometry = new THREE.Geometry();
	this.material = new THREE.MeshBasicMaterial( { color: Math.random() * 0xffffff } );
	
	this.STATE = {
		DEFAULT: 0,
		TRANSLATE_X: 1,
		TRANSLATE_Y: 2,
		TRANSLATE_Z: 3
	};
	
	this.parts = {
		ARROW_X : {name: "arrow_x", object: undefined, color: new THREE.Color( 0xff0000 ), state: this.STATE.TRANSLATE_X},
		ARROW_Y : {name: "arrow_y", object: undefined, color: new THREE.Color( 0x00ff00 ), state: this.STATE.TRANSLATE_Y},
		ARROW_Z : {name: "arrow_z", object: undefined, color: new THREE.Color( 0x0000ff ), state: this.STATE.TRANSLATE_Z}
	}
	
	this.translateStart;
	
	this.state = this.STATE.DEFAULT;
	this.highlighted;
	this.targets;
	
	this.build = function(){
		var arrowX = scope.createArrow(scope.parts.ARROW_X, scope.parts.ARROW_X.color);
		arrowX.rotation.z = -Math.PI/2;
		
		var arrowY = scope.createArrow(scope.parts.ARROW_Y, scope.parts.ARROW_Y.color);
		
		var arrowZ = scope.createArrow(scope.parts.ARROW_Z, scope.parts.ARROW_Z.color);
		arrowZ.rotation.x = -Math.PI/2;
		
		scope.add(arrowX);
		scope.add(arrowY);
		scope.add(arrowZ);
		
		
		var boxXY = scope.createBox(new THREE.Color( 0xffff00 ));
		boxXY.scale.z = 0.02;
		boxXY.position.set(0.5, 0.5, 0);
		
		var boxXZ = scope.createBox(new THREE.Color( 0xff00ff ));
		boxXZ.scale.y = 0.02;
		boxXZ.position.set(0.5, 0, -0.5);
		
		var boxYZ = scope.createBox(new THREE.Color( 0x00ffff ));
		boxYZ.scale.x = 0.02;
		boxYZ.position.set(0, 0.5, -0.5);
		
		scope.add(boxXY);
		scope.add(boxXZ);
		scope.add(boxYZ);
		
		
		scope.parts.ARROW_X.object = arrowX;
		scope.parts.ARROW_Y.object = arrowY;
		scope.parts.ARROW_Z.object = arrowZ;
		
		
		scope.scale.multiplyScalar(5);
	};
	
	this.createBox = function(color){
		var boxGeometry = new THREE.BoxGeometry(1, 1, 1);
		var boxMaterial = new THREE.MeshBasicMaterial({color: color, transparent: true, opacity: 0.5});
		var box = new THREE.Mesh(boxGeometry, boxMaterial);
		
		return box;
	};
	
	this.createArrow = function(partID, color){
		var material = new THREE.MeshBasicMaterial({color: color});
		
		var shaftGeometry = new THREE.CylinderGeometry(0.1, 0.1, 3, 10, 1, false);
		var shaftMatterial  = material;
		var shaft = new THREE.Mesh(shaftGeometry, shaftMatterial);
		shaft.position.y = 1.5;
		
		var headGeometry = new THREE.CylinderGeometry(0, 0.3, 1, 10, 1, false);
		var headMaterial  = material;
		var head = new THREE.Mesh(headGeometry, headMaterial);
		head.position.y = 3;
		
		var arrow = new THREE.Object3D();
		arrow.add(shaft);
		arrow.add(head);
		arrow.partID = partID;
		arrow.material = material;
		
		return arrow;
	};
	
	this.setHighlighted = function(partID){
		if(partID === undefined){
			if(scope.highlighted){
				scope.highlighted.object.material.color = scope.highlighted.color;
				scope.highlighted = undefined;
			}
			
			return; 
		}else if(scope.highlighted !== undefined && scope.highlighted !== partID){
			scope.highlighted.object.material.color = scope.highlighted.color;
		}

		scope.highlighted = partID;
		partID.object.material.color = new THREE.Color(0xffff00);
	}
	
	this.getHoveredObject = function(mouse){
		var vector = new THREE.Vector3( mouse.x, mouse.y, 0.5 );
		var projector = new THREE.Projector();
		projector.unprojectVector( vector, scope.camera );
		
		var raycaster = new THREE.Raycaster();
		raycaster.ray.set( scope.camera.position, vector.sub( scope.camera.position ).normalize() );
		
		var intersections = raycaster.intersectObject(scope, true);
		if(intersections.length === 0){
			scope.setHighlighted(undefined);
			return undefined;
		}
		
		var I = intersections[0];
		var partID = I.object.parent.partID;
			
		return partID;	
	}
	
	this.onMouseMove = function(event){

		var mouse = event.normalizedPosition;
		
		if(scope.state === scope.STATE.DEFAULT){
			scope.setHighlighted(scope.getHoveredObject(mouse));
		}else if(scope.state === scope.STATE.TRANSLATE_X || scope.state === scope.STATE.TRANSLATE_Y || scope.state === scope.STATE.TRANSLATE_Z){
			var origin = scope.start.lineStart.clone();
			var direction = scope.start.lineEnd.clone().sub(scope.start.lineStart);
			direction.normalize();
			
			var mousePoint = new THREE.Vector3(mouse.x, mouse.y);
			
			var directionDistance = new THREE.Vector3().subVectors(mousePoint, origin).dot(direction);
			var pointOnLine = direction.clone().multiplyScalar(directionDistance).add(origin);
			
			
			var projector = new THREE.Projector();
			projector.unprojectVector(pointOnLine, scope.camera);
			
			var diff = pointOnLine.clone().sub(scope.position);
			scope.position.copy(pointOnLine);
			
			for(var i = 0; i < scope.targets.length; i++){
				var target = scope.targets[0];
				target.position.add(diff);
			}
			
			event.signal.halt();
		}
		
	};
	
	this.onMouseDown = function(event){
	
		if(scope.state === scope.STATE.DEFAULT){
			var hoveredObject = scope.getHoveredObject(event.normalizedPosition, scope.camera);
			if(hoveredObject){
				scope.state = hoveredObject.state;
				
				var lineStart = scope.position.clone();
				var lineEnd;
				
				if(scope.state === scope.STATE.TRANSLATE_X){
					lineEnd = scope.position.clone();
					lineEnd.x += 2;
				}else if(scope.state === scope.STATE.TRANSLATE_Y){
					lineEnd = scope.position.clone();
					lineEnd.y += 2;
				}else if(scope.state === scope.STATE.TRANSLATE_Z){
					lineEnd = scope.position.clone();
					lineEnd.z -= 2;
				}
				
				//lineEnd = scope.position.clone();
				
				var projector = new THREE.Projector();
				projector.projectVector( lineStart, scope.camera );
				projector.projectVector( lineEnd, scope.camera );
				
				scope.start = {
					mouse: event.normalizedPosition,
					lineStart: lineStart,
					lineEnd: lineEnd
				};
				
				event.signal.halt();
			}
			
		}		
	};
	
	this.onMouseUp = function(event){
		scope.setHighlighted();
		scope.state = scope.STATE.DEFAULT;
		
	};
	
	this.setTargets = function(targets){
		scope.targets = targets;
		
		if(scope.targets.length === 0){
			return;
		}
		
		//TODO calculate centroid of all targets
		var centroid = targets[0].position.clone();
		//for(var i = 0; i < targets.length; i++){
		//	var target = targets[i];
		//}
		
		scope.position.copy(centroid);
		
	}

	this.build();
};

Potree.TranslationTool.prototype = Object.create( THREE.Object3D.prototype );

















