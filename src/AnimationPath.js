
Potree.AnimationPath = class {
	constructor (points = []) {
		this.points = points;
		this.spline = new THREE.CatmullRomCurve3(points);
		// this.spline.reparametrizeByArcLength(1 / this.spline.getLength().total);
		this.tween = null;
	}

	get (t) {
		return this.spline.getPoint(t);
	}
	
	getLength(){
		return this.spline.getLength();
	}

	animate (start, end, metersPerSecond, callback) {
		this.pause();
		
		let length = this.spline.getLength();
		
		start = Math.max(start, 0);
		end = Math.min(end, length);
		
		let tStart = start / length;
		let tEnd = end / length;
		
		let animationDuration = (end - start) * 1000 / metersPerSecond;

		let progress = {t: tStart};
		this.tween = new TWEEN.Tween(progress).to({t: tEnd}, animationDuration);
		this.tween.easing(TWEEN.Easing.Linear.None);
		this.tween.onUpdate((e) => {
			callback(progress.t);
			//viewer.scene.view.position.copy(this.spline.getPoint(progress.t));
		});

		this.tween.start();
	}

	pause () {
		if (this.tween) {
			this.tween.stop();
		}
	}

	resume () {
		if (this.tween) {
			this.tween.start();
		}
	}

	getGeometry () {
		let geometry = new THREE.Geometry();

		let samples = 100;
		let i = 0;
		for (let u = 0; u <= 1; u += 1 / samples) {
			let position = this.spline.getPoint(u);
			geometry.vertices[i] = new THREE.Vector3(position.x, position.y, position.z);

			i++;
		}

		return geometry;
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
