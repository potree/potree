

Potree.VolumeTool = class VolumeTool extends Potree.Controls{
	
	constructor(renderer){
		super(renderer);
		
		this.STATE = {
			DEFAULT: 0,
			INSERT: 1
		};
		
		this.state = this.STATE.DEFAULT;
		
		this.activeVolume = null;
		this.sceneVolume = new THREE.Scene();
	}
	
	setScene(scene){
		super.setScene(scene);
		
		for(let volume of this.scene.volumes){
			this.sceneVolumes.add(volume.sceneNode);
		}
		
		this.scene.dispatcher.removeEventListeners("volume_added");
		this.scene.dispatcher.removeEventListeners("volume_removed");
		
		this.scene.addEventListener("volume_added", (e) => {
			if(this.scene === e.scene){
				this.sceneVolume.add(e.volume.sceneNode);
			}
		});
		
		this.scene.addEventListener("volume_removed", (e) => {
			if(this.scene === e.scene){
				this.sceneVolume.remove(e.volume.sceneNode);
			}
		});
	}
	
	update(delta){
		
		if(this.state === this.STATE.INSERT){
			let I = this.getMousePointCloudIntersection(this.mouse);
			
			if(I){
				this.activeVolume.sceneNode.position.copy(I.location);
				
				var wp = this.activeVolume.sceneNode.getWorldPosition()
					.applyMatrix4(this.scene.camera.matrixWorldInverse);
				var pp = new THREE.Vector4(wp.x, wp.y, wp.z).applyMatrix4(this.scene.camera.projectionMatrix);
				var w = Math.abs((wp.z  / 10)); 
				this.activeVolume.sceneNode.scale.set(w,w,w);
			}
		}
		
		
	}
	
	startInsertion(args){
		this.state = this.STATE.INSERT;
		
		let volume = new Potree.Volume();
		
		this.scene.addVolume(volume);
		this.activeVolume = volume;
		
		return this.activeVolume;
	}
	
	finishInsertion(){
		let event = {
			type: "insertion_finished",
			volume: this.activeVolume
		};
		this.dispatcher.dispatchEvent(event);
		
		this.activeVolume = null;
		
		this.state = this.STATE.DEFAULT;
	}
	
	cancelInsertion(){
		let event = {
			type: "insertion_canceled",
			volume: this.activeVolume
		};
		this.dispatcher.dispatchEvent(event);
		
		this.scene.removeVolume(this.activeVolume);
		
		this.activeVolume = null;
		
		this.state = this.STATE.DEFAULT;
	}
	
	getHoveredVolume(){
		let vector = new THREE.Vector3( this.mouse.x, this.mouse.y, 0.5 );
		vector.unproject(this.scene.camera);
		
		let raycaster = new THREE.Raycaster();
		raycaster.ray.set( this.scene.camera.position, vector.sub( this.scene.camera.position ).normalize() );
		
		let volumeNodes = this.volumes.map( x => x.sceneNode );
		
		let intersections = raycaster.intersectObjects(volumeNodes, true);
		if(intersections.length > 0){
			//let volume = this.volumes.filter( x => (x.sceneNode === intersections[0]) )[0];
			let volume = this.volumes.find( x => (x.sceneNode === intersections[0]) );
			
			return volume;
		}else{
			return null;
		}
	}
	
	onMouseClick(e){
		if(this.state === this.STATE.DEFAULT){
			if(e.ctrlKey){
				let volume = this.getHoveredVolume();
				
				if(volume){
					console.log(volume);
					this.dispatcher.dispatchEvent({
						type: "volume_selected",
						volume: volume
					});
				}
			}
		}
	}
	
	onMouseDown(e){
		
		if(this.state === this.STATE.INSERT){
			if(e.button === THREE.MOUSE.LEFT){
				this.finishInsertion();
			}else if(e.button === THREE.MOUSE.RIGHT){
				this.cancelInsertion();
			}
		} 
		
		
	}
	
	render(target){
		if(!this.scene){
			return;
		}
		
		this.update();
		
		this.renderer.render(this.sceneVolume, this.scene.camera, target);
	}
};