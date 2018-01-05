
THREE.PerspectiveCamera.prototype.zoomTo = function (node, factor) {
	if (!node.geometry && !node.boundingSphere && !node.boundingBox) {
		return;
	}

	if (node.geometry && node.geometry.boundingSphere === null) {
		node.geometry.computeBoundingSphere();
	}

	node.updateMatrixWorld();

	var bs;

	if (node.boundingSphere) {
		bs = node.boundingSphere;
	} else if (node.geometry && node.geometry.boundingSphere) {
		bs = node.geometry.boundingSphere;
	} else {
		bs = node.boundingBox.getBoundingSphere();
	}

	var _factor = factor || 1;

	bs = bs.clone().applyMatrix4(node.matrixWorld);
	var radius = bs.radius;
	var fovr = this.fov * Math.PI / 180;

	if (this.aspect < 1) {
		fovr = fovr * this.aspect;
	}

	var distanceFactor = Math.abs(radius / Math.sin(fovr / 2)) * _factor;

	var offset = this.getWorldDirection().multiplyScalar(-distanceFactor);
	this.position.copy(bs.center.clone().add(offset));
};
