module.exports = function (ray, plane) {
	var denominator = plane.normal.dot(ray.direction);
	if (denominator === 0) {
		// line is coplanar, return origin
		if (plane.distanceToPoint(ray.origin) === 0) {
			return 0;
		}

		// Null is preferable to undefined since undefined means.... it is undefined
		return null;
	}
	var t = -(ray.origin.dot(plane.normal) + plane.constant) / denominator;

	return t;
};
