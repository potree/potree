
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
	

    //var geom = new THREE.Geometry();
    //
    //geom.vertices = [
    //    new THREE.Vector3(box.min.x, box.min.y, box.min.z).applyMatrix4(transform),
    //    new THREE.Vector3(box.min.x, box.min.y, box.min.z).applyMatrix4(transform),
    //    new THREE.Vector3(box.max.x, box.min.y, box.min.z).applyMatrix4(transform),
    //    new THREE.Vector3(box.min.x, box.max.y, box.min.z).applyMatrix4(transform),
    //    new THREE.Vector3(box.min.x, box.min.y, box.max.z).applyMatrix4(transform),
    //    new THREE.Vector3(box.min.x, box.max.y, box.max.z).applyMatrix4(transform),
    //    new THREE.Vector3(box.max.x, box.max.y, box.min.z).applyMatrix4(transform),
    //    new THREE.Vector3(box.max.x, box.min.y, box.max.z).applyMatrix4(transform),
    //    new THREE.Vector3(box.max.x, box.max.y, box.max.z).applyMatrix4(transform)
    //];
    //geom.computeBoundingBox();
    //return geom.boundingBox;
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