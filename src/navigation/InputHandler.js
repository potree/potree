/**
 * @author mschuetz / http://mschuetz.at
 *
 *
 */ 
Potree.InputHandler = class InputHandler extends THREE.EventDispatcher{
	
	constructor(renderer){
		super();
		
		this.renderer = renderer;
		this.domElement = renderer.domElement;
		
		this.enabled = true;
		
		this.scene = null;
		this.interactiveScenes = [];
		this.inputListeners = [];
		
		this.drag = null;
		this.mouse = new THREE.Vector2(0, 0);
		
		this.selection = [];
		
		this.hoveredElement = null;
		
		this.wheelDelta = 0;
		
		this.speed = 1;
		
		this.logMessages = true;
		
		this.domElement.addEventListener("contextmenu", (event) => { event.preventDefault(); }, false );
		this.domElement.addEventListener("click", this.onMouseClick.bind(this), false);
		this.domElement.addEventListener("mousedown", this.onMouseDown.bind(this), false);
		this.domElement.addEventListener("mouseup", this.onMouseUp.bind(this), false);
		this.domElement.addEventListener("mousemove", this.onMouseMove.bind(this), false);
		this.domElement.addEventListener("mousewheel", this.onMouseWheel.bind(this), false );
		this.domElement.addEventListener("DOMMouseScroll", this.onMouseWheel.bind(this), false ); // Firefox
		this.domElement.addEventListener("dblclick", this.onDoubleClick.bind(this));
		this.domElement.addEventListener("keydown", this.onKeyDown.bind(this));
		this.domElement.addEventListener("keyup", this.onKeyUp.bind(this));
	}
	
	addInputListener(listener){
		this.inputListeners.push(listener);
	}
	
	removeInputListener(listener){
		let index = this.inputListeners.indexOf(listener);
		
		if(index !== -1){
			this.inputListeners = this.inputListeners.splice(index, 1);
		}
	}
	
	onKeyDown(e){
		if(!this.enabled){ return; }
		
		if(this.logMessages) console.log(this.constructor.name + ": onKeyDown");
		
		e.preventDefault();
	}
	
	onKeyUp(e){
		if(!this.enabled){ return; }
		
		if(this.logMessages) console.log(this.constructor.name + ": onKeyUp");
		
		e.preventDefault();
	}
	
	onDoubleClick(e){
		if(!this.enabled){ return; }
		
		if(this.logMessages) console.log(this.constructor.name + ": onDoubleClick");
		
		e.preventDefault();
	}
	
	onMouseClick(e){
		if(!this.enabled){ return; }
		
		if(this.logMessages) console.log(this.constructor.name + ": onMouseClick");
		
		e.preventDefault();
	}
	
	onMouseDown(e){
		if(!this.enabled){ return; }
		
		if(this.logMessages) console.log(this.constructor.name + ": onMouseDown");
		
		e.preventDefault();
		
		let rect = this.domElement.getBoundingClientRect();
		
		let x = e.clientX - rect.left;
		let y = e.clientY - rect.top;
		
		let hovered = this.getHoveredElement();
		
		if(!this.drag){
			this.startDragging(hovered ? hovered.object : null);
			this.drag.mouse = e.button;
		}
		
		if(this.scene){
			this.viewStart = this.scene.view.clone();
		}
	}
	
	onMouseUp(e){
		if(!this.enabled){ return; }
		
		if(this.logMessages) console.log(this.constructor.name + ": onMouseUp");
		
		e.preventDefault();
		
		let noMovement = this.getNormalizedDrag().length() === 0; 
		
		if(e.button === THREE.MOUSE.LEFT){
			if(noMovement){
				if(this.hoveredElement){
					if(e.ctrlKey){
						this.toggleSelection(this.hoveredElement.object);
					}else{
						if(this.isSelected(this.hoveredElement.object)){
							
							this.selection
								.filter(e => e !== this.hoveredElement.object)
								.forEach(e => this.toggleSelection(e));
						}else{
							this.deselectAll();
							this.toggleSelection(this.hoveredElement.object);
						}
					}
					
					this.hoveredElement.object.dispatchEvent({
						type: "click"
					});
				}else{
					this.deselectAll();
				}
			}
		}else if(event.button === THREE.MOUSE.RIGHT){
			this.deselectAll();
		}
		
		if(this.drag){
			if(this.drag.object){
				this.drag.object.dispatchEvent({
					type: "drop",
					drag: this.drag
				});
			}
			
			this.drag = null;
		}
	 }
	 
	onMouseMove(e){
		if(!this.enabled){ return; }
		
		e.preventDefault();
		
		let rect = this.domElement.getBoundingClientRect();
		let x = e.clientX - rect.left;
		let y = e.clientY - rect.top;
		this.mouse.set(x, y);
		
		if(this.drag){
			this.drag.mouse = e.button;
			
			this.drag.lastDrag.x = x - this.drag.end.x;
			this.drag.lastDrag.y = y - this.drag.end.y;
			
			this.drag.end.set(x, y);
			
			if(this.drag.object){
				this.drag.object.dispatchEvent({
					type: "drag",
					drag: this.drag
				});
			}else{
				for(let inputListener of this.inputListeners){
					inputListener.dispatchEvent({
						type: "drag",
						drag: this.drag
					});
				}
			}
		}
		
		let hovered = this.getHoveredElement();
		if(this.hoveredElement && this.hoveredElement !== hovered){
			this.hoveredElement.object.dispatchEvent({
				type: "mouseleave",
				object: this.hoveredElement.object
			});
		}
		if(hovered && hovered !== this.hoveredElement){
			hovered.object.dispatchEvent({
				type: "mouseover",
				object: hovered.object
			});
		}
	
		this.hoveredElement = hovered;
		
	}
	
	onMouseWheel(e){
		if(!this.enabled){ return; }
		
		e.preventDefault();
		
		let delta = 0;
		if( e.wheelDelta !== undefined ) { // WebKit / Opera / Explorer 9
			delta = e.wheelDelta;
		} else if ( e.detail !== undefined ) { // Firefox
			delta = -e.detail;
		}
		
		this.wheelDelta += Math.sign(delta);
	}
	
	startDragging(object){
		this.drag = {
			start: this.mouse.clone(),
			end: this.mouse.clone(),
			lastDrag: new THREE.Vector2(0, 0),
			startView: this.scene.view.clone(),
			object: object
		};
	}
	
	getMousePointCloudIntersection(mouse){
		return Potree.utils.getMousePointCloudIntersection(
			this.mouse, 
			this.scene.camera, 
			this.renderer, 
			this.scene.pointclouds);
	}
	
	toggleSelection(object){
		let index = this.selection.indexOf(object);
		
		if(index === -1){
			this.selection.push(object);
			this.hoveredElement.object.dispatchEvent({
				type: "select"
			});
		}else{
			this.selection.splice(index, 1);
			this.hoveredElement.object.dispatchEvent({
				type: "deselect"
			});
		}
	}
	
	deselectAll(){
		for(let object of this.selection){
			object.dispatchEvent({
				type: "deselect"
			});
		}
		
		this.selection = [];
	}
	
	isSelected(object){
		let index = this.selection.indexOf(object);
		
		return index !== -1;
	}
	
	registerInteractiveScene(scene){
		let index = this.interactiveScenes.indexOf(scene);
		if(index === -1){
			this.interactiveScenes.push(scene);
		}
	}
	
	unregisterInteractiveScene(scene){
		let index = this.interactiveScenes.indexOf(scene);
		if (index > -1) {
			this.interactiveScenes.splice(index, 1);
		}
	}
	
	getHoveredElement(){
		
		let scenes = this.interactiveScenes.concat(this.scene.scene);
	
		let interactableListeners = ["mouseover", "mouseleave", "drag", "drop", "click"];
		let interactables = [];
		for(let scene of scenes){
			scene.traverse(node => {
				if(node._listeners){
					let hasInteractableListener = interactableListeners.filter((e) => {
						return node._listeners[e] !== undefined
					}).length > 0;
					
					if(hasInteractableListener){
						interactables.push(node);
					}
				}
			});
		}
		
		let nmouse =  {
			x: (this.mouse.x / this.domElement.clientWidth ) * 2 - 1,
			y: - (this.mouse.y / this.domElement.clientHeight ) * 2 + 1
		};
		
		let vector = new THREE.Vector3( nmouse.x, nmouse.y, 0.5 );
		vector.unproject(this.scene.camera);
		
		let raycaster = new THREE.Raycaster();
		raycaster.ray.set( this.scene.camera.position, vector.sub( this.scene.camera.position ).normalize() );
		raycaster.linePrecision = 0.2;
		
		let intersections = raycaster.intersectObjects(interactables, true);
		
		if(intersections.length > 0){
			return intersections[0];
		}else{
			return null;
		}
	}
	
	setScene(scene){
		this.scene = scene;
	}
	
	setSpeed(value){
		if(this.speed !== value){
			this.speed = value;
			this.dispatchEvent( {
				type: "speed_changed",
				controls: this
			});
		}
	}
	
	update(delta){
		if(!this.enabled){
			return;
		}
	}
	
	updateFinished(){
		if(this.drag.lastDrag){
			this.drag.lastDrag.set(0, 0);
		}
		this.wheelDelta = 0;
	}
	
	getNormalizedDrag(){
		if(!this.drag){
			return new THREE.Vector2(0, 0);
		}
		
		let diff = new THREE.Vector2().subVectors(this.drag.end, this.drag.start);

		diff.x = diff.x / this.domElement.clientWidth;
		diff.y = diff.y / this.domElement.clientHeight;
		
		return diff;
	}
	
	getNormalizedLastDrag(){
		if(!this.drag){
			return new THREE.Vector2(0, 0);
		}
		
		let lastDrag = this.drag.lastDrag.clone();
		
		lastDrag.x = lastDrag.x / this.domElement.clientWidth;
		lastDrag.y = lastDrag.y / this.domElement.clientHeight;
		
		return lastDrag;
	}
	
	//zoomToLocation(mouse){
	//	let I = this.getMousePointCloudIntersection(mouse);
	//	
	//	if(I === null){
	//		return;
	//	}
	//	
	//	let nmouse =  {
	//		x: (mouse.x / this.domElement.clientWidth ) * 2 - 1,
	//		y: - (mouse.y / this.domElement.clientHeight ) * 2 + 1
	//	};
	//	
	//	let targetRadius = 0;
	//	{
	//		let minimumJumpDistance = 0.2;
	//		
	//		let vector = new THREE.Vector3( nmouse.x, nmouse.y, 0.5 );
	//		vector.unproject(this.scene.camera);
	//		
	//		let direction = vector.sub(this.scene.camera.position).normalize();
	//		let ray = new THREE.Ray(this.scene.camera.position, direction);
	//		
	//		let nodes = I.pointcloud.nodesOnRay(I.pointcloud.visibleNodes, ray);
	//		let lastNode = nodes[nodes.length - 1];
	//		let radius = lastNode.getBoundingSphere().radius;
	//		targetRadius = Math.min(this.scene.view.radius, radius);
	//		targetRadius = Math.max(minimumJumpDistance, targetRadius);
	//	}
	//	
	//	let d = this.scene.view.direction.multiplyScalar(-1);
	//	let cameraTargetPosition = new THREE.Vector3().addVectors(I.location, d.multiplyScalar(targetRadius));
	//	let controlsTargetPosition = I.location;
	//	
	//	let animationDuration = 600;
	//	let easing = TWEEN.Easing.Quartic.Out;
	//	
	//	this.enabled = false;
	//	
	//	{ // animate position
	//		let tween = new TWEEN.Tween(this.scene.view.position).to(cameraTargetPosition, animationDuration);
	//		tween.easing(easing);
	//		tween.start();
	//	}
	//	
	//	{ // animate target
	//		let pivot = this.scene.view.getPivot();
	//		let tween = new TWEEN.Tween(pivot).to(I.location, animationDuration);
	//		tween.easing(easing);
	//		tween.onUpdate(() => {
	//			this.scene.view.lookAt(pivot);
	//		});
	//		tween.onComplete(() => {
	//			this.enabled = true;
	//			
	//			this.dispatchEvent({
	//				type: "double_click_move",
	//				controls: this,
	//				position: cameraTargetPosition,
	//				targetLocation: I.location,
	//				targetPointcloud: I.pointcloud
	//			});
	//		});
	//		tween.start();
	//	}
	//	
	//}
	
};