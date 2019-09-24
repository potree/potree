/**
 * @author mschuetz / http://mschuetz.at
 *
 * adapted from THREE.OrbitControls by
 *
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 *
 *
 *
 */
 
Potree.RotationControls = class RotationControls extends THREE.EventDispatcher{
	
	constructor(viewer){
		super();
		
		this.viewer = viewer;
		this.renderer = viewer.renderer;

		this.scene = null;
		this.sceneControls = new THREE.Scene();

		this.rotationSpeed = 5;

		this.fadeFactor = 10;
		this.yawDelta = 0;
		this.radiusDelta = 0;
		this.panDelta = new THREE.Vector2(0, 0);

		this.minRadius = 5;
		this.maxRadius = 300;

		this.enabled = true;

		this.tweens = [];

		let drag = (e) => {
			if (e.drag.object !== null) {
				return;
			}

			if (e.drag.startHandled === undefined) {
				e.drag.startHandled = true;

				this.dispatchEvent({type: 'start'});
			}

			let ndrag = {
				x: e.drag.lastDrag.x / this.renderer.domElement.clientWidth,
				y: e.drag.lastDrag.y / this.renderer.domElement.clientHeight
			};

			if (e.drag.mouse === Potree.MOUSE.LEFT) {
				this.yawDelta += ndrag.x * this.rotationSpeed;
				this.radiusDelta = 0;

				this.navigationCallback();

				this.stopTweens();
			} else if (e.drag.mouse === Potree.MOUSE.RIGHT) {
				this.panDelta.x += ndrag.x;
				this.panDelta.y += ndrag.y;
				
				this.navigationCallback();

				this.stopTweens();
			}
		};

		let drop = e => {
			this.dispatchEvent({type: 'end'});
		};

		let scroll = (e) => {
			let resolvedRadius = this.scene.views[0].radius + this.radiusDelta;

			this.radiusDelta += -e.delta * resolvedRadius * 0.1;
			this.yawDelta = 0;
			this.panDelta.set(0, 0);

			this.navigationCallback();

			this.stopTweens();
		};

		let previousTouch = null;
		let touchStart = e => {
			previousTouch = e;
		};

		let touchEnd = e => {
			previousTouch = e;
		};

		let touchMove = e => {
			if (e.touches.length === 2 && previousTouch.touches.length === 2){
				let prev = previousTouch;
				let curr = e;

				let prevDX = prev.touches[0].pageX - prev.touches[1].pageX;
				let prevDY = prev.touches[0].pageY - prev.touches[1].pageY;
				let prevDist = Math.sqrt(prevDX * prevDX + prevDY * prevDY);

				let currDX = curr.touches[0].pageX - curr.touches[1].pageX;
				let currDY = curr.touches[0].pageY - curr.touches[1].pageY;
				let currDist = Math.sqrt(currDX * currDX + currDY * currDY);

				let delta = currDist / prevDist;
				let resolvedRadius = this.scene.views[0].radius + this.radiusDelta;
				let newRadius = resolvedRadius / delta;
				this.radiusDelta = newRadius - resolvedRadius;

				this.navigationCallback();

				this.stopTweens();
			}

			previousTouch = e;
		};

		this.addEventListener('touchstart', touchStart);
		this.addEventListener('touchend', touchEnd);
		this.addEventListener('touchmove', touchMove);
		this.addEventListener('drag', drag);
		this.addEventListener('drop', drop);
		this.addEventListener('mousewheel', scroll);
	}

	setScene (scene) {
		this.scene = scene;
	}

	stop(){
		this.yawDelta = 0;
		this.radiusDelta = 0;
		this.panDelta.set(0, 0);
	}

	stopTweens () {
		this.tweens.forEach(e => e.stop());
		this.tweens = [];
	}

	navigationCallback() {
		if (this.viewer.navigationCallback && (this.yawDelta !== 0 || this.radiusDelta !== 0 || this.panDelta.x !== 0)) {
			const { radiusDelta, yawDelta } = this;
			this.viewer.navigationCallback({
				radiusDelta,
				yawDelta,
			});
		}
	}

	updateYaw (yaw) {
		const view = this.scene.views[0];
		const yawMove = view.yaw - yaw;
		this.pivot = this.scene.pointclouds[0].boundingBox.getCenter();

		if (yaw < -Math.PI) {
			yaw += 2 * Math.PI;
		} else
		if (yaw > Math.PI) {
			yaw -= 2 * Math.PI;
		}
		
		view.yaw = yaw;

		let pivotToCam = new THREE.Vector3().subVectors(view.position, this.pivot);
		let pivotToCamTarget = new THREE.Vector3().subVectors(view.getPivot(), this.pivot);

		pivotToCam.applyAxisAngle(new THREE.Vector3(0, 0, 1), -yawMove);
		pivotToCamTarget.applyAxisAngle(new THREE.Vector3(0, 0, 1), -yawMove);

		let newCam = new THREE.Vector3().addVectors(this.pivot, pivotToCam);

		view.position.copy(newCam);
	}

	update (delta) {
		let view = this.scene.views[0];

		if (!this.enabled) {
			return false;
		}

		const toFixed = value => +value.toFixed(3);

		const fixedRadiusDelta = toFixed(this.radiusDelta);
		const fixedYawDelta = toFixed(this.yawDelta);
		const fixedPanDelta = new THREE.Vector3(toFixed(this.panDelta.x), toFixed(this.panDelta.y));
		if (fixedRadiusDelta !== 0) {
			this.panDelta.set(0, 0);
			this.yawDelta = 0;
		} else
		if (fixedYawDelta !== 0) {
			this.panDelta.set(0, 0);
			this.radiusDelta = 0;
		} else
		if (fixedPanDelta.x !== 0 || fixedPanDelta.y !== 0) {
			this.radiusDelta = 0;
			this.yawDelta = 0;
		}

		{ // apply rotation
			if (fixedYawDelta) {
				let progression = Math.min(1, this.fadeFactor * delta);

				this.updateYaw(view.yaw - (progression * fixedYawDelta));
			}
		}

		{ // apply pan
			if (fixedPanDelta.x || fixedPanDelta.y) {
				let progression = Math.min(1, this.fadeFactor * delta);
				let panDistance = progression * view.radius * 2;

				let px = -fixedPanDelta.x * panDistance;
				let py = fixedPanDelta.y * (panDistance * 0.2);

				view.pan(px, py);

				if (this.viewerToSync) {
					this.viewerToSync.scene.view.pan(px, 0);
				}
			}
		}

		{ // apply zoom
			let progression = Math.min(1, this.fadeFactor * delta);

			// let radius = view.radius + progression * this.radiusDelta * view.radius * 0.1;
			let radius = view.radius + progression * this.radiusDelta;

			// Limit zoom in / out
			radius = radius < this.minRadius ? this.minRadius : radius;
			radius = radius > this.maxRadius ? this.maxRadius : radius;

			view.radius = radius;
		}

		{
			let speed = view.radius / 2.5;
			this.viewer.setMoveSpeed(speed);
		}

		{ // decelerate over time
			let progression = Math.min(1, this.fadeFactor * delta);
			let attenuation = Math.max(0, 1 - this.fadeFactor * delta);
			this.panDelta.multiplyScalar(attenuation);

			this.yawDelta *= attenuation;
			this.radiusDelta -= progression * this.radiusDelta;
		}
	}
};
