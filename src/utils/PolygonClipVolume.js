
export class PolygonClipVolume extends THREE.Object3D{
	
	constructor(camera){
		super();

		this.constructor.counter = (this.constructor.counter === undefined) ? 0 : this.constructor.counter + 1;
		this.name = "polygon_clip_volume_" + this.constructor.counter;

		this.camera = camera.clone();
		this.camera.rotation.set(...camera.rotation.toArray()); // [r85] workaround because camera.clone() doesn't work on rotation
		this.camera.updateMatrixWorld();
		this.camera.updateProjectionMatrix();
		this.camera.matrixWorldInverse.getInverse(this.camera.matrixWorld);

		this.viewMatrix = this.camera.matrixWorldInverse.clone();
		this.projMatrix = this.camera.projectionMatrix.clone();

		// projected markers
		this.markers = [];
		this.initialized = false;
	}

	addMarker() {

		let marker = new THREE.Mesh();

		let cancel;

		let drag = e => {
			let size = e.viewer.renderer.getSize();
			let projectedPos = new THREE.Vector3(
				2.0 * (e.drag.end.x / size.width) - 1.0,
				-2.0 * (e.drag.end.y / size.height) + 1.0,
				0
			);

			marker.position.copy(projectedPos);
		};
		
		let drop = e => {	
			cancel();
		};
		
		cancel = e => {
			marker.removeEventListener("drag", drag);
			marker.removeEventListener("drop", drop);
		};
		
		marker.addEventListener("drag", drag);
		marker.addEventListener("drop", drop);


		this.markers.push(marker);
	}

	removeLastMarker() {
		if(this.markers.length > 0) {
			this.markers.splice(this.markers.length - 1, 1);
		}
	}

};