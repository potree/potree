const DEM = require('./DEM');
const THREE = require('three');

module.exports = class PointCloudTree extends THREE.Object3D {
	constructor () {
		super();

		this.dem = new DEM(this);
	}

	initialized () {
		return this.root !== null;
	}
};
