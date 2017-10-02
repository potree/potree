const THREE = require('three');

module.exports = (width, length, spacing, color) => {
	let material = new THREE.LineBasicMaterial({
		color: color || 0x888888
	});

	let geometry = new THREE.Geometry();
	for (let i = 0; i <= length; i++) {
		geometry.vertices.push(new THREE.Vector3(-(spacing * width) / 2, i * spacing - (spacing * length) / 2, 0));
		geometry.vertices.push(new THREE.Vector3(+(spacing * width) / 2, i * spacing - (spacing * length) / 2, 0));
	}

	for (let i = 0; i <= width; i++) {
		geometry.vertices.push(new THREE.Vector3(i * spacing - (spacing * width) / 2, -(spacing * length) / 2, 0));
		geometry.vertices.push(new THREE.Vector3(i * spacing - (spacing * width) / 2, +(spacing * length) / 2, 0));
	}

	let line = new THREE.LineSegments(geometry, material, THREE.LinePieces);
	line.receiveShadow = true;
	return line;
};
