

import {Profile} from "./Profile.js";
import {Utils} from "../utils.js";
import { EventDispatcher } from "../EventDispatcher.js";


export class ProfileTool extends EventDispatcher {
	constructor (viewer) {
		super();

		this.viewer = viewer;
		this.renderer = viewer.renderer;

		this.addEventListener('start_inserting_profile', e => {
			this.viewer.dispatchEvent({
				type: 'cancel_insertions'
			});
		});

		this.scene = new THREE.Scene();
		this.scene.name = 'scene_profile';
		this.light = new THREE.PointLight(0xffffff, 1.0);
		this.scene.add(this.light);

		this.viewer.inputHandler.registerInteractiveScene(this.scene);

		this.onRemove = e => this.scene.remove(e.profile);
		this.onAdd = e => this.scene.add(e.profile);

		for(let profile of viewer.scene.profiles){
			this.onAdd({profile: profile});
		}

		viewer.addEventListener("update", this.update.bind(this));
		viewer.addEventListener("render.pass.perspective_overlay", this.render.bind(this));
		viewer.addEventListener("scene_changed", this.onSceneChange.bind(this));

		viewer.scene.addEventListener('profile_added', this.onAdd);
		viewer.scene.addEventListener('profile_removed', this.onRemove);
	}

	onSceneChange(e){
		if(e.oldScene){
			e.oldScene.removeEventListeners('profile_added', this.onAdd);
			e.oldScene.removeEventListeners('profile_removed', this.onRemove);
		}

		e.scene.addEventListener('profile_added', this.onAdd);
		e.scene.addEventListener('profile_removed', this.onRemove);
	}

	startInsertion (args = {}) {
		let domElement = this.viewer.renderer.domElement;

		let profile = new Profile();
		profile.name = args.name || 'Profile';

		this.dispatchEvent({
			type: 'start_inserting_profile',
			profile: profile
		});

		this.scene.add(profile);

		let cancel = {
			callback: null
		};

		let insertionCallback = (e) => {
			if(e.button === THREE.MOUSE.LEFT){
				if(profile.points.length <= 1){
					let camera = this.viewer.scene.getActiveCamera();
					let distance = camera.position.distanceTo(profile.points[0]);
					let clientSize = this.viewer.renderer.getSize();
					let pr = Utils.projectedRadius(1, camera, distance, clientSize.width, clientSize.height);
					let width = (10 / pr);

					profile.setWidth(width);
				}

				profile.addMarker(profile.points[profile.points.length - 1].clone());

				this.viewer.inputHandler.startDragging(
					profile.spheres[profile.spheres.length - 1]);
			} else if (e.button === THREE.MOUSE.RIGHT) {
				cancel.callback();
			}
		};

		cancel.callback = e => {
			profile.removeMarker(profile.points.length - 1);
			domElement.removeEventListener('mouseup', insertionCallback, true);
			this.viewer.removeEventListener('cancel_insertions', cancel.callback);
		};

		this.viewer.addEventListener('cancel_insertions', cancel.callback);
		domElement.addEventListener('mouseup', insertionCallback, true);

		profile.addMarker(new THREE.Vector3(0, 0, 0));
		this.viewer.inputHandler.startDragging(
			profile.spheres[profile.spheres.length - 1]);

		this.viewer.scene.addProfile(profile);

		return profile;
	}
	
	update(){
		let camera = this.viewer.scene.getActiveCamera();
		let profiles = this.viewer.scene.profiles;
		let clientWidth = this.renderer.getSize().width;
		let clientHeight = this.renderer.getSize().height;

		this.light.position.copy(camera.position);

		// make size independant of distance
		for(let profile of profiles){
			for(let sphere of profile.spheres){				
				let distance = camera.position.distanceTo(sphere.getWorldPosition(new THREE.Vector3()));
				let pr = Utils.projectedRadius(1, camera, distance, clientWidth, clientHeight);
				let scale = (15 / pr);
				sphere.scale.set(scale, scale, scale);
			}
		}
	}

	render(){
		this.viewer.renderer.render(this.scene, this.viewer.scene.getActiveCamera());
	}

}
