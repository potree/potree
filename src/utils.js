
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
