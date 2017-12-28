const $ = require('./jquery');
const THREE = require('three');
const d3Selection = require('d3-selection');
const d3Scale = require('d3-scale');
const d3Axis = require('d3-axis');

const context = require('./context');
const addCommas = require('./utils/addCommas');
const Points = require('./Points');
const CSVExporter = require('./exporter/CSVExporter');
const LASExporter = require('./exporter/LASExporter');
const ProfilePointCloudEntry = require('./ProfilePointCloudEntry');
const CameraMode = require('./viewer/CameraMode');
const projectedRadius = require('./utils/projectedRadius');
const projectedRadiusOrtho = require('./utils/projectedRadiusOrtho');

class ProfileWindow extends THREE.EventDispatcher {
	constructor (viewer) {
		super();

		this.viewer = viewer;
		this.elRoot = $('#profile_window');
		this.renderArea = this.elRoot.find('#profileCanvasContainer');
		this.svg = d3Selection.select('svg#profileSVG');
		this.mouseIsDown = false;

		this.projectedBox = new THREE.Box3();
		this.pointclouds = new Map();
		this.numPoints = 0;
		this.lastAddPointsTimestamp = undefined;

		this.mouse = new THREE.Vector2(0, 0);
		this.scale = new THREE.Vector3(1, 1, 1);

		let csvIcon = `${context.resourcePath}/icons/file_csv_2d.svg`;
		$('#potree_download_csv_icon').attr('src', csvIcon);

		let lasIcon = `${context.resourcePath}/icons/file_las_3d.svg`;
		$('#potree_download_las_icon').attr('src', lasIcon);

		this.initTHREE();
		this.initSVG();
		this.initListeners();
	}

	initListeners () {
		$(window).resize(() => {
			this.render();
		});

		this.renderArea.mousedown(e => {
			this.mouseIsDown = true;
		});

		this.renderArea.mouseup(e => {
			this.mouseIsDown = false;
		});

		let viewerPickSphereSizeHandler = () => {
			let pr = 0;
			let camera = this.viewer.scene.getActiveCamera();
			let domElement = this.viewer.renderer.domElement;
			if (this.viewer.scene.cameraMode === CameraMode.PERSPECTIVE) {
				let distance = this.viewerPickSphere.position.distanceTo(camera.position);
				pr = projectedRadius(1, camera.fov * Math.PI / 180, distance, domElement.clientHeight);
			} else {
				pr = projectedRadiusOrtho(1, camera.projectionMatrix, domElement.clientWidth, domElement.clientHeight);
			}
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

				let point = this.selectPoint(mileage, elevation, radius);

				if (point) {
					this.elRoot.find('#profileSelectionProperties').fadeIn(200);
					this.pickSphere.visible = true;
					this.pickSphere.scale.set(0.5 * radius, 0.5 * radius, 0.5 * radius);
					this.pickSphere.position.set(point.mileage, 0, point.position[2]);
					this.viewerPickSphere.position.set(...point.position);

					if (!this.viewer.scene.scene.children.includes(this.viewerPickSphere)) {
						this.viewer.scene.scene.add(this.viewerPickSphere);
						if (!this.viewer.hasEventListener('update', viewerPickSphereSizeHandler)) {
							this.viewer.addEventListener('update', viewerPickSphereSizeHandler);
						}
					}

					let info = this.elRoot.find('#profileSelectionProperties');
					let html = '<table>';
					for (let attribute of Object.keys(point)) {
						let value = point[attribute];
						if (attribute === 'position') {
							let values = [...value].map(v => addCommas(v.toFixed(3)));
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
						} else if (attribute === 'color') {
							html += `
								<tr>
									<td>${attribute}</td>
									<td>${value.join(', ')}</td>
								</tr>`;
						} else if (attribute === 'normal') {
							continue;
						} else if (attribute === 'mileage') {
							html += `
								<tr>
									<td>${attribute}</td>
									<td>${value.toFixed(3)}</td>
								</tr>`;
						} else {
							html += `
								<tr>
									<td>${attribute}</td>
									<td>${value}</td>
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
					if (index >= 0) {
						this.viewer.scene.scene.children.splice(index, 1);
					}
					this.viewer.removeEventListener('update', viewerPickSphereSizeHandler);
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

		$('#potree_download_csv_icon').click(() => {
			let points = new Points();

			for (let [pointcloud, entry] of this.pointclouds) { // eslint-disable-line no-unused-vars
				for (let pointSet of entry.points) {
					points.add(pointSet);
				}
			}

			let string = CSVExporter.toString(points);

			let uri = 'data:application/octet-stream;base64,' + btoa(string);
			$('#potree_download_profile_ortho_link').attr('href', uri);
		});

		$('#potree_download_las_icon').click(() => {
			let points = new Points();
			for (let [pointcloud, entry] of this.pointclouds) { // eslint-disable-line no-unused-vars
				for (let pointSet of entry.points) {
					points.add(pointSet);
				}
			}

			let buffer = LASExporter.toLAS(points);
			let u8view = new Uint8Array(buffer);

			let binString = '';
			for (let i = 0; i < u8view.length; i++) {
				binString += String.fromCharCode(u8view[i]);
			}

			let uri = 'data:application/octet-stream;base64,' + btoa(binString);
			$('#potree_download_profile_link').attr('href', uri);
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

		// let debugNode = this.scene.getObjectByName("select_debug_node");
		// if(!debugNode){
		// 	debugNode = new THREE.Object3D();
		// 	debugNode.name = "select_debug_node";
		// 	this.scene.add(debugNode);
		// }
		// debugNode.children = [];
		// let debugPointBox = new THREE.Box3(
		// 	new THREE.Vector3(...pointBox.min.toArray(), -1),
		// 	new THREE.Vector3(...pointBox.max.toArray(), +1)
		// );
		// debugNode.add(new Box3Helper(debugPointBox, 0xff0000));

		// TODO: unused: let numTested = 0;
		// TODO: unused: let numSkipped = 0;
		// TODO: unused: let numTestedPoints = 0;
		// TODO: unused: let numSkippedPoints = 0;

		for (let [pointcloud, entry] of this.pointclouds) {
			for (let points of entry.points) {
				let collisionBox = new THREE.Box2(
					new THREE.Vector2(points.projectedBox.min.x, points.projectedBox.min.z),
					new THREE.Vector2(points.projectedBox.max.x, points.projectedBox.max.z)
				);

				let intersects = collisionBox.intersectsBox(pointBox);

				if (!intersects) {
					// TODO: unused: numSkipped++;
					// TODO: unused: numSkippedPoints += points.numPoints;
					continue;
				}

				// let debugCollisionBox = new THREE.Box3(
				//	new THREE.Vector3(...collisionBox.min.toArray(), -1),
				//	new THREE.Vector3(...collisionBox.max.toArray(), +1)
				// );
				// debugNode.add(new Potree.Box3Helper(debugCollisionBox));

				// TODO: unused: numTested++;
				// TODO: unused: numTestedPoints += points.numPoints;

				for (let i = 0; i < points.numPoints; i++) {
					let m = points.data.mileage[i] - mileage;
					let e = points.data.position[3 * i + 2] - elevation;

					let r = Math.sqrt(m * m + e * e);

					if (r < radius && r < closest.distance) {
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

		// console.log(`nodes: ${numTested}, ${numSkipped} || points: ${numTestedPoints}, ${numSkippedPoints}`);

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

			return point;
		} else {
			return null;
		}
	}

	initTHREE () {
		this.renderer = new THREE.WebGLRenderer({alpha: true, premultipliedAlpha: false});
		this.renderer.setClearColor(0x000000, 0);
		this.renderer.setSize(10, 10);
		this.renderer.autoClear = true;
		this.renderArea.append($(this.renderer.domElement));
		this.renderer.domElement.tabIndex = '2222';
		this.renderer.context.getExtension('EXT_frag_depth');
		$(this.renderer.domElement).css('width', '100%');
		$(this.renderer.domElement).css('height', '100%');

		this.camera = new THREE.OrthographicCamera(-1000, 1000, 1000, -1000, -1000, 1000);
		this.camera.up.set(0, 0, 1);
		this.camera.rotation.order = 'ZXY';
		this.camera.rotation.x = Math.PI / 2.0;

		this.scene = new THREE.Scene();

		let sg = new THREE.SphereGeometry(1, 16, 16);
		let sm = new THREE.MeshNormalMaterial();
		this.pickSphere = new THREE.Mesh(sg, sm);
		// this.pickSphere.visible = false;
		this.scene.add(this.pickSphere);

		this.viewerPickSphere = new THREE.Mesh(sg, sm);

		this.pointCloudRoot = new THREE.Object3D();
		this.scene.add(this.pointCloudRoot);
	}

	initSVG () {
		let width = this.renderArea[0].clientWidth;
		let height = this.renderArea[0].clientHeight;
		let marginLeft = this.renderArea[0].offsetLeft;

		this.svg.selectAll('*').remove();

		this.scaleX = d3Scale.scaleLinear()
			.domain([this.camera.left + this.camera.position.x, this.camera.right + this.camera.position.x])
			.range([0, width]);
		this.scaleY = d3Scale.scaleLinear()
			.domain([this.camera.bottom + this.camera.position.z, this.camera.top + this.camera.position.z])
			.range([height, 0]);

		this.xAxis = d3Axis.axisBottom()
			.scale(this.scaleX)
			.tickSizeInner(-height)
			.tickSizeOuter(1)
			.tickPadding(10)
			.ticks(width / 50);

		this.yAxis = d3Axis.axisLeft()
			.scale(this.scaleY)
			.tickSizeInner(-width)
			.tickSizeOuter(1)
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

	setProfile (profile) {
		this.render();
	}

	addPoints (pointcloud, points) {
		let entry = this.pointclouds.get(pointcloud);
		if (!entry) {
			entry = new ProfilePointCloudEntry();
			this.pointclouds.set(pointcloud, entry);

			let materialChanged = () => this.render();
			pointcloud.material.addEventListener('material_property_changed', materialChanged);
			this.addEventListener('on_reset_once', () => {
				pointcloud.material.removeEventListener('material_property_changed', materialChanged);
			});
		}

		entry.addPoints(points);
		this.pointCloudRoot.add(entry.sceneNode);

		if (this.autoFit) {
			let width = this.renderArea[0].clientWidth;
			let height = this.renderArea[0].clientHeight;

			let size = entry.projectedBox.getSize();

			let sx = width / size.x;
			let sy = height / size.y;
			let scale = Math.min(sx, sy);

			let center = entry.projectedBox.getCenter();
			this.scale.set(scale, scale, 1);
			this.camera.position.copy(center);
		}

		// console.log(entry);
		this.render();

		let numPoints = 0;
		for (let [key, value] of this.pointclouds.entries()) { // eslint-disable-line no-unused-vars
			numPoints += value.points.reduce((a, i) => a + i.numPoints, 0);
		}
		$(`#profile_num_points`).html(addCommas(numPoints));
	}

	reset () {
		this.lastReset = new Date().getTime();

		this.dispatchEvent({type: 'on_reset_once'});
		this.removeEventListeners('on_reset_once');

		this.autoFit = true;
		this.projectedBox = new THREE.Box3();

		for (let [key, entry] of this.pointclouds) { // eslint-disable-line no-unused-vars
			entry.dispose();
		}

		this.pointclouds.clear();
		this.mouseIsDown = false;
		this.mouse.set(0, 0);
		this.scale.set(1, 1, 1);
		this.pickSphere.visible = false;

		this.pointCloudRoot.children = [];

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
			.tickSizeInner(-height)
			.tickSizeOuter(1)
			.tickPadding(10)
			.ticks(width / 50);
		this.yAxis.scale(this.scaleY)
			.tickSizeInner(-width)
			.tickSizeOuter(1)
			.tickPadding(10)
			.ticks(height / 20);

		this.elXAxis
			.attr('transform', `translate(${marginLeft}, ${height})`)
			.call(this.xAxis);
		this.elYAxis
			.attr('transform', `translate(${marginLeft}, 0)`)
			.call(this.yAxis);
	}

	requestScaleUpdate () {
		let threshold = 100;
		let allowUpdate = (this.lastReset === undefined) ||
			(this.lastScaleUpdate === undefined) ||
			(new Date().getTime() - this.lastReset) > threshold ||
			(new Date().getTime() - this.lastScaleUpdate) > threshold;

		if (allowUpdate) {
			this.lastScaleUpdate = new Date().getTime();
			this.scaleUpdatePending = false;
		} else if (!this.scaleUpdatePending) {
			setTimeout(this.requestScaleUpdate.bind(this), 100);
			this.scaleUpdatePending = true;
		}
	}

	render () {
		let width = this.renderArea[0].clientWidth;
		let height = this.renderArea[0].clientHeight;

		this.updateScales();

		{ // THREEJS
			let radius = Math.abs(this.scaleX.invert(0) - this.scaleX.invert(5));
			this.pickSphere.scale.set(radius, radius, radius);
			this.pickSphere.position.z = 0;

			for (let [pointcloud, entry] of this.pointclouds) {
				let material = entry.sceneNode.material;

				material.pointColorType = pointcloud.material.pointColorType;
				material.uniforms.uColor = pointcloud.material.uniforms.uColor;
				material.uniforms.intensityRange.value = pointcloud.material.uniforms.intensityRange.value;
				material.elevationRange = pointcloud.material.elevationRange;

				material.rgbGamma = pointcloud.material.rgbGamma;
				material.rgbContrast = pointcloud.material.rgbContrast;
				material.rgbBrightness = pointcloud.material.rgbBrightness;

				material.intensityRange = pointcloud.material.intensityRange;
				material.intensityGamma = pointcloud.material.intensityGamma;
				material.intensityContrast = pointcloud.material.intensityContrast;
				material.intensityBrightness = pointcloud.material.intensityBrightness;

				material.uniforms.wRGB.value = pointcloud.material.uniforms.wRGB.value;
				material.uniforms.wIntensity.value = pointcloud.material.uniforms.wIntensity.value;
				material.uniforms.wElevation.value = pointcloud.material.uniforms.wElevation.value;
				material.uniforms.wClassification.value = pointcloud.material.uniforms.wClassification.value;
				material.uniforms.wReturnNumber.value = pointcloud.material.uniforms.wReturnNumber.value;
				material.uniforms.wSourceID.value = pointcloud.material.uniforms.wSourceID.value;
			}

			this.pickSphere.visible = true;

			this.renderer.setSize(width, height);

			this.renderer.render(this.scene, this.camera);
		}

		this.requestScaleUpdate();
	}
};

module.exports = ProfileWindow;
