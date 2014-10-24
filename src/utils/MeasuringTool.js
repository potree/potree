
Potree.MeasuringTool = function(scene, camera, domElement){
	
	var scope = this;
	
	this.scene = scene;
	this.camera = camera;

	this.domElement = domElement;
	this.mouse = {x: 0, y: 0};
	
	var STATE = {
		DEFAULT: 0,
		PICKING: 1
	};
	
	var state = STATE.DEFAULT;
	
	this.activeMeasurement;
	this.measurements = [];
	this.sceneMeasurement = new THREE.Scene();
	this.sceneRoot = new THREE.Object3D();
	this.sceneMeasurement.add(this.sceneRoot);
	
	function Measure(){
		this.points = [];
		this.spheres = [];
		this.edges = [];
		this.sphereLabels = [];
		this.edgeLabels = [];
	}

	
	function onDoubleClick(event){
		var I = getMousePointCloudIntersection();
		if(I){
			var pos = I.clone();
		
			var sphereMaterial = new THREE.MeshNormalMaterial({shading: THREE.SmoothShading})
			var sphereGeometry = new THREE.SphereGeometry(0.4, 10, 10);
			
			var sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
			sphere.position.copy(I);
			scope.sceneRoot.add(sphere);
			
			var sphereEnd = new THREE.Mesh(sphereGeometry, sphereMaterial);
			sphereEnd.position.copy(I);
			scope.sceneRoot.add(sphereEnd);
			
			var msg = pos.x.toFixed(2) + " / " + pos.y.toFixed(2) + " / " + pos.z.toFixed(2);
			
			var label = new Potree.TextSprite(msg);
			label.setBorderColor({r:0, g:255, b:0, a:1.0});
			label.material.depthTest = false;
			label.material.opacity = 0;
			label.position.copy(I);
			label.position.y += 0.5;
			scope.sceneRoot.add( label );
			
			var labelEnd = new Potree.TextSprite(msg);
			labelEnd.setBorderColor({r:0, g:255, b:0, a:1.0});
			labelEnd.material.depthTest = false;
			labelEnd.material.opacity = 0;
			labelEnd.position.copy(I);
			labelEnd.position.y += 0.5;
			scope.sceneRoot.add( labelEnd );
			
			var lc = new THREE.Color( 0xff0000 );
			var lineGeometry = new THREE.Geometry();
			lineGeometry.vertices.push(I.clone(), I.clone());
			lineGeometry.colors.push(lc, lc, lc);
			var lineMaterial = new THREE.LineBasicMaterial( { vertexColors: THREE.VertexColors } );
			lineMaterial.depthTest = false;
			sConnection = new THREE.Line(lineGeometry, lineMaterial);
			scope.sceneRoot.add(sConnection);
			
			var edgeLabel = new Potree.TextSprite(0);
			edgeLabel.setBorderColor({r:0, g:255, b:0, a:0.0});
			edgeLabel.setBackgroundColor({r:0, g:255, b:0, a:0.0});
			edgeLabel.material.depthTest = false;
			edgeLabel.position.copy(I);
			edgeLabel.position.y += 0.5;
			scope.sceneRoot.add( edgeLabel );
			
			
			//floatingOrigin.addReferenceFrame(sphere);
			//floatingOrigin.addReferenceFrame(sphereEnd);
			//floatingOrigin.addReferenceFrame(label);
			//floatingOrigin.addReferenceFrame(labelEnd);
			//floatingOrigin.addReferenceFrame(sConnection);
			//floatingOrigin.addReferenceFrame(edgeLabel);
			
			if(state === STATE.DEFAULT){
				state = STATE.PICKING;
				scope.activeMeasurement = new Measure();
				
				scope.activeMeasurement.spheres.push(sphere);
			}else if(state === STATE.PICKING){
			
			}
			
			scope.activeMeasurement.points.push(I);
			
			scope.activeMeasurement.spheres.push(sphereEnd);
			scope.activeMeasurement.sphereLabels.push(label);
			scope.activeMeasurement.sphereLabels.push(labelEnd);
			scope.activeMeasurement.edges.push(sConnection);
			scope.activeMeasurement.edgeLabels.push(edgeLabel);
			
			
			var event = {
				type: 'newpoint',
				position: pos.clone()
			};
			scope.dispatchEvent(event);
			
		}
	};
	
	function onMouseMove(event){
		scope.mouse.x = ( event.clientX / scope.domElement.clientWidth ) * 2 - 1;
		scope.mouse.y = - ( event.clientY / scope.domElement.clientHeight ) * 2 + 1;
		
		if(state == STATE.PICKING && scope.activeMeasurement){
			var I = getMousePointCloudIntersection();
			
			if(I){
				var pos = I.clone();
				var l = scope.activeMeasurement.spheres.length;
				var sphere = scope.activeMeasurement.spheres[l-1];
				var label = scope.activeMeasurement.sphereLabels[l-1];
				var edge = scope.activeMeasurement.edges[l-2];
				var edgeLabel = scope.activeMeasurement.edgeLabels[l-2];
				
				var msg = pos.x.toFixed(2) + " / " + pos.y.toFixed(2) + " / " + pos.z.toFixed(2);
				label.setText(msg);
				
				sphere.position.copy(I);
				label.position.copy(I);
				label.position.y += 0.5;
				
				edge.geometry.vertices[1].copy(I);
				edge.geometry.verticesNeedUpdate = true;
				edge.geometry.computeBoundingSphere();
				
				var edgeLabelPos = edge.geometry.vertices[1].clone().add(edge.geometry.vertices[0]).multiplyScalar(0.5);
				var edgeLabelText = edge.geometry.vertices[0].distanceTo(edge.geometry.vertices[1]).toFixed(2);
				edgeLabel.position.copy(edgeLabelPos);
				edgeLabel.setText(edgeLabelText);
				edgeLabel.scale.multiplyScalar(10);
			}
			
		}
	};
	
	function onRightClick(event){
		if(state == STATE.PICKING){
			var sphere = scope.activeMeasurement.spheres.pop();
			var edge = scope.activeMeasurement.edges.pop();
			var sphereLabel = scope.activeMeasurement.sphereLabels.pop();
			var edgeLabel = scope.activeMeasurement.edgeLabels.pop();
			
			scope.sceneRoot.remove(sphere);
			scope.sceneRoot.remove(edge);
			scope.sceneRoot.remove(sphereLabel);
			scope.sceneRoot.remove(edgeLabel);
		
			scope.measurements.push(scope.activeMeasurement);
			scope.activeMeasurement = undefined;
		
			state = STATE.DEFAULT;
		}
	}
	
	function onMouseDown(event){
		if(event.which === 3){	
			onRightClick(event);
		}
	}
	
	function getMousePointCloudIntersection(){
		var vector = new THREE.Vector3( scope.mouse.x, scope.mouse.y, 0.5 );
		var projector = new THREE.Projector();
		projector.unprojectVector( vector, scope.camera );
		
		var raycaster = new THREE.Raycaster();
		raycaster.params = {"PointCloud" : {threshold: 1}};
		raycaster.ray.set( scope.camera.position, vector.sub( scope.camera.position ).normalize() );
		
		var pointClouds = [];
		scope.scene.traverse(function(object){
			if(object instanceof Potree.PointCloudOctree){
				pointClouds.push(object);
			}
		});
		
		var intersects = raycaster.intersectObjects(pointClouds, true);
		
		if(intersects.length > 0){
			var I = intersects[0];			
			
			return I.point;
		}else{
			return undefined;
		}
	}
	
	this.domElement.addEventListener("dblclick", onDoubleClick, false);
	this.domElement.addEventListener( 'mousemove', onMouseMove, false );
	this.domElement.addEventListener( 'mousedown', onMouseDown, false );
};


Potree.MeasuringTool.prototype = Object.create( THREE.EventDispatcher.prototype );