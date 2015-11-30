THREE.Ray.prototype.distanceToPlaneWithNegative = function ( plane ) {
	var denominator = plane.normal.dot( this.direction );
	if ( denominator === 0 ) {

		// line is coplanar, return origin
		if( plane.distanceToPoint( this.origin ) === 0 ) {
			return 0;
		}

		// Null is preferable to undefined since undefined means.... it is undefined
		return null;
	}
	var t = - ( this.origin.dot( plane.normal ) + plane.constant ) / denominator;

	return t;
};