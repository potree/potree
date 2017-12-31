
Potree.TransformationTool = class TransformationTool {
	constructor(viewer) {
		this.viewer = viewer;

		this.scene = new THREE.Scene();

		this.selection = [];
		this.pivot = new THREE.Vector3();

		this.viewer.inputHandler.registerInteractiveScene(this.scene);
		this.viewer.inputHandler.addEventListener('selection_changed', (e) => {
			this.selection = e.selection;
		});
		
		this.activeHandle = null;
		this.handles = {
			"x+": {node: null, color: 0xE73100, alignment: [+1, +0, +0]},
			"x-": {node: null, color: 0xE73100, alignment: [-1, +0, +0]},
			"y+": {node: null, color: 0x44A24A, alignment: [+0, +1, +0]},
			"y-": {node: null, color: 0x44A24A, alignment: [+0, -1, +0]},
			"z+": {node: null, color: 0x2669E7, alignment: [+0, +0, +1]},
			"z-": {node: null, color: 0x2669E7, alignment: [+0, +0, -1]},
		};

		let sgSphere = new THREE.SphereGeometry(1, 32, 32);
		for(let handleName of Object.keys(this.handles)){
			let handle = this.handles[handleName];

			let node = new THREE.Object3D();
			node.name = handleName;
			let material = new THREE.MeshBasicMaterial({
				color: handle.color,
				opacity: 0.4,
				transparent: true
				});
			let sphere = new THREE.Mesh(sgSphere, material);
			sphere.scale.set(1, 1, 1);
			sphere.name = "scale_handle";
			node.add(sphere);

			let pickSphere = new THREE.Mesh(sgSphere, new THREE.MeshBasicMaterial({
				color: handle.color,
				opacity: 0,
				transparent: true,
				visible: false
				}));
			pickSphere.scale.set(4, 4, 4);
			
			node.add(pickSphere);

			//let circleOut;
			//let circleIn;
			//{
			//	//let geometry = new THREE.CylinderGeometry( 5, 5, 1, 32 );
			//	////let material = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
			//	//circle = new THREE.Mesh( geometry, material );
			//	//circle.lookAt(new THREE.Vector3(...handle.alignment));
			//	//circle.rotation.y += Math.PI / 2;
			//	//circle.rotation.z += Math.PI / 2;
			//	//node.add(circle);


			//	let geometry = new THREE.CircleGeometry( 2, 32 );
			//	circleOut = new THREE.Mesh( geometry, material );
			//	circleOut.lookAt(new THREE.Vector3(...handle.alignment));
			//	node.add(circleOut);

			//	circleIn = new THREE.Mesh( geometry, material );
			//	circleIn.lookAt(new THREE.Vector3(...handle.alignment).multiplyScalar(-1));
			//	node.add(circleIn);
			//}

			let outlineMaterial = new THREE.MeshBasicMaterial({
				color: 0x000000, 
				side: THREE.BackSide,
				opacity: 0.4,
				transparent: true});
			let outline = new THREE.Mesh(sgSphere, outlineMaterial);
			outline.scale.set(1.4, 1.4, 1.4);
			sphere.add(outline);
			pickSphere.addEventListener("drag", (e) => this.dragScaleHandle(e));
			pickSphere.addEventListener("drop", (e) => this.dropScaleHandle(e));
			pickSphere.addEventListener("mouseover", (e) => this.mouseOver(e, handleName));
			pickSphere.addEventListener("mouseleave", (e) => this.mouseLeave(e, handleName));


			this.scene.add(node);

			handle.node = node;
		}
	}

	mouseOver(e, handle){
		this.setActiveHandle(handle);
	}

	mouseLeave(e, handle){
		if(this.activeHandle === handle){
			this.setActiveHandle(null);
		}
	}

	dropScaleHandle(e){

	}

	dragScaleHandle(e){
		let drag = e.drag;
		let handle = this.handles[this.activeHandle];
		let camera = this.viewer.scene.getActiveCamera();

		if(!drag.intersectionStart){
			drag.intersectionStart = drag.location;
			drag.objectStart = drag.object.getWorldPosition();
			drag.handle = handle;

			//let start = handle.node.getWorldPosition();
			let start = drag.intersectionStart;
			let dir = new THREE.Vector4(...handle.alignment, 0).applyMatrix4(this.scene.matrixWorld);
			let end = new THREE.Vector3().addVectors(start, dir);
			let line = new THREE.Line3(start, end);
			drag.line = line;

			let camOnLine = line.closestPointToPoint(camera.position, false);
			let normal = new THREE.Vector3().subVectors(camera.position, camOnLine);
			let plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, drag.intersectionStart);
			drag.dragPlane = plane;
			drag.pivot = drag.intersectionStart;
		}else{
			handle = drag.handle;
		}

		{
			let mouse = drag.end;
			let domElement = this.viewer.renderer.domElement;
			let nmouse = {
				x: (mouse.x / domElement.clientWidth) * 2 - 1,
				y: -(mouse.y / domElement.clientHeight) * 2 + 1
			};

			let vector = new THREE.Vector3(nmouse.x, nmouse.y, 0.5);
			vector.unproject(camera);

			let ray = new THREE.Ray(camera.position, vector.sub(camera.position));
			let I = ray.intersectPlane(drag.dragPlane);

			if (I) {
				let iOnLine = drag.line.closestPointToPoint(I, false);

				let diff = new THREE.Vector3().subVectors(iOnLine, drag.pivot);

				let direction = handle.alignment.reduce( (a, v) => a + v, 0);

				for (let selection of this.selection) {
					selection.scale.add(diff.clone().multiplyScalar(direction));
					selection.position.add(diff.clone().multiplyScalar(0.5));
				}

				drag.pivot.copy(iOnLine);
			}
		}
	}

	getSelectionBoundingBox () {
		let selbox = new THREE.Box3();

		for (let node of this.selection) {
			let box = null;
			if (node.boundingBox) {
				box = node.boundingBox;
			} else if (node.geometry && node.geometry.boundingBox) {
				box = node.geometry.boundingBox;
			}

			if (box) {
				let tbox = box.clone().applyMatrix4(node.matrixWorld);

				selbox.union(tbox);
			} else {
				selbox.expandByPoint(wp);
			}
		}

		return selbox;
	}

	setActiveHandle(handleName){
		this.activeHandle = handleName;

		for(let handleName of Object.keys(this.handles)){
			let handle = this.handles[handleName];
			let node = handle.node;
			let scaleHandle = node.getObjectByName("scale_handle");

			if(handleName === this.activeHandle){
				node.traverse(n => {
					if(n.material){n.material.opacity = 1;}
				});
			}else{
				node.traverse(n => {
					if(n.material){n.material.opacity = 0.4;}
				});
			}
		}

		
	}

	update () {

		if(this.selection.length === 1){

			this.scene.visible = true;

			let selected = this.selection[0];
			let world = selected.matrixWorld;

			let box = this.getSelectionBoundingBox();
			let boxSize = selected.boundingBox.getSize();
			let boxCenter = selected.boundingBox.getCenter();
			let pos = selected.position;
			this.pivot.copy(boxCenter.clone().applyMatrix4(world));

			{
				let camera = this.viewer.scene.getActiveCamera();
				let mouse = this.viewer.inputHandler.mouse;
				let domElement = this.viewer.renderer.domElement;

				let pixelDistanceTo = (pos) => {
					let projPos = pos.clone().project(camera);
					let screenPos = new THREE.Vector2(
						(projPos.x * 0.5 + 0.5) * domElement.clientWidth,
						-(projPos.y * 0.5 - 0.5) * domElement.clientHeight);
					let distance = screenPos.distanceTo(mouse);
					
					return distance;
				};

				//let pixelDistances = [];
				for(let handleName of Object.keys(this.handles)){
					let handle = this.handles[handleName];
					let node = handle.node;

					let alignment = new THREE.Vector3(...handle.alignment);
					let handlePos = boxCenter.clone().add(boxSize.clone().multiplyScalar(0.5).multiply(alignment));
					handlePos.applyMatrix4(selected.matrixWorld);
					let handleDistance = handlePos.distanceTo(selected.getWorldPosition());
					node.position.copy(alignment.multiplyScalar(handleDistance));

					let distance = handlePos.distanceTo(camera.position);
					let pr = Potree.utils.projectedRadius(1, camera, distance, domElement.clientWidth, domElement.clientHeight);
					let scale = 7 / pr;
					node.scale.set(scale, scale, scale);

				//	let pixelDistance = pixelDistanceTo(handlePos);
				//	pixelDistances.push({handleName: handleName, pixelDistance: pixelDistance});
				}

				//pixelDistances.sort( (a, b) => a.pixelDistance - b.pixelDistance);
				//let closest = pixelDistances[0];

				//let distanceToActive = pixelDistances.find(i => i.handleName === this.activeHandle);
				//if(distanceToActive && distanceToActive.pixelDistance > 60){
				//	this.setActiveHandle(null);
				//}

				//if(this.activeHandle === null && closest.pixelDistance < 30){
				//	this.setActiveHandle(closest.handleName);
				//}

				



			}

			this.scene.position.copy(selected.position);
			this.scene.rotation.copy(selected.rotation);

		}else{
			this.scene.visible = false;
		}
		
	}

};
