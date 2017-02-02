
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
		
		this.menu = new HoverMenu(Potree.resourcePath + "/icons/menu_icon.svg");
		
		this.selection = [];
		
		this.viewer.inputHandler.registerInteractiveScene(this.sceneTransform);
		this.viewer.inputHandler.addEventListener("selection_changed", (e) => {
			this.selection = e.selection;
		});
		
		{ // Menu
			this.menu.addItem(new HoverMenuItem(Potree.resourcePath + "/icons/translate.svg", e => {
				//console.log("translate!");
				this.setMode(this.TRANSFORMATION_MODES.TRANSLATE);
			}));
			this.menu.addItem(new HoverMenuItem(Potree.resourcePath + "/icons/rotate.svg", e => {
				//console.log("rotate!");
				this.setMode(this.TRANSFORMATION_MODES.ROTATE);
			}));
			this.menu.addItem(new HoverMenuItem(Potree.resourcePath + "/icons/scale.svg", e => {
				//console.log("scale!");
				this.setMode(this.TRANSFORMATION_MODES.SCALE);
			}));
			this.menu.setPosition(100, 100);
			$(this.viewer.renderArea).append(this.menu.element);
			this.menu.element.hide();
		}
		
		{ // translation node
			
			let createArrow = (name, direction, color) => {
				let material = new THREE.MeshBasicMaterial({
					color: color, 
					depthTest: false, 
					depthWrite: false});
					
				let shaftGeometry = new THREE.Geometry();
				shaftGeometry.vertices.push(new THREE.Vector3(0, 0, 0));
				shaftGeometry.vertices.push(new THREE.Vector3(0, 1, 0));
				
				let shaftMaterial = new THREE.LineBasicMaterial({
					color: color, 
					depthTest: true, 
					depthWrite: true,
					transparent: true
					});
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
				
				let drag = e => {
					
					let camera = this.viewer.scene.camera;
					
					if(!e.drag.intersectionStart){
						e.drag.intersectionStart = e.drag.location;
						e.drag.objectStart = e.drag.object.getWorldPosition();
						
						let start = this.sceneTransform.position.clone();
						let end = start.clone().add(direction);
						let line = new THREE.Line3(start, end);
						e.drag.line = line;
						
						let camOnLine = line.closestPointToPoint(camera.position, false);
						let normal = new THREE.Vector3().subVectors(
							camera.position, camOnLine);
						let plane = new THREE.Plane()
							.setFromNormalAndCoplanarPoint(normal, e.drag.intersectionStart);
							
						e.drag.dragPlane = plane;
						e.drag.pivot = e.drag.intersectionStart;
					}
					
					{
						let mouse = e.drag.end;
						let domElement = viewer.renderer.domElement;
						let nmouse =  {
							x: (mouse.x / domElement.clientWidth ) * 2 - 1,
							y: - (mouse.y / domElement.clientHeight ) * 2 + 1
						};
						
						let vector = new THREE.Vector3( nmouse.x, nmouse.y, 0.5 );
						vector.unproject(camera);
						
						let ray = new THREE.Ray(camera.position, vector.sub( camera.position));
						let I = ray.intersectPlane(e.drag.dragPlane);
						
						if(I){
							
							let iOnLine = e.drag.line.closestPointToPoint(I, false);
							
							let diff = new THREE.Vector3().subVectors(
								iOnLine, e.drag.pivot);
								
							for(let selection of this.selection){
								selection.position.add(diff);
							}
							
							e.drag.pivot = e.drag.pivot.add(diff);
						}
					}
				};
				
				shaft.addEventListener("mouseover", mouseover);
				shaft.addEventListener("mouseleave", mouseleave);
				shaft.addEventListener("drag", drag);

				return arrow;
			};
			
			let arrowX = createArrow("arrow_x", new THREE.Vector3(1, 0, 0), 0xFF0000);
			let arrowY = createArrow("arrow_y", new THREE.Vector3(0, 1, 0), 0x00FF00);
			let arrowZ = createArrow("arrow_z", new THREE.Vector3(0, 0, 1), 0x0000FF);
			
			arrowX.rotation.z = -Math.PI/2;
			arrowZ.rotation.x = Math.PI/2;
			
			this.translationNode.add(arrowX);
			this.translationNode.add(arrowY);
			this.translationNode.add(arrowZ);
		}
		
		{ // Rotation Node
			let createCircle = (name, normal, color) => {
				let material = new THREE.LineBasicMaterial({
					color: color, 
					depthTest: true, 
					depthWrite: true,
					transparent: true
					});
				
				let segments = 32;
				let radius = 1;
				let geometry = new THREE.BufferGeometry();
				let positions = new Float32Array( (segments + 1) * 3 );
				for(let i = 0; i <= segments; i++){
					let u = (i / segments) * Math.PI * 2;
					let x = Math.cos(u) * radius;
					let y = Math.sin(u) * radius;
					
					positions[3 * i + 0] = x;
					positions[3 * i + 1] = y;
					positions[3 * i + 2] = 0;
				}
				geometry.addAttribute("position", new THREE.BufferAttribute(positions, 3));
				geometry.computeBoundingSphere();
				
				let circle = new THREE.Line(geometry, material);
				circle.lookAt(normal);
				
				let mouseover = e => {
					let c = new THREE.Color(0xFFFF00);
					material.color = c;
				};
				
				let mouseleave = e => {
					let c = new THREE.Color(color);
					material.color = c;
				};
				
				let drag = e => {
					
					let camera = this.viewer.scene.camera;
					let n = normal.clone().applyEuler(this.sceneTransform.rotation);
					
					if(!e.drag.intersectionStart){
						//e.drag.intersectionStart = e.drag.location;
						e.drag.objectStart = e.drag.object.getWorldPosition();
						
						let plane = new THREE.Plane()
							.setFromNormalAndCoplanarPoint(n, this.sceneTransform.getWorldPosition());
						
						{ // e.drag.location seems imprecisse, calculate real start location
							let mouse = e.drag.end;
							let domElement = viewer.renderer.domElement;
							let nmouse =  {
								x: (mouse.x / domElement.clientWidth ) * 2 - 1,
								y: - (mouse.y / domElement.clientHeight ) * 2 + 1
							};
							
							let vector = new THREE.Vector3( nmouse.x, nmouse.y, 0.5 );
							vector.unproject(camera);
							
							let ray = new THREE.Ray(camera.position, vector.sub( camera.position));
							let I = ray.intersectPlane(plane);
							
							e.drag.intersectionStart = I;
						}
						
						e.drag.dragPlane = plane;
						e.drag.pivot = e.drag.intersectionStart;
						
						//let sg = new THREE.SphereGeometry(1, 8, 8);
						//let sm = new THREE.MeshBasicMaterial({color: 0xff0000});
						//let s = new THREE.Mesh(sg, sm);
						//s.position.copy(e.drag.pivot);
						//viewer.scene.scene.add(s);
					}
					
					let mouse = e.drag.end;
					let domElement = viewer.renderer.domElement;
					let nmouse =  {
						x: (mouse.x / domElement.clientWidth ) * 2 - 1,
						y: - (mouse.y / domElement.clientHeight ) * 2 + 1
					};
					
					let vector = new THREE.Vector3( nmouse.x, nmouse.y, 0.5 );
					vector.unproject(camera);
					
					let ray = new THREE.Ray(camera.position, vector.sub( camera.position));
					let I = ray.intersectPlane(e.drag.dragPlane);
						
					if(I){
						let center = this.sceneTransform.position;
						let from = e.drag.pivot;
						let to = I;
						
						let v1 = from.clone().sub(center).normalize();
						let v2 = to.clone().sub(center).normalize();
						
						let angle = Math.acos(v1.dot(v2));
						let sign = Math.sign(v1.cross(v2).dot(n));
						angle = angle * sign;
						if(Number.isNaN(angle)){
							return;
						}
						console.log(angle);
						
						//let sg = new THREE.SphereGeometry(1, 16, 16);
						//let sm = new THREE.MeshNormalMaterial();
						//let s = new THREE.Mesh(sg, sm);
						//s.position.copy(to);
						//viewer.scene.scene.add(s);
						
						for(let selection of this.selection){
							selection.rotateOnAxis(normal, angle);
						}
						
						e.drag.pivot = I;
					}
					
				};
				
				circle.addEventListener("mouseover", mouseover);
				circle.addEventListener("mouseleave", mouseleave);
				circle.addEventListener("drag", drag);
				
				
				return circle;
			};
			
			{ // transparent ball
				let sg = new THREE.SphereGeometry(1, 32, 32);
				let sm = new THREE.MeshBasicMaterial({
				//let sm = new THREE.MeshNormalMaterial({
					color: 0xaaaaaa,
					transparent: true,
					depthTest: true,
					depthWrite: true,
					opacity: 0.4
				});
				
				let sphere = new THREE.Mesh(sg, sm);
				sphere.scale.set(0.9, 0.9, 0.9);
				this.rotationNode.add(sphere);
			}
		
			let yaw = createCircle("yaw", new THREE.Vector3(0, 0, 1), 0xff0000);
			let pitch = createCircle("pitch", new THREE.Vector3(1, 0, 0), 0x00ff00);
			let roll = createCircle("roll", new THREE.Vector3(0, 1, 0), 0x0000ff);
		
			this.rotationNode.add(yaw);
			this.rotationNode.add(pitch);
			this.rotationNode.add(roll);
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
				//let tbox = Potree.utils.computeTransformedBoundingBox(box, node.matrixWorld);				
				let tbox = box.clone().applyMatrix4(node.matrixWorld);
				
				min = min.min(tbox.min);
				max = max.max(tbox.max);
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
			this.menu.element.hide();
			return;
		}else{
			this.sceneTransform.visible = true;
			this.menu.element.show();
		}
		
		if(this.selection.length === 1){
			this.sceneTransform.rotation.copy(this.selection[0].rotation);
		}
		
		let scene = this.viewer.scene;
		let renderer = this.viewer.renderer;
		let domElement = renderer.domElement;
		
		let box = this.getSelectionBoundingBox();
		let pivot = box.getCenter();
		this.sceneTransform.position.copy(pivot);
		
		{ // size
			let distance = scene.camera.position.distanceTo(pivot);
			let pr = Potree.utils.projectedRadius(1, scene.camera.fov * Math.PI / 180, distance, renderer.domElement.clientHeight);
			let scale = (150 / pr);
			this.sceneTransform.scale.set(scale, scale, scale);
		}
		
		{ // menu
			let screenPos = pivot.clone().project(scene.camera);
			screenPos.x = domElement.clientWidth * (screenPos.x + 1) / 2;
			screenPos.y = domElement.clientHeight * (1-(screenPos.y + 1) / 2);
			
			this.menu.setPosition(screenPos.x, screenPos.y);
		}
		
	}
	
	//render(camera, target){
	//	this.update();
	//	this.renderer.render(this.sceneTransform, camera, target);
	//}
	
};