
import * as THREE from "three";
import {TextSprite} from "../TextSprite.js";
import {Utils} from "../utils.js";
import {Line2} from "three/examples/jsm/lines/Line2";
import {LineGeometry} from "three/examples/jsm/lines/LineGeometry";
import {LineMaterial} from "three/examples/jsm/lines/LineMaterial";
import {sphereIcon, pointPlusIcon, pointTickIcon} from './imageBase64.js'
import { MeasurementName } from "./MeasurementName.js";

export const MeasureTypes = {
	MARKER: 'marker',
	LENGTH: 'length',
	P2P_TRIANGLE: 'p2p_triangle',
	THREE_AREA: 'three_area',
	VOLUME: 'volume',
};


export const MeasurementsPalette = {
	'three_height' : new THREE.Color('#f66161'),
	'three_length' : new THREE.Color('#f66161'),
	'three_area' : new THREE.Color('#f7b500'),
  };

function getBaseDistance(positions) {
	const position0 = positions[0];
	const position1 = positions[1];
	position0.z = position1.z;
	let baseDistance = position0.distanceTo(position1);
	// baseDistance *= VALUES_PER_METER[unitType];
	return { baseDistance: baseDistance.toFixed(2) };
  }

function createHeightLine(){
	let lineGeometry = new LineGeometry();

	lineGeometry.setPositions([
		0, 0, 0,
		0, 0, 0,
	]);

	let lineMaterial = new LineMaterial({ 
		color: 0xffaa00, 
		dashed: true,
		dashSize: 0.3,
    	gapSize: 0.3,
		dashScale: 8,
    	linewidth: 3,
		resolution:  new THREE.Vector2(1000, 1000),
	});

	lineMaterial.depthTest = false;
	const heightEdge = new Line2(lineGeometry, lineMaterial);
	heightEdge.visible = false;

	//this.add(this.heightEdge);
	
	return heightEdge;
}

function createHeightLabel(){
	const heightLabel = new TextSprite('');

	// heightLabel.setTextColor({r: 140, g: 250, b: 140, a: 1.0});
	heightLabel.setBorderColor({r: 0, g: 0, b: 0, a: 1.0});
	heightLabel.setBackgroundColor({r: 255, g: 255, b: 255, a: 0.9});
	heightLabel.fontsize = 16;
	heightLabel.material.depthTest = false;
	heightLabel.material.opacity = 1;
	heightLabel.visible = false;

	return heightLabel;
}

function createAreaLabel(){
	const areaLabel = new TextSprite('');

	// areaLabel.setTextColor({r: 140, g: 250, b: 140, a: 1.0});
	areaLabel.setBorderColor({r: 0, g: 0, b: 0, a: 1.0});
	areaLabel.setBackgroundColor({r: 255, g: 255, b: 255, a: 0.9});

	areaLabel.fontsize = 16;
	areaLabel.material.depthTest = false;
	areaLabel.material.opacity = 1;
	areaLabel.visible = false;
	
	return areaLabel;
}

function createCircleRadiusLabel(){
	const circleRadiusLabel = new TextSprite("");

	circleRadiusLabel.setTextColor({r: 140, g: 250, b: 140, a: 1.0});
	circleRadiusLabel.setBorderColor({r: 0, g: 0, b: 0, a: 1.0});
	circleRadiusLabel.setBackgroundColor({r: 0, g: 0, b: 0, a: 1.0});
	circleRadiusLabel.fontsize = 16;
	circleRadiusLabel.material.depthTest = false;
	circleRadiusLabel.material.opacity = 1;
	circleRadiusLabel.visible = false;
	
	return circleRadiusLabel;
}

function createCircleRadiusLine(){
	const lineGeometry = new LineGeometry();

	lineGeometry.setPositions([
		0, 0, 0,
		0, 0, 0,
	]);

	const lineMaterial = new LineMaterial({ 
		color: 0xff0000, 
		linewidth: 2, 
		resolution:  new THREE.Vector2(1000, 1000),
		gapSize: 1,
		dashed: true,
	});

	lineMaterial.depthTest = false;

	const circleRadiusLine = new Line2(lineGeometry, lineMaterial);
	circleRadiusLine.visible = false;

	return circleRadiusLine;
}

function createCircleLine(){
	const coordinates = [];

	let n = 128;
	for(let i = 0; i <= n; i++){
		let u0 = 2 * Math.PI * (i / n);
		let u1 = 2 * Math.PI * (i + 1) / n;

		let p0 = new THREE.Vector3(
			Math.cos(u0), 
			Math.sin(u0), 
			0
		);

		let p1 = new THREE.Vector3(
			Math.cos(u1), 
			Math.sin(u1), 
			0
		);

		coordinates.push(
			...p0.toArray(),
			...p1.toArray(),
		);
	}

	const geometry = new LineGeometry();
	geometry.setPositions(coordinates);

	const material = new LineMaterial({ 
		color: 0xff0000, 
		dashSize: 5, 
		gapSize: 2,
		linewidth: 2, 
		resolution:  new THREE.Vector2(1000, 1000),
	});

	material.depthTest = false;

	const circleLine = new Line2(geometry, material);
	circleLine.visible = false;
	circleLine.computeLineDistances();

	return circleLine;
}

function createCircleCenter(){
	const sg = new THREE.SphereGeometry(1, 32, 32);
	const sm = new THREE.MeshNormalMaterial();
	
	const circleCenter = new THREE.Mesh(sg, sm);
	circleCenter.visible = false;

	return circleCenter;
}

function createLine(){
	const geometry = new LineGeometry();

	geometry.setPositions([
		0, 0, 0,
		0, 0, 0,
	]);

	const material = new LineMaterial({ 
		color: 0xff0000, 
		linewidth: 2, 
		resolution:  new THREE.Vector2(1000, 1000),
		gapSize: 1,
		dashed: true,
	});

	material.depthTest = false;

	const line = new Line2(geometry, material);

	return line;
}

function createCircle(){

	const coordinates = [];

	let n = 128;
	for(let i = 0; i <= n; i++){
		let u0 = 2 * Math.PI * (i / n);
		let u1 = 2 * Math.PI * (i + 1) / n;

		let p0 = new THREE.Vector3(
			Math.cos(u0), 
			Math.sin(u0), 
			0
		);

		let p1 = new THREE.Vector3(
			Math.cos(u1), 
			Math.sin(u1), 
			0
		);

		coordinates.push(
			...p0.toArray(),
			...p1.toArray(),
		);
	}

	const geometry = new LineGeometry();
	geometry.setPositions(coordinates);

	const material = new LineMaterial({ 
		color: 0xff0000, 
		dashSize: 5, 
		gapSize: 2,
		linewidth: 2, 
		resolution:  new THREE.Vector2(1000, 1000),
	});

	material.depthTest = false;

	const line = new Line2(geometry, material);
	line.computeLineDistances();

	return line;

}

function createAzimuth(){

	const azimuth = {
		label: null,
		center: null,
		target: null,
		north: null,
		centerToNorth: null,
		centerToTarget: null,
		centerToTargetground: null,
		targetgroundToTarget: null,
		circle: null,

		node: null,
	};

	const sg = new THREE.SphereGeometry(1, 32, 32);
	const sm = new THREE.MeshNormalMaterial();

	{
		const label = new TextSprite("");

		label.setTextColor({r: 140, g: 250, b: 140, a: 1.0});
		label.setBorderColor({r: 0, g: 0, b: 0, a: 1.0});
		label.setBackgroundColor({r: 0, g: 0, b: 0, a: 1.0});
		label.fontsize = 16;
		label.material.depthTest = false;
		label.material.opacity = 1;

		azimuth.label = label;
	}

	azimuth.center = new THREE.Mesh(sg, sm);
	azimuth.target = new THREE.Mesh(sg, sm);
	azimuth.north = new THREE.Mesh(sg, sm);
	azimuth.centerToNorth = createLine();
	azimuth.centerToTarget = createLine();
	azimuth.centerToTargetground = createLine();
	azimuth.targetgroundToTarget = createLine();
	azimuth.circle = createCircle();

	azimuth.node = new THREE.Object3D();
	azimuth.node.add(
		azimuth.centerToNorth,
		azimuth.centerToTarget,
		azimuth.centerToTargetground,
		azimuth.targetgroundToTarget,
		azimuth.circle,
		azimuth.label,
		azimuth.center,
		azimuth.target,
		azimuth.north,
	);

	return azimuth;
}



export class Measure extends THREE.Object3D {
	constructor (
		contentType,
		contentId,
	) {
		super();

		this.constructor.counter = (this.constructor.counter === undefined) ? 0 : this.constructor.counter + 1;

		this.name = 'Measure_' + this.constructor.counter;
		this.points = [];
		this._showDistances = true;
		this._showCoordinates = false;
		this._showArea = false;
		this._closed = true;
		this._showAngles = false;
		this._showCircle = false;
		this._showHeight = false;
		this._showHeightLabel = false;
		this._showAreaLabel = false;
		this._showEdges = true;
		this._showAzimuth = false;
		this.maxMarkers = Number.MAX_SAFE_INTEGER;

		this.sphereGeometry = new THREE.SphereGeometry(0.4, 10, 10);
		// this.color =  contentColor;
		this.sphereColor = new THREE.Color(0xffffff);
		this.contentColor =  MeasurementsPalette[contentType];
		this.selectedSphere = undefined;
		this._ishovering = false;
		this.contentId = contentId;
	
		this.measurementLabel = new MeasurementName(contentId);
		this.add(this.measurementLabel);

		this.spheres = [];
		this.edges = [];
		this.sphereLabels = [];
		this.edgeLabels = [];
		this.angleLabels = [];
		this.coordinateLabels = [];

		this.heightEdge = createHeightLine();
		this.heightLabel = createHeightLabel();
		this.baseLabel = createHeightLabel();

		this.areaLabel = createAreaLabel();
		this.circleRadiusLabel = createCircleRadiusLabel();
		this.circleRadiusLine = createCircleRadiusLine();
		this.circleLine = createCircleLine();
		this.circleCenter = createCircleCenter();

		this.azimuth = createAzimuth();
		// this.texture = loadAllTexture();
		this._textures = null;

		this._isplusNodesAdded = false;
		// this.defaultTexture = null;
		// this.plusNodeTexture = null;
		// this.tickNodeTexture = null;

		this.add(this.heightEdge);
		this.add(this.heightLabel);
		this.add(this.baseLabel);
		this.add(this.areaLabel);
		this.add(this.circleRadiusLabel);
		this.add(this.circleRadiusLine);
		this.add(this.circleLine);
		this.add(this.circleCenter);

		this.add(this.azimuth.node);

	}

	createEdge() {
		let lineGeometry = new LineGeometry();
			lineGeometry.setPositions( [
					0, 0, 0,
					0, 0, 0,
			]);

			let lineMaterial = new LineMaterial({
				color: this.contentColor, 
				linewidth: 3, 
				resolution:  new THREE.Vector2(1000, 1000),
			});

			lineMaterial.depthTest = false;

			let edge = new Line2(lineGeometry, lineMaterial);
			edge.visible = true;
			return edge
	}

	createEdgeLabel() {
		let edgeLabel = new TextSprite();
			edgeLabel.setBorderColor({r: 0, g: 0, b: 0, a: 1.0});
			edgeLabel.setBackgroundColor({r: 255, g: 255, b: 255, a: 0.9});
			edgeLabel.material.depthTest = false;
			edgeLabel.visible = false;
			edgeLabel.fontsize = 16;
		return edgeLabel;
	}

	loadAllTexture() {
		const textureLoader = new THREE.TextureLoader();
		return new Promise((resolve, reject) => {
			const defaultTexture = textureLoader.load(sphereIcon, resolve);
			const plusNodeTexture = textureLoader.load(pointPlusIcon, resolve);
			const tickNodeTexture = textureLoader.load(pointTickIcon, resolve);
			resolve({ defaultTexture, plusNodeTexture, tickNodeTexture });
		});
	}

	createSphereMaterial () {
		let sphereMaterial = new THREE.MeshLambertMaterial({
			//shading: THREE.SmoothShading,
			color: this.sphereColor,
			depthTest: false,
			depthWrite: false}
		);

		return sphereMaterial;
	};

	createSpriteMaterial(texture) {
		const material = new THREE.SpriteMaterial({
		  map: texture || this._textures.defaultTexture,
		  color: this.sphereColor,
		  depthWrite: false,
		  depthTest: false,
		});
		if (texture) {
		  texture.needsUpdate = true;
		}
		return material;
	  }

	addSphereEvents(sphere){
		{ // Event Listeners
			let drag = (e) => {
				this.measurementLabel.hide();
				let I = Utils.getMousePointCloudIntersection(
					e.drag.end, 
					e.viewer.scene.getActiveCamera(), 
					e.viewer, 
					e.viewer.scene.pointclouds,
					// this.spheres,
					{pickClipped: true});

				if (e.drag.object.name === 'add') {
					const index = this.spheres.indexOf(e.drag.object);

					this.spheres[index].name = '';
					this.spheres[index].material = this.createSpriteMaterial(this._textures.defaultTexture);
					this.edges[index].name = '';

					this.edgeLabels[index].name = '';
					this.points[index].name = '';

					this.removeAddMarker();

					this.updateSphereVisibility(e.viewer.scene.getActiveCamera(), false)
					this.update();
					
				}

				if (I) {
					let i = this.spheres.indexOf(e.drag.object);
					if (i !== -1) {
						let point = this.points[i];
						
						// loop through current keys and cleanup ones that will be orphaned
						for (let key of Object.keys(point)) {
							if (!I.point[key]) {
								delete point[key];
							}
						}

						for (let key of Object.keys(I.point).filter(e => e !== 'position')) {
							point[key] = I.point[key];
						}

						this.setPosition(i, I.location);
					}
				}
			};

			let drop = e => {
				let i = this.spheres.indexOf(e.drag.object);
				this.measurementLabel.show();

				const parent_measurement = e.drag.object.parent;
				if (parent_measurement && parent_measurement.userData.contentId) {
					this.removeAddMarker();
					
					this.updateSphereVisibility(e.viewer.scene.getActiveCamera(), this.isplusNodesAdded)
					
					this.update();
			
				}
				


				if (i !== -1) {
					this.dispatchEvent({
						'type': 'marker_dropped',
						'measurement': this,
						'index': i
					});
				}
			};

			// let mouseover = (e) => e.object.material.emissive.setHex(0x888888);
			// let mouseleave = (e) => e.object.material.emissive.setHex(0x000000);

			sphere.addEventListener('drag', drag);
			sphere.addEventListener('drop', drop);
			// sphere.addEventListener('mouseover', mouseover);
			// sphere.addEventListener('mouseleave', mouseleave);
		}

		let event = {
			type: 'marker_added',
			measurement: this,
			sphere: sphere
		};
		this.dispatchEvent(event);
	}

	addMarker (point) {
		// loadAllTexture().then((textures) => {
		// 	if (!this.setTextures) {
		// 		this.setTextures = textures;
		// 	}

		if (point.x != null) {
			point = {position: point};
		}else if(point instanceof Array){
			point = {position: new THREE.Vector3(...point)};
		}
		this.points.push(point);

		// sphere
		let sphere = new THREE.Sprite(this.createSpriteMaterial(this._textures.defaultTexture));
		sphere.updateMatrixWorld(true);
		sphere.material.needsUpdate = true;
		this.add(sphere);
		this.spheres.push(sphere);

		 // edges
			let edge = this.createEdge()
			this.add(edge);
			this.edges.push(edge);
		

		{ // edge labels
			let edgeLabel = this.createEdgeLabel()
			this.edgeLabels.push(edgeLabel);
			this.add(edgeLabel);
		}

		{ // angle labels
			let angleLabel = new TextSprite();
			angleLabel.setBorderColor({r: 0, g: 0, b: 0, a: 1.0});
			angleLabel.setBackgroundColor({r: 0, g: 0, b: 0, a: 1.0});
			angleLabel.fontsize = 16;
			angleLabel.material.depthTest = false;
			angleLabel.material.opacity = 1;
			angleLabel.visible = false;
			this.angleLabels.push(angleLabel);
			this.add(angleLabel);
		}

		{ // coordinate labels
			let coordinateLabel = new TextSprite();
			coordinateLabel.setBorderColor({r: 0, g: 0, b: 0, a: 1.0});
			coordinateLabel.setBackgroundColor({r: 0, g: 0, b: 0, a: 1.0});
			coordinateLabel.fontsize = 16;
			coordinateLabel.material.depthTest = false;
			coordinateLabel.material.opacity = 1;
			coordinateLabel.visible = false;
			this.coordinateLabels.push(coordinateLabel);
			this.add(coordinateLabel);
		}

		
		this.addSphereEvents(sphere);
		this.setMarker(this.points.length - 1, point);

		// let mouseover = (e) => {
		// 	const lightenColor = this._contentColor.lerp(this._contentColor, .7);
		
		// 	e.object.material.color.set(lightenColor);
		// };
		// let mouseleave = (e) => e.object.material.color.lerp(MeasurementsPalette.three_length, 1);

		// edge.addEventListener('mouseover', mouseover);
		// edge.addEventListener('mouseleave', mouseleave);

		// })
	
	};

	updateSphereVisibility(camera, _isplusNodesAdded) {
		if (this) {
			// updating shere material
			this.showDistances = this.name === MeasureTypes.THREE_AREA ? false : true;
			this.showHeightLabel = true;

			if (this.showArea) {
				this._showAreaLabel = true;
			}

			this.spheres.map(v => {
			  v.visible = true;
			  v.material = this.createSpriteMaterial();
			  v.name = '';
			  return v;
			});
	  
			// add spheres with plus icons nodes
			if (!_isplusNodesAdded && this.name !== MeasureTypes.P2P_TRIANGLE) {
			  const currentSpheres = this.spheres;
			  const newPosition= this.createPositions(currentSpheres);
			  newPosition.map((pos, index) => {
				this.updateAddMarker(pos.points, pos.index + index + 1, camera);
			  });
			  this._isplusNodesAdded = true;
			}
		  }
	}

	updateAddMarker(position, index, camera) {
		this.points.splice(index, 0, { position, name: 'add' });
		const sphere = new THREE.Sprite(this.createSpriteMaterial(this._textures.plusNodeTexture));
		sphere.position.copy(position);
		sphere.name = 'add';
		sphere.lookAt(camera.position);
		sphere.rotation.z = (Math.PI / 360) * 280;
		this.add(sphere);
		this.spheres.splice(index, 0, sphere);
	
		{
		  // edges
		  const edge = this.createEdge();
		  edge.name = 'add';
		  // edge.visible = false;
	
		  this.edges.splice(index, 0, edge);
		  this.add(edge);
		}
	
		{
		  // edge labels
		  const edgeLabel = this.createEdgeLabel();
		  edgeLabel.name = 'add';
		  this.edgeLabels.splice(index, 0, edgeLabel);
		  this.add(edgeLabel);
		}
	
		this.addSphereEvents(sphere);
	  }

	removeMarker (index) {
		this.points.splice(index, 1);

		this.remove(this.spheres[index]);

		let edgeIndex = (index === 0) ? 0 : (index - 1);
		this.remove(this.edges[edgeIndex]);
		this.edges.splice(edgeIndex, 1);

		this.remove(this.edgeLabels[edgeIndex]);
		this.edgeLabels.splice(edgeIndex, 1);
		this.coordinateLabels.splice(index, 1);

		this.remove(this.angleLabels[index]);
		this.angleLabels.splice(index, 1);

		this.spheres.splice(index, 1);

		this.update();

		this.dispatchEvent({type: 'marker_removed', measurement: this});
	};

	endMeasurement(index) {
		this.points.splice(index, 1);

		this.remove(this.spheres[index]);

		let edgeIndex = (index === 0) ? 0 : (index - 1);
		this.remove(this.edges[edgeIndex]);
		this.edges.splice(edgeIndex, 1);

		this.remove(this.edgeLabels[edgeIndex]);
		this.edgeLabels.splice(edgeIndex, 1);
		this.coordinateLabels.splice(index, 1);

		this.remove(this.angleLabels[index]);
		this.angleLabels.splice(index, 1);

		this.spheres.splice(index, 1);

		this.update();

		this.dispatchEvent({type: 'end_measurement', measurement: this});
	}

	removeAddMarker() {
		const filterSphere = this.spheres.filter(sph => sph.name === 'add');
		const filterEdge = this.edges.filter(sph => sph.name === 'add');
		const filterEdgeLabel = this.edgeLabels.filter(sph => sph.name === 'add');
		// const filterPoints = this.points.filter(pnt => pnt.name === 'add');
	
		this.points = this.points.filter(pnt => pnt.name !== 'add');
		this.spheres = this.spheres.filter(sph => sph.name !== 'add');
		this.edges = this.edges.filter(sph => sph.name !== 'add');
		this.edgeLabels = this.edgeLabels.filter(sph => sph.name !== 'add');
	
		filterSphere.map(sph => {
		  this.remove(sph);
		});
	
		filterEdge.map(edg => {
		  this.remove(edg);
		});
	
		filterEdgeLabel.map(edgLbl => {
		  this.remove(edgLbl);
		});

		this.update();
		this.dispatchEvent({ type: 'marker_removed', measurement: this });
		this._isplusNodesAdded = false;
	  }

	 createPositions(currentSpheres) {
		const allPositions = [];
		if (currentSpheres.length) {
		  const lastSphere = currentSpheres[currentSpheres.length - 1];
		  currentSpheres.map((sph, index) => {
			if (sph.uuid !== lastSphere.uuid || sph.parent.name === MeasureTypes.THREE_AREA) {
			  const nextSphere =
				index < currentSpheres.length - 1 ? currentSpheres[index + 1] : currentSpheres[0];
			  const newPosition = new THREE.Vector3(sph.position.x, sph.position.y, sph.position.z)
				.add(nextSphere.position)
				.multiplyScalar(0.5);
			  allPositions.push({ points: newPosition, index });
			}
		  });
		}
		return allPositions;
	  }

	setMarker (index, point) {
		this.points[index] = point;

		let event = {
			type: 'marker_moved',
			measure:	this,
			index:	index,
			position: point.position.clone()
		};
		this.dispatchEvent(event);

		this.update();
	}

	setPosition (index, position) {
		let point = this.points[index];
		this.selectedSphere = this.spheres[index];
		point.position.copy(position);

		let event = {
			type: 'marker_moved',
			measure:	this,
			index:	index,
			position: position.clone()
		};
		this.dispatchEvent(event);

		this.update();
	};

	getArea () {
		let area = 0;
		let j = this.points.length - 1;

		for (let i = 0; i < this.points.length; i++) {
			let p1 = this.points[i].position;
			let p2 = this.points[j].position;
			area += (p2.x + p1.x) * (p1.y - p2.y);
			j = i;
		}

		return Math.abs(area / 2);
	};

	getTotalDistance () {
		if (this.points.length === 0) {
			return 0;
		}

		let distance = 0;

		for (let i = 1; i < this.points.length; i++) {
			let prev = this.points[i - 1].position;
			let curr = this.points[i].position;
			let d = prev.distanceTo(curr);

			distance += d;
		}

		if (this.closed && this.points.length > 1) {
			let first = this.points[0].position;
			let last = this.points[this.points.length - 1].position;
			let d = last.distanceTo(first);

			distance += d;
		}

		return distance;
	}

	getAngleBetweenLines (cornerPoint, point1, point2) {
		let v1 = new THREE.Vector3().subVectors(point1.position, cornerPoint.position);
		let v2 = new THREE.Vector3().subVectors(point2.position, cornerPoint.position);

		// avoid the error printed by threejs if denominator is 0
		const denominator = Math.sqrt( v1.lengthSq() * v2.lengthSq() );
		if(denominator === 0){
			return 0;
		}else{
			return v1.angleTo(v2);
		}
	};

	getAngle (index) {
		if (this.points.length < 3 || index >= this.points.length) {
			return 0;
		}

		let previous = (index === 0) ? this.points[this.points.length - 1] : this.points[index - 1];
		let point = this.points[index];
		let next = this.points[(index + 1) % (this.points.length)];

		return this.getAngleBetweenLines(point, previous, next);
	}

	// updateAzimuth(){
	// 	// if(this.points.length !== 2){
	// 	// 	return;
	// 	// }

	// 	// const azimuth = this.azimuth;

	// 	// const [p0, p1] = this.points;

	// 	// const r = p0.position.distanceTo(p1.position);
		
	// }

	update () {
		if (this.points.length === 0) {
			return;
		} else if (this.points.length === 1) {
			let point = this.points[0];
			let position = point.position;
			this.spheres[0].position.copy(position);

			{ // coordinate labels
				let coordinateLabel = this.coordinateLabels[0];
				
				let msg = position.toArray().map(p => Utils.addCommas(p.toFixed(2))).join(" / ");
				coordinateLabel.setText(msg);

				coordinateLabel.visible = this.showCoordinates;
			}

			return;
		}

		let filterPoints = this.points.filter(pt => pt.name !== 'add');
		let lastIndex = this.points.length - 1;
		let filterIndex = filterPoints.length - 1;

		let centroid = new THREE.Vector3();
		for (let i = 0; i <= lastIndex; i++) {
			let point = this.points[i];
			centroid.add(point.position);
		}
		centroid.divideScalar(this.points.length);

		const measurementLabelPosition = Utils.getMidPointFromEdges(
			this.points.map(({ position }) => position),
			this.getTotalDistance()
		  );
		  this.measurementLabel.position.copy(measurementLabelPosition);

		for (let i = 0; i <= lastIndex; i++) {
			const index = i;
			// const nextIndex = i + 1 > lastIndex ? 0 : i + 1;
			// let previousIndex = i === 0 ? lastIndex : i - 1;
	  
			const point = this.points[index];
			// const nextPoint = this.points[nextIndex];
			// let previousPoint = this.points[previousIndex];
	  
			// spheres
			const sphere = this.spheres[index];
			// if (!sphere) {
			//   return;
			// }
	  
			if (sphere.name === 'add' && sphere.uuid && this.selectedSphere && sphere.uuid !== this.selectedSphere.uuid) {
			  const getAddIndex = this.spheres.findIndex(sph => sph.uuid === sphere.uuid);
			  const nextSphere = this.spheres[getAddIndex + 1];
			  let center = new THREE.Vector3().add(this.spheres[getAddIndex - 1].position);
			  if (sphere.parent.name === MeasureTypes.THREE_AREA && index === lastIndex) {
				center.add(this.spheres[0].position);
			  } else {
				center.add(nextSphere.position);
			  }
			  center = center.multiplyScalar(0.5);
			  sphere.position.copy(center);
			} else {
			  sphere.position.copy(point.position);
			}
			// sphere.position.copy(point.position);
	  
			sphere.material.color = this.sphereColor;
		  }

		for (let i = 0; i <= filterIndex; i++) {
			let index = i;
			let nextIndex = (i + 1 > filterIndex) ? 0 : i + 1;
			let previousIndex = (i === 0) ? filterIndex : i - 1;

			let point = filterPoints[index];
			let nextPoint = filterPoints[nextIndex];
			// let previousPoint = this.points[previousIndex];

			{ // edges
				// let edge = this.edges[index];
				let filterEdges = this.edges.filter(ed => ed.name !== 'add');
        		let edge = filterEdges[i];

				if (edge) {
					if (!this._ishovering) {
						edge.material.color = this.contentColor.clone();
					}

					edge.position.copy(point.position);
	
					edge.geometry.setPositions([
						0, 0, 0,
						...nextPoint.position.clone().sub(point.position).toArray(),
					]);
	
					edge.geometry.verticesNeedUpdate = true;
					edge.geometry.computeBoundingSphere();
					edge.computeLineDistances();
					edge.visible = index < filterIndex || this.closed;
					
					if(!this.showEdges){
						edge.visible = false;
					}
				}				
			}

			{ // edge labels
				let filterEdgeLabels = this.edgeLabels.filter(ed => ed.name !== 'add');
				let edgeLabel = filterEdgeLabels[i];

        		if (edgeLabel) {
				let center = new THREE.Vector3().add(point.position);
				center.add(nextPoint.position);
				center = center.multiplyScalar(0.5);
				let distance = point.position.distanceTo(nextPoint.position);

				edgeLabel.position.copy(center);

				let suffix = "";
				if(this.lengthUnit != null && this.lengthUnitDisplay != null){
					distance = distance / this.lengthUnit.unitspermeter * this.lengthUnitDisplay.unitspermeter;  //convert to meters then to the display unit
					suffix = this.lengthUnitDisplay.code;
				}

				let txtLength = Utils.addCommas(distance.toFixed(2));
				edgeLabel.setText(`${txtLength} ${suffix}`);
				edgeLabel.visible = this.showDistances && (index < filterIndex || this.closed) && this.points.length >= 2 && distance > 0.9;
				
				}
			}


			// { // angle labels
			// 	let angleLabel = this.angleLabels[i];
			// 	let angle = this.getAngleBetweenLines(point, previousPoint, nextPoint);

			// 	let dir = nextPoint.position.clone().sub(previousPoint.position);
			// 	dir.multiplyScalar(0.5);
			// 	dir = previousPoint.position.clone().add(dir).sub(point.position).normalize();

			// 	let dist = Math.min(point.position.distanceTo(previousPoint.position), point.position.distanceTo(nextPoint.position));
			// 	dist = dist / 9;

			// 	let labelPos = point.position.clone().add(dir.multiplyScalar(dist));
			// 	angleLabel.position.copy(labelPos);

			// 	let msg = Utils.addCommas((angle * (180.0 / Math.PI)).toFixed(1)) + '\u00B0';
			// 	angleLabel.setText(msg);

			// 	angleLabel.visible = this.showAngles && (index < lastIndex || this.closed) && this.points.length >= 3 && angle > 0;
			// }
		}

		{ // update height stuff
			let heightEdge = this.heightEdge;
			heightEdge.visible = this.showHeight;
			this.heightLabel.visible = this.showHeightLabel;
			this.baseLabel.visible = this.showHeightLabel;

			if (this.showHeight) {
				let sorted = this.points.slice().sort((a, b) => a.position.z - b.position.z);
				let lowPoint = sorted[0].position.clone();
				let highPoint = sorted[sorted.length - 1].position.clone();
				let min = lowPoint.z;
				let max = highPoint.z;
				let height = max - min;

				let start = new THREE.Vector3(highPoint.x, highPoint.y, min);
				let end = new THREE.Vector3(highPoint.x, highPoint.y, max);

				heightEdge.position.copy(lowPoint);

				heightEdge.geometry.setPositions([
					0, 0, 0,
					...start.clone().sub(lowPoint).toArray(),
					...start.clone().sub(lowPoint).toArray(),
					...end.clone().sub(lowPoint).toArray(),
				]);

				heightEdge.geometry.verticesNeedUpdate = true;
				// heightEdge.geometry.computeLineDistances();
				// heightEdge.geometry.lineDistancesNeedUpdate = true;
				heightEdge.geometry.computeBoundingSphere();
				heightEdge.computeLineDistances();

				// heightEdge.material.dashSize = height / 40;
				// heightEdge.material.gapSize = height / 40;

				// baseDistance Label
				const threePositions = this.points.map(
					location =>
					  new THREE.Vector3(location.position.x, location.position.y, location.position.z)
				  );
				const { baseDistance } = getBaseDistance(threePositions);
				const start1 = new THREE.Vector3(highPoint.x, highPoint.y, lowPoint.z);
				const end1 = new THREE.Vector3(lowPoint.x, lowPoint.y, lowPoint.z);
		
				const baseLabelPosition = start1.clone().add(end1).multiplyScalar(0.5);
				this.baseLabel.position.copy(baseLabelPosition);

				let heightLabelPosition = start.clone().add(end).multiplyScalar(0.5);
				this.heightLabel.position.copy(heightLabelPosition);

				let suffix = "";
				if(this.lengthUnit != null && this.lengthUnitDisplay != null){
					height = height / this.lengthUnit.unitspermeter * this.lengthUnitDisplay.unitspermeter;  //convert to meters then to the display unit
					suffix = this.lengthUnitDisplay.code;
				}

				let txtHeight = Utils.addCommas(height.toFixed(2));
				let msg = `${txtHeight} ${suffix}`;

				let baseHeight = Utils.addCommas(baseDistance);
				let baseMsg = `${baseHeight} ${suffix}`;

				this.heightLabel.setText(msg);
				this.baseLabel.setText(baseMsg);
			}
		}

		// { // update circle stuff
		// 	const circleRadiusLabel = this.circleRadiusLabel;
		// 	const circleRadiusLine = this.circleRadiusLine;
		// 	const circleLine = this.circleLine;
		// 	const circleCenter = this.circleCenter;

		// 	const circleOkay = this.points.length === 3;

		// 	circleRadiusLabel.visible = this.showCircle && circleOkay;
		// 	circleRadiusLine.visible = this.showCircle && circleOkay;
		// 	circleLine.visible = this.showCircle && circleOkay;
		// 	circleCenter.visible = this.showCircle && circleOkay;

		// 	if(this.showCircle && circleOkay){

		// 		const A = this.points[0].position;
		// 		const B = this.points[1].position;
		// 		const C = this.points[2].position;
		// 		const AB = B.clone().sub(A);
		// 		const AC = C.clone().sub(A);
		// 		const N = AC.clone().cross(AB).normalize();

		// 		const center = Potree.Utils.computeCircleCenter(A, B, C);
		// 		const radius = center.distanceTo(A);


		// 		const scale = radius / 20;
		// 		circleCenter.position.copy(center);
		// 		circleCenter.scale.set(scale, scale, scale);

		// 		//circleRadiusLine.geometry.vertices[0].set(0, 0, 0);
		// 		//circleRadiusLine.geometry.vertices[1].copy(B.clone().sub(center));

		// 		circleRadiusLine.geometry.setPositions( [
		// 			0, 0, 0,
		// 			...B.clone().sub(center).toArray()
		// 		] );

		// 		circleRadiusLine.geometry.verticesNeedUpdate = true;
		// 		circleRadiusLine.geometry.computeBoundingSphere();
		// 		circleRadiusLine.position.copy(center);
		// 		circleRadiusLine.computeLineDistances();

		// 		const target = center.clone().add(N);
		// 		circleLine.position.copy(center);
		// 		circleLine.scale.set(radius, radius, radius);
		// 		circleLine.lookAt(target);
				
		// 		circleRadiusLabel.visible = true;
		// 		circleRadiusLabel.position.copy(center.clone().add(B).multiplyScalar(0.5));
		// 		circleRadiusLabel.setText(`${radius.toFixed(3)}`);

		// 	}
		// }

		{ // update area label
			this.areaLabel.position.copy(centroid);
			this.areaLabel.visible = this._showAreaLabel && this.points.length >= 3;
			let area = this.getArea();

			let suffix = "";
			if(this.lengthUnit != null && this.lengthUnitDisplay != null){
				area = area / Math.pow(this.lengthUnit.unitspermeter, 2) * Math.pow(this.lengthUnitDisplay.unitspermeter, 2);  //convert to square meters then to the square display unit
				suffix = this.lengthUnitDisplay.code;
			}

			let txtArea = Utils.addCommas(area.toFixed(1));
			let msg =  `${txtArea} ${suffix}\u00B2`;
			this.areaLabel.setText(msg);
		}

		// this.updateAzimuth();
	};

	raycast (raycaster, intersects) {
		for (let i = 0; i < this.points.length; i++) {
			let sphere = this.spheres[i];

			sphere.raycast(raycaster, intersects);
		}

		// recalculate distances because they are not necessarely correct
		// for scaled objects.
		// see https://github.com/mrdoob/three.js/issues/5827
		// TODO: remove this once the bug has been fixed
		for (let i = 0; i < intersects.length; i++) {
			let I = intersects[i];
			I.distance = raycaster.ray.origin.distanceTo(I.point);
		}
		intersects.sort(function (a, b) { return a.distance - b.distance; });
	};

	get showCoordinates () {
		return this._showCoordinates;
	}

	set showCoordinates (value) {
		this._showCoordinates = value;
		this.update();
	}

	get showAngles () {
		return this._showAngles;
	}

	set showAngles (value) {
		this._showAngles = value;
		this.update();
	}

	get showCircle () {
		return this._showCircle;
	}

	set showCircle (value) {
		this._showCircle = value;
		this.update();
	}

	get showAzimuth(){
		return this._showAzimuth;
	}

	set showAzimuth(value){
		this._showAzimuth = value;
		this.update();
	}

	get showEdges () {
		return this._showEdges;
	}

	set showEdges (value) {
		this._showEdges = value;
		this.update();
	}

	get showHeight () {
		return this._showHeight;
	}

	set showHeight (value) {
		this._showHeight = value;
		this.update();
	}

	get showHeightLabel () {
		return this._showHeightLabel;
	}

	set showHeightLabel (value) {
		this._showHeightLabel = value;
		this.update();
	}

	get showAreaLabel () {
		return this._showAreaLabel;
	}

	set showAreaLabel (value) {
		this._showAreaLabel = value;
		this.update();
	}

	get showArea () {
		return this._showArea;
	}

	set showArea (value) {
		this._showArea = value;
		this.update();
	}

	get closed () {
		return this._closed;
	}

	set closed (value) {
		this._closed = value;
		this.update();
	}

	get showDistances () {
		return this._showDistances;
	}

	set showDistances (value) {
		this._showDistances = value;
		this.update();
	}

	get setTextures () {
		return this._textures;
	}

	set setTextures (value) {
		this._textures = value;
		this.update();
	}

	get isplusNodesAdded() {
		return this._isplusNodesAdded
	}
	set isplusNodesAdded(value) {
		this._isplusNodesAdded = value;
	}

	get edgeColor() {
		return this.contentColor;
	}

	set edgeColor(color) {
		this.contentColor = new THREE.Color(color);
		this.update();
	}

}
