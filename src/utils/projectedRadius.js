Potree.utils.projectedRadius = (radius, fov, distance, screenHeight) => {
	let projFactor = (1 / Math.tan(fov / 2)) / distance;
	projFactor = projFactor * screenHeight / 2;

	return radius * projFactor;
};
