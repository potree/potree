

Potree.MeasuringTool = class{
	
	constructor(renderer){
		this.enabled = false;
		
		this.scene = null;
		this.renderer = renderer;
		this.domElement = renderer.domElement;
		this.mouse = {x: 0, y: 0};
		
		this.STATE = {
			DEFAULT: 0,
			INSERT: 1
		};
		
		this.state = this.STATE.DEFAULT;
		
		this.activeMeasurement = null;
		this.sceneMeasurement = new THREE.Scene();
		this.sceneRoot = new THREE.Object3D();
		this.sceneMeasurement.add(this.sceneRoot);
		
		this.light = new THREE.DirectionalLight( 0xffffff, 1 );
		this.light.position.set( 0, 0, 10 );
		this.light.lookAt(new THREE.Vector3(0,0,0));
		this.sceneMeasurement.add( this.light );
		
		this.hoveredElement = null;
		this.dispatcher = new THREE.EventDispatcher();
		
		let onClick = function(event){
			if(this.state === this.STATE.INSERT){
				let point = this.getMousePointCloudIntersection();
				if(point){
					let pos = point.position.clone();
					
					this.activeMeasurement.addMarker(pos);
					
					let event = {
						type: 'newpoint',
						position: pos.clone()
					};
					this.dispatcher.dispatchEvent(event);
					
					if(this.activeMeasurement.points.length > this.activeMeasurement.maxMarkers){
						this.finishInsertion();
					}
				}
			}
		}.bind(this);
		
		let onMouseMove = function(event){
			if(!this.scene){
				return;
			}
			
			let rect = this.domElement.getBoundingClientRect();
			this.mouse.x = ((event.clientX - rect.left) / this.domElement.clientWidth) * 2 - 1;
			this.mouse.y = -((event.clientY - rect.top) / this.domElement.clientHeight) * 2 + 1;
			
			//console.log(this.mouse);
			
			if(this.dragstart){
				let arg = {
					type: "drag", 
					event: event, 
					tool: this
				};
				this.dragstart.object.dispatchEvent(arg);
				
			}else if(this.state == this.STATE.INSERT && this.activeMeasurement){
				let point = this.getMousePointCloudIntersection();
				
				if(point){
					//let position = point.position;
					let lastIndex = this.activeMeasurement.points.length-1;
					//this.activeMeasurement.setPosition(lastIndex, position);
					this.activeMeasurement.setMarker(lastIndex, point);
				}
				
			}else{
				let I = this.getHoveredElement();
				
				if(I){
					
					I.object.dispatchEvent({type: "move", target: I.object, event: event});
					
					if(this.hoveredElement && this.hoveredElement !== I.object){
						this.hoveredElement.dispatchEvent({type: "leave", target: this.hoveredElement, event: event});
					}
					
					this.hoveredElement = I.object;
					
				}else{
				
					if(this.hoveredElement){
						this.hoveredElement.dispatchEvent({type: "leave", target: this.hoveredElement, event: event});
					}
					
					this.hoveredElement = null;
				
				}
			}
		}.bind(this);
		
		let onRightClick = function(event){
			if(this.state == this.STATE.INSERT){			
				this.finishInsertion();
			}
		}.bind(this);
		
		let onMouseDown = function(event){
			if(event.which === 1){
			
				if(this.state !== this.STATE.DEFAULT){
					event.stopImmediatePropagation();
				}
				
				let I = this.getHoveredElement();
				
				if(I){
					
					this.dragstart = {
						object: I.object, 
						sceneClickPos: I.point,
						sceneStartPos: this.sceneRoot.position.clone(),
						mousePos: {x: this.mouse.x, y: this.mouse.y}
					};
					
					event.stopImmediatePropagation();
					
				}
				
			}else if(event.which === 3){	
				onRightClick(event);
			}
		}.bind(this);
		
		let onDoubleClick = function(event){
			
			// fix move event after double click
			// see: http://stackoverflow.com/questions/8125165/event-listener-for-dblclick-causes-event-for-mousemove-to-not-work-and-show-a-ci
			if (window.getSelection){
				window.getSelection().removeAllRanges();
			}else if (document.selection){
				document.selection.empty();
			}
			
			
			if(this.activeMeasurement && this.state === this.STATE.INSERT){
				this.activeMeasurement.removeMarker(this.activeMeasurement.points.length-1);
				this.finishInsertion();
				event.stopImmediatePropagation();
			}
		}.bind(this);
		
		let onMouseUp = function(event){
			if(this.dragstart){
				this.dragstart.object.dispatchEvent({type: "drop", event: event});
				this.dragstart = null;
			}
		}.bind(this);
		
		this.domElement.addEventListener( 'click', onClick, false);
		this.domElement.addEventListener( 'dblclick', onDoubleClick, false);
		this.domElement.addEventListener( 'mousemove', onMouseMove, false );
		this.domElement.addEventListener( 'mousedown', onMouseDown, false );
		this.domElement.addEventListener( 'mouseup', onMouseUp, true );
	}
	
	setScene(scene){
		
		this.scene = scene;
		this.measurements = this.scene.measurements;
		
		this.activeMeasurement = null;
		this.sceneMeasurement = new THREE.Scene();
		this.sceneRoot = new THREE.Object3D();
		this.sceneMeasurement.add(this.sceneRoot);
		
		this.light = new THREE.DirectionalLight( 0xffffff, 1 );
		this.light.position.set( 0, 0, 10 );
		this.light.lookAt(new THREE.Vector3(0,0,0));
		this.sceneMeasurement.add( this.light );
		
		for(let measurement of this.scene.measurements){
			this.sceneMeasurement.add(measurement.sceneNode);
		}
		
		this.scene.addEventListener("measurement_added", (e) => {
			if(this.scene === e.scene){
				this.sceneMeasurement.add(e.measurement.sceneNode);
			}
		});
		
		this.scene.addEventListener("measurement_removed", (e) => {
			if(this.scene === e.scene){
				this.sceneMeasurement.remove(e.measurement.sceneNode);
			}
		});
	}
	
	addEventListener(type, callback){
		this.dispatcher.addEventListener(type, callback);
	}
	
	getHoveredElement(){
			
		let vector = new THREE.Vector3( this.mouse.x, this.mouse.y, 0.5 );
		vector.unproject(this.scene.camera);
		
		let raycaster = new THREE.Raycaster();
		raycaster.ray.set( this.scene.camera.position, vector.sub( this.scene.camera.position ).normalize() );
		
		let spheres = [];
		for(let i = 0; i < this.measurements.length; i++){
			let m = this.measurements[i];
			
			for(let j = 0; j < m.spheres.length; j++){
				spheres.push(m.spheres[j]);
			}
		}
		
		let intersections = raycaster.intersectObjects(spheres, true);
		if(intersections.length > 0){
			return intersections[0];
		}else{
			return false;
		}
	};
	
	getMousePointCloudIntersection(){
		let vector = new THREE.Vector3( this.mouse.x, this.mouse.y, 0.5 );
		vector.unproject(this.scene.camera);

		let direction = vector.sub(this.scene.camera.position).normalize();
		let ray = new THREE.Ray(this.scene.camera.position, direction);
		
		let pointClouds = [];
		this.scene.scenePointCloud.traverse(function(object){
			if(object instanceof Potree.PointCloudOctree || object instanceof Potree.PointCloudArena4D){
				pointClouds.push(object);
			}
		});
		
		let closestPoint = null;
		let closestPointDistance = null;
		
		for(let i = 0; i < pointClouds.length; i++){
			let pointcloud = pointClouds[i];
			let point = pointcloud.pick(this.renderer, this.scene.camera, ray);
			
			if(!point){
				continue;
			}
			
			let distance = this.scene.camera.position.distanceTo(point.position);
			
			if(!closestPoint || distance < closestPointDistance){
				closestPoint = point;
				closestPointDistance = distance;
			}
		}
		
		return closestPoint ? closestPoint : null;
	};
	
	startInsertion(args = {}){
		this.state = this.STATE.INSERT;
		
		let showDistances = (typeof args.showDistances != "undefined") ? args.showDistances : true;
		let showArea = (typeof args.showArea != "undefined") ? args.showArea : false;
		let showAngles = (typeof args.showAngles != "undefined") ? args.showAngles : false;
		let closed = (typeof args.closed != "undefined") ? args.closed : false;
		let showCoordinates = (typeof args.showCoordinates != "undefined") ? args.showCoordinates : false;
		let maxMarkers = args.maxMarkers || Number.MAX_SAFE_INTEGER;
		
		let measurement = new Potree.Measure();
		measurement.showDistances = showDistances;
		measurement.showArea = showArea;
		measurement.showAngles = showAngles;
		measurement.closed = closed;
		measurement.showCoordinates = showCoordinates;
		measurement.maxMarkers = maxMarkers;
		measurement.addMarker(new THREE.Vector3(Infinity,Infinity,Infinity));

		this.scene.addMeasurement(measurement);
		this.activeMeasurement = measurement;
		
		return this.activeMeasurement;
	};
	
	finishInsertion(){
		this.activeMeasurement.removeMarker(this.activeMeasurement.points.length-1);
		
		let event = {
			type: "insertion_finished",
			measurement: this.activeMeasurement
		};
		this.dispatcher.dispatchEvent(event);
		
		this.activeMeasurement = null;
		this.state = this.STATE.DEFAULT;
	};
	
	update(){
		if(!this.scene){
			return;
		}
		
		let measurements = [];
		for(let i = 0; i < this.measurements.length; i++){
			measurements.push(this.measurements[i]);
		}
		if(this.activeMeasurement){
			measurements.push(this.activeMeasurement);
		}
		
		// make sizes independant of distance and fov
		for(let i = 0; i < measurements.length; i++){
			let measurement = measurements[i];
			
			// spheres
			for(let j = 0; j < measurement.spheres.length; j++){
				let sphere = measurement.spheres[j];
				
				let distance = this.scene.camera.position.distanceTo(sphere.getWorldPosition());
				let pr = Potree.utils.projectedRadius(1, this.scene.camera.fov * Math.PI / 180, distance, this.renderer.domElement.clientHeight);
				let scale = (15 / pr);
				sphere.scale.set(scale, scale, scale);
				
			}
			
			// edgeLabels
			for(let j = 0; j < measurement.edgeLabels.length; j++){
				let label = measurement.edgeLabels[j];
				
				let distance = this.scene.camera.position.distanceTo(label.getWorldPosition());
				let pr = Potree.utils.projectedRadius(1, this.scene.camera.fov * Math.PI / 180, distance, this.renderer.domElement.clientHeight);
				let scale = (70 / pr);
				label.scale.set(scale, scale, scale);
			}
			
			// angle labels
			for(let j = 0; j < measurement.edgeLabels.length; j++){
				let label = measurement.angleLabels[j];
				
				let distance = this.scene.camera.position.distanceTo(label.getWorldPosition());
				let pr = Potree.utils.projectedRadius(1, this.scene.camera.fov * Math.PI / 180, distance, this.renderer.domElement.clientHeight);
				let scale = (70 / pr);
				label.scale.set(scale, scale, scale);
			}
			
			// coordinate labels
			for(let j = 0; j < measurement.coordinateLabels.length; j++){
				let label = measurement.coordinateLabels[j];
				let sphere = measurement.spheres[j];
				let point = measurement.points[j];
				
				let distance = this.scene.camera.position.distanceTo(sphere.getWorldPosition());
					
				let screenPos = sphere.getWorldPosition().clone().project( this.scene.camera );
				screenPos.x = Math.round( ( screenPos.x + 1 ) * this.renderer.domElement.clientWidth  / 2 ),
				screenPos.y = Math.round( ( - screenPos.y + 1 ) * this.renderer.domElement.clientHeight / 2 );
				screenPos.z = 0;
				screenPos.y -= 30;
				
				let labelPos = new THREE.Vector3( 
					(screenPos.x / this.renderer.domElement.clientWidth) * 2 - 1, 
					-(screenPos.y / this.renderer.domElement.clientHeight) * 2 + 1, 
					0.5 );
				labelPos.unproject(this.scene.camera);
                
				let direction = labelPos.sub(this.scene.camera.position).normalize();
				labelPos = new THREE.Vector3().addVectors(
					this.scene.camera.position, direction.multiplyScalar(distance));
					
				label.position.copy(labelPos);
				
				let pr = Potree.utils.projectedRadius(1, this.scene.camera.fov * Math.PI / 180, distance, this.renderer.domElement.clientHeight);
				let scale = (70 / pr);
				label.scale.set(scale, scale, scale);
				
				//let geoCoord = point.position;
				//let txt = Potree.utils.addCommas(geoCoord.x.toFixed(2)) + " / ";
				//txt += Potree.utils.addCommas((geoCoord.y).toFixed(2)) + " / ";
				//txt += Potree.utils.addCommas(geoCoord.z.toFixed(2));
				//label.setText(txt);
			}
			
			// areaLabel
			let distance = this.scene.camera.position.distanceTo(measurement.areaLabel.getWorldPosition());
			let pr = Potree.utils.projectedRadius(1, this.scene.camera.fov * Math.PI / 180, distance, this.renderer.domElement.clientHeight);
			let scale = (80 / pr);
			measurement.areaLabel.scale.set(scale, scale, scale);
		}
	
		this.light.position.copy(this.scene.camera.position);
		this.light.lookAt(this.scene.camera.getWorldDirection().add(this.scene.camera.position));
		
	};
	
	render(){
		this.update();
		this.renderer.render(this.sceneMeasurement, this.scene.camera);
	};

};
