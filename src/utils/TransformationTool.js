

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
		this.showPickVolumes = true;

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
		this.createHandleObjects();
	}

	createScaleHandle(handleName){
		let sgSphere = new THREE.SphereGeometry(1, 32, 32);
		let sgLowPolySphere = new THREE.SphereGeometry(1, 16, 16);

		let handle = this.handles[handleName];
		let node = handle.node;

		let material = new THREE.MeshBasicMaterial({
			color: handle.color,
			opacity: 0.4,
			transparent: true
			});
		let sphere = new THREE.Mesh(sgSphere, material);
		sphere.name = "scale_handle";
		node.add(sphere);
		handle.scaleNode = sphere;

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
			visible: this.showPickVolumes
		}));
		pickSphere.name = `${handleName}.scale_pick_sphere`;
		pickSphere.scale.set(6, 6, 6);
		sphere.add(pickSphere);
		pickSphere.handle = handleName;
		this.pickVolumes.push(pickSphere);

		sphere.setOpacity = (target) => {
			let opacity = {x: material.opacity};
			let t = new TWEEN.Tween(opacity).to({x: target}, 100);
			t.onUpdate(() => {
				sphere.visible = opacity.x > 0;
				pickSphere.visible = opacity.x > 0;
				material.opacity = opacity.x;
				outlineMaterial.opacity = opacity.x;
				pickSphere.material.opacity = opacity.x * 0.5;
			});
			t.start();
		};

		pickSphere.addEventListener("drag", (e) => this.dragScaleHandle(e));
		pickSphere.addEventListener("drop", (e) => this.dropScaleHandle(e));

		pickSphere.addEventListener("mouseover", e => {
			sphere.setOpacity(1);
		});

		pickSphere.addEventListener("click", e => {
			e.consume();
		});

		pickSphere.addEventListener("mouseleave", e => {
			sphere.setOpacity(0.4);
		});
	}

	createFocusHandle(handleName){
		let sgLowPolySphere = new THREE.SphereGeometry(1, 16, 16);
		let sgBox = new THREE.BoxGeometry(1, 1, 1);

		let handle = this.handles[handleName];
		let node = handle.node;

		let material = new THREE.MeshBasicMaterial({
			color: handle.color,
			opacity: 0,
			transparent: true
			});
		let box = new THREE.Mesh(sgBox, material);
		box.name = "focus_handle";
		box.scale.set(1.5, 1.5, 1.5);
		box.position.set(0, 6, 0);
		box.visible = false;
		node.add(box);
		handle.focusNode = box;
		
		let outlineMaterial = new THREE.MeshBasicMaterial({
			color: 0x000000, 
			side: THREE.BackSide,
			opacity: 0,
			transparent: true});
		let outline = new THREE.Mesh(sgBox, outlineMaterial);
		outline.scale.set(1.4, 1.4, 1.4);
		box.add(outline);

		let pickSphere = new THREE.Mesh(sgLowPolySphere, new THREE.MeshNormalMaterial({
			//opacity: 0,
			transparent: true,
			visible: this.showPickVolumes
		}));
		pickSphere.name = `${handleName}.focus_pick_sphere`;
		pickSphere.scale.set(4, 4, 4);
		box.add(pickSphere);
		pickSphere.handle = handleName;

		this.pickVolumes.push(pickSphere);


		box.setOpacity = (target) => {
			let opacity = {x: material.opacity};
			let t = new TWEEN.Tween(opacity).to({x: target}, 100);
			t.onUpdate(() => {
				pickSphere.visible = opacity.x > 0;
				box.visible = opacity.x > 0;
				material.opacity = opacity.x;
				outlineMaterial.opacity = opacity.x;
				pickSphere.material.opacity = opacity.x * 0.5;
			});
			t.start();
		};


		pickSphere.addEventListener("drag", e => {});

		pickSphere.addEventListener("mouseup", e => {
			e.consume();
		});

		pickSphere.addEventListener("mousedown", e => {
			e.consume();
		});

		pickSphere.addEventListener("click", e => {
			e.consume();

			let selected = this.selection[0];
			let maxScale = Math.max(...selected.scale.toArray());
			let minScale = Math.min(...selected.scale.toArray());
			let handleLength = Math.abs(selected.scale.dot(new THREE.Vector3(...handle.alignment)));
			let alignment = new THREE.Vector3(...handle.alignment).multiplyScalar(2 * maxScale / handleLength);
			alignment.applyMatrix4(selected.matrixWorld);
			let newCamPos = alignment;
			let newCamTarget = selected.getWorldPosition();

			Potree.utils.moveTo(this.viewer.scene, newCamPos, newCamTarget);
		});

		pickSphere.addEventListener("mouseover", e => {
			box.setOpacity(1);
		});

		pickSphere.addEventListener("mouseleave", e => {
			box.setOpacity(0.4);
		});
	}

	createTranslateHandle(handleName){
		let handle = this.handles[handleName];
		let node = handle.node;

		if(handleName.includes("-")){
			let otherHandleName = handleName.replace("-", "+");
			let otherHandle = this.handles[otherHandleName];
			handle.translateNode = otherHandle.translateNode;

			return;
		}

		let boxGeometry = new THREE.BoxGeometry(1, 1, 1);

		let material = new THREE.MeshBasicMaterial({
			color: handle.color,
			opacity: 0,
			transparent: true});

		let outlineMaterial = new THREE.MeshBasicMaterial({
			color: 0x000000, 
			side: THREE.BackSide,
			opacity: 0,
			transparent: true});

		let pickMaterial = new THREE.MeshNormalMaterial({
			color: 0xaaaaaa,
			opacity: 0.2,
			transparent: true,
			visible: this.showPickVolumes
		});

		let box = new THREE.Mesh(boxGeometry, material);
		box.name = "translate_handle";
		box.scale.set(0.2, 0.2, 5000);
		box.lookAt(new THREE.Vector3(...handle.alignment));
		node.add(box);
		handle.translateNode = box;

		let outline = new THREE.Mesh(boxGeometry, outlineMaterial);
		outline.name = "translate_handle_outline";
		outline.scale.set(3, 3, 1.03);
		box.add(outline);


		let pickVolume = new THREE.Mesh(boxGeometry, pickMaterial);
		pickVolume.name = `${handleName}.translation_pick_volume`;
		pickVolume.scale.set(16, 16, 2225);
		//pickVolume.handle = handleName;
		box.add(pickVolume);
		this.pickVolumes.push(pickVolume);

		box.setOpacity = (target) => {
			let opacity = {x: material.opacity};
			let t = new TWEEN.Tween(opacity).to({x: target}, 100);
			t.onUpdate(() => {
				box.visible = opacity.x > 0;
				pickVolume.visible = opacity.x > 0;
				material.opacity = opacity.x;
				outlineMaterial.opacity = opacity.x;
				pickMaterial.opacity = opacity.x * 0.5;
			});
			t.start();
		};

	}

	createHandleObjects(){
		this.pickVolumes = [];

		for(let handleName of Object.keys(this.handles)){
			let handle = this.handles[handleName];

			handle.node = new THREE.Object3D();
			handle.node.name = handleName;
			this.scene.add(handle.node);

			this.createScaleHandle(handleName);
			this.createFocusHandle(handleName);
			this.createTranslateHandle(handleName);
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

		if(this.activeHandle === handleName){
			return;
		}

		this.activeHandle = handleName;

		let keys = Object.keys(this.handles);
		keys.filter(key => key !== this.activeHandle);
		if(this.activeHandle){
			keys.push(this.activeHandle);
		}
		for(let handleName of keys){
			let handle = this.handles[handleName];
			let node = handle.node;
			let scaleHandle = handle.scaleNode;
			let focusHandle = handle.focusNode;
			let translateHandle = handle.translateNode;

			if(handleName === this.activeHandle){
				scaleHandle.setOpacity(1.0);
				focusHandle.setOpacity(0.4);
				translateHandle.setOpacity(0.4);
			}else{
				scaleHandle.setOpacity(0.4);
				focusHandle.setOpacity(0);
				translateHandle.setOpacity(0);
			}
		}

		//for(let pickVolume of this.pickVolumes){
		//	pickVolume.material.opacity = Math.min(0.4, pickVolume.material.opacity);
		//}

		
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

					let toWorld = scaleHandle.matrixWorld.clone();
					let toObject = new THREE.Matrix4().getInverse(toWorld);

					let scalePosWorld = scaleHandle.position.clone().applyMatrix4(scaleHandle.matrixWorld);
					let scalePosProj = scalePosWorld.clone().project(camera);
					
					let pixelOffset = 45;
					let focusPosProj = new THREE.Vector3(
						scalePosProj.x + 2 * pixelOffset / domElement.clientWidth,
						scalePosProj.y,
						scalePosProj.z
					);
					let focusPosWorld = focusPosProj.unproject(camera);
					let camScaleHandleDistance = scalePosWorld.distanceTo(camera.position);
					let camFocusHandleDistance = focusPosWorld.distanceTo(camera.position);

					let camToFocusHandle = new THREE.Vector3().subVectors(focusPosWorld, camera.position);
					camToFocusHandle.multiplyScalar(camScaleHandleDistance / camFocusHandleDistance);
					focusPosWorld = new THREE.Vector3().addVectors(camera.position, camToFocusHandle);

					let focusPosObject = focusPosWorld.clone().applyMatrix4(toObject);
					focusHandle.position.copy(focusPosObject);
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
					let intersects = raycaster.intersectObjects(this.pickVolumes.filter(v => v.visible), true);

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
