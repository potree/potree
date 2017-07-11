

Potree.ClipVolume = class extends THREE.Object3D{
	
	constructor(args){
		super();
		
		this.constructor.counter = (this.constructor.counter === undefined) ? 0 : this.constructor.counter + 1;
		this.name = "clip_volume_" + this.constructor.counter;

		this.clipOffset = 0.001;
		this.clipRotOffset = 1;

		let alpha = args.alpha || 0;
		let beta = args.beta || 0;
		let gamma = args.gamma || 0;

		this.rotation.x = alpha;
		this.rotation.y = beta;
		this.rotation.z = gamma;
				
		let boxGeometry = new THREE.BoxGeometry(1, 1, 1);
		boxGeometry.computeBoundingBox();
		
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
			// middle line
			/*boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, 0.0));
			boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, 0.0));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, 0.0));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, 0.0));
			boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, 0.0));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, 0.0));
			boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, 0.0));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, 0.0));*/

		}

		let planeFrameGeometry = new THREE.Geometry();
		{						
			// middle line
			boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, 0.0));
			boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, 0.0));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, 0.0));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, 0.0));
			boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, 0.0));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, 0.0));
			boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, 0.0));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, 0.0));

		}

		this.dimension = new THREE.Vector3(1,1,1);
		this.material = new THREE.MeshBasicMaterial( {
			color: 0x00ff00, 
			transparent: true, 
			opacity: 0.3,
			depthTest: true, 
			depthWrite: false} );
		this.box = new THREE.Mesh(boxGeometry, this.material);
		this.box.geometry.computeBoundingBox();
		this.boundingBox = this.box.geometry.boundingBox;
		this.add(this.box);
		
		this.frame = new THREE.LineSegments( boxFrameGeometry, new THREE.LineBasicMaterial({color: 0x000000}));
		this.add(this.frame);

		// set default thickness
		this.setScaleZ(0.1);

		// create local coordinate system
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
			shaft.name = name + "_shaft";
			
			let headGeometry = new THREE.CylinderGeometry(0, 0.04, 0.1, 10, 1, false);
			let headMaterial  = material;
			let head = new THREE.Mesh(headGeometry, headMaterial);
			head.name = name + "_head";
			head.position.y = 1;
			
			let arrow = new THREE.Object3D();
			arrow.name = name;
			arrow.add(shaft);
			arrow.add(head);
			
			/*let mouseover = e => {
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
				
				let camera = this.viewer.scene.getActiveCamera();
				
				if(!e.drag.intersectionStart){
					e.drag.intersectionStart = e.drag.location;
					e.drag.objectStart = e.drag.object.getWorldPosition();
					
					let start = this.sceneTransform.position.clone();
					let end = direction.clone().applyMatrix4(this.sceneTransform.matrixWorld);
					//let end = start.clone().add(direction);
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
			shaft.addEventListener("drag", drag);*/

			return arrow;
		};
		
		let arrowX = createArrow("arrow_x", new THREE.Vector3(1, 0, 0), 0xFF0000);
		let arrowY = createArrow("arrow_y", new THREE.Vector3(0, 1, 0), 0x00FF00);
		let arrowZ = createArrow("arrow_z", new THREE.Vector3(0, 0, 1), 0x0000FF);
		
		arrowX.rotation.z = -Math.PI/2;
		arrowZ.rotation.x = Math.PI/2;	

		this.add(arrowX);
		this.add(arrowY);
		this.add(arrowZ);
		
		{ // event listeners
			//this.addEventListener("select", e => {});
			//this.addEventListener("deselect", e => {});
		}
		
		this.update();
	};

	setClipOffset(offset) {
		if(this.clipOffset == offset) return;
		
		this.clipOffset = offset;
		//this.dispatchEvent({"type": "clip_volume_changed", "viewer": viewer, "volume": this});		
	}

	setClipRotOffset(offset) {
		if(this.clipRotOffset == offset) return;
		
		this.clipRotOffset = offset;
		//this.dispatchEvent({"type": "clip_volume_changed", "viewer": viewer, "volume": this});			
	}

	setScaleX(x) {
		this.children[0].scale.x = x;
		this.children[1].scale.x = x;		
	}

	setScaleY(y) {
		this.children[0].scale.y = y;
		this.children[1].scale.y = y;		
	}

	setScaleZ(z) {
		this.children[0].scale.z = z;
		this.children[1].scale.z = z;		
	}

	offset(args) {
		let cs = args.cs || null;
		let axis = args.axis || null;
		let dir = args.dir || null;

		if(!cs || !axis || !dir) return;

		if(axis == "x") {
			if(cs == "local") {
				this.position.add(this.localX.clone().multiplyScalar(dir * this.clipOffset));
			} else if(cs == "global") {
				this.position.x = this.position.x + dir * this.clipOffset;
			}
		}else if(axis == "y") {
			if(cs == "local") {
				this.position.add(this.localY.clone().multiplyScalar(dir * this.clipOffset));
			} else if(cs == "global") {
				this.position.y = this.position.y + dir * this.clipOffset;
			}
		}else if(axis == "z") {
			if(cs == "local") {
				this.position.add(this.localZ.clone().multiplyScalar(dir * this.clipOffset));
			} else if(cs == "global") {
				this.position.z = this.position.z + dir * this.clipOffset;
			}
		}

		this.dispatchEvent({"type": "clip_volume_changed", "viewer": viewer, "volume": this});
	}	

	rotate(args) {
		let cs = args.cs || null;
		let axis = args.axis || null;
		let dir = args.dir || null;

		if(!cs || !axis || !dir) return;

		if(axis == "x") {
			if(cs == "local") {
				this.rotation.x = this.rotation.x + dir * this.clipRotOffset * Math.PI/180;
			} else if(cs == "global") {

			}
		}else if(axis == "y") {
			if(cs == "local") {
				this.rotation.y = this.rotation.y + dir * this.clipRotOffset * Math.PI/180;
			} else if(cs == "global") {

			}
		}else if(axis == "z") {
			if(cs == "local") {
				this.rotation.z = this.rotation.z + dir * this.clipRotOffset * Math.PI/180;
			} else if(cs == "global") {

			}
		}

		this.updateLocalSystem();

		this.dispatchEvent({"type": "clip_volume_changed", "viewer": viewer, "volume": this});
	}	

	update(){
		this.boundingBox = this.box.geometry.boundingBox;
		this.boundingSphere = this.boundingBox.getBoundingSphere();
		
		this.box.visible = false;
		//this.label.visible = false;

		this.updateLocalSystem();
	};

	updateLocalSystem() {		
		// extract local coordinate axes
		let rotQuat = this.getWorldQuaternion();
		this.localX = new THREE.Vector3(1, 0, 0).applyQuaternion(rotQuat).normalize();
		this.localY = new THREE.Vector3(0, 1, 0).applyQuaternion(rotQuat).normalize();
		this.localZ = new THREE.Vector3(0, 0, 1).applyQuaternion(rotQuat).normalize();
	}
	
	raycast(raycaster, intersects){
		
		let is = [];
		this.box.raycast(raycaster, is);
	
		if(is.length > 0){
			var I = is[0];
			intersects.push({
				distance: I.distance,
				object: this,
				point: I.point.clone()
			});
		}
	};
};
