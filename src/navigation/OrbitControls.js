/**
 * @author mschuetz / http://mschuetz.at
 *
 * adapted from THREE.OrbitControls by 
 *
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 *
 *
 *
 */
 
Potree.OrbitControls = class OrbitControls extends THREE.EventDispatcher{
	
	constructor(viewer){
		super()
		
		this.viewer = viewer;
		this.renderer = viewer.renderer;
		
		this.scene = null;
		
		this.rotationSpeed = 5;
		
		this.fadeFactor = 10;
		this.yawDelta = 0;
		this.pitchDelta = 0;
		this.panDelta = new THREE.Vector2(0, 0);
		this.radiusDelta = 0;
		
		this.tweens = [];
		
		
		let drag = (e) => {
			if(e.drag.object !== null){
				return;
			}
			
			let ndrag = {
				x: e.drag.lastDrag.x / this.renderer.domElement.clientWidth,
				y: e.drag.lastDrag.y / this.renderer.domElement.clientHeight
			};
			
			if(e.drag.mouse === THREE.MOUSE.LEFT){
				this.yawDelta += ndrag.x * this.rotationSpeed;
				this.pitchDelta += ndrag.y * this.rotationSpeed;
			}else if(e.drag.mouse === THREE.MOUSE.RIGHT){
				this.panDelta.x += ndrag.x;
				this.panDelta.y += ndrag.y;
			}
		};
		
		let scroll = (e) => {
			this.radiusDelta -= e.delta;
		};
		
		let dblclick = (e) => {
			this.zoomToLocation(e.mouse);
		};
		
		this.addEventListener("drag", drag);
		this.addEventListener("mousewheel", scroll);
		this.addEventListener("dblclick", dblclick);
		
	}
	
	setScene(scene){
		this.scene = scene;
	}
	
	zoomToLocation(mouse){
		let camera = this.scene.camera;
		
		let I = Potree.utils.getMousePointCloudIntersection(
			mouse, 
			camera, 
			this.renderer, 
			this.scene.pointclouds);
			
		if(I === null){
			return;
		}
		
		let nmouse =  {
			x: +( mouse.x / this.renderer.domElement.clientWidth )  * 2 - 1,
			y: -( mouse.y / this.renderer.domElement.clientHeight ) * 2 + 1
		};
		
		let targetRadius = 0;
		{
			let minimumJumpDistance = 0.2;
			
			let vector = new THREE.Vector3( nmouse.x, nmouse.y, 0.5 );
			vector.unproject(camera);
			
			let direction = vector.sub(camera.position).normalize();
			let ray = new THREE.Ray(camera.position, direction);
			
			let nodes = I.pointcloud.nodesOnRay(I.pointcloud.visibleNodes, ray);
			let lastNode = nodes[nodes.length - 1];
			let radius = lastNode.getBoundingSphere().radius;
			targetRadius = Math.min(this.scene.view.radius, radius);
			targetRadius = Math.max(minimumJumpDistance, targetRadius);
		}
		
		let d = this.scene.view.direction.multiplyScalar(-1);
		let cameraTargetPosition = new THREE.Vector3().addVectors(I.location, d.multiplyScalar(targetRadius));
		let controlsTargetPosition = I.location;
		
		var animationDuration = 600;
		var easing = TWEEN.Easing.Quartic.Out;
		
		{ // animate position
			let tween = new TWEEN.Tween(this.scene.view.position).to(cameraTargetPosition, animationDuration);
			tween.easing(easing);
			this.tweens.push(tween);
			
			tween.onComplete( () => {
				this.tweens = this.tweens.filter( e => e !== tween);
			});
			
			tween.start();
		}
		
		{ // animate target
			let pivot = this.scene.view.getPivot();
			let tween = new TWEEN.Tween(pivot).to(I.location, animationDuration);
			tween.easing(easing);
			tween.onUpdate(() => {
				this.scene.view.lookAt(pivot);
			});
			tween.onComplete(() => {
				
				tween.onComplete( () => {
					this.tweens = this.tweens.filter( e => e !== tween);
				});
				
				this.dispatchEvent({
					type: "double_click_move",
					controls: this,
					position: cameraTargetPosition,
					targetLocation: I.location,
					targetPointcloud: I.pointcloud
				});
			});
			tween.start();
			
			this.tweens.push(tween);
		}
	}
	
	update(delta){
		
		let view = this.scene.view;
		
		let changes = [ this.yawDelta, this.pitchDelta, this.radiusDelta, this.panDelta.length() ];
		let changeHappens = changes.some( e => Math.abs(e) > 0.001);
		if(changeHappens && this.tweens.length > 0){
			this.tweens.forEach( e => e.stop() );
			this.tweens = [];
		}		
		
		{ // apply rotation
			let progression = Math.min(1, this.fadeFactor * delta);
			
			let yaw = view.yaw;
			let pitch = view.pitch;
			let pivot = view.getPivot();
			
			yaw -= progression * this.yawDelta;
			pitch -= progression * this.pitchDelta;
			
			view.yaw = yaw;
			view.pitch = pitch;
			
			let V = this.scene.view.direction.multiplyScalar(-view.radius);
			let position = new THREE.Vector3().addVectors(pivot, V);
			
			view.position.copy(position);
		}
		
		{ // apply pan
			let progression = Math.min(1, this.fadeFactor * delta);
			let panDistance = progression * view.radius * 3;
			
			let px = -this.panDelta.x * panDistance;
			let py = this.panDelta.y * panDistance;
			
			view.pan(px, py);
		}
		
		{ // apply zoom
			let progression = Math.min(1, this.fadeFactor * delta);
			
			let radius = view.radius + progression * this.radiusDelta * view.radius * 0.1;
			
			let V = view.direction.multiplyScalar(-radius);
			let position = new THREE.Vector3().addVectors(view.getPivot(), V);
			view.radius = radius;
			
			view.position.copy(position);
		}
		
		
		{// decelerate over time
			let attenuation = Math.max(0, 1 - this.fadeFactor * delta);
			this.yawDelta *= attenuation;
			this.pitchDelta *= attenuation;
			this.panDelta.multiplyScalar(attenuation);
			this.radiusDelta *= attenuation;
		}
	}
	
};
