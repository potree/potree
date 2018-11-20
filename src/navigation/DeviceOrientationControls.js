/**
 * @author chrisl / Geodan
 *
 * adapted from Potree.FirstPersonControls by
 *
 * @author mschuetz / http://mschuetz.at
 *
 * and THREE.DeviceOrientationControls  by
 *
 * @author richt / http://richt.me
 * @author WestLangley / http://github.com/WestLangley
 *
 *
 *
 */

import {EventDispatcher} from "../EventDispatcher.js";

export class DeviceOrientationControls extends EventDispatcher{
	constructor(viewer){
		super();

		this.viewer = viewer;
		this.renderer = viewer.renderer;

		this.scene = null;
		this.sceneControls = new THREE.Scene();

		this.screenOrientation = window.orientation || 0;

		let deviceOrientationChange = e => {
			this.deviceOrientation = e;
		};

		let screenOrientationChange = e => {
			this.screenOrientation = window.orientation || 0;
		};

		if ('ondeviceorientationabsolute' in window) {
			window.addEventListener('deviceorientationabsolute', deviceOrientationChange);
		} else if ('ondeviceorientation' in window) {
			window.addEventListener('deviceorientation', deviceOrientationChange);
		} else {
			console.warn("No device orientation found.");
		}
		// window.addEventListener('deviceorientation', deviceOrientationChange);
		window.addEventListener('orientationchange', screenOrientationChange);
	}

	setScene (scene) {
		this.scene = scene;
	}

	update (delta) {
		let computeQuaternion = function (alpha, beta, gamma, orient) {
			let quaternion = new THREE.Quaternion();

			let zee = new THREE.Vector3(0, 0, 1);
			let euler = new THREE.Euler();
			let q0 = new THREE.Quaternion();

			euler.set(beta, gamma, alpha, 'ZXY');
			quaternion.setFromEuler(euler);
			quaternion.multiply(q0.setFromAxisAngle(zee, -orient));

			return quaternion;
		};

		if (typeof this.deviceOrientation !== 'undefined') {
			let alpha = this.deviceOrientation.alpha ? THREE.Math.degToRad(this.deviceOrientation.alpha) : 0;
			let beta = this.deviceOrientation.beta ? THREE.Math.degToRad(this.deviceOrientation.beta) : 0;
			let gamma = this.deviceOrientation.gamma ? THREE.Math.degToRad(this.deviceOrientation.gamma) : 0;
			let orient = this.screenOrientation ? THREE.Math.degToRad(this.screenOrientation) : 0;

			let quaternion = computeQuaternion(alpha, beta, gamma, orient);
			viewer.scene.cameraP.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
		}
	}
};
