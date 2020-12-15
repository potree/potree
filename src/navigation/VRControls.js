
import {EventDispatcher} from "../EventDispatcher.js";

export class VRControls extends EventDispatcher{

	constructor(viewer){
		super(viewer);

		this.viewer = viewer;

		this.previousPads = [];

		this.selection = [];

		this.triggerStarts = [];

		this.scaleState = null;

		this.selectionBox = this.createBox();
		this.viewer.scene.scene.add(this.selectionBox);

		this.dbgBox = this.createBox();
		this.viewer.scene.scene.add(this.dbgBox);

		this.speed = 1;
		this.speedModificationFactor = 50;

		this.snLeft = this.createControllerModel();
		this.snRight = this.createControllerModel();
		
		this.viewer.scene.scene.add(this.snLeft.node);
		this.viewer.scene.scene.add(this.snRight.node);
	}

	setScene(scene){
		this.scene = scene;
	}

	createControllerModel(){
		const geometry = new THREE.SphereGeometry(1, 32, 32);
		const material = new THREE.MeshLambertMaterial( { color: 0xff0000, side: THREE.DoubleSide, flatShading: true } );
		const node = new THREE.Mesh(geometry, material);

		node.position.set(0, 0, 0.5);
		node.scale.set(0.02, 0.02, 0.02);
		node.visible = false;

		this.viewer.scene.scene.add(node);

		const debug = new THREE.Mesh(geometry, new THREE.MeshNormalMaterial());
		debug.position.set(0, 0, 0.5);
		debug.scale.set(0.01, 0.01, 0.01);
		debug.visible = false;


		const controller = {
			node: node,
			debug: debug,
		};
		//viewer.scene.scene.add(node);

		return controller;
	}

	createBox(){
		const color = 0xffff00;

		const indices = new Uint16Array( [ 0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7 ] );
		const positions = [ 
			1, 1, 1,
			0, 1, 1,
			0, 0, 1,
			1, 0, 1,
			1, 1, 0,
			0, 1, 0,
			0, 0, 0,
			1, 0, 0
		];
		const geometry = new THREE.BufferGeometry();

		geometry.setIndex( new THREE.BufferAttribute( indices, 1 ) );
		geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );

		geometry.computeBoundingSphere();

		const mesh = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial( { color: color } ) );
		mesh.visible = false;

		return mesh;
	}

	debugLine(start, end, index, color){

		if(typeof this.debugLines === "undefined"){

			const geometry = new THREE.SphereGeometry(1, 8, 8);

			this.debugLines = {
				geometry: geometry,
			};
		}

		const n = 100;

		if(!this.debugLines[index]){
			const geometry = this.debugLines.geometry;
			const material = new THREE.MeshBasicMaterial({color: color});
			const nodes = [];

			for(let i = 0; i <= n; i++){
				const u = i / n;

				const node = new THREE.Mesh(geometry, material);

				const position = new THREE.Vector3().addVectors(
					start.clone().multiplyScalar(1-u),
					end.clone().multiplyScalar(u)
				);

				node.position.copy(position);
				node.scale.set(0.002, 0.002, 0.002);
				this.viewer.scene.scene.add(node);
				nodes.push(node);
			}

			const debugLine = {
				material: material,
				nodes: nodes,
			};

			this.debugLines[index] = debugLine;
		}else{
			const debugLine = this.debugLines[index];

			for(let i = 0; i <= n; i++){
				const node = debugLine.nodes[i];
				const u = i / n;

				const position = new THREE.Vector3().addVectors(
					start.clone().multiplyScalar(1-u),
					end.clone().multiplyScalar(u)
				);

				node.position.copy(position);
			}
		}


	}

	getPointcloudsAt(pointclouds, position){

		const I = [];
		for(const pointcloud of pointclouds){
			
			const intersects = pointcloud.intersectsPoint(position);

			if(intersects){
				I.push(pointcloud);
			}
		}

		return I;
	}


	update(delta){
		let {renderer} = this.viewer;

		let cameraVR = renderer.xr.cameraVR;
		let view = this.scene.view;

		if(cameraVR == null){
			return;
		}

		let vrPos = new THREE.Vector3();
		let vrDir = new THREE.Vector3();
		cameraVR.getWorldPosition(vrPos);
		cameraVR.getWorldDirection(vrDir);

		vrDir.normalize().multiplyScalar(this.viewer.getMoveSpeed());

		let target = vrPos.clone().add(vrDir);

		view.position.copy(vrPos);
		view.lookAt(target);

		

		// console.log("update vr controls");
	}
};