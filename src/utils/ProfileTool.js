
Potree.ProfileTool = function(renderer){
	
	var scope = this;
	this.enabled = false;
	
	this.scene = null;
	this.renderer = renderer;
	this.domElement = renderer.domElement;
	this.mouse = {x: 0, y: 0};
	
	var STATE = {
		DEFAULT: 0,
		INSERT: 1
	};
	
	var state = STATE.DEFAULT;
	
	var sphereGeometry = new THREE.SphereGeometry(0.4, 10, 10);
	
	this.activeProfile = null;
	this.profiles = [];
	this.sceneProfile = new THREE.Scene();
	this.sceneRoot = new THREE.Object3D();
	this.sceneProfile.add(this.sceneRoot);
	
	this.light = new THREE.DirectionalLight( 0xffffff, 1 );
	this.light.position.set( 0, 0, 10 );
	this.light.lookAt(new THREE.Vector3(0,0,0));
	this.sceneProfile.add( this.light );
	
	this.hoveredElement = null;
	
	function createSphereMaterial(){
		var sphereMaterial = new THREE.MeshLambertMaterial({
			shading: THREE.SmoothShading, 
			color: 0xff0000, 
			ambient: 0xaaaaaa,
			depthTest: false, 
			depthWrite: false}
		);
		
		return sphereMaterial;
	};

	
	function onClick(event){
	
		if(state === STATE.INSERT){
			var I = scope.getMousePointCloudIntersection();
			if(I){
				var pos = I.clone();
				
				if(scope.activeProfile.points.length === 1 && scope.activeProfile.width === null){
					scope.activeProfile.setWidth((scope.scene.camera.position.distanceTo(pos) / 50));
				}
				
				scope.activeProfile.addMarker(pos);
				
				var event = {
					type: 'newpoint',
					position: pos.clone()
				};
				scope.dispatchEvent(event);
				
			}
		}
	};
	
	function onMouseMove(event){
		if(!scope.scene){
			return;
		}
		
		var rect = scope.domElement.getBoundingClientRect();
		scope.mouse.x = ((event.clientX - rect.left) / scope.domElement.clientWidth) * 2 - 1;
        scope.mouse.y = -((event.clientY - rect.top) / scope.domElement.clientHeight) * 2 + 1;
		
		if(scope.dragstart){
			var arg = {
				type: "mousedrag", 
				event: event, 
				tool: scope
			};
			scope.dragstart.object.dispatchEvent(arg);
			
		}else if(state == STATE.INSERT && scope.activeProfile){
			var I = scope.getMousePointCloudIntersection();
			
			if(I){
			
				var lastIndex = scope.activeProfile.points.length-1;
				scope.activeProfile.setPosition(lastIndex, I);
			}
			
		}else{
			var I = getHoveredElement();
			
			if(I){
				
				I.object.dispatchEvent({type: "mousemove", target: I.object, event: event});
				
				if(scope.hoveredElement && scope.hoveredElement !== I.object){
					scope.hoveredElement.dispatchEvent({type: "mouseleave", target: scope.hoveredElement, event: event});
				}
				
				scope.hoveredElement = I.object;
				
			}else{
			
				if(scope.hoveredElement){
					scope.hoveredElement.dispatchEvent({type: "mouseleave", target: scope.hoveredElement, event: event});
				}
				
				scope.hoveredElement = null;
			
			}
		}
	};
	
	function onRightClick(event){
		if(state == STATE.INSERT){			
			scope.finishInsertion();
		}
	}
	
	function onMouseDown(event){
	
		if(state !== STATE.DEFAULT){
			event.stopImmediatePropagation();
		}
	
		if(event.which === 1){
			
			var I = getHoveredElement();
			
			if(I){
			
				var widthStart = null;
				for(var i = 0; i < scope.profiles.length; i++){
					var profile = scope.profiles[i];
					for(var j = 0; j < profile.spheres.length; j++){
						var sphere = profile.spheres[j];
						
						if(sphere === I.object){
							widthStart = profile.width;
						}
					}
				}
				
				scope.dragstart = {
					object: I.object, 
					sceneClickPos: I.point,
					sceneStartPos: scope.sceneRoot.position.clone(),
					mousePos: {x: scope.mouse.x, y: scope.mouse.y},
					widthStart: widthStart
				};
				event.stopImmediatePropagation();
				
			}
			
		}else if(event.which === 3){	
			onRightClick(event);
		}
	}
	
	function onDoubleClick(event){
		
		// fix move event after double click
		// see: http://stackoverflow.com/questions/8125165/event-listener-for-dblclick-causes-event-for-mousemove-to-not-work-and-show-a-ci
		if (window.getSelection){
			window.getSelection().removeAllRanges();
		}else if (document.selection){
			document.selection.empty();
		}
	
		if(scope.activeProfile && state === STATE.INSERT){
			scope.activeProfile.removeMarker(scope.activeProfile.points.length-1);
			scope.finishInsertion();
			event.stopImmediatePropagation();
		}
	}
	
	function onMouseUp(event){
		
		if(scope.dragstart){
			scope.dragstart.object.dispatchEvent({type: "drop", event: event});
			scope.dragstart = null;
		}
		
	}
	
	this.setScene = function(scene){
		
		this.scene = scene;
		this.profiles = this.scene.profiles;
		
		this.activeProfile = null;
		this.sceneProfile = new THREE.Scene();
		this.sceneRoot = new THREE.Object3D();
		this.sceneProfile.add(this.sceneRoot);
		
		this.light = new THREE.DirectionalLight( 0xffffff, 1 );
		this.light.position.set( 0, 0, 10 );
		this.light.lookAt(new THREE.Vector3(0,0,0));
		this.sceneProfile.add( this.light );
		
		for(let profile of this.scene.profiles){
			this.sceneProfile.add(profile.sceneNode);
		}
		
		let onProfileAdded = (e) => {
			if(this.scene === e.scene){
				this.sceneProfile.add(e.profile.sceneNode);
			}
		};
		
		let onProfileRemoved = (e) => {
			if(this.scene === e.scene){
				this.sceneProfile.remove(e.profile.sceneNode);
			}
		};
		
		// TODO make sure not du add the same listeners twice
		scene.addEventListener("profile_added", onProfileAdded);
		scene.addEventListener("profile_removed", onProfileRemoved);
		
	}
	
	function getHoveredElement(){
			
		var vector = new THREE.Vector3( scope.mouse.x, scope.mouse.y, 0.5 );
		vector.unproject(scope.scene.camera);
		
		var raycaster = new THREE.Raycaster();
		raycaster.ray.set( scope.scene.camera.position, vector.sub( scope.scene.camera.position ).normalize() );
		
		var intersections = raycaster.intersectObjects(scope.profiles);
		
		if(intersections.length > 0){
			return intersections[0];
		}else{
			return false;
		}
	};
	
	this.getMousePointCloudIntersection = function(){
		var vector = new THREE.Vector3( scope.mouse.x, scope.mouse.y, 0.5 );
		vector.unproject(scope.scene.camera);

		var direction = vector.sub(scope.scene.camera.position).normalize();
		var ray = new THREE.Ray(scope.scene.camera.position, direction);
		
		var pointClouds = [];
		scope.scene.scenePointCloud.traverse(function(object){
			if(object instanceof Potree.PointCloudOctree || object instanceof Potree.PointCloudArena4D){
				pointClouds.push(object);
			}
		});
		
		var closestPoint = null;
		var closestPointDistance = null;
		
		for(var i = 0; i < pointClouds.length; i++){
			var pointcloud = pointClouds[i];
			var point = pointcloud.pick(scope.renderer, scope.scene.camera, ray, {
				pickOutsideClipRegion: true
			});
			
			if(!point){
				continue;
			}
			
			var distance = scope.scene.camera.position.distanceTo(point.position);
			
			if(!closestPoint || distance < closestPointDistance){
				closestPoint = point;
				closestPointDistance = distance;
			}
		}
		
		return closestPoint ? closestPoint.position : null;
	};
	
	this.startInsertion = function(args = {}){
		state = STATE.INSERT;
		
		let clip = args.clip || false;
		let width = args.width || null;
		
		let profile = new Potree.Profile();
		profile.clip = clip;
		profile.setWidth(width);
		profile.addMarker(new THREE.Vector3(0,0,0));
		
		this.scene.addProfile(profile);
		this.activeProfile = profile;
		
		return this.activeProfile;
	};
	
	this.finishInsertion = function(){
		this.activeProfile.removeMarker(this.activeProfile.points.length-1);
		
		var event = {
			type: "insertion_finished",
			profile: this.activeProfile
		};
		this.dispatchEvent(event);
		
		this.activeProfile = null;
		state = STATE.DEFAULT;
	};
	
	this.addProfile = function(profile){
		this.profiles.push(profile);
		this.sceneProfile.add(profile);
		profile.update();
		
		this.dispatchEvent({"type": "profile_added", profile: profile});
		profile.addEventListener("marker_added", function(event){
			scope.dispatchEvent(event);
		});
		profile.addEventListener("marker_removed", function(event){
			scope.dispatchEvent(event);
		});
		profile.addEventListener("marker_moved", function(event){
			scope.dispatchEvent(event);
		});
		profile.addEventListener("width_changed", function(event){
			scope.dispatchEvent(event);
		});
	};
	
	this.reset = function(){
		for(var i = this.profiles.length - 1; i >= 0; i--){
			var profile = this.profiles[i];
			this.removeProfile(profile);
		}
	};
	
	this.update = function(){
		
		if(!this.scene){
			return;
		}
		
		for(var i = 0; i < this.profiles.length; i++){
			var profile = this.profiles[i];
			for(var j = 0; j < profile.spheres.length; j++){
				var sphere = profile.spheres[j];
				
				var distance = scope.scene.camera.position.distanceTo(sphere.getWorldPosition());
				var pr = Potree.utils.projectedRadius(1, scope.scene.camera.fov * Math.PI / 180, distance, renderer.domElement.clientHeight);
				var scale = (15 / pr);
				sphere.scale.set(scale, scale, scale);
			}
		}
	
		this.light.position.copy(this.scene.camera.position);
		this.light.lookAt(this.scene.camera.getWorldDirection().add(this.scene.camera.position));
		
	};
	
	this.render = function(){
		if(!this.scene){
			return;
		}
		
		this.update();
		renderer.render(this.sceneProfile, this.scene.camera);
	};
	
	
	this.domElement.addEventListener( 'click', onClick, false);
	this.domElement.addEventListener( 'dblclick', onDoubleClick, false);
	this.domElement.addEventListener( 'mousemove', onMouseMove, false );
	this.domElement.addEventListener( 'mousedown', onMouseDown, false );
	this.domElement.addEventListener( 'mouseup', onMouseUp, true );
	
};


Potree.ProfileTool.prototype = Object.create( THREE.EventDispatcher.prototype );
