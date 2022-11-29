
import * as THREE from "../../libs/three.js/build/three.module.js";
import {Utils} from "../utils.js";
import {Points} from "../Points.js";
import {DXFProfileExporter} from "../exporter/DXFProfileExporter.js";
import {CSVExporter} from "../exporter/CSVExporter.js";
import {LASExporter} from "../exporter/LASExporter.js";
import { EventDispatcher } from "../EventDispatcher.js";
import {PointCloudTree} from "../PointCloudTree.js";
import {Renderer} from "../PotreeRenderer.js";
import {PointCloudMaterial} from "../materials/PointCloudMaterial.js";
import {PointSizeType} from "../defines.js";


function copyMaterial(source, target){

	for(let name of Object.keys(target.uniforms)){
		target.uniforms[name].value = source.uniforms[name].value;
	}

	target.gradientTexture = source.gradientTexture;
	target.visibleNodesTexture = source.visibleNodesTexture;
	target.classificationTexture = source.classificationTexture;
	target.matcapTexture = source.matcapTexture;

	target.activeAttributeName = source.activeAttributeName;
	target.ranges = source.ranges;

	//target.updateShaderSource();
}


class Batch{

	constructor(geometry, material){
		this.geometry = geometry;
		this.material = material;

		this.sceneNode = new THREE.Points(geometry, material);

		this.geometryNode = {
			estimatedSpacing: 1.0,
			geometry: geometry,
		};
	}

	getLevel(){
		return 0;
	}

}

class ProfileFakeOctree extends PointCloudTree{

	constructor(octree){
		super();

		this.trueOctree = octree;
		this.pcoGeometry = octree.pcoGeometry;
		this.points = [];
		this.visibleNodes = [];
		
		//this.material = this.trueOctree.material;
		this.material = new PointCloudMaterial();
		//this.material.copy(this.trueOctree.material);
		copyMaterial(this.trueOctree.material, this.material);
		this.material.pointSizeType = PointSizeType.FIXED;

		this.batchSize = 100 * 1000;
		this.currentBatch = null
	}

	getAttribute(name){
		return this.trueOctree.getAttribute(name);
	}

	dispose(){
		for(let node of this.visibleNodes){
			node.geometry.dispose();
		}

		this.visibleNodes = [];
		this.currentBatch = null;
		this.points = [];
	}

	addPoints(data){
		// since each call to addPoints can deliver very very few points,
		// we're going to batch them into larger buffers for efficiency.

		if(this.currentBatch === null){
			this.currentBatch = this.createNewBatch(data);
		}

		this.points.push(data);


		let updateRange = {
			start: this.currentBatch.geometry.drawRange.count,
			count: 0
		};
		let projectedBox = new THREE.Box3();

		let truePos = new THREE.Vector3();

		for(let i = 0; i < data.numPoints; i++){

			if(updateRange.start + updateRange.count >= this.batchSize){
				// current batch full, start new batch

				for(let key of Object.keys(this.currentBatch.geometry.attributes)){
					let attribute = this.currentBatch.geometry.attributes[key];
					attribute.updateRange.offset = updateRange.start;
					attribute.updateRange.count = updateRange.count;
					attribute.needsUpdate = true;
				}

				this.currentBatch.geometry.computeBoundingBox();
				this.currentBatch.geometry.computeBoundingSphere();

				this.currentBatch = this.createNewBatch(data);
				updateRange = {
					start: 0,
					count: 0
				};
			}

			truePos.set(
				data.data.position[3 * i + 0] + this.trueOctree.position.x,
				data.data.position[3 * i + 1] + this.trueOctree.position.y,
				data.data.position[3 * i + 2] + this.trueOctree.position.z,
			);

			let x = data.data.mileage[i];
			let y = 0;
			let z = truePos.z;

			projectedBox.expandByPoint(new THREE.Vector3(x, y, z));

			let index = updateRange.start + updateRange.count;
			let geometry = this.currentBatch.geometry;

			for(let attributeName of Object.keys(data.data)){
				let source = data.data[attributeName];
				let target = geometry.attributes[attributeName];
				let numElements = target.itemSize;
				
				for(let item = 0; item < numElements; item++){
					target.array[numElements * index + item] = source[numElements * i + item];
				}
			}

			{
				let position = geometry.attributes.position;

				position.array[3 * index + 0] = x;
				position.array[3 * index + 1] = y;
				position.array[3 * index + 2] = z;
			}

			updateRange.count++;
			this.currentBatch.geometry.drawRange.count++;
		}

		for(let key of Object.keys(this.currentBatch.geometry.attributes)){
			let attribute = this.currentBatch.geometry.attributes[key];
			attribute.updateRange.offset = updateRange.start;
			attribute.updateRange.count = updateRange.count;
			attribute.needsUpdate = true;
		}

		data.projectedBox = projectedBox;

		this.projectedBox = this.points.reduce( (a, i) => a.union(i.projectedBox), new THREE.Box3());
	}

	createNewBatch(data){
		let geometry = new THREE.BufferGeometry();

		// create new batches with batch_size elements of the same type as the attribute
		for(let attributeName of Object.keys(data.data)){
			let buffer = data.data[attributeName];
			let numElements = buffer.length / data.numPoints; // 3 for pos, 4 for col, 1 for scalars
			let constructor = buffer.constructor;
			let normalized = false;
			
			if(this.trueOctree.root.sceneNode){
				if(this.trueOctree.root.sceneNode.geometry.attributes[attributeName]){
					normalized = this.trueOctree.root.sceneNode.geometry.attributes[attributeName].normalized;
				}
			}
			

			let batchBuffer = new constructor(numElements * this.batchSize);

			let bufferAttribute = new THREE.BufferAttribute(batchBuffer, numElements, normalized);
			bufferAttribute.potree = {
				range: [0, 1],
			};

			geometry.setAttribute(attributeName, bufferAttribute);
		}

		geometry.drawRange.start = 0;
		geometry.drawRange.count = 0;

		let batch = new Batch(geometry, this.material);

		this.visibleNodes.push(batch);

		return batch;
	}
	
	computeVisibilityTextureData(){
		let data = new Uint8Array(this.visibleNodes.length * 4);
		let offsets = new Map();

		for(let i = 0; i < this.visibleNodes.length; i++){
			let node = this.visibleNodes[i];

			offsets[node] = i;
		}


		return {
			data: data,
			offsets: offsets,
		};
	}

}

export class ProfileWindow extends EventDispatcher {
	constructor (viewer) {
		super();

		this.viewer = viewer;
		this.elRoot = $('#profile_window');
		this.renderArea = this.elRoot.find('#profileCanvasContainer');
		this.svg = d3.select('svg#profileSVG');
		this.mouseIsDown = false;

		this.projectedBox = new THREE.Box3();
		this.pointclouds = new Map();
		this.numPoints = 0;
		this.lastAddPointsTimestamp = undefined;

		this.mouse = new THREE.Vector2(0, 0);
		this.scale = new THREE.Vector3(1, 1, 1);

		this.autoFitEnabled = true; // completely disable/enable
		this.autoFit = false; // internal

		let cwIcon = `${exports.resourcePath}/icons/arrow_cw.svg`;
		$('#potree_profile_rotate_cw').attr('src', cwIcon);

		let ccwIcon = `${exports.resourcePath}/icons/arrow_ccw.svg`;
		$('#potree_profile_rotate_ccw').attr('src', ccwIcon);
		
		let forwardIcon = `${exports.resourcePath}/icons/arrow_up.svg`;
		$('#potree_profile_move_forward').attr('src', forwardIcon);

		let backwardIcon = `${exports.resourcePath}/icons/arrow_down.svg`;
		$('#potree_profile_move_backward').attr('src', backwardIcon);

		let dxf2DIcon = `${exports.resourcePath}/icons/file_dxf_2d.svg`;
		$('#potree_download_dxf2D_icon').attr('src', dxf2DIcon);

		let dxf3DIcon = `${exports.resourcePath}/icons/file_dxf_3d.svg`;
		$('#potree_download_dxf3D_icon').attr('src', dxf3DIcon);

		let csvIcon = `${exports.resourcePath}/icons/file_csv_2d.svg`;
		$('#potree_download_csv_icon').attr('src', csvIcon);

		let lasIcon = `${exports.resourcePath}/icons/file_las_3d.svg`;
		$('#potree_download_las_icon').attr('src', lasIcon);

		let closeIcon = `${exports.resourcePath}/icons/close.svg`;
		$('#closeProfileContainer').attr("src", closeIcon);

		this.initTHREE();
		this.initSVG();
		this.initListeners();

		this.pRenderer = new Renderer(this.renderer);

		this.elRoot.i18n();
	}

	initListeners () {
		$(window).resize(() => {
			if (this.enabled) {
			this.render();
			}
		});

		this.renderArea.mousedown(e => {
			this.mouseIsDown = true;
		});

		this.renderArea.mouseup(e => {
			this.mouseIsDown = false;
		});

		let viewerPickSphereSizeHandler = () => {
			let camera = this.viewer.scene.getActiveCamera();
			let domElement = this.viewer.renderer.domElement;
			let distance = this.viewerPickSphere.position.distanceTo(camera.position);
			let pr = Utils.projectedRadius(1, camera, distance, domElement.clientWidth, domElement.clientHeight);
			let scale = (10 / pr);
			this.viewerPickSphere.scale.set(scale, scale, scale);
		};

		this.renderArea.mousemove(e => {
			if (this.pointclouds.size === 0) {
				return;
			}

			let rect = this.renderArea[0].getBoundingClientRect();
			let x = e.clientX - rect.left;
			let y = e.clientY - rect.top;

			let newMouse = new THREE.Vector2(x, y);

			if (this.mouseIsDown) {
				// DRAG
				this.autoFit = false;
				this.lastDrag = new Date().getTime();

				let cPos = [this.scaleX.invert(this.mouse.x), this.scaleY.invert(this.mouse.y)];
				let ncPos = [this.scaleX.invert(newMouse.x), this.scaleY.invert(newMouse.y)];

				this.camera.position.x -= ncPos[0] - cPos[0];
				this.camera.position.z -= ncPos[1] - cPos[1];

				this.render();
			} else if (this.pointclouds.size > 0) {
				// FIND HOVERED POINT
				let radius = Math.abs(this.scaleX.invert(0) - this.scaleX.invert(40));
				let mileage = this.scaleX.invert(newMouse.x);
				let elevation = this.scaleY.invert(newMouse.y);

				let closest = this.selectPoint(mileage, elevation, radius);

				if (closest) {
					let point = closest.point;

					let position = new Float64Array([
						point.position[0] + closest.pointcloud.position.x,
						point.position[1] + closest.pointcloud.position.y,
						point.position[2] + closest.pointcloud.position.z
					]);

					this.elRoot.find('#profileSelectionProperties').fadeIn(200);
					this.pickSphere.visible = true;
					this.pickSphere.scale.set(0.5 * radius, 0.5 * radius, 0.5 * radius);
					this.pickSphere.position.set(point.mileage, 0, position[2]);

					this.viewerPickSphere.position.set(...position);
					
					if(!this.viewer.scene.scene.children.includes(this.viewerPickSphere)){
						this.viewer.scene.scene.add(this.viewerPickSphere);
						if(!this.viewer.hasEventListener("update", viewerPickSphereSizeHandler)){
							this.viewer.addEventListener("update", viewerPickSphereSizeHandler);
						}
					}
					

					let info = this.elRoot.find('#profileSelectionProperties');
					let html = '<table>';

					for (let attributeName of Object.keys(point)) {

						let value = point[attributeName];
						let attribute = closest.pointcloud.getAttribute(attributeName);

						let transform = value => value;
						if(attribute && attribute.type.size > 4){
							let range = attribute.initialRange;
							let scale = 1 / (range[1] - range[0]);
							let offset = range[0];
							transform = value => value / scale + offset;
						}

						

						

						if (attributeName === 'position') {
							let values = [...position].map(v => Utils.addCommas(v.toFixed(3)));
							html += `
								<tr>
									<td>x</td>
									<td>${values[0]}</td>
								</tr>
								<tr>
									<td>y</td>
									<td>${values[1]}</td>
								</tr>
								<tr>
									<td>z</td>
									<td>${values[2]}</td>
								</tr>`;
						} else if (attributeName === 'rgba') {
							html += `
								<tr>
									<td>${attributeName}</td>
									<td>${value.join(', ')}</td>
								</tr>`;
						} else if (attributeName === 'normal') {
							continue;
						} else if (attributeName === 'mileage') {
							html += `
								<tr>
									<td>${attributeName}</td>
									<td>${value.toFixed(3)}</td>
								</tr>`;
						} else {
							html += `
								<tr>
									<td>${attributeName}</td>
									<td>${transform(value)}</td>
								</tr>`;
						}
					}
					html += '</table>';
					info.html(html);

					this.selectedPoint = point;
				} else {
					// this.pickSphere.visible = false;
					// this.selectedPoint = null;

					this.viewer.scene.scene.add(this.viewerPickSphere);

					let index = this.viewer.scene.scene.children.indexOf(this.viewerPickSphere);
					if(index >= 0){
						this.viewer.scene.scene.children.splice(index, 1);
					}
					this.viewer.removeEventListener("update", viewerPickSphereSizeHandler);
					

				}
				this.render();
			}

			this.mouse.copy(newMouse);
		});

		let onWheel = e => {
			this.autoFit = false;

			let delta = 0;
			if (e.wheelDelta !== undefined) { // WebKit / Opera / Explorer 9
				delta = e.wheelDelta;
			} else if (e.detail !== undefined) { // Firefox
				delta = -e.detail;
			}

			let ndelta = Math.sign(delta);

			let cPos = [this.scaleX.invert(this.mouse.x), this.scaleY.invert(this.mouse.y)];

			if (ndelta > 0) {
				// + 10%
				this.scale.multiplyScalar(1.1);
			} else {
				// - 10%
				this.scale.multiplyScalar(100 / 110);
			}

			this.updateScales();
			let ncPos = [this.scaleX.invert(this.mouse.x), this.scaleY.invert(this.mouse.y)];

			this.camera.position.x -= ncPos[0] - cPos[0];
			this.camera.position.z -= ncPos[1] - cPos[1];

			this.render();
			this.updateScales();
		};
		$(this.renderArea)[0].addEventListener('mousewheel', onWheel, false);
		$(this.renderArea)[0].addEventListener('DOMMouseScroll', onWheel, false); // Firefox

		$('#closeProfileContainer').click(() => {
			this.hide();
		});

		let getProfilePoints = (truePosition) => {
			let points = new Points();
			
			for(let [pointcloud, entry] of this.pointclouds){
				for(let pointSet of entry.points){

					let originPos = pointSet.data.position;
					let truePointPosition = new Float64Array(originPos);
					for(let i = 0; i < pointSet.numPoints; i++){

						if (truePosition === true) {
							truePointPosition[3 * i + 0] += pointcloud.position.x;
							truePointPosition[3 * i + 1] += pointcloud.position.y;
						}

						truePointPosition[3 * i + 2] += pointcloud.position.z;
					}

					pointSet.data.position = truePointPosition;
					points.add(pointSet);
					pointSet.data.position = originPos;
				}
			}

			return points;
		};

		$('#potree_download_dxf2D_icon').click(() => {
			
			const points = getProfilePoints();

			const string = DXFProfileExporter.toString(points, true);

			const blob = new Blob([string], {type: "text/string"});
			$('#potree_download_profile_dxf2D_link').attr('href', URL.createObjectURL(blob));
		});

		$('#potree_download_dxf3D_icon').click(() => {
			
			const points = getProfilePoints(true);

			const string = DXFProfileExporter.toString(points);

			const blob = new Blob([string], {type: "text/string"});
			$('#potree_download_profile_dxf3D_link').attr('href', URL.createObjectURL(blob));
		});

		$('#potree_download_csv_icon').click(() => {
			
			let points = getProfilePoints(true);

			let string = CSVExporter.toString(points);

			let blob = new Blob([string], {type: "text/string"});
			$('#potree_download_profile_ortho_link').attr('href', URL.createObjectURL(blob));
		});

		$('#potree_download_las_icon').click(() => {

			let points = getProfilePoints(true);

			let buffer = LASExporter.toLAS(points);

			let blob = new Blob([buffer], {type: "application/octet-binary"});
			$('#potree_download_profile_link').attr('href', URL.createObjectURL(blob));
		});
	}

	selectPoint (mileage, elevation, radius) {
		let closest = {
			distance: Infinity,
			pointcloud: null,
			points: null,
			index: null
		};

		let pointBox = new THREE.Box2(
			new THREE.Vector2(mileage - radius, elevation - radius),
			new THREE.Vector2(mileage + radius, elevation + radius));

		let numTested = 0;
		let numSkipped = 0;
		let numTestedPoints = 0;
		let numSkippedPoints = 0;

		for (let [pointcloud, entry] of this.pointclouds) {
			for(let points of entry.points){

				let collisionBox = new THREE.Box2(
					new THREE.Vector2(points.projectedBox.min.x, points.projectedBox.min.z),
					new THREE.Vector2(points.projectedBox.max.x, points.projectedBox.max.z)
				);

				let intersects = collisionBox.intersectsBox(pointBox);

				if(!intersects){
					numSkipped++;
					numSkippedPoints += points.numPoints;
					continue;
				}

				numTested++;
				numTestedPoints += points.numPoints

				for (let i = 0; i < points.numPoints; i++) {

					let m = points.data.mileage[i] - mileage;
					let e = points.data.position[3 * i + 2] - elevation + pointcloud.position.z;
					let r = Math.sqrt(m * m + e * e);

					const withinDistance = r < radius && r < closest.distance;
					let unfilteredClass = true;

					if(points.data.classification){
						const classification = pointcloud.material.classification;

						const pointClassID = points.data.classification[i];
						const pointClassValue = classification[pointClassID];

						if(pointClassValue && (!pointClassValue.visible || pointClassValue.color.w === 0)){
							unfilteredClass = false;
						}
					}

					if (withinDistance && unfilteredClass) {
						closest = {
							distance: r,
							pointcloud: pointcloud,
							points: points,
							index: i
						};
					}
				}
			}
		}


		//console.log(`nodes: ${numTested}, ${numSkipped} || points: ${numTestedPoints}, ${numSkippedPoints}`);

		if (closest.distance < Infinity) {
			let points = closest.points;

			let point = {};

			let attributes = Object.keys(points.data);
			for (let attribute of attributes) {
				let attributeData = points.data[attribute];
				let itemSize = attributeData.length / points.numPoints;
				let value = attributeData.subarray(itemSize * closest.index, itemSize * closest.index + itemSize);

				if (value.length === 1) {
					point[attribute] = value[0];
				} else {
					point[attribute] = value;
				}
			}

			closest.point = point;

			return closest;
		} else {
			return null;
		}
	}

	initTHREE () {
		this.renderer = new THREE.WebGLRenderer({alpha: true, premultipliedAlpha: false});
		this.renderer.setClearColor(0x000000, 0);
		this.renderer.setSize(10, 10);
		this.renderer.autoClear = false;
		this.renderArea.append($(this.renderer.domElement));
		this.renderer.domElement.tabIndex = '2222';
		$(this.renderer.domElement).css('width', '100%');
		$(this.renderer.domElement).css('height', '100%');


		{
			let gl = this.renderer.getContext();

			if(gl.createVertexArray == null){
				let extVAO = gl.getExtension('OES_vertex_array_object');

				if(!extVAO){
					throw new Error("OES_vertex_array_object extension not supported");
				}

				gl.createVertexArray = extVAO.createVertexArrayOES.bind(extVAO);
				gl.bindVertexArray = extVAO.bindVertexArrayOES.bind(extVAO);
			}
			
		}

		this.camera = new THREE.OrthographicCamera(-1000, 1000, 1000, -1000, -1000, 1000);
		this.camera.up.set(0, 0, 1);
		this.camera.rotation.order = "ZXY";
		this.camera.rotation.x = Math.PI / 2.0;
	

		this.scene = new THREE.Scene();
		this.profileScene = new THREE.Scene();

		let sg = new THREE.SphereGeometry(1, 16, 16);
		let sm = new THREE.MeshNormalMaterial();
		this.pickSphere = new THREE.Mesh(sg, sm);
		this.scene.add(this.pickSphere);

		this.viewerPickSphere = new THREE.Mesh(sg, sm);
	}

	initSVG () {
		let width = this.renderArea[0].clientWidth;
		let height = this.renderArea[0].clientHeight;
		let marginLeft = this.renderArea[0].offsetLeft;

		this.svg.selectAll('*').remove();

		this.scaleX = d3.scale.linear()
			.domain([this.camera.left + this.camera.position.x, this.camera.right + this.camera.position.x])
			.range([0, width]);
		this.scaleY = d3.scale.linear()
			.domain([this.camera.bottom + this.camera.position.z, this.camera.top + this.camera.position.z])
			.range([height, 0]);

		this.xAxis = d3.svg.axis()
			.scale(this.scaleX)
			.orient('bottom')
			.innerTickSize(-height)
			.outerTickSize(1)
			.tickPadding(10)
			.ticks(width / 50);

		this.yAxis = d3.svg.axis()
			.scale(this.scaleY)
			.orient('left')
			.innerTickSize(-width)
			.outerTickSize(1)
			.tickPadding(10)
			.ticks(height / 20);

		this.elXAxis = this.svg.append('g')
			.attr('class', 'x axis')
			.attr('transform', `translate(${marginLeft}, ${height})`)
			.call(this.xAxis);

		this.elYAxis = this.svg.append('g')
			.attr('class', 'y axis')
			.attr('transform', `translate(${marginLeft}, 0)`)
			.call(this.yAxis);
	}

	addPoints (pointcloud, points) {

		if(points.numPoints === 0){
			return;
		}

		let entry = this.pointclouds.get(pointcloud);
		if(!entry){
			entry = new ProfileFakeOctree(pointcloud);
			this.pointclouds.set(pointcloud, entry);
			this.profileScene.add(entry);

			let materialChanged = () => {
				this.render();
			};

			materialChanged();

			pointcloud.material.addEventListener('material_property_changed', materialChanged);
			this.addEventListener("on_reset_once", () => {
				pointcloud.material.removeEventListener('material_property_changed', materialChanged);
			});
		}

		entry.addPoints(points);
		this.projectedBox.union(entry.projectedBox);

		if (this.autoFit && this.autoFitEnabled) { 
			let width = this.renderArea[0].clientWidth;
			let height = this.renderArea[0].clientHeight;

			let size = this.projectedBox.getSize(new THREE.Vector3());

			let sx = width / size.x;
			let sy = height / size.z;
			let scale = Math.min(sx, sy);

			let center = this.projectedBox.getCenter(new THREE.Vector3());
			this.scale.set(scale, scale, 1);
			this.camera.position.copy(center);

			//console.log("camera: ", this.camera.position.toArray().join(", "));
		}

		//console.log(entry);

		this.render();

		let numPoints = 0;
		for (let [key, value] of this.pointclouds.entries()) {
			numPoints += value.points.reduce( (a, i) => a + i.numPoints, 0);
		}
		$(`#profile_num_points`).html(Utils.addCommas(numPoints));

	}

	reset () {
		this.lastReset = new Date().getTime();

		this.dispatchEvent({type: "on_reset_once"});
		this.removeEventListeners("on_reset_once");

		this.autoFit = true;
		this.projectedBox = new THREE.Box3();

		for(let [key, entry] of this.pointclouds){
			entry.dispose();
		}

		this.pointclouds.clear();
		this.mouseIsDown = false;
		this.mouse.set(0, 0);

		if(this.autoFitEnabled){
			this.scale.set(1, 1, 1);
		}
		this.pickSphere.visible = false;

		this.elRoot.find('#profileSelectionProperties').hide();

		this.render();
	}

	show () {
		this.elRoot.fadeIn();
		this.enabled = true;
	}

	hide () {
		this.elRoot.fadeOut();
		this.enabled = false;
	}

	updateScales () {

		let width = this.renderArea[0].clientWidth;
		let height = this.renderArea[0].clientHeight;

		let left = (-width / 2) / this.scale.x;
		let right = (+width / 2) / this.scale.x;
		let top = (+height / 2) / this.scale.y;
		let bottom = (-height / 2) / this.scale.y;

		this.camera.left = left;
		this.camera.right = right;
		this.camera.top = top;
		this.camera.bottom = bottom;
		this.camera.updateProjectionMatrix();

		this.scaleX.domain([this.camera.left + this.camera.position.x, this.camera.right + this.camera.position.x])
			.range([0, width]);
		this.scaleY.domain([this.camera.bottom + this.camera.position.z, this.camera.top + this.camera.position.z])
			.range([height, 0]);

		let marginLeft = this.renderArea[0].offsetLeft;

		this.xAxis.scale(this.scaleX)
			.orient('bottom')
			.innerTickSize(-height)
			.outerTickSize(1)
			.tickPadding(10)
			.ticks(width / 50);
		this.yAxis.scale(this.scaleY)
			.orient('left')
			.innerTickSize(-width)
			.outerTickSize(1)
			.tickPadding(10)
			.ticks(height / 20);


		this.elXAxis
			.attr('transform', `translate(${marginLeft}, ${height})`)
			.call(this.xAxis);
		this.elYAxis
			.attr('transform', `translate(${marginLeft}, 0)`)
			.call(this.yAxis);
	}

	requestScaleUpdate(){

		let threshold = 100;
		let allowUpdate = ((this.lastReset === undefined) || (this.lastScaleUpdate === undefined)) 
			|| ((new Date().getTime() - this.lastReset) > threshold && (new Date().getTime() - this.lastScaleUpdate) > threshold);

		if(allowUpdate){

			this.updateScales();

			this.lastScaleUpdate = new Date().getTime();

			

			this.scaleUpdatePending = false;
		}else if(!this.scaleUpdatePending) {
			setTimeout(this.requestScaleUpdate.bind(this), 100);
			this.scaleUpdatePending = true;
		}
		
	}

	render () {
		let width = this.renderArea[0].clientWidth;
		let height = this.renderArea[0].clientHeight;

		let {renderer, pRenderer, camera, profileScene, scene} = this;
		let {scaleX, pickSphere} = this;

		renderer.setSize(width, height);

		renderer.setClearColor(0x000000, 0);
		renderer.clear(true, true, false);

		for(let pointcloud of this.pointclouds.keys()){
			let source = pointcloud.material;
			let target = this.pointclouds.get(pointcloud).material;
			
			copyMaterial(source, target);
			target.size = 2;
		}
		
		pRenderer.render(profileScene, camera, null);

		let radius = Math.abs(scaleX.invert(0) - scaleX.invert(5));

		if (radius === 0) {
			pickSphere.visible = false;
		} else {
			pickSphere.scale.set(radius, radius, radius);
			pickSphere.visible = true;
		}
		
		renderer.render(scene, camera);

		this.requestScaleUpdate();
	}
};

export class ProfileWindowController {
	constructor (viewer) {
		this.viewer = viewer;
		this.profileWindow = viewer.profileWindow;
		this.profile = null;
		this.numPoints = 0;
		this.threshold = 60 * 1000;
		this.rotateAmount = 10;

		this.scheduledRecomputeTime = null;

		this.enabled = true;

		this.requests = [];

		this._recompute = () => { this.recompute(); };

		this.viewer.addEventListener("scene_changed", e => {
			e.oldScene.removeEventListener("pointcloud_added", this._recompute);
			e.scene.addEventListener("pointcloud_added", this._recompute);
		});
		this.viewer.scene.addEventListener("pointcloud_added", this._recompute);

		$("#potree_profile_rotate_amount").val(parseInt(this.rotateAmount));
		$("#potree_profile_rotate_amount").on("input", (e) => {
			const str = $("#potree_profile_rotate_amount").val();

			if(!isNaN(str)){
				const value = parseFloat(str);
				this.rotateAmount = value;
				$("#potree_profile_rotate_amount").css("background-color", "")
			}else{
				$("#potree_profile_rotate_amount").css("background-color", "#ff9999")
			}

		});

		const rotate = (radians) => {
			const profile = this.profile;
			const points = profile.points;
			const start = points[0];
			const end = points[points.length - 1];
			const center = start.clone().add(end).multiplyScalar(0.5);

			const mMoveOrigin = new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z);
			const mRotate = new THREE.Matrix4().makeRotationZ(radians);
			const mMoveBack = new THREE.Matrix4().makeTranslation(center.x, center.y, center.z);
			//const transform = mMoveOrigin.multiply(mRotate).multiply(mMoveBack);
			const transform = mMoveBack.multiply(mRotate).multiply(mMoveOrigin);

			const rotatedPoints = points.map( point => point.clone().applyMatrix4(transform) );

			this.profileWindow.autoFitEnabled = false;

			for(let i = 0; i < points.length; i++){
				profile.setPosition(i, rotatedPoints[i]);
			}
		}

		$("#potree_profile_rotate_cw").click( () => {
			const radians = THREE.Math.degToRad(this.rotateAmount);
			rotate(-radians);
		});

		$("#potree_profile_rotate_ccw").click( () => {
			const radians = THREE.Math.degToRad(this.rotateAmount);
			rotate(radians);
		});

		$("#potree_profile_move_forward").click( () => {
			const profile = this.profile;
			const points = profile.points;
			const start = points[0];
			const end = points[points.length - 1];

			const dir = end.clone().sub(start).normalize();
			const up = new THREE.Vector3(0, 0, 1);
			const forward = up.cross(dir);
			const move = forward.clone().multiplyScalar(profile.width / 2);

			this.profileWindow.autoFitEnabled = false;

			for(let i = 0; i < points.length; i++){
				profile.setPosition(i, points[i].clone().add(move));
			}
		});

		$("#potree_profile_move_backward").click( () => {
			const profile = this.profile;
			const points = profile.points;
			const start = points[0];
			const end = points[points.length - 1];

			const dir = end.clone().sub(start).normalize();
			const up = new THREE.Vector3(0, 0, 1);
			const forward = up.cross(dir);
			const move = forward.clone().multiplyScalar(-profile.width / 2);

			this.profileWindow.autoFitEnabled = false;

			for(let i = 0; i < points.length; i++){
				profile.setPosition(i, points[i].clone().add(move));
			}
		});
	}

	setProfile (profile) {
		if (this.profile !== null && this.profile !== profile) {
			this.profile.removeEventListener('marker_moved', this._recompute);
			this.profile.removeEventListener('marker_added', this._recompute);
			this.profile.removeEventListener('marker_removed', this._recompute);
			this.profile.removeEventListener('width_changed', this._recompute);
		}

		this.profile = profile;

		{
			this.profile.addEventListener('marker_moved', this._recompute);
			this.profile.addEventListener('marker_added', this._recompute);
			this.profile.addEventListener('marker_removed', this._recompute);
			this.profile.addEventListener('width_changed', this._recompute);
		}

		this.recompute();
	}

	reset () {
		this.profileWindow.reset();

		this.numPoints = 0;

		if (this.profile) {
			for (let request of this.requests) {
				request.cancel();
			}
		}
	}

	progressHandler (pointcloud, progress) {
		for (let segment of progress.segments) {
			this.profileWindow.addPoints(pointcloud, segment.points);
			this.numPoints += segment.points.numPoints;
		}
	}

	cancel () {
		for (let request of this.requests) {
			request.cancel();
			// request.finishLevelThenCancel();
		}

		this.requests = [];
	};

	finishLevelThenCancel(){
		for (let request of this.requests) {
			request.finishLevelThenCancel();
		}

		this.requests = [];
	}

	recompute () {
		if (!this.profile) {
			return;
		}

		if (this.scheduledRecomputeTime !== null && this.scheduledRecomputeTime > new Date().getTime()) {
			return;
		} else {
			this.scheduledRecomputeTime = new Date().getTime() + 100;
		}
		this.scheduledRecomputeTime = null;

		this.reset();

		for (let pointcloud of this.viewer.scene.pointclouds.filter(p => p.visible)) {
			let request = pointcloud.getPointsInProfile(this.profile, null, {
				'onProgress': (event) => {
					if (!this.enabled) {
						return;
					}

					this.progressHandler(pointcloud, event.points);

					if (this.numPoints > this.threshold) {
						this.finishLevelThenCancel();
					}
				},
				'onFinish': (event) => {
					if (!this.enabled) {

					}
				},
				'onCancel': () => {
					if (!this.enabled) {

					}
				}
			});

			this.requests.push(request);
		}
	}
};
