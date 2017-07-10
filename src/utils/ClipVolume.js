

Potree.ClipVolume = class extends THREE.Object3D{
	
	constructor(args){
		super();
		
		this.constructor.counter = (this.constructor.counter === undefined) ? 0 : this.constructor.counter + 1;
		this.name = "clip_volume_" + this.constructor.counter;

		this.clipOffset = 0.001;
		this.clipRotOffset = 1;

		this.scale.z = 0.1;

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
		//this.frame.mode = THREE.Lines;
		this.add(this.frame);
		
		/*this.label = new Potree.TextSprite("0");
		this.label.setBorderColor({r:0, g:255, b:0, a:0.0});
		this.label.setBackgroundColor({r:0, g:255, b:0, a:0.0});
		this.label.material.depthTest = false;
		this.label.material.depthWrite = false;
		this.label.material.transparent = true;
		this.label.position.y -= 0.5;
		this.add(this.label);
		
		this.label.updateMatrixWorld = () => {
			var volumeWorldPos = new THREE.Vector3();
			volumeWorldPos.setFromMatrixPosition( this.matrixWorld );
			this.label.position.copy(volumeWorldPos);
			this.label.updateMatrix();
			this.label.matrixWorld.copy(this.label.matrix);
			this.label.matrixWorldNeedsUpdate = false;
			
			for ( var i = 0, l = this.label.children.length; i < l; i ++ ) {
				this.label.children[ i ].updateMatrixWorld( true );
			}
		};
		*/
		{ // event listeners
			this.addEventListener("select", e => {});
			this.addEventListener("deselect", e => {});
		}
		
		this.update();
	};

	setClipOffset(offset) {
		if(this.clipOffset == offset) return;
		
		this.clipOffset = offset;
		this.dispatchEvent({"type": "clip_volume_changed", "viewer": viewer, "volume": this});		
	}

	setClipRotOffset(offset) {
		if(this.clipRotOffset == offset) return;
		
		this.clipRotOffset = offset;
		this.dispatchEvent({"type": "clip_volume_changed", "viewer": viewer, "volume": this});			
	}

	offset(args) {
		let cs = args.cs || null;
		let axis = args.axis || null;
		let dir = args.dir || null;

		if(!cs || !axis || !dir) return;

		if(axis == "x") {
			if(cs == "local") {

			} else if(cs == "global") {
				this.position.x = this.position.x + dir * this.clipOffset;
			}
		}else if(axis == "y") {
			if(cs == "local") {

			} else if(cs == "global") {
				this.position.y = this.position.y + dir * this.clipOffset;
			}
		}else if(axis == "z") {
			if(cs == "local") {

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

			} else if(cs == "global") {
				this.rotation.x = this.rotation.x + dir * this.clipRotOffset * Math.PI/180;
			}
		}else if(axis == "y") {
			if(cs == "local") {

			} else if(cs == "global") {
				this.rotation.y = this.rotation.y + dir * this.clipRotOffset * Math.PI/180;
			}
		}else if(axis == "z") {
			if(cs == "local") {

			} else if(cs == "global") {
				this.rotation.z = this.rotation.z + dir * this.clipRotOffset * Math.PI/180;
			}
		}
		this.dispatchEvent({"type": "clip_volume_changed", "viewer": viewer, "volume": this});
	}	

	update(){
		this.boundingBox = this.box.geometry.boundingBox;
		this.boundingSphere = this.boundingBox.getBoundingSphere();
		
		this.box.visible = false;
		//this.label.visible = false;
	};
	
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
