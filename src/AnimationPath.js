const THREE = require('three');
const PathAnimation = require('./PathAnimation');

class AnimationPath {
	constructor (points = []) {
		this.points = points;
		this.spline = new THREE.CatmullRomCurve3(points);
		// this.spline.reparametrizeByArcLength(1 / this.spline.getLength().total);
	}

	get (t) {
		return this.spline.getPoint(t);
	}

	getLength () {
		return this.spline.getLength();
	}

	animate (start, end, speed, callback) {
		let animation = new PathAnimation(this, start, end, speed, callback);
		animation.start();

		return animation;
	}

	pause () {
		if (this.tween) {
			// this.tween.stop();
			// TWEEN.remove()
		}
	}

	resume () {
		if (this.tween) {
			this.tween.start();
		}
	}

	getGeometry () {
		let geometry = new THREE.Geometry();

		let samples = 500;
		let i = 0;
		for (let u = 0; u <= 1; u += 1 / samples) {
			let position = this.spline.getPoint(u);
			geometry.vertices[i] = new THREE.Vector3(position.x, position.y, position.z);

			i++;
		}

		if (this.closed) {
			let position = this.spline.getPoint(0);
			geometry.vertices[i] = new THREE.Vector3(position.x, position.y, position.z);
		}

		return geometry;
	}

	get closed () {
		return this.spline.closed;
	}

	set closed (value) {
		this.spline.closed = value;
	}
};

/*
{
	let target = new THREE.Vector3(589854.34, 231411.19, 692.77);
	let points = [
		new THREE.Vector3(589815.52, 231738.31, 959.48 ),
		new THREE.Vector3(589604.73, 231615.00, 968.10 ),
		new THREE.Vector3(589579.11, 231354.41, 1010.06),
		new THREE.Vector3(589723.00, 231169.95, 1015.57),
		new THREE.Vector3(589960.76, 231116.87, 978.60 ),
		new THREE.Vector3(590139.29, 231268.71, 972.33 )
	];

	let path = new Potree.AnimationPath(points);

	let geometry = path.getGeometry();
	let material = new THREE.LineBasicMaterial();
	let line = new THREE.Line(geometry, material);
	viewer.scene.scene.add(line);

	let [start, end, speed] = [0, path.getLength(), 10];
	path.animate(start, end, speed, t => {
		viewer.scene.view.position.copy(path.spline.getPoint(t));
	});

}
*/

module.exports = AnimationPath;
