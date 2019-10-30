
import {TextSprite} from "../../TextSprite.js";
import {OrientedImageControls} from "./OrientedImageControls.js";

export class OrientedImages{

	static createMaterial(){

		let vertexShader = `

		uniform float uNear;

		varying vec2 vUV;
		varying vec4 vDebug;
		
		void main(){
			vDebug = vec4(0.0, 1.0, 0.0, 1.0);

			vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);

			// make sure that this mesh is at least in front of the near plane
			modelViewPosition.xyz += normalize(modelViewPosition.xyz) * uNear;

			gl_Position = projectionMatrix * modelViewPosition;

			vUV = uv;
		}

		`;

		let fragmentShader = `

		uniform sampler2D tColor;
		uniform float uOpacity;

		varying vec2 vUV;
		varying vec4 vDebug;

		void main(){
			vec4 color = texture2D(tColor, vUV);
			gl_FragColor = color;
			gl_FragColor.a = uOpacity;
		}

		`;

		const material = new THREE.ShaderMaterial( {
			uniforms: {
				// time: { value: 1.0 },
				// resolution: { value: new THREE.Vector2() }
				tColor: {value: new THREE.Texture() },
				uNear: {value: 0.0},
				uOpacity: {value: 0.5},
			},
			vertexShader: vertexShader,
			fragmentShader: fragmentShader,
			side: THREE.DoubleSide,
		} );
		material.side = THREE.DoubleSide;

		return material;
	}

	static async loadCameraParams(path){
		const res = await fetch(path);
		const text = await res.text();

		const parser = new DOMParser();
		const doc = parser.parseFromString(text, "application/xml");

		const width = parseInt(doc.getElementsByTagName("width")[0].textContent);
		const height = parseInt(doc.getElementsByTagName("height")[0].textContent);
		const f = parseFloat(doc.getElementsByTagName("f")[0].textContent);

		const params = {
			width: width,
			height: height,
			f: f,
		};

		return params;
	}

	static async load(cameraParamsPath, imageParamsPath, viewer){

		const tStart = performance.now();

		const cameraParams = await OrientedImages.loadCameraParams(cameraParamsPath);

		const response = await fetch(imageParamsPath);
		if(!response.ok){
			console.error(`failed to load ${imageParamsPath}`);
			return;
		}
		const raycaster = new THREE.Raycaster();
		const content = await response.text();
		const lines = content.split(/\r?\n/);
		const imageParams = [];
		const orientedImageControls = new OrientedImageControls(viewer);

		for(let i = 1; i < lines.length; i++){
			const line = lines[i];
			const tokens = line.split(/\s+/);

			if(tokens.length < 6){
				continue;
			}

			let a = (cameraParams.height / 2)  / cameraParams.f;
			let fov = 2 * THREE.Math.radToDeg(Math.atan(a))

			const params = {
				id: tokens[0],
				x: Number.parseFloat(tokens[1]),
				y: Number.parseFloat(tokens[2]),
				z: Number.parseFloat(tokens[3]),
				omega: Number.parseFloat(tokens[4]),
				phi: Number.parseFloat(tokens[5]),
				kappa: Number.parseFloat(tokens[6]),
				fov: fov,
			};

			imageParams.push(params);
		}

		const tEnd = performance.now();
		console.log(tEnd - tStart);

		const sp = new THREE.PlaneGeometry(1, 1);
		const sg = new THREE.SphereGeometry(1, 32, 32);
		const lg = new THREE.Geometry();

		lg.vertices.push(new THREE.Vector3(-0.5, -0.5, 0) );
		lg.vertices.push(new THREE.Vector3( 0.5, -0.5, 0) );
		lg.vertices.push(new THREE.Vector3( 0.5,  0.5, 0) );
		lg.vertices.push(new THREE.Vector3(-0.5,  0.5, 0) );
		lg.vertices.push(new THREE.Vector3(-0.5, -0.5, 0) );

		const sceneNode = new THREE.Object3D();
		sceneNode.name = "oriented_images";
		viewer.scene.scene.add(sceneNode);

		const orientedImages = [];

		for(const params of imageParams){
			// const material = new THREE.MeshBasicMaterial({
			// 	side: THREE.DoubleSide,
			// });
			const material = OrientedImages.createMaterial();
			const lm = new THREE.LineBasicMaterial( { color: 0x00ff00 } );
			const mesh = new THREE.Mesh(sp, material);
			mesh.position.set(params.x, params.y, params.z);
			mesh.scale.set(3 / 4, 4 / 4, 1);
			
			let rx = THREE.Math.degToRad(params.omega);
			let ry = THREE.Math.degToRad(params.phi);
			let rz = THREE.Math.degToRad(params.kappa);
			mesh.rotation.set(rx, ry, rz);
			{
				mesh.updateMatrixWorld();
				const dir = mesh.getWorldDirection();
				const pos = mesh.position;
				const alpha = THREE.Math.degToRad(params.fov / 2);
				const d = -0.5 / Math.tan(alpha);
				const move = dir.clone().multiplyScalar(d);
				mesh.position.add(move);
			}
			viewer.scene.scene.add(mesh);
			material.uniforms.uOpacity.value = 1.0;

			const line = new THREE.Line(lg, lm);
			line.position.copy(mesh.position);
			line.scale.copy(mesh.scale);
			line.rotation.copy(mesh.rotation);
			sceneNode.add(line);

			const orientedImage = {
				mesh: mesh,
				texture: null,
				line: line,
				params: params,
				dimension:  [cameraParams.width, cameraParams.height],
			};
			mesh.orientedImage = orientedImage;
			
			orientedImages.push(orientedImage);
		}

		let hoveredElement = null;
		let clipVolume = null;

		const onMouseMove = (evt) => {
			const tStart = performance.now();
			if(hoveredElement){
				hoveredElement.line.material.color.setRGB(0, 1, 0);
			}
			evt.preventDefault();

			//var array = getMousePosition( container, evt.clientX, evt.clientY );
			const rect = viewer.renderer.domElement.getBoundingClientRect();
			const [x, y] = [evt.clientX, evt.clientY];
			const array = [ 
				( x - rect.left ) / rect.width, 
				( y - rect.top ) / rect.height 
			];
			const onClickPosition = new THREE.Vector2(...array);
			//const intersects = getIntersects(onClickPosition, scene.children);
			const camera = viewer.scene.getActiveCamera();
			const mouse = new THREE.Vector3(
				+ ( onClickPosition.x * 2 ) - 1, 
				- ( onClickPosition.y * 2 ) + 1 );
			const objects = orientedImages.map(i => i.mesh);
			raycaster.setFromCamera( mouse, camera );
			const intersects = raycaster.intersectObjects( objects );
			let selectionChanged = false;

			if ( intersects.length > 0){
				//console.log(intersects);
				const intersection = intersects[0];
				const orientedImage = intersection.object.orientedImage;
				orientedImage.line.material.color.setRGB(1, 0, 0);
				selectionChanged = hoveredElement !== orientedImage;
				hoveredElement = orientedImage;
			}else{
				hoveredElement = null;
			}

			let shouldRemoveClipVolume = clipVolume !== null && hoveredElement === null;
			let shouldAddClipVolume = clipVolume === null && hoveredElement !== null;

			if(clipVolume !== null && (hoveredElement === null || selectionChanged)){
				// remove existing
				viewer.scene.removePolygonClipVolume(clipVolume);
				clipVolume = null;
			}
			
			if(shouldAddClipVolume || selectionChanged){
				const img = hoveredElement;
				const fov = img.params.fov;
				const aspect  = cameraParams.width / cameraParams.height;
				const near = 1.0;
				const far = 1000 * 1000;
				const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
				camera.rotation.order = viewer.scene.getActiveCamera().rotation.order;
				camera.rotation.copy(img.mesh.rotation);
				{
					const mesh = img.mesh;
					const dir = mesh.getWorldDirection();
					const pos = mesh.position;
					const alpha = THREE.Math.degToRad(fov / 2);
					const d = 0.5 / Math.tan(alpha);
					const newCamPos = pos.clone().add(dir.clone().multiplyScalar(d));
					const newCamDir = pos.clone().sub(newCamPos);
					const newCamTarget = new THREE.Vector3().addVectors(
						newCamPos,
						newCamDir.clone().multiplyScalar(viewer.getMoveSpeed()));
					camera.position.copy(newCamPos);
				}
				let volume = new Potree.PolygonClipVolume(camera);
				let m0 = new THREE.Mesh();
				let m1 = new THREE.Mesh();
				let m2 = new THREE.Mesh();
				let m3 = new THREE.Mesh();
				m0.position.set(-1, -1, 0);
				m1.position.set( 1, -1, 0);
				m2.position.set( 1,  1, 0);
				m3.position.set(-1,  1, 0);
				volume.markers.push(m0, m1, m2, m3);
				volume.initialized = true;
				
				viewer.scene.addPolygonClipVolume(volume);
				clipVolume = volume;
			}
			const tEnd = performance.now();
			//console.log(tEnd - tStart);
		};

		const onMouseClick = (evt) => {

			if(orientedImageControls.hasSomethingCaptured()){
				return;
			}

			if(hoveredElement){
				console.log("move to image " + hoveredElement.params.id);

				const mesh = hoveredElement.mesh;
				const newCamPos = new THREE.Vector3( 
					hoveredElement.params.x,
					hoveredElement.params.y,
					hoveredElement.params.z
				);
				const newCamTarget = mesh.position.clone();

				viewer.scene.view.setView(newCamPos, newCamTarget, 500, () => {
					orientedImageControls.capture(hoveredElement.params);
				});

				if(hoveredElement.texture === null){

					const tmp = new TextSprite("loading");

					const aspect = hoveredElement.dimension[0] / hoveredElement.dimension[1];

					tmp.texture.repeat.set(4, 8 / aspect);
					tmp.texture.wrapS = THREE.RepeatWrapping;
					tmp.texture.wrapT = THREE.RepeatWrapping;

					hoveredElement.texture = tmp.texture;
					hoveredElement.mesh.material.map = tmp.texture;
					mesh.material.needsUpdate = true;

					const imagePath = `${imageParamsPath}/../${hoveredElement.params.id}`;

					var loadingElement = hoveredElement;
					const texture = new THREE.TextureLoader().load(imagePath,
						(texture) => {
							loadingElement.texture = texture;
							//loadingElement.mesh.material.map = texture;
							loadingElement.mesh.material.uniforms.tColor.value = texture;
							mesh.material.needsUpdate = true;
						}
					);
					

				}


			}
		};
		viewer.renderer.domElement.addEventListener( 'mousemove', onMouseMove, false );
		viewer.renderer.domElement.addEventListener( 'mousedown', onMouseClick, false );

		viewer.addEventListener("update", () => {

			for(const image of orientedImages){
				const world = image.mesh.matrixWorld;
				const {dimension} = image;
				const aspect = dimension[0] / dimension[1];

				const camera = viewer.scene.getActiveCamera();

				const imgPos = image.mesh.getWorldPosition(new THREE.Vector3());
				const camPos = camera.position;
				const d = camPos.distanceTo(imgPos);

				const minSize = 1; // in degrees of fov
				const a = THREE.Math.degToRad(minSize);
				let r = d * Math.tan(a);
				r = Math.max(r, 1);


				image.mesh.scale.set(r * aspect, r, 1);
				image.line.scale.set(r * aspect, r, 1);

				image.mesh.material.uniforms.uNear.value = camera.near;

			}

		});

		//window.orientedImages = orientedImages;
	};

}

