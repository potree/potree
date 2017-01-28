

Potree.VolumeTool = class VolumeTool{
	
	constructor(viewer){
		this.viewer = viewer;
		this.renderer = viewer.renderer;

		this.sceneVolume = new THREE.Scene();
		
		this.viewer.inputHandler.registerInteractiveScene(this.sceneVolume);

		this.onRemove = e => {
			this.sceneVolume.remove(e.volume);
		};
	}
	
	setScene(scene){
		if(this.scene === scene){
			return;
		}
		
		if(this.scene){
			this.scene.removeEventListeners("volume_removed", this.onRemove);
		}
		
		this.scene = scene;
		
		this.scene.addEventListener("volume_removed", this.onRemove);
	}
	
	startInsertion(args = {}){
		let domElement = this.viewer.renderer.domElement;
		
		let volume = new Potree.Volume();
		volume.clip = args.clip || false;
		
		this.sceneVolume.add(volume);
		this.viewer.scene.addVolume(volume);

		let drag = e => {
			let camera = this.viewer.scene.camera;
			
			let I = Potree.utils.getMousePointCloudIntersection(
				e.drag.end, 
				this.viewer.scene.camera, 
				this.viewer.renderer, 
				this.viewer.scene.pointclouds);
				
			if(I){
				volume.position.copy(I.location);
				
				var wp = volume.getWorldPosition().applyMatrix4(camera.matrixWorldInverse);
				var pp = new THREE.Vector4(wp.x, wp.y, wp.z).applyMatrix4(camera.projectionMatrix);
				var w = Math.abs((wp.z  / 10)); 
				volume.scale.set(w,w,w);
			}
		};
		
		let drop = e => {
			volume.removeEventListener("drag", drag);
			volume.removeEventListener("drop", drop);
		};
		
		volume.addEventListener("drag", drag);
		volume.addEventListener("drop", drop);
		
		this.viewer.inputHandler.startDragging(volume);
	}
	
	update(delta){
		
	}

};