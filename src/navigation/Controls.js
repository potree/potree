/**
 * @author mschuetz / http://mschuetz.at
 *
 *
 * Navigation similar to Google Earth.
 *
 * left mouse: Drag with respect to intersection
 * wheel: zoom towards/away from intersection
 * right mouse: Rotate camera around intersection
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
		this.viewStart = null;
		
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
		if(!this.enabled){
			return;
		}
	}
	
	onKeyUp(e){
		if(!this.enabled){
			return;
		}
	}
	
	onDoubleClick(e){
		if(!this.enabled){
			return;
		}
	}
	
	onMouseDown(e){
		if(!this.enabled){
			return;
		}
		
		e.preventDefault();
		
		let rect = this.domElement.getBoundingClientRect();
		
		let x = e.clientX - rect.left;
		let y = e.clientY - rect.top;
		
		this.dragStart = new THREE.Vector2(x, y);
		this.dragEnd = new THREE.Vector2(x, y);
		
		if(this.scene){
			this.viewStart = {
				position: this.scene.view.position.clone(),
				target: this.scene.view.target.clone()
			};
		}
	}
	
	onMouseUp(e){
		if(!this.enabled){
			return;
		}
		
		this.dragStart = null;
		this.dragEnd = null;
		this.viewStart = null;
	 }
	 
	onMouseMove(e){
		if(!this.enabled){
			return;
		}
		
		if(this.dragEnd !== null){
			let rect = this.domElement.getBoundingClientRect();
			
			let x = e.clientX - rect.left;
			let y = e.clientY - rect.top;
			this.dragEnd.set(x, y);
		}
	}
	
	onMouseWheel(e){
		if(!this.enabled){
			return;
		}
		
		let delta = 0;
		if( e.wheelDelta !== undefined ) { // WebKit / Opera / Explorer 9
			delta = e.wheelDelta;
		} else if ( e.detail !== undefined ) { // Firefox
			delta = -e.detail;
		}
		
		this.wheelDelta += Math.sign(delta);
	}
	
	getMousePointCloudIntersection(event){
		
		let rect = this.domElement.getBoundingClientRect();
		
		let mouse =  {
			x: ((event.clientX - rect.left) / this.domElement.clientWidth ) * 2 - 1,
			y: - ((event.clientY - rect.top) / this.domElement.clientHeight ) * 2 + 1
		};
		
		let selectedPointcloud = null;
		let distance = Number.POSITIVE_INFINITY;
		let I = null;
		
		for(let pointcloud of this.scene.pointclouds){
			let intersection = Potree.utils.getMousePointCloudIntersection(mouse, this.scene.camera, this.renderer, [pointcloud]);
			if(!intersection){
				continue;
			}
			
			let tDist = this.scene.camera.position.distanceTo(intersection);
			if(tDist < distance){
				selectedPointcloud = pointcloud;
				distance = tDist;
				I = intersection;
			}
		}
		
		return I;
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
	
	getNormalizedDrag(){
		if(this.dragStart === null || this.dragEnd === null){
			 return new THREE.Vector2(0, 0);
		}
		
		let drag = new THREE.Vector2().subVectors(this.dragEnd, this.dragStart);
		
		drag.x = drag.x / this.domElement.clientWidth;
		drag.y = drag.y / this.domElement.clientHeight;
		
		return drag;
	}
	
};