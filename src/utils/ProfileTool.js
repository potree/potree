
//
// calculating area of a polygon:
// http://www.mathopenref.com/coordpolygonarea2.html
//
//
//

Potree.ProfileTool = function(scene, camera, renderer){
	
	var scope = this;
	this.enabled = false;
	
	this.scene = scene;
	this.camera = camera;
	this.renderer = renderer;
	this.domElement = renderer.domElement;
	this.mouse = {x: 0, y: 0};
	this.accuracy = 0.5;
	
	var STATE = {
		DEFAULT: 0,
		INSERT: 1
	};
	
	var state = STATE.DEFAULT;
	
	var sphereGeometry = new THREE.SphereGeometry(0.4, 10, 10);
	
	this.activeProfile;
	this.profiles = [];
	this.sceneProfile = new THREE.Scene();
	this.sceneRoot = new THREE.Object3D();
	this.sceneProfile.add(this.sceneRoot);
	
	this.light = new THREE.DirectionalLight( 0xffffff, 1 );
	this.light.position.set( 0, 0, 10 );
	this.light.lookAt(new THREE.Vector3(0,0,0));
	this.sceneProfile.add( this.light );
	
	this.hoveredElement = null;
	
	var moveEvent = function(event){
		event.target.material.emissive.setHex(0x888888);
	};
	
	var leaveEvent = function(event){
		event.target.material.emissive.setHex(0x000000);
	};
	
	var dragEvent = function(event){
	
		if(event.event.ctrlKey){
		
			var mouseStart = new THREE.Vector3(scope.dragstart.mousePos.x, scope.dragstart.mousePos.y, 0);
			var mouseEnd = new THREE.Vector3(scope.mouse.x, scope.mouse.y, 0);
			var widthStart = scope.dragstart.widthStart;
			
			var scale = 1 - 10 * (mouseStart.y - mouseEnd.y);
			scale = Math.max(0.01, scale);
			if(widthStart){
				for(var i = 0; i < scope.profiles.length; i++){
					var m = scope.profiles[i];
					var index = m.spheres.indexOf(scope.dragstart.object);
					
					if(index >= 0){
						m.setWidth(widthStart * scale);
						m.update();
						
						
						break;
					}
				}
			}
		
		}else{
	
			var I = getMousePointCloudIntersection();
				
			if(I){
				for(var i = 0; i < scope.profiles.length; i++){
					var m = scope.profiles[i];
					var index = m.spheres.indexOf(scope.dragstart.object);
					
					if(index >= 0){
						scope.profiles[i].setPosition(index, I);
						
						
						break;
					}
				}
			
				//scope.dragstart.object.position.copy(I);
			}
		}
		
		event.event.stopImmediatePropagation();
	};
	
	var dropEvent = function(event){
	
	};
	
	
	function Profile(){
		THREE.Object3D.call( this );
	
		this.points = [];
		this.spheres = [];
		this.edges = [];
		this.boxes = [];
		this.width = 1;
		this.height = 20;
		
		var sphereGeometry = new THREE.SphereGeometry(0.4, 10, 10);
		var lineColor = new THREE.Color( 0xff0000 );
		
		var createSphereMaterial = function(){
			var sphereMaterial = new THREE.MeshLambertMaterial({
				shading: THREE.SmoothShading, 
				color: 0xff0000, 
				ambient: 0xaaaaaa,
				depthTest: false, 
				depthWrite: false}
			);
			
			return sphereMaterial;
		};
		
		this.addMarker = function(point){	
			
			this.points.push(point);

			// sphere
			var sphere = new THREE.Mesh(sphereGeometry, createSphereMaterial());
			sphere.addEventListener("mousemove", moveEvent);
			sphere.addEventListener("mouseleave", leaveEvent);
			sphere.addEventListener("mousedrag", dragEvent);
			sphere.addEventListener("drop", dropEvent);
			
			this.add(sphere);
			this.spheres.push(sphere);
			
			// edges & boxes
			if(this.points.length > 1){
			
				var lineGeometry = new THREE.Geometry();
				lineGeometry.vertices.push(new THREE.Vector3(), new THREE.Vector3());
				lineGeometry.colors.push(lineColor, lineColor, lineColor);
				var lineMaterial = new THREE.LineBasicMaterial( { 
					vertexColors: THREE.VertexColors, 
					linewidth: 2, 
					transparent: true, 
					opacity: 0.4 
				});
				lineMaterial.depthTest = false;
				var edge = new THREE.Line(lineGeometry, lineMaterial);
				edge.visible = false;
				
				this.add(edge);
				this.edges.push(edge);
				
				
				var boxGeometry = new THREE.BoxGeometry(1, 1, 1);
				var boxMaterial = new THREE.MeshBasicMaterial({color: 0xff0000, transparent: true, opacity: 0.2});
				var box = new THREE.Mesh(boxGeometry, boxMaterial);
				box.visible = false;
				
				this.add(box);
				this.boxes.push(box);
				
			}

			this.setPosition(this.points.length-1, point);
		};
		
		this.removeMarker = function(index){
			this.points.splice(index, 1);
			
			this.remove(this.spheres[index]);
			
			if(index > 0){
				this.remove(this.edges[index-1]);
				this.edges.splice(index-1, 1);
				
				this.remove(this.boxes[index-1]);
				this.boxes.splice(index-1, 1);
			}
			
			this.spheres.splice(index, 1);
			
			this.update();
		};
		
		/**
		 * see http://www.mathopenref.com/coordpolygonarea2.html
		 */
		this.getArea = function(){
			var area = 0;
			var j = this.points.length - 1;
			
			for(var i = 0; i < this.points.length; i++){
				var p1 = this.points[i];
				var p2 = this.points[j];
				area += (p2.x + p1.x) * (p1.z - p2.z);
				j = i;
			}
			
			return Math.abs(area / 2);
		};
		
		this.setPosition = function(index, position){
			var point = this.points[index];			
			point.copy(position);
			
			this.update();
		};
		
		this.setWidth = function(width){
			this.width = width;
		};
		
		this.update = function(){
		
			if(this.points.length === 1){
				var point = this.points[0];
				this.spheres[0].position.copy(point);
				
				return;
			}
			
			var min = this.points[0].clone();
			var max = this.points[0].clone();
			var centroid = new THREE.Vector3();
			var lastIndex = this.points.length - 1;
			for(var i = 0; i <= lastIndex; i++){
				var point = this.points[i];
				var sphere = this.spheres[i];
				var leftIndex = (i === 0) ? lastIndex : i - 1;
				var rightIndex = (i === lastIndex) ? 0 : i + 1;
				var leftVertex = this.points[leftIndex];
				var rightVertex = this.points[rightIndex];
				var leftEdge = this.edges[leftIndex];
				var rightEdge = this.edges[i];
				var leftBox = this.boxes[leftIndex];
				var rightBox = this.boxes[i];
				
				var leftEdgeLength = point.distanceTo(leftVertex);
				var rightEdgeLength = point.distanceTo(rightVertex);
				var leftEdgeCenter = new THREE.Vector3().addVectors(leftVertex, point).multiplyScalar(0.5);
				var rightEdgeCenter = new THREE.Vector3().addVectors(point, rightVertex).multiplyScalar(0.5);
				
				sphere.position.copy(point);
				
				if(leftEdge){
					leftEdge.geometry.vertices[1].copy(point);
					leftEdge.geometry.verticesNeedUpdate = true;
					leftEdge.geometry.computeBoundingSphere();
				}
				
				if(rightEdge){
					rightEdge.geometry.vertices[0].copy(point);
					rightEdge.geometry.verticesNeedUpdate = true;
					rightEdge.geometry.computeBoundingSphere();
				}
				
				if(leftBox){
					var start = leftVertex;
					var end = point;
					var length = start.clone().setY(0).distanceTo(end.clone().setY(0));
					leftBox.scale.set(length, this.height, this.width);
					
					var center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
					var diff = new THREE.Vector3().subVectors(end, start);
					var target = new THREE.Vector3(diff.z, 0, -diff.x);
					
					leftBox.position.set(0,0,0);
					leftBox.lookAt(target);
					leftBox.position.copy(center);
				}
				
				
				
				
				centroid.add(point);
				min.min(point);
				max.max(point);
			}
			centroid.multiplyScalar(1 / this.points.length);
			
			for(var i = 0; i < this.boxes.length; i++){
				var box = this.boxes[i];
				
				box.position.y = min.y + (max.y - min.y) / 2;
				//box.scale.y = max.y - min.y + 50;
				box.scale.y = 1000000;
			}
			
		};
		
		this.raycast = function(raycaster, intersects){
			
			for(var i = 0; i < this.points.length; i++){
				var sphere = this.spheres[i];
				
				sphere.raycast(raycaster, intersects);
			}
			
			// recalculate distances because they are not necessarely correct
			// for scaled objects.
			// see https://github.com/mrdoob/three.js/issues/5827
			// TODO: remove this once the bug has been fixed
			for(var i = 0; i < intersects.length; i++){
				var I = intersects[i];
				I.distance = raycaster.ray.origin.distanceTo(I.point);
			}
			intersects.sort( function ( a, b ) { return a.distance - b.distance;} );
		}
		
		
	}
	
	Profile.prototype = Object.create( THREE.Object3D.prototype );
	
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
			var I = getMousePointCloudIntersection();
			if(I){
				var pos = I.clone();
				
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
		scope.mouse.x = ( event.clientX / scope.domElement.clientWidth ) * 2 - 1;
		scope.mouse.y = - ( event.clientY / scope.domElement.clientHeight ) * 2 + 1;
		
		if(scope.dragstart){
			
			scope.dragstart.object.dispatchEvent({type: "mousedrag", event: event});
			
		}else if(state == STATE.INSERT && scope.activeProfile){
			var I = getMousePointCloudIntersection();
			
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
				
			}
			
		}else if(event.which === 3){	
			onRightClick(event);
		}
	}
	
	function onMouseUp(event){
		
		if(scope.dragstart){
			scope.dragstart.object.dispatchEvent({type: "drop", event: event});
			scope.dragstart = null;
		}
		
	}
	
	function getHoveredElement(){
			
		var vector = new THREE.Vector3( scope.mouse.x, scope.mouse.y, 0.5 );
		vector.unproject(scope.camera);
		
		var raycaster = new THREE.Raycaster();
		raycaster.ray.set( scope.camera.position, vector.sub( scope.camera.position ).normalize() );
		
		var intersections = raycaster.intersectObjects(scope.profiles);
		
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
	
	this.startInsertion = function(args){
		state = STATE.INSERT;
		
		var args = args || {};
		var clip = args.clip || false;
		var width = args.width || 1.0;
		
		this.activeProfile = new Profile();
		this.activeProfile.clip = clip;
		this.activeProfile.setWidth(width);
		this.sceneProfile.add(this.activeProfile);
		this.profiles.push(this.activeProfile);
		this.activeProfile.addMarker(new THREE.Vector3(0,0,0));
	};
	
	this.finishInsertion = function(){
		this.activeProfile.removeMarker(this.activeProfile.points.length-1);
		this.activeProfile = null;
		state = STATE.DEFAULT;
	};
	
	this.update = function(){
		
		for(var i = 0; i < this.profiles.length; i++){
			var profile = this.profiles[i];
			for(var j = 0; j < profile.spheres.length; j++){
				var sphere = profile.spheres[j];
				var wp = sphere.getWorldPosition().applyMatrix4(this.camera.matrixWorldInverse);
				var pp = new THREE.Vector4(wp.x, wp.y, wp.z).applyMatrix4(camera.projectionMatrix);
				var w = Math.abs((wp.z  / 60)); // * (2 - pp.z / pp.w);
				sphere.scale.set(w, w, w);
			}
		}
	
		this.light.position.copy(this.camera.position);
		this.light.lookAt(this.camera.getWorldDirection().add(this.camera.position));
		
	};
	
	this.render = function(){
		this.update();
		renderer.render(this.sceneProfile, this.camera);
	};
	
	this.domElement.addEventListener( 'click', onClick, false);
	this.domElement.addEventListener( 'mousemove', onMouseMove, false );
	this.domElement.addEventListener( 'mousedown', onMouseDown, false );
	this.domElement.addEventListener( 'mouseup', onMouseUp, true );
	
};


Potree.ProfileTool.prototype = Object.create( THREE.EventDispatcher.prototype );
