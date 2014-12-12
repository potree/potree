zoomTo = function( camera, node, factor ){

	if ( !node.geometry && !node.boundingSphere ) {
	
		return;
	
	}
	
	if ( node.geometry && node.geometry.boundingSphere === null ) { 
	
		node.geometry.computeBoundingSphere();
	
	}
	
	var boundingSphere = node.boundingSphere || node.geometry.boundingSphere;
	
	if ( !boundingSphere ) {
	
		return;
		
	}
	
	
	node.updateMatrixWorld();
	
	boundingSphere = boundingSphere.clone().applyMatrix4(node.matrixWorld);

	var _factor = factor || 1;
	
	var radius = boundingSphere.radius;
	var center = boundingSphere.center;
	var fovr = camera.fov * Math.PI / 180;
	
	if( camera.aspect < 1 ){
	
		fovr = fovr * camera.aspect;
		
	}
	
	var distanceFactor = Math.abs( radius / Math.sin( fovr / 2 ) ) * _factor ;
	
	var dir = new THREE.Vector3( 0, 0, -1 ).applyQuaternion( camera.quaternion );
	var offset = dir.multiplyScalar( -distanceFactor );
	camera.position.copy(center.add( offset ));
	
};