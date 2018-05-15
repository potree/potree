
import {OrbitControls} from "../navigation/OrbitControls.js";

export class View{
	constructor () {
		this.position = new THREE.Vector3(0, 0, 0);

		this.yaw = Math.PI / 4;
		this._pitch = -Math.PI / 4;
		this.radius = 1;

		this.maxPitch = Math.PI / 2;
		this.minPitch = -Math.PI / 2;

		this.navigationMode = OrbitControls;
	}

	clone () {
		let c = new View();
		c.yaw = this.yaw;
		c._pitch = this.pitch;
		c.radius = this.radius;
		c.maxPitch = this.maxPitch;
		c.minPitch = this.minPitch;
		c.navigationMode = this.navigationMode;

		return c;
	}

	get pitch () {
		return this._pitch;
	}

	set pitch (angle) {
		this._pitch = Math.max(Math.min(angle, this.maxPitch), this.minPitch);
	}

	get direction () {
		let dir = new THREE.Vector3(0, 1, 0);

		dir.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
		dir.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.yaw);

		return dir;
	}

	set direction (dir) {

		//if(dir.x === dir.y){
		if(dir.x === 0 && dir.y === 0){
			this.pitch = Math.PI / 2 * Math.sign(dir.z);
		}else{
			let yaw = Math.atan2(dir.y, dir.x) - Math.PI / 2;
			let pitch = Math.atan2(dir.z, Math.sqrt(dir.x * dir.x + dir.y * dir.y));

			this.yaw = yaw;
			this.pitch = pitch;
		}
		
	}

	lookAt(t){
		let V;
		if(arguments.length === 1){
			V = new THREE.Vector3().subVectors(t, this.position);
		}else if(arguments.length === 3){
			V = new THREE.Vector3().subVectors(new THREE.Vector3(...arguments), this.position);
		}

		let radius = V.length();
		let dir = V.normalize();

		this.radius = radius;
		this.direction = dir;
	}

	getPivot () {
		return new THREE.Vector3().addVectors(this.position, this.direction.multiplyScalar(this.radius));
	}

	getSide () {
		let side = new THREE.Vector3(1, 0, 0);
		side.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.yaw);

		return side;
	}

	pan (x, y) {
		let dir = new THREE.Vector3(0, 1, 0);
		dir.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
		dir.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.yaw);

		// let side = new THREE.Vector3(1, 0, 0);
		// side.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.yaw);

		let side = this.getSide();

		let up = side.clone().cross(dir);

		let pan = side.multiplyScalar(x).add(up.multiplyScalar(y));

		this.position = this.position.add(pan);
		// this.target = this.target.add(pan);
	}

	translate (x, y, z) {
		let dir = new THREE.Vector3(0, 1, 0);
		dir.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
		dir.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.yaw);

		let side = new THREE.Vector3(1, 0, 0);
		side.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.yaw);

		let up = side.clone().cross(dir);

		let t = side.multiplyScalar(x)
			.add(dir.multiplyScalar(y))
			.add(up.multiplyScalar(z));

		this.position = this.position.add(t);
	}

	translateWorld (x, y, z) {
		this.position.x += x;
		this.position.y += y;
		this.position.z += z;
	}
};
