

let displayLine = line => {
	var material = new THREE.LineBasicMaterial({ color: 0xff0000 }); 
	var geometry = new THREE.Geometry(); 
	geometry.vertices.push( 
		line.start, 
		line.end
		); 
	var tl = new THREE.Line( geometry, material ); 
	tl.frustumCulled = false;
	this.viewer.scene.scene.add( tl );
};

let displaySphere = (pos) => {
	var sg = new THREE.SphereGeometry(2, 12, 12);
	var sm = new THREE.MeshNormalMaterial();
	var s = new THREE.Mesh(sg, sm);
	s.position.copy(pos);
	this.viewer.scene.scene.add(s);
};

Potree.TransformationTool = class TransformationTool {
	constructor(viewer) {
		this.viewer = viewer;

		this.scene = new THREE.Scene();

		this.selection = [];
		this.pivot = new THREE.Vector3();
		this.dragging = false;

		this.viewer.inputHandler.registerInteractiveScene(this.scene);
		this.viewer.inputHandler.addEventListener('selection_changed', (e) => {
			
			for(let selected of this.selection){
				this.viewer.inputHandler.blacklist.delete(selected);
			}

			this.selection = e.selection;

			for(let selected of this.selection){
				this.viewer.inputHandler.blacklist.add(selected);
			}

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
		this.pickVolumes = [];

		let sgSphere = new THREE.SphereGeometry(1, 32, 32);
		let sgLowPolySphere = new THREE.SphereGeometry(1, 8, 8);
		let sgBox = new THREE.BoxGeometry(1, 1, 1);

		//for(let face of sgLowPolySphere.faces){
		//	[face.a, face.c] = [face.c, face.a];
		//	face.normal.multiplyScalar(-1);
		//	for(let normal of face.vertexNormals){
		//		normal.multiplyScalar(-1);
		//	}
		//}
		//sgLowPolySphere.computeFaceNormals();
		//sgLowPolySphere.computeVertexNormals();


		for(let handleName of Object.keys(this.handles)){
			let handle = this.handles[handleName];

			let node = new THREE.Object3D();
			node.name = handleName;
			
			

			{
				let material = new THREE.MeshBasicMaterial({
					color: handle.color,
					opacity: 0.4,
					transparent: true
					});
				let sphere = new THREE.Mesh(sgSphere, material);
				sphere.name = "scale_handle";
				node.add(sphere);

				let outlineMaterial = new THREE.MeshBasicMaterial({
					color: 0x000000, 
					side: THREE.BackSide,
					opacity: 0.4,
					transparent: true});
				let outline = new THREE.Mesh(sgSphere, outlineMaterial);
				outline.scale.set(1.4, 1.4, 1.4);
				sphere.add(outline);

				let pickSphere = new THREE.Mesh(sgLowPolySphere, new THREE.MeshNormalMaterial({
					color: 0xaaaaaa,
					opacity: 0.2,
					transparent: true,
					visible: false
					}));
				pickSphere.scale.set(6, 6, 6);
				sphere.add(pickSphere);
				pickSphere.handle = handleName;
				this.pickVolumes.push(pickSphere);

				pickSphere.addEventListener("drag", (e) => this.dragScaleHandle(e));
				pickSphere.addEventListener("drop", (e) => this.dropScaleHandle(e));
			}

			{
				
				let material = new THREE.MeshBasicMaterial({
					color: handle.color,
					opacity: 0.4,
					transparent: true
					});
				let box = new THREE.Mesh(sgBox, material);
				box.name = "focus_handle";
				box.scale.set(1.5, 1.5, 1.5);
				box.position.set(0, 6, 0);
				box.visible = false;
				node.add(box);
				

				let outlineMaterial = new THREE.MeshBasicMaterial({
					color: 0x000000, 
					side: THREE.BackSide,
					opacity: 0.4,
					transparent: true});
				let outline = new THREE.Mesh(sgBox, outlineMaterial);
				outline.scale.set(1.4, 1.4, 1.4);
				box.add(outline);

				let pickSphere = new THREE.Mesh(sgLowPolySphere, new THREE.MeshNormalMaterial({
					//opacity: 0,
					transparent: true,
					visible: false
					}));
				pickSphere.scale.set(3, 3, 3);
				box.add(pickSphere);
				pickSphere.handle = handleName;

				this.pickVolumes.push(pickSphere);

				pickSphere.addEventListener("mouseup", e => {
					e.consume();

					let selected = this.selection[0];
					let alignment = new THREE.Vector3(...handle.alignment).multiplyScalar(2);
					alignment.applyMatrix4(selected.matrixWorld);
					let newCamPos = alignment;
					let view = this.viewer.scene.view;
					view.position.copy(newCamPos);
					view.lookAt(selected.getWorldPosition());
					this.viewer.zoomTo(selected);
				});

				pickSphere.addEventListener("mousemove", e => {
					//e.consume();
					console.log("moved");
				});

			}




			
			//pickSphere.addEventListener("mouseover", (e) => this.mouseOver(e, handleName));
			//pickSphere.addEventListener("mouseleave", (e) => this.mouseLeave(e, handleName));

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
		this.dragging = false;
		this.setActiveHandle(null);
	}

	dragScaleHandle(e){
		let drag = e.drag;
		let handle = this.handles[this.activeHandle];
		let camera = this.viewer.scene.getActiveCamera();

		if(!drag.intersectionStart){
			drag.intersectionStart = drag.location;
			drag.objectStart = drag.object.getWorldPosition();
			drag.handle = handle;

			let start = drag.intersectionStart;
			let dir = new THREE.Vector4(...handle.alignment, 0).applyMatrix4(this.scene.matrixWorld);
			let end = new THREE.Vector3().addVectors(start, dir);
			let line = new THREE.Line3(start.clone(), end.clone());
			drag.line = line;

			let camOnLine = line.closestPointToPoint(camera.position, false);
			let normal = new THREE.Vector3().subVectors(camera.position, camOnLine);
			let plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, drag.intersectionStart);
			drag.dragPlane = plane;
			drag.pivot = drag.intersectionStart;
		}else{
			handle = drag.handle;
		}

		this.dragging = true;


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
				let direction = handle.alignment.reduce( (a, v) => a + v, 0);

				let toObjectSpace = new THREE.Matrix4().getInverse( this.selection[0].matrixWorld);
				let iOnLineOS = iOnLine.clone().applyMatrix4(toObjectSpace);
				let pivotOS = drag.pivot.clone().applyMatrix4(toObjectSpace);
				let diffOS = new THREE.Vector3().subVectors(iOnLineOS, pivotOS);
				let dragDirectionOS = diffOS.clone().normalize();
				if(iOnLine.distanceTo(drag.pivot) === 0){
					dragDirectionOS.set(0, 0, 0);
				}
				let dragDirection = dragDirectionOS.dot(new THREE.Vector3(...handle.alignment));

				let diff = new THREE.Vector3().subVectors(iOnLine, drag.pivot);
				let diffScale = new THREE.Vector3(...handle.alignment).multiplyScalar(diff.length() * direction * dragDirection);
				let diffPosition = diff.clone().multiplyScalar(0.5);

				for (let selection of this.selection) {
					selection.scale.add(diffScale);
					selection.position.add(diffPosition);
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
		if(this.dragging){
			return;
		}

		this.activeHandle = handleName;

		for(let handleName of Object.keys(this.handles)){
			let handle = this.handles[handleName];
			let node = handle.node;
			let scaleHandle = node.getObjectByName("scale_handle");
			let focusHandle = node.getObjectByName("focus_handle");

			if(handleName === this.activeHandle){
				scaleHandle.traverse(n => {if(n.material){n.material.opacity = 1;}});
				focusHandle.visible = true;
			}else{
				scaleHandle.traverse(n => {if(n.material){n.material.opacity = 0.2;}});
				focusHandle.visible = false;
			}
		}

		for(let pickVolume of this.pickVolumes){
			pickVolume.material.opacity = Math.min(0.4, pickVolume.material.opacity);
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
				}

				for(let handleName of Object.keys(this.handles)){
					let handle = this.handles[handleName];
					let node = handle.node;

					let scaleHandle = node.getObjectByName("scale_handle");
					let focusHandle = node.getObjectByName("focus_handle");


					//let scalePosWorld = scaleHandle.position.clone().applyMatrix4(scaleHandle.matrixWorld);
					//let scalePosProj = scalePosWorld.clone().project(camera);
					//
					//let pixelOffset = 30;
					//let focusPosProj = new THREE.Vector3(
					//	scalePosProj.x + 2 * pixelOffset / domElement.clientWidth,
					//	scalePosProj.y,
					//	scalePosProj.z
					//);
					//let focusPosWorld = focusPosProj.unproject(camera);
					



				}

				{
					let nmouse = {
						x: (mouse.x / domElement.clientWidth) * 2 - 1,
						y: -(mouse.y / domElement.clientHeight) * 2 + 1
					};

					let vector = new THREE.Vector3(nmouse.x, nmouse.y, 0.5);
					vector.unproject(camera);

					let direction = vector.clone().sub(camera.position).normalize();
					let raycaster = new THREE.Raycaster(camera.position, direction);
					let intersects = raycaster.intersectObjects(this.pickVolumes, true);

					if(intersects.length > 0){
						let I = intersects[0];
						let handleName = I.object.handle;
						this.setActiveHandle(handleName);
					}else{
						this.setActiveHandle(null);
					}
					

				}
			}

			this.scene.position.copy(selected.position);
			this.scene.rotation.copy(selected.rotation);

		}else{
			this.scene.visible = false;
		}
		
	}

};
