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

		this.minRadius = 20;
		this.maxRadius = 600;

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
			}
		};

		let drop = e => {
			this.dispatchEvent({type: 'end'});
		};

		let scroll = (e) => {
			let resolvedRadius = this.scene.view.radius + this.radiusDelta;

			this.radiusDelta += -e.delta * resolvedRadius * 0.1;
			this.yawDelta = 0;

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
				let resolvedRadius = this.scene.view.radius + this.radiusDelta;
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
	}

	stopTweens () {
		this.tweens.forEach(e => e.stop());
		this.tweens = [];
	}

	navigationCallback() {
		if (this.viewer.navigationCallback && (this.yawDelta !== 0 || this.radiusDelta !== 0)) {
			const { yawDelta, radiusDelta } = this;
			this.viewer.navigationCallback({
				yawDelta, radiusDelta,
			});
		}
	}

	update (delta) {
		let view = this.scene.view;

		if (!this.viewer.rotationControls.enabled) {
			return false;
		}

		const fixedRadiusDelta = Math.floor(this.radiusDelta * 1000) / 1000;
		const fixedYawDelta = Math.floor(this.yawDelta * 1000) / 1000;
		if (fixedRadiusDelta !== 0) {
			this.yawDelta = 0;
		} else
		if (fixedYawDelta !== 0) {
			this.radiusDelta = 0;
		}

		{ // apply rotation
			let progression = Math.min(1, this.fadeFactor * delta);

			let yaw = view.yaw;
			let pivot = view.getPivot();

			yaw -= progression * this.yawDelta;

			if (yaw < -Math.PI && this.yawDelta > 0) {
				yaw = Math.PI;
			}
			if (yaw > Math.PI && this.yawDelta < 0) {
				yaw = -Math.PI;
			}

			view.yaw = yaw;

			let V = this.scene.view.direction.multiplyScalar(-view.radius);
			let position = new THREE.Vector3().addVectors(pivot, V);

			view.position.copy(position);
		}

		{ // apply zoom
			let progression = Math.min(1, this.fadeFactor * delta);

			// let radius = view.radius + progression * this.radiusDelta * view.radius * 0.1;
			let radius = view.radius + progression * this.radiusDelta;

			// Limit zoom in / out
			radius = radius < this.minRadius ? this.minRadius : radius;
			radius = radius > this.maxRadius ? this.maxRadius : radius;

			let V = view.direction.multiplyScalar(-radius);
			let position = new THREE.Vector3().addVectors(view.getPivot(), V);
			view.radius = radius;

			view.position.copy(position);
		}

		{
			let speed = view.radius / 2.5;
			this.viewer.setMoveSpeed(speed);
		}

		{ // decelerate over time
			let progression = Math.min(1, this.fadeFactor * delta);
			let attenuation = Math.max(0, 1 - this.fadeFactor * delta);

			this.yawDelta *= attenuation;
			this.radiusDelta -= progression * this.radiusDelta;
		}
	}
};
