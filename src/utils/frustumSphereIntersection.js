/**
 *
 * 0: no intersection
 * 1: intersection
 * 2: fully inside
 */
Potree.utils.frustumSphereIntersection = (frustum, sphere) => {
	let planes = frustum.planes;
	let center = sphere.center;
	let negRadius = -sphere.radius;

	let minDistance = Number.MAX_VALUE;

	for (let i = 0; i < 6; i++) {
		let distance = planes[ i ].distanceToPoint(center);

		if (distance < negRadius) {
			return 0;
		}

		minDistance = Math.min(minDistance, distance);
	}

	return (minDistance >= sphere.radius) ? 2 : 1;
};
