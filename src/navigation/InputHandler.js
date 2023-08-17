/**
 * @author mschuetz / http://mschuetz.at
 *
 *
 */

import * as THREE from  'three';
import {KeyCodes} from "../KeyCodes.js";
import {Utils} from "../utils.js";
import {EventDispatcher} from "../EventDispatcher.js";
import { Subject } from 'rxjs';

export class InputHandler extends EventDispatcher {
	constructor (viewer) {
		super();

		this.viewer = viewer;
		this.renderer = viewer.renderer;
		this.domElement = this.renderer.domElement;
		this.enabled = true;
		
		this._subject = new Subject();
		this.events$ = this._subject.asObservable();

		this.scene = null;
		this.interactiveScenes = [];
		this.interactiveObjects = new Set();
		this.inputListeners = [];
		this.blacklist = new Set();

		this.drag = null;
		this.mouse = new THREE.Vector2(0, 0);

		this.selection = [];

		this.hoveredElements = [];
		this.pressedKeys = {};

		this.wheelDelta = 0;

		this.speed = 1;

		this.logMessages = false;

		if (this.domElement.tabIndex === -1) {
			this.domElement.tabIndex = 2222;
		}

		this.domElement.addEventListener('contextmenu', (event) => { event.preventDefault(); }, false);
		this.domElement.addEventListener('click', this.onMouseClick.bind(this), false);
		this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this), false);
		this.domElement.addEventListener('mouseup', this.onMouseUp.bind(this), false);
		this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this), false);
		this.domElement.addEventListener('mousewheel', this.onMouseWheel.bind(this), false);
		this.domElement.addEventListener('DOMMouseScroll', this.onMouseWheel.bind(this), false); // Firefox
		this.domElement.addEventListener('dblclick', this.onDoubleClick.bind(this));
		this.domElement.addEventListener('keydown', this.onKeyDown.bind(this));
		this.domElement.addEventListener('keyup', this.onKeyUp.bind(this));
		this.domElement.addEventListener('touchstart', this.onTouchStart.bind(this));
		this.domElement.addEventListener('touchend', this.onTouchEnd.bind(this));
		this.domElement.addEventListener('touchmove', this.onTouchMove.bind(this));
	}

	addInputListener (listener) {
		this.inputListeners.push(listener);
	}

	removeInputListener (listener) {
		this.inputListeners = this.inputListeners.filter(e => e !== listener);
	}

	getSortedListeners(){
		return this.inputListeners.sort( (a, b) => {
			let ia = (a.importance !== undefined) ? a.importance : 0;
			let ib = (b.importance !== undefined) ? b.importance : 0;

			return ib - ia;
		});
	}

	onTouchStart (e) {
		if (this.logMessages) console.log(this.constructor.name + ': onTouchStart');

		e.preventDefault();

		if (e.touches.length === 1) {
			let rect = this.domElement.getBoundingClientRect();
			let x = e.touches[0].pageX - rect.left;
			let y = e.touches[0].pageY - rect.top;
			this.mouse.set(x, y);

			this.startDragging(null);
		}

		const event = {
			type: e.type,
			touches: e.touches,
			changedTouches: e.changedTouches
		};
		this._subject.next(event);
		for (let inputListener of this.getSortedListeners()) {
			inputListener.dispatchEvent(event);
		}
	}

	onTouchEnd (e) {
		if (this.logMessages) console.log(this.constructor.name + ': onTouchEnd');

		e.preventDefault();

		const event1 = {
			type: 'drop',
			drag: this.drag,
			viewer: this.viewer
		};
		this._subject.next(event1);
		for (let inputListener of this.getSortedListeners()) {
			inputListener.dispatchEvent(event1);
		}

		this.drag = null;

		const event2 = {
			type: e.type,
			touches: e.touches,
			changedTouches: e.changedTouches
		};
		for (let inputListener of this.getSortedListeners()) {
			inputListener.dispatchEvent(event2);
		}
	}

	onTouchMove (e) {
		if (this.logMessages) console.log(this.constructor.name + ': onTouchMove');

		e.preventDefault();

		if (e.touches.length === 1) {
			let rect = this.domElement.getBoundingClientRect();
			let x = e.touches[0].pageX - rect.left;
			let y = e.touches[0].pageY - rect.top;
			this.mouse.set(x, y);

			if (this.drag) {
				this.drag.mouse = 1;

				this.drag.lastDrag.x = x - this.drag.end.x;
				this.drag.lastDrag.y = y - this.drag.end.y;

				this.drag.end.set(x, y);

				if (this.logMessages) console.log(this.constructor.name + ': drag: ');
				const event = {
					type: 'drag',
					drag: this.drag,
					viewer: this.viewer
				};
				this._subject.next(event);
				for (let inputListener of this.getSortedListeners()) {
					inputListener.dispatchEvent(event);
				}
			}
		}

		const event = {
			type: e.type,
			touches: e.touches,
			changedTouches: e.changedTouches
		};
		this._subject.next(event);
		for (let inputListener of this.getSortedListeners()) {
			inputListener.dispatchEvent(event);
		}

		// DEBUG CODE
		// let debugTouches = [...e.touches, {
		//	pageX: this.domElement.clientWidth / 2,
		//	pageY: this.domElement.clientHeight / 2}];
		// for(let inputListener of this.getSortedListeners()){
		//	inputListener.dispatchEvent({
		//		type: e.type,
		//		touches: debugTouches,
		//		changedTouches: e.changedTouches
		//	});
		// }
	}

	onKeyDown (e) {
		if (this.logMessages) console.log(this.constructor.name + ': onKeyDown');

		// DELETE
		const event1 = {
			type: 'delete',
			selection: this.selection
		};
		this._subject.next(event);
		if (e.keyCode === KeyCodes.DELETE && this.selection.length > 0) {
			this.dispatchEvent(event);
			this.deselectAll();
		}

		const event2 = {
			type: 'keydown',
			keyCode: e.keyCode,
			event: e
		};
		this.dispatchEvent(event2);

		// for(let l of this.getSortedListeners()){
		//	l.dispatchEvent({
		//		type: "keydown",
		//		keyCode: e.keyCode,
		//		event: e
		//	});
		// }

		this.pressedKeys[e.keyCode] = true;

		// e.preventDefault();
	}

	onKeyUp (e) {
		if (this.logMessages) console.log(this.constructor.name + ': onKeyUp');

		delete this.pressedKeys[e.keyCode];

		e.preventDefault();
	}

	onDoubleClick (e) {
		if (this.logMessages) console.log(this.constructor.name + ': onDoubleClick');

		let consumed = false;
		const event = {
			type: 'dblclick',
			mouse: this.mouse
		};
		event.objects = this.hoveredElements
			.filter(hovered => hovered._listeners && hovered._listeners['dblclick'])
			.map(hovered => hovered.object); 
		this._subject.next(event);
		delete event.objects;

		for (let hovered of this.hoveredElements) {
			if (hovered._listeners && hovered._listeners['dblclick']) {
				event.object = hovered.object;
				hovered.object.dispatchEvent(event);
				consumed = true;
				break;
			}
		}

		if (!consumed) {
			const event = {
				type: 'dblclick',
				mouse: this.mouse,
				object: null
			};
			this._subject.next(event);
			for (let inputListener of this.getSortedListeners()) {
				inputListener.dispatchEvent(event);
			}
		}

		e.preventDefault();
	}

	onMouseClick (e) {
		if (this.logMessages) console.log(this.constructor.name + ': onMouseClick');

		e.preventDefault();
	}

	onMouseDown (e) {
		if (this.logMessages) console.log(this.constructor.name + ': onMouseDown');

		e.preventDefault();

		let consumed = false;
		let consume = () => { return consumed = true; };
		if (this.hoveredElements.length === 0) {
			const event = {
				type: 'mousedown',
				viewer: this.viewer,
				mouse: this.mouse
			};
			this._subject.next(event);
			for (let inputListener of this.getSortedListeners()) {
				inputListener.dispatchEvent(event);
			}
		}else{
			const event = {
				type: 'mousedown',
				viewer: this.viewer,
				consume: consume
			};
			this._subject.next(event);
			for(let hovered of this.hoveredElements){
				let object = hovered.object;
				object.dispatchEvent(event);

				if(consumed){
					break;
				}
			}
		}

		if (!this.drag) {
			let target = this.hoveredElements
				.find(el => (
					el.object._listeners &&
					el.object._listeners['drag'] &&
					el.object._listeners['drag'].length > 0));

			if (target) {
				this.startDragging(target.object, {location: target.point});
			} else {
				this.startDragging(null);
			}
		}

		if (this.scene) {
			this.viewStart = this.scene.view.clone();
		}
	}

	onMouseUp (e) {
		if (this.logMessages) console.log(this.constructor.name + ': onMouseUp');

		e.preventDefault();

		let noMovement = this.getNormalizedDrag().length() === 0;

		
		let consumed = false;
		let consume = () => { return consumed = true; };
		if (this.hoveredElements.length === 0) {
			const event = {
				type: 'mouseup',
				viewer: this.viewer,
				mouse: this.mouse,
				consume: consume
			};
			this._subject.next(event);
			for (let inputListener of this.getSortedListeners()) {
				inputListener.dispatchEvent(event);

				if(consumed){
					break;
				}
			}
		}else{
			let hovered = this.hoveredElements
				.map(e => e.object)
				.find(e => (e._listeners && e._listeners['mouseup']));
			if(hovered){
				const event = {
					type: 'mouseup',
					viewer: this.viewer,
					consume: consume
				};
				this._subject.next(event);
				hovered.dispatchEvent(event);
			}
		}

		if (this.drag) {
			if (this.drag.object) {
				if (this.logMessages) console.log(`${this.constructor.name}: drop ${this.drag.object.name}`);
				const event = {
					type: 'drop',
					drag: this.drag,
					viewer: this.viewer
				};
				this._subject.next(event);
				this.drag.object.dispatchEvent(event);
			} else {
				const event = {
					type: 'drop',
					drag: this.drag,
					viewer: this.viewer
				};
				this._subject.next(event);
				for (let inputListener of this.getSortedListeners()) {
					inputListener.dispatchEvent(event);
				}
			}

			// check for a click
			let clicked = this.hoveredElements.map(h => h.object).find(v => v === this.drag.object) !== undefined;
			if(clicked){
				if (this.logMessages) console.log(`${this.constructor.name}: click ${this.drag.object.name}`);
				const event = {
					type: 'click',
					viewer: this.viewer,
					consume: consume,
				};
				this._subject.next(event);
				this.drag.object.dispatchEvent(event);
			}

			this.drag = null;
		}

		if(!consumed){
			if (e.button === THREE.MOUSE.LEFT) {
				if (noMovement) {
					let selectable = this.hoveredElements
						.find(el => el.object._listeners && el.object._listeners['select']);

					if (selectable) {
						selectable = selectable.object;

						if (this.isSelected(selectable)) {
							this.selection
								.filter(e => e !== selectable)
								.forEach(e => this.toggleSelection(e));
						} else {
							this.deselectAll();
							this.toggleSelection(selectable);
						}
					} else {
						this.deselectAll();
					}
				}
			} else if ((e.button === THREE.MOUSE.RIGHT) && noMovement) {
				this.deselectAll();
			}
		}
	}

	onMouseMove (e) {
		e.preventDefault();

		let rect = this.domElement.getBoundingClientRect();
		let x = e.clientX - rect.left;
		let y = e.clientY - rect.top;
		this.mouse.set(x, y);

		let hoveredElements = this.getHoveredElements();
		if(hoveredElements.length > 0){
			let names = hoveredElements.map(h => h.object.name).join(", ");
			if (this.logMessages) console.log(`${this.constructor.name}: onMouseMove; hovered: '${names}'`);
		}

		if (this.drag) {
			this.drag.mouse = e.buttons;

			this.drag.lastDrag.x = x - this.drag.end.x;
			this.drag.lastDrag.y = y - this.drag.end.y;

			this.drag.end.set(x, y);

			if (this.drag.object) {
				if (this.logMessages) console.log(this.constructor.name + ': drag: ' + this.drag.object.name);
				const event = {
					type: 'drag',
					drag: this.drag,
					viewer: this.viewer
				};
				this._subject.next(event);
				this.drag.object.dispatchEvent(event);
			} else {
				if (this.logMessages) console.log(this.constructor.name + ': drag: ');

				let dragConsumed = false;
				const event = {
					type: 'drag',
					drag: this.drag,
					viewer: this.viewer,
					consume: () => {dragConsumed = true;}
				};
				this._subject.next(event);
				for (let inputListener of this.getSortedListeners()) {
					inputListener.dispatchEvent(event);

					if(dragConsumed){
						break;
					}
				}
			}
		}else{
			let curr = hoveredElements.map(a => a.object).find(a => true);
			let prev = this.hoveredElements.map(a => a.object).find(a => true);

			if(curr !== prev){
				if(curr){
					if (this.logMessages) console.log(`${this.constructor.name}: mouseover: ${curr.name}`);
					const event = {
						type: 'mouseover',
						object: curr
					};
					this._subject.next(event);
					curr.dispatchEvent(event);
				}
				if(prev){
					if (this.logMessages) console.log(`${this.constructor.name}: mouseleave: ${prev.name}`);
					const event = {
						type: 'mouseleave',
						object: prev
					};
					this._subject.next(event);
					prev.dispatchEvent(event);
				}
			}

			if(hoveredElements.length > 0){
				let object = hoveredElements
					.map(e => e.object)
					.find(e => (e._listeners && e._listeners['mousemove']));
				
				if(object){
					const event = {
						type: 'mousemove',
						object: object
					};
					this._subject.next(event);
					object.dispatchEvent(event);
				}
			}

		}
		
		// for (let inputListener of this.getSortedListeners()) {
		// 	inputListener.dispatchEvent({
		// 		type: 'mousemove',
		// 		object: null
		// 	});
		// }
		

		this.hoveredElements = hoveredElements;
	}
	
	onMouseWheel(e){
		if(!this.enabled) return;

		if(this.logMessages) console.log(this.constructor.name + ": onMouseWheel");
		
		e.preventDefault();

		let delta = 0;
		if (e.wheelDelta !== undefined) { // WebKit / Opera / Explorer 9
			delta = e.wheelDelta;
		} else if (e.detail !== undefined) { // Firefox
			delta = -e.detail;
		}

		let ndelta = Math.sign(delta);

		// this.wheelDelta += Math.sign(delta);

		if (this.hoveredElement) {
			const event = {
				type: 'mousewheel',
				delta: ndelta,
				object: this.hoveredElement.object
			};
			this._subject.next(event);
			this.hoveredElement.object.dispatchEvent(event);
		} else {
			const event = {
				type: 'mousewheel',
				delta: ndelta,
				object: null
			};
			this._subject.next(event);
			for (let inputListener of this.getSortedListeners()) {
				inputListener.dispatchEvent(event);
			}
		}
	}

	startDragging (object, args = null) {

		let name = object ? object.name : "no name";
		if (this.logMessages) console.log(`${this.constructor.name}: startDragging: '${name}'`);

		this.drag = {
			start: this.mouse.clone(),
			end: this.mouse.clone(),
			lastDrag: new THREE.Vector2(0, 0),
			startView: this.scene.view.clone(),
			object: object
		};

		if (args) {
			for (let key of Object.keys(args)) {
				this.drag[key] = args[key];
			}
		}
	}

	getMousePointCloudIntersection (mouse) {
		return Utils.getMousePointCloudIntersection(
			this.mouse, 
			this.scene.getActiveCamera(), 
			this.viewer, 
			this.scene.pointclouds);
	}

	toggleSelection (object) {
		let oldSelection = this.selection;

		let index = this.selection.indexOf(object);

		if (index === -1) {
			this.selection.push(object);
			const event = {
				type: 'select'
			};
			this._subject.next(event);
			object.dispatchEvent(event);
		} else {
			this.selection.splice(index, 1);
			const event = {
				type: 'deselect'
			};
			this._subject.next(event);
			object.dispatchEvent(event);
		}

		const event = {
			type: 'selection_changed',
			oldSelection: oldSelection,
			selection: this.selection
		};
		this._subject.next(event);
		this.dispatchEvent(event);
	}

	deselect(object){

		let oldSelection = this.selection;

		let index = this.selection.indexOf(object);

		if(index >= 0){
			this.selection.splice(index, 1);
			const event1 = {
				type: 'deselect'
			};
			this._subject.next(event1);
			object.dispatchEvent(event1);

			const event2 = {
				type: 'selection_changed',
				oldSelection: oldSelection,
				selection: this.selection
			};
			this._subject.next(event2);
			this.dispatchEvent(event2);
		}
	}

	deselectAll () {
		const event = {
			type: 'deselect'
		};
		event.objects = this.selection;
		this._subject.next(event);
		delete event.objects;
		for (let object of this.selection) {
			object.dispatchEvent(event);
		}

		let oldSelection = this.selection;

		if (this.selection.length > 0) {
			this.selection = [];
			const event = {
				type: 'selection_changed',
				oldSelection: oldSelection,
				selection: this.selection
			};
			this._subject.next(event);
			this.dispatchEvent(event);
		}
	}

	isSelected (object) {
		let index = this.selection.indexOf(object);

		return index !== -1;
	}

	registerInteractiveObject(object){
		this.interactiveObjects.add(object);
	}

	removeInteractiveObject(object){
		this.interactiveObjects.delete(object);
	}

	registerInteractiveScene (scene) {
		let index = this.interactiveScenes.indexOf(scene);
		if (index === -1) {
			this.interactiveScenes.push(scene);
		}
	}

	unregisterInteractiveScene (scene) {
		let index = this.interactiveScenes.indexOf(scene);
		if (index > -1) {
			this.interactiveScenes.splice(index, 1);
		}
	}

	getHoveredElement () {
		let hoveredElements = this.getHoveredElements();
		if (hoveredElements.length > 0) {
			return hoveredElements[0];
		} else {
			return null;
		}
	}

	getHoveredElements () {
		let scenes = this.interactiveScenes.concat(this.scene.scene);

		let interactableListeners = ['mouseup', 'mousemove', 'mouseover', 'mouseleave', 'drag', 'drop', 'click', 'select', 'deselect'];
		let interactables = [];
		for (let scene of scenes) {
			scene.traverseVisible(node => {
				if (node._listeners && node.visible && !this.blacklist.has(node)) {
					let hasInteractableListener = interactableListeners.filter((e) => {
						return node._listeners[e] !== undefined;
					}).length > 0;

					if (hasInteractableListener) {
						interactables.push(node);
					}
				}
			});
		}
		
		let camera = this.scene.getActiveCamera();
		let ray = Utils.mouseToRay(this.mouse, camera, this.domElement.clientWidth, this.domElement.clientHeight);
		
		let raycaster = new THREE.Raycaster();
		raycaster.ray.set(ray.origin, ray.direction);
		raycaster.params.Line.threshold = 0.2;

		let intersections = raycaster.intersectObjects(interactables.filter(o => o.visible), false);

		return intersections;
	}

	setScene (scene) {
		this.deselectAll();

		this.scene = scene;
	}

	update (delta) {

	}

	getNormalizedDrag () {
		if (!this.drag) {
			return new THREE.Vector2(0, 0);
		}

		let diff = new THREE.Vector2().subVectors(this.drag.end, this.drag.start);

		diff.x = diff.x / this.domElement.clientWidth;
		diff.y = diff.y / this.domElement.clientHeight;

		return diff;
	}

	getNormalizedLastDrag () {
		if (!this.drag) {
			return new THREE.Vector2(0, 0);
		}

		let lastDrag = this.drag.lastDrag.clone();

		lastDrag.x = lastDrag.x / this.domElement.clientWidth;
		lastDrag.y = lastDrag.y / this.domElement.clientHeight;

		return lastDrag;
	}
}
