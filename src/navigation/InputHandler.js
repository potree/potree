/**
 * @author mschuetz / http://mschuetz.at
 *
 *
 */
Potree.InputHandler = class InputHandler extends THREE.EventDispatcher {
	constructor (viewer) {
		super();

		this.viewer = viewer;
		this.renderer = viewer.renderer;
		this.domElement = this.renderer.domElement;
		this.enabled = true;

		this.scene = null;
		this.interactiveScenes = [];
		this.inputListeners = [];

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

		for (let inputListener of this.inputListeners) {
			inputListener.dispatchEvent({
				type: e.type,
				touches: e.touches,
				changedTouches: e.changedTouches
			});
		}
	}

	onTouchEnd (e) {
		if (this.logMessages) console.log(this.constructor.name + ': onTouchEnd');

		e.preventDefault();

		for (let inputListener of this.inputListeners) {
			inputListener.dispatchEvent({
				type: 'drop',
				drag: this.drag,
				viewer: this.viewer
			});
		}

		this.drag = null;

		for (let inputListener of this.inputListeners) {
			inputListener.dispatchEvent({
				type: e.type,
				touches: e.touches,
				changedTouches: e.changedTouches
			});
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
				for (let inputListener of this.inputListeners) {
					inputListener.dispatchEvent({
						type: 'drag',
						drag: this.drag,
						viewer: this.viewer
					});
				}
			}
		}

		for (let inputListener of this.inputListeners) {
			inputListener.dispatchEvent({
				type: e.type,
				touches: e.touches,
				changedTouches: e.changedTouches
			});
		}

		// DEBUG CODE
		// let debugTouches = [...e.touches, {
		//	pageX: this.domElement.clientWidth / 2,
		//	pageY: this.domElement.clientHeight / 2}];
		// for(let inputListener of this.inputListeners){
		//	inputListener.dispatchEvent({
		//		type: e.type,
		//		touches: debugTouches,
		//		changedTouches: e.changedTouches
		//	});
		// }
	}

	onKeyDown (e) {
		if (this.logMessages) console.log(this.constructor.name + ': onKeyDown');

		if (e.keyCode === 46 && this.selection.length > 0) {
			// DELETE
			this.dispatchEvent({
				type: 'delete',
				selection: this.selection
			});

			this.deselectAll();
		}

		this.dispatchEvent({
			type: 'keydown',
			keyCode: e.keyCode,
			event: e
		});

		// for(let l of this.inputListeners){
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
		for (let hovered of this.hoveredElements) {
			if (hovered._listeners && hovered._listeners['dblclick']) {
				hovered.object.dispatchEvent({
					type: 'dblclick',
					mouse: this.mouse,
					object: hovered.object
				});
				consumed = true;
				break;
			}
		}

		if (!consumed) {
			for (let inputListener of this.inputListeners) {
				inputListener.dispatchEvent({
					type: 'dblclick',
					mouse: this.mouse,
					object: null
				});
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

		if (this.hoveredElements.length === 0) {
			for (let inputListener of this.inputListeners) {
				inputListener.dispatchEvent({
					type: 'mousedown',
					viewer: this.viewer,
					mouse: this.mouse
				});
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

		if (this.hoveredElements.length === 0) {
			for (let inputListener of this.inputListeners) {
				inputListener.dispatchEvent({
					type: 'mouseup',
					viewer: this.viewer,
					mouse: this.mouse
				});
			}
		}

		if (this.drag) {
			if (this.drag.object) {
				this.drag.object.dispatchEvent({
					type: 'drop',
					drag: this.drag,
					viewer: this.viewer

				});
			} else {
				if (this.logMessages) console.log(this.constructor.name + ': drop: ');
				for (let inputListener of this.inputListeners) {
					inputListener.dispatchEvent({
						type: 'drop',
						drag: this.drag,
						viewer: this.viewer
					});
				}
			}

			this.drag = null;
		}
	}

	onMouseMove (e) {
		if (this.logMessages) console.log(this.constructor.name + ': onMouseMove');

		e.preventDefault();

		let rect = this.domElement.getBoundingClientRect();
		let x = e.clientX - rect.left;
		let y = e.clientY - rect.top;
		this.mouse.set(x, y);

		if (this.drag) {
			this.drag.mouse = e.buttons;

			this.drag.lastDrag.x = x - this.drag.end.x;
			this.drag.lastDrag.y = y - this.drag.end.y;

			this.drag.end.set(x, y);

			if (this.drag.object) {
				if (this.logMessages) console.log(this.constructor.name + ': drag: ' + this.drag.object.name);
				this.drag.object.dispatchEvent({
					type: 'drag',
					drag: this.drag,
					viewer: this.viewer
				});
			} else {
				if (this.logMessages) console.log(this.constructor.name + ': drag: ');
				for (let inputListener of this.inputListeners) {
					inputListener.dispatchEvent({
						type: 'drag',
						drag: this.drag,
						viewer: this.viewer
					});
				}
			}
		}

		let hoveredElements = this.getHoveredElements();
		let currentlyHoveredObjects = hoveredElements.map(e => e.object);
		let previouslyHoveredObjects = this.hoveredElements.map(e => e.object);

		let now = currentlyHoveredObjects.find(e => (e._listeners && e._listeners['mouseover']));
		let prev = previouslyHoveredObjects.find(e => (e._listeners && e._listeners['mouseover']));

		if (now !== prev) {
			if (now) {
				now.dispatchEvent({
					type: 'mouseover',
					object: now
				});
			}

			if (prev) {
				prev.dispatchEvent({
					type: 'mouseleave',
					object: prev
				});
			}
		}

		// let justHovered = currentlyHoveredObjects
		//	.filter(e => previouslyHoveredObjects.indexOf(e) === -1);
		// let justUnhovered = previouslyHoveredObjects
		//	.filter(e => currentlyHoveredObjects.indexOf(e) === -1);
		//
		// justHovered = justHovered.find(e => (e._listeners && e._listeners["mouseover"]));
		// justUnhovered = justUnhovered.find(e => (e._listeners && e._listeners["mouseover"]));

		// let over = justHovered.find(e => (e._listeners && e._listeners["mouseover"]));
		// if(over){
		//	over.dispatchEvent({
		//		type: "mouseover",
		//		object: over
		//	});
		// }
		//
		// let leave = justUnhovered.find(e => (e._listeners && e._listeners["mouseleave"]));
		// if(leave){
		//	leave.dispatchEvent({
		//		type: "mouseleave",
		//		object: leave
		//	});
		// }

		this.hoveredElements = hoveredElements;
	}

	onMouseWheel (e) {
		if (!this.enabled) {
			return;
		}

		if (this.logMessages) {
			console.log(`${this.constructor.name}: onMouseWheel`);
		}

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
			this.hoveredElement.object.dispatchEvent({
				type: 'mousewheel',
				delta: ndelta,
				object: this.hoveredElement.object
			});
		} else {
			for (let inputListener of this.inputListeners) {
				inputListener.dispatchEvent({
					type: 'mousewheel',
					delta: ndelta,
					object: null
				});
			}
		}
	}

	startDragging (object, args = null) {
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
		return Potree.utils.getMousePointCloudIntersection(
			this.mouse,
			this.scene.getActiveCamera(),
			this.renderer,
			this.scene.pointclouds);
	}

	toggleSelection (object) {
		let oldSelection = this.selection;

		let index = this.selection.indexOf(object);

		if (index === -1) {
			this.selection.push(object);
			object.dispatchEvent({
				type: 'select'
			});
		} else {
			this.selection.splice(index, 1);
			object.dispatchEvent({
				type: 'deselect'
			});
		}

		this.dispatchEvent({
			type: 'selection_changed',
			oldSelection: oldSelection,
			selection: this.selection
		});
	}

	deselectAll () {
		for (let object of this.selection) {
			object.dispatchEvent({
				type: 'deselect'
			});
		}

		let oldSelection = this.selection;

		if (this.selection.length > 0) {
			this.selection = [];
			this.dispatchEvent({
				type: 'selection_changed',
				oldSelection: oldSelection,
				selection: this.selection
			});
		}
	}

	isSelected (object) {
		let index = this.selection.indexOf(object);

		return index !== -1;
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

		let interactableListeners = ['mouseover', 'mouseleave', 'drag', 'drop', 'click', 'select', 'deselect'];
		let interactables = [];
		for (let scene of scenes) {
			scene.traverseVisible(node => {
				if (node._listeners && node.visible) {
					let hasInteractableListener = interactableListeners.filter((e) => {
						return node._listeners[e] !== undefined;
					}).length > 0;

					if (hasInteractableListener) {
						interactables.push(node);
					}
				}
			});
		}

		let nmouse = {
			x: (this.mouse.x / this.domElement.clientWidth) * 2 - 1,
			y: -(this.mouse.y / this.domElement.clientHeight) * 2 + 1
		};

		let vector = new THREE.Vector3(nmouse.x, nmouse.y, 0.5);
		let camera = this.scene.getActiveCamera();
		vector.unproject(camera);

		let raycaster = new THREE.Raycaster();
		raycaster.ray.set(camera.position, vector.sub(camera.position).normalize());
		raycaster.linePrecision = 0.2;

		let intersections = raycaster.intersectObjects(interactables, false);

		return intersections;

		// if(intersections.length > 0){
		//	return intersections[0];
		// }else{
		//	return null;
		// }
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
};
