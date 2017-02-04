
Potree.Volume = class extends THREE.Object3D{
	
	constructor(args = {}){
		super();
		
		this.constructor.counter = (this.constructor.counter === undefined) ? 0 : this.constructor.counter + 1;
		
		this.name = "volume_" + this.constructor.counter;
		
		this._clip = args.clip || false;
		this._modifiable = args.modifiable || true;
		
		let boxGeometry = new THREE.BoxGeometry(1, 1, 1);
		boxGeometry.computeBoundingBox();
		
		let boxFrameGeometry = new THREE.Geometry();
		{
			let l = 0.1;
			
			// corner vertices
			let v = [
				[-0.5, -0.5, -0.5],
				[-0.5, -0.5, +0.5],
				[-0.5, +0.5, -0.5],
				[-0.5, +0.5, +0.5],
				[+0.5, -0.5, -0.5],
				[+0.5, -0.5, +0.5],
				[+0.5, +0.5, -0.5],
				[+0.5, +0.5, +0.5]
			];
			//
			//// create a cross at each corner with cross length l
			//for(let b of v){
			//	
			//	let b1 = [ b[0] - l * Math.sign(b[0]), b[1], b[2] ];
			//	let b2 = [ b[0], b[1] - l * Math.sign(b[1]), b[2] ];
			//	let b3 = [ b[0], b[1], b[2] - l * Math.sign(b[2]) ];
			//	
			//	// create the 3 lines that a cross consists of
			//	for(let d of [b, b1, b, b2, b, b3]){
			//		boxFrameGeometry.vertices.push(new THREE.Vector3().fromArray(d));
			//	}
			//	
			//}
			
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
		
		this.label = new Potree.TextSprite("0");
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
		
		{ // event listeners
			this.addEventListener("select", e => {});
			this.addEventListener("deselect", e => {});
		}
		
		this.update();
	}

	getVolume(){
		return Math.abs(this.scale.x * this.scale.y * this.scale.z);
	}
	
	update(){
		this.boundingBox = this.box.geometry.boundingBox;
		this.boundingSphere = this.boundingBox.getBoundingSphere();
		
		if(this._clip){
			this.box.visible = false;
			this.label.visible = false;
		}else{
			this.box.visible = true;
			this.label.visible = true;
		}
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
	
	get clip(){
		return this._clip;
	}
	
	set clip(value){
		this._clip = value;
		
		this.update();
	}
	
	get modifieable(){
		return this._modifiable;
	}
	
	set modifieable(value){
		this._modifiable = value;
		
		this.update();
	}
};