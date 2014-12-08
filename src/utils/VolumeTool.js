
Potree.VolumeTool = function(scene, camera, renderer){
	
	var scope = this;
	this.enabled = false;
	
	this.scene = scene;
	this.camera = camera;
	this.renderer = renderer;
	this.domElement = renderer.domElement;
	this.mouse = {x: 0, y: 0};
	this.accuracy = 0.5;
	
	this.volumes = [];
	
	var STATE = {
		DEFAULT: 0,
		INSERT_VOLUME: 1
		
	};
	
	var state = STATE.DEFAULT;
	
	var material = new THREE.MeshBasicMaterial( {color: 0x00ff00, transparent: true, opacity: 0.3} );
	var boxGeometry = new THREE.BoxGeometry(1, 1, 1);
	boxGeometry.computeBoundingBox();
	
	function onMouseMove(event){
		scope.mouse.x = ( event.clientX / scope.domElement.clientWidth ) * 2 - 1;
		scope.mouse.y = - ( event.clientY / scope.domElement.clientHeight ) * 2 + 1;
	};
	
	function onMouseClick(event){
		if(state === STATE.INSERT_VOLUME){
			scope.finishInsertion();
		}
	};
	
	function getMousePointCloudIntersection(){
		var vector = new THREE.Vector3( scope.mouse.x, scope.mouse.y, 0.5 );
		vector.unproject(scope.camera);

		var direction = vector.sub(scope.camera.position).normalize();
		var ray = new THREE.Ray(scope.camera.position, direction);
		
		var pointClouds = [];
		scope.scene.traverse(function(object){
			if(object instanceof Potree.PointCloudOctree){
				pointClouds.push(object);
			}
		});
		
		var closestPoint = null;
		var closestPointDistance = null;
		
		for(var i = 0; i < pointClouds.length; i++){
			var pointcloud = pointClouds[i];
			var point = pointcloud.pick(scope.renderer, scope.camera, ray, {accuracy: scope.accuracy});
			
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
				var object = this.activeVolume.object;
				object.position.copy(I);
				
				var wp = object.getWorldPosition().applyMatrix4(this.camera.matrixWorldInverse);
				var pp = new THREE.Vector4(wp.x, wp.y, wp.z).applyMatrix4(camera.projectionMatrix);
				var w = Math.abs((wp.z  / 10)); 
				object.scale.set(w, w, w);
				//box.scale.set(1,1,1);
			}
		}
	};
	
	this.startInsertion = function(){
		state = STATE.INSERT_VOLUME;
		
		var box = new THREE.Mesh(boxGeometry, material);
		scene.add(box);
		
		this.activeVolume = {
			object: box
		};
	}
	
	this.finishInsertion = function(){
		this.volumes.push(this.activeVolume);
		transformationTool.setTargets([this.activeVolume.object]);
		
		this.activeVolume = null;
		state = STATE.DEFAULT;
		
	}
	
	this.domElement.addEventListener( 'click', onMouseClick, false );
	this.domElement.addEventListener( 'mousemove', onMouseMove, false );
};