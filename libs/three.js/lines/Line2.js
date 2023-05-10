import { LineSegments2 } from '../lines/LineSegments2.js';
import { LineGeometry } from '../lines/LineGeometry.js';
import { LineMaterial } from '../lines/LineMaterial.js';

const _Line2 = class {
	constructor(geometry, material) {

		if (geometry === undefined)
			geometry = new LineGeometry();
		if (material === undefined)
			material = new LineMaterial({ color: Math.random() * 0xffffff });

		LineSegments2.call(this, geometry, material);

		this.type = 'Line2';

	}
}

_Line2.prototype = Object.assign( Object.create( LineSegments2.prototype ), {

	constructor: _Line2,
	isLine2: true

} );

export { _Line2 as Line2 };
