const THREE = require('three');

module.exports = function (radius, proj, screenWidth, screenHeight) {
	let p1 = new THREE.Vector4(0);
	let p2 = new THREE.Vector4(radius);

	p1.applyMatrix4(proj);
	p2.applyMatrix4(proj);
	p1 = new THREE.Vector3(p1.x, p1.y, p1.z);
	p2 = new THREE.Vector3(p2.x, p2.y, p2.z);
	p1.x = (p1.x + 1.0) * 0.5 * screenWidth;
	p1.y = (p1.y + 1.0) * 0.5 * screenHeight;
	p2.x = (p2.x + 1.0) * 0.5 * screenWidth;
	p2.y = (p2.y + 1.0) * 0.5 * screenHeight;
	return p1.distanceTo(p2);
};
