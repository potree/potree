/**
 *
 * code adapted from three.js BoxHelper.js
 * https://github.com/mrdoob/three.js/blob/dev/src/helpers/BoxHelper.js
 *
 * @author mrdoob / http://mrdoob.com/
 * @author Mugen87 / http://github.com/Mugen87
 * @author mschuetz / http://potree.org
 */

import * as THREE from "../../libs/three.js/build/three.module.js";

export class Box3Helper extends THREE.LineSegments {
	constructor (box, color) {
		if (color === undefined) color = 0xffff00;

		let indices = new Uint16Array([ 0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7 ]);
		let positions = new Float32Array([
			box.min.x, box.min.y, box.min.z,
			box.max.x, box.min.y, box.min.z,
			box.max.x, box.min.y, box.max.z,
			box.min.x, box.min.y, box.max.z,
			box.min.x, box.max.y, box.min.z,
			box.max.x, box.max.y, box.min.z,
			box.max.x, box.max.y, box.max.z,
			box.min.x, box.max.y, box.max.z
		]);

		let geometry = new THREE.BufferGeometry();
		geometry.setIndex(new THREE.BufferAttribute(indices, 1));
		geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

		let material = new THREE.LineBasicMaterial({ color: color });

		super(geometry, material);
	}
}
