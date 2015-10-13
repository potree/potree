
Potree.Volume = function(args){

	THREE.Object3D.call( this );

	args = args || {};
	this._clip = args.clip || false;
	this._modifiable = args.modifiable || true;
	
	var boxGeometry = new THREE.BoxGeometry(1, 1, 1);
	boxGeometry.computeBoundingBox();
	
	var boxFrameGeometry = new THREE.Geometry();
	// bottom
	boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, 0.5));
	boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, 0.5));
	boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, 0.5));
	boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, -0.5));
	boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, -0.5));
	boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, -0.5));
	boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, -0.5));
	boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, 0.5));
	// top
	boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, 0.5));
	boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, 0.5));
	boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, 0.5));
	boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, -0.5));
	boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, -0.5));
	boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, -0.5));
	boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, -0.5));
	boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, 0.5));
	// sides
	boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, 0.5));
	boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, 0.5));
	boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, 0.5));
	boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, 0.5));
	boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, -0.5));
	boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, -0.5));
	boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, -0.5));
	boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, -0.5));

	this.dimension = new THREE.Vector3(1,1,1);
	var material = new THREE.MeshBasicMaterial( {
		color: 0x00ff00, 
		transparent: true, 
		opacity: 0.3,
		depthTest: true, 
		depthWrite: true} );
	this.box = new THREE.Mesh( boxGeometry, material);
	this.box.geometry.computeBoundingBox();
	this.boundingBox = this.box.geometry.boundingBox;
	this.add(this.box);
	
	this.frame = new THREE.Line( boxFrameGeometry, new THREE.LineBasicMaterial({color: 0x000000}));
	this.frame.mode = THREE.LinePieces;
	this.add(this.frame);
	
	this.label = new Potree.TextSprite("0");
	this.label.setBorderColor({r:0, g:255, b:0, a:0.0});
	this.label.setBackgroundColor({r:0, g:255, b:0, a:0.0});
	this.label.material.depthTest = false;
	this.label.material.depthWrite = false;
	this.label.material.transparent = true;
	this.label.position.y -= 0.5;
	this.add(this.label);
	
	var v = this;
	this.label.updateMatrixWorld = function(){
		var volumeWorldPos = new THREE.Vector3();
		volumeWorldPos.setFromMatrixPosition( v.matrixWorld );
		v.label.position.copy(volumeWorldPos);
		v.label.updateMatrix();
		v.label.matrixWorld.copy(v.label.matrix);
		v.label.matrixWorldNeedsUpdate = false;
		
		for ( var i = 0, l = v.label.children.length; i < l; i ++ ) {
			v.label.children[ i ].updateMatrixWorld( true );
		}
	};
	
	this.setDimension = function(x,y,z){
		this.dimension.set(x,y,z);
		this.box.scale.set(x,y,z);
		this.frame.scale.set(x,y,z);
	};

	this.volume = function(){
		return Math.abs(this.scale.x * this.scale.y * this.scale.z);
		//return Math.abs(this.dimension.x * this.dimension.y * this.dimension.z);
	};
	
	this.update = function(){
		this.boundingBox = this.box.geometry.boundingBox;
		this.boundingSphere = this.boundingBox.getBoundingSphere();
		
		if(this._clip){
			this.box.visible = false;
			this.label.visible = false;
		}else{
			this.box.visible = true;
			this.label.visible = true;
		}
	};
	
	this.raycast = function(raycaster, intersects){
		
		var is = [];
		this.box.raycast(raycaster, is);
	
		if(is.length > 0){
			var I = is[0];
			intersects.push({
				distance: I.distance,
				object: this,
				point: I.point.clone()
			});
		}
	};
	
	this.update();
	
};

Potree.Volume.prototype = Object.create( THREE.Object3D.prototype );

Object.defineProperty(Potree.Volume.prototype, "clip", {
	get: function(){
		return this._clip;
	},
	
	set: function(value){
		this._clip = value;
		
		this.update();
	}
});

Object.defineProperty(Potree.Volume.prototype, "modifiable", {
	get: function(){
		return this._modifiable;
	},
	
	set: function(value){
		this._modifiable = value;
		
		this.update();
	}
});


Potree.VolumeTool = function(scene, camera, renderer, transformationTool){
	
	var scope = this;
	this.enabled = false;
	
	this.scene = scene;
	this.sceneVolume = new THREE.Scene();
	this.camera = camera;
	this.renderer = renderer;
	this.transformationTool = transformationTool;
	this.domElement = this.renderer.domElement;
	this.mouse = {x: 0, y: 0};
	
	this.volumes = [];
	
	var STATE = {
		DEFAULT: 0,
		INSERT_VOLUME: 1
		
	};
	
	var state = STATE.DEFAULT;	
	
	
	function onMouseMove(event){
		var rect = scope.domElement.getBoundingClientRect();
		scope.mouse.x = ((event.clientX - rect.left) / scope.domElement.clientWidth) * 2 - 1;
        scope.mouse.y = -((event.clientY - rect.top) / scope.domElement.clientHeight) * 2 + 1;
	};
	
	function onMouseClick(event){
		
		//if(state === STATE.INSERT_VOLUME){
		//	scope.finishInsertion();
		//}else if(event.which === 1){
		//	var I = getHoveredElement();
		//	
		//	if(I){
		//		transformationTool.setTargets([I.object]);
		//	}
		//}
	};
	
	function onMouseDown(event){
	
		if(state !== STATE.DEFAULT){
			event.stopImmediatePropagation();
		}
	
		if(state === STATE.INSERT_VOLUME){
			scope.finishInsertion();
		}else if(event.which === 1){
			var I = getHoveredElement();
			
			if(I && I.object.modifiable){
				scope.transformationTool.setTargets([I.object]);
			}
		}
	
	
		if(event.which === 3){
			// open context menu
			
			//var element = getHoveredElement();
			//
			//if(element){
			//	var menu = document.createElement("div");
			//	menu.style.position = "fixed";
			//	menu.style.backgroundColor = "#bbbbbb";
			//	menu.style.top = event.clientY + "px";
			//	menu.style.left = event.clientX + "px";
			//	menu.style.width = "200px";
			//	menu.style.height = "100px";
			//	menu.innerHTML = "abc";
			//	menu.addEventListener("contextmenu", function(event){
			//		event.preventDefault();
			//		return false;
			//	}, false);
			//	
			//	scope.renderer.domElement.parentElement.appendChild(menu);
			//}
		}
	};
	
	function onContextMenu(event){
		event.preventDefault();
		return false;
	}
	
	function getHoveredElement(){
			
		var vector = new THREE.Vector3( scope.mouse.x, scope.mouse.y, 0.5 );
		vector.unproject(scope.camera);
		
		var raycaster = new THREE.Raycaster();
		raycaster.ray.set( scope.camera.position, vector.sub( scope.camera.position ).normalize() );
		
		var objects = [];
		for(var i = 0; i < scope.volumes.length; i++){
			var object = scope.volumes[i];
			objects.push(object);
		}
		
		var intersections = raycaster.intersectObjects(objects, false);
		if(intersections.length > 0){
			return intersections[0];
		}else{
			return false;
		}
	};
	
	function getMousePointCloudIntersection(){
		var vector = new THREE.Vector3( scope.mouse.x, scope.mouse.y, 0.5 );
		vector.unproject(scope.camera);

		var direction = vector.sub(scope.camera.position).normalize();
		var ray = new THREE.Ray(scope.camera.position, direction);
		
		var pointClouds = [];
		scope.scene.traverse(function(object){
			if(object instanceof Potree.PointCloudOctree || object instanceof Potree.PointCloudArena4D){
				pointClouds.push(object);
			}
		});
		
		var closestPoint = null;
		var closestPointDistance = null;
		
		for(var i = 0; i < pointClouds.length; i++){
			var pointcloud = pointClouds[i];
			var point = pointcloud.pick(scope.renderer, scope.camera, ray);
			
			if(!point){
				continue;
			}
			
			var distance = scope.camera.position.distanceTo(point.position);
			
			if(!closestPoint || distance < closestPointDistance){
				closestPoint = point;
				closestPointDistance = distance;
			}
		}
		
		return closestPoint ? closestPoint.position : null;
	}
	
	this.update = function(delta){
	
		if(state === STATE.INSERT_VOLUME){
			var I = getMousePointCloudIntersection();
			
			if(I){
				this.activeVolume.position.copy(I);
				
				var wp = this.activeVolume.getWorldPosition().applyMatrix4(this.camera.matrixWorldInverse);
				var pp = new THREE.Vector4(wp.x, wp.y, wp.z).applyMatrix4(this.camera.projectionMatrix);
				var w = Math.abs((wp.z  / 10)); 
				//this.activeVolume.setDimension(w, w, w);
				this.activeVolume.scale.set(w,w,w);
			}
		}
		
		var volumes = [];
		for(var i = 0; i < this.volumes.length; i++){
			volumes.push(this.volumes[i]);
		}
		if(this.activeVolume){
			volumes.push(this.activeVolume);
		}
		
		for(var i = 0; i < volumes.length; i++){
			var volume = volumes[i];
			var box = volume.box;
			var label = volume.label;
			
			var capacity = volume.volume();
			var msg = Potree.utils.addCommas(capacity.toFixed(1)) + "³";
			label.setText(msg);
			
			var distance = scope.camera.position.distanceTo(label.getWorldPosition());
			var pr = projectedRadius(1, scope.camera.fov * Math.PI / 180, distance, scope.renderer.domElement.clientHeight);
			var scale = (70 / pr);
			label.scale.set(scale, scale, scale);
		}
		
	};
	
	this.startInsertion = function(args){
		state = STATE.INSERT_VOLUME;
		
		var args = args || {};
		var clip = args.clip || false;
		
		this.activeVolume = new Potree.Volume();
		this.activeVolume.clip = clip;
		this.sceneVolume.add(this.activeVolume);
		this.volumes.push(this.activeVolume);
	};
	
	this.finishInsertion = function(){
		scope.transformationTool.setTargets([this.activeVolume]);
		
		var event = {
			type: "insertion_finished",
			volume: this.activeVolume
		};
		this.dispatchEvent(event);
		
		this.activeVolume = null;
		state = STATE.DEFAULT;
	};
	
	this.addVolume = function(volume){
		this.sceneVolume.add(volume);
		this.volumes.push(volume);
	};
	
	this.removeVolume = function(volume){
		this.sceneVolume.remove(volume);
		var index = this.volumes.indexOf(volume);
		if(index >= 0){
			this.volumes.splice(index, 1);
		}
	};
	
	this.reset = function(){
		for(var i = this.volumes.length - 1; i >= 0; i--){
			var volume = this.volumes[i];
			this.removeVolume(volume);
		}
	};
	
	
	this.render = function(target){
		
		scope.renderer.render(this.sceneVolume, this.camera, target);
		
	};
	
	this.domElement.addEventListener( 'click', onMouseClick, false );
	this.domElement.addEventListener( 'mousedown', onMouseDown, false );
	this.domElement.addEventListener( 'mousemove', onMouseMove, false );
	this.domElement.addEventListener( 'contextmenu', onContextMenu, false );
};

Potree.VolumeTool.prototype = Object.create( THREE.EventDispatcher.prototype );