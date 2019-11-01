
import { EventDispatcher } from "../../EventDispatcher.js";

class ControlPoint{

	constructor(){
		this.position = new THREE.Vector3(0, 0, 0);
		this.target = new THREE.Vector3(0, 0, 0);
		this.positionHandle = null;
		this.targetHandle = null;
	}

};



export class CameraAnimation extends EventDispatcher{

	constructor(viewer){
		super();
		
		this.viewer = viewer;

		this.selectedElement = null;

		this.controlPoints = [];

		this.node = new THREE.Object3D();
		this.node.name = "camera animation";
		this.viewer.scene.scene.add(this.node);

		this.frustum = this.createFrustum();
		this.node.add(this.frustum);

		this.name = "Camera Animation";
		this.duration = 5;
		this.t = 0;
		// "centripetal", "chordal", "catmullrom"
		this.curveType = "centripetal" 
		this.visible = true;

		this.createUpdateHook();
		this.createPath();
	}

	createUpdateHook(){
		const viewer = this.viewer;

		viewer.addEventListener("update", () => {

			const camera = viewer.scene.getActiveCamera();
			const {width, height} = viewer.renderer.getSize(new THREE.Vector2());

			this.node.visible = this.visible;

			for(const cp of this.controlPoints){
				
				{ // position
					const projected = cp.position.clone().project(camera);

					const visible = this.visible && (projected.z < 1 && projected.z > -1);

					if(visible){
						const x = width * (projected.x * 0.5 + 0.5);
						const y = height - height * (projected.y * 0.5 + 0.5);

						cp.positionHandle.svg.style.left = x - cp.positionHandle.svg.clientWidth / 2;
						cp.positionHandle.svg.style.top = y - cp.positionHandle.svg.clientHeight / 2;
						cp.positionHandle.svg.style.display = "";
					}else{
						cp.positionHandle.svg.style.display = "none";
					}
				}

				{ // target
					const projected = cp.target.clone().project(camera);

					const visible = this.visible && (projected.z < 1 && projected.z > -1);

					if(visible){
						const x = width * (projected.x * 0.5 + 0.5);
						const y = height - height * (projected.y * 0.5 + 0.5);

						cp.targetHandle.svg.style.left = x - cp.targetHandle.svg.clientWidth / 2;
						cp.targetHandle.svg.style.top = y - cp.targetHandle.svg.clientHeight / 2;
						cp.targetHandle.svg.style.display = "";
					}else{
						cp.targetHandle.svg.style.display = "none";
					}
				}

			}

			this.line.material.resolution.set(width, height);

			this.updatePath();

			{ // frustum
				const frame = this.at(this.t);
				const frustum = this.frustum;

				frustum.position.copy(frame.position);
				frustum.lookAt(...frame.target.toArray());
				frustum.scale.set(20, 20, 20);

				frustum.material.resolution.set(width, height);
			}

		});
	}

	createControlPoint(index){

		if(index === undefined){
			index = this.controlPoints.length;
		}

		const cp = new ControlPoint();

		cp.position.copy(viewer.scene.view.position);
		cp.target.copy(viewer.scene.view.getPivot());

		cp.positionHandle = this.createHandle(cp.position);
		cp.targetHandle = this.createHandle(cp.target);

		this.controlPoints.splice(index, 0, cp);

		this.dispatchEvent({
			type: "controlpoint_added",
			controlpoint: cp,
		});

		return cp;
	}

	removeControlPoint(cp){
		this.controlPoints = this.controlPoints.filter(_cp => _cp !== cp);

		this.dispatchEvent({
			type: "controlpoint_removed",
			controlpoint: cp,
		});

		cp.positionHandle.svg.remove();
		cp.targetHandle.svg.remove();

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

		const positions = [
			 0,  0,  0,
			-f, -f, +1,

			 0,  0,  0,
			 f, -f, +1,

			 0,  0,  0,
			 f,  f, +1,

			 0,  0,  0,
			-f,  f, +1,

			-f, -f, +1,
			 f, -f, +1,

			 f, -f, +1,
			 f,  f, +1,

			 f,  f, +1,
			-f,  f, +1,

			-f,  f, +1,
			-f, -f, +1,
		];

		const geometry = new THREE.LineGeometry();

		geometry.setPositions(positions);
		geometry.verticesNeedUpdate = true;
		geometry.computeBoundingSphere();

		let material = new THREE.LineMaterial({ 
			color: 0xff0000, 
			linewidth: 2, 
			resolution:  new THREE.Vector2(1000, 1000),
		});

		const line = new THREE.Line2(geometry, material);
		line.computeLineDistances();
		
		return line;
	}

	updatePath(){

		{ // positions
			const positions = this.controlPoints.map(cp => cp.position);
			const first = positions[0];

			const curve = new THREE.CatmullRomCurve3(positions);
			curve.curveType = this.curveType;

			const n = 100;

			const curvePositions = [];
			for(let k = 0; k <= n; k++){
				const t = k / n;

				const position = curve.getPoint(t).sub(first);

				curvePositions.push(position.x, position.y, position.z);
			}

			this.line.geometry.setPositions(curvePositions);
			this.line.geometry.verticesNeedUpdate = true;
			this.line.geometry.computeBoundingSphere();
			this.line.position.copy(first);
			this.line.computeLineDistances();

			this.cameraCurve = curve;
		}

		{ // targets
			const positions = this.controlPoints.map(cp => cp.target);
			const first = positions[0];

			const curve = new THREE.CatmullRomCurve3(positions);
			curve.curveType = this.curveType;

			const n = 100;

			const curvePositions = [];
			for(let k = 0; k <= n; k++){
				const t = k / n;

				const position = curve.getPoint(t).sub(first);

				curvePositions.push(position.x, position.y, position.z);
			}

			this.targetLine.geometry.setPositions(curvePositions);
			this.targetLine.geometry.verticesNeedUpdate = true;
			this.targetLine.geometry.computeBoundingSphere();
			this.targetLine.position.copy(first);
			this.targetLine.computeLineDistances();

			this.targetCurve = curve;
		}
	}

	at(t){
		const camPos = this.cameraCurve.getPoint(t);
		const target = this.targetCurve.getPoint(t);

		const frame = {
			position: camPos,
			target: target,
		};

		return frame;
	}

	set(t){
		this.t = t;
	}

	createHandle(vector){
		
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
				//const cp = this.controlPoints.find(cp => cp.handle.svg === svg);
				const projected = vector.clone().project(camera);

				projected.x = ((x / width) - 0.5) / 0.5;
				projected.y = (-(y - height) / height - 0.5) / 0.5;

				const unprojected = projected.clone().unproject(camera);
				vector.set(unprojected.x, unprojected.y, unprojected.z);


			}
		};

		svg.addEventListener('mousedown', startDrag);
		svg.addEventListener('mouseup', endDrag);

		const handle = {
			svg: svg,
		};

		return handle;
	}

	setVisible(visible){
		this.node.visible = visible;

		const display = visible ? "" : "none";

		for(const cp of this.controlPoints){
			cp.positionHandle.svg.style.display = display;
			cp.targetHandle.svg.style.display = display;
		}

		this.visible = visible;
	}

	setDuration(duration){
		this.duration = duration;
	}

	getDuration(duration){
		return this.duration;
	}

	play(){

		const tStart = performance.now();
		const duration = this.duration;

		const originalyVisible = this.visible;
		this.setVisible(false);

		const onUpdate = (delta) => {

			let tNow = performance.now();
			let elapsed = (tNow - tStart) / 1000;
			let t = elapsed / duration;

			this.set(t);

			const frame = this.at(t);

			viewer.scene.view.position.copy(frame.position);
			viewer.scene.view.lookAt(frame.target);


			if(t > 1){
				this.setVisible(originalyVisible);

				this.viewer.removeEventListener("update", onUpdate);
			}

		};

		this.viewer.addEventListener("update", onUpdate);

	}

}


