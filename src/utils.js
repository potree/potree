
import * as THREE from "../libs/three.js/build/three.module.js";
import {XHRFactory} from "./XHRFactory.js";
import {Volume} from "./utils/Volume.js";
import {Profile} from "./utils/Profile.js";
import {Measure} from "./utils/Measure.js";
import {PolygonClipVolume} from "./utils/PolygonClipVolume.js";

export class Utils {
	static async loadShapefileFeatures (file, callback) {
		let features = [];

		let handleFinish = () => {
			callback(features);
		};

		let source = await shapefile.open(file);

		while(true){
			let result = await source.read();

			if (result.done) {
				handleFinish();
				break;
			}

			if (result.value && result.value.type === 'Feature' && result.value.geometry !== undefined) {
				features.push(result.value);
			}
		}

	}

	static toString (value) {
		if (value.x != null) {
			return value.x.toFixed(2) + ', ' + value.y.toFixed(2) + ', ' + value.z.toFixed(2);
		} else {
			return '' + value + '';
		}
	}

	static normalizeURL (url) {
		let u = new URL(url);

		return u.protocol + '//' + u.hostname + u.pathname.replace(/\/+/g, '/');
	};

	static pathExists (url) {
		let req = XHRFactory.createXMLHttpRequest();
		req.open('GET', url, false);
		req.send(null);
		if (req.status !== 200) {
			return false;
		}
		return true;
	};

	static debugSphere(parent, position, scale, color){
		let geometry = new THREE.SphereGeometry(1, 8, 8);
		let material;

		if(color !== undefined){
			material = new THREE.MeshBasicMaterial({color: color});
		}else{
			material = new THREE.MeshNormalMaterial();
		}
		let sphere = new THREE.Mesh(geometry, material);
		sphere.position.copy(position);
		sphere.scale.set(scale, scale, scale);
		parent.add(sphere);

		return sphere;
	}

	static debugLine(parent, start, end, color){

		let material = new THREE.LineBasicMaterial({ color: color }); 
		let geometry = new THREE.Geometry();

		const p1 = new THREE.Vector3(0, 0, 0);
		const p2 = end.clone().sub(start);

		geometry.vertices.push(p1, p2);

		let tl = new THREE.Line( geometry, material );
		tl.position.copy(start);

		parent.add(tl);

		let line = {
			node: tl,
			set: (start, end) => {
				geometry.vertices[0].copy(start);
				geometry.vertices[1].copy(end);
				geometry.verticesNeedUpdate = true;
			},
		};

		return line;
	}

	static debugCircle(parent, center, radius, normal, color){
		let material = new THREE.LineBasicMaterial({ color: color });

		let geometry = new THREE.Geometry();

		let n = 32;
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

			geometry.vertices.push(p0, p1); 
		}

		let tl = new THREE.Line( geometry, material ); 
		tl.position.copy(center);
		tl.scale.set(radius, radius, radius);

		parent.add(tl);
	}

	static debugBox(parent, box, transform = new THREE.Matrix4(), color = 0xFFFF00){
		
		let vertices = [
			[box.min.x, box.min.y, box.min.z],
			[box.min.x, box.min.y, box.max.z],
			[box.min.x, box.max.y, box.min.z],
			[box.min.x, box.max.y, box.max.z],

			[box.max.x, box.min.y, box.min.z],
			[box.max.x, box.min.y, box.max.z],
			[box.max.x, box.max.y, box.min.z],
			[box.max.x, box.max.y, box.max.z],
		].map(v => new THREE.Vector3(...v));

		let edges = [
			[0, 4], [4, 5], [5, 1], [1, 0],
			[2, 6], [6, 7], [7, 3], [3, 2],
			[0, 2], [4, 6], [5, 7], [1, 3]
		];

		let center = box.getCenter(new THREE.Vector3());

		let centroids = [
			{position: [box.min.x, center.y, center.z], color: 0xFF0000},
			{position: [box.max.x, center.y, center.z], color: 0x880000},

			{position: [center.x, box.min.y, center.z], color: 0x00FF00},
			{position: [center.x, box.max.y, center.z], color: 0x008800},

			{position: [center.x, center.y, box.min.z], color: 0x0000FF},
			{position: [center.x, center.y, box.max.z], color: 0x000088},
		];

		for(let vertex of vertices){
			let pos = vertex.clone().applyMatrix4(transform);

			Utils.debugSphere(parent, pos, 0.1, 0xFF0000);
		}

		for(let edge of edges){
			let start = vertices[edge[0]].clone().applyMatrix4(transform);
			let end = vertices[edge[1]].clone().applyMatrix4(transform);

			Utils.debugLine(parent, start, end, color);
		}

		for(let centroid of centroids){
			let pos = new THREE.Vector3(...centroid.position).applyMatrix4(transform);

			Utils.debugSphere(parent, pos, 0.1, centroid.color);
		}
	}

	static debugPlane(parent, plane, size = 1, color = 0x0000FF){

		let planehelper = new THREE.PlaneHelper(plane, size, color);

		parent.add(planehelper);

	}

	/**
	 * adapted from mhluska at https://github.com/mrdoob/three.js/issues/1561
	 */
	static computeTransformedBoundingBox (box, transform) {
		let vertices = [
			new THREE.Vector3(box.min.x, box.min.y, box.min.z).applyMatrix4(transform),
			new THREE.Vector3(box.max.x, box.min.y, box.min.z).applyMatrix4(transform),
			new THREE.Vector3(box.min.x, box.max.y, box.min.z).applyMatrix4(transform),
			new THREE.Vector3(box.max.x, box.max.y, box.min.z).applyMatrix4(transform),
			new THREE.Vector3(box.min.x, box.min.y, box.max.z).applyMatrix4(transform),
			new THREE.Vector3(box.max.x, box.min.y, box.max.z).applyMatrix4(transform),
			new THREE.Vector3(box.min.x, box.max.y, box.max.z).applyMatrix4(transform),
			new THREE.Vector3(box.max.x, box.max.y, box.max.z).applyMatrix4(transform)
		];

		let boundingBox = new THREE.Box3();
		boundingBox.setFromPoints(vertices);

		return boundingBox;
	};

	/**
	 * add separators to large numbers
	 *
	 * @param nStr
	 * @returns
	 */
	static addCommas (nStr) {
		nStr += '';
		let x = nStr.split('.');
		let x1 = x[0];
		let x2 = x.length > 1 ? '.' + x[1] : '';
		let rgx = /(\d+)(\d{3})/;
		while (rgx.test(x1)) {
			x1 = x1.replace(rgx, '$1' + ',' + '$2');
		}
		return x1 + x2;
	};

	static removeCommas (str) {
		return str.replace(/,/g, '');
	}

	/**
	 * create worker from a string
	 *
	 * code from http://stackoverflow.com/questions/10343913/how-to-create-a-web-worker-from-a-string
	 */
	static createWorker (code) {
		let blob = new Blob([code], {type: 'application/javascript'});
		let worker = new Worker(URL.createObjectURL(blob));

		return worker;
	};

	static moveTo(scene, endPosition, endTarget){

		let view = scene.view;
		let camera = scene.getActiveCamera();
		let animationDuration = 500;
		let easing = TWEEN.Easing.Quartic.Out;

		{ // animate camera position
			let tween = new TWEEN.Tween(view.position).to(endPosition, animationDuration);
			tween.easing(easing);
			tween.start();
		}

		{ // animate camera target
			let camTargetDistance = camera.position.distanceTo(endTarget);
			let target = new THREE.Vector3().addVectors(
				camera.position,
				camera.getWorldDirection(new THREE.Vector3()).clone().multiplyScalar(camTargetDistance)
			);
			let tween = new TWEEN.Tween(target).to(endTarget, animationDuration);
			tween.easing(easing);
			tween.onUpdate(() => {
				view.lookAt(target);
			});
			tween.onComplete(() => {
				view.lookAt(target);
			});
			tween.start();
		}

	}

	static loadSkybox (path) {
		let parent = new THREE.Object3D("skybox_root");

		let camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 100000);
		camera.up.set(0, 0, 1);
		let scene = new THREE.Scene();

		let format = '.jpg';
		let urls = [
			path + 'px' + format, path + 'nx' + format,
			path + 'py' + format, path + 'ny' + format,
			path + 'pz' + format, path + 'nz' + format
		];

		let materialArray = [];
		{
			for (let i = 0; i < 6; i++) {
				let material = new THREE.MeshBasicMaterial({
					map: null,
					side: THREE.BackSide,
					depthTest: false,
					depthWrite: false,
					color: 0x424556
				});

				materialArray.push(material);

				let loader = new THREE.TextureLoader();
				loader.load(urls[i],
					function loaded (texture) {
						material.map = texture;
						material.needsUpdate = true;
						material.color.setHex(0xffffff);
					}, function progress (xhr) {
						// console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
					}, function error (xhr) {
						console.log('An error happened', xhr);
					}
				);
			}
		}

		let skyGeometry = new THREE.CubeGeometry(700, 700, 700);
		let skybox = new THREE.Mesh(skyGeometry, materialArray);

		scene.add(skybox);

		scene.traverse(n => n.frustumCulled = false);

		// z up
		scene.rotation.x = Math.PI / 2;

		parent.children.push(camera);
		camera.parent = parent;

		return {camera, scene, parent};
	};

	static createGrid (width, length, spacing, color) {
		let material = new THREE.LineBasicMaterial({
			color: color || 0x888888
		});

		let geometry = new THREE.Geometry();
		for (let i = 0; i <= length; i++) {
			geometry.vertices.push(new THREE.Vector3(-(spacing * width) / 2, i * spacing - (spacing * length) / 2, 0));
			geometry.vertices.push(new THREE.Vector3(+(spacing * width) / 2, i * spacing - (spacing * length) / 2, 0));
		}

		for (let i = 0; i <= width; i++) {
			geometry.vertices.push(new THREE.Vector3(i * spacing - (spacing * width) / 2, -(spacing * length) / 2, 0));
			geometry.vertices.push(new THREE.Vector3(i * spacing - (spacing * width) / 2, +(spacing * length) / 2, 0));
		}

		let line = new THREE.LineSegments(geometry, material, THREE.LinePieces);
		line.receiveShadow = true;
		return line;
	}

	static createBackgroundTexture (width, height) {
		function gauss (x, y) {
			return (1 / (2 * Math.PI)) * Math.exp(-(x * x + y * y) / 2);
		};

		// map.magFilter = THREE.NearestFilter;
		let size = width * height;
		let data = new Uint8Array(3 * size);

		let chroma = [1, 1.5, 1.7];
		let max = gauss(0, 0);

		for (let x = 0; x < width; x++) {
			for (let y = 0; y < height; y++) {
				let u = 2 * (x / width) - 1;
				let v = 2 * (y / height) - 1;

				let i = x + width * y;
				let d = gauss(2 * u, 2 * v) / max;
				let r = (Math.random() + Math.random() + Math.random()) / 3;
				r = (d * 0.5 + 0.5) * r * 0.03;
				r = r * 0.4;

				// d = Math.pow(d, 0.6);

				data[3 * i + 0] = 255 * (d / 15 + 0.05 + r) * chroma[0];
				data[3 * i + 1] = 255 * (d / 15 + 0.05 + r) * chroma[1];
				data[3 * i + 2] = 255 * (d / 15 + 0.05 + r) * chroma[2];
			}
		}

		let texture = new THREE.DataTexture(data, width, height, THREE.RGBFormat);
		texture.needsUpdate = true;

		return texture;
	}

	static getMousePointCloudIntersection (mouse, camera, viewer, pointclouds, params = {}) {
		
		let renderer = viewer.renderer;
		
		let nmouse = {
			x: (mouse.x / renderer.domElement.clientWidth) * 2 - 1,
			y: -(mouse.y / renderer.domElement.clientHeight) * 2 + 1
		};

		let pickParams = {};

		if(params.pickClipped){
			pickParams.pickClipped = params.pickClipped;
		}

		pickParams.x = mouse.x;
		pickParams.y = renderer.domElement.clientHeight - mouse.y;

		let raycaster = new THREE.Raycaster();
		raycaster.setFromCamera(nmouse, camera);
		let ray = raycaster.ray;

		let selectedPointcloud = null;
		let closestDistance = Infinity;
		let closestIntersection = null;
		let closestPoint = null;
		
		for(let pointcloud of pointclouds){
			let point = pointcloud.pick(viewer, camera, ray, pickParams);
			
			if(!point){
				continue;
			}

			let distance = camera.position.distanceTo(point.position);

			if (distance < closestDistance) {
				closestDistance = distance;
				selectedPointcloud = pointcloud;
				closestIntersection = point.position;
				closestPoint = point;
			}
		}

		if (selectedPointcloud) {
			return {
				location: closestIntersection,
				distance: closestDistance,
				pointcloud: selectedPointcloud,
				point: closestPoint
			};
		} else {
			return null;
		}
	}

	static pixelsArrayToImage (pixels, width, height) {
		let canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;

		let context = canvas.getContext('2d');

		pixels = new pixels.constructor(pixels);

		for (let i = 0; i < pixels.length; i++) {
			pixels[i * 4 + 3] = 255;
		}

		let imageData = context.createImageData(width, height);
		imageData.data.set(pixels);
		context.putImageData(imageData, 0, 0);

		let img = new Image();
		img.src = canvas.toDataURL();
		// img.style.transform = "scaleY(-1)";

		return img;
	}

	static pixelsArrayToDataUrl(pixels, width, height) {
		let canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;

		let context = canvas.getContext('2d');

		pixels = new pixels.constructor(pixels);

		for (let i = 0; i < pixels.length; i++) {
			pixels[i * 4 + 3] = 255;
		}

		let imageData = context.createImageData(width, height);
		imageData.data.set(pixels);
		context.putImageData(imageData, 0, 0);

		let dataURL = canvas.toDataURL();

		return dataURL;
	}

	static pixelsArrayToCanvas(pixels, width, height){
		let canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;

		let context = canvas.getContext('2d');

		pixels = new pixels.constructor(pixels);

		//for (let i = 0; i < pixels.length; i++) {
		//	pixels[i * 4 + 3] = 255;
		//}

		// flip vertically
		let bytesPerLine = width * 4;
		for(let i = 0; i < parseInt(height / 2); i++){
			let j = height - i - 1;

			let lineI = pixels.slice(i * bytesPerLine, i * bytesPerLine + bytesPerLine);
			let lineJ = pixels.slice(j * bytesPerLine, j * bytesPerLine + bytesPerLine);
			pixels.set(lineJ, i * bytesPerLine);
			pixels.set(lineI, j * bytesPerLine);
		}

		let imageData = context.createImageData(width, height);
		imageData.data.set(pixels);
		context.putImageData(imageData, 0, 0);

		return canvas;
	}

	static removeListeners(dispatcher, type){
		if (dispatcher._listeners === undefined) {
			return;
		}

		if (dispatcher._listeners[ type ]) {
			delete dispatcher._listeners[ type ];
		}
	}

	static mouseToRay(mouse, camera, width, height){

		let normalizedMouse = {
			x: (mouse.x / width) * 2 - 1,
			y: -(mouse.y / height) * 2 + 1
		};

		let vector = new THREE.Vector3(normalizedMouse.x, normalizedMouse.y, 0.5);
		let origin = camera.position.clone();
		vector.unproject(camera);
		let direction = new THREE.Vector3().subVectors(vector, origin).normalize();

		let ray = new THREE.Ray(origin, direction);

		return ray;
	}

	static projectedRadius(radius, camera, distance, screenWidth, screenHeight){
		if(camera instanceof THREE.OrthographicCamera){
			return Utils.projectedRadiusOrtho(radius, camera.projectionMatrix, screenWidth, screenHeight);
		}else if(camera instanceof THREE.PerspectiveCamera){
			return Utils.projectedRadiusPerspective(radius, camera.fov * Math.PI / 180, distance, screenHeight);
		}else{
			throw new Error("invalid parameters");
		}
	}

	static projectedRadiusPerspective(radius, fov, distance, screenHeight) {
		let projFactor = (1 / Math.tan(fov / 2)) / distance;
		projFactor = projFactor * screenHeight / 2;

		return radius * projFactor;
	}

	static projectedRadiusOrtho(radius, proj, screenWidth, screenHeight) {
		let p1 = new THREE.Vector4(0);
		let p2 = new THREE.Vector4(radius);

		p1.applyMatrix4(proj);
		p2.applyMatrix4(proj);
		p1 = new THREE.Vector3(p1.x, p1.y, p1.z);
		p2 = new THREE.Vector3(p2.x, p2.y, p2.z);
		p1.x = (p1.x + 1.0) * 0.5 * screenWidth;
		p1.y = (p1.y + 1.0) * 0.5 * screenHeight;
		p2.x = (p2.x + 1.0) * 0.5 * screenWidth;
		p2.y = (p2.y + 1.0) * 0.5 * screenHeight;
		return p1.distanceTo(p2);
	}
		
		
	static topView(camera, node){
		camera.position.set(0, 1, 0);
		camera.rotation.set(-Math.PI / 2, 0, 0);
		camera.zoomTo(node, 1);
	}

	static frontView (camera, node) {
		camera.position.set(0, 0, 1);
		camera.rotation.set(0, 0, 0);
		camera.zoomTo(node, 1);
	}

	static leftView (camera, node) {
		camera.position.set(-1, 0, 0);
		camera.rotation.set(0, -Math.PI / 2, 0);
		camera.zoomTo(node, 1);
	}

	static rightView (camera, node) {
		camera.position.set(1, 0, 0);
		camera.rotation.set(0, Math.PI / 2, 0);
		camera.zoomTo(node, 1);
	}

	
	static findClosestGpsTime(target, viewer){
		const start = performance.now();

		const nodes = [];
		for(const pc of viewer.scene.pointclouds){
			nodes.push(pc.root);

			for(const child of pc.root.children){
				if(child){
					nodes.push(child);
				}
			}
		}

		let closestNode = null;
		let closestIndex = Infinity;
		let closestDistance = Infinity;
		let closestValue = 0;

		for(const node of nodes){

			const isOkay = node.geometryNode != null 
				&& node.geometryNode.geometry != null
				&& node.sceneNode != null;

			if(!isOkay){
				continue;
			}

			let geometry = node.geometryNode.geometry;
			let gpsTime = geometry.attributes["gps-time"];
			let range = gpsTime.potree.range;

			for(let i = 0; i < gpsTime.array.length; i++){
				let value = gpsTime.array[i];
				value = value * (range[1] - range[0]) + range[0];
				const distance = Math.abs(target - value);

				if(distance < closestDistance){
					closestIndex = i;
					closestDistance = distance;
					closestValue = value;
					closestNode = node;
					//console.log("found a closer one: " + value);
				}
			}
		}

		const geometry = closestNode.geometryNode.geometry;
		const position = new THREE.Vector3(
			geometry.attributes.position.array[3 * closestIndex + 0],
			geometry.attributes.position.array[3 * closestIndex + 1],
			geometry.attributes.position.array[3 * closestIndex + 2],
		);

		position.applyMatrix4(closestNode.sceneNode.matrixWorld);

		const end = performance.now();
		const duration = (end - start);
		console.log(`duration: ${duration.toFixed(3)}ms`);

		return {
			node: closestNode,
			index: closestIndex,
			position: position,
		};
	}

	/**
	 *
	 * 0: no intersection
	 * 1: intersection
	 * 2: fully inside
	 */
	static frustumSphereIntersection (frustum, sphere) {
		let planes = frustum.planes;
		let center = sphere.center;
		let negRadius = -sphere.radius;

		let minDistance = Number.MAX_VALUE;

		for (let i = 0; i < 6; i++) {
			let distance = planes[ i ].distanceToPoint(center);

			if (distance < negRadius) {
				return 0;
			}

			minDistance = Math.min(minDistance, distance);
		}

		return (minDistance >= sphere.radius) ? 2 : 1;
	}

	// code taken from three.js
	// ImageUtils - generateDataTexture()
	static generateDataTexture (width, height, color) {
		let size = width * height;
		let data = new Uint8Array(4 * width * height);

		let r = Math.floor(color.r * 255);
		let g = Math.floor(color.g * 255);
		let b = Math.floor(color.b * 255);

		for (let i = 0; i < size; i++) {
			data[ i * 3 ] = r;
			data[ i * 3 + 1 ] = g;
			data[ i * 3 + 2 ] = b;
		}

		let texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
		texture.needsUpdate = true;
		texture.magFilter = THREE.NearestFilter;

		return texture;
	}

	// from http://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
	static getParameterByName (name) {
		name = name.replace(/[[]/, '\\[').replace(/[\]]/, '\\]');
		let regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
		let results = regex.exec(document.location.search);
		return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, ' '));
	}

	static setParameter (name, value) {
		// value = encodeURIComponent(value);

		name = name.replace(/[[]/, '\\[').replace(/[\]]/, '\\]');
		let regex = new RegExp('([\\?&])(' + name + '=([^&#]*))');
		let results = regex.exec(document.location.search);

		let url = window.location.href;
		if (results === null) {
			if (window.location.search.length === 0) {
				url = url + '?';
			} else {
				url = url + '&';
			}

			url = url + name + '=' + value;
		} else {
			let newValue = name + '=' + value;
			url = url.replace(results[2], newValue);
		}
		window.history.replaceState({}, '', url);
	}

	static createChildAABB(aabb, index){
		let min = aabb.min.clone();
		let max = aabb.max.clone();
		let size = new THREE.Vector3().subVectors(max, min);

		if ((index & 0b0001) > 0) {
			min.z += size.z / 2;
		} else {
			max.z -= size.z / 2;
		}

		if ((index & 0b0010) > 0) {
			min.y += size.y / 2;
		} else {
			max.y -= size.y / 2;
		}

		if ((index & 0b0100) > 0) {
			min.x += size.x / 2;
		} else {
			max.x -= size.x / 2;
		}

		return new THREE.Box3(min, max);
	}

	// see https://stackoverflow.com/questions/400212/how-do-i-copy-to-the-clipboard-in-javascript
	static clipboardCopy(text){
		let textArea = document.createElement("textarea");

		textArea.style.position = 'fixed';
		textArea.style.top = 0;
		textArea.style.left = 0;

		textArea.style.width = '2em';
		textArea.style.height = '2em';

		textArea.style.padding = 0;

		textArea.style.border = 'none';
		textArea.style.outline = 'none';
		textArea.style.boxShadow = 'none';

		textArea.style.background = 'transparent';

		textArea.value = text;

		document.body.appendChild(textArea);

		textArea.select();

		 try {
			let success = document.execCommand('copy');
			if(success){
				console.log("copied text to clipboard");
			}else{
				console.log("copy to clipboard failed");
			}
		} catch (err) {
			console.log("error while trying to copy to clipboard");
		}

		document.body.removeChild(textArea);

	}

	static getMeasurementIcon(measurement){
		if (measurement instanceof Measure) {
			if (measurement.showDistances && !measurement.showArea && !measurement.showAngles) {
				return `${Potree.resourcePath}/icons/distance.svg`;
			} else if (measurement.showDistances && measurement.showArea && !measurement.showAngles) {
				return `${Potree.resourcePath}/icons/area.svg`;
			} else if (measurement.maxMarkers === 1) {
				return `${Potree.resourcePath}/icons/point.svg`;
			} else if (!measurement.showDistances && !measurement.showArea && measurement.showAngles) {
				return `${Potree.resourcePath}/icons/angle.png`;
			} else if (measurement.showHeight) {
				return `${Potree.resourcePath}/icons/height.svg`;
			} else {
				return `${Potree.resourcePath}/icons/distance.svg`;
			}
		} else if (measurement instanceof Profile) {
			return `${Potree.resourcePath}/icons/profile.svg`;
		} else if (measurement instanceof Volume) {
			return `${Potree.resourcePath}/icons/volume.svg`;
		} else if (measurement instanceof PolygonClipVolume) {
			return `${Potree.resourcePath}/icons/clip-polygon.svg`;
		}
	}

	static lineToLineIntersection(P0, P1, P2, P3){

		const P = [P0, P1, P2, P3];

		const d = (m, n, o, p) => {
			let result =  
				  (P[m].x - P[n].x) * (P[o].x - P[p].x)
				+ (P[m].y - P[n].y) * (P[o].y - P[p].y)
				+ (P[m].z - P[n].z) * (P[o].z - P[p].z);

			return result;
		};


		const mua = (d(0, 2, 3, 2) * d(3, 2, 1, 0) - d(0, 2, 1, 0) * d(3, 2, 3, 2))
		        /**-----------------------------------------------------------------**/ /
		            (d(1, 0, 1, 0) * d(3, 2, 3, 2) - d(3, 2, 1, 0) * d(3, 2, 1, 0));


		const mub = (d(0, 2, 3, 2) + mua * d(3, 2, 1, 0))
		        /**--------------------------------------**/ /
		                       d(3, 2, 3, 2);


		const P01 = P1.clone().sub(P0);
		const P23 = P3.clone().sub(P2);
		
		const Pa = P0.clone().add(P01.multiplyScalar(mua));
		const Pb = P2.clone().add(P23.multiplyScalar(mub));

		const center = Pa.clone().add(Pb).multiplyScalar(0.5);

		return center;
	}

	static computeCircleCenter(A, B, C){
		const AB = B.clone().sub(A);
		const AC = C.clone().sub(A);

		const N = AC.clone().cross(AB).normalize();

		const ab_dir = AB.clone().cross(N).normalize();
		const ac_dir = AC.clone().cross(N).normalize();

		const ab_origin = A.clone().add(B).multiplyScalar(0.5);
		const ac_origin = A.clone().add(C).multiplyScalar(0.5);

		const P0 = ab_origin;
		const P1 = ab_origin.clone().add(ab_dir);

		const P2 = ac_origin;
		const P3 = ac_origin.clone().add(ac_dir);

		const center = Utils.lineToLineIntersection(P0, P1, P2, P3);

		return center;

		// Potree.Utils.debugLine(viewer.scene.scene, P0, P1, 0x00ff00);
		// Potree.Utils.debugLine(viewer.scene.scene, P2, P3, 0x0000ff);

		// Potree.Utils.debugSphere(viewer.scene.scene, center, 0.03, 0xff00ff);

		// const radius = center.distanceTo(A);
		// Potree.Utils.debugCircle(viewer.scene.scene, center, radius, new THREE.Vector3(0, 0, 1), 0xff00ff);
	}

	static getNorthVec(p1, distance, projection){
		if(projection){
			// if there is a projection, transform coordinates to WGS84
			// and compute angle to north there

			proj4.defs("pointcloud", projection);
			const transform = proj4("pointcloud", "WGS84");

			const llP1 = transform.forward(p1.toArray());
			let llP2 = transform.forward([p1.x, p1.y + distance]);
			const polarRadius = Math.sqrt((llP2[0] - llP1[0]) ** 2 + (llP2[1] - llP1[1]) ** 2);
			llP2 = [llP1[0], llP1[1] + polarRadius];

			const northVec = transform.inverse(llP2);
			
			return new THREE.Vector3(...northVec, p1.z).sub(p1);
		}else{
			// if there is no projection, assume [0, 1, 0] as north direction

			const vec = new THREE.Vector3(0, 1, 0).multiplyScalar(distance);
			
			return vec;
		}
	}

	static computeAzimuth(p1, p2, projection){

		let azimuth = 0;

		if(projection){
			// if there is a projection, transform coordinates to WGS84
			// and compute angle to north there

			let transform;

			if (projection.includes('EPSG')) {
				transform = proj4(projection, "WGS84");
			} else {
				proj4.defs("pointcloud", projection);
				transform = proj4("pointcloud", "WGS84");
			}

			const llP1 = transform.forward(p1.toArray());
			const llP2 = transform.forward(p2.toArray());
			const dir = [
				llP2[0] - llP1[0],
				llP2[1] - llP1[1],
			];
			azimuth = Math.atan2(dir[1], dir[0]) - Math.PI / 2;
		}else{
			// if there is no projection, assume [0, 1, 0] as north direction

			const dir = [p2.x - p1.x, p2.y - p1.y];
			azimuth = Math.atan2(dir[1], dir[0]) - Math.PI / 2;
		}

		// make clockwise
		azimuth = -azimuth;

		return azimuth;
	}

	static async loadScript(url){

		return new Promise( resolve => {

			const element = document.getElementById(url);

			if(element){
				resolve();
			}else{
				const script = document.createElement("script");

				script.id = url;

				script.onload = () => {
					resolve();
				};
				script.src = url;

				document.body.appendChild(script);
			}
		});
	}

	static createSvgGradient(scheme){

		// this is what we are creating:
		//
		//<svg width="1em" height="3em"  xmlns="http://www.w3.org/2000/svg">
		//	<defs>
		//		<linearGradient id="gradientID" gradientTransform="rotate(90)">
		//		<stop offset="0%"  stop-color="rgb(93, 78, 162)" />
		//		...
		//		<stop offset="100%"  stop-color="rgb(157, 0, 65)" />
		//		</linearGradient>
		//	</defs>
		//	
		//	<rect width="100%" height="100%" fill="url('#myGradient')" stroke="black" stroke-width="0.1em"/>
		//</svg>


		const gradientId = `${Math.random()}_${Date.now()}`;
		
		const svgn = "http://www.w3.org/2000/svg";
		const svg = document.createElementNS(svgn, "svg");
		svg.setAttributeNS(null, "width", "2em");
		svg.setAttributeNS(null, "height", "3em");
		
		{ // <defs>
			const defs = document.createElementNS(svgn, "defs");
			
			const linearGradient = document.createElementNS(svgn, "linearGradient");
			linearGradient.setAttributeNS(null, "id", gradientId);
			linearGradient.setAttributeNS(null, "gradientTransform", "rotate(90)");

			for(let i = scheme.length - 1; i >= 0; i--){
				const stopVal = scheme[i];
				const percent = parseInt(100 - stopVal[0] * 100);
				const [r, g, b] = stopVal[1].toArray().map(v => parseInt(v * 255));

				const stop = document.createElementNS(svgn, "stop");
				stop.setAttributeNS(null, "offset", `${percent}%`);
				stop.setAttributeNS(null, "stop-color", `rgb(${r}, ${g}, ${b})`);

				linearGradient.appendChild(stop);
			}

			defs.appendChild(linearGradient);
			svg.appendChild(defs);
		}

		const rect = document.createElementNS(svgn, "rect");
		rect.setAttributeNS(null, "width", `100%`);
		rect.setAttributeNS(null, "height", `100%`);
		rect.setAttributeNS(null, "fill", `url("#${gradientId}")`);
		rect.setAttributeNS(null, "stroke", `black`);
		rect.setAttributeNS(null, "stroke-width", `0.1em`);

		svg.appendChild(rect);
		
		return svg;
	}

	static async waitAny(promises){
		
		return new Promise( (resolve) => {

			promises.map( promise => {
				promise.then( () => {
					resolve();
				});
			});

		});

	}

}

Utils.screenPass = new function () {
	this.screenScene = new THREE.Scene();
	this.screenQuad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2, 1));
	this.screenQuad.material.depthTest = true;
	this.screenQuad.material.depthWrite = true;
	this.screenQuad.material.transparent = true;
	this.screenScene.add(this.screenQuad);
	this.camera = new THREE.Camera();

	this.render = function (renderer, material, target) {
		this.screenQuad.material = material;

		if (typeof target === 'undefined') {
			renderer.render(this.screenScene, this.camera);
		} else {
			renderer.render(this.screenScene, this.camera, target);
		}
	};
}();
