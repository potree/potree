
import * as THREE from  'three';
import { Utils } from '../utils';

export class PolygonClipVolume extends THREE.Object3D{
	
	constructor(camera){
		super();

		this.constructor.counter = (this.constructor.counter === undefined) ? 0 : this.constructor.counter + 1;
		this.name = "polygon_clip_volume_" + this.constructor.counter;

		this.camera = camera.clone();
		this.camera.rotation.set(...camera.rotation.toArray()); // [r85] workaround because camera.clone() doesn't work on rotation
		this.camera.rotation.order = camera.rotation.order;
		this.camera.updateMatrixWorld();
		this.camera.updateProjectionMatrix();
		this.camera.matrixWorldInverse.copy(this.camera.matrixWorld).invert();

		this.viewMatrix = this.camera.matrixWorldInverse.clone();
		this.projMatrix = this.camera.projectionMatrix.clone();

		// projected markers
		this.markers = [];
		// actual pointcloud positions
		this.positions = [];
		this.initialized = false;
	}

	addMarker() {

		console.log('addMarker');

		let marker = new THREE.Mesh();
		let position = new THREE.Vector3();

		let cancel;

		let drag = e => {
			let size = e.viewer.renderer.getSize(new THREE.Vector2());
			let projectedPos = new THREE.Vector3(
				2.0 * (e.drag.end.x / size.width) - 1.0,
				-2.0 * (e.drag.end.y / size.height) + 1.0,
				0
			);

			console.log('projectedPos', projectedPos);

			let I = Utils.getMousePointCloudIntersection(
				e.drag.end,
				e.viewer.scene.getActiveCamera(),
				e.viewer,
				e.viewer.scene.pointclouds,
				{ pickClipped: true });

			console.log('I', I);


			if (I) {
				position.x = I.location.x;
				position.y = I.location.y;
				position.z = I.location.z;
				console.log('I.location', I.location);
			}

			marker.position.copy(projectedPos);
		};
		
		let drop = e => {
			console.log('drop position', position);
			console.log('drop projectedPos', marker.position);
			console.log('drop marker', marker);
			cancel();
		};
		
		cancel = e => {
			marker.removeEventListener("drag", drag);
			marker.removeEventListener("drop", drop);
		};
		
		marker.addEventListener("drag", drag);
		marker.addEventListener("drop", drop);


		this.markers.push(marker);
		console.log('marker added', marker);
		console.log('markers length', this.markers.length);
		this.positions.push(position);
	}

	removeMarker(i) {
		this.markers.splice(i, 1);
		this.positions.splice(i, 1);
	}

	removeLastMarker() {
		if(this.markers.length > 0) {
			this.markers.splice(this.markers.length - 1, 1);
		}
	}

};