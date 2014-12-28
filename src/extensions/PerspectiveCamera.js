

THREE.PerspectiveCamera.prototype.zoomTo = function( node, factor ){

	if ( !node.geometry && !node.boundingSphere) {
	
		return;
	
	}
	
	if ( node.geometry && node.geometry.boundingSphere === null ) { 
	
		node.geometry.computeBoundingSphere();
	
	}
	
	node.updateMatrixWorld();

	var _factor = factor || 1;
	var bs = node.boundingSphere || node.geometry.boundingSphere;
	bs = bs.clone().applyMatrix4(node.matrixWorld); 
	var radius = bs.radius;
	var fovr = this.fov * Math.PI / 180;
	
	if( this.aspect < 1 ){
	
		fovr = fovr * this.aspect;
		
	}
	
	var distanceFactor = Math.abs( radius / Math.sin( fovr / 2 ) ) * _factor ;
	
	var dir = new THREE.Vector3( 0, 0, -1 ).applyQuaternion( this.quaternion );
	var offset = dir.multiplyScalar( -distanceFactor );
	this.position.copy(bs.center.clone().add( offset ));
	
};



//THREE.PerspectiveCamera.prototype.zoomTo = function(node, factor){
//	if(factor === undefined){
//		factor = 1;
//	}
//
//	node.updateMatrixWorld();
//	this.updateMatrix();
//	this.updateMatrixWorld();
//	
//	var box = Potree.utils.computeTransformedBoundingBox(node.boundingBox, node.matrixWorld);
//	var dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.quaternion);
//	var pos = box.center().sub(dir);
//	
//	var ps = [
//		new THREE.Vector3(box.min.x, box.min.y, box.min.z),
//		new THREE.Vector3(box.min.x, box.min.y, box.min.z),
//		new THREE.Vector3(box.max.x, box.min.y, box.min.z),
//		new THREE.Vector3(box.min.x, box.max.y, box.min.z),
//		new THREE.Vector3(box.min.x, box.min.y, box.max.z),
//		new THREE.Vector3(box.min.x, box.max.y, box.max.z),
//		new THREE.Vector3(box.max.x, box.max.y, box.min.z),
//		new THREE.Vector3(box.max.x, box.min.y, box.max.z),
//		new THREE.Vector3(box.max.x, box.max.y, box.max.z)
//	];
//	
//	var frustum = new THREE.Frustum();
//	frustum.setFromMatrix(new THREE.Matrix4().multiplyMatrices(this.projectionMatrix, this.matrixWorldInverse));
//	
//	var max = Number.MIN_VALUE;
//	for(var i = 0; i < ps.length; i++){
//		var p  = ps[i];
//		
//		var distance = Number.MIN_VALUE;
//		// iterate through left, right, top and bottom planes
//		for(var j = 0; j < frustum.planes.length-2; j++){
//			var plane = frustum.planes[j];
//			var ray = new THREE.Ray(p, dir);
//			var dI = ray.distanceToPlaneWithNegative(plane);
//			distance = Math.max(distance, dI);
//		}
//		max = Math.max(max, distance);
//	}
//	var offset = dir.clone().multiplyScalar(-max);
//	offset.multiplyScalar(factor);
//	pos.add(offset);
//	this.position.copy(pos);
//	
//}