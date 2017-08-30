module.exports = class PointCloudTree extends THREE.Object3D {
	constructor () {
		super();

		this.dem = new Potree.DEM(this);
	}

	initialized () {
		return this.root !== null;
	}
};
