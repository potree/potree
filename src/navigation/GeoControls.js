
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
 * This set of controls performs first person navigation without mouse lock.
 * Instead, rotating the camera is done by dragging with the left mouse button.
 *
 * move: a/s/d/w or up/down/left/right
 * rotate: left mouse
 * pan: right mouse
 * change speed: mouse wheel
 *
 *
 */

import * as THREE from "../../libs/three.js/build/three.module.js";
import {EventDispatcher} from "../EventDispatcher.js";
import {KeyCodes} from "../KeyCodes.js";

export class GeoControls extends EventDispatcher{

	constructor(object, domElement){
		super();

		console.log("deprecated?");

		this.object = object;
		this.domElement = (domElement !== undefined) ? domElement : document;

		// Set to false to disable this control
		this.enabled = true;

		// Set this to a THREE.SplineCurve3 instance
		this.track = null;
		// position on track in intervall [0,1]
		this.trackPos = 0;

		this.rotateSpeed = 1.0;
		this.moveSpeed = 10.0;

		let rotateStart = new THREE.Vector2();
		let rotateEnd = new THREE.Vector2();
		let rotateDelta = new THREE.Vector2();

		let panStart = new THREE.Vector2();
		let panEnd = new THREE.Vector2();
		let panDelta = new THREE.Vector2();
		let panOffset = new THREE.Vector3();

		// TODO Unused: let offset = new THREE.Vector3();

		let phiDelta = 0;
		let thetaDelta = 0;
		let pan = new THREE.Vector3();

		this.shiftDown = false;

		let lastPosition = new THREE.Vector3();

		let STATE = { NONE: -1, ROTATE: 0, SPEEDCHANGE: 1, PAN: 2 };

		let state = STATE.NONE;

		// for reset
		this.position0 = this.object.position.clone();

		// events

		let changeEvent = { type: 'change' };
		let startEvent = { type: 'start' };
		let endEvent = { type: 'end' };

		this.domElement.addEventListener('contextmenu', (event) => { event.preventDefault(); }, false);
		this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this), false);
		this.domElement.addEventListener('mousewheel', this.onMouseWheel.bind(this), false);
		this.domElement.addEventListener('DOMMouseScroll', this.onMouseWheel.bind(this), false); // firefox

		this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this), false);
		this.domElement.addEventListener('mouseup', this.onMouseUp.bind(this), false);

		if (this.domElement.tabIndex === -1) {
			this.domElement.tabIndex = 2222;
		}
		this.domElement.addEventListener('keydown', this.onKeyDown.bind(this), false);
		this.domElement.addEventListener('keyup', this.onKeyUp.bind(this), false);

	}

	setTrack(track) {
		if (this.track !== track) {
			this.track = track;
			this.trackPos = null;
		}
	};

	setTrackPos(trackPos, _preserveRelativeRotation){
		// TODO Unused: let preserveRelativeRotation = _preserveRelativeRotation || false;

		let newTrackPos = Math.max(0, Math.min(1, trackPos));
		let oldTrackPos = this.trackPos || newTrackPos;

		let newTangent = this.track.getTangentAt(newTrackPos);
		let oldTangent = this.track.getTangentAt(oldTrackPos);

		if (newTangent.equals(oldTangent)) {
			// no change in direction
		} else {
			let tangentDiffNormal = new THREE.Vector3().crossVectors(oldTangent, newTangent).normalize();
			let angle = oldTangent.angleTo(newTangent);
			let rot = new THREE.Matrix4().makeRotationAxis(tangentDiffNormal, angle);
			let dir = this.object.getWorldDirection(new THREE.Vector3()).clone();
			dir = dir.applyMatrix4(rot);
			let target = new THREE.Vector3().addVectors(this.object.position, dir);
			this.object.lookAt(target);
			this.object.updateMatrixWorld();

			let event = {
				type: 'path_relative_rotation',
				angle: angle,
				axis: tangentDiffNormal,
				controls: this
			};
			this.dispatchEvent(event);
		}

		if (this.trackPos === null) {
			let target = new THREE.Vector3().addVectors(this.object.position, newTangent);
			this.object.lookAt(target);
		}

		this.trackPos = newTrackPos;

		// let pStart = this.track.getPointAt(oldTrackPos);
		// let pEnd = this.track.getPointAt(newTrackPos);
		// let pDiff = pEnd.sub(pStart);

		if (newTrackPos !== oldTrackPos) {
			let event = {
				type: 'move',
				translation: pan.clone()
			};
			this.dispatchEvent(event);
		}
	}

	stop(){
		
	}

	getTrackPos(){
		return this.trackPos;
	}

	rotateLeft(angle){
		thetaDelta -= angle;
	}

	rotateUp(angle){
		phiDelta -= angle;
	}

	// pass in distance in world space to move left
	panLeft(distance){
		let te = this.object.matrix.elements;

		// get X column of matrix
		panOffset.set(te[ 0 ], te[ 1 ], te[ 2 ]);
		panOffset.multiplyScalar(-distance);

		pan.add(panOffset);
	}

	// pass in distance in world space to move up
	panUp(distance){
		let te = this.object.matrix.elements;

		// get Y column of matrix
		panOffset.set(te[ 4 ], te[ 5 ], te[ 6 ]);
		panOffset.multiplyScalar(distance);

		pan.add(panOffset);
	}

	// pass in distance in world space to move forward
	panForward(distance){
		if (this.track) {
			this.setTrackPos(this.getTrackPos() - distance / this.track.getLength());
		} else {
			let te = this.object.matrix.elements;

			// get Y column of matrix
			panOffset.set(te[ 8 ], te[ 9 ], te[ 10 ]);
			// panOffset.set( te[ 8 ], 0, te[ 10 ] );
			panOffset.multiplyScalar(distance);

			pan.add(panOffset);
		}
	}

	pan(deltaX, deltaY){
		let element = this.domElement === document ? this.domElement.body : this.domElement;

		if (this.object.fov !== undefined) {
			// perspective
			let position = this.object.position;
			let offset = position.clone();
			let targetDistance = offset.length();

			// half of the fov is center to top of screen
			targetDistance *= Math.tan((this.object.fov / 2) * Math.PI / 180.0);

			// we actually don't use screenWidth, since perspective camera is fixed to screen height
			this.panLeft(2 * deltaX * targetDistance / element.clientHeight);
			this.panUp(2 * deltaY * targetDistance / element.clientHeight);
		} else if (this.object.top !== undefined) {
			// orthographic
			this.panLeft(deltaX * (this.object.right - this.object.left) / element.clientWidth);
			this.panUp(deltaY * (this.object.top - this.object.bottom) / element.clientHeight);
		} else {
			// camera neither orthographic or perspective
			console.warn('WARNING: GeoControls.js encountered an unknown camera type - pan disabled.');
		}
	}

	update(delta){
		this.object.rotation.order = 'ZYX';

		let object = this.object;

		this.object = new THREE.Object3D();
		this.object.position.copy(object.position);
		this.object.rotation.copy(object.rotation);
		this.object.updateMatrix();
		this.object.updateMatrixWorld();

		let position = this.object.position;

		if (delta !== undefined) {
			let multiplier = this.shiftDown ? 4 : 1;
			if (this.moveRight) {
				this.panLeft(-delta * this.moveSpeed * multiplier);
			}
			if (this.moveLeft) {
				this.panLeft(delta * this.moveSpeed * multiplier);
			}
			if (this.moveForward || this.moveForwardMouse) {
				this.panForward(-delta * this.moveSpeed * multiplier);
			}
			if (this.moveBackward) {
				this.panForward(delta * this.moveSpeed * multiplier);
			}
			if (this.rotLeft) {
				this.rotateLeft(-0.5 * Math.PI * delta / this.rotateSpeed);
			}
			if (this.rotRight) {
				this.rotateLeft(0.5 * Math.PI * delta / this.rotateSpeed);
			}
			if (this.raiseCamera) {
				// this.rotateUp( -0.5 * Math.PI * delta / this.rotateSpeed );
				this.panUp(delta * this.moveSpeed * multiplier);
			}
			if (this.lowerCamera) {
				// this.rotateUp( 0.5 * Math.PI * delta / this.rotateSpeed );
				this.panUp(-delta * this.moveSpeed * multiplier);
			}
		}

		if (!pan.equals(new THREE.Vector3(0, 0, 0))) {
			let event = {
				type: 'move',
				translation: pan.clone()
			};
			this.dispatchEvent(event);
		}

		position.add(pan);

		if (!(thetaDelta === 0.0 && phiDelta === 0.0)) {
			let event = {
				type: 'rotate',
				thetaDelta: thetaDelta,
				phiDelta: phiDelta
			};
			this.dispatchEvent(event);
		}

		this.object.updateMatrix();
		let rot = new THREE.Matrix4().makeRotationY(thetaDelta);
		let res = new THREE.Matrix4().multiplyMatrices(rot, this.object.matrix);
		this.object.quaternion.setFromRotationMatrix(res);

		this.object.rotation.x += phiDelta;
		this.object.updateMatrixWorld();

		// send transformation proposal to listeners
		let proposeTransformEvent = {
			type: 'proposeTransform',
			oldPosition: object.position,
			newPosition: this.object.position,
			objections: 0,
			counterProposals: []
		};
		this.dispatchEvent(proposeTransformEvent);

		// check some counter proposals if transformation wasn't accepted
		if (proposeTransformEvent.objections > 0) {
			if (proposeTransformEvent.counterProposals.length > 0) {
				let cp = proposeTransformEvent.counterProposals;
				this.object.position.copy(cp[0]);

				proposeTransformEvent.objections = 0;
				proposeTransformEvent.counterProposals = [];
			}
		}

		// apply transformation, if accepted
		if (proposeTransformEvent.objections > 0) {

		} else {
			object.position.copy(this.object.position);
		}

		object.rotation.copy(this.object.rotation);

		this.object = object;

		thetaDelta = 0;
		phiDelta = 0;
		pan.set(0, 0, 0);

		if (lastPosition.distanceTo(this.object.position) > 0) {
			this.dispatchEvent(changeEvent);

			lastPosition.copy(this.object.position);
		}

		if (this.track) {
			let pos = this.track.getPointAt(this.trackPos);
			object.position.copy(pos);
		}
	}

	reset(){
		state = STATE.NONE;

		this.object.position.copy(this.position0);
	}

	onMouseDown(){
		if (this.enabled === false) return;
		event.preventDefault();

		if (event.button === 0) {
			state = STATE.ROTATE;

			rotateStart.set(event.clientX, event.clientY);
		} else if (event.button === 1) {
			state = STATE.PAN;

			panStart.set(event.clientX, event.clientY);
		} else if (event.button === 2) {
			// state = STATE.PAN;
			// panStart.set( event.clientX, event.clientY );
			this.moveForwardMouse = true;
		}

		// this.domElement.addEventListener( 'mousemove', onMouseMove, false );
		// this.domElement.addEventListener( 'mouseup', onMouseUp, false );
		this.dispatchEvent(startEvent);
	}

	onMouseMove(event){
		if (this.enabled === false) return;

		event.preventDefault();

		let element = this.domElement === document ? this.domElement.body : this.domElement;

		if (state === STATE.ROTATE) {
			rotateEnd.set(event.clientX, event.clientY);
			rotateDelta.subVectors(rotateEnd, rotateStart);

			// rotating across whole screen goes 360 degrees around
			this.rotateLeft(2 * Math.PI * rotateDelta.x / element.clientWidth * this.rotateSpeed);

			// rotating up and down along whole screen attempts to go 360, but limited to 180
			this.rotateUp(2 * Math.PI * rotateDelta.y / element.clientHeight * this.rotateSpeed);

			rotateStart.copy(rotateEnd);
		} else if (state === STATE.PAN) {
			panEnd.set(event.clientX, event.clientY);
			panDelta.subVectors(panEnd, panStart);
			// panDelta.multiplyScalar(this.moveSpeed).multiplyScalar(0.0001);
			panDelta.multiplyScalar(0.002).multiplyScalar(this.moveSpeed);

			this.pan(panDelta.x, panDelta.y);

			panStart.copy(panEnd);
		}
	}

	onMouseUp(event){
		if (this.enabled === false) return;

		// console.log(event.which);

		if (event.button === 2) {
			this.moveForwardMouse = false;
		} else {
			// this.domElement.removeEventListener( 'mousemove', onMouseMove, false );
			// this.domElement.removeEventListener( 'mouseup', onMouseUp, false );
			this.dispatchEvent(endEvent);
			state = STATE.NONE;
		}
	}

	onMouseWheel(event){
		if (this.enabled === false || this.noZoom === true) return;

		event.preventDefault();

		let direction = (event.detail < 0 || event.wheelDelta > 0) ? 1 : -1;
		let moveSpeed = this.moveSpeed + this.moveSpeed * 0.1 * direction;
		moveSpeed = Math.max(0.1, moveSpeed);

		this.setMoveSpeed(moveSpeed);

		this.dispatchEvent(startEvent);
		this.dispatchEvent(endEvent);
	}

	setMoveSpeed(value){
		if (this.moveSpeed !== value) {
			this.moveSpeed = value;
			this.dispatchEvent({
				type: 'move_speed_changed',
				controls: this
			});
		}
	}

	onKeyDown(event){
		if (this.enabled === false) return;

		this.shiftDown = event.shiftKey;

		switch (event.keyCode) {
			case KeyCodes.UP: this.moveForward = true; break;
			case KeyCodes.BOTTOM: this.moveBackward = true; break;
			case KeyCodes.LEFT: this.moveLeft = true; break;
			case KeyCodes.RIGHT: this.moveRight = true; break;
			case KeyCodes.W: this.moveForward = true; break;
			case KeyCodes.S: this.moveBackward = true; break;
			case KeyCodes.A: this.moveLeft = true; break;
			case KeyCodes.D: this.moveRight = true; break;
			case KeyCodes.Q: this.rotLeft = true; break;
			case KeyCodes.E: this.rotRight = true; break;
			case KeyCodes.R: this.raiseCamera = true; break;
			case KeyCodes.F: this.lowerCamera = true; break;
		}
	}

	onKeyUp(event){
		this.shiftDown = event.shiftKey;

		switch (event.keyCode) {
			case KeyCodes.W: this.moveForward = false; break;
			case KeyCodes.S: this.moveBackward = false; break;
			case KeyCodes.A: this.moveLeft = false; break;
			case KeyCodes.D: this.moveRight = false; break;
			case KeyCodes.UP: this.moveForward = false; break;
			case KeyCodes.BOTTOM: this.moveBackward = false; break;
			case KeyCodes.LEFT: this.moveLeft = false; break;
			case KeyCodes.RIGHT: this.moveRight = false; break;
			case KeyCodes.Q: this.rotLeft = false; break;
			case KeyCodes.E: this.rotRight = false; break;
			case KeyCodes.R: this.raiseCamera = false; break;
			case KeyCodes.F: this.lowerCamera = false; break;
		}
	}
}

