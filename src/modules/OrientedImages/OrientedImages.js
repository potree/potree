
import {TextSprite} from "../../TextSprite.js";

export class OrientedImages{

	static async load(cameraParamsPath, imageParamsPath, viewer){

		const tStart = performance.now();

		const response = await fetch(imageParamsPath);
		if(!response.ok){
			console.error(`failed to load ${imageParamsPath}`);
			return;
		}
		const raycaster = new THREE.Raycaster();
		const content = await response.text();
		const lines = content.split(/\r?\n/);
		const imageParams = [];
		const validIDs = [31023, 31024, 31025, 31026, 31027, 31028, 31029, 31030, 31031, 31032, 31033, 31034, 31035, 31036, 31037, 31038, 31039, 31040, 31041, 31042, 31043, 31044, 31045, 31046, 31047, 31048, 31049, 31050, 31296, 31297, 31298, 31299, 31300, 31301, 31302, 31303, 31304, 31305, 31306, 31307, 31308, 31309, 31310, 31311, 31312, 31313, 31314, 31315, 31316, 31317, 31318, 31319, 31320, 31321, 31322, 31323, 31412, 31413, 31414, 31415, 31416, 31417, 31418, 31419, 31420, 31421, 31422, 31423, 31424, 31425, 31426, 31427, 31428, 31429, 31430, 31431, 31432, 31433, 31434, 31679, 31680, 31681, 31682, 31683, 31684, 31685, 31686, 31687, 31688, 31689, 31690, 31691, 31692, 31693, 31694, 31695, 31696, 31697, 31698, 31699, 31700, 31701, 31702, 31703, 31803, 31804, 31805, 31806, 31807, 31808, 31809, 31810, 31811, 31812, 31813, 31814, 31815, 31816, 31817, 31818, 31819, 31820, 31821, 31822, 31823, 31824, 31825, 31826, 31827, 31828, 31829, 32088, 32089, 32090, 32091, 32092, 32093, 32094, 32095, 32096, 32097, 32098, 32099, 32100, 32101, 32102, 32103, 32104, 32105, 32106, 32107, 32108, 32109, 32110, 32111, 32112, 32113, 32277, 32278, 32279, 32280, 32281, 32282, 32283, 32284, 32285, 32286, 32287, 32288, 32289, 32290, 32291, 32292, 32293, 32294, 32295, 32296, 32297, 32298, 32299, 32300, 32594, 32595, 32596, 32597, 32598, 32599, 32600, 32601, 32602, 32603, 32604, 32605, 32606, 32607, 32608, 32609, 32610, 32611, 32612, 32613, 32614, 32615, 32616].map(v => v + "");
		//const validIDs = ["32604"];
		for(let i = 1; i < lines.length; i++){
			const line = lines[i];
			const tokens = line.split(/\s+/);
			let a = (11659 / 2)  / 9523.37466178442;
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
			if(!validIDs.includes(params.id)){
				continue;
			}
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
		const orientedImages = [];
		for(const params of imageParams){
			const material = new THREE.MeshBasicMaterial({
				side: THREE.DoubleSide,
			});
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
			//const imagePath = `${imageParamsPath}/../pot/${params.id}_CD.jpg`;
			//const texture = new THREE.TextureLoader().load(imagePath);
			//material.map = texture;
			material.opacity = 0.7;
			material.transparent = true;
			const line = new THREE.Line(lg, lm);
			line.position.copy(mesh.position);
			line.scale.copy(mesh.scale);
			line.rotation.copy(mesh.rotation);
			viewer.scene.scene.add(line);
			const orientedImage = {
				mesh: mesh,
				texture: null,
				line: line,
				params: params,
				dimension:  [8746, 11659],
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
				const aspect  = 3 / 4;
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
			if(hoveredElement){
				console.log("move to " + hoveredElement.params.id);

				const mesh = hoveredElement.mesh;
				const newCamPos = new THREE.Vector3( 
					hoveredElement.params.x,
					hoveredElement.params.y,
					hoveredElement.params.z
				);
				const newCamTarget = mesh.position.clone();

				viewer.scene.view.setView(newCamPos, newCamTarget, 500);

				if(hoveredElement.texture === null){

					const tmp = new TextSprite("loading");

					const aspect = hoveredElement.dimension[0] / hoveredElement.dimension[1];

					tmp.texture.repeat.set(4, 8 / aspect);
					tmp.texture.wrapS = THREE.RepeatWrapping;
					tmp.texture.wrapT = THREE.RepeatWrapping;

					hoveredElement.texture = tmp.texture;
					hoveredElement.mesh.material.map = tmp.texture;
					mesh.material.needsUpdate = true;

					const imagePath = `${imageParamsPath}/../pot/${hoveredElement.params.id}_CD.jpg`;

					var loadingElement = hoveredElement;
					const texture = new THREE.TextureLoader().load(imagePath,
						(texture) => {
							loadingElement.texture = texture;
							loadingElement.mesh.material.map = texture;
							mesh.material.needsUpdate = true;
						}
					);
					

				}


			}
		};
		viewer.renderer.domElement.addEventListener( 'mousemove', onMouseMove, false );
		viewer.renderer.domElement.addEventListener( 'mousedown', onMouseClick, false );
		window.orientedImages = orientedImages;
	};

}

