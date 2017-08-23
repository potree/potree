/**
 * adapted from mhluska at https://github.com/mrdoob/three.js/issues/1561
 */
Potree.utils.computeTransformedBoundingBox = (box, transform) => {
	let vertices = [
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

	let boundingBox = new THREE.Box3();
	boundingBox.setFromPoints(vertices);

	return boundingBox;
};
