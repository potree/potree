
Potree.ProfileTool = class ProfileTool extends THREE.EventDispatcher{
	
	constructor(viewer){
		super();
		
		this.viewer = viewer;
		this.renderer = viewer.renderer;
		
		this.addEventListener("start_inserting_profile", e => {
			this.viewer.dispatchEvent({
				type: "cancel_insertions"
			});
		});
		
		this.sceneProfile = new THREE.Scene();
		this.sceneProfile.name = "scene_profile";
		this.light = new THREE.PointLight( 0xffffff, 1.0 );
		this.sceneProfile.add(this.light);
		
		this.viewer.inputHandler.registerInteractiveScene(this.sceneProfile);

		this.onRemove = e => this.sceneProfile.remove(e.profile);
		this.onAdd = e => this.sceneProfile.add(e.profile);
	}
	
	setScene(scene){
		if(this.scene === scene){
			return;
		}
		
		if(this.scene){
			this.scene.removeEventListeners("profile_added", this.onAdd);
			this.scene.removeEventListeners("profile_removed", this.onRemove);
		}
		
		this.scene = scene;
		
		this.scene.addEventListener("profile_added", this.onAdd);
		this.scene.addEventListener("profile_removed", this.onRemove);
	}
	
	startInsertion(args = {}){
		let domElement = this.viewer.renderer.domElement;
		
		let profile = new Potree.Profile();
		
		this.dispatchEvent({
			type: "start_inserting_profile",
			profile: profile
		});
		
		this.sceneProfile.add(profile);
		
		let cancel = {
			callback: null
		};
		
		let insertionCallback = (e) => {
			if(e.button === THREE.MOUSE.LEFT){
				if(profile.points.length <= 1){
					let camera = this.viewer.scene.camera;
					let distance = camera.position.distanceTo(profile.points[0]);
					let pr = Potree.utils.projectedRadius(1, camera.fov * Math.PI / 180, distance, domElement.clientHeight);
					let width = (10 / pr);
					
					profile.setWidth(width);
				}
				
				profile.addMarker(profile.points[profile.points.length - 1].clone());
				
				this.viewer.inputHandler.startDragging(
					profile.spheres[profile.spheres.length - 1]);
			}else if(e.button === THREE.MOUSE.RIGHT){
				cancel.callback();
			}
		};
		
		
		
		cancel.callback = e => {
			profile.removeMarker(profile.points.length - 1);
			domElement.removeEventListener("mouseup", insertionCallback, true);
			this.viewer.removeEventListener("cancel_insertions", cancel.callback);
		};
		
		this.viewer.addEventListener("cancel_insertions", cancel.callback);
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




