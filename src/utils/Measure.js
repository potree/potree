
Potree.Measure = class{
	constructor(){
		this.sceneNode = new THREE.Object3D();
		this.dispatcher = new THREE.EventDispatcher();
		
		this.points = [];
		this._showDistances = true;
		this._showCoordinates = false;
		this._showArea = false;
		this._closed = true;
		this._showAngles = false;
		this.maxMarkers = Number.MAX_SAFE_INTEGER;
		
		this.spheres = [];
		this.edges = [];
		this.sphereLabels = [];
		this.edgeLabels = [];
		this.angleLabels = [];
		this.coordinateLabels = [];
		
		this.areaLabel = new Potree.TextSprite("");
		this.areaLabel.setBorderColor({r:0, g:0, b:0, a:0.8});
		this.areaLabel.setBackgroundColor({r:0, g:0, b:0, a:0.3});
		this.areaLabel.setTextColor({r:180, g:220, b:180, a:1.0});
		this.areaLabel.material.depthTest = false;
		this.areaLabel.material.opacity = 1;
		this.areaLabel.visible = false;;
		this.sceneNode.add(this.areaLabel);
		
		this.sphereGeometry = new THREE.SphereGeometry(0.4, 10, 10);
		this.color = new THREE.Color( 0xff0000 );
	}
	
	createSphereMaterial(){
		let sphereMaterial = new THREE.MeshLambertMaterial({
			shading: THREE.SmoothShading, 
			color: this.color, 
			depthTest: false, 
			depthWrite: false}
		);
		
		return sphereMaterial;
	};
	
	addMarker(point){
		if(point instanceof THREE.Vector3){
			point = {position: point};
		}
		this.points.push(point);
		
		// sphere
		let sphere = new THREE.Mesh(this.sphereGeometry, this.createSphereMaterial());
		
		{
			let moveEvent = (event) => {
				event.target.material.emissive.setHex(0x888888);
			};
			
			let leaveEvent = (event) => {
				event.target.material.emissive.setHex(0x000000);
			};
			
			let dragEvent = (event) => {
				let tool = event.tool;
				let dragstart = tool.dragstart;
				let mouse = tool.mouse;
			
				let point = tool.getMousePointCloudIntersection.bind(tool)();
					
				if(point){
					let index = this.spheres.indexOf(tool.dragstart.object);
					this.setMarker(index, point);
				}
				
				event.event.stopImmediatePropagation();
			};
			
			let dropEvent = (event) => { };
			
			sphere.addEventListener("move", moveEvent);
			sphere.addEventListener("leave", leaveEvent);
			sphere.addEventListener("drag", dragEvent);
			sphere.addEventListener("drop", dropEvent);
		}
		
		this.sceneNode.add(sphere);
		this.spheres.push(sphere);
		
		{ // edges
			let lineGeometry = new THREE.Geometry();
			lineGeometry.vertices.push(new THREE.Vector3(), new THREE.Vector3());
			lineGeometry.colors.push(this.color, this.color, this.color);
			let lineMaterial = new THREE.LineBasicMaterial( { 
				linewidth: 1
			});
			lineMaterial.depthTest = false;
			let edge = new THREE.Line(lineGeometry, lineMaterial);
			edge.visible = true;
			
			this.sceneNode.add(edge);
			this.edges.push(edge);
		}
		
		{ // edge labels
			let edgeLabel = new Potree.TextSprite();
			edgeLabel.setBorderColor({r:0, g:0, b:0, a:0.8});
			edgeLabel.setBackgroundColor({r:0, g:0, b:0, a:0.3});
			edgeLabel.material.depthTest = false;
			edgeLabel.visible = false;
			this.edgeLabels.push(edgeLabel);
			this.sceneNode.add(edgeLabel);
		}
		
		{ // angle labels
			let angleLabel = new Potree.TextSprite();
            angleLabel.setBorderColor({r:0, g:0, b:0, a:0.8});
			angleLabel.setBackgroundColor({r:0, g:0, b:0, a:0.3});
            angleLabel.material.depthTest = false;
            angleLabel.material.opacity = 1;
			angleLabel.visible = false;
			this.angleLabels.push(angleLabel);
			this.sceneNode.add(angleLabel);
		}
		
		{ // coordinate labels
			let coordinateLabel = new Potree.TextSprite();
			coordinateLabel.setBorderColor({r:0, g:0, b:0, a:0.8});
			coordinateLabel.setBackgroundColor({r:0, g:0, b:0, a:0.3});
			coordinateLabel.material.depthTest = false;
			coordinateLabel.material.opacity = 1;
			coordinateLabel.visible = false;
			this.coordinateLabels.push(coordinateLabel);
			this.sceneNode.add(coordinateLabel);
		}

		let event = {
			type: "marker_added",
			measurement: this
		};
		this.dispatcher.dispatchEvent(event);
		
		this.setMarker(this.points.length-1, point);
	};
	
	removeMarker(index){
		this.points.splice(index, 1);
		
		this.sceneNode.remove(this.spheres[index]);
		
		let edgeIndex = (index === 0) ? 0 : (index - 1);
		this.sceneNode.remove(this.edges[edgeIndex]);
		this.edges.splice(edgeIndex, 1);
		
		this.sceneNode.remove(this.edgeLabels[edgeIndex]);
		this.edgeLabels.splice(edgeIndex, 1);
		this.coordinateLabels.splice(index, 1);
		
		this.spheres.splice(index, 1);
		
		this.update();
		
		this.dispatcher.dispatchEvent({type: "marker_removed", measurement: this});
	};
	
	setMarker(index, point){
		this.points[index] = point;
		
		let event = {
			type: 		'marker_moved',
			measure:	this,
			index:		index,
			position: 	point.position.clone()
		};
		this.dispatcher.dispatchEvent(event);
		
		this.update();
	}
	
	setPosition(index, position){
		let point = this.points[index];			
		point.position.copy(position);
		
		let event = {
			type: 		'marker_moved',
			measure:	this,
			index:		index,
			position: 	position.clone()
		};
		this.dispatcher.dispatchEvent(event);
		
		this.update();
	};
	
	getArea(){
		let area = 0;
		let j = this.points.length - 1;
		
		for(let i = 0; i < this.points.length; i++){
			let p1 = this.points[i].position;
			let p2 = this.points[j].position;
			area += (p2.x + p1.x) * (p1.z - p2.z);
			j = i;
		}
		
		return Math.abs(area / 2);
	};
	
	getAngleBetweenLines(cornerPoint, point1, point2) {
        let v1 = new THREE.Vector3().subVectors(point1.position, cornerPoint.position);
        let v2 = new THREE.Vector3().subVectors(point2.position, cornerPoint.position);
        return v1.angleTo(v2);
    };
	
	getAngle(index){
	
		if(this.points.length < 3 || index >= this.points.length){
			return 0;
		}
		
		let previous = (index === 0) ? this.points[this.points.length-1] : this.points[index-1];
		let point = this.points[index];
		let next = this.points[(index + 1) % (this.points.length)];
		
		return this.getAngleBetweenLines(point, previous, next);
	};
	
	update(){
	
		if(this.points.length === 0){
			return;
		}else if(this.points.length === 1){
			let point = this.points[0];
			let position = point.position;
			this.spheres[0].position.copy(position);
			
			{// coordinate labels
				let coordinateLabel = this.coordinateLabels[0];
				
				let labelPos = position.clone().add(new THREE.Vector3(0,1,0));
				coordinateLabel.position.copy(labelPos);
				
				let msg = Potree.utils.addCommas(position.x.toFixed(2)) 
					+ " / " + Potree.utils.addCommas(position.y.toFixed(2)) 
					+ " / " + Potree.utils.addCommas(position.z.toFixed(2));
				coordinateLabel.setText(msg);
				
				//coordinateLabel.visible = this.showCoordinates && (index < lastIndex || this.closed);
			}
			
			return;
		}
		
		let lastIndex = this.points.length - 1;
		
		let centroid = new THREE.Vector3();
		for(let i = 0; i <= lastIndex; i++){
			let point = this.points[i];
			centroid.add(point.position);
		}
		centroid.divideScalar(this.points.length);
		
		for(let i = 0; i <= lastIndex; i++){
			let index = i;
			let nextIndex = ( i + 1 > lastIndex ) ? 0 : i + 1;
			let previousIndex = (i === 0) ? lastIndex : i - 1;
		
			let point = this.points[index];
			let nextPoint = this.points[nextIndex];
			let previousPoint = this.points[previousIndex];
			
			let sphere = this.spheres[index];
			
			// spheres
			sphere.position.copy(point.position);
			sphere.material.color = this.color;

			{// edges
				let edge = this.edges[index];
				
				edge.material.color = this.color;
				
				edge.geometry.vertices[0].copy(point.position);
				edge.geometry.vertices[1].copy(nextPoint.position);
				
				edge.geometry.verticesNeedUpdate = true;
				edge.geometry.computeBoundingSphere();
				edge.visible = index < lastIndex || this.closed;
			}
			
			{// edge labels
				let edgeLabel = this.edgeLabels[i];
			
				let center = new THREE.Vector3().add(point.position);
				center.add(nextPoint.position);
				center = center.multiplyScalar(0.5);
				let distance = point.position.distanceTo(nextPoint.position);
				
				edgeLabel.position.copy(center);
				edgeLabel.setText(Potree.utils.addCommas(distance.toFixed(2)));
				edgeLabel.visible = this.showDistances && (index < lastIndex || this.closed) && this.points.length >= 2 && distance > 0;
			}
			
			{// angle labels
				let angleLabel = this.angleLabels[i];
				let angle = this.getAngleBetweenLines(point, previousPoint, nextPoint);
				
				let dir = nextPoint.position.clone().sub(previousPoint.position);
				dir.multiplyScalar(0.5);
				dir = previousPoint.position.clone().add(dir).sub(point.position).normalize();
				
				let dist = Math.min(point.position.distanceTo(previousPoint.position), point.position.distanceTo(nextPoint.position));
				dist = dist / 9;
				
				let labelPos = point.position.clone().add(dir.multiplyScalar(dist));
				angleLabel.position.copy(labelPos);
				
				let msg = Potree.utils.addCommas((angle*(180.0/Math.PI)).toFixed(1)) + '\u00B0';
				angleLabel.setText(msg);
				
				angleLabel.visible = this.showAngles && (index < lastIndex || this.closed) && this.points.length >= 3 && angle > 0;
			}
			
			{// coordinate labels
				let coordinateLabel = this.coordinateLabels[0];
				
				let labelPos = point.position.clone().add(new THREE.Vector3(0,1,0));
				coordinateLabel.position.copy(labelPos);
				
				let msg = Potree.utils.addCommas(point.position.x.toFixed(2)) 
					+ " / " + Potree.utils.addCommas(point.position.y.toFixed(2)) 
					+ " / " + Potree.utils.addCommas(point.position.z.toFixed(2));
				coordinateLabel.setText(msg);
				
				coordinateLabel.visible = this.showCoordinates && (index < lastIndex || this.closed);
			}
		}
		
		// update area label
		this.areaLabel.position.copy(centroid);
		this.areaLabel.visible = this.showArea && this.points.length >= 3;
		let msg = Potree.utils.addCommas(this.getArea().toFixed(1)) + "";
		this.areaLabel.setText(msg);
	};
	
	raycast(raycaster, intersects){
		
		for(let i = 0; i < this.points.length; i++){
			let sphere = this.spheres[i];
			
			sphere.raycast(raycaster, intersects);
		}
		
		// recalculate distances because they are not necessarely correct
		// for scaled objects.
		// see https://github.com/mrdoob/three.js/issues/5827
		// TODO: remove this once the bug has been fixed
		for(let i = 0; i < intersects.length; i++){
			let I = intersects[i];
			I.distance = raycaster.ray.origin.distanceTo(I.point);
		}
		intersects.sort( function ( a, b ) { return a.distance - b.distance;} );
	};
	
	get showCoordinates(){
		return this._showCoordinates;
	}
	
	set showCoordinates(value){
		this._showCoordinates = value;
		this.update();
	}
	
	get showAngles(){
		return this._showAngles;
	}
	
	set showAngles(value){
		this._showAngles = value;
		this.update();
	}
	
	get showArea(){
		return this._showArea;
	}
	
	set showArea(value){
		this._showArea = value;
		this.update();
	}
	
	get closed(){
		return this._closed;
	}
	
	set closed(value){
		this._closed = value;
		this.update();
	}
	
	get showDistances(){
		return this._showDistances;
	}
	
	set showDistances(value){
		this._showDistances = value;
		this.update();
	}
};