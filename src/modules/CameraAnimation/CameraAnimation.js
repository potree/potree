
import * as THREE from "../../../libs/three.js/build/three.module.js";
import { EventDispatcher } from "../../EventDispatcher.js";
import { Utils } from "../../utils.js";
import {Line2} from "../../../libs/three.js/lines/Line2.js";
import {LineGeometry} from "../../../libs/three.js/lines/LineGeometry.js";
import {LineMaterial} from "../../../libs/three.js/lines/LineMaterial.js";


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

		this.uuid = THREE.Math.generateUUID();

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

	static defaultFromView(viewer){
		const animation = new CameraAnimation(viewer);

		const camera = viewer.scene.getActiveCamera();
		const target = viewer.scene.view.getPivot();

		const cpCenter = new THREE.Vector3(
			0.3 * camera.position.x + 0.7 * target.x,
			0.3 * camera.position.y + 0.7 * target.y,
			0.3 * camera.position.z + 0.7 * target.z,
		);

		const targetCenter = new THREE.Vector3(
			0.05 * camera.position.x + 0.95 * target.x,
			0.05 * camera.position.y + 0.95 * target.y,
			0.05 * camera.position.z + 0.95 * target.z,
		);

		const r = camera.position.distanceTo(target) * 0.3;

		//const dir = target.clone().sub(camera.position).normalize();
		const angle = Utils.computeAzimuth(camera.position, target);

		const n = 5;
		for(let i = 0; i < n; i++){
			let u = 1.5 * Math.PI * (i / n) + angle;

			const dx = r * Math.cos(u);
			const dy = r * Math.sin(u);

			const cpPos = [
				cpCenter.x + dx,
				cpCenter.y + dy,
				cpCenter.z,
			];

			const targetPos = [
				targetCenter.x + dx * 0.1,
				targetCenter.y + dy * 0.1,
				targetCenter.z,
			];

			const cp = animation.createControlPoint();
			cp.position.set(...cpPos);
			cp.target.set(...targetPos);
		}

		return animation;
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


		if(this.controlPoints.length >= 2 && index === 0){
			const cp1 = this.controlPoints[0];
			const cp2 = this.controlPoints[1];

			const dir = cp1.position.clone().sub(cp2.position).multiplyScalar(0.5);
			cp.position.copy(cp1.position).add(dir);

			const tDir = cp1.target.clone().sub(cp2.target).multiplyScalar(0.5);
			cp.target.copy(cp1.target).add(tDir);
		}else if(this.controlPoints.length >= 2 && index === this.controlPoints.length){
			const cp1 = this.controlPoints[this.controlPoints.length - 2];
			const cp2 = this.controlPoints[this.controlPoints.length - 1];

			const dir = cp2.position.clone().sub(cp1.position).multiplyScalar(0.5);
			cp.position.copy(cp1.position).add(dir);

			const tDir = cp2.target.clone().sub(cp1.target).multiplyScalar(0.5);
			cp.target.copy(cp2.target).add(tDir);
		}else if(this.controlPoints.length >= 2){
			const cp1 = this.controlPoints[index - 1];
			const cp2 = this.controlPoints[index];

			cp.position.copy(cp1.position.clone().add(cp2.position).multiplyScalar(0.5));
			cp.target.copy(cp1.target.clone().add(cp2.target).multiplyScalar(0.5));
		}

		// cp.position.copy(viewer.scene.view.position);
		// cp.target.copy(viewer.scene.view.getPivot());

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
			const geometry = new LineGeometry();

			let material = new LineMaterial({ 
				color: 0x00ff00, 
				dashSize: 5, 
				gapSize: 2,
				linewidth: 2, 
				resolution:  new THREE.Vector2(1000, 1000),
			});

			const line = new Line2(geometry, material);

			this.line = line;
			this.node.add(line);
		}

		{ // target
			const geometry = new LineGeometry();

			let material = new LineMaterial({ 
				color: 0x0000ff, 
				dashSize: 5, 
				gapSize: 2,
				linewidth: 2, 
				resolution:  new THREE.Vector2(1000, 1000),
			});

			const line = new Line2(geometry, material);

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

		const geometry = new LineGeometry();

		geometry.setPositions(positions);
		geometry.verticesNeedUpdate = true;
		geometry.computeBoundingSphere();

		let material = new LineMaterial({ 
			color: 0xff0000, 
			linewidth: 2, 
			resolution:  new THREE.Vector2(1000, 1000),
		});

		const line = new Line2(geometry, material);
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
		
		if(t > 1){
			t = 1;
		}else if(t < 0){
			t = 0;
		}

		const camPos = this.cameraCurve.getPointAt(t);
		const target = this.targetCurve.getPointAt(t);

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


