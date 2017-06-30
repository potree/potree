
Potree.ClippingTool = class ClippingTool extends THREE.EventDispatcher{

	constructor(viewer){
		super(); 

		this.viewer = viewer;

		this.clipInside = false; 
		this.clipOffset = 0.1;
		
		this.addEventListener("start_inserting_clipping_volume", e => {
			this.viewer.dispatchEvent({
				type: "cancel_insertions"
			});
		});

		this.sceneVolume = new THREE.Scene();
		this.sceneVolume.name = "scene_clip_volume";
		this.viewer.inputHandler.registerInteractiveScene(this.sceneVolume);

		this.onRemove = e => {
			this.sceneVolume.remove(e.volume);
		};
		
		this.onAdd = e => {
			this.sceneVolume.add(e.volume);
		};
		
		this.viewer.inputHandler.addEventListener("delete", e => {
			let volumes = e.selection.filter(e => (e instanceof Potree.ClipVolume));
			volumes.forEach(e => this.viewer.scene.removeClipVolume(e));
		});
	}

	setScene(scene){
		if(this.scene === scene){
			return;
		}
		
		if(this.scene){
			this.scene.removeEventListeners("clip_volume_added", this.onAdd);
			this.scene.removeEventListeners("clip_volume_removed", this.onRemove);
		}
		
		this.scene = scene;
		
		this.scene.addEventListener("clip_volume_added", this.onAdd);
		this.scene.addEventListener("clip_volume_removed", this.onRemove);
	}

	setClipInside(inside) {
		if(this.clipInside == inside) return;

		this.clipInside = inside;
		viewer.dispatchEvent({"type": "clipper.clipInside_changed", "viewer": viewer, "inside": inside});		
	}	

	setClipOffset(offset) {
		if(this.clipOffset == offset) return;
		
		this.clipOffset = offset;
		viewer.dispatchEvent({"type": "clipper.clipOffset_changed", "viewer": viewer, "offset": offset});		
	}

	startInsertion(args = {}) {
		let axis = -1;
		if(args.axis + 1)
			axis = args.axis;
		let clipVolume = new Potree.ClipVolume(axis);

		this.dispatchEvent({"type": "start_inserting_clipping_volume"});

		this.viewer.scene.addClipVolume(clipVolume);
		//this.sceneVolume.add(clipVolume);

		let cancel = {
			callback: null
		};

		let drag = e => {
			let camera = this.viewer.scene.getActiveCamera();
			
			let I = Potree.utils.getMousePointCloudIntersection(
				e.drag.end, 
				this.viewer.scene.getActiveCamera(), 
				this.viewer.renderer, 
				this.viewer.scene.pointclouds);
				
			if(I){
				clipVolume.position.copy(I.location);
				
				/*var wp = clipVolume.getWorldPosition().applyMatrix4(camera.matrixWorldInverse);
				var pp = new THREE.Vector4(wp.x, wp.y, wp.z).applyMatrix4(camera.projectionMatrix);
				var w = Math.abs((wp.z  / 10)); 
				clipVolume.scale.set(w,w,w);*/
			}
		};
		
		let drop = e => {
			clipVolume.removeEventListener("drag", drag);
			clipVolume.removeEventListener("drop", drop);
			
			cancel.callback();

			clipVolume.dispatchEvent({"type": "clip_volume_changed", "volume": clipVolume});

			//this.dispatchEvent({"type": "start_resizing_clipping_volume"});
		};
		
		cancel.callback = e => {
			clipVolume.removeEventListener("drag", drag);
			clipVolume.removeEventListener("drop", drop);
			this.viewer.removeEventListener("cancel_insertions", cancel.callback);
		};


		/*let cancel2 = {
			callback: null
		};		

		let drag2 = e => {
			let mouse = e.drag.end;

			let nmouse =  {
				x: (mouse.x / this.viewer.renderer.domElement.clientWidth ) * 2 - 1,
				y: - (mouse.y / this.viewer.renderer.domElement.clientHeight ) * 2 + 1
			};
			
			let camera = this.viewer.scene.getActiveCamera();
			let mouseWS = new THREE.Vector3( nmouse.x, nmouse.y, 0.5 );
			mouseWS.unproject(camera);

			let distance = clipVolume.position.distanceTo(mouseWS);

			clipVolume.scale.set(distance, distance, distance);		
		};

		let drop2 = e => {
			cancel2.callback();
		};

		cancel2.callback = e => {
			clipVolume.removeEventListener("drag", drag2);
			clipVolume.removeEventListener("drop", drop2);
			this.viewer.removeEventListener("cancel_insertions", cancel2.callback);
		};

		this.addEventListener("start_resizing_clipping_volume", function(event) {			
			clipVolume.addEventListener("drag", drag2);
			clipVolume.addEventListener("drop", drop2);
			this.viewer.addEventListener("cancel_insertions", cancel2.callback);

			this.viewer.inputHandler.startDragging(clipVolume);
		});*/
		
		clipVolume.addEventListener("drag", drag);
		clipVolume.addEventListener("drop", drop);
		this.viewer.addEventListener("cancel_insertions", cancel.callback);
		
		this.viewer.inputHandler.startDragging(clipVolume);
	}

	update() {

	}
};

Potree.ClippingTool.ClipMode = {
	NONE: 0,
	BOX: 1,
	POLYGON: 2,
	PROFILE: 3
};