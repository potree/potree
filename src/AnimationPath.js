
import * as THREE from "../libs/three.js/build/three.module.js";

export class PathAnimation{
	
	constructor(path, start, end, speed, callback){
			this.path = path;
			this.length = this.path.spline.getLength();
			this.speed = speed;
			this.callback = callback;
			this.tween = null;
			this.startPoint = Math.max(start, 0);
			this.endPoint = Math.min(end, this.length);
			this.t = 0.0;
	}

	start(resume = false){
		if(this.tween){
			this.tween.stop();
			this.tween = null;
		}
	
		let tStart;
		if(resume){
			tStart = this.t;
		}else{
			tStart = this.startPoint / this.length;
		}
		let tEnd = this.endPoint / this.length;
		let animationDuration = (tEnd - tStart) * this.length * 1000 / this.speed;
	
		let progress = {t: tStart};
		this.tween = new TWEEN.Tween(progress).to({t: tEnd}, animationDuration);
		this.tween.easing(TWEEN.Easing.Linear.None);
		this.tween.onUpdate((e) => {
			this.t = progress.t;
			this.callback(progress.t);
		});
		this.tween.onComplete(() => {
			if(this.repeat){
				this.start();
			}
		});

		setTimeout(() => {
			this.tween.start();
		}, 0);
	}

	stop(){
		if(!this.tween){
			return;
		}
		this.tween.stop();
		this.tween = null;
		this.t = 0;
	}

	pause(){
		if(!this.tween){
			return;
		}
		
		this.tween.stop();
		TWEEN.remove(this.tween);
		this.tween = null;
	}

	resume(){
		this.start(true);
	}

	getPoint(t){
		return this.path.spline.getPoint(t);
	}

}

export class AnimationPath{
	constructor (points = []) {
		this.points = points;
		this.spline = new THREE.CatmullRomCurve3(points);
		//this.spline.reparametrizeByArcLength(1 / this.spline.getLength().total);
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

		let samples = 500;
		let i = 0;
		for (let u = 0; u <= 1; u += 1 / samples) {
			let position = this.spline.getPoint(u);
			geometry.vertices[i] = new THREE.Vector3(position.x, position.y, position.z);

			i++;
		}

		if(this.closed){
			let position = this.spline.getPoint(0);
			geometry.vertices[i] = new THREE.Vector3(position.x, position.y, position.z);
		}

		return geometry;
	}

	get closed(){
		return this.spline.closed;
	}

	set closed(value){
		this.spline.closed = value;
	}

}