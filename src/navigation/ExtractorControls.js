/**
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

Potree.ExtractorControls = class ExtractorControls extends THREE.EventDispatcher{
	
	constructor(viewer, index){
		super();
		
		this.viewer = viewer;
		this.index = index;
		this.renderer = viewer.renderers[index];

		this.scene = null;
		this.sceneControls = new THREE.Scene();

		this.rotationSpeed = 5;
		this.panSpeed = 0.3;

		this.minRadius = 0.3;
		this.maxRadius = 300;

		this.fadeFactor = 10;
		this.yawDelta = 0;
		this.pitchDelta = 0;
		this.panDelta = new THREE.Vector2(0, 0);
		this.radiusDelta = 0;
		this.view = viewer.scene.views[this.index];

		this.oppositeIndex = index === 1 ? 0 : 1;
		this.oppositeView = viewer.scene.views[this.oppositeIndex];

		this.callback = () => {};
		this.onYawChange = () => {};

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

				this.viewer.activeControls[this.oppositeIndex].yawDelta = this.yawDelta;

				this.stopTweens();
			} else if (e.drag.mouse === Potree.MOUSE.RIGHT) {
				this.panDelta.x += ndrag.x * this.panSpeed;
				this.panDelta.y += ndrag.y * this.panSpeed;

				this.viewer.activeControls[this.oppositeIndex].panDelta.x = this.panDelta.x;

				this.stopTweens();
			}
		};

		let drop = e => {
			this.dispatchEvent({type: 'end'});
		};

		let scroll = (e) => {
			let resolvedRadius = this.scene.views[index].radius + this.radiusDelta;

			this.radiusDelta += -e.delta * resolvedRadius * 0.1;
			this.viewer.activeControls[this.oppositeIndex].radiusDelta = this.radiusDelta;

			this.stopTweens();
		};

		let dblclick = (e) => {
			this.zoomToLocation(e.mouse);
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
				let resolvedRadius = this.scene.views[index].radius + this.radiusDelta;
				let newRadius = resolvedRadius / delta;
				this.radiusDelta = newRadius - resolvedRadius;

				this.stopTweens();
			}else if(e.touches.length === 3 && previousTouch.touches.length === 3){
				let prev = previousTouch;
				let curr = e;

				let prevMeanX = (prev.touches[0].pageX + prev.touches[1].pageX + prev.touches[2].pageX) / 3;
				let prevMeanY = (prev.touches[0].pageY + prev.touches[1].pageY + prev.touches[2].pageY) / 3;

				let currMeanX = (curr.touches[0].pageX + curr.touches[1].pageX + curr.touches[2].pageX) / 3;
				let currMeanY = (curr.touches[0].pageY + curr.touches[1].pageY + curr.touches[2].pageY) / 3;

				let delta = {
					x: (currMeanX - prevMeanX) / this.renderer.domElement.clientWidth,
					y: (currMeanY - prevMeanY) / this.renderer.domElement.clientHeight
				};

				this.panDelta.x += delta.x;
				this.panDelta.y += delta.y;

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
		this.addEventListener('dblclick', dblclick);
	}

	setScene (scene) {
		this.scene = scene;
	}

	stop(){
		this.yawDelta = 0;
		this.pitchDelta = 0;
		this.radiusDelta = 0;
		this.panDelta.set(0, 0);
	}
	
	zoomToLocation(mouse){
		let camera = this.scene.getActiveCamera();
		
		let I = Potree.utils.getMousePointCloudIntersection(
			mouse,
			camera,
			this.viewer,
			this.scene.pointclouds,
			{pickClipped: true});

		if (I === null) {
			return;
		}

		const view = this.view;

		let targetRadius = 0;
		{
			let minimumJumpDistance = 0.2;

			let domElement = this.renderer.domElement;
			let ray = Potree.utils.mouseToRay(mouse, camera, domElement.clientWidth, domElement.clientHeight);

			let nodes = I.pointcloud.nodesOnRay(I.pointcloud.visibleNodes, ray);
			let lastNode = nodes[nodes.length - 1];
			let radius = lastNode.getBoundingSphere().radius;
			targetRadius = Math.min(view.radius, radius);
			targetRadius = Math.max(minimumJumpDistance, targetRadius);
		}

		let d = view.direction.multiplyScalar(-1);
		let cameraTargetPosition = new THREE.Vector3().addVectors(I.location, d.multiplyScalar(targetRadius));
		// TODO Unused: let controlsTargetPosition = I.location;

		let animationDuration = 600;
		let easing = TWEEN.Easing.Quartic.Out;

		{ // animate
			let value = {x: 0};
			let tween = new TWEEN.Tween(value).to({x: 1}, animationDuration);
			tween.easing(easing);
			this.tweens.push(tween);

			let startPos = view.position.clone();
			let targetPos = cameraTargetPosition.clone();
			let startRadius = view.radius;
			let targetRadius = cameraTargetPosition.distanceTo(I.location);

			tween.onUpdate(() => {
				let t = value.x;
				view.position.x = (1 - t) * startPos.x + t * targetPos.x;
				view.position.y = (1 - t) * startPos.y + t * targetPos.y;
				view.position.z = (1 - t) * startPos.z + t * targetPos.z;

				view.radius = (1 - t) * startRadius + t * targetRadius;
				this.viewer.setMoveSpeed(view.radius / 2.5);
			});

			tween.onComplete(() => {
				this.tweens = this.tweens.filter(e => e !== tween);
			});

			tween.start();
		}
	}

	stopTweens () {
		this.tweens.forEach(e => e.stop());
		this.tweens = [];
	}

	updateYaw (yaw) {
		const view = this.view;
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

	isViewMoving() {
		return this.yawDelta ||
			this.radiusDelta ||
			this.panDelta.x ||
			this.panDelta.y;
	}

	update (delta) {
		let view = this.view;

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
			if (!this.scene.pointclouds.length) return;

			let progression = Math.min(1, this.fadeFactor * delta);

			this.updateYaw(view.yaw - (progression * this.yawDelta));
		}

		{ // apply pan
			let progression = Math.min(1, this.fadeFactor * delta);
			let panDistance = progression * view.radius * 3;

			let px = -this.panDelta.x * panDistance;
			let py = this.panDelta.y * panDistance;

			view.pan(px, py);
		}

		{ // apply zoom
			let progression = Math.min(1, this.fadeFactor * delta);

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

		if (this.isViewMoving()) {
			this.callback();
		}

		if (this.yawDelta) {
			this.onYawChange();
		}

		{ // decelerate over time
			let progression = Math.min(1, this.fadeFactor * delta);
			let attenuation = Math.max(0, 1 - this.fadeFactor * delta);

			this.yawDelta *= attenuation;
			this.pitchDelta *= attenuation;
			this.panDelta.multiplyScalar(attenuation);
			this.radiusDelta -= progression * this.radiusDelta;
		}
	}
};
