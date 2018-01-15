
Potree.ScreenBoxSelectTool = class ScreenBoxSelectTool extends THREE.EventDispatcher{

	constructor(viewer){
		super();

		this.viewer = viewer;
		this.scene = new THREE.Scene();

		viewer.addEventListener("update", this.update.bind(this));
		viewer.addEventListener("render.pass.perspective_overlay", this.render.bind(this));
		viewer.addEventListener("scene_changed", this.onSceneChange.bind(this));
	}

	onSceneChange(scene){
		console.log("scene changed");
	}

	startInsertion(){
		let domElement = this.viewer.renderer.domElement;

		let volume = new Potree.Volume();
		volume.clip = true;
		this.viewer.scene.addVolume(volume);

		this.importance = 10;

		let drag = e =>{

			let camera = e.viewer.scene.getActiveCamera();
			let size = new THREE.Vector2(
				e.viewer.renderer.getSize().width,
				e.viewer.renderer.getSize().height);
			let frustumSize = new THREE.Vector2(
				camera.right - camera.left, 
				camera.top - camera.bottom);

			let screenCentroid = new THREE.Vector2().addVectors(e.drag.end, e.drag.start).multiplyScalar(0.5);
			let ray = Potree.utils.mouseToRay(screenCentroid, camera, size.width, size.height);

			let diff = new THREE.Vector2().subVectors(e.drag.end, e.drag.start);
			diff.divide(size).multiply(frustumSize);
			
			volume.position.copy(ray.origin);
			volume.up.copy(camera.up);
			volume.rotation.copy(camera.rotation);
			volume.scale.set(diff.x, diff.y, 1000 * 100);

			e.consume();
		};

		let drop = e => {
			this.importance = 0;

			this.viewer.inputHandler.deselectAll();
			this.viewer.inputHandler.toggleSelection(volume);

			let camera = e.viewer.scene.getActiveCamera();
			let size = new THREE.Vector2(
				e.viewer.renderer.getSize().width,
				e.viewer.renderer.getSize().height);
			let screenCentroid = new THREE.Vector2().addVectors(e.drag.end, e.drag.start).multiplyScalar(0.5);
			let ray = Potree.utils.mouseToRay(screenCentroid, camera, size.width, size.height);

			let line = new THREE.Line3(ray.origin, new THREE.Vector3().addVectors(ray.origin, ray.direction));

			this.removeEventListener("drag", drag);
			this.removeEventListener("drop", drop);

			// TODO support more than one point cloud
			for(let pointcloud of this.viewer.scene.pointclouds){

				let volCam = camera.clone();
				volCam.left = -volume.scale.x / 2; 
				volCam.right = +volume.scale.x / 2;
				volCam.top = +volume.scale.y / 2;
				volCam.bottom = -volume.scale.y / 2;
				volCam.near = -volume.scale.z / 2;
				volCam.far = +volume.scale.z / 2;
				volCam.rotation.copy(volume.rotation);
				volCam.position.copy(volume.position);

				volCam.updateMatrix();
				volCam.updateMatrixWorld();
				volCam.updateProjectionMatrix();
				volCam.matrixWorldInverse.getInverse(volCam.matrixWorld);

				let ray = new THREE.Ray(volCam.getWorldPosition(), volCam.getWorldDirection());
				let rayInverse = new THREE.Ray(
					ray.origin.clone().add(ray.direction.clone().multiplyScalar(volume.scale.z)),
					ray.direction.clone().multiplyScalar(-1));

				let pickerSettings = {
					width: 8, 
					height: 8, 
					pickWindowSize: 8, 
					all: true,
					pointSizeType: Potree.PointSizeType.FIXED,
					pointSize: 1};
				let pointsNear = pointcloud.pick(viewer, volCam, ray, pickerSettings);

				volCam.rotateX(Math.PI);
				volCam.updateMatrix();
				volCam.updateMatrixWorld();
				volCam.updateProjectionMatrix();
				volCam.matrixWorldInverse.getInverse(volCam.matrixWorld);
				let pointsFar = pointcloud.pick(viewer, volCam, rayInverse, pickerSettings);

				if(pointsNear.length > 0 && pointsFar.length > 0){
					let viewLine = new THREE.Line3(ray.origin, new THREE.Vector3().addVectors(ray.origin, ray.direction));

					let closestOnLine = pointsNear.map(p => viewLine.closestPointToPoint(p.position, false));
					let closest = closestOnLine.sort( (a, b) => ray.origin.distanceTo(a) - ray.origin.distanceTo(b))[0];

					let farthestOnLine = pointsFar.map(p => viewLine.closestPointToPoint(p.position, false));
					let farthest = farthestOnLine.sort( (a, b) => ray.origin.distanceTo(b) - ray.origin.distanceTo(a))[0];

					let distance = closest.distanceTo(farthest);
					let centroid = new THREE.Vector3().addVectors(closest, farthest).multiplyScalar(0.5);
					volume.scale.z = distance * 1.1;
					volume.position.copy(centroid);
					
				}
			}
		};

		this.addEventListener("drag", drag);
		this.addEventListener("drop", drop);

		viewer.inputHandler.addInputListener(this);

		return volume;
	}

	update(e){
		//console.log(e.delta)
	}

	render(){
		this.viewer.renderer.render(this.scene, this.viewer.scene.getActiveCamera());
	}

}