'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var zeaEngine = require('@zeainc/zea-engine');

const PointAttributeNames = {
	POSITION_CARTESIAN: 0, // float x, y, z;
	COLOR_PACKED: 1, // byte r, g, b, a; 	I: [0,1]
	COLOR_FLOATS_1: 2, // float r, g, b; 	I: [0,1]
	COLOR_FLOATS_255: 3, // float r, g, b; 	I: [0,255]
	NORMAL_FLOATS: 4, // float x, y, z;
	FILLER: 5,
	INTENSITY: 6,
	CLASSIFICATION: 7,
	NORMAL_SPHEREMAPPED: 8,
	NORMAL_OCT16: 9,
	NORMAL: 10,
	RETURN_NUMBER: 11,
	NUMBER_OF_RETURNS: 12,
	SOURCE_ID: 13,
	INDICES: 14,
	SPACING: 15,
	GPS_TIME: 16,
};


/**
 * Some types of possible point attribute data formats
 *
 * @class
 */
const PointAttributeTypes = {
	DATA_TYPE_DOUBLE: {ordinal: 0, size: 8},
	DATA_TYPE_FLOAT: {ordinal: 1, size: 4},
	DATA_TYPE_INT8: {ordinal: 2, size: 1},
	DATA_TYPE_UINT8: {ordinal: 3, size: 1},
	DATA_TYPE_INT16: {ordinal: 4, size: 2},
	DATA_TYPE_UINT16: {ordinal: 5, size: 2},
	DATA_TYPE_INT32: {ordinal: 6, size: 4},
	DATA_TYPE_UINT32: {ordinal: 7, size: 4},
	DATA_TYPE_INT64: {ordinal: 8, size: 8},
	DATA_TYPE_UINT64: {ordinal: 9, size: 8}
};

let i = 0;
for (let obj in PointAttributeTypes) {
	PointAttributeTypes[i] = PointAttributeTypes[obj];
	i++;
}


class PointAttribute{
	
	constructor(name, type, numElements){
		this.name = name;
		this.type = type;
		this.numElements = numElements;
		this.byteSize = this.numElements * this.type.size;
	}

}
PointAttribute.POSITION_CARTESIAN = new PointAttribute(
	PointAttributeNames.POSITION_CARTESIAN,
	PointAttributeTypes.DATA_TYPE_FLOAT, 3);

PointAttribute.RGBA_PACKED = new PointAttribute(
	PointAttributeNames.COLOR_PACKED,
	PointAttributeTypes.DATA_TYPE_INT8, 4);

PointAttribute.COLOR_PACKED = PointAttribute.RGBA_PACKED;

PointAttribute.RGB_PACKED = new PointAttribute(
	PointAttributeNames.COLOR_PACKED,
	PointAttributeTypes.DATA_TYPE_INT8, 3);

PointAttribute.NORMAL_FLOATS = new PointAttribute(
	PointAttributeNames.NORMAL_FLOATS,
	PointAttributeTypes.DATA_TYPE_FLOAT, 3);

PointAttribute.FILLER_1B = new PointAttribute(
	PointAttributeNames.FILLER,
	PointAttributeTypes.DATA_TYPE_UINT8, 1);

PointAttribute.INTENSITY = new PointAttribute(
	PointAttributeNames.INTENSITY,
	PointAttributeTypes.DATA_TYPE_UINT16, 1);

PointAttribute.CLASSIFICATION = new PointAttribute(
	PointAttributeNames.CLASSIFICATION,
	PointAttributeTypes.DATA_TYPE_UINT8, 1);

PointAttribute.NORMAL_SPHEREMAPPED = new PointAttribute(
	PointAttributeNames.NORMAL_SPHEREMAPPED,
	PointAttributeTypes.DATA_TYPE_UINT8, 2);

PointAttribute.NORMAL_OCT16 = new PointAttribute(
	PointAttributeNames.NORMAL_OCT16,
	PointAttributeTypes.DATA_TYPE_UINT8, 2);

PointAttribute.NORMAL = new PointAttribute(
	PointAttributeNames.NORMAL,
	PointAttributeTypes.DATA_TYPE_FLOAT, 3);
	
PointAttribute.RETURN_NUMBER = new PointAttribute(
	PointAttributeNames.RETURN_NUMBER,
	PointAttributeTypes.DATA_TYPE_UINT8, 1);
	
PointAttribute.NUMBER_OF_RETURNS = new PointAttribute(
	PointAttributeNames.NUMBER_OF_RETURNS,
	PointAttributeTypes.DATA_TYPE_UINT8, 1);
	
PointAttribute.SOURCE_ID = new PointAttribute(
	PointAttributeNames.SOURCE_ID,
	PointAttributeTypes.DATA_TYPE_UINT16, 1);

PointAttribute.INDICES = new PointAttribute(
	PointAttributeNames.INDICES,
	PointAttributeTypes.DATA_TYPE_UINT32, 1);

PointAttribute.SPACING = new PointAttribute(
	PointAttributeNames.SPACING,
	PointAttributeTypes.DATA_TYPE_FLOAT, 1);

PointAttribute.GPS_TIME = new PointAttribute(
	PointAttributeNames.GPS_TIME,
	PointAttributeTypes.DATA_TYPE_DOUBLE, 1);

class PointAttributes{

	constructor(pointAttributes){
		this.attributes = [];
		this.byteSize = 0;
		this.size = 0;

		if (pointAttributes != null) {
			for (let i = 0; i < pointAttributes.length; i++) {
				let pointAttributeName = pointAttributes[i];
				let pointAttribute = PointAttribute[pointAttributeName];
				this.attributes.push(pointAttribute);
				this.byteSize += pointAttribute.byteSize;
				this.size++;
			}
		}
	}


	add(pointAttribute){
		this.attributes.push(pointAttribute);
		this.byteSize += pointAttribute.byteSize;
		this.size++;
	};

	hasColors(){
		for (let name in this.attributes) {
			let pointAttribute = this.attributes[name];
			if (pointAttribute.name === PointAttributeNames.COLOR_PACKED) {
				return true;
			}
		}

		return false;
	};

	hasNormals(){
		for (let name in this.attributes) {
			let pointAttribute = this.attributes[name];
			if (
				pointAttribute === PointAttribute.NORMAL_SPHEREMAPPED ||
				pointAttribute === PointAttribute.NORMAL_FLOATS ||
				pointAttribute === PointAttribute.NORMAL ||
				pointAttribute === PointAttribute.NORMAL_OCT16) {
				return true;
			}
		}

		return false;
	};

}

/**
 * @author mrdoob / http://mrdoob.com/ https://github.com/mrdoob/eventdispatcher.js
 * 
 * with slight modifications by mschuetz, http://potree.org
 * 
 */

// The MIT License
// 
// Copyright (c) 2011 Mr.doob
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.





class EventDispatcher{

	constructor(){
		this._listeners = {};
	}

	addEventListener(type, listener){

		const listeners = this._listeners;

		if(listeners[type] === undefined){
			listeners[type] = [];
		}

		if(listeners[type].indexOf(listener) === - 1){
			listeners[type].push( listener );
		}

	}

	hasEventListener(type, listener){

		const listeners = this._listeners;

		return listeners[type] !== undefined && listeners[type].indexOf(listener) !== - 1;
	}

	removeEventListener(type, listener){

		let listeners = this._listeners;
		let listenerArray = listeners[type];

		if (listenerArray !== undefined){

			let index = listenerArray.indexOf(listener);

			if(index !== - 1){
				listenerArray.splice(index, 1);
			}
		}

	}

	removeEventListeners(type){
		if(this._listeners[type] !== undefined){
			delete this._listeners[type];
		}
	};

	dispatchEvent(event){

		let listeners = this._listeners;
		let listenerArray = listeners[event.type];

		if ( listenerArray !== undefined ) {
			event.target = this;

			for(let listener of listenerArray.slice(0)){
				listener.call(this, event);
			}
		}

	}

}

class PointCloudTreeNode extends EventDispatcher{

	constructor(){
		super();
		// this.needsTransformUpdate = true;// Never used.
	}

	getChildren () {
		throw new Error('override function');
	}

	getBoundingBox () {
		throw new Error('override function');
	}

	isLoaded () {
		throw new Error('override function');
	}

	isGeometryNode () {
		throw new Error('override function');
	}

	isTreeNode () {
		throw new Error('override function');
	}

	getLevel () {
		throw new Error('override function');
	}

	getBoundingSphere () {
		throw new Error('override function');
	}
}
/*
export class PointCloudTree extends THREE.Object3D {
	constructor () {
		super();
	}

	initialized () {
		return this.root !== null;
	}
};
*/

const XHRFactory = {
	config: {
		withCredentials: false,
		customHeaders: [
			{ header: null, value: null }
		]
	},

	createXMLHttpRequest: function () {
		let xhr = new XMLHttpRequest();

		if (this.config.customHeaders &&
			Array.isArray(this.config.customHeaders) &&
			this.config.customHeaders.length > 0) {
			let baseOpen = xhr.open;
			let customHeaders = this.config.customHeaders;
			xhr.open = function () {
				baseOpen.apply(this, [].slice.call(arguments));
				customHeaders.forEach(function (customHeader) {
					if (!!customHeader.header && !!customHeader.value) {
						xhr.setRequestHeader(customHeader.header, customHeader.value);
					}
				});
			};
		}

		return xhr;
	}
};

class Utils {
	/*
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
		if (value instanceof THREE.Vector3) {
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
	}

	static debugLine(parent, start, end, color){
		let material = new THREE.LineBasicMaterial({ color: color }); 
		let geometry = new THREE.Geometry(); 
		geometry.vertices.push( start, end); 
		let tl = new THREE.Line( geometry, material ); 
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
	*/

	/**
	 * adapted from mhluska at https://github.com/mrdoob/three.js/issues/1561
	 * /
	static computeTransformedBoundingBox (box, transform) {
		let vertices = [
			new THREE.Vector3(box.min.x, box.min.y, box.min.z).applyMatrix4(transform),
			new THREE.Vector3(box.min.x, box.min.y, box.min.z).applyMatrix4(transform),
			new THREE.Vector3(box.max.x, box.min.y, box.min.z).applyMatrix4(transform),
			new THREE.Vector3(box.min.x, box.max.y, box.min.z).applyMatrix4(transform),
			new THREE.Vector3(box.min.x, box.min.y, box.max.z).applyMatrix4(transform),
			new THREE.Vector3(box.min.x, box.max.y, box.max.z).applyMatrix4(transform),
			new THREE.Vector3(box.max.x, box.max.y, box.min.z).applyMatrix4(transform),
			new THREE.Vector3(box.max.x, box.min.y, box.max.z).applyMatrix4(transform),
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
	 * /
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
	}*/

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
	/*
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

		let skyGeometry = new THREE.CubeGeometry(5000, 5000, 5000);
		let skybox = new THREE.Mesh(skyGeometry, materialArray);

		scene.add(skybox);

		// z up
		scene.rotation.x = Math.PI / 2;

		return {'camera': camera, 'scene': scene};
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
		let origin = new THREE.Vector3(normalizedMouse.x, normalizedMouse.y, 0);
		vector.unproject(camera);
		origin.unproject(camera);
		let direction = new THREE.Vector3().subVectors(vector, origin).normalize();

		let ray = new THREE.Ray(origin, direction);

		return ray;
	}
	*/
/*
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

	/**
	 *
	 * 0: no intersection
	 * 1: intersection
	 * 2: fully inside
	 * /
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
*/
	static createChildAABB(aabb, index){
		let min = aabb.min.clone();
		let max = aabb.max.clone();
		let size = max.subtract(min);

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

		return new zeaEngine.Box3(min, max);
	}
/*
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

	static toMaterialID(materialName){
		if (materialName === 'RGB'){
			return PointColorType.RGB;
		} else if (materialName === 'Color') {
			return PointColorType.COLOR;
		} else if (materialName === 'Elevation') {
			return PointColorType.HEIGHT;
		} else if (materialName === 'Intensity') {
			return PointColorType.INTENSITY;
		} else if (materialName === 'Intensity Gradient') {
			return PointColorType.INTENSITY_GRADIENT;
		} else if (materialName === 'Classification') {
			return PointColorType.CLASSIFICATION;
		} else if (materialName === 'Return Number') {
			return PointColorType.RETURN_NUMBER;
		} else if (materialName === 'Source') {
			return PointColorType.SOURCE;
		} else if (materialName === 'Level of Detail') {
			return PointColorType.LOD;
		} else if (materialName === 'Point Index') {
			return PointColorType.POINT_INDEX;
		} else if (materialName === 'Normal') {
			return PointColorType.NORMAL;
		} else if (materialName === 'Phong') {
			return PointColorType.PHONG;
		} else if (materialName === 'Index') {
			return PointColorType.POINT_INDEX;
		} else if (materialName === 'RGB and Elevation') {
			return PointColorType.RGB_HEIGHT;
		} else if (materialName === 'Composite') {
			return PointColorType.COMPOSITE;
		} else if (materialName === 'GPS Time') {
			return PointColorType.GPS_TIME;
		} else if (materialName === 'Matcap') {
			return PointColorType.MATCAP;
		}
	};


	static toMaterialName(materialID) {
		if (materialID === PointColorType.RGB) {
			return 'RGB';
		} else if (materialID === PointColorType.COLOR) {
			return 'Color';
		} else if (materialID === PointColorType.HEIGHT) {
			return 'Elevation';
		} else if (materialID === PointColorType.INTENSITY) {
			return 'Intensity';
		} else if (materialID === PointColorType.INTENSITY_GRADIENT) {
			return 'Intensity Gradient';
		} else if (materialID === PointColorType.CLASSIFICATION) {
			return 'Classification';
		} else if (materialID === PointColorType.RETURN_NUMBER) {
			return 'Return Number';
		} else if (materialID === PointColorType.SOURCE) {
			return 'Source';
		} else if (materialID === PointColorType.LOD) {
			return 'Level of Detail';
		} else if (materialID === PointColorType.NORMAL) {
			return 'Normal';
		} else if (materialID === PointColorType.PHONG) {
			return 'Phong';
		} else if (materialID === PointColorType.POINT_INDEX) {
			return 'Index';
		} else if (materialID === PointColorType.RGB_HEIGHT) {
			return 'RGB and Elevation';
		} else if (materialID === PointColorType.COMPOSITE) {
			return 'Composite';
		} else if (materialID === PointColorType.GPS_TIME) {
			return 'GPS Time';
		} else if (materialID === PointColorType.MATCAP) {
			return 'Matcap';
		}
	};
*/
}

// Utils.screenPass = new function () {
// 	this.screenScene = new THREE.Scene();
// 	this.screenQuad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2, 0));
// 	this.screenQuad.material.depthTest = true;
// 	this.screenQuad.material.depthWrite = true;
// 	this.screenQuad.material.transparent = true;
// 	this.screenScene.add(this.screenQuad);
// 	this.camera = new THREE.Camera();

// 	this.render = function (renderer, material, target) {
// 		this.screenQuad.material = material;

// 		if (typeof target === 'undefined') {
// 			renderer.render(this.screenScene, this.camera);
// 		} else {
// 			renderer.render(this.screenScene, this.camera, target);
// 		}
// 	};
// }();

class PointCloudOctreeGeometry{

	constructor(){
		this.url = null;
		this.octreeDir = null;
		this.spacing = 0;
		this.boundingBox = null;
		this.root = null;
		this.nodes = null;
		this.pointAttributes = null;
		this.hierarchyStepSize = -1;
		this.loader = null;
	}
	
}

class PointCloudOctreeGeometryNode extends PointCloudTreeNode{

	constructor(name, pcoGeometry, boundingBox){
		super();

		this.id = PointCloudOctreeGeometryNode.IDCount++;
		this.name = name;
		this.index = parseInt(name.charAt(name.length - 1));
		this.pcoGeometry = pcoGeometry;
		this.geometry = null;
		this.boundingBox = boundingBox;
		this.boundingSphere = boundingBox.getBoundingSphere();
		this.children = {};
		this.numPoints = 0;
		this.level = null;
		this.loaded = false;
		this.oneTimeDisposeHandlers = [];

		this.offset = this.boundingBox.min.clone();
		// console.log("PointCloudOctreeGeometryNode:", this.name, this.offset);
	}

	// isGeometryNode(){
	// 	return true;
	// }

	getLevel(){
		return this.level;
	}

	// isTreeNode(){
	// 	return false;
	// }

	isLoaded(){
		return this.loaded;
	}

	getBoundingSphere(){
		return this.boundingSphere;
	}

	getBoundingBox(){
		return this.boundingBox;
	}

	getChildren(){
		let children = [];

		for (let i = 0; i < 8; i++) {
			if (this.children[i]) {
				children.push(this.children[i]);
			}
		}

		return children;
	}

	getURL(){
		let url = '';

		let version = this.pcoGeometry.loader.version;

		if (version.equalOrHigher('1.5')) {
			url = this.pcoGeometry.octreeDir + '/' + this.getHierarchyPath() + '/' + this.name;
		} else if (version.equalOrHigher('1.4')) {
			url = this.pcoGeometry.octreeDir + '/' + this.name;
		} else if (version.upTo('1.3')) {
			url = this.pcoGeometry.octreeDir + '/' + this.name;
		}

		return url;
	}

	getHierarchyPath(){
		let path = 'r/';

		let hierarchyStepSize = this.pcoGeometry.hierarchyStepSize;
		let indices = this.name.substr(1);

		let numParts = Math.floor(indices.length / hierarchyStepSize);
		for (let i = 0; i < numParts; i++) {
			path += indices.substr(i * hierarchyStepSize, hierarchyStepSize) + '/';
		}

		path = path.slice(0, -1);

		return path;
	}

	addChild(child) {
		// console.log("PointCloudOctreeGeometryNode", this.name, ".addChild:", child.name);
		this.children[child.index] = child;
		child.parent = this;
	}

	shouldLoad() {
		return this.loading !== true && this.loaded !== true;
	}

	load(){
		this.loading = true;
		if(this.loadPromise)
			return this.loadPromise
		this.loadPromise = new Promise((resolve, reject)=>{

			if (this.pcoGeometry.loader.version.equalOrHigher('1.5')) {
				if ((this.level % this.pcoGeometry.hierarchyStepSize) === 0 && this.hasChildren) {
					this.loadHierachyThenPoints().then(resolve);
				} else {
					this.loadPoints().then(resolve);
				}
			} else {
				this.loadPoints().then(resolve);
			}
		});
		return this.loadPromise;
	}

	loadPoints(){
		return this.pcoGeometry.loader.load(this);
	}

	parse(data, version) {

		const buffers = data.attributeBuffers;

		const points = new zeaEngine.Points();
		for(let property in buffers){
			const buffer = buffers[property].buffer;
			const propertyId = parseInt(property);
			if (propertyId === PointAttributeNames.POSITION_CARTESIAN) {
				const attr = points.getVertexAttribute('positions');
				attr.data = new Float32Array(buffer);
			} else if (propertyId === PointAttributeNames.COLOR_PACKED) {
    			points.addVertexAttribute('colors', zeaEngine.RGBA, new Uint8Array(buffer));
			}else if (propertyId === PointAttributeNames.INDICES) ;
			/* else if (propertyId === PointAttributeNames.INTENSITY) {
				geometry.addAttribute('intensity', new THREE.BufferAttribute(new Float32Array(buffer), 1));
			} else if (propertyId === PointAttributeNames.CLASSIFICATION) {
				geometry.addAttribute('classification', new THREE.BufferAttribute(new Uint8Array(buffer), 1));
			} else if (propertyId === PointAttributeNames.RETURN_NUMBER) {
				geometry.addAttribute('returnNumber', new THREE.BufferAttribute(new Uint8Array(buffer), 1));
			} else if (propertyId === PointAttributeNames.NUMBER_OF_RETURNS) {
				geometry.addAttribute('numberOfReturns', new THREE.BufferAttribute(new Uint8Array(buffer), 1));
			} else if (propertyId === PointAttributeNames.SOURCE_ID) {
				geometry.addAttribute('pointSourceID', new THREE.BufferAttribute(new Uint16Array(buffer), 1));
			} else if (propertyId === PointAttributeNames.NORMAL_SPHEREMAPPED) {
				geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(buffer), 3));
			} else if (propertyId === PointAttributeNames.NORMAL_OCT16) {
				geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(buffer), 3));
			} else if (propertyId === PointAttributeNames.NORMAL) {
				geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(buffer), 3));
			} else if (propertyId === PointAttributeNames.SPACING) {
				const bufferAttribute = new THREE.BufferAttribute(new Float32Array(buffer), 1);
				geometry.addAttribute('spacing', bufferAttribute);
			} else if (propertyId === PointAttributeNames.GPS_TIME) {
				const bufferAttribute = new THREE.BufferAttribute(new Float32Array(buffer), 1);
				geometry.addAttribute('gpsTime', bufferAttribute);

				this.gpsTime = {
					offset: buffers[property].offset,
					range: buffers[property].range,
				};
			}*/
			else {
				let name;
				for (let key in PointAttributeNames) {
					if (PointAttributeNames[key] == propertyId) {
						name = key;
						break;
					}
				}
				console.warn("Unandled Point Attribute:", name); 
			}
		}
		this.points = points;
		// const min = data.tightBoundingBox.min
		// this.offset = new Vec3(min[0], min[1], min[2]);
		// console.log(data.tightBoundingBox.min);

		const tightBoundingBox = new zeaEngine.Box3(
			new zeaEngine.Vec3(...data.tightBoundingBox.min),
			new zeaEngine.Vec3(...data.tightBoundingBox.max)
		);
		tightBoundingBox.max.subtract(tightBoundingBox.min);
		tightBoundingBox.min.set(0, 0, 0);

		
		let pointAttributes = this.pcoGeometry.pointAttributes;
		const numPoints = data.buffer.byteLength / pointAttributes.byteSize;
		
		this.numPoints = numPoints;
		this.mean = new zeaEngine.Vec3(...data.mean);
		this.tightBoundingBox = tightBoundingBox;
		this.loaded = true;
		this.loading = false;
		this.estimatedSpacing = data.estimatedSpacing;

		this.dispatchEvent('loaded', {
			numPoints
		});
	}

	loadHierachyThenPoints(){
		return new Promise((resolve, reject)=>{
		let node = this;

		// load hierarchy
		let callback = function (node, hbuffer) {
			let view = new DataView(hbuffer);

			let stack = [];
			let children = view.getUint8(0);
			let numPoints = view.getUint32(1, true);
			node.numPoints = numPoints;
			stack.push({children: children, numPoints: numPoints, name: node.name});

			let decoded = [];

			let offset = 5;
			while (stack.length > 0) {
				let snode = stack.shift();
				let mask = 1;
				for (let i = 0; i < 8; i++) {
					if ((snode.children & mask) !== 0) {
						let childName = snode.name + i;

						let childChildren = view.getUint8(offset);
						let childNumPoints = view.getUint32(offset + 1, true);

						stack.push({children: childChildren, numPoints: childNumPoints, name: childName});

						decoded.push({children: childChildren, numPoints: childNumPoints, name: childName});

						offset += 5;
					}

					mask = mask * 2;
				}

				if (offset === hbuffer.byteLength) {
					break;
				}
			}

			// console.log(decoded);

			let nodes = {};
			nodes[node.name] = node;
			let pco = node.pcoGeometry;

			for (let i = 0; i < decoded.length; i++) {
				let name = decoded[i].name;
				let decodedNumPoints = decoded[i].numPoints;
				let index = parseInt(name.charAt(name.length - 1));
				let parentName = name.substring(0, name.length - 1);
				let parentNode = nodes[parentName];
				let level = name.length - 1;
				let boundingBox = Utils.createChildAABB(parentNode.boundingBox, index);

				let currentNode = new PointCloudOctreeGeometryNode(name, pco, boundingBox);
				currentNode.level = level;
				currentNode.numPoints = decodedNumPoints;
				currentNode.hasChildren = decoded[i].children > 0;
				currentNode.spacing = pco.spacing / Math.pow(2, level);
				parentNode.addChild(currentNode);
				nodes[name] = currentNode;
			}

			node.loadPoints().then(()=>{
				resolve();
			});
		};
		if ((node.level % node.pcoGeometry.hierarchyStepSize) === 0) {
			// let hurl = node.pcoGeometry.octreeDir + "/../hierarchy/" + node.name + ".hrc";
			let hurl = node.pcoGeometry.octreeDir + '/' + node.getHierarchyPath() + '/' + node.name + '.hrc';

			let xhr = XHRFactory.createXMLHttpRequest();
			xhr.open('GET', hurl, true);
			xhr.responseType = 'arraybuffer';
			xhr.overrideMimeType('text/plain; charset=x-user-defined');
			xhr.onreadystatechange = () => {
				if (xhr.readyState === 4) {
					if (xhr.status === 200 || xhr.status === 0) {
						let hbuffer = xhr.response;
						callback(node, hbuffer);
					} else {
						const msg = 'Failed to load file! HTTP status: ' + xhr.status + ', file: ' + hurl;
						console.log(msg);
						reject(msg);
					}
				}
			};
			try {
				xhr.send(null);
			} catch (e) {
				console.log('fehler beim laden der punktwolke: ' + e);
				reject('fehler beim laden der punktwolke: ' + e);
			}
		}
		});
	}

	getNumPoints(){
		return this.numPoints;
	}

	dispose(){
		if (this.geometry && this.parent != null) {
			this.geometry.dispose();
			this.geometry = null;
			this.loaded = false;
			this.loadPromise = null;

			// this.dispatchEvent( { type: 'dispose' } );
			for (let i = 0; i < this.oneTimeDisposeHandlers.length; i++) {
				let handler = this.oneTimeDisposeHandlers[i];
				handler();
			}
			this.oneTimeDisposeHandlers = [];
		}
	}
	
}

PointCloudOctreeGeometryNode.IDCount = 0;

class Version{

	constructor(version){
		this.version = version;
		let vmLength = (version.indexOf('.') === -1) ? version.length : version.indexOf('.');
		this.versionMajor = parseInt(version.substr(0, vmLength));
		this.versionMinor = parseInt(version.substr(vmLength + 1));
		if (this.versionMinor.length === 0) {
			this.versionMinor = 0;
		}
	}

	newerThan(version){
		let v = new Version(version);

		if (this.versionMajor > v.versionMajor) {
			return true;
		} else if (this.versionMajor === v.versionMajor && this.versionMinor > v.versionMinor) {
			return true;
		} else {
			return false;
		}
	}

	equalOrHigher(version){
		let v = new Version(version);

		if (this.versionMajor > v.versionMajor) {
			return true;
		} else if (this.versionMajor === v.versionMajor && this.versionMinor >= v.versionMinor) {
			return true;
		} else {
			return false;
		}
	}

	upTo(version){
		return !this.newerThan(version);
	}

}

/**
 * laslaz code taken and adapted from plas.io js-laslaz
 *	http://plas.io/
 *  https://github.com/verma/plasio
 *
 * Thanks to Uday Verma and Howard Butler
 *
 */

class LasLazLoader {

	constructor (version) {
		if (typeof (version) === 'string') {
			this.version = new Version(version);
		} else {
			this.version = version;
		}
	}

	static progressCB () {

	}

	load (node) {
		if (node.loaded) {
			return;
		}

		let pointAttributes = node.pcoGeometry.pointAttributes;

		let url = node.getURL();

		if (this.version.equalOrHigher('1.4')) {
			url += '.' + pointAttributes.toLowerCase();
		}

		let xhr = XHRFactory.createXMLHttpRequest();
		xhr.open('GET', url, true);
		xhr.responseType = 'arraybuffer';
		xhr.overrideMimeType('text/plain; charset=x-user-defined');
		xhr.onreadystatechange = () => {
			if (xhr.readyState === 4) {
				if (xhr.status === 200 || xhr.status === 0) {
					let buffer = xhr.response;
					this.parse(node, buffer);
				} else {
					console.log('Failed to load file! HTTP status: ' + xhr.status + ', file: ' + url);
				}
			}
		};

		xhr.send(null);
	}

	parse(node, buffer){
		let lf = new LASFile(buffer);
		let handler = new LasLazBatcher(node);


		//
		// DEBUG
		//
		// invoke the laz decompress worker thousands of times to check for memory leaks
		// until 2018/03/05, it tended to run out of memory at ~6230 invocations
		// 
		//
		//lf.open()
		//.then( msg => {
		//	lf.isOpen = true;
		//	return lf;
		//}).catch( msg => {
		//	console.log("failed to open file. :(");	
		//}).then( lf => {
		//	return lf.getHeader().then(function (h) {
		//		return [lf, h];
		//	});
		//}).then( v => {
		//	let lf = v[0];
		//	let header = v[1];

		//	lf.readData(1000000, 0, 1)
		//	.then( v => {
		//		console.log("read");

		//		this.parse(node, buffer);
		//	}).then (v => {
		//		lf.close();	
		//	});

		//})



		lf.open()
		.then( msg => {
			lf.isOpen = true;
			return lf;
		}).catch( msg => {
			console.log("failed to open file. :(");	
		}).then( lf => {
			return lf.getHeader().then(function (h) {
				return [lf, h];
			});
		}).then( v => {
			let lf = v[0];
			let header = v[1];

			let skip = 1;
			let totalRead = 0;
			let totalToRead = ( header.pointsCount );
			let reader = function () {
				let p = lf.readData(1000000, 0, skip);
				return p.then(function (data) {
					handler.push(new LASDecoder(data.buffer,
						header.pointsFormatId,
						header.pointsStructSize,
						data.count,
						header.scale,
						header.offset,
						header.mins, header.maxs));

					totalRead += data.count;
					LasLazLoader.progressCB(totalRead / totalToRead);

					if (data.hasMoreData) {
						return reader();
					} else {
						header.totalRead = totalRead;
						header.versionAsString = lf.versionAsString;
						header.isCompressed = lf.isCompressed;
						return [lf, header, handler];
					}
				});
			};

			return reader();
		}).then( v => {
			let lf = v[0];
			// we're done loading this file
			//
			LasLazLoader.progressCB(1);

			// Close it
			return lf.close().then(function () {
				lf.isOpen = false;

				return v.slice(1);
			}).catch(e => {
				// If there was a cancellation, make sure the file is closed, if the file is open
				// close and then fail
				if (lf.isOpen) {
					return lf.close().then(function () {
						lf.isOpen = false;
						throw e;
					});
				}
				throw e;	
			});	
		});
	}

	handle (node, url) {

	}
}
class LasLazBatcher{

	constructor (node) {
		this.node = node;
	}

	push (lasBuffer) {
		let workerPath = Potree.scriptPath + '/workers/LASDecoderWorker.js';
		let worker = Potree.workerPool.getWorker(workerPath);
		let node = this.node;

		worker.onmessage = (e) => {
			let geometry = new THREE.BufferGeometry();
			let numPoints = lasBuffer.pointsCount;

			let positions = new Float32Array(e.data.position);
			let colors = new Uint8Array(e.data.color);
			let intensities = new Float32Array(e.data.intensity);
			let classifications = new Uint8Array(e.data.classification);
			let returnNumbers = new Uint8Array(e.data.returnNumber);
			let numberOfReturns = new Uint8Array(e.data.numberOfReturns);
			let pointSourceIDs = new Uint16Array(e.data.pointSourceID);
			let indices = new Uint8Array(e.data.indices);

			geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
			geometry.addAttribute('color', new THREE.BufferAttribute(colors, 4, true));
			geometry.addAttribute('intensity', new THREE.BufferAttribute(intensities, 1));
			geometry.addAttribute('classification', new THREE.BufferAttribute(classifications, 1));
			geometry.addAttribute('returnNumber', new THREE.BufferAttribute(returnNumbers, 1));
			geometry.addAttribute('numberOfReturns', new THREE.BufferAttribute(numberOfReturns, 1));
			geometry.addAttribute('pointSourceID', new THREE.BufferAttribute(pointSourceIDs, 1));
			//geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(numPoints * 3), 3));
			geometry.addAttribute('indices', new THREE.BufferAttribute(indices, 4));
			geometry.attributes.indices.normalized = true;

			let tightBoundingBox = new THREE.Box3(
				new THREE.Vector3().fromArray(e.data.tightBoundingBox.min),
				new THREE.Vector3().fromArray(e.data.tightBoundingBox.max)
			);

			geometry.boundingBox = this.node.boundingBox;
			this.node.tightBoundingBox = tightBoundingBox;

			this.node.geometry = geometry;
			this.node.numPoints = numPoints;
			this.node.loaded = true;
			this.node.loading = false;
			Potree.numNodesLoading--;
			this.node.mean = new THREE.Vector3(...e.data.mean);

			//debugger;

			Potree.workerPool.returnWorker(workerPath, worker);
		};

		let message = {
			buffer: lasBuffer.arrayb,
			numPoints: lasBuffer.pointsCount,
			pointSize: lasBuffer.pointSize,
			pointFormatID: 2,
			scale: lasBuffer.scale,
			offset: lasBuffer.offset,
			mins: lasBuffer.mins,
			maxs: lasBuffer.maxs
		};
		worker.postMessage(message, [message.buffer]);
	};
}

class WorkerPool{
	constructor(){
		this.workers = {};
	}

	getWorker(workerCls){
		
		if (!this.workers[workerCls]){
			this.workers[workerCls] = [];
		}

		if (this.workers[workerCls].length === 0){
			let worker = new workerCls();
			this.workers[workerCls].push(worker);
		}

		let worker = this.workers[workerCls].pop();

		return worker;
	}

	returnWorker(workerCls, worker){
		this.workers[workerCls].push(worker);
	}
}
const workerPool = new WorkerPool();
//Potree.workerPool = new Potree.WorkerPool();

var WorkerClass = null;

try {
    var WorkerThreads =
        typeof module !== 'undefined' && typeof module.require === 'function' && module.require('worker_threads') ||
        typeof __non_webpack_require__ === 'function' && __non_webpack_require__('worker_threads') ||
        typeof require === 'function' && require('worker_threads');
    WorkerClass = WorkerThreads.Worker;
} catch(e) {} // eslint-disable-line

function decodeBase64(base64, enableUnicode) {
    return Buffer.from(base64, 'base64').toString(enableUnicode ? 'utf16' : 'utf8');
}

function createBase64WorkerFactory(base64, sourcemapArg, enableUnicodeArg) {
    var sourcemap = sourcemapArg === undefined ? null : sourcemapArg;
    var enableUnicode = enableUnicodeArg === undefined ? false : enableUnicodeArg;
    var source = decodeBase64(base64, enableUnicode);
    var start = source.indexOf('\n', 10) + 1;
    var body = source.substring(start) + (sourcemap ? '\/\/# sourceMappingURL=' + sourcemap : '');
    return function WorkerFactory(options) {
        return new WorkerClass(body, Object.assign({}, options, { eval: true }));
    };
}

function decodeBase64$1(base64, enableUnicode) {
    var binaryString = atob(base64);
    if (enableUnicode) {
        var binaryView = new Uint8Array(binaryString.length);
        for (var i = 0, n = binaryString.length; i < n; ++i) {
            binaryView[i] = binaryString.charCodeAt(i);
        }
        return String.fromCharCode.apply(null, new Uint16Array(binaryView.buffer));
    }
    return binaryString;
}

function createURL(base64, sourcemapArg, enableUnicodeArg) {
    var sourcemap = sourcemapArg === undefined ? null : sourcemapArg;
    var enableUnicode = enableUnicodeArg === undefined ? false : enableUnicodeArg;
    var source = decodeBase64$1(base64, enableUnicode);
    var start = source.indexOf('\n', 10) + 1;
    var body = source.substring(start) + (sourcemap ? '\/\/# sourceMappingURL=' + sourcemap : '');
    var blob = new Blob([body], { type: 'application/javascript' });
    return URL.createObjectURL(blob);
}

function createBase64WorkerFactory$1(base64, sourcemapArg, enableUnicodeArg) {
    var url;
    return function WorkerFactory(options) {
        url = url || createURL(base64, sourcemapArg, enableUnicodeArg);
        return new Worker(url, options);
    };
}

var kIsNodeJS = Object.prototype.toString.call(typeof process !== 'undefined' ? process : 0) === '[object process]';

function isNodeJS() {
    return kIsNodeJS;
}

function createBase64WorkerFactory$2(base64, sourcemapArg, enableUnicodeArg) {
    if (isNodeJS()) {
        return createBase64WorkerFactory(base64, sourcemapArg, enableUnicodeArg);
    }
    return createBase64WorkerFactory$1(base64, sourcemapArg, enableUnicodeArg);
}

var WorkerFactory = createBase64WorkerFactory$2('Lyogcm9sbHVwLXBsdWdpbi13ZWItd29ya2VyLWxvYWRlciAqLwpjbGFzcyBWZXJzaW9uew0KDQoJY29uc3RydWN0b3IodmVyc2lvbil7DQoJCXRoaXMudmVyc2lvbiA9IHZlcnNpb247DQoJCWxldCB2bUxlbmd0aCA9ICh2ZXJzaW9uLmluZGV4T2YoJy4nKSA9PT0gLTEpID8gdmVyc2lvbi5sZW5ndGggOiB2ZXJzaW9uLmluZGV4T2YoJy4nKTsNCgkJdGhpcy52ZXJzaW9uTWFqb3IgPSBwYXJzZUludCh2ZXJzaW9uLnN1YnN0cigwLCB2bUxlbmd0aCkpOw0KCQl0aGlzLnZlcnNpb25NaW5vciA9IHBhcnNlSW50KHZlcnNpb24uc3Vic3RyKHZtTGVuZ3RoICsgMSkpOw0KCQlpZiAodGhpcy52ZXJzaW9uTWlub3IubGVuZ3RoID09PSAwKSB7DQoJCQl0aGlzLnZlcnNpb25NaW5vciA9IDA7DQoJCX0NCgl9DQoNCgluZXdlclRoYW4odmVyc2lvbil7DQoJCWxldCB2ID0gbmV3IFZlcnNpb24odmVyc2lvbik7DQoNCgkJaWYgKHRoaXMudmVyc2lvbk1ham9yID4gdi52ZXJzaW9uTWFqb3IpIHsNCgkJCXJldHVybiB0cnVlOw0KCQl9IGVsc2UgaWYgKHRoaXMudmVyc2lvbk1ham9yID09PSB2LnZlcnNpb25NYWpvciAmJiB0aGlzLnZlcnNpb25NaW5vciA+IHYudmVyc2lvbk1pbm9yKSB7DQoJCQlyZXR1cm4gdHJ1ZTsNCgkJfSBlbHNlIHsNCgkJCXJldHVybiBmYWxzZTsNCgkJfQ0KCX0NCg0KCWVxdWFsT3JIaWdoZXIodmVyc2lvbil7DQoJCWxldCB2ID0gbmV3IFZlcnNpb24odmVyc2lvbik7DQoNCgkJaWYgKHRoaXMudmVyc2lvbk1ham9yID4gdi52ZXJzaW9uTWFqb3IpIHsNCgkJCXJldHVybiB0cnVlOw0KCQl9IGVsc2UgaWYgKHRoaXMudmVyc2lvbk1ham9yID09PSB2LnZlcnNpb25NYWpvciAmJiB0aGlzLnZlcnNpb25NaW5vciA+PSB2LnZlcnNpb25NaW5vcikgew0KCQkJcmV0dXJuIHRydWU7DQoJCX0gZWxzZSB7DQoJCQlyZXR1cm4gZmFsc2U7DQoJCX0NCgl9DQoNCgl1cFRvKHZlcnNpb24pew0KCQlyZXR1cm4gIXRoaXMubmV3ZXJUaGFuKHZlcnNpb24pOw0KCX0NCg0KfQoKY29uc3QgUG9pbnRBdHRyaWJ1dGVOYW1lcyA9IHsNCglQT1NJVElPTl9DQVJURVNJQU46IDAsIC8vIGZsb2F0IHgsIHksIHo7DQoJQ09MT1JfUEFDS0VEOiAxLCAvLyBieXRlIHIsIGcsIGIsIGE7IAlJOiBbMCwxXQ0KCUNPTE9SX0ZMT0FUU18xOiAyLCAvLyBmbG9hdCByLCBnLCBiOyAJSTogWzAsMV0NCglDT0xPUl9GTE9BVFNfMjU1OiAzLCAvLyBmbG9hdCByLCBnLCBiOyAJSTogWzAsMjU1XQ0KCU5PUk1BTF9GTE9BVFM6IDQsIC8vIGZsb2F0IHgsIHksIHo7DQoJRklMTEVSOiA1LA0KCUlOVEVOU0lUWTogNiwNCglDTEFTU0lGSUNBVElPTjogNywNCglOT1JNQUxfU1BIRVJFTUFQUEVEOiA4LA0KCU5PUk1BTF9PQ1QxNjogOSwNCglOT1JNQUw6IDEwLA0KCVJFVFVSTl9OVU1CRVI6IDExLA0KCU5VTUJFUl9PRl9SRVRVUk5TOiAxMiwNCglTT1VSQ0VfSUQ6IDEzLA0KCUlORElDRVM6IDE0LA0KCVNQQUNJTkc6IDE1LA0KCUdQU19USU1FOiAxNiwNCn07DQoNCg0KLyoqDQogKiBTb21lIHR5cGVzIG9mIHBvc3NpYmxlIHBvaW50IGF0dHJpYnV0ZSBkYXRhIGZvcm1hdHMNCiAqDQogKiBAY2xhc3MNCiAqLw0KY29uc3QgUG9pbnRBdHRyaWJ1dGVUeXBlcyA9IHsNCglEQVRBX1RZUEVfRE9VQkxFOiB7b3JkaW5hbDogMCwgc2l6ZTogOH0sDQoJREFUQV9UWVBFX0ZMT0FUOiB7b3JkaW5hbDogMSwgc2l6ZTogNH0sDQoJREFUQV9UWVBFX0lOVDg6IHtvcmRpbmFsOiAyLCBzaXplOiAxfSwNCglEQVRBX1RZUEVfVUlOVDg6IHtvcmRpbmFsOiAzLCBzaXplOiAxfSwNCglEQVRBX1RZUEVfSU5UMTY6IHtvcmRpbmFsOiA0LCBzaXplOiAyfSwNCglEQVRBX1RZUEVfVUlOVDE2OiB7b3JkaW5hbDogNSwgc2l6ZTogMn0sDQoJREFUQV9UWVBFX0lOVDMyOiB7b3JkaW5hbDogNiwgc2l6ZTogNH0sDQoJREFUQV9UWVBFX1VJTlQzMjoge29yZGluYWw6IDcsIHNpemU6IDR9LA0KCURBVEFfVFlQRV9JTlQ2NDoge29yZGluYWw6IDgsIHNpemU6IDh9LA0KCURBVEFfVFlQRV9VSU5UNjQ6IHtvcmRpbmFsOiA5LCBzaXplOiA4fQ0KfTsNCg0KbGV0IGkgPSAwOw0KZm9yIChsZXQgb2JqIGluIFBvaW50QXR0cmlidXRlVHlwZXMpIHsNCglQb2ludEF0dHJpYnV0ZVR5cGVzW2ldID0gUG9pbnRBdHRyaWJ1dGVUeXBlc1tvYmpdOw0KCWkrKzsNCn0NCg0KDQpjbGFzcyBQb2ludEF0dHJpYnV0ZXsNCgkNCgljb25zdHJ1Y3RvcihuYW1lLCB0eXBlLCBudW1FbGVtZW50cyl7DQoJCXRoaXMubmFtZSA9IG5hbWU7DQoJCXRoaXMudHlwZSA9IHR5cGU7DQoJCXRoaXMubnVtRWxlbWVudHMgPSBudW1FbGVtZW50czsNCgkJdGhpcy5ieXRlU2l6ZSA9IHRoaXMubnVtRWxlbWVudHMgKiB0aGlzLnR5cGUuc2l6ZTsNCgl9DQoNCn0NClBvaW50QXR0cmlidXRlLlBPU0lUSU9OX0NBUlRFU0lBTiA9IG5ldyBQb2ludEF0dHJpYnV0ZSgNCglQb2ludEF0dHJpYnV0ZU5hbWVzLlBPU0lUSU9OX0NBUlRFU0lBTiwNCglQb2ludEF0dHJpYnV0ZVR5cGVzLkRBVEFfVFlQRV9GTE9BVCwgMyk7DQoNClBvaW50QXR0cmlidXRlLlJHQkFfUEFDS0VEID0gbmV3IFBvaW50QXR0cmlidXRlKA0KCVBvaW50QXR0cmlidXRlTmFtZXMuQ09MT1JfUEFDS0VELA0KCVBvaW50QXR0cmlidXRlVHlwZXMuREFUQV9UWVBFX0lOVDgsIDQpOw0KDQpQb2ludEF0dHJpYnV0ZS5DT0xPUl9QQUNLRUQgPSBQb2ludEF0dHJpYnV0ZS5SR0JBX1BBQ0tFRDsNCg0KUG9pbnRBdHRyaWJ1dGUuUkdCX1BBQ0tFRCA9IG5ldyBQb2ludEF0dHJpYnV0ZSgNCglQb2ludEF0dHJpYnV0ZU5hbWVzLkNPTE9SX1BBQ0tFRCwNCglQb2ludEF0dHJpYnV0ZVR5cGVzLkRBVEFfVFlQRV9JTlQ4LCAzKTsNCg0KUG9pbnRBdHRyaWJ1dGUuTk9STUFMX0ZMT0FUUyA9IG5ldyBQb2ludEF0dHJpYnV0ZSgNCglQb2ludEF0dHJpYnV0ZU5hbWVzLk5PUk1BTF9GTE9BVFMsDQoJUG9pbnRBdHRyaWJ1dGVUeXBlcy5EQVRBX1RZUEVfRkxPQVQsIDMpOw0KDQpQb2ludEF0dHJpYnV0ZS5GSUxMRVJfMUIgPSBuZXcgUG9pbnRBdHRyaWJ1dGUoDQoJUG9pbnRBdHRyaWJ1dGVOYW1lcy5GSUxMRVIsDQoJUG9pbnRBdHRyaWJ1dGVUeXBlcy5EQVRBX1RZUEVfVUlOVDgsIDEpOw0KDQpQb2ludEF0dHJpYnV0ZS5JTlRFTlNJVFkgPSBuZXcgUG9pbnRBdHRyaWJ1dGUoDQoJUG9pbnRBdHRyaWJ1dGVOYW1lcy5JTlRFTlNJVFksDQoJUG9pbnRBdHRyaWJ1dGVUeXBlcy5EQVRBX1RZUEVfVUlOVDE2LCAxKTsNCg0KUG9pbnRBdHRyaWJ1dGUuQ0xBU1NJRklDQVRJT04gPSBuZXcgUG9pbnRBdHRyaWJ1dGUoDQoJUG9pbnRBdHRyaWJ1dGVOYW1lcy5DTEFTU0lGSUNBVElPTiwNCglQb2ludEF0dHJpYnV0ZVR5cGVzLkRBVEFfVFlQRV9VSU5UOCwgMSk7DQoNClBvaW50QXR0cmlidXRlLk5PUk1BTF9TUEhFUkVNQVBQRUQgPSBuZXcgUG9pbnRBdHRyaWJ1dGUoDQoJUG9pbnRBdHRyaWJ1dGVOYW1lcy5OT1JNQUxfU1BIRVJFTUFQUEVELA0KCVBvaW50QXR0cmlidXRlVHlwZXMuREFUQV9UWVBFX1VJTlQ4LCAyKTsNCg0KUG9pbnRBdHRyaWJ1dGUuTk9STUFMX09DVDE2ID0gbmV3IFBvaW50QXR0cmlidXRlKA0KCVBvaW50QXR0cmlidXRlTmFtZXMuTk9STUFMX09DVDE2LA0KCVBvaW50QXR0cmlidXRlVHlwZXMuREFUQV9UWVBFX1VJTlQ4LCAyKTsNCg0KUG9pbnRBdHRyaWJ1dGUuTk9STUFMID0gbmV3IFBvaW50QXR0cmlidXRlKA0KCVBvaW50QXR0cmlidXRlTmFtZXMuTk9STUFMLA0KCVBvaW50QXR0cmlidXRlVHlwZXMuREFUQV9UWVBFX0ZMT0FULCAzKTsNCgkNClBvaW50QXR0cmlidXRlLlJFVFVSTl9OVU1CRVIgPSBuZXcgUG9pbnRBdHRyaWJ1dGUoDQoJUG9pbnRBdHRyaWJ1dGVOYW1lcy5SRVRVUk5fTlVNQkVSLA0KCVBvaW50QXR0cmlidXRlVHlwZXMuREFUQV9UWVBFX1VJTlQ4LCAxKTsNCgkNClBvaW50QXR0cmlidXRlLk5VTUJFUl9PRl9SRVRVUk5TID0gbmV3IFBvaW50QXR0cmlidXRlKA0KCVBvaW50QXR0cmlidXRlTmFtZXMuTlVNQkVSX09GX1JFVFVSTlMsDQoJUG9pbnRBdHRyaWJ1dGVUeXBlcy5EQVRBX1RZUEVfVUlOVDgsIDEpOw0KCQ0KUG9pbnRBdHRyaWJ1dGUuU09VUkNFX0lEID0gbmV3IFBvaW50QXR0cmlidXRlKA0KCVBvaW50QXR0cmlidXRlTmFtZXMuU09VUkNFX0lELA0KCVBvaW50QXR0cmlidXRlVHlwZXMuREFUQV9UWVBFX1VJTlQxNiwgMSk7DQoNClBvaW50QXR0cmlidXRlLklORElDRVMgPSBuZXcgUG9pbnRBdHRyaWJ1dGUoDQoJUG9pbnRBdHRyaWJ1dGVOYW1lcy5JTkRJQ0VTLA0KCVBvaW50QXR0cmlidXRlVHlwZXMuREFUQV9UWVBFX1VJTlQzMiwgMSk7DQoNClBvaW50QXR0cmlidXRlLlNQQUNJTkcgPSBuZXcgUG9pbnRBdHRyaWJ1dGUoDQoJUG9pbnRBdHRyaWJ1dGVOYW1lcy5TUEFDSU5HLA0KCVBvaW50QXR0cmlidXRlVHlwZXMuREFUQV9UWVBFX0ZMT0FULCAxKTsNCg0KUG9pbnRBdHRyaWJ1dGUuR1BTX1RJTUUgPSBuZXcgUG9pbnRBdHRyaWJ1dGUoDQoJUG9pbnRBdHRyaWJ1dGVOYW1lcy5HUFNfVElNRSwNCglQb2ludEF0dHJpYnV0ZVR5cGVzLkRBVEFfVFlQRV9ET1VCTEUsIDEpOwoKLyogZ2xvYmFsIG9ubWVzc2FnZTp0cnVlIHBvc3RNZXNzYWdlOmZhbHNlICovDQovKiBleHBvcnRlZCBvbm1lc3NhZ2UgKi8NCi8vIGh0dHA6Ly9qc3BlcmYuY29tL3VpbnQ4YXJyYXktdnMtZGF0YXZpZXczLzMNCmZ1bmN0aW9uIEN1c3RvbVZpZXcgKGJ1ZmZlcikgew0KCXRoaXMuYnVmZmVyID0gYnVmZmVyOw0KCXRoaXMudTggPSBuZXcgVWludDhBcnJheShidWZmZXIpOw0KDQoJbGV0IHRtcCA9IG5ldyBBcnJheUJ1ZmZlcig4KTsNCglsZXQgdG1wZiA9IG5ldyBGbG9hdDMyQXJyYXkodG1wKTsNCglsZXQgdG1wZCA9IG5ldyBGbG9hdDY0QXJyYXkodG1wKTsNCglsZXQgdG1wdTggPSBuZXcgVWludDhBcnJheSh0bXApOw0KDQoJdGhpcy5nZXRVaW50MzIgPSBmdW5jdGlvbiAoaSkgew0KCQlyZXR1cm4gKHRoaXMudThbaSArIDNdIDw8IDI0KSB8ICh0aGlzLnU4W2kgKyAyXSA8PCAxNikgfCAodGhpcy51OFtpICsgMV0gPDwgOCkgfCB0aGlzLnU4W2ldOw0KCX07DQoNCgl0aGlzLmdldFVpbnQxNiA9IGZ1bmN0aW9uIChpKSB7DQoJCXJldHVybiAodGhpcy51OFtpICsgMV0gPDwgOCkgfCB0aGlzLnU4W2ldOw0KCX07DQoNCgl0aGlzLmdldEZsb2F0MzIgPSBmdW5jdGlvbiAoaSkgew0KCQl0bXB1OFswXSA9IHRoaXMudThbaSArIDBdOw0KCQl0bXB1OFsxXSA9IHRoaXMudThbaSArIDFdOw0KCQl0bXB1OFsyXSA9IHRoaXMudThbaSArIDJdOw0KCQl0bXB1OFszXSA9IHRoaXMudThbaSArIDNdOw0KDQoJCXJldHVybiB0bXBmWzBdOw0KCX07DQoNCgl0aGlzLmdldEZsb2F0NjQgPSBmdW5jdGlvbiAoaSkgew0KCQl0bXB1OFswXSA9IHRoaXMudThbaSArIDBdOw0KCQl0bXB1OFsxXSA9IHRoaXMudThbaSArIDFdOw0KCQl0bXB1OFsyXSA9IHRoaXMudThbaSArIDJdOw0KCQl0bXB1OFszXSA9IHRoaXMudThbaSArIDNdOw0KCQl0bXB1OFs0XSA9IHRoaXMudThbaSArIDRdOw0KCQl0bXB1OFs1XSA9IHRoaXMudThbaSArIDVdOw0KCQl0bXB1OFs2XSA9IHRoaXMudThbaSArIDZdOw0KCQl0bXB1OFs3XSA9IHRoaXMudThbaSArIDddOw0KDQoJCXJldHVybiB0bXBkWzBdOw0KCX07DQoNCgl0aGlzLmdldFVpbnQ4ID0gZnVuY3Rpb24gKGkpIHsNCgkJcmV0dXJuIHRoaXMudThbaV07DQoJfTsNCn0NCg0Kb25tZXNzYWdlID0gZnVuY3Rpb24gKGV2ZW50KSB7DQoNCglwZXJmb3JtYW5jZS5tYXJrKCJiaW5hcnktZGVjb2Rlci1zdGFydCIpOw0KCQ0KCWxldCBidWZmZXIgPSBldmVudC5kYXRhLmJ1ZmZlcjsNCglsZXQgcG9pbnRBdHRyaWJ1dGVzID0gZXZlbnQuZGF0YS5wb2ludEF0dHJpYnV0ZXM7DQoJbGV0IG51bVBvaW50cyA9IGJ1ZmZlci5ieXRlTGVuZ3RoIC8gcG9pbnRBdHRyaWJ1dGVzLmJ5dGVTaXplOw0KCWxldCBjdiA9IG5ldyBDdXN0b21WaWV3KGJ1ZmZlcik7DQoJbGV0IHZlcnNpb24gPSBuZXcgVmVyc2lvbihldmVudC5kYXRhLnZlcnNpb24pOw0KCWxldCBub2RlT2Zmc2V0ID0gZXZlbnQuZGF0YS5vZmZzZXQ7DQoJbGV0IHNjYWxlID0gZXZlbnQuZGF0YS5zY2FsZTsNCglsZXQgc3BhY2luZyA9IGV2ZW50LmRhdGEuc3BhY2luZzsNCglsZXQgaGFzQ2hpbGRyZW4gPSBldmVudC5kYXRhLmhhc0NoaWxkcmVuOw0KCWxldCBuYW1lID0gZXZlbnQuZGF0YS5uYW1lOw0KCQ0KCWxldCB0aWdodEJveE1pbiA9IFsgTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZLCBOdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFksIE51bWJlci5QT1NJVElWRV9JTkZJTklUWSBdOw0KCWxldCB0aWdodEJveE1heCA9IFsgTnVtYmVyLk5FR0FUSVZFX0lORklOSVRZLCBOdW1iZXIuTkVHQVRJVkVfSU5GSU5JVFksIE51bWJlci5ORUdBVElWRV9JTkZJTklUWSBdOw0KCWxldCBtZWFuID0gWzAsIDAsIDBdOw0KCQ0KDQoJbGV0IGF0dHJpYnV0ZUJ1ZmZlcnMgPSB7fTsNCglsZXQgaW5PZmZzZXQgPSAwOw0KCWZvciAobGV0IHBvaW50QXR0cmlidXRlIG9mIHBvaW50QXR0cmlidXRlcy5hdHRyaWJ1dGVzKSB7DQoJCQ0KCQlpZiAocG9pbnRBdHRyaWJ1dGUubmFtZSA9PT0gUG9pbnRBdHRyaWJ1dGUuUE9TSVRJT05fQ0FSVEVTSUFOLm5hbWUpIHsNCgkJCWxldCBidWZmID0gbmV3IEFycmF5QnVmZmVyKG51bVBvaW50cyAqIDQgKiAzKTsNCgkJCWxldCBwb3NpdGlvbnMgPSBuZXcgRmxvYXQzMkFycmF5KGJ1ZmYpOw0KCQkNCgkJCWZvciAobGV0IGogPSAwOyBqIDwgbnVtUG9pbnRzOyBqKyspIHsNCgkJCQlsZXQgeCwgeSwgejsNCg0KCQkJCWlmICh2ZXJzaW9uLm5ld2VyVGhhbignMS4zJykpIHsNCgkJCQkJeCA9IChjdi5nZXRVaW50MzIoaW5PZmZzZXQgKyBqICogcG9pbnRBdHRyaWJ1dGVzLmJ5dGVTaXplICsgMCwgdHJ1ZSkgKiBzY2FsZSk7DQoJCQkJCXkgPSAoY3YuZ2V0VWludDMyKGluT2Zmc2V0ICsgaiAqIHBvaW50QXR0cmlidXRlcy5ieXRlU2l6ZSArIDQsIHRydWUpICogc2NhbGUpOw0KCQkJCQl6ID0gKGN2LmdldFVpbnQzMihpbk9mZnNldCArIGogKiBwb2ludEF0dHJpYnV0ZXMuYnl0ZVNpemUgKyA4LCB0cnVlKSAqIHNjYWxlKTsNCgkJCQl9IGVsc2Ugew0KCQkJCQl4ID0gY3YuZ2V0RmxvYXQzMihqICogcG9pbnRBdHRyaWJ1dGVzLmJ5dGVTaXplICsgMCwgdHJ1ZSkgKyBub2RlT2Zmc2V0WzBdOw0KCQkJCQl5ID0gY3YuZ2V0RmxvYXQzMihqICogcG9pbnRBdHRyaWJ1dGVzLmJ5dGVTaXplICsgNCwgdHJ1ZSkgKyBub2RlT2Zmc2V0WzFdOw0KCQkJCQl6ID0gY3YuZ2V0RmxvYXQzMihqICogcG9pbnRBdHRyaWJ1dGVzLmJ5dGVTaXplICsgOCwgdHJ1ZSkgKyBub2RlT2Zmc2V0WzJdOw0KCQkJCX0NCg0KCQkJCXBvc2l0aW9uc1szICogaiArIDBdID0geDsNCgkJCQlwb3NpdGlvbnNbMyAqIGogKyAxXSA9IHk7DQoJCQkJcG9zaXRpb25zWzMgKiBqICsgMl0gPSB6Ow0KDQoJCQkJbWVhblswXSArPSB4IC8gbnVtUG9pbnRzOw0KCQkJCW1lYW5bMV0gKz0geSAvIG51bVBvaW50czsNCgkJCQltZWFuWzJdICs9IHogLyBudW1Qb2ludHM7DQoNCgkJCQl0aWdodEJveE1pblswXSA9IE1hdGgubWluKHRpZ2h0Qm94TWluWzBdLCB4KTsNCgkJCQl0aWdodEJveE1pblsxXSA9IE1hdGgubWluKHRpZ2h0Qm94TWluWzFdLCB5KTsNCgkJCQl0aWdodEJveE1pblsyXSA9IE1hdGgubWluKHRpZ2h0Qm94TWluWzJdLCB6KTsNCg0KCQkJCXRpZ2h0Qm94TWF4WzBdID0gTWF0aC5tYXgodGlnaHRCb3hNYXhbMF0sIHgpOw0KCQkJCXRpZ2h0Qm94TWF4WzFdID0gTWF0aC5tYXgodGlnaHRCb3hNYXhbMV0sIHkpOw0KCQkJCXRpZ2h0Qm94TWF4WzJdID0gTWF0aC5tYXgodGlnaHRCb3hNYXhbMl0sIHopOw0KCQkJfQ0KDQoJCQlhdHRyaWJ1dGVCdWZmZXJzW3BvaW50QXR0cmlidXRlLm5hbWVdID0geyBidWZmZXI6IGJ1ZmYsIGF0dHJpYnV0ZTogcG9pbnRBdHRyaWJ1dGUgfTsNCgkJfSBlbHNlIGlmIChwb2ludEF0dHJpYnV0ZS5uYW1lID09PSBQb2ludEF0dHJpYnV0ZS5DT0xPUl9QQUNLRUQubmFtZSkgew0KCQkJbGV0IGJ1ZmYgPSBuZXcgQXJyYXlCdWZmZXIobnVtUG9pbnRzICogNCk7DQoJCQlsZXQgY29sb3JzID0gbmV3IFVpbnQ4QXJyYXkoYnVmZik7DQoNCgkJCWZvciAobGV0IGogPSAwOyBqIDwgbnVtUG9pbnRzOyBqKyspIHsNCgkJCQljb2xvcnNbNCAqIGogKyAwXSA9IGN2LmdldFVpbnQ4KGluT2Zmc2V0ICsgaiAqIHBvaW50QXR0cmlidXRlcy5ieXRlU2l6ZSArIDApOw0KCQkJCWNvbG9yc1s0ICogaiArIDFdID0gY3YuZ2V0VWludDgoaW5PZmZzZXQgKyBqICogcG9pbnRBdHRyaWJ1dGVzLmJ5dGVTaXplICsgMSk7DQoJCQkJY29sb3JzWzQgKiBqICsgMl0gPSBjdi5nZXRVaW50OChpbk9mZnNldCArIGogKiBwb2ludEF0dHJpYnV0ZXMuYnl0ZVNpemUgKyAyKTsNCgkJCX0NCg0KCQkJYXR0cmlidXRlQnVmZmVyc1twb2ludEF0dHJpYnV0ZS5uYW1lXSA9IHsgYnVmZmVyOiBidWZmLCBhdHRyaWJ1dGU6IHBvaW50QXR0cmlidXRlIH07DQoJCX0gZWxzZSBpZiAocG9pbnRBdHRyaWJ1dGUubmFtZSA9PT0gUG9pbnRBdHRyaWJ1dGUuSU5URU5TSVRZLm5hbWUpIHsNCgkJCWxldCBidWZmID0gbmV3IEFycmF5QnVmZmVyKG51bVBvaW50cyAqIDQpOw0KCQkJbGV0IGludGVuc2l0aWVzID0gbmV3IEZsb2F0MzJBcnJheShidWZmKTsNCg0KCQkJZm9yIChsZXQgaiA9IDA7IGogPCBudW1Qb2ludHM7IGorKykgew0KCQkJCWxldCBpbnRlbnNpdHkgPSBjdi5nZXRVaW50MTYoaW5PZmZzZXQgKyBqICogcG9pbnRBdHRyaWJ1dGVzLmJ5dGVTaXplLCB0cnVlKTsNCgkJCQlpbnRlbnNpdGllc1tqXSA9IGludGVuc2l0eTsNCgkJCX0NCg0KCQkJYXR0cmlidXRlQnVmZmVyc1twb2ludEF0dHJpYnV0ZS5uYW1lXSA9IHsgYnVmZmVyOiBidWZmLCBhdHRyaWJ1dGU6IHBvaW50QXR0cmlidXRlIH07DQoJCX0gZWxzZSBpZiAocG9pbnRBdHRyaWJ1dGUubmFtZSA9PT0gUG9pbnRBdHRyaWJ1dGUuQ0xBU1NJRklDQVRJT04ubmFtZSkgew0KCQkJbGV0IGJ1ZmYgPSBuZXcgQXJyYXlCdWZmZXIobnVtUG9pbnRzKTsNCgkJCWxldCBjbGFzc2lmaWNhdGlvbnMgPSBuZXcgVWludDhBcnJheShidWZmKTsNCg0KCQkJZm9yIChsZXQgaiA9IDA7IGogPCBudW1Qb2ludHM7IGorKykgew0KCQkJCWxldCBjbGFzc2lmaWNhdGlvbiA9IGN2LmdldFVpbnQ4KGluT2Zmc2V0ICsgaiAqIHBvaW50QXR0cmlidXRlcy5ieXRlU2l6ZSk7DQoJCQkJY2xhc3NpZmljYXRpb25zW2pdID0gY2xhc3NpZmljYXRpb247DQoJCQl9DQoNCgkJCWF0dHJpYnV0ZUJ1ZmZlcnNbcG9pbnRBdHRyaWJ1dGUubmFtZV0gPSB7IGJ1ZmZlcjogYnVmZiwgYXR0cmlidXRlOiBwb2ludEF0dHJpYnV0ZSB9Ow0KCQl9IGVsc2UgaWYgKHBvaW50QXR0cmlidXRlLm5hbWUgPT09IFBvaW50QXR0cmlidXRlLlJFVFVSTl9OVU1CRVIubmFtZSkgew0KCQkJbGV0IGJ1ZmYgPSBuZXcgQXJyYXlCdWZmZXIobnVtUG9pbnRzKTsNCgkJCWxldCByZXR1cm5OdW1iZXJzID0gbmV3IFVpbnQ4QXJyYXkoYnVmZik7DQoNCgkJCWZvciAobGV0IGogPSAwOyBqIDwgbnVtUG9pbnRzOyBqKyspIHsNCgkJCQlsZXQgcmV0dXJuTnVtYmVyID0gY3YuZ2V0VWludDgoaW5PZmZzZXQgKyBqICogcG9pbnRBdHRyaWJ1dGVzLmJ5dGVTaXplKTsNCgkJCQlyZXR1cm5OdW1iZXJzW2pdID0gcmV0dXJuTnVtYmVyOw0KCQkJfQ0KDQoJCQlhdHRyaWJ1dGVCdWZmZXJzW3BvaW50QXR0cmlidXRlLm5hbWVdID0geyBidWZmZXI6IGJ1ZmYsIGF0dHJpYnV0ZTogcG9pbnRBdHRyaWJ1dGUgfTsNCgkJfSBlbHNlIGlmIChwb2ludEF0dHJpYnV0ZS5uYW1lID09PSBQb2ludEF0dHJpYnV0ZS5OVU1CRVJfT0ZfUkVUVVJOUy5uYW1lKSB7DQoJCQlsZXQgYnVmZiA9IG5ldyBBcnJheUJ1ZmZlcihudW1Qb2ludHMpOw0KCQkJbGV0IG51bWJlck9mUmV0dXJucyA9IG5ldyBVaW50OEFycmF5KGJ1ZmYpOw0KDQoJCQlmb3IgKGxldCBqID0gMDsgaiA8IG51bVBvaW50czsgaisrKSB7DQoJCQkJbGV0IG51bWJlck9mUmV0dXJuID0gY3YuZ2V0VWludDgoaW5PZmZzZXQgKyBqICogcG9pbnRBdHRyaWJ1dGVzLmJ5dGVTaXplKTsNCgkJCQludW1iZXJPZlJldHVybnNbal0gPSBudW1iZXJPZlJldHVybjsNCgkJCX0NCg0KCQkJYXR0cmlidXRlQnVmZmVyc1twb2ludEF0dHJpYnV0ZS5uYW1lXSA9IHsgYnVmZmVyOiBidWZmLCBhdHRyaWJ1dGU6IHBvaW50QXR0cmlidXRlIH07DQoJCX0gZWxzZSBpZiAocG9pbnRBdHRyaWJ1dGUubmFtZSA9PT0gUG9pbnRBdHRyaWJ1dGUuU09VUkNFX0lELm5hbWUpIHsNCgkJCWxldCBidWZmID0gbmV3IEFycmF5QnVmZmVyKG51bVBvaW50cyAqIDIpOw0KCQkJbGV0IHNvdXJjZUlEcyA9IG5ldyBVaW50MTZBcnJheShidWZmKTsNCg0KCQkJZm9yIChsZXQgaiA9IDA7IGogPCBudW1Qb2ludHM7IGorKykgew0KCQkJCWxldCBzb3VyY2VJRCA9IGN2LmdldFVpbnQxNihpbk9mZnNldCArIGogKiBwb2ludEF0dHJpYnV0ZXMuYnl0ZVNpemUpOw0KCQkJCXNvdXJjZUlEc1tqXSA9IHNvdXJjZUlEOw0KCQkJfQ0KDQoJCQlhdHRyaWJ1dGVCdWZmZXJzW3BvaW50QXR0cmlidXRlLm5hbWVdID0geyBidWZmZXI6IGJ1ZmYsIGF0dHJpYnV0ZTogcG9pbnRBdHRyaWJ1dGUgfTsNCgkJfSBlbHNlIGlmIChwb2ludEF0dHJpYnV0ZS5uYW1lID09PSBQb2ludEF0dHJpYnV0ZS5OT1JNQUxfU1BIRVJFTUFQUEVELm5hbWUpIHsNCgkJCWxldCBidWZmID0gbmV3IEFycmF5QnVmZmVyKG51bVBvaW50cyAqIDQgKiAzKTsNCgkJCWxldCBub3JtYWxzID0gbmV3IEZsb2F0MzJBcnJheShidWZmKTsNCg0KCQkJZm9yIChsZXQgaiA9IDA7IGogPCBudW1Qb2ludHM7IGorKykgew0KCQkJCWxldCBieCA9IGN2LmdldFVpbnQ4KGluT2Zmc2V0ICsgaiAqIHBvaW50QXR0cmlidXRlcy5ieXRlU2l6ZSArIDApOw0KCQkJCWxldCBieSA9IGN2LmdldFVpbnQ4KGluT2Zmc2V0ICsgaiAqIHBvaW50QXR0cmlidXRlcy5ieXRlU2l6ZSArIDEpOw0KDQoJCQkJbGV0IGV4ID0gYnggLyAyNTU7DQoJCQkJbGV0IGV5ID0gYnkgLyAyNTU7DQoNCgkJCQlsZXQgbnggPSBleCAqIDIgLSAxOw0KCQkJCWxldCBueSA9IGV5ICogMiAtIDE7DQoJCQkJbGV0IG56ID0gMTsNCgkJCQlsZXQgbncgPSAtMTsNCg0KCQkJCWxldCBsID0gKG54ICogKC1ueCkpICsgKG55ICogKC1ueSkpICsgKG56ICogKC1udykpOw0KCQkJCW56ID0gbDsNCgkJCQlueCA9IG54ICogTWF0aC5zcXJ0KGwpOw0KCQkJCW55ID0gbnkgKiBNYXRoLnNxcnQobCk7DQoNCgkJCQlueCA9IG54ICogMjsNCgkJCQlueSA9IG55ICogMjsNCgkJCQlueiA9IG56ICogMiAtIDE7DQoNCgkJCQlub3JtYWxzWzMgKiBqICsgMF0gPSBueDsNCgkJCQlub3JtYWxzWzMgKiBqICsgMV0gPSBueTsNCgkJCQlub3JtYWxzWzMgKiBqICsgMl0gPSBuejsNCgkJCX0NCg0KCQkJYXR0cmlidXRlQnVmZmVyc1twb2ludEF0dHJpYnV0ZS5uYW1lXSA9IHsgYnVmZmVyOiBidWZmLCBhdHRyaWJ1dGU6IHBvaW50QXR0cmlidXRlIH07DQoJCX0gZWxzZSBpZiAocG9pbnRBdHRyaWJ1dGUubmFtZSA9PT0gUG9pbnRBdHRyaWJ1dGUuTk9STUFMX09DVDE2Lm5hbWUpIHsNCgkJCWxldCBidWZmID0gbmV3IEFycmF5QnVmZmVyKG51bVBvaW50cyAqIDQgKiAzKTsNCgkJCWxldCBub3JtYWxzID0gbmV3IEZsb2F0MzJBcnJheShidWZmKTsNCg0KCQkJZm9yIChsZXQgaiA9IDA7IGogPCBudW1Qb2ludHM7IGorKykgew0KCQkJCWxldCBieCA9IGN2LmdldFVpbnQ4KGluT2Zmc2V0ICsgaiAqIHBvaW50QXR0cmlidXRlcy5ieXRlU2l6ZSArIDApOw0KCQkJCWxldCBieSA9IGN2LmdldFVpbnQ4KGluT2Zmc2V0ICsgaiAqIHBvaW50QXR0cmlidXRlcy5ieXRlU2l6ZSArIDEpOw0KDQoJCQkJbGV0IHUgPSAoYnggLyAyNTUpICogMiAtIDE7DQoJCQkJbGV0IHYgPSAoYnkgLyAyNTUpICogMiAtIDE7DQoNCgkJCQlsZXQgeiA9IDEgLSBNYXRoLmFicyh1KSAtIE1hdGguYWJzKHYpOw0KDQoJCQkJbGV0IHggPSAwOw0KCQkJCWxldCB5ID0gMDsNCgkJCQlpZiAoeiA+PSAwKSB7DQoJCQkJCXggPSB1Ow0KCQkJCQl5ID0gdjsNCgkJCQl9IGVsc2Ugew0KCQkJCQl4ID0gLSh2IC8gTWF0aC5zaWduKHYpIC0gMSkgLyBNYXRoLnNpZ24odSk7DQoJCQkJCXkgPSAtKHUgLyBNYXRoLnNpZ24odSkgLSAxKSAvIE1hdGguc2lnbih2KTsNCgkJCQl9DQoNCgkJCQlsZXQgbGVuZ3RoID0gTWF0aC5zcXJ0KHggKiB4ICsgeSAqIHkgKyB6ICogeik7DQoJCQkJeCA9IHggLyBsZW5ndGg7DQoJCQkJeSA9IHkgLyBsZW5ndGg7DQoJCQkJeiA9IHogLyBsZW5ndGg7DQoJCQkJDQoJCQkJbm9ybWFsc1szICogaiArIDBdID0geDsNCgkJCQlub3JtYWxzWzMgKiBqICsgMV0gPSB5Ow0KCQkJCW5vcm1hbHNbMyAqIGogKyAyXSA9IHo7DQoJCQl9DQoNCgkJCWF0dHJpYnV0ZUJ1ZmZlcnNbcG9pbnRBdHRyaWJ1dGUubmFtZV0gPSB7IGJ1ZmZlcjogYnVmZiwgYXR0cmlidXRlOiBwb2ludEF0dHJpYnV0ZSB9Ow0KCQl9IGVsc2UgaWYgKHBvaW50QXR0cmlidXRlLm5hbWUgPT09IFBvaW50QXR0cmlidXRlLk5PUk1BTC5uYW1lKSB7DQoJCQlsZXQgYnVmZiA9IG5ldyBBcnJheUJ1ZmZlcihudW1Qb2ludHMgKiA0ICogMyk7DQoJCQlsZXQgbm9ybWFscyA9IG5ldyBGbG9hdDMyQXJyYXkoYnVmZik7DQoNCgkJCWZvciAobGV0IGogPSAwOyBqIDwgbnVtUG9pbnRzOyBqKyspIHsNCgkJCQlsZXQgeCA9IGN2LmdldEZsb2F0MzIoaW5PZmZzZXQgKyBqICogcG9pbnRBdHRyaWJ1dGVzLmJ5dGVTaXplICsgMCwgdHJ1ZSk7DQoJCQkJbGV0IHkgPSBjdi5nZXRGbG9hdDMyKGluT2Zmc2V0ICsgaiAqIHBvaW50QXR0cmlidXRlcy5ieXRlU2l6ZSArIDQsIHRydWUpOw0KCQkJCWxldCB6ID0gY3YuZ2V0RmxvYXQzMihpbk9mZnNldCArIGogKiBwb2ludEF0dHJpYnV0ZXMuYnl0ZVNpemUgKyA4LCB0cnVlKTsNCgkJCQkNCgkJCQlub3JtYWxzWzMgKiBqICsgMF0gPSB4Ow0KCQkJCW5vcm1hbHNbMyAqIGogKyAxXSA9IHk7DQoJCQkJbm9ybWFsc1szICogaiArIDJdID0gejsNCgkJCX0NCg0KCQkJYXR0cmlidXRlQnVmZmVyc1twb2ludEF0dHJpYnV0ZS5uYW1lXSA9IHsgYnVmZmVyOiBidWZmLCBhdHRyaWJ1dGU6IHBvaW50QXR0cmlidXRlIH07DQoJCX0gZWxzZSBpZiAocG9pbnRBdHRyaWJ1dGUubmFtZSA9PT0gUG9pbnRBdHRyaWJ1dGUuR1BTX1RJTUUubmFtZSkgew0KCQkJbGV0IGJ1ZmYgPSBuZXcgQXJyYXlCdWZmZXIobnVtUG9pbnRzICogOCk7DQoJCQlsZXQgZ3BzdGltZXMgPSBuZXcgRmxvYXQ2NEFycmF5KGJ1ZmYpOw0KDQoJCQlmb3IobGV0IGogPSAwOyBqIDwgbnVtUG9pbnRzOyBqKyspew0KCQkJCWxldCBncHN0aW1lID0gY3YuZ2V0RmxvYXQ2NChpbk9mZnNldCArIGogKiBwb2ludEF0dHJpYnV0ZXMuYnl0ZVNpemUsIHRydWUpOw0KCQkJCWdwc3RpbWVzW2pdID0gZ3BzdGltZTsNCgkJCX0NCgkJCWF0dHJpYnV0ZUJ1ZmZlcnNbcG9pbnRBdHRyaWJ1dGUubmFtZV0gPSB7IGJ1ZmZlcjogYnVmZiwgYXR0cmlidXRlOiBwb2ludEF0dHJpYnV0ZSB9Ow0KCQl9DQoNCgkJaW5PZmZzZXQgKz0gcG9pbnRBdHRyaWJ1dGUuYnl0ZVNpemU7DQoJfQ0KDQoJLy8gQ29udmVydCBHUFMgdGltZSBmcm9tIGRvdWJsZSAodW5zdXBwb3J0ZWQgYnkgV2ViR0wpIHRvIG9yaWdpbi1hbGlnbmVkIGZsb2F0cw0KCWlmKGF0dHJpYnV0ZUJ1ZmZlcnNbUG9pbnRBdHRyaWJ1dGUuR1BTX1RJTUUubmFtZV0peyANCgkJbGV0IGF0dHJpYnV0ZSA9IGF0dHJpYnV0ZUJ1ZmZlcnNbUG9pbnRBdHRyaWJ1dGUuR1BTX1RJTUUubmFtZV07DQoJCWxldCBzb3VyY2VGNjQgPSBuZXcgRmxvYXQ2NEFycmF5KGF0dHJpYnV0ZS5idWZmZXIpOw0KCQlsZXQgdGFyZ2V0ID0gbmV3IEFycmF5QnVmZmVyKG51bVBvaW50cyAqIDQpOw0KCQlsZXQgdGFyZ2V0RjMyID0gbmV3IEZsb2F0MzJBcnJheSh0YXJnZXQpOw0KDQoJCWxldCBtaW4gPSBJbmZpbml0eTsNCgkJbGV0IG1heCA9IC1JbmZpbml0eTsNCgkJZm9yKGxldCBpID0gMDsgaSA8IG51bVBvaW50czsgaSsrKXsNCgkJCWxldCBncHN0aW1lID0gc291cmNlRjY0W2ldOw0KDQoJCQltaW4gPSBNYXRoLm1pbihtaW4sIGdwc3RpbWUpOw0KCQkJbWF4ID0gTWF0aC5tYXgobWF4LCBncHN0aW1lKTsNCgkJfQ0KDQoJCWZvcihsZXQgaSA9IDA7IGkgPCBudW1Qb2ludHM7IGkrKyl7DQoJCQlsZXQgZ3BzdGltZSA9IHNvdXJjZUY2NFtpXTsNCgkJCXRhcmdldEYzMltpXSA9IGdwc3RpbWUgLSBtaW47DQoJCX0NCg0KCQlhdHRyaWJ1dGVCdWZmZXJzW1BvaW50QXR0cmlidXRlLkdQU19USU1FLm5hbWVdID0geyANCgkJCWJ1ZmZlcjogdGFyZ2V0LCANCgkJCWF0dHJpYnV0ZTogUG9pbnRBdHRyaWJ1dGUuR1BTX1RJTUUsDQoJCQlvZmZzZXQ6IG1pbiwNCgkJCXJhbmdlOiBtYXggLSBtaW59Ow0KCX0NCg0KDQoJeyAvLyBhZGQgaW5kaWNlcw0KCQlsZXQgYnVmZiA9IG5ldyBBcnJheUJ1ZmZlcihudW1Qb2ludHMgKiA0KTsNCgkJbGV0IGluZGljZXMgPSBuZXcgVWludDMyQXJyYXkoYnVmZik7DQoNCgkJZm9yIChsZXQgaSA9IDA7IGkgPCBudW1Qb2ludHM7IGkrKykgew0KCQkJaW5kaWNlc1tpXSA9IGk7DQoJCX0NCgkJDQoJCWF0dHJpYnV0ZUJ1ZmZlcnNbUG9pbnRBdHRyaWJ1dGUuSU5ESUNFUy5uYW1lXSA9IHsgYnVmZmVyOiBidWZmLCBhdHRyaWJ1dGU6IFBvaW50QXR0cmlidXRlLklORElDRVMgfTsNCgl9DQoNCglwZXJmb3JtYW5jZS5tYXJrKCJiaW5hcnktZGVjb2Rlci1lbmQiKTsNCg0KCS8veyAvLyBwcmludCB0aW1pbmdzDQoJLy8JLy9wZXJmb3JtYW5jZS5tZWFzdXJlKCJzcGFjaW5nIiwgInNwYWNpbmctc3RhcnQiLCAic3BhY2luZy1lbmQiKTsNCgkvLwlwZXJmb3JtYW5jZS5tZWFzdXJlKCJiaW5hcnktZGVjb2RlciIsICJiaW5hcnktZGVjb2Rlci1zdGFydCIsICJiaW5hcnktZGVjb2Rlci1lbmQiKTsNCgkvLwlsZXQgbWVhc3VyZSA9IHBlcmZvcm1hbmNlLmdldEVudHJpZXNCeVR5cGUoIm1lYXN1cmUiKVswXTsNCgkvLwlsZXQgZHBwID0gMTAwMCAqIG1lYXN1cmUuZHVyYXRpb24gLyBudW1Qb2ludHM7DQoJLy8JbGV0IGRlYnVnTWVzc2FnZSA9IGAke21lYXN1cmUuZHVyYXRpb24udG9GaXhlZCgzKX0gbXMsICR7bnVtUG9pbnRzfSBwb2ludHMsICR7ZHBwLnRvRml4ZWQoMyl9IMK1cyAvIHBvaW50YDsNCgkvLwljb25zb2xlLmxvZyhkZWJ1Z01lc3NhZ2UpOw0KCS8vfQ0KDQoJcGVyZm9ybWFuY2UuY2xlYXJNYXJrcygpOw0KCXBlcmZvcm1hbmNlLmNsZWFyTWVhc3VyZXMoKTsNCg0KCWxldCBtZXNzYWdlID0gew0KCQlidWZmZXI6IGJ1ZmZlciwNCgkJbWVhbjogbWVhbiwNCgkJYXR0cmlidXRlQnVmZmVyczogYXR0cmlidXRlQnVmZmVycywNCgkJdGlnaHRCb3VuZGluZ0JveDogeyBtaW46IHRpZ2h0Qm94TWluLCBtYXg6IHRpZ2h0Qm94TWF4IH0sDQoJCS8vZXN0aW1hdGVkU3BhY2luZzogZXN0aW1hdGVkU3BhY2luZywNCgl9Ow0KDQoJbGV0IHRyYW5zZmVyYWJsZXMgPSBbXTsNCglmb3IgKGxldCBwcm9wZXJ0eSBpbiBtZXNzYWdlLmF0dHJpYnV0ZUJ1ZmZlcnMpIHsNCgkJdHJhbnNmZXJhYmxlcy5wdXNoKG1lc3NhZ2UuYXR0cmlidXRlQnVmZmVyc1twcm9wZXJ0eV0uYnVmZmVyKTsNCgl9DQoJdHJhbnNmZXJhYmxlcy5wdXNoKGJ1ZmZlcik7DQoNCglwb3N0TWVzc2FnZShtZXNzYWdlLCB0cmFuc2ZlcmFibGVzKTsNCn07Cgo=', 'data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQmluYXJ5RGVjb2Rlcldvcmtlci5qcyIsInNvdXJjZXMiOlsic3JjL1ZlcnNpb24uanMiLCJzcmMvbG9hZGVyL1BvaW50QXR0cmlidXRlcy5qcyIsInNyYy93b3JrZXJzL0JpbmFyeURlY29kZXJXb3JrZXIuanMiXSwic291cmNlc0NvbnRlbnQiOlsiXHJcbmV4cG9ydCBjbGFzcyBWZXJzaW9ue1xyXG5cclxuXHRjb25zdHJ1Y3Rvcih2ZXJzaW9uKXtcclxuXHRcdHRoaXMudmVyc2lvbiA9IHZlcnNpb247XHJcblx0XHRsZXQgdm1MZW5ndGggPSAodmVyc2lvbi5pbmRleE9mKCcuJykgPT09IC0xKSA/IHZlcnNpb24ubGVuZ3RoIDogdmVyc2lvbi5pbmRleE9mKCcuJyk7XHJcblx0XHR0aGlzLnZlcnNpb25NYWpvciA9IHBhcnNlSW50KHZlcnNpb24uc3Vic3RyKDAsIHZtTGVuZ3RoKSk7XHJcblx0XHR0aGlzLnZlcnNpb25NaW5vciA9IHBhcnNlSW50KHZlcnNpb24uc3Vic3RyKHZtTGVuZ3RoICsgMSkpO1xyXG5cdFx0aWYgKHRoaXMudmVyc2lvbk1pbm9yLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHR0aGlzLnZlcnNpb25NaW5vciA9IDA7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRuZXdlclRoYW4odmVyc2lvbil7XHJcblx0XHRsZXQgdiA9IG5ldyBWZXJzaW9uKHZlcnNpb24pO1xyXG5cclxuXHRcdGlmICh0aGlzLnZlcnNpb25NYWpvciA+IHYudmVyc2lvbk1ham9yKSB7XHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0fSBlbHNlIGlmICh0aGlzLnZlcnNpb25NYWpvciA9PT0gdi52ZXJzaW9uTWFqb3IgJiYgdGhpcy52ZXJzaW9uTWlub3IgPiB2LnZlcnNpb25NaW5vcikge1xyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGVxdWFsT3JIaWdoZXIodmVyc2lvbil7XHJcblx0XHRsZXQgdiA9IG5ldyBWZXJzaW9uKHZlcnNpb24pO1xyXG5cclxuXHRcdGlmICh0aGlzLnZlcnNpb25NYWpvciA+IHYudmVyc2lvbk1ham9yKSB7XHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0fSBlbHNlIGlmICh0aGlzLnZlcnNpb25NYWpvciA9PT0gdi52ZXJzaW9uTWFqb3IgJiYgdGhpcy52ZXJzaW9uTWlub3IgPj0gdi52ZXJzaW9uTWlub3IpIHtcclxuXHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHR1cFRvKHZlcnNpb24pe1xyXG5cdFx0cmV0dXJuICF0aGlzLm5ld2VyVGhhbih2ZXJzaW9uKTtcclxuXHR9XHJcblxyXG59XHJcblxyXG5cclxuIiwiXHJcblxyXG5leHBvcnQgY29uc3QgUG9pbnRBdHRyaWJ1dGVOYW1lcyA9IHtcclxuXHRQT1NJVElPTl9DQVJURVNJQU46IDAsIC8vIGZsb2F0IHgsIHksIHo7XHJcblx0Q09MT1JfUEFDS0VEOiAxLCAvLyBieXRlIHIsIGcsIGIsIGE7IFx0STogWzAsMV1cclxuXHRDT0xPUl9GTE9BVFNfMTogMiwgLy8gZmxvYXQgciwgZywgYjsgXHRJOiBbMCwxXVxyXG5cdENPTE9SX0ZMT0FUU18yNTU6IDMsIC8vIGZsb2F0IHIsIGcsIGI7IFx0STogWzAsMjU1XVxyXG5cdE5PUk1BTF9GTE9BVFM6IDQsIC8vIGZsb2F0IHgsIHksIHo7XHJcblx0RklMTEVSOiA1LFxyXG5cdElOVEVOU0lUWTogNixcclxuXHRDTEFTU0lGSUNBVElPTjogNyxcclxuXHROT1JNQUxfU1BIRVJFTUFQUEVEOiA4LFxyXG5cdE5PUk1BTF9PQ1QxNjogOSxcclxuXHROT1JNQUw6IDEwLFxyXG5cdFJFVFVSTl9OVU1CRVI6IDExLFxyXG5cdE5VTUJFUl9PRl9SRVRVUk5TOiAxMixcclxuXHRTT1VSQ0VfSUQ6IDEzLFxyXG5cdElORElDRVM6IDE0LFxyXG5cdFNQQUNJTkc6IDE1LFxyXG5cdEdQU19USU1FOiAxNixcclxufTtcclxuXHJcblxyXG4vKipcclxuICogU29tZSB0eXBlcyBvZiBwb3NzaWJsZSBwb2ludCBhdHRyaWJ1dGUgZGF0YSBmb3JtYXRzXHJcbiAqXHJcbiAqIEBjbGFzc1xyXG4gKi9cclxuY29uc3QgUG9pbnRBdHRyaWJ1dGVUeXBlcyA9IHtcclxuXHREQVRBX1RZUEVfRE9VQkxFOiB7b3JkaW5hbDogMCwgc2l6ZTogOH0sXHJcblx0REFUQV9UWVBFX0ZMT0FUOiB7b3JkaW5hbDogMSwgc2l6ZTogNH0sXHJcblx0REFUQV9UWVBFX0lOVDg6IHtvcmRpbmFsOiAyLCBzaXplOiAxfSxcclxuXHREQVRBX1RZUEVfVUlOVDg6IHtvcmRpbmFsOiAzLCBzaXplOiAxfSxcclxuXHREQVRBX1RZUEVfSU5UMTY6IHtvcmRpbmFsOiA0LCBzaXplOiAyfSxcclxuXHREQVRBX1RZUEVfVUlOVDE2OiB7b3JkaW5hbDogNSwgc2l6ZTogMn0sXHJcblx0REFUQV9UWVBFX0lOVDMyOiB7b3JkaW5hbDogNiwgc2l6ZTogNH0sXHJcblx0REFUQV9UWVBFX1VJTlQzMjoge29yZGluYWw6IDcsIHNpemU6IDR9LFxyXG5cdERBVEFfVFlQRV9JTlQ2NDoge29yZGluYWw6IDgsIHNpemU6IDh9LFxyXG5cdERBVEFfVFlQRV9VSU5UNjQ6IHtvcmRpbmFsOiA5LCBzaXplOiA4fVxyXG59O1xyXG5cclxubGV0IGkgPSAwO1xyXG5mb3IgKGxldCBvYmogaW4gUG9pbnRBdHRyaWJ1dGVUeXBlcykge1xyXG5cdFBvaW50QXR0cmlidXRlVHlwZXNbaV0gPSBQb2ludEF0dHJpYnV0ZVR5cGVzW29ial07XHJcblx0aSsrO1xyXG59XHJcblxyXG5leHBvcnQge1BvaW50QXR0cmlidXRlVHlwZXN9O1xyXG5cclxuXHJcbmNsYXNzIFBvaW50QXR0cmlidXRle1xyXG5cdFxyXG5cdGNvbnN0cnVjdG9yKG5hbWUsIHR5cGUsIG51bUVsZW1lbnRzKXtcclxuXHRcdHRoaXMubmFtZSA9IG5hbWU7XHJcblx0XHR0aGlzLnR5cGUgPSB0eXBlO1xyXG5cdFx0dGhpcy5udW1FbGVtZW50cyA9IG51bUVsZW1lbnRzO1xyXG5cdFx0dGhpcy5ieXRlU2l6ZSA9IHRoaXMubnVtRWxlbWVudHMgKiB0aGlzLnR5cGUuc2l6ZTtcclxuXHR9XHJcblxyXG59O1xyXG5cclxuUG9pbnRBdHRyaWJ1dGUuUE9TSVRJT05fQ0FSVEVTSUFOID0gbmV3IFBvaW50QXR0cmlidXRlKFxyXG5cdFBvaW50QXR0cmlidXRlTmFtZXMuUE9TSVRJT05fQ0FSVEVTSUFOLFxyXG5cdFBvaW50QXR0cmlidXRlVHlwZXMuREFUQV9UWVBFX0ZMT0FULCAzKTtcclxuXHJcblBvaW50QXR0cmlidXRlLlJHQkFfUEFDS0VEID0gbmV3IFBvaW50QXR0cmlidXRlKFxyXG5cdFBvaW50QXR0cmlidXRlTmFtZXMuQ09MT1JfUEFDS0VELFxyXG5cdFBvaW50QXR0cmlidXRlVHlwZXMuREFUQV9UWVBFX0lOVDgsIDQpO1xyXG5cclxuUG9pbnRBdHRyaWJ1dGUuQ09MT1JfUEFDS0VEID0gUG9pbnRBdHRyaWJ1dGUuUkdCQV9QQUNLRUQ7XHJcblxyXG5Qb2ludEF0dHJpYnV0ZS5SR0JfUEFDS0VEID0gbmV3IFBvaW50QXR0cmlidXRlKFxyXG5cdFBvaW50QXR0cmlidXRlTmFtZXMuQ09MT1JfUEFDS0VELFxyXG5cdFBvaW50QXR0cmlidXRlVHlwZXMuREFUQV9UWVBFX0lOVDgsIDMpO1xyXG5cclxuUG9pbnRBdHRyaWJ1dGUuTk9STUFMX0ZMT0FUUyA9IG5ldyBQb2ludEF0dHJpYnV0ZShcclxuXHRQb2ludEF0dHJpYnV0ZU5hbWVzLk5PUk1BTF9GTE9BVFMsXHJcblx0UG9pbnRBdHRyaWJ1dGVUeXBlcy5EQVRBX1RZUEVfRkxPQVQsIDMpO1xyXG5cclxuUG9pbnRBdHRyaWJ1dGUuRklMTEVSXzFCID0gbmV3IFBvaW50QXR0cmlidXRlKFxyXG5cdFBvaW50QXR0cmlidXRlTmFtZXMuRklMTEVSLFxyXG5cdFBvaW50QXR0cmlidXRlVHlwZXMuREFUQV9UWVBFX1VJTlQ4LCAxKTtcclxuXHJcblBvaW50QXR0cmlidXRlLklOVEVOU0lUWSA9IG5ldyBQb2ludEF0dHJpYnV0ZShcclxuXHRQb2ludEF0dHJpYnV0ZU5hbWVzLklOVEVOU0lUWSxcclxuXHRQb2ludEF0dHJpYnV0ZVR5cGVzLkRBVEFfVFlQRV9VSU5UMTYsIDEpO1xyXG5cclxuUG9pbnRBdHRyaWJ1dGUuQ0xBU1NJRklDQVRJT04gPSBuZXcgUG9pbnRBdHRyaWJ1dGUoXHJcblx0UG9pbnRBdHRyaWJ1dGVOYW1lcy5DTEFTU0lGSUNBVElPTixcclxuXHRQb2ludEF0dHJpYnV0ZVR5cGVzLkRBVEFfVFlQRV9VSU5UOCwgMSk7XHJcblxyXG5Qb2ludEF0dHJpYnV0ZS5OT1JNQUxfU1BIRVJFTUFQUEVEID0gbmV3IFBvaW50QXR0cmlidXRlKFxyXG5cdFBvaW50QXR0cmlidXRlTmFtZXMuTk9STUFMX1NQSEVSRU1BUFBFRCxcclxuXHRQb2ludEF0dHJpYnV0ZVR5cGVzLkRBVEFfVFlQRV9VSU5UOCwgMik7XHJcblxyXG5Qb2ludEF0dHJpYnV0ZS5OT1JNQUxfT0NUMTYgPSBuZXcgUG9pbnRBdHRyaWJ1dGUoXHJcblx0UG9pbnRBdHRyaWJ1dGVOYW1lcy5OT1JNQUxfT0NUMTYsXHJcblx0UG9pbnRBdHRyaWJ1dGVUeXBlcy5EQVRBX1RZUEVfVUlOVDgsIDIpO1xyXG5cclxuUG9pbnRBdHRyaWJ1dGUuTk9STUFMID0gbmV3IFBvaW50QXR0cmlidXRlKFxyXG5cdFBvaW50QXR0cmlidXRlTmFtZXMuTk9STUFMLFxyXG5cdFBvaW50QXR0cmlidXRlVHlwZXMuREFUQV9UWVBFX0ZMT0FULCAzKTtcclxuXHRcclxuUG9pbnRBdHRyaWJ1dGUuUkVUVVJOX05VTUJFUiA9IG5ldyBQb2ludEF0dHJpYnV0ZShcclxuXHRQb2ludEF0dHJpYnV0ZU5hbWVzLlJFVFVSTl9OVU1CRVIsXHJcblx0UG9pbnRBdHRyaWJ1dGVUeXBlcy5EQVRBX1RZUEVfVUlOVDgsIDEpO1xyXG5cdFxyXG5Qb2ludEF0dHJpYnV0ZS5OVU1CRVJfT0ZfUkVUVVJOUyA9IG5ldyBQb2ludEF0dHJpYnV0ZShcclxuXHRQb2ludEF0dHJpYnV0ZU5hbWVzLk5VTUJFUl9PRl9SRVRVUk5TLFxyXG5cdFBvaW50QXR0cmlidXRlVHlwZXMuREFUQV9UWVBFX1VJTlQ4LCAxKTtcclxuXHRcclxuUG9pbnRBdHRyaWJ1dGUuU09VUkNFX0lEID0gbmV3IFBvaW50QXR0cmlidXRlKFxyXG5cdFBvaW50QXR0cmlidXRlTmFtZXMuU09VUkNFX0lELFxyXG5cdFBvaW50QXR0cmlidXRlVHlwZXMuREFUQV9UWVBFX1VJTlQxNiwgMSk7XHJcblxyXG5Qb2ludEF0dHJpYnV0ZS5JTkRJQ0VTID0gbmV3IFBvaW50QXR0cmlidXRlKFxyXG5cdFBvaW50QXR0cmlidXRlTmFtZXMuSU5ESUNFUyxcclxuXHRQb2ludEF0dHJpYnV0ZVR5cGVzLkRBVEFfVFlQRV9VSU5UMzIsIDEpO1xyXG5cclxuUG9pbnRBdHRyaWJ1dGUuU1BBQ0lORyA9IG5ldyBQb2ludEF0dHJpYnV0ZShcclxuXHRQb2ludEF0dHJpYnV0ZU5hbWVzLlNQQUNJTkcsXHJcblx0UG9pbnRBdHRyaWJ1dGVUeXBlcy5EQVRBX1RZUEVfRkxPQVQsIDEpO1xyXG5cclxuUG9pbnRBdHRyaWJ1dGUuR1BTX1RJTUUgPSBuZXcgUG9pbnRBdHRyaWJ1dGUoXHJcblx0UG9pbnRBdHRyaWJ1dGVOYW1lcy5HUFNfVElNRSxcclxuXHRQb2ludEF0dHJpYnV0ZVR5cGVzLkRBVEFfVFlQRV9ET1VCTEUsIDEpO1xyXG5cclxuZXhwb3J0IHtQb2ludEF0dHJpYnV0ZX07XHJcblxyXG5leHBvcnQgY2xhc3MgUG9pbnRBdHRyaWJ1dGVze1xyXG5cclxuXHRjb25zdHJ1Y3Rvcihwb2ludEF0dHJpYnV0ZXMpe1xyXG5cdFx0dGhpcy5hdHRyaWJ1dGVzID0gW107XHJcblx0XHR0aGlzLmJ5dGVTaXplID0gMDtcclxuXHRcdHRoaXMuc2l6ZSA9IDA7XHJcblxyXG5cdFx0aWYgKHBvaW50QXR0cmlidXRlcyAhPSBudWxsKSB7XHJcblx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgcG9pbnRBdHRyaWJ1dGVzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0bGV0IHBvaW50QXR0cmlidXRlTmFtZSA9IHBvaW50QXR0cmlidXRlc1tpXTtcclxuXHRcdFx0XHRsZXQgcG9pbnRBdHRyaWJ1dGUgPSBQb2ludEF0dHJpYnV0ZVtwb2ludEF0dHJpYnV0ZU5hbWVdO1xyXG5cdFx0XHRcdHRoaXMuYXR0cmlidXRlcy5wdXNoKHBvaW50QXR0cmlidXRlKTtcclxuXHRcdFx0XHR0aGlzLmJ5dGVTaXplICs9IHBvaW50QXR0cmlidXRlLmJ5dGVTaXplO1xyXG5cdFx0XHRcdHRoaXMuc2l6ZSsrO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHJcblx0YWRkKHBvaW50QXR0cmlidXRlKXtcclxuXHRcdHRoaXMuYXR0cmlidXRlcy5wdXNoKHBvaW50QXR0cmlidXRlKTtcclxuXHRcdHRoaXMuYnl0ZVNpemUgKz0gcG9pbnRBdHRyaWJ1dGUuYnl0ZVNpemU7XHJcblx0XHR0aGlzLnNpemUrKztcclxuXHR9O1xyXG5cclxuXHRoYXNDb2xvcnMoKXtcclxuXHRcdGZvciAobGV0IG5hbWUgaW4gdGhpcy5hdHRyaWJ1dGVzKSB7XHJcblx0XHRcdGxldCBwb2ludEF0dHJpYnV0ZSA9IHRoaXMuYXR0cmlidXRlc1tuYW1lXTtcclxuXHRcdFx0aWYgKHBvaW50QXR0cmlidXRlLm5hbWUgPT09IFBvaW50QXR0cmlidXRlTmFtZXMuQ09MT1JfUEFDS0VEKSB7XHJcblx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gZmFsc2U7XHJcblx0fTtcclxuXHJcblx0aGFzTm9ybWFscygpe1xyXG5cdFx0Zm9yIChsZXQgbmFtZSBpbiB0aGlzLmF0dHJpYnV0ZXMpIHtcclxuXHRcdFx0bGV0IHBvaW50QXR0cmlidXRlID0gdGhpcy5hdHRyaWJ1dGVzW25hbWVdO1xyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0cG9pbnRBdHRyaWJ1dGUgPT09IFBvaW50QXR0cmlidXRlLk5PUk1BTF9TUEhFUkVNQVBQRUQgfHxcclxuXHRcdFx0XHRwb2ludEF0dHJpYnV0ZSA9PT0gUG9pbnRBdHRyaWJ1dGUuTk9STUFMX0ZMT0FUUyB8fFxyXG5cdFx0XHRcdHBvaW50QXR0cmlidXRlID09PSBQb2ludEF0dHJpYnV0ZS5OT1JNQUwgfHxcclxuXHRcdFx0XHRwb2ludEF0dHJpYnV0ZSA9PT0gUG9pbnRBdHRyaWJ1dGUuTk9STUFMX09DVDE2KSB7XHJcblx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gZmFsc2U7XHJcblx0fTtcclxuXHJcbn1cclxuIiwiXHJcblxyXG5pbXBvcnQge1ZlcnNpb259IGZyb20gXCIuLi9WZXJzaW9uLmpzXCI7XHJcbmltcG9ydCB7UG9pbnRBdHRyaWJ1dGVzLCBQb2ludEF0dHJpYnV0ZX0gZnJvbSBcIi4uL2xvYWRlci9Qb2ludEF0dHJpYnV0ZXMuanNcIjtcclxuaW1wb3J0IHtJbnRlcmxlYXZlZEJ1ZmZlcn0gZnJvbSBcIi4uL0ludGVybGVhdmVkQnVmZmVyLmpzXCI7XHJcbmltcG9ydCB7dG9JbnRlcmxlYXZlZEJ1ZmZlckF0dHJpYnV0ZX0gZnJvbSBcIi4uL3V0aWxzL3RvSW50ZXJsZWF2ZWRCdWZmZXJBdHRyaWJ1dGUuanNcIjtcclxuXHJcblxyXG5cclxuLyogZ2xvYmFsIG9ubWVzc2FnZTp0cnVlIHBvc3RNZXNzYWdlOmZhbHNlICovXHJcbi8qIGV4cG9ydGVkIG9ubWVzc2FnZSAqL1xyXG4vLyBodHRwOi8vanNwZXJmLmNvbS91aW50OGFycmF5LXZzLWRhdGF2aWV3My8zXHJcbmZ1bmN0aW9uIEN1c3RvbVZpZXcgKGJ1ZmZlcikge1xyXG5cdHRoaXMuYnVmZmVyID0gYnVmZmVyO1xyXG5cdHRoaXMudTggPSBuZXcgVWludDhBcnJheShidWZmZXIpO1xyXG5cclxuXHRsZXQgdG1wID0gbmV3IEFycmF5QnVmZmVyKDgpO1xyXG5cdGxldCB0bXBmID0gbmV3IEZsb2F0MzJBcnJheSh0bXApO1xyXG5cdGxldCB0bXBkID0gbmV3IEZsb2F0NjRBcnJheSh0bXApO1xyXG5cdGxldCB0bXB1OCA9IG5ldyBVaW50OEFycmF5KHRtcCk7XHJcblxyXG5cdHRoaXMuZ2V0VWludDMyID0gZnVuY3Rpb24gKGkpIHtcclxuXHRcdHJldHVybiAodGhpcy51OFtpICsgM10gPDwgMjQpIHwgKHRoaXMudThbaSArIDJdIDw8IDE2KSB8ICh0aGlzLnU4W2kgKyAxXSA8PCA4KSB8IHRoaXMudThbaV07XHJcblx0fTtcclxuXHJcblx0dGhpcy5nZXRVaW50MTYgPSBmdW5jdGlvbiAoaSkge1xyXG5cdFx0cmV0dXJuICh0aGlzLnU4W2kgKyAxXSA8PCA4KSB8IHRoaXMudThbaV07XHJcblx0fTtcclxuXHJcblx0dGhpcy5nZXRGbG9hdDMyID0gZnVuY3Rpb24gKGkpIHtcclxuXHRcdHRtcHU4WzBdID0gdGhpcy51OFtpICsgMF07XHJcblx0XHR0bXB1OFsxXSA9IHRoaXMudThbaSArIDFdO1xyXG5cdFx0dG1wdThbMl0gPSB0aGlzLnU4W2kgKyAyXTtcclxuXHRcdHRtcHU4WzNdID0gdGhpcy51OFtpICsgM107XHJcblxyXG5cdFx0cmV0dXJuIHRtcGZbMF07XHJcblx0fTtcclxuXHJcblx0dGhpcy5nZXRGbG9hdDY0ID0gZnVuY3Rpb24gKGkpIHtcclxuXHRcdHRtcHU4WzBdID0gdGhpcy51OFtpICsgMF07XHJcblx0XHR0bXB1OFsxXSA9IHRoaXMudThbaSArIDFdO1xyXG5cdFx0dG1wdThbMl0gPSB0aGlzLnU4W2kgKyAyXTtcclxuXHRcdHRtcHU4WzNdID0gdGhpcy51OFtpICsgM107XHJcblx0XHR0bXB1OFs0XSA9IHRoaXMudThbaSArIDRdO1xyXG5cdFx0dG1wdThbNV0gPSB0aGlzLnU4W2kgKyA1XTtcclxuXHRcdHRtcHU4WzZdID0gdGhpcy51OFtpICsgNl07XHJcblx0XHR0bXB1OFs3XSA9IHRoaXMudThbaSArIDddO1xyXG5cclxuXHRcdHJldHVybiB0bXBkWzBdO1xyXG5cdH07XHJcblxyXG5cdHRoaXMuZ2V0VWludDggPSBmdW5jdGlvbiAoaSkge1xyXG5cdFx0cmV0dXJuIHRoaXMudThbaV07XHJcblx0fTtcclxufVxyXG5cclxub25tZXNzYWdlID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcblxyXG5cdHBlcmZvcm1hbmNlLm1hcmsoXCJiaW5hcnktZGVjb2Rlci1zdGFydFwiKTtcclxuXHRcclxuXHRsZXQgYnVmZmVyID0gZXZlbnQuZGF0YS5idWZmZXI7XHJcblx0bGV0IHBvaW50QXR0cmlidXRlcyA9IGV2ZW50LmRhdGEucG9pbnRBdHRyaWJ1dGVzO1xyXG5cdGxldCBudW1Qb2ludHMgPSBidWZmZXIuYnl0ZUxlbmd0aCAvIHBvaW50QXR0cmlidXRlcy5ieXRlU2l6ZTtcclxuXHRsZXQgY3YgPSBuZXcgQ3VzdG9tVmlldyhidWZmZXIpO1xyXG5cdGxldCB2ZXJzaW9uID0gbmV3IFZlcnNpb24oZXZlbnQuZGF0YS52ZXJzaW9uKTtcclxuXHRsZXQgbm9kZU9mZnNldCA9IGV2ZW50LmRhdGEub2Zmc2V0O1xyXG5cdGxldCBzY2FsZSA9IGV2ZW50LmRhdGEuc2NhbGU7XHJcblx0bGV0IHNwYWNpbmcgPSBldmVudC5kYXRhLnNwYWNpbmc7XHJcblx0bGV0IGhhc0NoaWxkcmVuID0gZXZlbnQuZGF0YS5oYXNDaGlsZHJlbjtcclxuXHRsZXQgbmFtZSA9IGV2ZW50LmRhdGEubmFtZTtcclxuXHRcclxuXHRsZXQgdGlnaHRCb3hNaW4gPSBbIE51bWJlci5QT1NJVElWRV9JTkZJTklUWSwgTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZLCBOdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFkgXTtcclxuXHRsZXQgdGlnaHRCb3hNYXggPSBbIE51bWJlci5ORUdBVElWRV9JTkZJTklUWSwgTnVtYmVyLk5FR0FUSVZFX0lORklOSVRZLCBOdW1iZXIuTkVHQVRJVkVfSU5GSU5JVFkgXTtcclxuXHRsZXQgbWVhbiA9IFswLCAwLCAwXTtcclxuXHRcclxuXHJcblx0bGV0IGF0dHJpYnV0ZUJ1ZmZlcnMgPSB7fTtcclxuXHRsZXQgaW5PZmZzZXQgPSAwO1xyXG5cdGZvciAobGV0IHBvaW50QXR0cmlidXRlIG9mIHBvaW50QXR0cmlidXRlcy5hdHRyaWJ1dGVzKSB7XHJcblx0XHRcclxuXHRcdGlmIChwb2ludEF0dHJpYnV0ZS5uYW1lID09PSBQb2ludEF0dHJpYnV0ZS5QT1NJVElPTl9DQVJURVNJQU4ubmFtZSkge1xyXG5cdFx0XHRsZXQgYnVmZiA9IG5ldyBBcnJheUJ1ZmZlcihudW1Qb2ludHMgKiA0ICogMyk7XHJcblx0XHRcdGxldCBwb3NpdGlvbnMgPSBuZXcgRmxvYXQzMkFycmF5KGJ1ZmYpO1xyXG5cdFx0XHJcblx0XHRcdGZvciAobGV0IGogPSAwOyBqIDwgbnVtUG9pbnRzOyBqKyspIHtcclxuXHRcdFx0XHRsZXQgeCwgeSwgejtcclxuXHJcblx0XHRcdFx0aWYgKHZlcnNpb24ubmV3ZXJUaGFuKCcxLjMnKSkge1xyXG5cdFx0XHRcdFx0eCA9IChjdi5nZXRVaW50MzIoaW5PZmZzZXQgKyBqICogcG9pbnRBdHRyaWJ1dGVzLmJ5dGVTaXplICsgMCwgdHJ1ZSkgKiBzY2FsZSk7XHJcblx0XHRcdFx0XHR5ID0gKGN2LmdldFVpbnQzMihpbk9mZnNldCArIGogKiBwb2ludEF0dHJpYnV0ZXMuYnl0ZVNpemUgKyA0LCB0cnVlKSAqIHNjYWxlKTtcclxuXHRcdFx0XHRcdHogPSAoY3YuZ2V0VWludDMyKGluT2Zmc2V0ICsgaiAqIHBvaW50QXR0cmlidXRlcy5ieXRlU2l6ZSArIDgsIHRydWUpICogc2NhbGUpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHR4ID0gY3YuZ2V0RmxvYXQzMihqICogcG9pbnRBdHRyaWJ1dGVzLmJ5dGVTaXplICsgMCwgdHJ1ZSkgKyBub2RlT2Zmc2V0WzBdO1xyXG5cdFx0XHRcdFx0eSA9IGN2LmdldEZsb2F0MzIoaiAqIHBvaW50QXR0cmlidXRlcy5ieXRlU2l6ZSArIDQsIHRydWUpICsgbm9kZU9mZnNldFsxXTtcclxuXHRcdFx0XHRcdHogPSBjdi5nZXRGbG9hdDMyKGogKiBwb2ludEF0dHJpYnV0ZXMuYnl0ZVNpemUgKyA4LCB0cnVlKSArIG5vZGVPZmZzZXRbMl07XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRwb3NpdGlvbnNbMyAqIGogKyAwXSA9IHg7XHJcblx0XHRcdFx0cG9zaXRpb25zWzMgKiBqICsgMV0gPSB5O1xyXG5cdFx0XHRcdHBvc2l0aW9uc1szICogaiArIDJdID0gejtcclxuXHJcblx0XHRcdFx0bWVhblswXSArPSB4IC8gbnVtUG9pbnRzO1xyXG5cdFx0XHRcdG1lYW5bMV0gKz0geSAvIG51bVBvaW50cztcclxuXHRcdFx0XHRtZWFuWzJdICs9IHogLyBudW1Qb2ludHM7XHJcblxyXG5cdFx0XHRcdHRpZ2h0Qm94TWluWzBdID0gTWF0aC5taW4odGlnaHRCb3hNaW5bMF0sIHgpO1xyXG5cdFx0XHRcdHRpZ2h0Qm94TWluWzFdID0gTWF0aC5taW4odGlnaHRCb3hNaW5bMV0sIHkpO1xyXG5cdFx0XHRcdHRpZ2h0Qm94TWluWzJdID0gTWF0aC5taW4odGlnaHRCb3hNaW5bMl0sIHopO1xyXG5cclxuXHRcdFx0XHR0aWdodEJveE1heFswXSA9IE1hdGgubWF4KHRpZ2h0Qm94TWF4WzBdLCB4KTtcclxuXHRcdFx0XHR0aWdodEJveE1heFsxXSA9IE1hdGgubWF4KHRpZ2h0Qm94TWF4WzFdLCB5KTtcclxuXHRcdFx0XHR0aWdodEJveE1heFsyXSA9IE1hdGgubWF4KHRpZ2h0Qm94TWF4WzJdLCB6KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0YXR0cmlidXRlQnVmZmVyc1twb2ludEF0dHJpYnV0ZS5uYW1lXSA9IHsgYnVmZmVyOiBidWZmLCBhdHRyaWJ1dGU6IHBvaW50QXR0cmlidXRlIH07XHJcblx0XHR9IGVsc2UgaWYgKHBvaW50QXR0cmlidXRlLm5hbWUgPT09IFBvaW50QXR0cmlidXRlLkNPTE9SX1BBQ0tFRC5uYW1lKSB7XHJcblx0XHRcdGxldCBidWZmID0gbmV3IEFycmF5QnVmZmVyKG51bVBvaW50cyAqIDQpO1xyXG5cdFx0XHRsZXQgY29sb3JzID0gbmV3IFVpbnQ4QXJyYXkoYnVmZik7XHJcblxyXG5cdFx0XHRmb3IgKGxldCBqID0gMDsgaiA8IG51bVBvaW50czsgaisrKSB7XHJcblx0XHRcdFx0Y29sb3JzWzQgKiBqICsgMF0gPSBjdi5nZXRVaW50OChpbk9mZnNldCArIGogKiBwb2ludEF0dHJpYnV0ZXMuYnl0ZVNpemUgKyAwKTtcclxuXHRcdFx0XHRjb2xvcnNbNCAqIGogKyAxXSA9IGN2LmdldFVpbnQ4KGluT2Zmc2V0ICsgaiAqIHBvaW50QXR0cmlidXRlcy5ieXRlU2l6ZSArIDEpO1xyXG5cdFx0XHRcdGNvbG9yc1s0ICogaiArIDJdID0gY3YuZ2V0VWludDgoaW5PZmZzZXQgKyBqICogcG9pbnRBdHRyaWJ1dGVzLmJ5dGVTaXplICsgMik7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGF0dHJpYnV0ZUJ1ZmZlcnNbcG9pbnRBdHRyaWJ1dGUubmFtZV0gPSB7IGJ1ZmZlcjogYnVmZiwgYXR0cmlidXRlOiBwb2ludEF0dHJpYnV0ZSB9O1xyXG5cdFx0fSBlbHNlIGlmIChwb2ludEF0dHJpYnV0ZS5uYW1lID09PSBQb2ludEF0dHJpYnV0ZS5JTlRFTlNJVFkubmFtZSkge1xyXG5cdFx0XHRsZXQgYnVmZiA9IG5ldyBBcnJheUJ1ZmZlcihudW1Qb2ludHMgKiA0KTtcclxuXHRcdFx0bGV0IGludGVuc2l0aWVzID0gbmV3IEZsb2F0MzJBcnJheShidWZmKTtcclxuXHJcblx0XHRcdGZvciAobGV0IGogPSAwOyBqIDwgbnVtUG9pbnRzOyBqKyspIHtcclxuXHRcdFx0XHRsZXQgaW50ZW5zaXR5ID0gY3YuZ2V0VWludDE2KGluT2Zmc2V0ICsgaiAqIHBvaW50QXR0cmlidXRlcy5ieXRlU2l6ZSwgdHJ1ZSk7XHJcblx0XHRcdFx0aW50ZW5zaXRpZXNbal0gPSBpbnRlbnNpdHk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGF0dHJpYnV0ZUJ1ZmZlcnNbcG9pbnRBdHRyaWJ1dGUubmFtZV0gPSB7IGJ1ZmZlcjogYnVmZiwgYXR0cmlidXRlOiBwb2ludEF0dHJpYnV0ZSB9O1xyXG5cdFx0fSBlbHNlIGlmIChwb2ludEF0dHJpYnV0ZS5uYW1lID09PSBQb2ludEF0dHJpYnV0ZS5DTEFTU0lGSUNBVElPTi5uYW1lKSB7XHJcblx0XHRcdGxldCBidWZmID0gbmV3IEFycmF5QnVmZmVyKG51bVBvaW50cyk7XHJcblx0XHRcdGxldCBjbGFzc2lmaWNhdGlvbnMgPSBuZXcgVWludDhBcnJheShidWZmKTtcclxuXHJcblx0XHRcdGZvciAobGV0IGogPSAwOyBqIDwgbnVtUG9pbnRzOyBqKyspIHtcclxuXHRcdFx0XHRsZXQgY2xhc3NpZmljYXRpb24gPSBjdi5nZXRVaW50OChpbk9mZnNldCArIGogKiBwb2ludEF0dHJpYnV0ZXMuYnl0ZVNpemUpO1xyXG5cdFx0XHRcdGNsYXNzaWZpY2F0aW9uc1tqXSA9IGNsYXNzaWZpY2F0aW9uO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRhdHRyaWJ1dGVCdWZmZXJzW3BvaW50QXR0cmlidXRlLm5hbWVdID0geyBidWZmZXI6IGJ1ZmYsIGF0dHJpYnV0ZTogcG9pbnRBdHRyaWJ1dGUgfTtcclxuXHRcdH0gZWxzZSBpZiAocG9pbnRBdHRyaWJ1dGUubmFtZSA9PT0gUG9pbnRBdHRyaWJ1dGUuUkVUVVJOX05VTUJFUi5uYW1lKSB7XHJcblx0XHRcdGxldCBidWZmID0gbmV3IEFycmF5QnVmZmVyKG51bVBvaW50cyk7XHJcblx0XHRcdGxldCByZXR1cm5OdW1iZXJzID0gbmV3IFVpbnQ4QXJyYXkoYnVmZik7XHJcblxyXG5cdFx0XHRmb3IgKGxldCBqID0gMDsgaiA8IG51bVBvaW50czsgaisrKSB7XHJcblx0XHRcdFx0bGV0IHJldHVybk51bWJlciA9IGN2LmdldFVpbnQ4KGluT2Zmc2V0ICsgaiAqIHBvaW50QXR0cmlidXRlcy5ieXRlU2l6ZSk7XHJcblx0XHRcdFx0cmV0dXJuTnVtYmVyc1tqXSA9IHJldHVybk51bWJlcjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0YXR0cmlidXRlQnVmZmVyc1twb2ludEF0dHJpYnV0ZS5uYW1lXSA9IHsgYnVmZmVyOiBidWZmLCBhdHRyaWJ1dGU6IHBvaW50QXR0cmlidXRlIH07XHJcblx0XHR9IGVsc2UgaWYgKHBvaW50QXR0cmlidXRlLm5hbWUgPT09IFBvaW50QXR0cmlidXRlLk5VTUJFUl9PRl9SRVRVUk5TLm5hbWUpIHtcclxuXHRcdFx0bGV0IGJ1ZmYgPSBuZXcgQXJyYXlCdWZmZXIobnVtUG9pbnRzKTtcclxuXHRcdFx0bGV0IG51bWJlck9mUmV0dXJucyA9IG5ldyBVaW50OEFycmF5KGJ1ZmYpO1xyXG5cclxuXHRcdFx0Zm9yIChsZXQgaiA9IDA7IGogPCBudW1Qb2ludHM7IGorKykge1xyXG5cdFx0XHRcdGxldCBudW1iZXJPZlJldHVybiA9IGN2LmdldFVpbnQ4KGluT2Zmc2V0ICsgaiAqIHBvaW50QXR0cmlidXRlcy5ieXRlU2l6ZSk7XHJcblx0XHRcdFx0bnVtYmVyT2ZSZXR1cm5zW2pdID0gbnVtYmVyT2ZSZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGF0dHJpYnV0ZUJ1ZmZlcnNbcG9pbnRBdHRyaWJ1dGUubmFtZV0gPSB7IGJ1ZmZlcjogYnVmZiwgYXR0cmlidXRlOiBwb2ludEF0dHJpYnV0ZSB9O1xyXG5cdFx0fSBlbHNlIGlmIChwb2ludEF0dHJpYnV0ZS5uYW1lID09PSBQb2ludEF0dHJpYnV0ZS5TT1VSQ0VfSUQubmFtZSkge1xyXG5cdFx0XHRsZXQgYnVmZiA9IG5ldyBBcnJheUJ1ZmZlcihudW1Qb2ludHMgKiAyKTtcclxuXHRcdFx0bGV0IHNvdXJjZUlEcyA9IG5ldyBVaW50MTZBcnJheShidWZmKTtcclxuXHJcblx0XHRcdGZvciAobGV0IGogPSAwOyBqIDwgbnVtUG9pbnRzOyBqKyspIHtcclxuXHRcdFx0XHRsZXQgc291cmNlSUQgPSBjdi5nZXRVaW50MTYoaW5PZmZzZXQgKyBqICogcG9pbnRBdHRyaWJ1dGVzLmJ5dGVTaXplKTtcclxuXHRcdFx0XHRzb3VyY2VJRHNbal0gPSBzb3VyY2VJRDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0YXR0cmlidXRlQnVmZmVyc1twb2ludEF0dHJpYnV0ZS5uYW1lXSA9IHsgYnVmZmVyOiBidWZmLCBhdHRyaWJ1dGU6IHBvaW50QXR0cmlidXRlIH07XHJcblx0XHR9IGVsc2UgaWYgKHBvaW50QXR0cmlidXRlLm5hbWUgPT09IFBvaW50QXR0cmlidXRlLk5PUk1BTF9TUEhFUkVNQVBQRUQubmFtZSkge1xyXG5cdFx0XHRsZXQgYnVmZiA9IG5ldyBBcnJheUJ1ZmZlcihudW1Qb2ludHMgKiA0ICogMyk7XHJcblx0XHRcdGxldCBub3JtYWxzID0gbmV3IEZsb2F0MzJBcnJheShidWZmKTtcclxuXHJcblx0XHRcdGZvciAobGV0IGogPSAwOyBqIDwgbnVtUG9pbnRzOyBqKyspIHtcclxuXHRcdFx0XHRsZXQgYnggPSBjdi5nZXRVaW50OChpbk9mZnNldCArIGogKiBwb2ludEF0dHJpYnV0ZXMuYnl0ZVNpemUgKyAwKTtcclxuXHRcdFx0XHRsZXQgYnkgPSBjdi5nZXRVaW50OChpbk9mZnNldCArIGogKiBwb2ludEF0dHJpYnV0ZXMuYnl0ZVNpemUgKyAxKTtcclxuXHJcblx0XHRcdFx0bGV0IGV4ID0gYnggLyAyNTU7XHJcblx0XHRcdFx0bGV0IGV5ID0gYnkgLyAyNTU7XHJcblxyXG5cdFx0XHRcdGxldCBueCA9IGV4ICogMiAtIDE7XHJcblx0XHRcdFx0bGV0IG55ID0gZXkgKiAyIC0gMTtcclxuXHRcdFx0XHRsZXQgbnogPSAxO1xyXG5cdFx0XHRcdGxldCBudyA9IC0xO1xyXG5cclxuXHRcdFx0XHRsZXQgbCA9IChueCAqICgtbngpKSArIChueSAqICgtbnkpKSArIChueiAqICgtbncpKTtcclxuXHRcdFx0XHRueiA9IGw7XHJcblx0XHRcdFx0bnggPSBueCAqIE1hdGguc3FydChsKTtcclxuXHRcdFx0XHRueSA9IG55ICogTWF0aC5zcXJ0KGwpO1xyXG5cclxuXHRcdFx0XHRueCA9IG54ICogMjtcclxuXHRcdFx0XHRueSA9IG55ICogMjtcclxuXHRcdFx0XHRueiA9IG56ICogMiAtIDE7XHJcblxyXG5cdFx0XHRcdG5vcm1hbHNbMyAqIGogKyAwXSA9IG54O1xyXG5cdFx0XHRcdG5vcm1hbHNbMyAqIGogKyAxXSA9IG55O1xyXG5cdFx0XHRcdG5vcm1hbHNbMyAqIGogKyAyXSA9IG56O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRhdHRyaWJ1dGVCdWZmZXJzW3BvaW50QXR0cmlidXRlLm5hbWVdID0geyBidWZmZXI6IGJ1ZmYsIGF0dHJpYnV0ZTogcG9pbnRBdHRyaWJ1dGUgfTtcclxuXHRcdH0gZWxzZSBpZiAocG9pbnRBdHRyaWJ1dGUubmFtZSA9PT0gUG9pbnRBdHRyaWJ1dGUuTk9STUFMX09DVDE2Lm5hbWUpIHtcclxuXHRcdFx0bGV0IGJ1ZmYgPSBuZXcgQXJyYXlCdWZmZXIobnVtUG9pbnRzICogNCAqIDMpO1xyXG5cdFx0XHRsZXQgbm9ybWFscyA9IG5ldyBGbG9hdDMyQXJyYXkoYnVmZik7XHJcblxyXG5cdFx0XHRmb3IgKGxldCBqID0gMDsgaiA8IG51bVBvaW50czsgaisrKSB7XHJcblx0XHRcdFx0bGV0IGJ4ID0gY3YuZ2V0VWludDgoaW5PZmZzZXQgKyBqICogcG9pbnRBdHRyaWJ1dGVzLmJ5dGVTaXplICsgMCk7XHJcblx0XHRcdFx0bGV0IGJ5ID0gY3YuZ2V0VWludDgoaW5PZmZzZXQgKyBqICogcG9pbnRBdHRyaWJ1dGVzLmJ5dGVTaXplICsgMSk7XHJcblxyXG5cdFx0XHRcdGxldCB1ID0gKGJ4IC8gMjU1KSAqIDIgLSAxO1xyXG5cdFx0XHRcdGxldCB2ID0gKGJ5IC8gMjU1KSAqIDIgLSAxO1xyXG5cclxuXHRcdFx0XHRsZXQgeiA9IDEgLSBNYXRoLmFicyh1KSAtIE1hdGguYWJzKHYpO1xyXG5cclxuXHRcdFx0XHRsZXQgeCA9IDA7XHJcblx0XHRcdFx0bGV0IHkgPSAwO1xyXG5cdFx0XHRcdGlmICh6ID49IDApIHtcclxuXHRcdFx0XHRcdHggPSB1O1xyXG5cdFx0XHRcdFx0eSA9IHY7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdHggPSAtKHYgLyBNYXRoLnNpZ24odikgLSAxKSAvIE1hdGguc2lnbih1KTtcclxuXHRcdFx0XHRcdHkgPSAtKHUgLyBNYXRoLnNpZ24odSkgLSAxKSAvIE1hdGguc2lnbih2KTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGxldCBsZW5ndGggPSBNYXRoLnNxcnQoeCAqIHggKyB5ICogeSArIHogKiB6KTtcclxuXHRcdFx0XHR4ID0geCAvIGxlbmd0aDtcclxuXHRcdFx0XHR5ID0geSAvIGxlbmd0aDtcclxuXHRcdFx0XHR6ID0geiAvIGxlbmd0aDtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRub3JtYWxzWzMgKiBqICsgMF0gPSB4O1xyXG5cdFx0XHRcdG5vcm1hbHNbMyAqIGogKyAxXSA9IHk7XHJcblx0XHRcdFx0bm9ybWFsc1szICogaiArIDJdID0gejtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0YXR0cmlidXRlQnVmZmVyc1twb2ludEF0dHJpYnV0ZS5uYW1lXSA9IHsgYnVmZmVyOiBidWZmLCBhdHRyaWJ1dGU6IHBvaW50QXR0cmlidXRlIH07XHJcblx0XHR9IGVsc2UgaWYgKHBvaW50QXR0cmlidXRlLm5hbWUgPT09IFBvaW50QXR0cmlidXRlLk5PUk1BTC5uYW1lKSB7XHJcblx0XHRcdGxldCBidWZmID0gbmV3IEFycmF5QnVmZmVyKG51bVBvaW50cyAqIDQgKiAzKTtcclxuXHRcdFx0bGV0IG5vcm1hbHMgPSBuZXcgRmxvYXQzMkFycmF5KGJ1ZmYpO1xyXG5cclxuXHRcdFx0Zm9yIChsZXQgaiA9IDA7IGogPCBudW1Qb2ludHM7IGorKykge1xyXG5cdFx0XHRcdGxldCB4ID0gY3YuZ2V0RmxvYXQzMihpbk9mZnNldCArIGogKiBwb2ludEF0dHJpYnV0ZXMuYnl0ZVNpemUgKyAwLCB0cnVlKTtcclxuXHRcdFx0XHRsZXQgeSA9IGN2LmdldEZsb2F0MzIoaW5PZmZzZXQgKyBqICogcG9pbnRBdHRyaWJ1dGVzLmJ5dGVTaXplICsgNCwgdHJ1ZSk7XHJcblx0XHRcdFx0bGV0IHogPSBjdi5nZXRGbG9hdDMyKGluT2Zmc2V0ICsgaiAqIHBvaW50QXR0cmlidXRlcy5ieXRlU2l6ZSArIDgsIHRydWUpO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdG5vcm1hbHNbMyAqIGogKyAwXSA9IHg7XHJcblx0XHRcdFx0bm9ybWFsc1szICogaiArIDFdID0geTtcclxuXHRcdFx0XHRub3JtYWxzWzMgKiBqICsgMl0gPSB6O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRhdHRyaWJ1dGVCdWZmZXJzW3BvaW50QXR0cmlidXRlLm5hbWVdID0geyBidWZmZXI6IGJ1ZmYsIGF0dHJpYnV0ZTogcG9pbnRBdHRyaWJ1dGUgfTtcclxuXHRcdH0gZWxzZSBpZiAocG9pbnRBdHRyaWJ1dGUubmFtZSA9PT0gUG9pbnRBdHRyaWJ1dGUuR1BTX1RJTUUubmFtZSkge1xyXG5cdFx0XHRsZXQgYnVmZiA9IG5ldyBBcnJheUJ1ZmZlcihudW1Qb2ludHMgKiA4KTtcclxuXHRcdFx0bGV0IGdwc3RpbWVzID0gbmV3IEZsb2F0NjRBcnJheShidWZmKTtcclxuXHJcblx0XHRcdGZvcihsZXQgaiA9IDA7IGogPCBudW1Qb2ludHM7IGorKyl7XHJcblx0XHRcdFx0bGV0IGdwc3RpbWUgPSBjdi5nZXRGbG9hdDY0KGluT2Zmc2V0ICsgaiAqIHBvaW50QXR0cmlidXRlcy5ieXRlU2l6ZSwgdHJ1ZSk7XHJcblx0XHRcdFx0Z3BzdGltZXNbal0gPSBncHN0aW1lO1xyXG5cdFx0XHR9XHJcblx0XHRcdGF0dHJpYnV0ZUJ1ZmZlcnNbcG9pbnRBdHRyaWJ1dGUubmFtZV0gPSB7IGJ1ZmZlcjogYnVmZiwgYXR0cmlidXRlOiBwb2ludEF0dHJpYnV0ZSB9O1xyXG5cdFx0fVxyXG5cclxuXHRcdGluT2Zmc2V0ICs9IHBvaW50QXR0cmlidXRlLmJ5dGVTaXplO1xyXG5cdH1cclxuXHJcblx0Ly8gQ29udmVydCBHUFMgdGltZSBmcm9tIGRvdWJsZSAodW5zdXBwb3J0ZWQgYnkgV2ViR0wpIHRvIG9yaWdpbi1hbGlnbmVkIGZsb2F0c1xyXG5cdGlmKGF0dHJpYnV0ZUJ1ZmZlcnNbUG9pbnRBdHRyaWJ1dGUuR1BTX1RJTUUubmFtZV0peyBcclxuXHRcdGxldCBhdHRyaWJ1dGUgPSBhdHRyaWJ1dGVCdWZmZXJzW1BvaW50QXR0cmlidXRlLkdQU19USU1FLm5hbWVdO1xyXG5cdFx0bGV0IHNvdXJjZUY2NCA9IG5ldyBGbG9hdDY0QXJyYXkoYXR0cmlidXRlLmJ1ZmZlcik7XHJcblx0XHRsZXQgdGFyZ2V0ID0gbmV3IEFycmF5QnVmZmVyKG51bVBvaW50cyAqIDQpO1xyXG5cdFx0bGV0IHRhcmdldEYzMiA9IG5ldyBGbG9hdDMyQXJyYXkodGFyZ2V0KTtcclxuXHJcblx0XHRsZXQgbWluID0gSW5maW5pdHk7XHJcblx0XHRsZXQgbWF4ID0gLUluZmluaXR5O1xyXG5cdFx0Zm9yKGxldCBpID0gMDsgaSA8IG51bVBvaW50czsgaSsrKXtcclxuXHRcdFx0bGV0IGdwc3RpbWUgPSBzb3VyY2VGNjRbaV07XHJcblxyXG5cdFx0XHRtaW4gPSBNYXRoLm1pbihtaW4sIGdwc3RpbWUpO1xyXG5cdFx0XHRtYXggPSBNYXRoLm1heChtYXgsIGdwc3RpbWUpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZvcihsZXQgaSA9IDA7IGkgPCBudW1Qb2ludHM7IGkrKyl7XHJcblx0XHRcdGxldCBncHN0aW1lID0gc291cmNlRjY0W2ldO1xyXG5cdFx0XHR0YXJnZXRGMzJbaV0gPSBncHN0aW1lIC0gbWluO1xyXG5cdFx0fVxyXG5cclxuXHRcdGF0dHJpYnV0ZUJ1ZmZlcnNbUG9pbnRBdHRyaWJ1dGUuR1BTX1RJTUUubmFtZV0gPSB7IFxyXG5cdFx0XHRidWZmZXI6IHRhcmdldCwgXHJcblx0XHRcdGF0dHJpYnV0ZTogUG9pbnRBdHRyaWJ1dGUuR1BTX1RJTUUsXHJcblx0XHRcdG9mZnNldDogbWluLFxyXG5cdFx0XHRyYW5nZTogbWF4IC0gbWlufTtcclxuXHR9XHJcblxyXG5cdC8vbGV0IGRlYnVnTm9kZXMgPSBbXCJyMDI2XCIsIFwicjAyMjZcIixcInIwMjI3NFwiXTtcclxuXHQvL2lmKGRlYnVnTm9kZXMuaW5jbHVkZXMobmFtZSkpe1xyXG5cdGlmKGZhbHNlKXtcclxuXHRcdGNvbnNvbGUubG9nKFwiZXN0aW1hdGUgc3BhY2luZyFcIik7XHJcblxyXG5cclxuXHRcdGxldCBzcGFyc2VHcmlkID0gbmV3IE1hcCgpO1xyXG5cdFx0bGV0IGdyaWRTaXplID0gMTY7XHJcblxyXG5cdFx0bGV0IHRpZ2h0Qm94U2l6ZSA9IHRpZ2h0Qm94TWF4Lm1hcCggKGEsIGkpID0+IGEgLSB0aWdodEJveE1pbltpXSk7XHJcblx0XHRsZXQgY3ViZUxlbmd0aCA9IE1hdGgubWF4KC4uLnRpZ2h0Qm94U2l6ZSk7XHJcblx0XHRsZXQgY3ViZSA9IHtcclxuXHRcdFx0bWluOiB0aWdodEJveE1pbixcclxuXHRcdFx0bWF4OiB0aWdodEJveE1pbi5tYXAodiA9PiB2ICsgY3ViZUxlbmd0aClcclxuXHRcdH07XHJcblxyXG5cdFx0bGV0IHBvc2l0aW9ucyA9IG5ldyBGbG9hdDMyQXJyYXkoYXR0cmlidXRlQnVmZmVyc1tQb2ludEF0dHJpYnV0ZS5QT1NJVElPTl9DQVJURVNJQU4ubmFtZV0uYnVmZmVyKTtcclxuXHRcdGZvcihsZXQgaSA9IDA7IGkgPCBudW1Qb2ludHM7IGkrKyl7XHJcblx0XHRcdGxldCB4ID0gcG9zaXRpb25zWzMgKiBpICsgMF07XHJcblx0XHRcdGxldCB5ID0gcG9zaXRpb25zWzMgKiBpICsgMV07XHJcblx0XHRcdGxldCB6ID0gcG9zaXRpb25zWzMgKiBpICsgMl07XHJcblxyXG5cdFx0XHRsZXQgaXggPSBNYXRoLm1heCgwLCBNYXRoLm1pbihncmlkU2l6ZSAqICh4IC0gY3ViZS5taW5bMF0pIC8gY3ViZUxlbmd0aCwgZ3JpZFNpemUgLSAxKSk7XHJcblx0XHRcdGxldCBpeSA9IE1hdGgubWF4KDAsIE1hdGgubWluKGdyaWRTaXplICogKHkgLSBjdWJlLm1pblsxXSkgLyBjdWJlTGVuZ3RoLCBncmlkU2l6ZSAtIDEpKTtcclxuXHRcdFx0bGV0IGl6ID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oZ3JpZFNpemUgKiAoeiAtIGN1YmUubWluWzJdKSAvIGN1YmVMZW5ndGgsIGdyaWRTaXplIC0gMSkpO1xyXG5cclxuXHRcdFx0aXggPSBNYXRoLmZsb29yKGl4KTtcclxuXHRcdFx0aXkgPSBNYXRoLmZsb29yKGl5KTtcclxuXHRcdFx0aXogPSBNYXRoLmZsb29yKGl6KTtcclxuXHJcblx0XHRcdGxldCBjZWxsSW5kZXggPSBpeCB8IChpeSA8PCA4KSB8IChpeiA8PCAxNik7XHJcblx0XHRcdFxyXG5cdFx0XHRpZighc3BhcnNlR3JpZC5oYXMoY2VsbEluZGV4KSl7XHJcblx0XHRcdFx0c3BhcnNlR3JpZC5zZXQoY2VsbEluZGV4LCBbXSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHNwYXJzZUdyaWQuZ2V0KGNlbGxJbmRleCkucHVzaChpKTtcclxuXHRcdH1cclxuXHJcblx0XHRsZXQga05lYXJlc3QgPSAocG9pbnRJbmRleCwgY2FuZGlkYXRlcywgbnVtTmVhcmVzdCkgPT4ge1xyXG5cdFx0XHRcclxuXHRcdFx0bGV0IHggPSBwb3NpdGlvbnNbMyAqIHBvaW50SW5kZXggKyAwXTtcclxuXHRcdFx0bGV0IHkgPSBwb3NpdGlvbnNbMyAqIHBvaW50SW5kZXggKyAxXTtcclxuXHRcdFx0bGV0IHogPSBwb3NpdGlvbnNbMyAqIHBvaW50SW5kZXggKyAyXTtcclxuXHJcblx0XHRcdGxldCBjYW5kaWRhdGVEaXN0YW5jZXMgPSBbXTtcclxuXHJcblx0XHRcdGZvcihsZXQgY2FuZGlkYXRlSW5kZXggb2YgY2FuZGlkYXRlcyl7XHJcblx0XHRcdFx0aWYoY2FuZGlkYXRlSW5kZXggPT09IHBvaW50SW5kZXgpe1xyXG5cdFx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRsZXQgY3ggPSBwb3NpdGlvbnNbMyAqIGNhbmRpZGF0ZUluZGV4ICsgMF07XHJcblx0XHRcdFx0bGV0IGN5ID0gcG9zaXRpb25zWzMgKiBjYW5kaWRhdGVJbmRleCArIDFdO1xyXG5cdFx0XHRcdGxldCBjeiA9IHBvc2l0aW9uc1szICogY2FuZGlkYXRlSW5kZXggKyAyXTtcclxuXHJcblx0XHRcdFx0bGV0IHNxdWFyZWREaXN0YW5jZSA9IChjeCAtIHgpICoqIDIgKyAoY3kgLSB5KSAqKiAyICsgKGN6IC0geikgKiogMjtcclxuXHJcblx0XHRcdFx0Y2FuZGlkYXRlRGlzdGFuY2VzLnB1c2goe2NhbmRpZGF0ZUluZGU6IGNhbmRpZGF0ZUluZGV4LCBzcXVhcmVkRGlzdGFuY2U6IHNxdWFyZWREaXN0YW5jZX0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjYW5kaWRhdGVEaXN0YW5jZXMuc29ydCggKGEsIGIpID0+IGEuc3F1YXJlZERpc3RhbmNlIC0gYi5zcXVhcmVkRGlzdGFuY2UpO1xyXG5cdFx0XHRsZXQgbmVhcmVzdCA9IGNhbmRpZGF0ZURpc3RhbmNlcy5zbGljZSgwLCBudW1OZWFyZXN0KTtcclxuXHJcblx0XHRcdHJldHVybiBuZWFyZXN0O1xyXG5cdFx0fTtcclxuXHJcblx0XHRsZXQgbWVhbnNCdWZmZXIgPSBuZXcgQXJyYXlCdWZmZXIobnVtUG9pbnRzICogNCk7XHJcblx0XHRsZXQgbWVhbnMgPSBuZXcgRmxvYXQzMkFycmF5KG1lYW5zQnVmZmVyKTtcclxuXHJcblx0XHRmb3IobGV0IFtrZXksIHZhbHVlXSBvZiBzcGFyc2VHcmlkKXtcclxuXHRcdFx0XHJcblx0XHRcdGZvcihsZXQgcG9pbnRJbmRleCBvZiB2YWx1ZSl7XHJcblxyXG5cdFx0XHRcdGlmKHZhbHVlLmxlbmd0aCA9PT0gMSl7XHJcblx0XHRcdFx0XHRtZWFuc1twb2ludEluZGV4XSA9IDA7XHJcblx0XHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGxldCBbaXgsIGl5LCBpel0gPSBbKGtleSAmIDI1NSksICgoa2V5ID4+IDgpICYgMjU1KSwgKChrZXkgPj4gMTYpICYgMjU1KV07XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0Ly9sZXQgY2FuZGlkYXRlcyA9IHZhbHVlO1xyXG5cdFx0XHRcdGxldCBjYW5kaWRhdGVzID0gW107XHJcblx0XHRcdFx0Zm9yKGxldCBpIG9mIFstMSwgMCwgMV0pe1xyXG5cdFx0XHRcdFx0Zm9yKGxldCBqIG9mIFstMSwgMCwgMV0pe1xyXG5cdFx0XHRcdFx0XHRmb3IobGV0IGsgb2YgWy0xLCAwLCAxXSl7XHJcblx0XHRcdFx0XHRcdFx0bGV0IGNlbGxJbmRleCA9IChpeCArIGkpIHwgKChpeSArIGopIDw8IDgpIHwgKChpeiArIGspIDw8IDE2KTtcclxuXHJcblx0XHRcdFx0XHRcdFx0aWYoc3BhcnNlR3JpZC5oYXMoY2VsbEluZGV4KSl7XHJcblx0XHRcdFx0XHRcdFx0XHRjYW5kaWRhdGVzLnB1c2goLi4uc3BhcnNlR3JpZC5nZXQoY2VsbEluZGV4KSk7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cclxuXHJcblx0XHRcdFx0bGV0IG5lYXJlc3ROZWlnaGJvcnMgPSBrTmVhcmVzdChwb2ludEluZGV4LCBjYW5kaWRhdGVzLCAxMCk7XHJcblxyXG5cdFx0XHRcdGxldCBzdW0gPSAwO1xyXG5cdFx0XHRcdGZvcihsZXQgbmVpZ2hib3Igb2YgbmVhcmVzdE5laWdoYm9ycyl7XHJcblx0XHRcdFx0XHRzdW0gKz0gTWF0aC5zcXJ0KG5laWdoYm9yLnNxdWFyZWREaXN0YW5jZSk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvL2xldCBtZWFuID0gc3VtIC8gbmVhcmVzdE5laWdoYm9ycy5sZW5ndGg7XHJcblx0XHRcdFx0bGV0IG1lYW4gPSBNYXRoLnNxcnQoTWF0aC5tYXgoLi4ubmVhcmVzdE5laWdoYm9ycy5tYXAobiA9PiBuLnNxdWFyZWREaXN0YW5jZSkpKTtcclxuXHJcblx0XHRcdFx0aWYoTnVtYmVyLmlzTmFOKG1lYW4pKXtcclxuXHRcdFx0XHRcdGRlYnVnZ2VyO1xyXG5cdFx0XHRcdH1cclxuXHJcblxyXG5cdFx0XHRcdG1lYW5zW3BvaW50SW5kZXhdID0gbWVhbjtcclxuXHJcblx0XHRcdH1cclxuXHJcblx0XHR9XHJcblxyXG5cclxuXHRcdGxldCBtYXhNZWFuID0gTWF0aC5tYXgoLi4ubWVhbnMpO1xyXG5cdFx0bGV0IG1pbk1lYW4gPSBNYXRoLm1pbiguLi5tZWFucyk7XHJcblxyXG5cdFx0Ly9sZXQgY29sb3JzID0gbmV3IFVpbnQ4QXJyYXkoYXR0cmlidXRlQnVmZmVyc1tQb2ludEF0dHJpYnV0ZS5DT0xPUl9QQUNLRUQubmFtZV0uYnVmZmVyKTtcclxuXHRcdC8vZm9yKGxldCBpID0gMDsgaSA8IG51bVBvaW50czsgaSsrKXtcclxuXHRcdC8vXHRsZXQgdiA9IG1lYW5zW2ldIC8gMC4wNTtcclxuXHJcblx0XHQvL1x0Y29sb3JzWzQgKiBpICsgMF0gPSAyNTUgKiB2O1xyXG5cdFx0Ly9cdGNvbG9yc1s0ICogaSArIDFdID0gMjU1ICogdjtcclxuXHRcdC8vXHRjb2xvcnNbNCAqIGkgKyAyXSA9IDI1NSAqIHY7XHJcblx0XHQvL31cclxuXHJcblx0XHRhdHRyaWJ1dGVCdWZmZXJzW1BvaW50QXR0cmlidXRlLlNQQUNJTkcubmFtZV0gPSB7IGJ1ZmZlcjogbWVhbnNCdWZmZXIsIGF0dHJpYnV0ZTogUG9pbnRBdHRyaWJ1dGUuU1BBQ0lORyB9O1xyXG5cclxuXHJcblx0fVxyXG5cclxuXHJcblx0eyAvLyBhZGQgaW5kaWNlc1xyXG5cdFx0bGV0IGJ1ZmYgPSBuZXcgQXJyYXlCdWZmZXIobnVtUG9pbnRzICogNCk7XHJcblx0XHRsZXQgaW5kaWNlcyA9IG5ldyBVaW50MzJBcnJheShidWZmKTtcclxuXHJcblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IG51bVBvaW50czsgaSsrKSB7XHJcblx0XHRcdGluZGljZXNbaV0gPSBpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRhdHRyaWJ1dGVCdWZmZXJzW1BvaW50QXR0cmlidXRlLklORElDRVMubmFtZV0gPSB7IGJ1ZmZlcjogYnVmZiwgYXR0cmlidXRlOiBQb2ludEF0dHJpYnV0ZS5JTkRJQ0VTIH07XHJcblx0fVxyXG5cclxuXHRwZXJmb3JtYW5jZS5tYXJrKFwiYmluYXJ5LWRlY29kZXItZW5kXCIpO1xyXG5cclxuXHQvL3sgLy8gcHJpbnQgdGltaW5nc1xyXG5cdC8vXHQvL3BlcmZvcm1hbmNlLm1lYXN1cmUoXCJzcGFjaW5nXCIsIFwic3BhY2luZy1zdGFydFwiLCBcInNwYWNpbmctZW5kXCIpO1xyXG5cdC8vXHRwZXJmb3JtYW5jZS5tZWFzdXJlKFwiYmluYXJ5LWRlY29kZXJcIiwgXCJiaW5hcnktZGVjb2Rlci1zdGFydFwiLCBcImJpbmFyeS1kZWNvZGVyLWVuZFwiKTtcclxuXHQvL1x0bGV0IG1lYXN1cmUgPSBwZXJmb3JtYW5jZS5nZXRFbnRyaWVzQnlUeXBlKFwibWVhc3VyZVwiKVswXTtcclxuXHQvL1x0bGV0IGRwcCA9IDEwMDAgKiBtZWFzdXJlLmR1cmF0aW9uIC8gbnVtUG9pbnRzO1xyXG5cdC8vXHRsZXQgZGVidWdNZXNzYWdlID0gYCR7bWVhc3VyZS5kdXJhdGlvbi50b0ZpeGVkKDMpfSBtcywgJHtudW1Qb2ludHN9IHBvaW50cywgJHtkcHAudG9GaXhlZCgzKX0gwrVzIC8gcG9pbnRgO1xyXG5cdC8vXHRjb25zb2xlLmxvZyhkZWJ1Z01lc3NhZ2UpO1xyXG5cdC8vfVxyXG5cclxuXHRwZXJmb3JtYW5jZS5jbGVhck1hcmtzKCk7XHJcblx0cGVyZm9ybWFuY2UuY2xlYXJNZWFzdXJlcygpO1xyXG5cclxuXHRsZXQgbWVzc2FnZSA9IHtcclxuXHRcdGJ1ZmZlcjogYnVmZmVyLFxyXG5cdFx0bWVhbjogbWVhbixcclxuXHRcdGF0dHJpYnV0ZUJ1ZmZlcnM6IGF0dHJpYnV0ZUJ1ZmZlcnMsXHJcblx0XHR0aWdodEJvdW5kaW5nQm94OiB7IG1pbjogdGlnaHRCb3hNaW4sIG1heDogdGlnaHRCb3hNYXggfSxcclxuXHRcdC8vZXN0aW1hdGVkU3BhY2luZzogZXN0aW1hdGVkU3BhY2luZyxcclxuXHR9O1xyXG5cclxuXHRsZXQgdHJhbnNmZXJhYmxlcyA9IFtdO1xyXG5cdGZvciAobGV0IHByb3BlcnR5IGluIG1lc3NhZ2UuYXR0cmlidXRlQnVmZmVycykge1xyXG5cdFx0dHJhbnNmZXJhYmxlcy5wdXNoKG1lc3NhZ2UuYXR0cmlidXRlQnVmZmVyc1twcm9wZXJ0eV0uYnVmZmVyKTtcclxuXHR9XHJcblx0dHJhbnNmZXJhYmxlcy5wdXNoKGJ1ZmZlcik7XHJcblxyXG5cdHBvc3RNZXNzYWdlKG1lc3NhZ2UsIHRyYW5zZmVyYWJsZXMpO1xyXG59O1xyXG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ08sTUFBTSxPQUFPO0FBQ3BCO0FBQ0EsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDO0FBQ3JCLEVBQUUsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7QUFDekIsRUFBRSxJQUFJLFFBQVEsR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksT0FBTyxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3ZGLEVBQUUsSUFBSSxDQUFDLFlBQVksR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQztBQUM1RCxFQUFFLElBQUksQ0FBQyxZQUFZLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDN0QsRUFBRSxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtBQUN0QyxHQUFHLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDO0FBQ3pCLEdBQUc7QUFDSCxFQUFFO0FBQ0Y7QUFDQSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUM7QUFDbkIsRUFBRSxJQUFJLENBQUMsR0FBRyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUMvQjtBQUNBLEVB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SSxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDbEM7QUFDQSxDQUFDLElBQUksR0FBRyxHQUFHLElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlCLENBQUMsSUFBSSxJQUFJLEdBQUcsSUFBSSxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDbEMsQ0FBQyxJQUFJLElBQUksR0FBRyxJQUFJLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNsQyxDQUFDLElBQUksS0FBSyxHQUFHLElBQUksVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ2pDO0FBQ0EsQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLFVBQVUsQ0FBQyxFQUFFO0FBQy9CLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlGLEVBQUUsQ0FBQztBQUNIO0FBQ0EsQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLFVBQVUsQ0FBQyxFQUFFO0FBQy9CLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzVDLEVBQUUsQ0FBQztBQUNIO0FBQ0EsQ0FBQyxJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQyxFQUFFO0FBQ2hDLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQzVCLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQzVCLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQzVCLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQzVCO0FBQ0EsRUFBRSxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNqQixFQUFFLENBQUM7QUFDSDtBQUNBLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUMsRUFBRTtBQUNoQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUM1QixFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUM1QixFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUM1QixFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUM1QixFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUM1QixFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUM1QixFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUM1QixFQUFFLEtBQUss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LENBQUMsUUFBUSxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQztBQUNuRixLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBRyxDQUFDLEdBQUcsZUFBZSxDQUFDLFFBQVEsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUM7QUFDbkYsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxHQUFHLGVBQWUsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDO0FBQ25GLEtBQUssTUFBTTtBQUNYLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxHQUFHLGVBQWUsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMvRSxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsR0FBRyxlQUFlLENBQUMsUUFBUSxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDL0UsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEdBQUcsZUFBZSxDQUFDLFFBQVEsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQy9FLEtBQUs7QUFDTDtBQUNBLElBQUksU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzdCLElBQUksU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzdCLElBQUksU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzdCO0FBQ0EsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLFNBQVMsQ0FBQztBQUM3QixJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsU0FBUyxDQUFDO0FBQzdCLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxTQUFTLENBQUM7QUFDN0I7QUFDQSxJQUFJLFdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUNqRCxJQUFJLFdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUNqRCxJQUFJLFdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUNqRDtBQUNBLElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ2pELElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ2pELElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ2pELElBQUk7QUFDSjtBQUNBLEdBQUcsZ0JBQWdCLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsY0FBYyxFQUFFLENBQUM7QUFDdkYsR0FBRyxNQUFNLElBQUksY0FBYyxDQUFDLElBQUksS0FB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', false);
/* eslint-enable */

class BinaryLoader{

	constructor(version, boundingBox, scale){
		if (typeof (version) === 'string') {
			this.version = new Version(version);
		} else {
			this.version = version;
		}

		this.boundingBox = boundingBox;
		this.scale = scale;
	}

	load(node){
		return new Promise((resolve, reject)=>{
		if (node.loaded) {
			return;
		}

		let url = node.getURL();

		if (this.version.equalOrHigher('1.4')) {
			url += '.bin';
		}

		let xhr = XHRFactory.createXMLHttpRequest();
		xhr.open('GET', url, true);
		xhr.responseType = 'arraybuffer';
		xhr.overrideMimeType('text/plain; charset=x-user-defined');
		xhr.onreadystatechange = () => {
			if (xhr.readyState === 4) {
				if((xhr.status === 200 || xhr.status === 0) &&  xhr.response !== null){
					let buffer = xhr.response;
					this.parse(node, buffer).then(()=>{
						resolve();
					});
				} else {
					throw new Error(`Failed to load file! HTTP status: ${xhr.status}, file: ${url}`);
				}
			}
		};
		
		try {
			xhr.send(null);
		} catch (e) {
			console.log('fehler beim laden der punktwolke: ' + e);
		}
		});
	};

	parse(node, buffer){
		return new Promise((resolve, reject)=>{
		let pointAttributes = node.pcoGeometry.pointAttributes;

		// if (this.version.upTo('1.5')) {
		// 	let numPoints = buffer.byteLength / pointAttributes.byteSize;
		// 	node.numPoints = numPoints;
		// }

		let workerCls = WorkerFactory;
		let worker = workerPool.getWorker(workerCls);
		const version  = this.version;
		worker.onmessage = function (e) {
			workerPool.returnWorker(workerCls, worker);

			let data = e.data;
			node.parse(data, version);
			resolve();
			/*

			let buffers = data.attributeBuffers;
			let tightBoundingBox = new THREE.Box3(
				new THREE.Vector3().fromArray(data.tightBoundingBox.min),
				new THREE.Vector3().fromArray(data.tightBoundingBox.max)
			);

			let geometry = new THREE.BufferGeometry();

			for(let property in buffers){
				let buffer = buffers[property].buffer;

				if (parseInt(property) === PointAttributeNames.POSITION_CARTESIAN) {
					geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(buffer), 3));
				} else if (parseInt(property) === PointAttributeNames.COLOR_PACKED) {
					geometry.addAttribute('color', new THREE.BufferAttribute(new Uint8Array(buffer), 4, true));
				} else if (parseInt(property) === PointAttributeNames.INTENSITY) {
					geometry.addAttribute('intensity', new THREE.BufferAttribute(new Float32Array(buffer), 1));
				} else if (parseInt(property) === PointAttributeNames.CLASSIFICATION) {
					geometry.addAttribute('classification', new THREE.BufferAttribute(new Uint8Array(buffer), 1));
				} else if (parseInt(property) === PointAttributeNames.RETURN_NUMBER) {
					geometry.addAttribute('returnNumber', new THREE.BufferAttribute(new Uint8Array(buffer), 1));
				} else if (parseInt(property) === PointAttributeNames.NUMBER_OF_RETURNS) {
					geometry.addAttribute('numberOfReturns', new THREE.BufferAttribute(new Uint8Array(buffer), 1));
				} else if (parseInt(property) === PointAttributeNames.SOURCE_ID) {
					geometry.addAttribute('pointSourceID', new THREE.BufferAttribute(new Uint16Array(buffer), 1));
				} else if (parseInt(property) === PointAttributeNames.NORMAL_SPHEREMAPPED) {
					geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(buffer), 3));
				} else if (parseInt(property) === PointAttributeNames.NORMAL_OCT16) {
					geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(buffer), 3));
				} else if (parseInt(property) === PointAttributeNames.NORMAL) {
					geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(buffer), 3));
				} else if (parseInt(property) === PointAttributeNames.INDICES) {
					let bufferAttribute = new THREE.BufferAttribute(new Uint8Array(buffer), 4);
					bufferAttribute.normalized = true;
					geometry.addAttribute('indices', bufferAttribute);
				} else if (parseInt(property) === PointAttributeNames.SPACING) {
					let bufferAttribute = new THREE.BufferAttribute(new Float32Array(buffer), 1);
					geometry.addAttribute('spacing', bufferAttribute);
				} else if (parseInt(property) === PointAttributeNames.GPS_TIME) {
					let bufferAttribute = new THREE.BufferAttribute(new Float32Array(buffer), 1);
					geometry.addAttribute('gpsTime', bufferAttribute);

					node.gpsTime = {
						offset: buffers[property].offset,
						range: buffers[property].range,
					};
				}
			}


			tightBoundingBox.max.sub(tightBoundingBox.min);
			tightBoundingBox.min.set(0, 0, 0);

			let numPoints = e.data.buffer.byteLength / pointAttributes.byteSize;
			
			node.numPoints = numPoints;
			node.geometry = geometry;
			node.mean = new THREE.Vector3(...data.mean);
			node.tightBoundingBox = tightBoundingBox;
			node.loaded = true;
			node.loading = false;
			node.estimatedSpacing = data.estimatedSpacing;
			Potree.numNodesLoading--;
			*/
		};

		let message = {
			buffer: buffer,
			pointAttributes: pointAttributes,
			version: this.version.version,
			min: [ node.boundingBox.min.x, node.boundingBox.min.y, node.boundingBox.min.z ],
			offset: [node.pcoGeometry.offset.x, node.pcoGeometry.offset.y, node.pcoGeometry.offset.z],
			scale: this.scale,
			spacing: node.spacing,
			hasChildren: node.hasChildren,
			name: node.name
		};
		worker.postMessage(message, [message.buffer]);
		});
	};

	
}

class POCLoader {

	static load(url, callback){
		try {
			let pco = new PointCloudOctreeGeometry();
			pco.url = url;
			let xhr = XHRFactory.createXMLHttpRequest();
			xhr.open('GET', url, true);

			xhr.onreadystatechange = function () {
				if (xhr.readyState === 4 && (xhr.status === 200 || xhr.status === 0)) {
					let fMno = JSON.parse(xhr.responseText);

					let version = new Version(fMno.version);

					// assume octreeDir is absolute if it starts with http
					if (fMno.octreeDir.indexOf('http') === 0) {
						pco.octreeDir = fMno.octreeDir;
					} else {
						pco.octreeDir = url + '/../' + fMno.octreeDir;
					}

					pco.numPoints = fMno.points;
					pco.spacing = fMno.spacing;
					pco.hierarchyStepSize = fMno.hierarchyStepSize;

					pco.pointAttributes = fMno.pointAttributes;

					let min = new zeaEngine.Vec3(fMno.boundingBox.lx, fMno.boundingBox.ly, fMno.boundingBox.lz);
					let max = new zeaEngine.Vec3(fMno.boundingBox.ux, fMno.boundingBox.uy, fMno.boundingBox.uz);
					let boundingBox = new zeaEngine.Box3(min, max);
					let tightBoundingBox = boundingBox.clone();

					if (fMno.tightBoundingBox) {
						tightBoundingBox.min.set(fMno.tightBoundingBox.lx, fMno.tightBoundingBox.ly, fMno.tightBoundingBox.lz);
						tightBoundingBox.max.set(fMno.tightBoundingBox.ux, fMno.tightBoundingBox.uy, fMno.tightBoundingBox.uz);
					}

					let offset = min.clone();

					boundingBox.min.subtractInPlace(offset);
					boundingBox.max.subtractInPlace(offset);

					tightBoundingBox.min.subtractInPlace(offset);
					tightBoundingBox.max.subtractInPlace(offset);

					pco.projection = fMno.projection;
					pco.boundingBox = boundingBox;
					pco.tightBoundingBox = tightBoundingBox;
					pco.boundingSphere = boundingBox.getBoundingSphere();
					pco.tightBoundingSphere = tightBoundingBox.getBoundingSphere();
					pco.offset = offset;
					if (fMno.pointAttributes === 'LAS') {
						pco.loader = new LasLazLoader(fMno.version);
					} else if (fMno.pointAttributes === 'LAZ') {
						pco.loader = new LasLazLoader(fMno.version);
					} else {
						pco.loader = new BinaryLoader(fMno.version, boundingBox, fMno.scale);
						pco.pointAttributes = new PointAttributes(pco.pointAttributes);
					}

					let nodes = {};

					{ // load root
						let name = 'r';

						let root = new PointCloudOctreeGeometryNode(name, pco, boundingBox);
						root.level = 0;
						root.hasChildren = true;
						root.spacing = pco.spacing;
						if (version.upTo('1.5')) {
							root.numPoints = fMno.hierarchy[0][1];
						} else {
							root.numPoints = 0;
						}
						pco.root = root;
						pco.root.load();
						nodes[name] = root;
					}

					// load remaining hierarchy
					if (version.upTo('1.4')) {
						for (let i = 1; i < fMno.hierarchy.length; i++) {
							let name = fMno.hierarchy[i][0];
							let numPoints = fMno.hierarchy[i][1];
							let index = parseInt(name.charAt(name.length - 1));
							let parentName = name.substring(0, name.length - 1);
							let parentNode = nodes[parentName];
							let level = name.length - 1;
							//let boundingBox = POCLoader.createChildAABB(parentNode.boundingBox, index);
							let boundingBox = Utils.createChildAABB(parentNode.boundingBox, index);

							let node = new PointCloudOctreeGeometryNode(name, pco, boundingBox);
							node.level = level;
							node.numPoints = numPoints;
							node.spacing = pco.spacing / Math.pow(2, level);
							parentNode.addChild(node);
							nodes[name] = node;
						}
					}

					pco.nodes = nodes;

					callback(pco);
				}
			};

			xhr.send(null);
		} catch (e) {
			console.log("loading failed: '" + url + "'");
			console.log(e);

			callback();
		}
	}

	loadPointAttributes(mno){
		let fpa = mno.pointAttributes;
		let pa = new PointAttributes();

		for (let i = 0; i < fpa.length; i++) {
			let pointAttribute = PointAttribute[fpa[i]];
			pa.add(pointAttribute);
		}

		return pa;
	}

	createChildAABB(aabb, index){
		let min = aabb.min.clone();
		let max = aabb.max.clone();
		// let size = new Vec3().subVectors(max, min);
		let size = max.subtract(min);

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

		return new zeaEngine.Box3(min, max);
	}
}

// Note: replaces PointCloudOctree.
// 
class PointCloudAsset extends zeaEngine.AssetItem {

  constructor(){
    super();
    
    this.loaded.setToggled(false);

    this.pointBudget = 5 * 1000 * 1000;
    this.minimumNodeVSize = 0.2; // Size, not in pixels, but a fraction of scnreen V height.
    this.level = 0;
    this.visibleNodes = [];

    this.__loaded = false;

    // this.fileParam = this.addParameter(new FilePathParameter('File'))
    // this.fileParam.valueChanged.connect(mode => {
    //   this.loaded.untoggle()
  	//   this.loadPointCloud(path, name)
    // })
    this.addParameter(new zeaEngine.NumberParameter('Version', 0));
    this.addParameter(new zeaEngine.NumberParameter('Num Points', 0));
  }

  getGlobalMat4() {
    return this.getGlobalXfo().toMat4();
  }
  
  _cleanBoundingBox(bbox) {
    bbox = super._cleanBoundingBox(bbox);
    const mat4 = this.getGlobalMat4();
    const geomBox = new zeaEngine.Box3();
    const { min, max } = this.pcoGeometry.tightBoundingBox;
    geomBox.min.set(min.x, min.y, min.z);
    geomBox.max.set(max.x, max.y, max.z);
    bbox.addBox3(geomBox, mat4);
    return bbox;
  }

  setGeometry(pcoGeometry) {

    this.pcoGeometry = pcoGeometry;
		const mode = zeaEngine.ValueSetMode.DATA_LOAD;

    const xfo = this.getGlobalXfo();
    xfo.tr = this.pcoGeometry.offset;
    this.setGlobalXfo(xfo, mode);

		this.getParameter('Version').setValue(parseFloat(pcoGeometry.version), mode);
		if (pcoGeometry.numPoints)
			this.getParameter('Num Points').setValue(pcoGeometry.numPoints, mode);
    
    // this._setBoundingBoxDirty()

    this.loaded.emit();

    // if (this.viewport)
    //   this.updateVisibility();
  }

  getGeometry() {
      return this.pcoGeometry;
  };
  
  // // Load and add point cloud to scene
  loadPointCloud(path, name) {
    return new Promise((resolve, reject) => {
      POCLoader.load(path, geometry => {
        if (!geometry) {
          reject(`failed to load point cloud from URL: ${path}`);
        } else {
          this.setGeometry(geometry);
          resolve(geometry);
        }
      });
    });
  }
}

let globalCounter = 0;

class GLOctTreeNode extends zeaEngine.GLPoints {
  constructor(gl, node, ) {
    super(gl, node.points);
    this.node = node;

    // this.offset = node.offset;
    this.id = ++globalCounter;
    this.loaded = true; // only for LRU. Safely remove after refactoring.
    

    this.children = [];
  }



  // bind(renderstate){
  //   super.bind(renderstate);

  // }

  get numPoints(){
    return this.node.numPoints;
  }

  dispose() {
    this.destroy();
  }
}

class GLPointCloudAsset extends zeaEngine.GLPass {
  constructor(gl, pointcloudAsset, glshader){

    super();

    this.gl = gl;
    this.pointcloudAsset = pointcloudAsset;

    const xfoParam =  pointcloudAsset.getParameter('GlobalXfo');
    const updateXfo = ()=>{
      const xfo = xfoParam.getValue();
      this.spacing = pointcloudAsset.pcoGeometry.spacing * Math.max(xfo.sc.x, xfo.sc.y, xfo.sc.z);
      this.modelMatrixArray =  xfo.toMat4().asArray();
    };
    xfoParam.valueChanged.connect(updateXfo);
    updateXfo();

    this.visible = pointcloudAsset.getVisible();
    pointcloudAsset.visibilityChanged.connect(()=>{
      this.visible = pointcloudAsset.getVisible();
      this.updated.emit();
    });
    
    this.octreeSize = pointcloudAsset.pcoGeometry.boundingBox.size().x;

    this.visibleNodes = [];
    this.visibleGLNodes = [];
    this.gloctreenodes = [];
    this.map = new Map();
    this.freeList = [];

    this.updated = new zeaEngine.Signal();
  }

  setVisibleNodes(visibleNodes, lru, offsets){
    let visChanged = this.visibleNodes.length != visibleNodes.length;
    if(!visChanged) {
      visChanged = visibleNodes.some((node, index) => {
        return this.visibleNodes[index] != node;
      });
    }
    if(visChanged) {
      const gl = this.gl;

      this.visibleGLNodes = [];
      // Iterate backwards to lru touches the closests node last.
      for(let i=visibleNodes.length-1; i>=0; i--) {
        const node = visibleNodes[i];
        if (!this.map.has(node)) {

          // console.log("GLPoints:", node.name, node.offset);
          const gloctreenode = new GLOctTreeNode(gl, node);
          const index = this.freeList.length > 0 ? this.freeList.pop() : this.gloctreenodes.length;
          this.gloctreenodes[index] = gloctreenode;
          this.map.set(node, index);
          
          // Build the tree of gl nodes so we can clean them up later.
          // if (node.name.length > 1){
          //   const parentName = node.name.slice(0, -1);
          //   let parent = this.map.get(parentName);
          //   parent.children.push(gloctreenode);
          // }

          gloctreenode.destructing.connect(() => {
            this.map.delete(node);
            this.freeList.push(index);
            this.gloctreenodes[index] = null;

            const drawIndex = this.visibleGLNodes.indexOf(gloctreenode);
            if (drawIndex >= 0)
              this.visibleGLNodes.splice(drawIndex, 1);
          });
        }
        const gloctreenode = this.gloctreenodes[this.map.get(node)];
        this.visibleGLNodes.push(gloctreenode);

        // At every visiblity change, the offset in the texture changes.
        gloctreenode.vnStart = offsets.get(node);

        lru.touch(gloctreenode);
      }
      this.updated.emit();
    }
  }

  getGeomItem(){
    return this.pointcloudAsset;
  }

  __drawNodes(renderstate){
    const gl = this.gl;
    const { unifs } = renderstate;
    const { modelMatrix, offset, uOctreeSize, uOctreeSpacing, uVNStart, uLevel } = unifs;
    gl.uniformMatrix4fv(modelMatrix.location, false, this.modelMatrixArray);
    
    if (uOctreeSize)
      gl.uniform1f(uOctreeSize.location, this.octreeSize);

    if (uOctreeSpacing)
      gl.uniform1f(uOctreeSpacing.location, this.spacing);

    this.visibleGLNodes.forEach(glpoints => {
      const node = glpoints.node;

      gl.uniform3fv(offset.location, node.offset.asArray());
      
      if (uVNStart)
        gl.uniform1i(uVNStart.location, glpoints.vnStart);
      if (uLevel)
        gl.uniform1f(uLevel.location, node.level);

      glpoints.bind(renderstate);
      renderstate.bindViewports(unifs, () => {
        glpoints.draw(renderstate);
      });
    });
  }

  draw(renderstate) {
    if (this.visibleGLNodes.length == 0 || !this.visible) return;
    this.__drawNodes(renderstate);
  }

  drawHighlightedGeoms(renderstate) {
    if (this.visibleGLNodes.length == 0 || !this.visible) return;
    const gl = this.gl;
    const { highlightColor } = renderstate.unifs;
    if (highlightColor) {
        gl.uniform4fv(highlightColor.location, this.pointcloudAsset.getHighlight().asArray());
    }
    this.__drawNodes(renderstate);
  }

  drawGeomData(renderstate) {
    if (this.visibleGLNodes.length == 0 || !this.visible) return;
    this.__drawNodes(renderstate);
  }

}

/*
** Binary Heap implementation in Javascript
** From: http://eloquentjavascript.net/1st_edition/appendix2.htmlt
**
** Copyright (c) 2007 Marijn Haverbeke, last modified on November 28 2013.
**
** Licensed under a Creative Commons attribution-noncommercial license. 
** All code in this book may also be considered licensed under an MIT license.
*/



function BinaryHeap(scoreFunction){
  this.content = [];
  this.scoreFunction = scoreFunction;
}

BinaryHeap.prototype = {
  push: function(element) {
    // Add the new element to the end of the array.
    this.content.push(element);
    // Allow it to bubble up.
    this.bubbleUp(this.content.length - 1);
  },

  pop: function() {
    // Store the first element so we can return it later.
    var result = this.content[0];
    // Get the element at the end of the array.
    var end = this.content.pop();
    // If there are any elements left, put the end element at the
    // start, and let it sink down.
    if (this.content.length > 0) {
      this.content[0] = end;
      this.sinkDown(0);
    }
    return result;
  },

  remove: function(node) {
    var length = this.content.length;
    // To remove a value, we must search through the array to find
    // it.
    for (var i = 0; i < length; i++) {
      if (this.content[i] != node) continue;
      // When it is found, the process seen in 'pop' is repeated
      // to fill up the hole.
      var end = this.content.pop();
      // If the element we popped was the one we needed to remove,
      // we're done.
      if (i == length - 1) break;
      // Otherwise, we replace the removed element with the popped
      // one, and allow it to float up or sink down as appropriate.
      this.content[i] = end;
      this.bubbleUp(i);
      this.sinkDown(i);
      break;
    }
  },

  size: function() {
    return this.content.length;
  },

  bubbleUp: function(n) {
    // Fetch the element that has to be moved.
    var element = this.content[n], score = this.scoreFunction(element);
    // When at 0, an element can not go up any further.
    while (n > 0) {
      // Compute the parent element's index, and fetch it.
      var parentN = Math.floor((n + 1) / 2) - 1,
      parent = this.content[parentN];
      // If the parent has a lesser score, things are in order and we
      // are done.
      if (score >= this.scoreFunction(parent))
        break;

      // Otherwise, swap the parent with the current element and
      // continue.
      this.content[parentN] = element;
      this.content[n] = parent;
      n = parentN;
    }
  },

  sinkDown: function(n) {
    // Look up the target element and its score.
    var length = this.content.length,
    element = this.content[n],
    elemScore = this.scoreFunction(element);

    while(true) {
      // Compute the indices of the child elements.
      var child2N = (n + 1) * 2, child1N = child2N - 1;
      // This is used to store the new position of the element,
      // if any.
      var swap = null;
      // If the first child exists (is inside the array)...
      if (child1N < length) {
        // Look it up and compute its score.
        var child1 = this.content[child1N],
        child1Score = this.scoreFunction(child1);
        // If the score is less than our element's, we need to swap.
        if (child1Score < elemScore)
          swap = child1N;
      }
      // Do the same checks for the other child.
      if (child2N < length) {
        var child2 = this.content[child2N],
        child2Score = this.scoreFunction(child2);
        if (child2Score < (swap == null ? elemScore : child1Score))
          swap = child2N;
      }

      // No need to swap further, we are done.
      if (swap == null) break;

      // Otherwise, swap and continue.
      this.content[n] = this.content[swap];
      this.content[swap] = element;
      n = swap;
    }
  }
};

class PotreePointsShader extends zeaEngine.GLShader {
  constructor(gl) {
    super(gl);
    this.__shaderStages['VERTEX_SHADER'] = zeaEngine.shaderLibrary.parseShader(
      'PointsShader.vertexShader',
      `
precision highp float;

instancedattribute vec3 positions;
instancedattribute vec4 colors;

uniform vec3 offset;
uniform float uOctreeSize;
uniform int uVNStart;
uniform float uLevel;
uniform float uOctreeSpacing;
uniform sampler2D visibleNodes;


uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform float PointSize;

<%include file="utils/quadVertexFromID.glsl"/>

/* VS Outputs */
varying vec4 v_color;
varying vec2 v_texCoord;
varying vec3 v_viewPos;

// ---------------------
// OCTREE
// ---------------------

/**
 * number of 1-bits up to inclusive index position
 * number is treated as if it were an integer in the range 0-255
 *
 */
int numberOfOnes(int number, int index){
    int numOnes = 0;
    int tmp = 128;
    for(int i = 7; i >= 0; i--){
        
        if(number >= tmp){
            number = number - tmp;

            if(i <= index){
                numOnes++;
            }
        }
        
        tmp = tmp / 2;
    }

    return numOnes;
}


/**
 * checks whether the bit at index is 1
 * number is treated as if it were an integer in the range 0-255
 *
 */
bool isBitSet(int number, int index){

    // weird multi else if due to lack of proper array, int and bitwise support in WebGL 1.0
    int powi = 1;
    if(index == 0){
        powi = 1;
    }else if(index == 1){
        powi = 2;
    }else if(index == 2){
        powi = 4;
    }else if(index == 3){
        powi = 8;
    }else if(index == 4){
        powi = 16;
    }else if(index == 5){
        powi = 32;
    }else if(index == 6){
        powi = 64;
    }else if(index == 7){
        powi = 128;
    }else{
        return false;
    }

    int ndp = number / powi;

    return mod(float(ndp), 2.0) != 0.0;
}


/**
 * find the LOD at the point position
 */
float getLOD(vec3 position){
    
    vec3 offset = vec3(0.0, 0.0, 0.0);
    int iOffset = uVNStart;
    float depth = uLevel;
    for(float i = 0.0; i <= 30.0; i++){
        float nodeSizeAtLevel = uOctreeSize / pow(2.0, i + uLevel + 0.0);
        
        vec3 index3d = (position-offset) / nodeSizeAtLevel;
        index3d = floor(index3d + 0.5);
        int index = int(round(4.0 * index3d.x + 2.0 * index3d.y + index3d.z));
        
        vec4 value = texture2D(visibleNodes, vec2(float(iOffset) / 2048.0, 0.0));
        int mask = int(round(value.r * 255.0));

        if(isBitSet(mask, index)){
            // there are more visible child nodes at this position
            int advanceG = int(round(value.g * 255.0)) * 256;
            int advanceB = int(round(value.b * 255.0));
            int advanceChild = numberOfOnes(mask, index - 1);
            int advance = advanceG + advanceB + advanceChild;

            iOffset = iOffset + advance;
            
            depth++;
        }else{
            // no more visible child nodes at this position
            return value.a * 255.0;
            //return depth;
        }
        
        offset = offset + (nodeSizeAtLevel * 0.5) * index3d;
    }
    
        
    return depth;
}

float getPointSizeAttenuation(vec3 position){
  float lod = getLOD(position);
  // v_color = vec4(0.0, 0.0, 0.0, 1.0);
  // v_color.r = lod / 5.0;
  return pow(2.0, lod);
}


float getPointSize(vec3 position){
	
	float r = uOctreeSpacing * PointSize;
  
  float pointSize = r / getPointSizeAttenuation(position);

	// pointSize = clamp(pointSize, minSize, maxSize);
	
	return pointSize;
}


void main(void) {
  v_color = colors / 255.0; // Unsigned byte attributes need to be scaled down from 0-255 > 0..1
  
  vec2 quadPointPos = getQuadVertexPositionFromID();
  v_texCoord = quadPointPos + 0.5;

  vec4 pos = vec4(positions + offset, 1.);
  mat4 modelViewMatrix = viewMatrix * modelMatrix;
  vec4 viewPos = modelViewMatrix * pos;

	float pointSize = getPointSize(positions);

  viewPos += vec4(vec3(quadPointPos, 0.0) * pointSize, 0.);
  v_viewPos = -viewPos.xyz;

  gl_Position = projectionMatrix * viewPos;

//   gl_PointSize = PointSize;

}
`
    );

    this.__shaderStages['FRAGMENT_SHADER'] = zeaEngine.shaderLibrary.parseShader(
      'PointsShader.fragmentShader',
      `
precision highp float;

uniform color BaseColor;

/* VS Outputs */
varying vec4 v_color;
varying vec2 v_texCoord;

#ifdef ENABLE_ES3
out vec4 fragColor;
#endif

void main(void) {

#ifndef ENABLE_ES3
  vec4 fragColor;
#endif

  if(length(v_texCoord - 0.5) > 0.5)
    discard;

  fragColor = v_color;
  fragColor.a = 1.0;

#ifndef ENABLE_ES3
  gl_FragColor = fragColor;
#endif
}
`
    );
  }

  static getGeomDataShaderName() {
    return 'PotreePointsGeomDataShader'
  }

  static getSelectedShaderName() {
    return 'PotreePointsHilighlightShader'
  }
}

zeaEngine.sgFactory.registerClass('PotreePointsShader', PotreePointsShader);



class PotreePointsGeomDataShader extends PotreePointsShader {
  constructor(gl) {
    super(gl);

    this.__shaderStages['FRAGMENT_SHADER'] = zeaEngine.shaderLibrary.parseShader(
      'PointsShader.fragmentShader',
      `
precision highp float;

uniform int passId;
uniform int assetId;

/* VS Outputs */
varying vec4 v_color;
varying vec2 v_texCoord;
varying vec3 v_viewPos;

#ifdef ENABLE_ES3
out vec4 fragColor;
#endif

void main(void) {

#ifndef ENABLE_ES3
  vec4 fragColor;
#endif

  if(length(v_texCoord - 0.5) > 0.5)
    discard;

  float dist = length(v_viewPos);

  fragColor.r = float(passId); 
  fragColor.g = float(assetId);
  fragColor.b = 0.0;// TODO: store poly-id or something.
  fragColor.a = dist;

#ifndef ENABLE_ES3
  gl_FragColor = fragColor;
#endif
}
`
    );
  }
}

zeaEngine.sgFactory.registerClass('PotreePointsGeomDataShader', PotreePointsGeomDataShader);

class PotreePointsHilighlightShader extends PotreePointsShader {
  constructor(gl) {
    super(gl);

    this.__shaderStages['FRAGMENT_SHADER'] = zeaEngine.shaderLibrary.parseShader(
      'PointsShader.fragmentShader',
      `
precision highp float;

uniform color highlightColor;

/* VS Outputs */
varying vec4 v_color;
varying vec2 v_texCoord;
varying vec3 v_viewPos;

#ifdef ENABLE_ES3
out vec4 fragColor;
#endif

void main(void) {

#ifndef ENABLE_ES3
  vec4 fragColor;
#endif

  if(length(v_texCoord - 0.5) > 0.5)
    discard;

  fragColor = highlightColor;

#ifndef ENABLE_ES3
  gl_FragColor = fragColor;
#endif
}
`
    );
  }
}

zeaEngine.sgFactory.registerClass('PotreePointsHilighlightShader', PotreePointsHilighlightShader);

class LRUItem{

	constructor(node){
		this.previous = null;
		this.next = null;
		this.node = node;
	}

}

/**
 *
 * @class A doubly-linked-list of the least recently used elements.
 */
class LRU{

	constructor(){
		// the least recently used item
		this.first = null;
		// the most recently used item
		this.last = null;
		// a list of all items in the lru list
		this.items = {};
		this.elements = 0;
		this.numPoints = 0;
		this.pointLoadLimit = 0;
	}

	size(){
		return this.elements;
	}

	contains(node){
		return this.items[node.id] == null;
	}

	touch(node){
		if (!node.loaded) {
			return;
		}

		let item;
		if (this.items[node.id] == null) {
			// add to list
			item = new LRUItem(node);
			item.previous = this.last;
			this.last = item;
			if (item.previous !== null) {
				item.previous.next = item;
			}

			this.items[node.id] = item;
			this.elements++;

			if (this.first === null) {
				this.first = item;
			}
			this.numPoints += node.numPoints;
		} else {
			// update in list
			item = this.items[node.id];
			if (item.previous === null) {
				// handle touch on first element
				if (item.next !== null) {
					this.first = item.next;
					this.first.previous = null;
					item.previous = this.last;
					item.next = null;
					this.last = item;
					item.previous.next = item;
				}
			} else if (item.next === null) ; else {
				// handle touch on any other element
				item.previous.next = item.next;
				item.next.previous = item.previous;
				item.previous = this.last;
				item.next = null;
				this.last = item;
				item.previous.next = item;
			}
		}
	}

	remove(node){
		let lruItem = this.items[node.id];
		if (lruItem) {
			if (this.elements === 1) {
				this.first = null;
				this.last = null;
			} else {
				if (!lruItem.previous) {
					this.first = lruItem.next;
					this.first.previous = null;
				}
				if (!lruItem.next) {
					this.last = lruItem.previous;
					this.last.next = null;
				}
				if (lruItem.previous && lruItem.next) {
					lruItem.previous.next = lruItem.next;
					lruItem.next.previous = lruItem.previous;
				}
			}

			delete this.items[node.id];
			this.elements--;
			this.numPoints -= node.numPoints;
		}
	}

	getLRUItem(){
		if (this.first === null) {
			return null;
		}
		let lru = this.first;

		return lru.node;
	}

	toString(){
		let string = '{ ';
		let curr = this.first;
		while (curr !== null) {
			string += curr.node.id;
			if (curr.next !== null) {
				string += ', ';
			}
			curr = curr.next;
		}
		string += '}';
		string += '(' + this.size() + ')';
		return string;
	}

	freeMemory(){
		if (this.elements <= 1) {
			return;
		}

		while (this.numPoints > this.pointLoadLimit) {
			let element = this.first;
			let node = element.node;
			this.disposeDescendants(node);
		}
	}

	disposeDescendants(node){
		let stack = [];
		stack.push(node);
		while (stack.length > 0) {
			let current = stack.pop();

			// console.log(current);

			current.dispose();
			this.remove(current);

			for (let key in current.children) {
				if (current.children.hasOwnProperty(key)) {
					let child = current.children[key];
					if (child.loaded) {
						stack.push(current.children[key]);
					}
				}
			}
		}
	}

}

class GLPointCloudPass extends zeaEngine.GLPass {
  constructor(){
    super();
    
    this.visiblePointsTarget = 2 * 1000 * 1000;
    this.lru = new LRU();
    this.minimumNodeVSize = 0.2; 
    this.glpointcloudAssets = [];
    this.hilghlightedAssets = [];

    this.visibleNodesNeedUpdating = false;

    // Size, not in pixels, but a fraction of scnreen V height.
    const minimumNodeVSizeParam = this.addParameter(new zeaEngine.NumberParameter('minimumNodeVSize',0.0));
    minimumNodeVSizeParam.valueChanged.connect(mode => {
        this.minimumNodeVSize = minimumNodeVSizeParam.getValue();
    });

    const visiblePointsTargetParam = this.addParameter(new zeaEngine.NumberParameter('visiblePointsTarget', 0));
    visiblePointsTargetParam.valueChanged.connect(() => {
      this.pointBudget = visiblePointsTargetParam.getValue();
        this.lru.pointLoadLimit = this.pointBudget * 2;
    });

    const pointSizeParam = this.addParameter(new zeaEngine.NumberParameter('Points Size', 0));
    pointSizeParam.valueChanged.connect(() => {
      this.pointSize = pointSizeParam.getValue();
    });

    minimumNodeVSizeParam.setValue(0.2);
    visiblePointsTargetParam.setValue(2 * 1000 * 1000);
    pointSizeParam.setValue(1.25);
  }
  /**
   * The init method.
   * @param {any} renderer - The renderer param.
   * @param {any} passIndex - The passIndex param.
   */
  init(renderer, passIndex) {
    super.init(renderer, passIndex);
    const gl = renderer.gl;
    this.glshader = new PotreePointsShader(gl);
    this.glgeomdataShader = new PotreePointsGeomDataShader(gl);
    this.glhighlightShader = new PotreePointsHilighlightShader(gl);

    const size = 2048;
    const data = new Uint8Array(size * 4);
    for (let i = 0; i < size * 4; i++) data[i] = 255;

    this.visibleNodesTexture = new zeaEngine.GLTexture2D(gl, {
      format: 'RGBA',
      type: 'UNSIGNED_BYTE',
      width: size,
      height: 1,
      filter: 'NEAREST',
      wrap: 'CLAMP_TO_EDGE',
      mipMapped: false,
      data
    });

    this.__renderer.registerPass(
      treeItem => {
        if (treeItem instanceof PointCloudAsset) {
          this.addPotreeasset(treeItem);
          return true
        }
        return false
      },
      treeItem => {
        if (treeItem instanceof PointCloudAsset) {
          this.removePotreeasset(treeItem);
          return true
        }
        return false
      }
    );

		
  	this.setViewport(renderer.getViewport());
  }

  addPotreeasset(pointcloudAsset){
    const __bindAsset = pointcloudAsset => {
      const glpointcloudAsset = new GLPointCloudAsset(this.__gl, pointcloudAsset, this.glshader);
      glpointcloudAsset.updated.connect(() => this.updated.emit());
      pointcloudAsset.highlightChanged.connect(() => {
        if (pointcloudAsset.isHighlighted()) {
          if (this.hilghlightedAssets.indexOf(glpointcloudAsset) == -1)
            this.hilghlightedAssets.push(glpointcloudAsset);
        } else {
          if (this.hilghlightedAssets.indexOf(glpointcloudAsset) != -1)
            this.hilghlightedAssets.splice(this.hilghlightedAssets.indexOf(glpointcloudAsset), 1);
        }
      });

      this.glpointcloudAssets.push(glpointcloudAsset);
    };
    if (pointcloudAsset.isLoaded())
      __bindAsset(pointcloudAsset);
    else {
      pointcloudAsset.loaded.connect(() => __bindAsset(pointcloudAsset));
    }
  }

  removePotreeasset(pointcloudAsset){


  }

  // ///////////////////////////////////
  // Visiblity

  setViewport(viewport){
    this.viewport = viewport;
    this.viewport.viewChanged.connect(()=>{
      this.visibleNodesNeedUpdating = true;
    });
    this.viewport.resized.connect(()=>{
      this.visibleNodesNeedUpdating = true;
    });
    this.visibleNodesNeedUpdating = true;
  }
  
  updateVisibilityStructures(priorityQueue) {
    
    const camera = this.viewport.getCamera();
    const view = camera.getGlobalXfo().toMat4();
    const viewI = this.viewport.getViewMatrix();
    const proj = this.viewport.getProjectionMatrix();
    const viewProj = proj.multiply(viewI);
    const result = [];
    this.glpointcloudAssets.forEach((glpointcloudAsset, index)=> {
        const pointcloudAsset = glpointcloudAsset.getGeomItem();
        const model = pointcloudAsset.getGlobalMat4();
        const modelViewProj = viewProj.multiply(model);
        const frustum = new zeaEngine.Frustum();
        frustum.setFromMatrix(modelViewProj);

        // camera  position in object space
        const modelInv = model.inverse();
        const camMatrixObject = modelInv.multiply(view);
        const camObjPos = camMatrixObject.translation;

        if (pointcloudAsset.getVisible() && pointcloudAsset.pcoGeometry !== null) {
            priorityQueue.push({ index, node: pointcloudAsset.pcoGeometry.root, weight: Number.MAX_VALUE});
        }

        result.push({
            glpointcloudAsset,
            frustum,
            camObjPos,
        });
    });

    return result
  };


  updateVisibility() {
    const priorityQueue = new BinaryHeap(function (x) { return 1 / x.weight; });
    const camera = this.viewport.getCamera();

    this.numVisiblePoints = 0;
    let numVisiblePoints = 0;
    const visibleNodesByAsset = [];
    let visibleNodes = [];
    const unloadedGeometry = [];

    // calculate object space frustum and cam pos and setup priority queue
    const result = this.updateVisibilityStructures(priorityQueue);

    while (priorityQueue.size() > 0) {
      const element = priorityQueue.pop();
      const index = element.index;
      const node = element.node;

      if (numVisiblePoints + node.numPoints > this.pointBudget) {
        break;
      }

      const frustum = result[index].frustum;
      const insideFrustum = frustum.intersectsBox(node.boundingBox);
      if (!insideFrustum) {
        continue;
      }
      numVisiblePoints += node.numPoints;
      this.numVisiblePoints += node.numPoints;

      const parent = element.parent;
      if (!parent || parent.isLoaded()) {
        if (node.isLoaded()) {
        if (!visibleNodesByAsset[index])
            visibleNodesByAsset[index] = [];
          visibleNodesByAsset[index].push(node);

          visibleNodes.push(node);
        } else {
          unloadedGeometry.push(node);
        }
      }

      // add child nodes to priorityQueue
      const camObjPos = result[index].camObjPos;
      const children = node.getChildren();
      for (let i = 0; i < children.length; i++) {
        const child = children[i];

        let weight = 0; 
        {
          const sphere = child.getBoundingSphere();
          const distance = sphere.pos.distanceTo(camObjPos);
          const radius = sphere.radius;
          if(distance - radius < 0){
            weight = Number.MAX_VALUE;
          } else {
            const fov = camera.getFov();
            const slope = Math.tan(fov / 2);

            const projFactor = 0.5 / (slope * distance);
            const screenVRadius = radius * projFactor;
            
            if(screenVRadius < this.minimumNodeVSize){
              continue;
            }
            weight = screenVRadius;
          }

        }

        priorityQueue.push({ index, node: child, parent: node, weight: weight});
      }
    }// end priority queue loop
    
    const visibleNodeTextureOffsets = this.computeVisibilityTextureData(visibleNodes);

    visibleNodesByAsset.forEach((assetVisibleNodes, index) => {
      this.glpointcloudAssets[index].setVisibleNodes(
        assetVisibleNodes, 
        this.lru,
        visibleNodeTextureOffsets
      );
    });

    if (unloadedGeometry.length > 0) {
      // Disabled temporarily
      // for (let i = 0; i < Math.min(Potree.maxNodesLoading, unloadedGeometry.length); i++) {
      const promises = [];
      for (let i = 0; i < unloadedGeometry.length; i++) {
          // console.log("load:", unloadedGeometry[i].name);
          promises.push(unloadedGeometry[i].load());
      }
      if (promises.length > 0) {
        // After all the loads have finished. 
        // update again so we can recompute and visiblity.
        Promise.all(promises).then(()=>{
          // for (let i = 0; i < unloadedGeometry.length; i++) {
          //   console.log("loaded:", unloadedGeometry[i].name);
          // }
          this.visibleNodesNeedUpdating = true;
          this.updated.emit();
        });
      }
    }

    // Causes unused nodes to be flushed.
    this.lru.freeMemory();

    // this.updated.emit();
  }

  computeVisibilityTextureData(nodes){

    const data = new Uint8Array(nodes.length * 4);
    const visibleNodeTextureOffsets = new Map();

    // copy array
    nodes = nodes.slice();

    // sort by level and index, e.g. r, r0, r3, r4, r01, r07, r30, ...
    const sort = function (a, b) {
      const na = a.name;
      const nb = b.name;
      if (na.length !== nb.length) return na.length - nb.length;
      if (na < nb) return -1;
      if (na > nb) return 1;
      return 0;
    };
    nodes.sort(sort);

    // const nodeMap = new Map();
    const offsetsToChild = new Array(nodes.length).fill(Infinity);

    for(let i = 0; i < nodes.length; i++){
      const node = nodes[i];
      // nodeMap.set(node.name, node);
      visibleNodeTextureOffsets.set(node, i);

      if(i > 0){
        const index = node.index;//parseInt(node.name.slice(-1));
        // console.log(node.name, node.index, node.name.slice(-1))
        // const parentName = node.name.slice(0, -1);
        const parent = node.parent;//nodeMap.get(parentName);
        // console.log(node.parent.name, parent.name, node.parent === parent)
        
        const parentIndex = visibleNodeTextureOffsets.get(parent);

        const parentOffsetToChild = (i - parentIndex);

        const childOffset = Math.min(offsetsToChild[parentIndex], parentOffsetToChild);
        
        // Add this bit to the parent's chils bit mask.
        data[parentIndex * 4 + 0] = data[parentIndex * 4 + 0] | (1 << index);
        data[parentIndex * 4 + 1] = (childOffset >> 8);
        data[parentIndex * 4 + 2] = (childOffset % 256);
        offsetsToChild[parentIndex] = childOffset;
      }

      data[i * 4 + 3] = node.name.length - 1;
    }

    this.visibleNodesTexture.populate(data, nodes.length, 1);
    return visibleNodeTextureOffsets;
  }

  // ///////////////////////////////////
  // Rendering

  /**
   * The draw method.
   * @param {any} renderstate - The renderstate param.
   */
  draw(renderstate) {
    if (this.glpointcloudAssets.length == 0) return;

    if (this.visibleNodesNeedUpdating){
      this.updateVisibility();
      this.visibleNodesNeedUpdating = false;
    }

    const gl = this.__gl;
  
    gl.disable(gl.BLEND);
    gl.depthMask(true);
    gl.enable(gl.DEPTH_TEST);

    this.glshader.bind(renderstate);

    const { visibleNodes, PointSize } = renderstate.unifs;
    if (visibleNodes)
      this.visibleNodesTexture.bindToUniform(renderstate, visibleNodes);

    gl.uniform1f(PointSize.location, this.pointSize);
    
    // RENDER
    this.glpointcloudAssets.forEach( a => a.draw(renderstate));

  }

  /**
   * The drawHighlightedGeoms method.
   * @param {any} renderstate - The renderstate param.
   */
  drawHighlightedGeoms(renderstate) {
    if (this.hilghlightedAssets.length == 0) return;
    const gl = this.__gl;
  
    gl.disable(gl.BLEND);
    gl.depthMask(true);
    gl.enable(gl.DEPTH_TEST);

    this.glhighlightShader.bind(renderstate);
    
    const { visibleNodes, PointSize } = renderstate.unifs;
    if (visibleNodes)
      this.visibleNodesTexture.bindToUniform(renderstate, visibleNodes);

    gl.uniform1f(PointSize.location, this.pointSize);

    this.hilghlightedAssets.forEach( a => a.drawHighlightedGeoms(renderstate));
  }

  /**
   * The drawGeomData method.
   * @param {any} renderstate - The renderstate param.
   */
  drawGeomData(renderstate) {
    if (this.glpointcloudAssets.length == 0) return;
    const gl = this.__gl;
  
    gl.disable(gl.BLEND);
    gl.depthMask(true);
    gl.enable(gl.DEPTH_TEST);

    this.glgeomdataShader.bind(renderstate);
    
    const { visibleNodes, PointSize } = renderstate.unifs;
    if (visibleNodes)
      this.visibleNodesTexture.bindToUniform(renderstate, visibleNodes);

    gl.uniform1f(PointSize.location, this.pointSize);

    // RENDER
    this.glpointcloudAssets.forEach((a, index)=> {
      const { passId, assetId } = renderstate.unifs;
      if (passId) {
        gl.uniform1i(passId.location, this.__passIndex);
      }
      if (assetId) {
        gl.uniform1i(assetId.location, index);
      }
      a.drawGeomData(renderstate);
    });
  }

  /**
   * The getGeomItemAndDist method.
   * @param {any} geomData - The geomData param.
   */
  getGeomItemAndDist(geomData) {
    const itemId = Math.round(geomData[1]);
    const dist = geomData[3];
    const glpointcloudAsset = this.glpointcloudAssets[itemId];
    if (glpointcloudAsset) {
      return {
        geomItem: glpointcloudAsset.getGeomItem(),
        dist,
      }
    }
  }
}

const version = {
	major: 1,
	minor: 6,
	suffix: ''
};

console.log('ZeaPotree ' + version.major + '.' + version.minor + version.suffix);

exports.GLPointCloudPass = GLPointCloudPass;
exports.PointCloudAsset = PointCloudAsset;
exports.version = version;
