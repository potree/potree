import {
	WireframeGeometry
} from 'three';
import { LineSegmentsGeometry } from '../lines/LineSegmentsGeometry.js';

const _WireframeGeometry2 = class {
	constructor(geometry) {

		LineSegmentsGeometry.call(this);

		this.type = 'WireframeGeometry2';

		this.fromWireframeGeometry(new WireframeGeometry(geometry));

		// set colors, maybe
	}
}

_WireframeGeometry2.prototype = Object.assign( Object.create( LineSegmentsGeometry.prototype ), {

	constructor: _WireframeGeometry2,

	isWireframeGeometry2: true

} );

export { _WireframeGeometry2 as WireframeGeometry2 };
