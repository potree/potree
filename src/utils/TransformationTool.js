
Potree.TransformationTool = class TransformationTool{
	
	constructor(viewer){
		
		this.viewer = viewer;
		
		this.sceneTransform = new THREE.Scene();
		this.translationNode = new THREE.Object3D();
		this.rotationNode = new THREE.Object3D();
		this.scaleNode = new THREE.Object3D();
		
		this.TRANSFORMATION_MODES = {
			DEFAULT: 0,
			TRANSLATE: 1,
			ROTATE: 2,
			SCALE: 3
		};
		
		this.mode = this.TRANSFORMATION_MODES.DEFAULT;
		
		this.selection = [];
		
		this.viewer.inputHandler.registerInteractiveScene(this.sceneTransform);
		this.viewer.inputHandler.addEventListener("selection_changed", (e) => {
			this.selection = e.selection;
		});
		
		{ // translation node
			
			let createArrow = (name, color) => {
				let material = new THREE.MeshBasicMaterial({
					color: color, 
					depthTest: false, 
					depthWrite: false});
					
				let shaftGeometry = new THREE.Geometry();
				shaftGeometry.vertices.push(new THREE.Vector3(0, 0, 0));
				shaftGeometry.vertices.push(new THREE.Vector3(0, 1, 0));
				
				let shaftMaterial = new THREE.LineBasicMaterial({
					color: color, 
					depthTest: false, 
					depthWrite: false});
				let shaft = new THREE.Line(shaftGeometry, shaftMaterial);
				
				let headGeometry = new THREE.CylinderGeometry(0, 0.04, 0.1, 10, 1, false);
				let headMaterial  = material;
				let head = new THREE.Mesh(headGeometry, headMaterial);
				head.position.y = 1;
				
				let arrow = new THREE.Object3D();
				arrow.add(shaft);
				arrow.add(head);
				
				let mouseover = e => {
					let c = new THREE.Color(0xFFFF00);
					shaftMaterial.color = c;
					headMaterial.color = c;
				};
				
				let mouseleave = e => {
					let c = new THREE.Color(color);
					shaftMaterial.color = c;
					headMaterial.color = c;
				};
				
				shaft.addEventListener("mouseover", mouseover);
				shaft.addEventListener("mouseleave", mouseleave);

				return arrow;
			};
			
			let arrowX = createArrow("arrow_x", 0xFF0000);
			let arrowY = createArrow("arrow_y", 0x00FF00);
			let arrowZ = createArrow("arrow_z", 0x0000FF);
			
			arrowX.rotation.z = -Math.PI/2;
			arrowZ.rotation.x = Math.PI/2;
			
			this.translationNode.add(arrowX);
			this.translationNode.add(arrowY);
			this.translationNode.add(arrowZ);
		}
		
		
		this.setMode(this.TRANSFORMATION_MODES.TRANSLATE);
	}
	
	getSelectionBoundingBox(){
		
		let min = new THREE.Vector3(+Infinity, +Infinity, +Infinity);
		let max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
		
		for(let node of this.selection){
			
			let box = null;
			if(node.boundingBox){
				box = node.boundingBox;
			}else if(node.geometry && node.geometry.boundingBox){
				box = node.geometry.boundingBox;
			}
			
			if(box){
				let tbox = Potree.utils.computeTransformedBoundingBox(box, node.matrixWorld);				
				
				min = min.min(box.min);
				max = max.max(box.max);
			}else{
				let wp = node.getWorldPosition();
				min = min.min(wp);
				max = max.max(wp);
			}
		}
		
		return new THREE.Box3(min, max);
		
	}
	
	setMode(mode){
		if(this.mode === mode){
			return;
		}
		
		this.sceneTransform.remove(this.translationNode);
		this.sceneTransform.remove(this.rotationNode);
		this.sceneTransform.remove(this.scaleNode);
		
		if(mode === this.TRANSFORMATION_MODES.TRANSLATE){
			this.sceneTransform.add(this.translationNode);
		}else if(mode === this.TRANSFORMATION_MODES.ROTATE){
			this.sceneTransform.add(this.rotationNode);
		}else if(mode === this.TRANSFORMATION_MODES.SCALE){
			this.sceneTransform.add(this.scaleNode);
		}
		
		this.mode = mode;
	}
	
	
	//setSelection(selection){
	//	this.selection = selection;
	//}
	
	update(){
		
		if(this.selection.length === 0){
			this.sceneTransform.visible = false;
			return;
		}else{
			this.sceneTransform.visible = true;
		}
		
		let scene = this.viewer.scene;
		let renderer = this.viewer.renderer;
		
		let box = this.getSelectionBoundingBox();
		let pivot = box.getCenter();
		this.sceneTransform.position.copy(pivot);
		
		{
			let distance = scene.camera.position.distanceTo(pivot);
			let pr = Potree.utils.projectedRadius(1, scene.camera.fov * Math.PI / 180, distance, renderer.domElement.clientHeight);
			let scale = (150 / pr);
			this.sceneTransform.scale.set(scale, scale, scale);
		}
		
	}
	
	//render(camera, target){
	//	this.update();
	//	this.renderer.render(this.sceneTransform, camera, target);
	//}
	
};