/**
 * @author mschuetz / http://mschuetz.at
 *
 *
 */
Potree.Controls = class{
	
	constructor(renderer){
		this.renderer = renderer;
		this.domElement = renderer.domElement;
		
		this.dispatcher = new THREE.EventDispatcher();

		this.enabled = true;
		
		this.scene = null;
		
		// x: [0, this.domElement.clientWidth]
		// y: [0, this.domElement.clientHeight]
		this.dragStart = null;
		this.dragEnd = null;
		this.lastDrag = null;
		this.viewStart = null;
		this.mouse = new THREE.Vector2(0, 0);
		
		this.wheelDelta = 0;
		
		this.speed = 1;
		
		this.domElement.addEventListener("contextmenu", (event) => { event.preventDefault(); }, false );
		this.domElement.addEventListener("mousedown", this.onMouseDown.bind(this), false);
		this.domElement.addEventListener("mouseup", this.onMouseUp.bind(this), false);
		this.domElement.addEventListener("mousemove", this.onMouseMove.bind(this), false);
		this.domElement.addEventListener("mousewheel", this.onMouseWheel.bind(this), false );
		this.domElement.addEventListener("DOMMouseScroll", this.onMouseWheel.bind(this), false ); // Firefox
		this.domElement.addEventListener("dblclick", this.onDoubleClick.bind(this));
		this.domElement.addEventListener("keydown", this.onKeyDown.bind(this));
		this.domElement.addEventListener("keyup", this.onKeyUp.bind(this));
	}
	
	onKeyDown(e){
		if(!this.enabled){ return; }
		
		e.preventDefault();
	}
	
	onKeyUp(e){
		if(!this.enabled){ return; }
		
		e.preventDefault();
	}
	
	onDoubleClick(e){
		if(!this.enabled){ return; }
		
		e.preventDefault();
	}
	
	onMouseDown(e){
		if(!this.enabled){ return; }
		
		e.preventDefault();
		
		let rect = this.domElement.getBoundingClientRect();
		
		let x = e.clientX - rect.left;
		let y = e.clientY - rect.top;
		
		this.dragStart = new THREE.Vector2(x, y);
		this.dragEnd = new THREE.Vector2(x, y);
		this.lastDrag = new THREE.Vector2(0, 0);
//		this.mouse.set(x, y);
		
		if(this.scene){
			this.viewStart = this.scene.view.clone();
		}
	}
	
	onMouseUp(e){
		if(!this.enabled){ return; }
		
		e.preventDefault();
		
		this.dragStart = null;
		this.dragEnd = null;
		this.lastDrag = null;
		this.viewStart = null;
	 }
	 
	onMouseMove(e){
		if(!this.enabled){ return; }
		
		e.preventDefault();
		
		let rect = this.domElement.getBoundingClientRect();
		let x = e.clientX - rect.left;
		let y = e.clientY - rect.top;
		
		let oldDragEnd;
		
		if(this.dragEnd !== null){
			oldDragEnd = this.dragEnd.clone();
			this.dragEnd.set(x, y);
		}
		
		if(this.lastDrag !== null && oldDragEnd !== null){
			this.lastDrag.subVectors(this.dragEnd, oldDragEnd);
		}
		
		this.mouse.set(x, y);
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
	
	setScene(scene){
		this.scene = scene;
	}
	
	setSpeed(value){
		if(this.speed !== value){
			this.speed = value;
			this.dispatcher.dispatchEvent( {
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
		if(this.lastDrag){
			this.lastDrag.set(0, 0);
		}
		this.wheelDelta = 0;
	}
	
	getNormalizedDrag(){
		if(this.dragStart === null || this.dragEnd === null){
			 return new THREE.Vector2(0, 0);
		}
		
		let drag = new THREE.Vector2().subVectors(this.dragEnd, this.dragStart);
		
		drag.x = drag.x / this.domElement.clientWidth;
		drag.y = drag.y / this.domElement.clientHeight;
		
		return drag;
	}
	
	getNormalizedLastDrag(){
		if(this.lastDrag === null){
			 return new THREE.Vector2(0, 0);
		}
		
		let drag = this.lastDrag.clone();
		
		drag.x = drag.x / this.domElement.clientWidth;
		drag.y = drag.y / this.domElement.clientHeight;
		
		return drag;
	}
	
	zoomToLocation(mouse){
		let I = this.getMousePointCloudIntersection(mouse);
		
		if(I === null){
			return;
		}
		
		let nmouse =  {
			x: (mouse.x / this.domElement.clientWidth ) * 2 - 1,
			y: - (mouse.y / this.domElement.clientHeight ) * 2 + 1
		};
		
		let targetRadius = 0;
		{
			let minimumJumpDistance = 0.2;
			
			let vector = new THREE.Vector3( nmouse.x, nmouse.y, 0.5 );
			vector.unproject(this.scene.camera);
			
			let direction = vector.sub(this.scene.camera.position).normalize();
			let ray = new THREE.Ray(this.scene.camera.position, direction);
			
			let nodes = I.pointcloud.nodesOnRay(I.pointcloud.visibleNodes, ray);
			let lastNode = nodes[nodes.length - 1];
			let radius = lastNode.getBoundingSphere().radius;
			targetRadius = Math.min(this.scene.view.radius, radius);
			targetRadius = Math.max(minimumJumpDistance, targetRadius);
		}
		
		let d = this.scene.view.direction.multiplyScalar(-1);
		let cameraTargetPosition = new THREE.Vector3().addVectors(I.location, d.multiplyScalar(targetRadius));
		let controlsTargetPosition = I.location;
		
		var animationDuration = 600;
		var easing = TWEEN.Easing.Quartic.Out;
		
		this.enabled = false;
		
		// animate position
		var tween = new TWEEN.Tween(this.scene.view.position).to(cameraTargetPosition, animationDuration);
		tween.easing(easing);
		tween.start();
		
		// animate target
		let pivot = this.scene.view.getPivot();
		var tween = new TWEEN.Tween(pivot).to(I.location, animationDuration);
		tween.easing(easing);
		tween.onUpdate(() => {
			this.scene.view.lookAt(pivot);
		});
		tween.onComplete(() => {
			this.enabled = true;
			
			this.dispatcher.dispatchEvent({
				type: "double_click_move",
				controls: this,
				position: cameraTargetPosition,
				targetLocation: I.location,
				targetPointcloud: I.pointcloud
			});
		});
		tween.start();
		
	}
	
};