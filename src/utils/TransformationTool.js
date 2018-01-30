

Potree.TransformationTool = class TransformationTool {
	constructor(viewer) {
		this.viewer = viewer;

		this.scene = new THREE.Scene();

		this.selection = [];
		this.pivot = new THREE.Vector3();
		this.dragging = false;
		this.showPickVolumes = false;

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

		let red = 0xE73100;
		let green = 0x44A24A;
		let blue = 0x2669E7;
		
		this.activeHandle = null;
		this.scaleHandles = {
			"scale.x+": {name: "scale.x+", node: new THREE.Object3D(), color: red, alignment: [+1, +0, +0]},
			"scale.x-": {name: "scale.x-", node: new THREE.Object3D(), color: red, alignment: [-1, +0, +0]},
			"scale.y+": {name: "scale.y+", node: new THREE.Object3D(), color: green, alignment: [+0, +1, +0]},
			"scale.y-": {name: "scale.y-", node: new THREE.Object3D(), color: green, alignment: [+0, -1, +0]},
			"scale.z+": {name: "scale.z+", node: new THREE.Object3D(), color: blue, alignment: [+0, +0, +1]},
			"scale.z-": {name: "scale.z-", node: new THREE.Object3D(), color: blue, alignment: [+0, +0, -1]},
		};
		this.focusHandles = {
			"focus.x+": {name: "focus.x+", node:  new THREE.Object3D(), color: red, alignment: [+1, +0, +0]},
			"focus.x-": {name: "focus.x-", node:  new THREE.Object3D(), color: red, alignment: [-1, +0, +0]},
			"focus.y+": {name: "focus.y+", node:  new THREE.Object3D(), color: green, alignment: [+0, +1, +0]},
			"focus.y-": {name: "focus.y-", node:  new THREE.Object3D(), color: green, alignment: [+0, -1, +0]},
			"focus.z+": {name: "focus.z+", node:  new THREE.Object3D(), color: blue, alignment: [+0, +0, +1]},
			"focus.z-": {name: "focus.z-", node:  new THREE.Object3D(), color: blue, alignment: [+0, +0, -1]},
		};
		this.translationHandles = {
			"translation.x": {name: "translation.x", node:  new THREE.Object3D(), color: red, alignment: [1, 0, 0]},
			"translation.y": {name: "translation.y", node:  new THREE.Object3D(), color: green, alignment: [0, 1, 0]},
			"translation.z": {name: "translation.z", node:  new THREE.Object3D(), color: blue, alignment: [0, 0, 1]},
		};
		this.rotationHandles = {
			"rotation.x": {name: "rotation.x", node:  new THREE.Object3D(), color: red, alignment: [1, 0, 0]},
			"rotation.y": {name: "rotation.y", node:  new THREE.Object3D(), color: green, alignment: [0, 1, 0]},
			"rotation.z": {name: "rotation.z", node:  new THREE.Object3D(), color: blue, alignment: [0, 0, 1]},
		};
		this.handles = Object.assign({}, this.scaleHandles, this.focusHandles, this.translationHandles, this.rotationHandles);
		this.pickVolumes = [];

		this.initializeScaleHandles();
		this.initializeFocusHandles();
		this.initializeTranslationHandles();
		this.initializeRotationHandles();


		let boxFrameGeometry = new THREE.Geometry();
		{
			// bottom
			boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, 0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, 0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, 0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, -0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, -0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, -0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, -0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, 0.5));
			// top
			boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, 0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, 0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, 0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, -0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, -0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, -0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, -0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, 0.5));
			// sides
			boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, 0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, 0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, 0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, 0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, -0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, -0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, -0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, -0.5));
		}
		this.frame = new THREE.LineSegments(boxFrameGeometry, new THREE.LineBasicMaterial({color: 0xffff00}));
		this.scene.add(this.frame);

		
	}

	initializeScaleHandles(){
		let sgSphere = new THREE.SphereGeometry(1, 32, 32);
		let sgLowPolySphere = new THREE.SphereGeometry(1, 16, 16);

		for(let handleName of Object.keys(this.scaleHandles)){
			let handle = this.scaleHandles[handleName];
			let node = handle.node;
			this.scene.add(node);

			let material = new THREE.MeshBasicMaterial({
				color: handle.color,
				opacity: 0.4,
				transparent: true
				});

			let outlineMaterial = new THREE.MeshBasicMaterial({
				color: 0x000000, 
				side: THREE.BackSide,
				opacity: 0.4,
				transparent: true});

			let pickMaterial = new THREE.MeshNormalMaterial({
				opacity: 0.2,
				transparent: true,
				visible: this.showPickVolumes});

			let sphere = new THREE.Mesh(sgSphere, material);
			sphere.scale.set(1.3, 1.3, 1.3);
			sphere.name = `${handleName}.handle`;
			node.add(sphere);
			
			let outline = new THREE.Mesh(sgSphere, outlineMaterial);
			outline.scale.set(1.4, 1.4, 1.4);
			outline.name = `${handleName}.outline`;
			sphere.add(outline);

			let pickSphere = new THREE.Mesh(sgLowPolySphere, pickMaterial);
			pickSphere.name = `${handleName}.pick_volume`;
			pickSphere.scale.set(3, 3, 3);
			sphere.add(pickSphere);
			pickSphere.handle = handleName;
			this.pickVolumes.push(pickSphere);

			node.setOpacity = (target) => {
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
				//node.setOpacity(1);
			});

			pickSphere.addEventListener("click", e => {
				e.consume();
			});

			pickSphere.addEventListener("mouseleave", e => {
				//node.setOpacity(0.4);
			});
		}
	}

	initializeFocusHandles(){
		let sgBox = new THREE.BoxGeometry(1, 1, 1);
		let sgLowPolySphere = new THREE.SphereGeometry(1, 16, 16);

		for(let handleName of Object.keys(this.focusHandles)){
			let handle = this.focusHandles[handleName];
			let node = handle.node;
			this.scene.add(node);

			let material = new THREE.MeshBasicMaterial({
				color: handle.color,
				opacity: 0,
				transparent: true
				});

			let outlineMaterial = new THREE.MeshBasicMaterial({
				color: 0x000000, 
				side: THREE.BackSide,
				opacity: 0,
				transparent: true});

			let pickMaterial = new THREE.MeshNormalMaterial({
				//opacity: 0,
				transparent: true,
				visible: this.showPickVolumes});

			let box = new THREE.Mesh(sgBox, material);
			box.name = `${handleName}.handle`;
			box.scale.set(1.5, 1.5, 1.5);
			box.position.set(0, 0, 0);
			box.visible = false;
			node.add(box);
			//handle.focusNode = box;
			
			let outline = new THREE.Mesh(sgBox, outlineMaterial);
			outline.scale.set(1.4, 1.4, 1.4);
			outline.name = `${handleName}.outline`;
			box.add(outline);

			let pickSphere = new THREE.Mesh(sgLowPolySphere, pickMaterial);
			pickSphere.name = `${handleName}.pick_volume`;
			pickSphere.scale.set(3, 3, 3);
			box.add(pickSphere);
			pickSphere.handle = handleName;
			this.pickVolumes.push(pickSphere);

			node.setOpacity = (target) => {
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
				//box.setOpacity(1);
			});

			pickSphere.addEventListener("mouseleave", e => {
				//box.setOpacity(0.4);
			});
		}
	}

	initializeTranslationHandles(){
		let boxGeometry = new THREE.BoxGeometry(1, 1, 1);

		for(let handleName of Object.keys(this.translationHandles)){
			let handle = this.handles[handleName];
			let node = handle.node;
			this.scene.add(node);

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
				opacity: 0.2,
				transparent: true,
				visible: this.showPickVolumes
			});

			let box = new THREE.Mesh(boxGeometry, material);
			box.name = `${handleName}.handle`;
			box.scale.set(0.2, 0.2, 20);
			box.lookAt(new THREE.Vector3(...handle.alignment));
			box.renderOrder = 10;
			node.add(box);
			handle.translateNode = box;

			let outline = new THREE.Mesh(boxGeometry, outlineMaterial);
			outline.name = `${handleName}.outline`;
			outline.scale.set(3, 3, 1.03);
			outline.renderOrder = 0;
			box.add(outline);

			let pickVolume = new THREE.Mesh(boxGeometry, pickMaterial);
			pickVolume.name = `${handleName}.pick_volume`;
			pickVolume.scale.set(12, 12, 1.1);
			pickVolume.handle = handleName;
			box.add(pickVolume);
			this.pickVolumes.push(pickVolume);

			node.setOpacity = (target) => {
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

			pickVolume.addEventListener("drag", (e) => {this.dragTranslationHandle(e)});
			pickVolume.addEventListener("drop", (e) => {this.dropTranslationHandle(e)});
		}
	}

	initializeRotationHandles(){
		let adjust = 1;
		let torusGeometry = new THREE.TorusGeometry(1, adjust * 0.015, 8, 64, Math.PI / 2);
		let outlineGeometry = new THREE.TorusGeometry(1, adjust * 0.04, 8, 64, Math.PI / 2);
		let pickGeometry = new THREE.TorusGeometry(1, adjust * 0.1, 6, 4, Math.PI / 2);

		for(let handleName of Object.keys(this.rotationHandles)){
			let handle = this.handles[handleName];
			let node = handle.node;
			this.scene.add(node);

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
				opacity: 0.2,
				transparent: true,
				visible: this.showPickVolumes
			});

			let box = new THREE.Mesh(torusGeometry, material);
			box.name = `${handleName}.handle`;
			box.scale.set(10, 10, 10);
			box.lookAt(new THREE.Vector3(...handle.alignment));
			node.add(box);
			handle.translateNode = box;

			let outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
			outline.name = `${handleName}.outline`;
			outline.scale.set(1, 1, 1);
			outline.renderOrder = 0;
			box.add(outline);

			let pickVolume = new THREE.Mesh(pickGeometry, pickMaterial);
			pickVolume.name = `${handleName}.pick_volume`;
			pickVolume.scale.set(1, 1, 1);
			pickVolume.handle = handleName;
			box.add(pickVolume);
			this.pickVolumes.push(pickVolume);

			node.setOpacity = (target) => {
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


			//pickVolume.addEventListener("mouseover", (e) => {
			//	//let a = this.viewer.scene.getActiveCamera().getWorldDirection().dot(pickVolume.getWorldDirection());
			//	console.log(pickVolume.getWorldDirection());
			//});
			
			pickVolume.addEventListener("drag", (e) => {this.dragRotationHandle(e)});
			pickVolume.addEventListener("drop", (e) => {this.dropRotationHandle(e)});
		}
	}

	dragRotationHandle(e){
		let drag = e.drag;
		let handle = this.activeHandle;
		let camera = this.viewer.scene.getActiveCamera();

		let localNormal = new THREE.Vector3(...handle.alignment);
		let n = new THREE.Vector3();
		n.copy(new THREE.Vector4(...localNormal.toArray(), 0).applyMatrix4(handle.node.matrixWorld));
		n.normalize();

		if (!drag.intersectionStart) {

			//this.viewer.scene.scene.remove(this.debug);
			//this.debug = new THREE.Object3D();
			//this.viewer.scene.scene.add(this.debug);
			//Potree.utils.debugSphere(this.debug, drag.location, 3, 0xaaaaaa);
			//let debugEnd = drag.location.clone().add(n.clone().multiplyScalar(20));
			//Potree.utils.debugLine(this.debug, drag.location, debugEnd, 0xff0000);

			drag.intersectionStart = drag.location;
			drag.objectStart = drag.object.getWorldPosition();
			drag.handle = handle;

			let plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n, drag.intersectionStart);

			drag.dragPlane = plane;
			drag.pivot = drag.intersectionStart;
		}else{
			handle = drag.handle;
		}

		this.dragging = true;

		let mouse = drag.end;
		let domElement = viewer.renderer.domElement;
		let ray = Potree.utils.mouseToRay(mouse, camera, domElement.clientWidth, domElement.clientHeight);
		
		let I = ray.intersectPlane(drag.dragPlane);

		if (I) {
			let center = this.scene.getWorldPosition();
			let from = drag.pivot;
			let to = I;

			let v1 = from.clone().sub(center).normalize();
			let v2 = to.clone().sub(center).normalize();

			let angle = Math.acos(v1.dot(v2));
			let sign = Math.sign(v1.cross(v2).dot(n));
			angle = angle * sign;
			if (Number.isNaN(angle)) {
				return;
			}

			let normal = new THREE.Vector3(...handle.alignment);
			for (let selection of this.selection) {
				selection.rotateOnAxis(normal, angle);
				selection.dispatchEvent({
					type: "orientation_changed",
					object: selection
				});
			}

			drag.pivot = I;
		}
	}

	dropRotationHandle(e){
		this.dragging = false;
		this.setActiveHandle(null);
	}

	dragTranslationHandle(e){
		let drag = e.drag;
		let handle = this.activeHandle;
		let camera = this.viewer.scene.getActiveCamera();
			
		if(!drag.intersectionStart){
			drag.intersectionStart = drag.location;
			drag.objectStart = drag.object.getWorldPosition();

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
			let ray = Potree.utils.mouseToRay(mouse, camera, domElement.clientWidth, domElement.clientHeight);
			let I = ray.intersectPlane(drag.dragPlane);

			if (I) {
				let iOnLine = drag.line.closestPointToPoint(I, false);

				let diff = new THREE.Vector3().subVectors(iOnLine, drag.pivot);

				for (let selection of this.selection) {
					selection.position.add(diff);
					selection.dispatchEvent({
						type: "position_changed",
						object: selection
					});
				}

				drag.pivot = drag.pivot.add(diff);
			}
		}
	}

	dropTranslationHandle(e){
		this.dragging = false;
		this.setActiveHandle(null);
	}

	dropScaleHandle(e){
		this.dragging = false;
		this.setActiveHandle(null);
	}

	dragScaleHandle(e){
		let drag = e.drag;
		let handle = this.activeHandle;
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
			let ray = Potree.utils.mouseToRay(mouse, camera, domElement.clientWidth, domElement.clientHeight);
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
					selection.dispatchEvent({
						type: "position_changed",
						object: selection
					});
					selection.dispatchEvent({
						type: "scale_changed",
						object: selection
					});
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

	setActiveHandle(handle){
		if(this.dragging){
			return;
		}

		if(this.activeHandle === handle){
			return;
		}

		this.activeHandle = handle;

		if(handle === null){
			for(let handleName of Object.keys(this.handles)){
				let handle = this.handles[handleName];
				handle.node.setOpacity(0);
			}
		}

		for(let handleName of Object.keys(this.focusHandles)){
			let handle = this.focusHandles[handleName];

			if(this.activeHandle === handle){
				handle.node.setOpacity(1.0);
			}else{
				handle.node.setOpacity(0.0)
			}
		}

		for(let handleName of Object.keys(this.translationHandles)){
			let handle = this.translationHandles[handleName];

			if(this.activeHandle === handle){
				handle.node.setOpacity(1.0);
			}else{
				handle.node.setOpacity(0.4)
			}
		}

		for(let handleName of Object.keys(this.rotationHandles)){
			let handle = this.rotationHandles[handleName];

			//if(this.activeHandle === handle){
			//	handle.node.setOpacity(1.0);
			//}else{
			//	handle.node.setOpacity(0.4)
			//}

			handle.node.setOpacity(0.4);
		}

		for(let handleName of Object.keys(this.scaleHandles)){
			let handle = this.scaleHandles[handleName];

			if(this.activeHandle === handle){
				handle.node.setOpacity(1.0);

				let relatedFocusHandle = this.focusHandles[handle.name.replace("scale", "focus")];
				let relatedFocusNode = relatedFocusHandle.node;
				relatedFocusNode.setOpacity(0.4);

				for(let translationHandleName of Object.keys(this.translationHandles)){
					let translationHandle = this.translationHandles[translationHandleName];
					translationHandle.node.setOpacity(0.4);
				}

				//let relatedTranslationHandle = this.translationHandles[
				//	handle.name.replace("scale", "translation").replace(/[+-]/g, "")];
				//let relatedTranslationNode = relatedTranslationHandle.node;
				//relatedTranslationNode.setOpacity(0.4);


			}else{
				handle.node.setOpacity(0.4)
			}
		}

		



		if(handle){
			handle.node.setOpacity(1.0);
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

				for(let handleName of Object.keys(this.scaleHandles)){
					let handle = this.handles[handleName];
					let node = handle.node;

					let alignment = new THREE.Vector3(...handle.alignment);
					let handlePos = boxCenter.clone().add(boxSize.clone().multiplyScalar(0.5).multiply(alignment));
					handlePos.applyMatrix4(selected.matrixWorld);
					let handleDistance = handlePos.distanceTo(selected.getWorldPosition());
					node.position.copy(alignment.multiplyScalar(handleDistance));
				}

				for(let handleName of Object.keys(this.handles)){
					let handle = this.handles[handleName];
					let node = handle.node;

					let handlePos = node.getWorldPosition();
					let distance = handlePos.distanceTo(camera.position);
					let pr = Potree.utils.projectedRadius(1, camera, distance, domElement.clientWidth, domElement.clientHeight);
					let scale = 7 / pr;
					node.scale.set(scale, scale, scale);
					node.updateMatrixWorld();
				}

				if(!this.dragging){
					let tWorld = this.scene.matrixWorld;
					let tObject = new THREE.Matrix4().getInverse(tWorld)
					let camObjectPos = camera.getWorldPosition().applyMatrix4(tObject);

					let x = this.rotationHandles["rotation.x"].node.rotation;
					let y = this.rotationHandles["rotation.y"].node.rotation;
					let z = this.rotationHandles["rotation.z"].node.rotation;

					x.order = "ZYX";
					y.order = "ZYX";

					let above = camObjectPos.z > 0;
					let below = !above;
					let PI_HALF = Math.PI / 2;

					if(above){
						if(camObjectPos.x > 0 && camObjectPos.y > 0){
							x.x = 1 * PI_HALF;
							y.y = 3 * PI_HALF;
							z.z = 0 * PI_HALF;
						}else if(camObjectPos.x < 0 && camObjectPos.y > 0){
							x.x = 1 * PI_HALF;
							y.y = 2 * PI_HALF;
							z.z = 1 * PI_HALF;
						}else if(camObjectPos.x < 0 && camObjectPos.y < 0){
							x.x = 2 * PI_HALF;
							y.y = 2 * PI_HALF;
							z.z = 2 * PI_HALF;
						}else if(camObjectPos.x > 0 && camObjectPos.y < 0){
							x.x = 2 * PI_HALF;
							y.y = 3 * PI_HALF;
							z.z = 3 * PI_HALF;
						}
					}else if(below){
						if(camObjectPos.x > 0 && camObjectPos.y > 0){
							x.x = 0 * PI_HALF;
							y.y = 0 * PI_HALF;
							z.z = 0 * PI_HALF;
						}else if(camObjectPos.x < 0 && camObjectPos.y > 0){
							x.x = 0 * PI_HALF;
							y.y = 1 * PI_HALF;
							z.z = 1 * PI_HALF;
						}else if(camObjectPos.x < 0 && camObjectPos.y < 0){
							x.x = 3 * PI_HALF;
							y.y = 1 * PI_HALF;
							z.z = 2 * PI_HALF;
						}else if(camObjectPos.x > 0 && camObjectPos.y < 0){
							x.x = 3 * PI_HALF;
							y.y = 0 * PI_HALF;
							z.z = 3 * PI_HALF;
						}
					}
				}

				for(let handleName of Object.keys(this.focusHandles)){
					let focusHandle = this.focusHandles[handleName];
					let scaleHandle = this.scaleHandles[handleName.replace("focus", "scale")];
					let focusNode = focusHandle.node;
					let scaleNode = scaleHandle.node;

					let toWorld = scaleNode.matrixWorld.clone();
					let toObject = new THREE.Matrix4().getInverse(toWorld);

					let scalePosWorld = scaleNode.getWorldPosition();
					let scalePosProj = scalePosWorld.clone().project(camera);

					let pixelOffset = 60;
					let focusPosProj = new THREE.Vector3(
						scalePosProj.x + (2 * pixelOffset / domElement.clientWidth) * focusNode.scale.x,
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
					focusNode.position.copy(scaleNode.position).add(focusPosObject);
					focusNode.updateMatrixWorld();
				}

				{
					let ray = Potree.utils.mouseToRay(mouse, camera, domElement.clientWidth, domElement.clientHeight);
					let raycaster = new THREE.Raycaster(ray.origin, ray.direction);
					let intersects = raycaster.intersectObjects(this.pickVolumes.filter(v => v.visible), true);

					if(intersects.length > 0){
						let I = intersects[0];
						let handleName = I.object.handle;
						this.setActiveHandle(this.handles[handleName]);
					}else{
						this.setActiveHandle(null);
					}
				}

				for(let handleName of Object.keys(this.translationHandles)){
					let translationHandle = this.translationHandles[handleName];
					let node = translationHandle.node;
					let boxNode = node.children[0];

					let p1 = boxNode.getWorldPosition();
					let p2 = new THREE.Vector3().addVectors(p1, boxNode.getWorldDirection());
					let line = new THREE.Line3(p1, p2);

					let onLine = line.closestPointToPoint(camera.getWorldPosition(), false);
					let distance = camera.getWorldPosition().distanceTo(onLine);

					let scale = Math.min(distance, node.scale.x);
					node.scale.set(scale, scale, scale);


				}
			}

			this.scene.position.copy(selected.position);
			this.scene.rotation.copy(selected.rotation);

			{
				let axisScale = (alignment) => {
					//let handlePos = boxCenter.clone().add(boxSize.clone().multiplyScalar(0.5).multiply(alignment));
					//handlePos.applyMatrix4(selected.matrixWorld);
					let transformed = new THREE.Vector3(...alignment).applyMatrix4(selected.matrixWorld);
					let distance = transformed.distanceTo(selected.getWorldPosition());

					return distance;
				};

				let scale = new THREE.Vector3(
					axisScale([1, 0, 0]),
					axisScale([0, 1, 0]),
					axisScale([0, 0, 1]),
				);

				this.frame.scale.copy(scale);	
			}
			//this.frame.scale.copy(box.getSize());

		}else{
			this.scene.visible = false;
		}
		
	}

};
