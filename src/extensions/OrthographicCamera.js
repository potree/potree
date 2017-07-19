
THREE.OrthographicCamera.prototype.zoomTo = function( node, factor ){

	if ( !node.geometry && !node.boundingBox) {
		return;
	}
	var _factor = factor || 1;
	
	// TODO

	let minWS = new THREE.Vector4(node.boundingBox.min.x, node.boundingBox.min.y, node.boundingBox.min.z, 1);
	let minVS = minWS.applyMatrix4(this.matrixWorldInverse);

	let right = node.boundingBox.max.x;
	let bottom	= node.boundingBox.min.y;
	let top = node.boundingBox.max.y;

	this.updateProjectionMatrix();	
};