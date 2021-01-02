
import * as THREE from "../../libs/three.js/build/three.module.js";

export class SpotLightHelper extends THREE.Object3D{

	constructor(light, color){
		super();

		this.light = light;
		this.color = color;

		//this.up.set(0, 0, 1);
		this.updateMatrix();
		this.updateMatrixWorld();

		{ // SPHERE
			let sg = new THREE.SphereGeometry(1, 32, 32);
			let sm = new THREE.MeshNormalMaterial();
			this.sphere = new THREE.Mesh(sg, sm);
			this.sphere.scale.set(0.5, 0.5, 0.5);
			this.add(this.sphere);
		}

		{ // LINES
			

			let positions = new Float32Array([
				+0, +0, +0,     +0, +0, -1,

				+0, +0, +0,     -1, -1, -1,
				+0, +0, +0,     +1, -1, -1,
				+0, +0, +0,     +1, +1, -1,
				+0, +0, +0,     -1, +1, -1,

				-1, -1, -1,     +1, -1, -1,
				+1, -1, -1,     +1, +1, -1,
				+1, +1, -1,     -1, +1, -1,
				-1, +1, -1,     -1, -1, -1,
			]);

			let geometry = new THREE.BufferGeometry();
			geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

			let material = new THREE.LineBasicMaterial();

			this.frustum = new THREE.LineSegments(geometry, material);
			this.add(this.frustum);

		}

		this.update();
	}

	update(){

		this.light.updateMatrix();
		this.light.updateMatrixWorld();

		let position = this.light.position;
		let target = new THREE.Vector3().addVectors(
			this.light.position, this.light.getWorldDirection(new THREE.Vector3()).multiplyScalar(-1));
		
		let quat = new THREE.Quaternion().setFromRotationMatrix(
			new THREE.Matrix4().lookAt( position, target, new THREE.Vector3( 0, 0, 1 ) )
		);

		this.setRotationFromQuaternion(quat);
		this.position.copy(position);


		let coneLength = (this.light.distance > 0) ? this.light.distance : 1000;
		let coneWidth = coneLength * Math.tan( this.light.angle * 0.5 );

		this.frustum.scale.set(coneWidth, coneWidth, coneLength);

	}

}