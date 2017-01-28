
Potree.ProfileTool = class ProfileTool{
	
	constructor(viewer){
		this.viewer = viewer;
		this.renderer = viewer.renderer;
		
		this.sceneProfile = new THREE.Scene();
		this.light = new THREE.PointLight( 0xffffff, 1.0 );
		this.sceneProfile.add(this.light);
		
		this.viewer.inputHandler.registerInteractiveScene(this.sceneProfile);

		this.onRemove = e => {
			this.sceneProfile.remove(e.profile);
		};
	}
	
	setScene(scene){
		if(this.scene === scene){
			return;
		}
		
		if(this.scene){
			this.scene.removeEventListeners("profile_removed", this.onRemove);
		}
		
		this.scene = scene;
		
		this.scene.addEventListener("profile_removed", this.onRemove);
	}
	
	startInsertion(args = {}){
		let domElement = this.viewer.renderer.domElement;
		
		let profile = new Potree.Profile();
		
		this.sceneProfile.add(profile);
		
		let drag = (e) => {
			let I = Potree.utils.getMousePointCloudIntersection(
				e.drag.end, 
				this.viewer.scene.camera, 
				this.viewer.renderer, 
				this.viewer.scene.pointclouds);
			
			if(I){
				let i = profile.spheres.indexOf(e.drag.object);
				if(i !== -1){
					profile.setPosition(i, I.location);
					profile.dispatchEvent({
						"type": "marker_moved"
					});
				}
			}
		};
		
		let mouseover = (e) => e.object.material.emissive.setHex(0x888888);
		let mouseleave = (e) => e.object.material.emissive.setHex(0x000000);
		
		profile.addEventListener("marker_added", e => {
			e.sphere.addEventListener("drag", drag);
			e.sphere.addEventListener("mouseover", mouseover);
			e.sphere.addEventListener("mouseleave", mouseleave);
		});
		
		let insertionCallback = (e) => {
			if(e.button === THREE.MOUSE.LEFT){
				profile.addMarker(new THREE.Vector3(0, 0, 0));
				
				this.viewer.inputHandler.startDragging(
					profile.spheres[profile.spheres.length - 1]);
			}else if(e.button === THREE.MOUSE.RIGHT){
				profile.removeMarker(profile.points.length - 1);
				domElement.removeEventListener("mouseup", insertionCallback, true);
			}
		};
		
		domElement.addEventListener("mouseup", insertionCallback , true);
		
		profile.addMarker(new THREE.Vector3(0, 0, 0));
		this.viewer.inputHandler.startDragging(
			profile.spheres[profile.spheres.length - 1]);
			
		this.viewer.scene.addProfile(profile);
	}
	
	update(){
		let camera = this.viewer.scene.camera;
		let domElement = this.renderer.domElement;
		let profiles = this.viewer.scene.profiles;
		
		this.light.position.copy(camera.position);
		
		// make size independant of distance
		for(let profile of profiles){
			for(let sphere of profile.spheres){
				let distance = camera.position.distanceTo(sphere.getWorldPosition());
				let pr = Potree.utils.projectedRadius(1, camera.fov * Math.PI / 180, distance, domElement.clientHeight);
				let scale = (15 / pr);
				sphere.scale.set(scale, scale, scale);
			}
		}
	}
	
};




