
import * as THREE from "../../libs/three.js/build/three.module.js";
import {MOUSE} from "../defines.js";
import {Utils} from "../utils.js";
import {EventDispatcher} from "../EventDispatcher.js";

export class EarthControls extends EventDispatcher {
	constructor (viewer) {
		super(viewer);

		this.viewer = viewer;
		this.renderer = viewer.renderer;

		this.scene = null;
		this.sceneControls = new THREE.Scene();

		this.rotationSpeed = 10;

		this.fadeFactor = 20; //衰减因子，各个相机设定的貌似都是20，在缩放中使用，但不知道起何作用
		this.wheelDelta = 0;
		this.zoomDelta = new THREE.Vector3();
		this.camStart = null;

		this.tweens = [];

		{
			let sg = new THREE.SphereGeometry(1, 16, 16);
			let sm = new THREE.MeshNormalMaterial();
			this.pivotIndicator = new THREE.Mesh(sg, sm);
			this.pivotIndicator.visible = false;
			this.sceneControls.add(this.pivotIndicator);
		}

		let drag = (e) => {
			if (e.drag.object !== null) {
				return;
			}

			if (!this.pivot) {
				return;
			}

			if (e.drag.startHandled === undefined) {
				e.drag.startHandled = true;

				this.dispatchEvent({type: 'start'});
			}

			let camStart = this.camStart;
			let camera = this.scene.getActiveCamera();
			let view = this.viewer.scene.view;

			// let camera = this.viewer.scene.camera;
			let mouse = e.drag.end;
			let domElement = this.viewer.renderer.domElement; //画布而非容器，应代表整个页面；可尝试看看是不是都不在动

			if (e.drag.mouse === MOUSE.LEFT) { //左键是平移

				let ray = Utils.mouseToRay(mouse, camera, domElement.clientWidth, domElement.clientHeight);  //返回一个射线；鼠标点击处三维坐标与相机位置处的方向向量
				
				//原点是相机位置，指向鼠标点击处
				let plane = new THREE.Plane().setFromNormalAndCoplanarPoint( //通过平面上一点以及法线创建平面
					new THREE.Vector3(0, 0, 1),
					this.pivot);
                //pivot应理解为鼠标按下处与点云的交点，移动过程中保持不变
				let distanceToPlane = ray.distanceToPlane(plane);  //获取射线原点（origin）到平面（Plane）之间的距离；这个可能是按射线距离

				if (distanceToPlane > 0) {
					let I = new THREE.Vector3().addVectors( //将该向量设置成a+b
						camStart.position,  //this.camStart = this.scene.getActiveCamera().clone();
						ray.direction.clone().multiplyScalar(distanceToPlane));//direction是经过标准化的方向向量，方向向量乘以标量
                    //返回的结果I是由相机位置加相机到垂面距离的向量，得出的结果应该是
					let movedBy = new THREE.Vector3().subVectors(
						//subVectors是a-b，设置了新的相机点？
						I, this.pivot);
 
					let newCamPos = camStart.position.clone().sub(movedBy); //sub，从该向量处减取括号内向量

					view.position.copy(newCamPos);

					{
						let distance = newCamPos.distanceTo(this.pivot);
						view.radius = distance;
						let speed = view.radius / 2.5;
						this.viewer.setMoveSpeed(speed);
					}
				} //计算鼠标移动前与点云交点处z平面，与移动后在此平面上的射线距离，平移相机，过程中保证z不变
			} else if (e.drag.mouse === MOUSE.RIGHT) {
				let ndrag = {
					x: e.drag.lastDrag.x / this.renderer.domElement.clientWidth,
					y: e.drag.lastDrag.y / this.renderer.domElement.clientHeight
				};

				let yawDelta = -ndrag.x * this.rotationSpeed * 0.5;
				let pitchDelta = -ndrag.y * this.rotationSpeed * 0.2;

				let originalPitch = view.pitch;
				let tmpView = view.clone();
				tmpView.pitch = tmpView.pitch + pitchDelta;
				pitchDelta = tmpView.pitch - originalPitch;

				let pivotToCam = new THREE.Vector3().subVectors(view.position, this.pivot);
				let pivotToCamTarget = new THREE.Vector3().subVectors(view.getPivot(), this.pivot);
				let side = view.getSide();

				pivotToCam.applyAxisAngle(side, pitchDelta);
				pivotToCamTarget.applyAxisAngle(side, pitchDelta);

				pivotToCam.applyAxisAngle(new THREE.Vector3(0, 0, 1), yawDelta);
				pivotToCamTarget.applyAxisAngle(new THREE.Vector3(0, 0, 1), yawDelta); //旋转角度为弧度制，将归一化的向量和角度表示的旋转应用到该向量中（向量可能包含起点与终点？）

				let newCam = new THREE.Vector3().addVectors(this.pivot, pivotToCam);
				// TODO: Unused: let newCamTarget = new THREE.Vector3().addVectors(this.pivot, pivotToCamTarget);

				view.position.copy(newCam);
				view.yaw += yawDelta;
				view.pitch += pitchDelta;
			}
		};

		let onMouseDown = e => {
			let I = Utils.getMousePointCloudIntersection(
				e.mouse, 
				this.scene.getActiveCamera(), 
				this.viewer, 
				this.scene.pointclouds, 
				{pickClipped: false});
            //获取鼠标与点云交点；待细看
			if (I) {
				this.pivot = I.location;
				this.camStart = this.scene.getActiveCamera().clone();
				this.pivotIndicator.visible = true;
				this.pivotIndicator.position.copy(I.location);
			}
		};

		let drop = e => {
			this.dispatchEvent({type: 'end'});
		};

		let onMouseUp = e => {
			this.camStart = null;
			this.pivot = null;
			this.pivotIndicator.visible = false;
		};

		let scroll = (e) => {
			this.wheelDelta += e.delta;
		};

		let dblclick = (e) => {
			this.zoomToLocation(e.mouse);
		};

		this.addEventListener('drag', drag);
		this.addEventListener('drop', drop);
		this.addEventListener('mousewheel', scroll);
		this.addEventListener('mousedown', onMouseDown);
		this.addEventListener('mouseup', onMouseUp);
		this.addEventListener('dblclick', dblclick);
	}

	setScene (scene) {
		this.scene = scene;
	}

	stop(){
		this.wheelDelta = 0;
		this.zoomDelta.set(0, 0, 0);
	}
	
	zoomToLocation(mouse){
		let camera = this.scene.getActiveCamera();
		
		let I = Utils.getMousePointCloudIntersection(
			mouse,
			camera,
			this.viewer,
			this.scene.pointclouds);

		if (I === null) {
			return;
		}

		let targetRadius = 0;
		{
			let minimumJumpDistance = 0.2;

			let domElement = this.renderer.domElement;
			let ray = Utils.mouseToRay(mouse, camera, domElement.clientWidth, domElement.clientHeight);

			let nodes = I.pointcloud.nodesOnRay(I.pointcloud.visibleNodes, ray);
			let lastNode = nodes[nodes.length - 1];
			let radius = lastNode.getBoundingSphere(new THREE.Sphere()).radius;
			targetRadius = Math.min(this.scene.view.radius, radius);
			targetRadius = Math.max(minimumJumpDistance, targetRadius);
		}

		let d = this.scene.view.direction.multiplyScalar(-1);
		let cameraTargetPosition = new THREE.Vector3().addVectors(I.location, d.multiplyScalar(targetRadius));
		// TODO Unused: let controlsTargetPosition = I.location;

		let animationDuration = 600;
		let easing = TWEEN.Easing.Quartic.Out;

		{ // animate
			let value = {x: 0};
			let tween = new TWEEN.Tween(value).to({x: 1}, animationDuration);
			tween.easing(easing);
			this.tweens.push(tween);

			let startPos = this.scene.view.position.clone();
			let targetPos = cameraTargetPosition.clone();
			let startRadius = this.scene.view.radius;
			let targetRadius = cameraTargetPosition.distanceTo(I.location);

			tween.onUpdate(() => {
				let t = value.x;
				this.scene.view.position.x = (1 - t) * startPos.x + t * targetPos.x;
				this.scene.view.position.y = (1 - t) * startPos.y + t * targetPos.y;
				this.scene.view.position.z = (1 - t) * startPos.z + t * targetPos.z;

				this.scene.view.radius = (1 - t) * startRadius + t * targetRadius;
				this.viewer.setMoveSpeed(this.scene.view.radius / 2.5);
			});

			tween.onComplete(() => {
				this.tweens = this.tweens.filter(e => e !== tween);
			});

			tween.start();
		}
	}
    //delta应该是变量的意思，增量
	update (delta) {
		//这玩意是每时每刻都在触发，检测变化更新？delta也在每时每刻变化
		let view = this.scene.view;
		let fade = Math.pow(0.5, this.fadeFactor * delta);  //fadeFactor定义20
		let progression = 1 - fade;
		let camera = this.scene.getActiveCamera();
		
		// compute zoom 某一瞬间存在缩放；先计算zoomDelta变化；这里只是计算相机移动的向量，包括方向，但此处未移动相机位置
		if (this.wheelDelta !== 0) {
			//wheelDelta，滚轮向上为正，滚轮向下为负，设计要符合缩放认知，数值与滚动速率有关，一般是1，极快时会有2或3，都是整数
			let I = Utils.getMousePointCloudIntersection(
				this.viewer.inputHandler.mouse,   //这里因为不是鼠标点击获取的点坐标，所以要通过view.inputHandler获取鼠标悬停坐标
				this.scene.getActiveCamera(), 
				this.viewer, 
				this.scene.pointclouds);
            //I为当前鼠标悬停位置与点云的交点
			//如果I处有点云存在
			if (I) {
				let resolvedPos = new THREE.Vector3().addVectors(view.position, this.zoomDelta);    //这个是计算根据当前相机坐标增量到哪个位置，包含方向吗？ --最初为0
				let distance = I.location.distanceTo(resolvedPos);  //鼠标点云交汇位置与增量后位置的距离？
				let jumpDistance = distance * 0.2 * this.wheelDelta;  //这里应该是设定，由当前位置移动，0.2是缩放速率；故近处缩放慢，远处缩放快，但一直是五分之一
				let targetDir = new THREE.Vector3().subVectors(I.location, view.position); //新视角方向保持鼠标点云交汇点和当前视角连线方向；该向量设置为a-b
				targetDir.normalize();

				resolvedPos.add(targetDir.multiplyScalar(jumpDistance)); //将该向量与所传入的标量相乘
				this.zoomDelta.subVectors(resolvedPos, view.position); //此处记录了相机位置移动的向量

				{
					let distance = resolvedPos.distanceTo(I.location);
					view.radius = distance;
					let speed = view.radius / 2.5;
					this.viewer.setMoveSpeed(speed);
				}
			}
		}

		// apply zoom 此处记录了移动相机位置的过程
		if (this.zoomDelta.length() !== 0) {
			let p = this.zoomDelta.clone().multiplyScalar(progression);
            //delta意义不明，此处为何要乘一个衰减因子不明 --这是做一个动画过程？让移动有个递进，最后减速至停止？
			let newPos = new THREE.Vector3().addVectors(view.position, p);
			view.position.copy(newPos);
		}

		if (this.pivotIndicator.visible) {
			let distance = this.pivotIndicator.position.distanceTo(view.position);
			let pixelwidth = this.renderer.domElement.clientwidth;
			let pixelHeight = this.renderer.domElement.clientHeight;
			let pr = Utils.projectedRadius(1, camera, distance, pixelwidth, pixelHeight);
			let scale = (10 / pr);
			this.pivotIndicator.scale.set(scale, scale, scale);
		}

		// decelerate over time 随着时间的推移减速
		{
			this.zoomDelta.multiplyScalar(fade); //不断乘一个小于1的数，直至停止？
			this.wheelDelta = 0;
		}
	}
};
