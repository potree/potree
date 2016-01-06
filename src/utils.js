
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
};

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
};

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
};

/**
 * create worker from a string
 *
 * code from http://stackoverflow.com/questions/10343913/how-to-create-a-web-worker-from-a-string
 */
Potree.utils.createWorker = function(code){
	 var blob = new Blob([code], {type: 'application/javascript'});
	 var worker = new Worker(URL.createObjectURL(blob));
	 
	 return worker;
};

Potree.utils.loadSkybox = function(path){
	var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 100000 );
    var scene = new THREE.Scene();

    var format = ".jpg";
    var urls = [
        path + 'px' + format, path + 'nx' + format,
        path + 'py' + format, path + 'ny' + format,
        path + 'pz' + format, path + 'nz' + format
    ];

    var textureCube = THREE.ImageUtils.loadTextureCube(urls, THREE.CubeRefractionMapping );

    var shader = {
        uniforms: {
            "tCube": {type: "t", value: textureCube},
            "tFlip": {type: "f", value: -1}
        },
        vertexShader: THREE.ShaderLib["cube"].vertexShader,
        fragmentShader: THREE.ShaderLib["cube"].fragmentShader
    };

    var material = new THREE.ShaderMaterial({
        fragmentShader: shader.fragmentShader,
        vertexShader: shader.vertexShader,
        uniforms: shader.uniforms,
        depthWrite: false,
        side: THREE.BackSide
    });
    var mesh = new THREE.Mesh(new THREE.BoxGeometry(100, 100, 100), material);
    scene.add(mesh);

    return {"camera": camera, "scene": scene};
};

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
};


Potree.utils.createBackgroundTexture = function(width, height){

	function gauss(x, y){
		return (1 / (2 * Math.PI)) * Math.exp( - (x*x + y*y) / 2);
	};

	var map = THREE.ImageUtils.generateDataTexture( width, height, new THREE.Color() );
	map.magFilter = THREE.NearestFilter;
	var data = map.image.data;

	//var data = new Uint8Array(width*height*4);
	var chroma = [1, 1.5, 1.7];
	var max = gauss(0, 0);

	for(var x = 0; x < width; x++){
		for(var y = 0; y < height; y++){
			var u = 2 * (x / width) - 1;
			var v = 2 * (y / height) - 1;
			
			var i = x + width*y;
			var d = gauss(2*u, 2*v) / max;
			var r = (Math.random() + Math.random() + Math.random()) / 3;
			r = (d * 0.5 + 0.5) * r * 0.03;
			r = r * 0.4;
			
			//d = Math.pow(d, 0.6);
			
			data[3*i+0] = 255 * (d / 15 + 0.05 + r) * chroma[0];
			data[3*i+1] = 255 * (d / 15 + 0.05 + r) * chroma[1];
			data[3*i+2] = 255 * (d / 15 + 0.05 + r) * chroma[2];
			
			//data[4*i+3] = 255;
		
		}
	}
	
	return map;
};



function getMousePointCloudIntersection(mouse, camera, renderer, pointclouds){
	var vector = new THREE.Vector3( mouse.x, mouse.y, 0.5 );
	vector.unproject(camera);

	var direction = vector.sub(camera.position).normalize();
	var ray = new THREE.Ray(camera.position, direction);
	
	var closestPoint = null;
	var closestPointDistance = null;
	
	for(var i = 0; i < pointclouds.length; i++){
		var pointcloud = pointclouds[i];
		var point = pointcloud.pick(renderer, camera, ray);
		
		if(!point){
			continue;
		}
		
		var distance = camera.position.distanceTo(point.position);
		
		if(!closestPoint || distance < closestPointDistance){
			closestPoint = point;
			closestPointDistance = distance;
		}
	}
	
	return closestPoint ? closestPoint.position : null;
};
	
	
function pixelsArrayToImage(pixels, width, height){
    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    var context = canvas.getContext('2d');
	
	pixels = new pixels.constructor(pixels);
	
	for(var i = 0; i < pixels.length; i++){
		pixels[i*4 + 3] = 255;
	}

    var imageData = context.createImageData(width, height);
    imageData.data.set(pixels);
    context.putImageData(imageData, 0, 0);

    var img = new Image();
    img.src = canvas.toDataURL();
	img.style.transform = "scaleY(-1)";
	
    return img;
};

function projectedRadius(radius, fov, distance, screenHeight){
	var projFactor =  (1 / Math.tan(fov / 2)) / distance;
	projFactor = projFactor * screenHeight / 2;
	
	return radius * projFactor;
};
	
	
Potree.utils.topView = function(camera, node){
	camera.position.set(0, 1, 0);
	camera.rotation.set(-Math.PI / 2, 0, 0);
	camera.zoomTo(node, 1);
};

Potree.utils.frontView = function(camera, node){
	camera.position.set(0, 0, 1);
	camera.rotation.set(0, 0, 0);
	camera.zoomTo(node, 1);
};


Potree.utils.leftView = function(camera, node){
	camera.position.set(-1, 0, 0);
	camera.rotation.set(0, -Math.PI / 2, 0);
	camera.zoomTo(node, 1);
};

Potree.utils.rightView = function(camera, node){
	camera.position.set(1, 0, 0);
	camera.rotation.set(0, Math.PI / 2, 0);
	camera.zoomTo(node, 1);
};
	
/**
 *  
 * 0: no intersection
 * 1: intersection
 * 2: fully inside
 */
Potree.utils.frustumSphereIntersection = function(frustum, sphere){
	var planes = frustum.planes;
	var center = sphere.center;
	var negRadius = - sphere.radius;

	var minDistance = Number.MAX_VALUE;
	
	for ( var i = 0; i < 6; i ++ ) {

		var distance = planes[ i ].distanceToPoint( center );

		if ( distance < negRadius ) {

			return 0;

		}
		
		minDistance = Math.min(minDistance, distance);

	}

	return (minDistance >= sphere.radius) ? 2 : 1;
};
	
	
Potree.utils.screenPass = new function(){

	this.screenScene = new THREE.Scene();
	this.screenQuad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2, 0));
	this.screenQuad.material.depthTest = true;
	this.screenQuad.material.depthWrite = true;
	this.screenQuad.material.transparent = true;
	this.screenScene.add(this.screenQuad);
	this.camera = new THREE.Camera();
	
	this.render = function(renderer, material, target){
		this.screenQuad.material = material;
		
		if(typeof target === undefined){
			renderer.render(this.screenScene, this.camera);
		}else{
			renderer.render(this.screenScene, this.camera, target);
		}
	};
}();
	
// from http://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
Potree.utils.getParameterByName = function(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"), results = regex.exec(location.search);
    return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, " "));
}
	