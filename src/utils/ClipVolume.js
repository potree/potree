

Potree.ClipVolume = class extends THREE.Object3D{
	
	constructor(axis){
		super();
		
		this.constructor.counter = (this.constructor.counter === undefined) ? 0 : this.constructor.counter + 1;
		
		this.name = "clip_volume_" + this.constructor.counter;

		this.volWidth = 0.1;

		if(axis != -1) {
			this.scale.set(1, 1, 1);
			if(axis == Potree.ClipVolume.Axis.X)
				this.scale.x = this.volWidth;
			else if(axis == Potree.ClipVolume.Axis.Y)
				this.scale.y = this.volWidth;
			else if(axis == Potree.ClipVolume.Axis.Z)
				this.scale.z = this.volWidth;
		}
				
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

Potree.ClipVolume.Axis = {
	X: 0,
	Y: 1,
	Z: 2
};