
Potree.PolygonClipVolume = class extends THREE.Object3D{
	
	constructor(viewMatrix, projMatrix){
		super();

		this.constructor.counter = (this.constructor.counter === undefined) ? 0 : this.constructor.counter + 1;
		this.name = "polygon_clip_volume_" + this.constructor.counter;

		this.viewMatrix = viewMatrix.clone();
		this.projMatrix = projMatrix.clone();
		this.markers = [];
		this.edges = [];
		this.sphereGeometry = new THREE.SphereGeometry(0.01, 5, 5);
		this.color = new THREE.Color( 0xff0000 );
		this.initialized = false;

		this.material = this.createSphereMaterial();
	}

	createSphereMaterial(){
		let sphereMaterial = new THREE.MeshBasicMaterial( {
			color: this.color, 
			depthTest: false, 
			depthWrite: false}
		);
		
		return sphereMaterial;
	};

	addMarker() {
		let marker = new THREE.Mesh(this.sphereGeometry, this.createSphereMaterial());

		if(this.markers.length > 0) {
			marker.position.copy(this.markers[this.markers.length - 1].position);
		}

		let cancel = {
			callback: null
		};

		let drag = e => {
			let pos = new THREE.Vector3(
				(e.drag.end.x / e.viewer.renderer.domElement.clientWidth) * 2 - 1, 
				-(e.drag.end.y / e.viewer.renderer.domElement.clientHeight) * 2 + 1, 
				0.5);
			let camera = e.viewer.scene.getActiveCamera();
			pos.unproject(camera);
			var dir = pos.sub(camera.position).normalize();
			var distance = -camera.position.z / dir.z;
			pos = camera.position.clone().add( dir.multiplyScalar(1));

			marker.position.copy(pos);
		};

		let addEdge = (start, end) => {
			let lineGeometry = new THREE.Geometry();
			lineGeometry.vertices.push(this.markers[start].position, this.markers[end].position);
			lineGeometry.colors.push(this.color, this.color, this.color);
			let lineMaterial = new THREE.LineBasicMaterial( { 
				linewidth: 1
			});
			lineMaterial.depthTest = false;
			let edge = new THREE.Line(lineGeometry, lineMaterial);
			edge.visible = true;

			this.add(edge);
			this.edges.push(edge);
		};
		
		let drop = e => {	
			cancel.callback();
		};
		
		cancel.callback = e => {
			marker.removeEventListener("drag", drag);
			marker.removeEventListener("drop", drop);
		};
		
		marker.addEventListener("drag", drag);
		marker.addEventListener("drop", drop);

		this.markers.push(marker);
		this.add(marker);
	}

	addEdge(start, end) {
		let lineGeometry = new THREE.Geometry();
		lineGeometry.vertices.push(this.markers[start].position, this.markers[end].position);
		lineGeometry.colors.push(this.color, this.color, this.color);
		let lineMaterial = new THREE.LineBasicMaterial( { 
			linewidth: 1
		});
		lineMaterial.depthTest = false;
		let edge = new THREE.Line(lineGeometry, lineMaterial);
		edge.visible = true;

		this.add(edge);
		this.edges.push(edge);
	};

	removeLastMarker() {
		if(this.markers.length > 0) {
			this.remove(this.markers[this.markers.length - 1]);
			this.markers.splice(this.markers.length - 1, 1);
		}
	}

};