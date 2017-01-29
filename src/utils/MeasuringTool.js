

Potree.MeasuringTool = class MeasuringTool{
	
	constructor(viewer){
		
		this.viewer = viewer;
		this.renderer = viewer.renderer;
		
		this.sceneMeasurement = new THREE.Scene();
		this.sceneMeasurement.name = "scene_measurement";
		this.light = new THREE.PointLight( 0xffffff, 1.0 );
		this.sceneMeasurement.add(this.light);
		
		this.viewer.inputHandler.registerInteractiveScene(this.sceneMeasurement);
		
		this.onRemove = (e) => {this.sceneMeasurement.remove(e.measurement)};
		this.onAdd = e => {this.sceneMeasurement.add(e.measurement)};
	}
	
	setScene(scene){
		if(this.scene === scene){
			return;
		}
		
		if(this.scene){
			this.scene.removeEventListener("measurement_added", this.onAdd);
			this.scene.removeEventListener("measurement_removed", this.onRemove);
		}
		
		this.scene = scene;
		
		this.scene.addEventListener("measurement_added", this.onAdd);
		this.scene.addEventListener("measurement_removed", this.onRemove);
		
	}
	
	startInsertion(args = {}){
		
		let domElement = this.viewer.renderer.domElement;

		let measure = new Potree.Measure();
		measure.showDistances =  (args.showDistances == null) ? true : args.showDistances;
		measure.showArea = args.showArea || false;
		measure.showAngles = args.showAngles || false;
		measure.showCoordinates = args.showCoordinates || false;
		measure.closed = args.closed || false;
		measure.maxMarkers = args.maxMarkers || Infinity;
		
		this.sceneMeasurement.add(measure);
		
		let insertionCallback = (e) => {
			if(e.button === THREE.MOUSE.LEFT){
				measure.addMarker(new THREE.Vector3(0, 0, 0));
				
				if(measure.points.length >= measure.maxMarkers){
					domElement.removeEventListener("mouseup", insertionCallback, true);
				}
				
				this.viewer.inputHandler.startDragging(
					measure.spheres[measure.spheres.length - 1]);
			}else if(e.button === THREE.MOUSE.RIGHT){
				measure.removeMarker(measure.points.length - 1);
				domElement.removeEventListener("mouseup", insertionCallback, true);
			}
		};
		
		if(measure.maxMarkers > 1){
			domElement.addEventListener("mouseup", insertionCallback , true);
		}
		
		measure.addMarker(new THREE.Vector3(0, 0, 0));
		this.viewer.inputHandler.startDragging(
			measure.spheres[measure.spheres.length - 1]);
			
		this.viewer.scene.addMeasurement(measure);
	}
	
	update(){
		let camera = this.viewer.scene.camera;
		let domElement = this.renderer.domElement;
		let measurements = this.viewer.scene.measurements;
		
		this.light.position.copy(camera.position);
		
		// make size independant of distance
		for(let measure of measurements){
			
			// spheres
			for(let sphere of measure.spheres){
				let distance = camera.position.distanceTo(sphere.getWorldPosition());
				let pr = Potree.utils.projectedRadius(1, camera.fov * Math.PI / 180, distance, domElement.clientHeight);
				let scale = (15 / pr);
				sphere.scale.set(scale, scale, scale);
			}
			
			// labels
			let labels = measure.edgeLabels.concat(measure.angleLabels);
			for(let label of labels){
				let distance = camera.position.distanceTo(label.getWorldPosition());
				let pr = Potree.utils.projectedRadius(1, camera.fov * Math.PI / 180, distance, domElement.clientHeight);
				let scale = (70 / pr);
				label.scale.set(scale, scale, scale);
			}
			
			// coordinate labels
			for(let j = 0; j < measure.coordinateLabels.length; j++){
				let label = measure.coordinateLabels[j]
				let sphere = measure.spheres[j];
				let point = measure.points[j];
				
				let distance = camera.position.distanceTo(sphere.getWorldPosition());
					
				let screenPos = sphere.getWorldPosition().clone().project( camera );
				screenPos.x = Math.round( ( screenPos.x + 1 ) * domElement.clientWidth  / 2 ),
				screenPos.y = Math.round( ( - screenPos.y + 1 ) * domElement.clientHeight / 2 );
				screenPos.z = 0;
				screenPos.y -= 30;
				
				let labelPos = new THREE.Vector3( 
					(screenPos.x / domElement.clientWidth) * 2 - 1, 
					-(screenPos.y / domElement.clientHeight) * 2 + 1, 
					0.5 );
				labelPos.unproject(camera);
                
				let direction = labelPos.sub(camera.position).normalize();
				labelPos = new THREE.Vector3().addVectors(
					camera.position, direction.multiplyScalar(distance));
					
				label.position.copy(labelPos);
				
				let pr = Potree.utils.projectedRadius(1, camera.fov * Math.PI / 180, distance, domElement.clientHeight);
				let scale = (70 / pr);
				label.scale.set(scale, scale, scale);
				
			}
		}
		
		
	}
	
};





