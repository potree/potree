

import { MOUSE } from "../defines.js";
import { Utils } from "../utils.js";
import { EventDispatcher } from "../EventDispatcher.js";

export class EarthControls extends EventDispatcher {
	constructor(viewer) {
		super(viewer);

		this.viewer = viewer;
		this.renderer = viewer.renderer;

		this.scene = null;
		this.sceneControls = new THREE.Scene();

		this.rotationSpeed = 10;

		this.keys = {
			FORWARD: [38],
			BACKWARD: [40],
			LEFT: [37],
			RIGHT: [39],
			UP: [16, 38],
			DOWN: [16, 40],
			YAWR: [18, 39],
			YAWL: [18, 37],
			PITCHUP: [18, 38],
			PITCHDOWN: [18, 40]
		}

		this.fadeFactor = 20;
		this.wheelDelta = 0;
		this.zoomDelta = new THREE.Vector3();
		this.yawDelta = 0
		this.pitchDelta = 0
		this.radiusDelta = 0
		this.translationDelta = new THREE.Vector3(0, 0, 0)
		this.translationWorldDelta = new THREE.Vector3(0, 0, 0)
		this.camStart = null

		this.tweens = [];

		{
			let sg = new THREE.SphereGeometry(1, 16, 16);
			let sm = new THREE.MeshNormalMaterial();
			this.pivotIndicator = new THREE.Mesh(sg, sm);
			this.pivotIndicator.visible = false;
			this.sceneControls.add(this.pivotIndicator);
		}

		let drag = (e) => {
			if (e.drag.object !== null) {
				return;
			}

			if (!this.pivot) {
				return;
			}

			if (e.drag.startHandled === undefined) {
				e.drag.startHandled = true;

				this.dispatchEvent({ type: 'start' });
			}

			let camStart = this.camStart;
			let view = this.viewer.scene.view;

			// let camera = this.viewer.scene.camera;
			let mouse = e.drag.end;
			let domElement = this.viewer.renderer.domElement;

			if (e.drag.mouse === MOUSE.LEFT) {

				let ray = Utils.mouseToRay(mouse, camStart, domElement.clientWidth, domElement.clientHeight);
				let plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
					new THREE.Vector3(0, 0, 1),
					this.pivot);

				let distanceToPlane = ray.distanceToPlane(plane);

				if (distanceToPlane > 0) {
					let I = new THREE.Vector3().addVectors(
						camStart.position,
						ray.direction.clone().multiplyScalar(distanceToPlane));

					let movedBy = new THREE.Vector3().subVectors(
						I, this.pivot);

					let newCamPos = camStart.position.clone().sub(movedBy);

					view.position.copy(newCamPos);

					{
						let distance = newCamPos.distanceTo(this.pivot);
						view.radius = distance;
						let speed = view.radius / 2.5;
						this.viewer.setMoveSpeed(speed);
					}
				}
			} else if (e.drag.mouse === MOUSE.RIGHT) {
				let ndrag = {
					x: e.drag.lastDrag.x / this.renderer.domElement.clientWidth,
					y: e.drag.lastDrag.y / this.renderer.domElement.clientHeight
				};

				let yawDelta = -ndrag.x * this.rotationSpeed * 0.5;
				let pitchDelta = -ndrag.y * this.rotationSpeed * 0.2;

				let originalPitch = view.pitch;
				let tmpView = view.clone();
				tmpView.pitch = tmpView.pitch + pitchDelta;
				pitchDelta = tmpView.pitch - originalPitch;

				let pivotToCam = new THREE.Vector3().subVectors(view.position, this.pivot);
				let pivotToCamTarget = new THREE.Vector3().subVectors(view.getPivot(), this.pivot);
				let side = view.getSide();

				pivotToCam.applyAxisAngle(side, pitchDelta);
				pivotToCamTarget.applyAxisAngle(side, pitchDelta);

				pivotToCam.applyAxisAngle(new THREE.Vector3(0, 0, 1), yawDelta);
				pivotToCamTarget.applyAxisAngle(new THREE.Vector3(0, 0, 1), yawDelta);

				let newCam = new THREE.Vector3().addVectors(this.pivot, pivotToCam);
				// TODO: Unused: let newCamTarget = new THREE.Vector3().addVectors(this.pivot, pivotToCamTarget);

				view.position.copy(newCam);
				view.yaw += yawDelta;
				view.pitch += pitchDelta;
			}
		};

		let onMouseDown = e => {
			let I = Utils.getMousePointCloudIntersection(
				e.mouse,
				this.scene.getActiveCamera(),
				this.viewer,
				this.scene.pointclouds,
				{ pickClipped: false });

			if (I) {
				this.pivot = I.location;
				this.camStart = this.scene.getActiveCamera().clone();
				this.pivotIndicator.visible = true;
				this.pivotIndicator.position.copy(I.location);
			}
		};

		let drop = e => {
			this.dispatchEvent({ type: 'end' });
		};

		let onMouseUp = e => {
			this.camStart = null;
			this.pivot = null;
			this.pivotIndicator.visible = false;
		};

		let scroll = (e) => {
			this.wheelDelta += e.delta;
		};

		let dblclick = (e) => {
			this.zoomToLocation(e.mouse);
		};
		let previousTouch = null
		const touchStart = (e) => {
			previousTouch = e
		}

		const touchEnd = (e) => {
			previousTouch = e
		}

		const touchMove = (e) => {
			if (e.touches.length === 2 && previousTouch.touches.length === 2) {
				const prev = previousTouch
				const curr = e

				const prevDX = prev.touches[0].pageX - prev.touches[1].pageX
				const prevDY = prev.touches[0].pageY - prev.touches[1].pageY
				const prevDist = Math.sqrt(prevDX * prevDX + prevDY * prevDY)

				const currDX = curr.touches[0].pageX - curr.touches[1].pageX
				const currDY = curr.touches[0].pageY - curr.touches[1].pageY
				const currDist = Math.sqrt(currDX * currDX + currDY * currDY)

				const delta = currDist / prevDist
				const resolvedRadius = this.scene.view.radius + this.radiusDelta
				const newRadius = resolvedRadius / delta
				this.radiusDelta = newRadius - resolvedRadius

				this.stopTweens()
			} else if (e.touches.length === 3 && previousTouch.touches.length === 3) {
				const prev = previousTouch
				const curr = e

				const prevMeanX = (prev.touches[0].pageX + prev.touches[1].pageX + prev.touches[2].pageX) / 3
				const prevMeanY = (prev.touches[0].pageY + prev.touches[1].pageY + prev.touches[2].pageY) / 3

				const currMeanX = (curr.touches[0].pageX + curr.touches[1].pageX + curr.touches[2].pageX) / 3
				const currMeanY = (curr.touches[0].pageY + curr.touches[1].pageY + curr.touches[2].pageY) / 3

				const delta = {
					x: (currMeanX - prevMeanX) / this.renderer.domElement.clientWidth,
					y: (currMeanY - prevMeanY) / this.renderer.domElement.clientHeight
				}

				this.panDelta.x += delta.x
				this.panDelta.y += delta.y

				this.stopTweens()
			}

			previousTouch = e
		}

		this.addEventListener('drag', drag)
		this.addEventListener('drop', drop)
		this.addEventListener('mousewheel', scroll)
		this.addEventListener('mousedown', onMouseDown)
		this.addEventListener('mouseup', onMouseUp)
		this.addEventListener('dblclick', dblclick)
		this.addEventListener('touchstart', touchStart)
		this.addEventListener('touchend', touchEnd)
		this.addEventListener('touchmove', touchMove)
	}

	setScene(scene) {
		this.scene = scene;
	}

	stop() {
		this.wheelDelta = 0;
		this.zoomDelta.set(0, 0, 0);
	}

	zoomToLocation(mouse) {
		let camera = this.scene.getActiveCamera();

		let I = Utils.getMousePointCloudIntersection(
			mouse,
			camera,
			this.viewer,
			this.scene.pointclouds);

		if (I === null) {
			return;
		}

		let targetRadius = 0;
		{
			let minimumJumpDistance = 0.2;

			let domElement = this.renderer.domElement;
			let ray = Utils.mouseToRay(mouse, camera, domElement.clientWidth, domElement.clientHeight);

			let nodes = I.pointcloud.nodesOnRay(I.pointcloud.visibleNodes, ray);
			let lastNode = nodes[nodes.length - 1];
			let radius = lastNode.getBoundingSphere(new THREE.Sphere()).radius;
			targetRadius = Math.min(this.scene.view.radius, radius);
			targetRadius = Math.max(minimumJumpDistance, targetRadius);
		}

		let d = this.scene.view.direction.multiplyScalar(-1);
		let cameraTargetPosition = new THREE.Vector3().addVectors(I.location, d.multiplyScalar(targetRadius));
		// TODO Unused: let controlsTargetPosition = I.location;

		let animationDuration = 600;
		let easing = TWEEN.Easing.Quartic.Out;

		{ // animate
			let value = { x: 0 };
			let tween = new TWEEN.Tween(value).to({ x: 1 }, animationDuration);
			tween.easing(easing);
			this.tweens.push(tween);

			let startPos = this.scene.view.position.clone();
			let targetPos = cameraTargetPosition.clone();
			let startRadius = this.scene.view.radius;
			let targetRadius = cameraTargetPosition.distanceTo(I.location);

			tween.onUpdate(() => {
				let t = value.x;
				this.scene.view.position.x = (1 - t) * startPos.x + t * targetPos.x;
				this.scene.view.position.y = (1 - t) * startPos.y + t * targetPos.y;
				this.scene.view.position.z = (1 - t) * startPos.z + t * targetPos.z;

				this.scene.view.radius = (1 - t) * startRadius + t * targetRadius;
				this.viewer.setMoveSpeed(this.scene.view.radius / 2.5);
			});

			tween.onComplete(() => {
				this.tweens = this.tweens.filter(e => e !== tween);
			});

			tween.start();
		}
	}

	stopTweens() {
		this.tweens.forEach(e => e.stop())
		this.tweens = []
	}

	update(delta) {
		let view = this.scene.view;
		let fade = Math.pow(0.5, this.fadeFactor * delta);
		let progression = 1 - fade;
		let camera = this.scene.getActiveCamera();
		{ // accelerate while input is given
			const ih = this.viewer.inputHandler
			const moveForward = this.keys.FORWARD.every(e => ih.pressedKeys[e]) && Object.keys(ih.pressedKeys).length === 1
			const moveBackward = this.keys.BACKWARD.every(e => ih.pressedKeys[e]) && Object.keys(ih.pressedKeys).length === 1
			const moveLeft = this.keys.LEFT.every(e => ih.pressedKeys[e]) && Object.keys(ih.pressedKeys).length === 1
			const moveRight = this.keys.RIGHT.every(e => ih.pressedKeys[e]) && Object.keys(ih.pressedKeys).length === 1
			const moveUp = this.keys.UP.every(e => ih.pressedKeys[e])
			const moveDown = this.keys.DOWN.every(e => ih.pressedKeys[e])
			const yawRight = this.keys.YAWR.every(e => ih.pressedKeys[e])
			const yawLeft = this.keys.YAWL.every(e => ih.pressedKeys[e])
			const pitchUp = this.keys.PITCHUP.every(e => ih.pressedKeys[e])
			const pitchDown = this.keys.PITCHDOWN.every(e => ih.pressedKeys[e])

			if (this.lockElevation) {
				const dir = view.direction
				dir.z = 0
				dir.normalize()

				if (moveForward && moveBackward) {
					this.translationWorldDelta.set(0, 0, 0)
				} else if (moveForward) {
					this.translationWorldDelta.copy(dir.multiplyScalar(this.viewer.getMoveSpeed()))
				} else if (moveBackward) {
					this.translationWorldDelta.copy(dir.multiplyScalar(-this.viewer.getMoveSpeed()))
				}
			} else if (moveForward && moveBackward) {
				this.translationDelta.y = 0
			} else if (moveForward) {
				this.translationDelta.y = this.viewer.getMoveSpeed()
			} else if (moveBackward) {
				this.translationDelta.y = -this.viewer.getMoveSpeed()
			}

			if (moveLeft && moveRight) {
				this.translationDelta.x = 0
			} else if (moveLeft) {
				this.translationDelta.x = -this.viewer.getMoveSpeed()
			} else if (moveRight) {
				this.translationDelta.x = this.viewer.getMoveSpeed()
			}

			if (moveUp && moveDown) {
				this.translationWorldDelta.z = 0
			} else if (moveUp) {
				this.translationWorldDelta.z = this.viewer.getMoveSpeed()
			} else if (moveDown) {
				this.translationWorldDelta.z = -this.viewer.getMoveSpeed()
			}
			if (yawRight) {
				this.yawDelta += 0.2
			} else if (yawLeft) {
				this.yawDelta -= 0.2
			}
			if (pitchUp) {
				this.pitchDelta += 0.2
			} else if (pitchDown) {
				this.pitchDelta -= 0.2
			}
		}
		{ // apply rotation
			let yaw = view.yaw
			let pitch = view.pitch

			yaw -= this.yawDelta * delta
			pitch -= this.pitchDelta * delta

			view.yaw = yaw
			view.pitch = pitch
		}
		// apply translation
		view.translate(
			this.translationDelta.x * delta,
			this.translationDelta.y * delta,
			this.translationDelta.z * delta
		)
		view.translateWorld(
			this.translationWorldDelta.x * delta,
			this.translationWorldDelta.y * delta,
			this.translationWorldDelta.z * delta
		)
		// compute zoom
		if (this.wheelDelta !== 0) {
			let I = Utils.getMousePointCloudIntersection(
				this.viewer.inputHandler.mouse,
				this.scene.getActiveCamera(),
				this.viewer,
				this.scene.pointclouds);

			if (I) {
				let resolvedPos = new THREE.Vector3().addVectors(view.position, this.zoomDelta);
				let distance = I.location.distanceTo(resolvedPos);
				let jumpDistance = distance * 0.2 * this.wheelDelta;
				let targetDir = new THREE.Vector3().subVectors(I.location, view.position);
				targetDir.normalize();

				resolvedPos.add(targetDir.multiplyScalar(jumpDistance));
				this.zoomDelta.subVectors(resolvedPos, view.position);

				{
					let distance = resolvedPos.distanceTo(I.location);
					view.radius = distance;
					let speed = view.radius / 2.5;
					this.viewer.setMoveSpeed(speed);
				}
			}
		}

		// apply zoom
		if (this.zoomDelta.length() !== 0) {
			let p = this.zoomDelta.clone().multiplyScalar(progression);

			let newPos = new THREE.Vector3().addVectors(view.position, p);
			view.position.copy(newPos);
		}

		if (this.pivotIndicator.visible) {
			let distance = this.pivotIndicator.position.distanceTo(view.position);
			let pixelwidth = this.renderer.domElement.clientwidth;
			let pixelHeight = this.renderer.domElement.clientHeight;
			let pr = Utils.projectedRadius(1, camera, distance, pixelwidth, pixelHeight);
			let scale = (10 / pr);
			this.pivotIndicator.scale.set(scale, scale, scale);
		}

		// decelerate over time
		{
			this.zoomDelta.multiplyScalar(fade)
			this.wheelDelta = 0

			const attenuation = Math.max(0, 1 - this.fadeFactor * delta)
			this.yawDelta *= attenuation
			this.pitchDelta *= attenuation
			this.translationDelta.multiplyScalar(attenuation)
			this.translationWorldDelta.multiplyScalar(attenuation)
		}
	}
};
