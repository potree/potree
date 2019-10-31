

class ControlPoint{

	constructor(){
		this.position = new THREE.Vector3(0, 0, 0);
		this.target = new THREE.Vector3(0, 0, 0);
		this.elSVG = null;
	}

};



export class CameraAnimation{

	constructor(viewer){
		this.viewer = viewer;

		this.selectedElement = null;

		this.controlPoints = [];

		this.node = new THREE.Object3D();
		this.node.name = "camera animation";
		this.viewer.scene.scene.add(this.node);

		this.createUpdateHook();
		this.createPath();
	}

	createUpdateHook(){
		const viewer = this.viewer;

		viewer.addEventListener("update", () => {

			const camera = viewer.scene.getActiveCamera();
			const {width, height} = viewer.renderer.getSize(new THREE.Vector2());

			for(const cp of this.controlPoints){

				const projected = cp.position.clone().project(camera);

				const x = width * (projected.x * 0.5 + 0.5);
				const y = height - height * (projected.y * 0.5 + 0.5);

				cp.handle.svg.style.left = x - cp.handle.svg.clientWidth / 2;
				cp.handle.svg.style.top = y - cp.handle.svg.clientHeight / 2;

			}

			this.line.material.resolution.set(width, height);

			this.updatePath();

		});
	}

	createControlPoint(){
		const cp = new ControlPoint();

		cp.handle = this.createHandle();

		this.controlPoints.push(cp);

		return cp;
	}

	removeControlPoint(cp){
		this.controlPoints = this.controlPoints.filter(_cp => _cp !== cp);

		// TODO destroy cp
	}

	createPath(){

		{ // position
			const geometry = new THREE.LineGeometry();

			let material = new THREE.LineMaterial({ 
				color: 0x00ff00, 
				dashSize: 5, 
				gapSize: 2,
				linewidth: 2, 
				resolution:  new THREE.Vector2(1000, 1000),
			});

			const line = new THREE.Line2(geometry, material);

			this.line = line;
			this.node.add(line);
		}

		{ // target
			const geometry = new THREE.LineGeometry();

			let material = new THREE.LineMaterial({ 
				color: 0x0000ff, 
				dashSize: 5, 
				gapSize: 2,
				linewidth: 2, 
				resolution:  new THREE.Vector2(1000, 1000),
			});

			const line = new THREE.Line2(geometry, material);

			this.targetLine = line;
			this.node.add(line);
		}
	}

	createFrustum(){

		const f = 0.3;

		const positions = new Float32Array([
			 0,  0,  0,
			-f, -f, -1,

			 0,  0,  0,
			 f, -f, -1,

			 0,  0,  0,
			 f,  f, -1,

			 0,  0,  0,
			-f,  f, -1,

			-f, -f, -1,
			 f, -f, -1,

			 f, -f, -1,
			 f,  f, -1,

			 f,  f, -1,
			-f,  f, -1,

			-f,  f, -1,
			-f, -f, -1,
		]);

		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute('position', new THREE.BufferAttribute( positions, 3 ) );

		const material = new THREE.LineBasicMaterial({color: 0xff0000});
		const line = new THREE.LineSegments(geometry, material);
		
		return line;
	}

	updatePath(){

		{ // positions
			const positions = this.controlPoints.map(cp => cp.position);

			const curve = new THREE.CatmullRomCurve3(positions);
			curve.curveType = curveType;

			const n = 100;

			const curvePositions = [];
			for(let k = 0; k <= n; k++){
				const t = k / n;

				const position = curve.getPoint(t);

				curvePositions.push(position.x, position.y, position.z);
			}

			this.line.geometry.setPositions(curvePositions);
			this.line.geometry.verticesNeedUpdate = true;
			this.line.geometry.computeBoundingSphere();
			this.line.computeLineDistances();
		}

		{ // targets
			const positions = this.controlPoints.map(cp => cp.target);

			const curve = new THREE.CatmullRomCurve3(positions);
			curve.curveType = curveType;

			const n = 100;

			const curvePositions = [];
			for(let k = 0; k <= n; k++){
				const t = k / n;

				const position = curve.getPoint(t);

				curvePositions.push(position.x, position.y, position.z);
			}

			this.targetLine.geometry.setPositions(curvePositions);
			this.targetLine.geometry.verticesNeedUpdate = true;
			this.targetLine.geometry.computeBoundingSphere();
			this.targetLine.computeLineDistances();
		}
	}

	createHandle(){
		
		const svgns = "http://www.w3.org/2000/svg";
		const svg = document.createElementNS(svgns, "svg");

		svg.setAttribute("width", "2em");
		svg.setAttribute("height", "2em");
		svg.setAttribute("position", "absolute");

		svg.style.left = "50px";
		svg.style.top = "50px";
		svg.style.position = "absolute";
		svg.style.zIndex = "10000";

		const circle = document.createElementNS(svgns, 'circle');
		circle.setAttributeNS(null, 'cx', "1em");
		circle.setAttributeNS(null, 'cy', "1em");
		circle.setAttributeNS(null, 'r', "0.5em");
		circle.setAttributeNS(null, 'style', 'fill: red; stroke: black; stroke-width: 0.2em;' );
		svg.appendChild(circle);


		const element = this.viewer.renderer.domElement.parentElement;
		element.appendChild(svg);


		const startDrag = (evt) => {
			this.selectedElement = svg;

			document.addEventListener("mousemove", drag);
		};

		const endDrag = (evt) => {
			this.selectedElement = null;

			document.removeEventListener("mousemove", drag);
		};

		const drag = (evt) => {
			if (this.selectedElement) {
				evt.preventDefault();

				const rect = viewer.renderer.domElement.getBoundingClientRect();

				const x = evt.clientX - rect.x;
				const y = evt.clientY - rect.y;

				const {width, height} = this.viewer.renderer.getSize(new THREE.Vector2());
				const camera = this.viewer.scene.getActiveCamera();
				const cp = this.controlPoints.find(cp => cp.handle.svg === svg);
				const projected = cp.position.clone().project(camera);

				projected.x = ((x / width) - 0.5) / 0.5;
				projected.y = (-(y - height) / height - 0.5) / 0.5;

				const unprojected = projected.clone().unproject(camera);
				cp.position.set(unprojected.x, unprojected.y, unprojected.z);


			}
		};

		svg.addEventListener('mousedown', startDrag);
		svg.addEventListener('mouseup', endDrag);

		const handle = {
			svg: svg,
		};

		return handle;
	}

}


