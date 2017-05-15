//let getQueryParam = function(name) {
//    name = name.replace(/[\[\]]/g, "\\$&");
//    let regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
//        results = regex.exec(window.location.href);
//    if (!results) return null;
//    if (!results[2]) return '';
//    return decodeURIComponent(results[2].replace(/\+/g, " "));
//}

Potree.View = class{
	constructor(){
		this.position = new THREE.Vector3(0, 0, 0);
		
		this.yaw = Math.PI / 4;
		this._pitch = -Math.PI / 4;
		this.radius = 1;
		
		this.maxPitch = Math.PI / 2;
		this.minPitch = -Math.PI / 2;
		
		this.navigationMode = Potree.OrbitControls;
	}
	
	clone(){
		let c = new Potree.View();
		c.yaw = this.yaw;
		c._pitch = this.pitch;
		c.radius = this.radius;
		c.maxPitch = this.maxPitch;
		c.minPitch = this.minPitch;
		c.navigationMode = this.navigationMode;
		
		return c;
	}
	
	get pitch(){
		return this._pitch;
	}
	
	set pitch(angle){
		this._pitch = Math.max(Math.min(angle, this.maxPitch), this.minPitch);
	}
	
	get direction(){
		let dir = new THREE.Vector3(0, 1, 0);
		
		dir.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
		dir.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.yaw);
		
		return dir;
	}
	
	set direction(dir){
		let yaw = Math.atan2(dir.y, dir.x) - Math.PI / 2;
		let pitch = Math.atan2(dir.z, Math.sqrt(dir.x * dir.x + dir.y * dir.y));
		
		this.yaw = yaw;
		this.pitch = pitch;
	}
	
	lookAt(t){
		let V = new THREE.Vector3().subVectors(t, this.position);
		let radius = V.length();
		let dir = V.normalize();
		
		this.radius = radius;
		this.direction = dir;
	}
	
	getPivot(){
		return new THREE.Vector3().addVectors(this.position, this.direction.multiplyScalar(this.radius));
	}
	
	getSide(){
		let side = new THREE.Vector3(1, 0, 0);
		side.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.yaw);
		
		return side;
	}
	
	pan(x, y){
		let dir = new THREE.Vector3(0, 1, 0);
		dir.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
		dir.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.yaw);
		
		//let side = new THREE.Vector3(1, 0, 0);
		//side.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.yaw);
		
		let side = this.getSide();
		
		let up = side.clone().cross(dir);
		
		let pan = side.multiplyScalar(x).add(up.multiplyScalar(y));
		
		this.position = this.position.add(pan);
		//this.target = this.target.add(pan);
	}
	
	translate(x, y, z){
		let dir = new THREE.Vector3(0, 1, 0);
		dir.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
		dir.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.yaw);
		
		let side = new THREE.Vector3(1, 0, 0);
		side.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.yaw);
		
		let up = side.clone().cross(dir);
		
		let t = side.multiplyScalar(x)
			.add(dir.multiplyScalar(y))
			.add(up.multiplyScalar(z));
		
		this.position = this.position.add(t);
	}
	
	translateWorld(x, y, z){
		this.position.x += x;
		this.position.y += y;
		this.position.z += z;
	}
	
};

Potree.CameraMode = {
	ORTHOGRAPHIC: 0,
	PERSPECTIVE: 1
};

Potree.Scene = class extends THREE.EventDispatcher{


	constructor(){
		super();
		
		this.annotations = new Potree.Annotation();
		this.scene = new THREE.Scene();
		this.scenePointCloud = new THREE.Scene();
		this.sceneBG = new THREE.Scene();
		this.cameraP = new THREE.PerspectiveCamera(this.fov, 1, 0.1, 1000*1000);
		this.cameraO = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000*1000);
		this.cameraBG = new THREE.Camera();
		this.cameraMode = Potree.CameraMode.PERSPECTIVE;
		this.pointclouds = [];
		this.referenceFrame;
		
		this.measurements = [];
		this.profiles = [];
		this.volumes = [];
		
		this.fpControls;
		this.orbitControls;
		this.earthControls;
		this.geoControls;
		this.inputHandler;
		this.view = new Potree.View();
		
		this.directionalLight = null;
		
		this.initialize();
		
	}
	
	addPointCloud(pointcloud){
		this.pointclouds.push(pointcloud);
		this.scenePointCloud.add(pointcloud);
		
		this.dispatchEvent({
			type: "pointcloud_added",
			pointcloud: pointcloud
		});
	};
	
	addVolume(volume){
		this.volumes.push(volume);
		this.dispatchEvent({
			"type": "volume_added",
			"scene": this,
			"volume": volume
		});
	};
	
	removeVolume(volume){
		let index = this.volumes.indexOf(volume);
		if (index > -1) {
			this.volumes.splice(index, 1);
			this.dispatchEvent({
				"type": "volume_removed",
				"scene": this,
				"volume": volume
			});
		}
	};
	
	addMeasurement(measurement){
		measurement.lengthUnit = this.lengthUnit;
		this.measurements.push(measurement);
		this.dispatchEvent({
			"type": "measurement_added",
			"scene": this,
			"measurement": measurement
		});
	};
	
	removeMeasurement(measurement){
		let index = this.measurements.indexOf(measurement);
		if (index > -1) {
			this.measurements.splice(index, 1);
			this.dispatchEvent({
				"type": "measurement_removed",
				"scene": this,
				"measurement": measurement
			});
		}
	}
	
	addProfile(profile){
		this.profiles.push(profile);
		this.dispatchEvent({
			"type": "profile_added",
			"scene": this,
			"profile": profile
		});
	}
	
	removeProfile(profile){
		let index = this.profiles.indexOf(profile);
		if (index > -1) {
			this.profiles.splice(index, 1);
			this.dispatchEvent({
				"type": "profile_removed",
				"scene": this,
				"profile": profile
			});
		}
	}
	
	removeAllMeasurements(){
		while(this.measurements.length > 0){
			this.removeMeasurement(this.measurements[0]);
		}
		
		while(this.profiles.length > 0){
			this.removeProfile(this.profiles[0]);
		}
		
		while(this.volumes.length > 0){
			this.removeVolume(this.volumes[0]);
		}
	}

	getActiveCamera() {
		return this.cameraMode == Potree.CameraMode.PERSPECTIVE ? this.cameraP : this.cameraO;		
	}
	
	initialize(){
		
		this.referenceFrame = new THREE.Object3D();
		this.referenceFrame.matrixAutoUpdate = false;
		this.scenePointCloud.add(this.referenceFrame);

		this.cameraP.up.set(0, 0, 1);
		this.cameraP.position.set(1000, 1000, 1000);
		this.cameraO.up.set(0, 0, 1);
		this.cameraO.position.set(1000, 1000, 1000);
		//this.camera.rotation.y = -Math.PI / 4;
		//this.camera.rotation.x = -Math.PI / 6;
		
		this.directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
		this.directionalLight.position.set( 10, 10, 10 );
		this.directionalLight.lookAt( new THREE.Vector3(0, 0, 0));
		this.scenePointCloud.add( this.directionalLight );
		
		let light = new THREE.AmbientLight( 0x555555 ); // soft white light
		this.scenePointCloud.add( light );
		
		let grid = Potree.utils.createGrid(5, 5, 2);
		this.scene.add(grid);
		
		{// background
		// var texture = THREE.ImageUtils.loadTexture( Potree.resourcePath + '/textures/background.gif' );
			let texture = Potree.utils.createBackgroundTexture(512, 512);
			
			texture.minFilter = texture.magFilter = THREE.NearestFilter;
			texture.minFilter = texture.magFilter = THREE.LinearFilter;
			let bg = new THREE.Mesh(
				new THREE.PlaneBufferGeometry(2, 2, 0),
				new THREE.MeshBasicMaterial({
					map: texture
				})
			);
			bg.material.depthTest = false;
			bg.material.depthWrite = false;
			this.sceneBG.add(bg);
		}
		
		{// lights
		
			{
				let light = new THREE.DirectionalLight( 0xffffff );
				light.position.set( 10, 10, 1 );
				light.target.position.set( 0, 0,0 );
				this.scene.add(light);
			}
			
			{
				let light = new THREE.DirectionalLight( 0xffffff );
				light.position.set( -10, 10, 1 );
				light.target.position.set( 0, 0,0 );
				this.scene.add(light);
			}
			
			{
				let light = new THREE.DirectionalLight( 0xffffff );
				light.position.set( 0, -10, 20 );
				light.target.position.set( 0, 0,0 );
				this.scene.add(light);
			}
			
		}
	}
	
	addAnnotation(position, args = {}){
		
		if(position instanceof Array){
			args.position = new THREE.Vector3().fromArray(position);
		}else if(position instanceof THREE.Vector3){
			args.position = position;
		} 
		let annotation = new Potree.Annotation(args);
		this.annotations.add(annotation);
	}
	
	getAnnotations(){
		return this.annotations;
	};
	
};

Potree.Viewer = class PotreeViewer extends THREE.EventDispatcher{

	
	constructor(domElement, args){
		super();
		
		let a = args || {};
		this.pointCloudLoadedCallback = a.onPointCloudLoaded || function(){};
		
		this.renderArea = domElement;
		
		//if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
		//	defaultSettings.navigation = "Orbit";
		//}
		
		this.server = null;
		
		this.fov = 60;
		this.clipMode = Potree.ClipMode.HIGHLIGHT_INSIDE;
		this.isFlipYZ = false;
		this.useDEMCollisions = false;
		this.minNodeSize = 100;
		this.directionalLight;
		this.edlStrength = 1.0;
		this.edlRadius = 1.4;
		this.useEDL = false;
		this.classifications = {
			0:  { visible: true, name: "never classified" },
			1:  { visible: true, name: "unclassified"     },
			2:  { visible: true, name: "ground"           },
			3:  { visible: true, name: "low vegetation"   },
			4:  { visible: true, name: "medium vegetation"},
			5:  { visible: true, name: "high vegetation"  },
			6:  { visible: true, name: "building"         },
			7:  { visible: true, name: "low point(noise)" },
			8:  { visible: true, name: "key-point"        },
			9:  { visible: true, name: "water"            },
			12: { visible: true, name: "overlap"          }
		};
		
		this.moveSpeed = 10;		

		this.LENGTH_UNITS = {
			METER : {code: "m"},
			FEET: {code: "ft"},
			INCH: {code: "\u2033"}
		};
		this.lengthUnit = this.LENGTH_UNITS.METER;

		this.showBoundingBox = false;
		this.showAnnotations = true;
		this.freeze = false;

		this.mapView;

		this.progressBar = new ProgressBar();

		this.stats = new Stats();
		//this.stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
		//document.body.appendChild( this.stats.dom );
		//this.stats.dom.style.left = "100px";
		
		this.potreeRenderer = null;
		this.edlRenderer = null;
		this.renderer = null;
		
		this.scene = null;
		
		this.inputHandler = null;

		this.measuringTool = null;
		this.profileTool = null;
		this.volumeTool = null;
		this.transformationTool = null;
		
		this.skybox = null;
		this.clock = new THREE.Clock();
		this.background = null;
		
		this.initThree();
		
		let scene = new Potree.Scene(this.renderer);
		this.setScene(scene);
		
		{
			this.inputHandler = new Potree.InputHandler(this);
			this.inputHandler.setScene(this.scene);
			
			this.measuringTool = new Potree.MeasuringTool(this);
			this.profileTool = new Potree.ProfileTool(this);
			this.volumeTool = new Potree.VolumeTool(this);
			this.transformationTool = new Potree.TransformationTool(this);
			
			this.createControls();
			
			this.measuringTool.setScene(this.scene);
			this.profileTool.setScene(this.scene);
			this.volumeTool.setScene(this.scene);
			
			let onPointcloudAdded = (e) => {
				if(this.scene.pointclouds.length === 1){
					let speed = e.pointcloud.boundingBox.getSize().length();
					speed = speed / 5;
					this.setMoveSpeed(speed);
				}				
			};
			
			this.addEventListener("scene_changed", (e) => {
				this.inputHandler.setScene(e.scene);
				this.measuringTool.setScene(e.scene);
				this.profileTool.setScene(e.scene);
				this.volumeTool.setScene(e.scene);
				
				if(!e.scene.hasEventListener("pointcloud_added", onPointcloudAdded)){
					e.scene.addEventListener("pointcloud_added", onPointcloudAdded);
				}
			});
			
			this.scene.addEventListener("pointcloud_added", onPointcloudAdded);
		}
		
		{// set defaults
			this.setFOV(60);
			this.setEDLEnabled(false);
			this.setEDLRadius(1.4);
			this.setEDLStrength(1.0);
			this.setClipMode(Potree.ClipMode.HIGHLIGHT_INSIDE);
			this.setPointBudget(1*1000*1000);
			this.setShowBoundingBox(false);
			this.setFreeze(false);
			this.setNavigationMode(Potree.OrbitControls);
			this.setBackground("gradient");
			
			this.scaleFactor = 1;
		
			this.loadSettingsFromURL();
		}

		// start rendering!
		requestAnimationFrame(this.loop.bind(this));
		
	}

//------------------------------------------------------------------------------------
// Viewer API 
//------------------------------------------------------------------------------------

	
	
	setScene(scene){
		
		if(scene === this.scene){
			return;
		}
		
		let oldScene = this.scene;
		this.scene = scene;
		
		this.dispatchEvent({
			type: "scene_changed",
			oldScene: oldScene,
			scene: scene
		});
		
		
		{ // Annotations
			$(".annotation").detach();
			
			//for(let annotation of this.scene.annotations){
			//	this.renderArea.appendChild(annotation.domElement[0]);
			//}
			
			this.scene.annotations.traverse(annotation => {
				this.renderArea.appendChild(annotation.domElement[0]);
			});
			
			if(!this.onAnnotationAdded){
				this.onAnnotationAdded = e => {

				//console.log("annotation added: " + e.annotation.title);
				
				e.annotation.traverse(node => {
					this.renderArea.appendChild(node.domElement[0]);
					node.scene = this.scene;
				});

				};
			}
		
			this.scene.annotations.addEventListener("annotation_added", this.onAnnotationAdded);
			if(oldScene){
				oldScene.annotations.removeEventListener("annotation_added", this.onAnnotationAdded);
			}
		}
		
	};
	
	getControls(navigationMode){
		if(navigationMode === Potree.OrbitControls){
			return this.orbitControls;
		}else if(navigationMode === Potree.FirstPersonControls){
			return this.fpControls;
		}else if(navigationMode === Potree.EarthControls){
			return this.earthControls;
		}else{
			return null;
		}
	}
	
	getMinNodeSize(){
		return this.minNodeSize;
	};
	
	setMinNodeSize(value){
		if(this.minNodeSize !== value){
			this.minNodeSize = value;
			this.dispatchEvent({"type": "minnodesize_changed", "viewer": this});
		}
	};
	
	getBackground(){
		return this.background;
	};
	
	setBackground(bg){
		if(this.background === bg){
			return;
		}
		
		this.background = bg;
		this.dispatchEvent({"type": "background_changed", "viewer": this});
	}
	
	setDescription(value){
		$('#potree_description')[0].innerHTML = value;
	};
	
	setNavigationMode(value){
		this.scene.view.navigationMode = value;
	};
	
	setShowBoundingBox(value){
		if(this.showBoundingBox !== value){
			this.showBoundingBox = value;
			this.dispatchEvent({"type": "show_boundingbox_changed", "viewer": this});
		}
	};
	
	getShowBoundingBox(){
		return showBoundingBox;
	};
	
	setMoveSpeed(value){
		if(this.moveSpeed !== value){
			this.moveSpeed = value;
			this.dispatchEvent({"type": "move_speed_changed", "viewer": this, "speed": value});
		}
	};
	
	getMoveSpeed(){
		return this.moveSpeed;
	};
	
	setWeightClassification(w){
		for(let i = 0; i < this.scene.pointclouds.length; i++) {
			this.scene.pointclouds[i].material.weightClassification = w;	
			this.dispatchEvent({"type": "attribute_weights_changed" + i, "viewer": this});		
		}
	};
	
	setFreeze(value){
		if(this.freeze != value){
			this.freeze = value;
			this.dispatchEvent({"type": "freeze_changed", "viewer": this});
		}
	};
	
	getFreeze(){
		return this.freeze;
	};
	
	setPointBudget(value){

		if(Potree.pointBudget !== value){
			Potree.pointBudget = parseInt(value);
			this.dispatchEvent({"type": "point_budget_changed", "viewer": this});
		}
	};
	
	getPointBudget(){
		return Potree.pointBudget;
	};
	
	setShowAnnotations(value){
		if(this.showAnnotations !== value){
			this.showAnnotations = value;
			this.dispatchEvent({"type": "show_annotations_changed", "viewer": this});
		}
	}
	
	getShowAnnotations(){
		return this.showAnnotations;
	}
	
	setClipMode(clipMode){
		if(this.clipMode !== clipMode){
			this.clipMode = clipMode;
			this.dispatchEvent({"type": "clip_mode_changed", "viewer": this});
		}
	};
	
	getClipMode(){
		return this.clipMode;
	};
	
	setDEMCollisionsEnabled(value){
		if(this.useDEMCollisions !== value){
			this.useDEMCollisions = value;
			this.dispatchEvent({"type": "use_demcollisions_changed", "viewer": this});
		};
	};
	
	getDEMCollisionsEnabled(){
		return this.useDEMCollisions;
	};
	
	setEDLEnabled(value){
		if(this.useEDL != value){
			this.useEDL = value;
			this.dispatchEvent({"type": "use_edl_changed", "viewer": this});
		}
	};
	
	getEDLEnabled(){
		return this.useEDL;
	};
	
	setEDLRadius(value){
		if(this.edlRadius !== value){
			this.edlRadius = value;
			this.dispatchEvent({"type": "edl_radius_changed", "viewer": this});
		}
	};
	
	getEDLRadius(){
		return this.edlRadius;
	};
	
	setEDLStrength(value){
		if(this.edlStrength !== value){
			this.edlStrength = value;
			this.dispatchEvent({"type": "edl_strength_changed", "viewer": this});
		}
	};
	
	getEDLStrength(){
		return this.edlStrength;
	};
	
	setFOV(value){
		if(this.fov !== value){
			this.fov = value;
			this.dispatchEvent({"type": "fov_changed", "viewer": this});
		}
	};
	
	getFOV(){
		return this.fov;
	};
	
	disableAnnotations(){
		this.scene.annotations.traverse(annotation => {
			annotation.domElement.css("pointer-events", "none");
			
			//return annotation.visible;
		});
	};
	
	enableAnnotations(){
		this.scene.annotations.traverse(annotation => {
			annotation.domElement.css("pointer-events", "auto");
			
			//return annotation.visible;
		});
	};
	
	setClassificationVisibility(key, value){
		
		if(!this.classifications[key]){
			this.classifications[key] = {visible: value, name: "no name"};
			this.dispatchEvent({"type": "classification_visibility_changed", "viewer": this});
		}else if(this.classifications[key].visible !== value){
			this.classifications[key].visible = value;
			this.dispatchEvent({"type": "classification_visibility_changed", "viewer": this});
		}
	};

	setLengthUnit(value) {
		switch(value) {
			case "m":
				this.lengthUnit = this.LENGTH_UNITS.METER;
				break;
			case "ft":				
				this.lengthUnit = this.LENGTH_UNITS.FEET;
				break;
			case "in":				
				this.lengthUnit = this.LENGTH_UNITS.INCH;
				break;
		}

		this.dispatchEvent({"type": "length_unit_changed", "viewer": this});
	}
	
	toMaterialID(materialName){

		if(materialName === "RGB"){
			return Potree.PointColorType.RGB;
		}else if(materialName === "Color"){
			return Potree.PointColorType.COLOR;
		}else if(materialName === "Elevation"){
			return Potree.PointColorType.HEIGHT;
		}else if(materialName === "Intensity"){
			return Potree.PointColorType.INTENSITY;
		}else if(materialName === "Intensity Gradient"){
			return Potree.PointColorType.INTENSITY_GRADIENT;
		}else if(materialName === "Classification"){
			return Potree.PointColorType.CLASSIFICATION;
		}else if(materialName === "Return Number"){
			return Potree.PointColorType.RETURN_NUMBER;
		}else if(materialName === "Source"){
			return Potree.PointColorType.SOURCE;
		}else if(materialName === "Level of Detail"){
			return Potree.PointColorType.LOD;
		}else if(materialName === "Point Index"){
			return Potree.PointColorType.POINT_INDEX;
		}else if(materialName === "Normal"){
			return Potree.PointColorType.NORMAL;
		}else if(materialName === "Phong"){
			return Potree.PointColorType.PHONG;
		}else if(materialName === "RGB and Elevation"){
			return Potree.PointColorType.RGB_HEIGHT;
		}else if(materialName === "Composite"){
			return Potree.PointColorType.COMPOSITE;
		}
	};
	
	toMaterialName(materialID){

		if(materialID === Potree.PointColorType.RGB){
			return "RGB";
		}else if(materialID === Potree.PointColorType.COLOR){
			return "Color";
		}else if(materialID === Potree.PointColorType.HEIGHT){
			return "Elevation";
		}else if(materialID === Potree.PointColorType.INTENSITY){
			return "Intensity";
		}else if(materialID === Potree.PointColorType.INTENSITY_GRADIENT){
			return "Intensity Gradient";
		}else if(materialID === Potree.PointColorType.CLASSIFICATION){
			return "Classification";
		}else if(materialID === Potree.PointColorType.RETURN_NUMBER){
			return "Return Number";
		}else if(materialID === Potree.PointColorType.SOURCE){
			return "Source";
		}else if(materialID === Potree.PointColorType.LOD){
			return "Level of Detail";
		}else if(materialID === Potree.PointColorType.POINT_INDEX){
			return "Point Index";
		}else if(materialID === Potree.PointColorType.NORMAL){
			return "Normal";
		}else if(materialID === Potree.PointColorType.PHONG){
			return "Phong";
		}else if(materialID === Potree.PointColorType.RGB_HEIGHT){
			return "RGB and Elevation";
		}else if(materialID === Potree.PointColorType.COMPOSITE){
			return "Composite";
		}
	};
	
	zoomTo(node, factor){
		//this.scene.camera.zoomTo(node, factor);
		let view = this.scene.view;
	
		this.scene.cameraP.position.copy(view.position);
		this.scene.cameraP.lookAt(view.getPivot());
		this.scene.cameraP.updateMatrixWorld();
		this.scene.cameraP.zoomTo(node, factor);

		this.scene.cameraO.position.copy(view.position);
		this.scene.cameraO.lookAt(view.getPivot());
		this.scene.cameraO.updateMatrixWorld();
		this.scene.cameraO.zoomTo(node, factor);
		
		let bs;
		if(node.boundingSphere){
			bs = node.boundingSphere;
		}else if(node.geometry && node.geometry.boundingSphere){
			bs = node.geometry.boundingSphere;
		}else{
			bs = node.boundingBox.getBoundingSphere();
		}
		
		bs = bs.clone().applyMatrix4(node.matrixWorld); 
		
		view.position.copy(this.scene.getActiveCamera().position);
		view.radius = view.position.distanceTo(bs.center);
		//let target = bs.center;
		//target.z = target.z - bs.radius * 0.8;
		//view.lookAt(target);
		
		this.dispatchEvent({"type": "zoom_to", "viewer": this});
	};
	
	showAbout(){
		$(function() {
			$( "#about-panel" ).dialog();
		});
	};
	
	getBoundingBox(pointclouds){
		pointclouds = pointclouds || this.scene.pointclouds;
		
		let box = new THREE.Box3();
		
		this.scene.scenePointCloud.updateMatrixWorld(true);
		this.scene.referenceFrame.updateMatrixWorld(true);
		
		for(let pointcloud of this.scene.pointclouds){
			pointcloud.updateMatrixWorld(true);
			
			let pointcloudBox = pointcloud.pcoGeometry.tightBoundingBox ?  pointcloud.pcoGeometry.tightBoundingBox : pointcloud.boundingBox;
			let boxWorld = Potree.utils.computeTransformedBoundingBox(pointcloudBox, pointcloud.matrixWorld)
			box.union(boxWorld);
		}

		return box;
	};
	
	fitToScreen(factor = 1){
		let box = this.getBoundingBox(this.scene.pointclouds);
		
		let node = new THREE.Object3D();
		node.boundingBox = box;
		
		this.zoomTo(node, factor);
	};
	
	setTopView(){
		this.scene.view.yaw = 0;
		this.scene.view.pitch = -Math.PI / 2;
		
		this.fitToScreen();
	};
	
	setFrontView(){
		this.scene.view.yaw = 0;
		this.scene.view.pitch = 0;
		
		this.fitToScreen();
	};
	
	setLeftView(){
		this.scene.view.yaw = -Math.PI / 2;
		this.scene.view.pitch = 0;
		
		this.fitToScreen();
	};
	
	setRightView(){
		this.scene.view.yaw = Math.PI / 2;
		this.scene.view.pitch = 0;
		
		this.fitToScreen();
	};
	
	flipYZ(){
		this.isFlipYZ = !this.isFlipYZ
		
		// TODO flipyz 
		console.log("TODO");
	}
	
	loadSettingsFromURL(){
		if(Potree.utils.getParameterByName("pointSize")){
			this.setPointSize(parseFloat(Potree.utils.getParameterByName("pointSize")));
		}
		
		if(Potree.utils.getParameterByName("FOV")){
			this.setFOV(parseFloat(Potree.utils.getParameterByName("FOV")));
		}
		
		if(Potree.utils.getParameterByName("opacity")){
			this.setOpacity(parseFloat(Potree.utils.getParameterByName("opacity")));
		}
		
		if(Potree.utils.getParameterByName("edlEnabled")){
			let enabled = Potree.utils.getParameterByName("edlEnabled") === "true";
			this.setEDLEnabled(enabled);
		}
		
		if(Potree.utils.getParameterByName("edlRadius")){
			this.setEDLRadius(parseFloat(Potree.utils.getParameterByName("edlRadius")));
		}
		
		if(Potree.utils.getParameterByName("edlStrength")){
			this.setEDLStrength(parseFloat(Potree.utils.getParameterByName("edlStrength")));
		}
		
		if(Potree.utils.getParameterByName("clipMode")){
			let clipMode = Potree.utils.getParameterByName("clipMode");
			if(clipMode === "HIGHLIGHT_INSIDE"){
				this.setClipMode(Potree.ClipMode.HIGHLIGHT_INSIDE);
			}else if(clipMode === "CLIP_OUTSIDE"){
				this.setClipMode(Potree.ClipMode.CLIP_OUTSIDE);
			}else if(clipMode === "DISABLED"){
				this.setClipMode(Potree.ClipMode.DISABLED);
			}
		}

		if(Potree.utils.getParameterByName("pointBudget")){
			this.setPointBudget(parseFloat(Potree.utils.getParameterByName("pointBudget")));
		}

		if(Potree.utils.getParameterByName("showBoundingBox")){
			let enabled = Potree.utils.getParameterByName("showBoundingBox") === "true";
			if(enabled){
				this.setShowBoundingBox(true);
			}else{
				this.setShowBoundingBox(false);
			}
		}

		if(Potree.utils.getParameterByName("material")){
			let material = Potree.utils.getParameterByName("material");
			this.setMaterial(material);
		}

		if(Potree.utils.getParameterByName("pointSizing")){
			let sizing = Potree.utils.getParameterByName("pointSizing");
			this.setPointSizing(sizing);
		}

		if(Potree.utils.getParameterByName("quality")){
			let quality = Potree.utils.getParameterByName("quality");
			this.setQuality(quality);
		}
		
		if(Potree.utils.getParameterByName("position")){
			let value = Potree.utils.getParameterByName("position");
			value = value.replace("[", "").replace("]", "");
			let tokens = value.split(";");
			let x = parseFloat(tokens[0]);
			let y = parseFloat(tokens[1]);
			let z = parseFloat(tokens[2]);
			
			this.scene.view.position.set(x, y, z);
		}
		
		if(Potree.utils.getParameterByName("target")){
			let value = Potree.utils.getParameterByName("target");
			value = value.replace("[", "").replace("]", "");
			let tokens = value.split(";");
			let x = parseFloat(tokens[0]);
			let y = parseFloat(tokens[1]);
			let z = parseFloat(tokens[2]);
			
			this.scene.view.lookAt(new THREE.Vector3(x, y, z));
		}
		
		if(Potree.utils.getParameterByName("background")){
			let value = Potree.utils.getParameterByName("background");
			this.setBackground(value);
		}
		
		//if(Potree.utils.getParameterByName("elevationRange")){
		//	let value = Potree.utils.getParameterByName("elevationRange");
		//	value = value.replace("[", "").replace("]", "");
		//	let tokens = value.split(";");
		//	let x = parseFloat(tokens[0]);
		//	let y = parseFloat(tokens[1]);
		//	
		//	this.setElevationRange(x, y);
		//	//this.scene.view.target.set(x, y, z);
		//}
		
	};
	
	
	
	

	
	
	
//------------------------------------------------------------------------------------
// Viewer Internals
//------------------------------------------------------------------------------------

	createControls(){
		{ // create FIRST PERSON CONTROLS
			this.fpControls = new Potree.FirstPersonControls(this);
			this.fpControls.enabled = false;
			this.fpControls.addEventListener("start", this.disableAnnotations.bind(this));
			this.fpControls.addEventListener("end", this.enableAnnotations.bind(this));
			//this.fpControls.addEventListener("double_click_move", (event) => {
			//	let distance = event.targetLocation.distanceTo(event.position);
			//	this.setMoveSpeed(Math.pow(distance, 0.4));
			//});
			//this.fpControls.addEventListener("move_speed_changed", (event) => {
			//	this.setMoveSpeed(this.fpControls.moveSpeed);
			//});
		}
		
		//{ // create GEO CONTROLS
		//	this.geoControls = new Potree.GeoControls(this.scene.camera, this.renderer.domElement);
		//	this.geoControls.enabled = false;
		//	this.geoControls.addEventListener("start", this.disableAnnotations.bind(this));
		//	this.geoControls.addEventListener("end", this.enableAnnotations.bind(this));
		//	this.geoControls.addEventListener("move_speed_changed", (event) => {
		//		this.setMoveSpeed(this.geoControls.moveSpeed);
		//	});
		//}
	
		{ // create ORBIT CONTROLS
			this.orbitControls = new Potree.OrbitControls(this);
			this.orbitControls.enabled = false;
			this.orbitControls.addEventListener("start", this.disableAnnotations.bind(this));
			this.orbitControls.addEventListener("end", this.enableAnnotations.bind(this));
		}
		
		{ // create EARTH CONTROLS
			this.earthControls = new Potree.EarthControls(this);
			this.earthControls.enabled = false;
			this.earthControls.addEventListener("start", this.disableAnnotations.bind(this));
			this.earthControls.addEventListener("end", this.enableAnnotations.bind(this));
		}
	};

	toggleSidebar(){
		
		let renderArea = $('#potree_render_area');
		let sidebar = $('#potree_sidebar_container');
		let isVisible = renderArea.css("left") !== "0px";

		if(isVisible){
			renderArea.css("left", "0px");
		}else{
			renderArea.css("left", "300px");
		}
	};
	
	toggleMap(){
		let map = $('#potree_map');
		map.toggle(100);

	};

	loadGUI(callback){
		let sidebarContainer = $('#potree_sidebar_container');
		sidebarContainer.load(new URL(Potree.scriptPath + "/sidebar.html").href, () => {
			
			sidebarContainer.css("width", "300px");
			sidebarContainer.css("height", "100%");
			
			let imgMenuToggle = document.createElement("img");
			imgMenuToggle.src = new URL(Potree.resourcePath + "/icons/menu_button.svg").href;
			imgMenuToggle.onclick = this.toggleSidebar;
			imgMenuToggle.classList.add("potree_menu_toggle");

			let imgMapToggle = document.createElement("img");
			imgMapToggle.src = new URL(Potree.resourcePath + "/icons/map_icon.png").href;
			imgMapToggle.style.display = "none";
			imgMapToggle.onclick = this.toggleMap;
			imgMapToggle.id = "potree_map_toggle";
			
			viewer.renderArea.insertBefore(imgMapToggle, viewer.renderArea.children[0]);
			viewer.renderArea.insertBefore(imgMenuToggle, viewer.renderArea.children[0]);
			
			this.mapView = new Potree.MapView(this);
			this.mapView.init();
			
			i18n.init({ 
				lng: 'en',
				resGetPath: Potree.resourcePath + '/lang/__lng__/__ns__.json',
				preload: ['en', 'fr', 'de', 'jp'],
				getAsync: true,
				debug: false
				}, function(t) { 
				// Start translation once everything is loaded
				$("body").i18n();
			});
			
			$(function() {
				initSidebar();
			});
			
			let elProfile = $('<div>').load(new URL(Potree.scriptPath + "/profile.html").href, () => {
				$(document.body).append(elProfile.children());
				this.profileWindow = new Potree.ProfileWindow(this);
				this.profileWindowController = new Potree.ProfileWindowController(this);
				
				$("#profile_window").draggable({
					handle: $("#profile_titlebar"),
					containment: $(document.body)
				});
				$("#profile_window").resizable({
					containment: $(document.body),
					handles: "n, e, s, w"
				});
				
				if(callback){
					$(callback);
				}
			});
			
			
			
		});
		
		
		
	}
    
    setLanguage(lang){
        i18n.setLng(lang);
        $("body").i18n();
    }
	
	setServer(server){
		this.server = server;
	}
	
	initThree(){
		let width = this.renderArea.clientWidth;
		let height = this.renderArea.clientHeight;

		this.renderer = new THREE.WebGLRenderer({premultipliedAlpha: false});
		this.renderer.setSize(width, height);
		this.renderer.autoClear = false;
		this.renderArea.appendChild(this.renderer.domElement);
		this.renderer.domElement.tabIndex = "2222";
		this.renderer.domElement.addEventListener("mousedown", function(){
			this.renderer.domElement.focus();
		}.bind(this));
		
		this.skybox = Potree.utils.loadSkybox(new URL(Potree.resourcePath + "/textures/skybox2/").href);

		// enable frag_depth extension for the interpolation shader, if available
		this.renderer.context.getExtension("EXT_frag_depth");
	}
	
	updateAnnotations(){
		
		if(!this.getShowAnnotations()){
			this.scene.annotations.traverseDescendants(descendant => {
				if(!descendant.__visible || !descendant.visible){
					return false;
				}else{
					descendant.__visible = false;
					//descendant.domElement[0].style.display = "none";
					descendant.domElement.fadeOut(200);
				}
				
				return;
			});
			
			return;
		}
		
		this.scene.annotations.updateBounds();
		this.scene.cameraP.updateMatrixWorld();
		this.scene.cameraO.updateMatrixWorld();
		
		let distances = [];

		this.scene.annotations.traverse(annotation => {
			
			if(annotation === this.scene.annotations){
				return true;
			}
			
			if(!annotation.visible){
				return false;
			}
			
			annotation.scene = this.scene;
			
			let element = annotation.domElement;
			
			let position = annotation.position;
			if(!position){
				position = annotation.boundingBox.getCenter();
			}

			// TODO ortho
			
			let distance = viewer.scene.cameraP.position.distanceTo(position);
			let radius = annotation.boundingBox.getBoundingSphere().radius;
			
			let screenPos = new THREE.Vector3();
			let screenSize = 0;
			{
				// SCREEN POS
				screenPos.copy(position).project(this.scene.cameraP);
				screenPos.x = this.renderArea.clientWidth * (screenPos.x + 1) / 2;
				screenPos.y = this.renderArea.clientHeight * (1 - (screenPos.y + 1) / 2);
				
				screenPos.x = Math.floor(screenPos.x - element[0].clientWidth / 2);
				screenPos.y = Math.floor(screenPos.y - annotation.elTitlebar[0].clientHeight / 2);
				
				// SCREEN SIZE
				let fov = Math.PI * viewer.scene.cameraP.fov / 180;
				let slope = Math.tan(fov / 2.0);
				let projFactor =  0.5 * this.renderArea.clientHeight / (slope * distance);
				
				screenSize = radius * projFactor;
			}
			
			element.css("left", screenPos.x + "px");
			element.css("top", screenPos.y + "px");
			
			let zIndex = 10000000 - distance * (10000000 / this.scene.cameraP.far);
			if(annotation.descriptionVisible){
				zIndex += 10000000;
			}
			
			element.css("z-index", parseInt(zIndex));
			
			if(annotation.children.length > 0){
				let expand = screenSize > annotation.collapseThreshold || annotation.boundingBox.containsPoint(this.scene.cameraP.position);
				
				if(!expand){
					annotation.traverseDescendants(descendant => {
						if(!descendant.__visible){
							return;
						}else{
							descendant.__visible = false;
							//descendant.domElement.fadeOut(200);
							descendant.domElement.hide();
						}
					});
					annotation.__visible = true;
					element.fadeIn(200);
				}else{
					annotation.__visible = true;
					element.fadeOut(200);
				}
				
				return expand;
			}else{
				annotation.__visible = (-1 <= screenPos.z && screenPos.z <= 1);
				if(annotation.__visible){
					$(element).fadeIn(200);
				}else{
					$(element).fadeOut(200);
				}
			}
			
			
		});
	}

	update(delta, timestamp){
		
		//if(window.urlToggle === undefined){
		//	window.urlToggle = 0;
		//}else{
		//	
		//	if(window.urlToggle > 1){
		//		{
		//			
		//			let currentValue = Potree.utils.getParameterByName("position");
		//			let strPosition = "["  
		//				+ this.scene.view.position.x.toFixed(3) + ";"
		//				+ this.scene.view.position.y.toFixed(3) + ";"
		//				+ this.scene.view.position.z.toFixed(3) + "]";
		//			if(currentValue !== strPosition){
		//				Potree.utils.setParameter("position", strPosition);
		//			}
		//			
		//		}
		//		
		//		{
		//			let currentValue = Potree.utils.getParameterByName("target");
		//			let pivot = this.scene.view.getPivot();
		//			let strTarget = "["  
		//				+ pivot.x.toFixed(3) + ";"
		//				+ pivot.y.toFixed(3) + ";"
		//				+ pivot.z.toFixed(3) + "]";
		//			if(currentValue !== strTarget){
		//				Potree.utils.setParameter("target", strTarget);
		//			}
		//		}
		//		
		//		window.urlToggle = 0;
		//	}
		//	
		//	window.urlToggle += delta;
		//}
		
		
		let scene = this.scene;
		let camera = scene.getActiveCamera();
		
		Potree.pointLoadLimit = Potree.pointBudget * 2;
		
		this.scene.directionalLight.position.copy(camera.position);
		this.scene.directionalLight.lookAt(new THREE.Vector3().addVectors(camera.position, camera.getWorldDirection()));
		
		let visibleNodes = 0;
		let visiblePoints = 0;
		let progress = 0;
		
		for(let pointcloud of this.scene.pointclouds){
			let bbWorld = Potree.utils.computeTransformedBoundingBox(pointcloud.boundingBox, pointcloud.matrixWorld);
				
			if(!this.intensityMax){
				let root = pointcloud.pcoGeometry.root;
				if(root != null && root.loaded){
					let attributes = pointcloud.pcoGeometry.root.geometry.attributes;
					if(attributes.intensity){
						let array = attributes.intensity.array;

						// chose max value from the 0.75 percentile
						let ordered = [];
						for(let j = 0; j < array.length; j++){
							ordered.push(array[j]);
						}
						ordered.sort();
						let capIndex = parseInt((ordered.length - 1) * 0.75);
						let cap = ordered[capIndex];

						if(cap <= 1){
							this.intensityMax = 1;
						}else if(cap <= 256){
							this.intensityMax = 255;
						}else{
							this.intensityMax = cap;
						}
					}
				}
			}
			
			pointcloud.material.clipMode = this.clipMode;
			pointcloud.showBoundingBox = this.showBoundingBox;
			pointcloud.generateDEM = this.useDEMCollisions;
			pointcloud.minimumNodePixelSize = this.minNodeSize;

			visibleNodes += pointcloud.numVisibleNodes;
			visiblePoints += pointcloud.numVisiblePoints;

			progress += pointcloud.progress;
		}
		
		// update classification visibility
		for(let pointcloud of this.scene.pointclouds){
			
			let classification = pointcloud.material.classification;
			let somethingChanged = false;
			for(let key of Object.keys(this.classifications)){
				
				let w = this.classifications[key].visible ? 1 : 0;
				
				if(classification[key]){
					if(classification[key].w !== w){
						classification[key].w = w;
						somethingChanged = true;
					}
				}else if(classification.DEFAULT){
					classification[key] = classification.DEFAULT;
					somethingChanged = true;
				}else{
					classification[key] = new THREE.Vector4(0.3, 0.6, 0.6, 0.5);
					somethingChanged = true;
				}
			}
			
			if(somethingChanged){
				pointcloud.material.recomputeClassification();
			}
		}
		
		if(!this.freeze){
			let result = Potree.updatePointClouds(scene.pointclouds, camera, this.renderer);
			visibleNodes = result.visibleNodes.length;
			visiblePoints = result.numVisiblePoints;
			camera.near = result.lowestSpacing * 10.0;
			camera.far = -this.getBoundingBox().applyMatrix4(camera.matrixWorldInverse).min.z;
			camera.far = Math.max(camera.far * 1.5, 1000);
		} 
		
		this.scene.cameraP.fov = this.fov;
		
		// Navigation mode changed?
		if(this.getControls(scene.view.navigationMode) !== this.controls){
			if(this.controls){
				this.controls.enabled = false;
				this.inputHandler.removeInputListener(this.controls);
			}
			
			this.controls = this.getControls(scene.view.navigationMode);
			this.controls.enabled = true;
			this.inputHandler.addInputListener(this.controls);
		}
		//
		if(this.controls !== null){
			this.controls.setScene(scene);
			this.controls.update(delta);

			this.scene.cameraP.position.copy(scene.view.position);
			//camera.rotation.x = scene.view.pitch;
			//camera.rotation.y = scene.view.yaw;
			
			//camera.lookAt(scene.view.getPivot());
			this.scene.cameraP.rotation.order = "ZXY";
			this.scene.cameraP.rotation.x = Math.PI / 2 + this.scene.view.pitch;
			this.scene.cameraP.rotation.z = this.scene.view.yaw;

			this.scene.cameraO.position.copy(scene.view.position);
			this.scene.cameraO.rotation.order = "ZXY";
			this.scene.cameraO.rotation.x = Math.PI / 2 + this.scene.view.pitch;
			this.scene.cameraO.rotation.z = this.scene.view.yaw;
		}

		{ // update clip boxes
			//let boxes = this.scene.profiles.reduce( (a, b) => {return a.boxes.concat(b.boxes)}, []);
			//boxes = boxes.concat(this.scene.volumes.filter(v => v.clip));
			
			let boxes = this.scene.volumes.filter(v => v.clip);
			for(let profile of this.scene.profiles){
				boxes = boxes.concat(profile.boxes);
			}
			
			
			let clipBoxes = boxes.map( box => {
				box.updateMatrixWorld();
				let boxInverse = new THREE.Matrix4().getInverse(box.matrixWorld);
				let boxPosition = box.getWorldPosition();
				return {inverse: boxInverse, position: boxPosition};
			});
			
			for(let pointcloud of this.scene.pointclouds){
				pointcloud.material.setClipBoxes(clipBoxes);
			}
		}

		this.updateAnnotations();
		
		if(this.mapView){
			this.mapView.update(delta);
			if(this.mapView.sceneProjection){
				$( "#potree_map_toggle" ).css("display", "block");
			}
		}

		TWEEN.update(timestamp);
		
		this.dispatchEvent({
			"type": "update", 
			"delta": delta, 
			"timestamp": timestamp});
	}


	loop(timestamp) {
		
		requestAnimationFrame(this.loop.bind(this));
		
		this.stats.begin();
		
		//var start = new Date().getTime();
		this.update(this.clock.getDelta(), timestamp);
		//var end = new Date().getTime();
		//var duration = end - start;
		//toggleMessage++;
		//if(toggleMessage > 30){
		//	document.getElementById("lblMessage").innerHTML = "update: " + duration + "ms";
		//	toggleMessage = 0;
		//}
		
		let queryAll = Potree.startQuery("All", viewer.renderer.getContext());
		
		if(this.useEDL && Potree.Features.SHADER_EDL.isSupported()){
			if(!this.edlRenderer){
				this.edlRenderer = new EDLRenderer(this);
			}
			this.edlRenderer.render(this.renderer);
		}else{
			if(!this.potreeRenderer){
				this.potreeRenderer = new PotreeRenderer(this);
			}
			
			this.potreeRenderer.render();
		}
		
		Potree.endQuery(queryAll, viewer.renderer.getContext());
		Potree.resolveQueries(viewer.renderer.getContext());
		
		//if(this.takeScreenshot == true){
		//	this.takeScreenshot = false;
		//	
		//	let screenshot = this.renderer.domElement.toDataURL();
		//	
		//	//document.body.appendChild(screenshot); 
		//	let w = this.open();
		//	w.document.write('<img src="'+screenshot+'"/>');
		//}	
		
		this.stats.end();

		
		Potree.framenumber++;
	};

	
};







//------------------------------------------------------------------------------------
// Renderers
//------------------------------------------------------------------------------------

class PotreeRenderer{
	
	constructor(viewer){
		this.viewer = viewer;
	};
 
	render(){
		{// resize
			let width = viewer.scaleFactor * viewer.renderArea.clientWidth;
			let height = viewer.scaleFactor * viewer.renderArea.clientHeight;
			let aspect = width / height;

			viewer.scene.cameraP.aspect = aspect;
			viewer.scene.cameraP.updateProjectionMatrix();

			let frustumScale = viewer.moveSpeed * 4.5;
			viewer.scene.cameraO.left = -frustumScale;
			viewer.scene.cameraO.right = frustumScale;		
			viewer.scene.cameraO.top = frustumScale * 1/aspect;
			viewer.scene.cameraO.bottom = -frustumScale * 1/aspect;		
			viewer.scene.cameraO.updateProjectionMatrix();
			
			viewer.renderer.setSize(width, height);
		}
		
		/*
		if(Potree.framenumber > 20 && false){
			
			if(Potree.__dems === undefined){
				Potree.__dems = {};
				Potree.__dems.targetElevation = new THREE.WebGLRenderTarget( 128, 128, { 
					minFilter: THREE.NearestFilter, 
					magFilter: THREE.NearestFilter, 
					format: THREE.RGBAFormat
				} );
				
				Potree.__dems.targetMedian = new THREE.WebGLRenderTarget( 128, 128, { 
					minFilter: THREE.NearestFilter, 
					magFilter: THREE.NearestFilter, 
					format: THREE.RGBAFormat
				} );
				
				Potree.__dems.camera = new THREE.OrthographicCamera(0, 1, 1, 0, 0, 1);
				
				// VERTEX SHADER
				let vsElevation = `
					precision mediump float;
					precision mediump int;
					
					attribute vec3 position;
					
					uniform mat4 modelMatrix;
					uniform mat4 modelViewMatrix;
					uniform mat4 projectionMatrix;
					
					varying float vElevation;
					
					void main(){
						vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
						gl_Position = projectionMatrix * mvPosition;
						gl_PointSize = 1.0;
						
						vElevation = position.z;
					}
				`;
				
				// FRAGMENT SHADER
				let fsElevation = `
					precision mediump float;
					precision mediump int;
					
					varying float vElevation;
					
					void main(){
						gl_FragColor = vec4(vElevation / 50.0, 0.0, 0.0, 1.0);
					}
				`;
				
				let vsMedian = `
					precision mediump float;
					precision mediump int;
					
					attribute vec3 position;
					attribute vec2 uv;
					
					uniform mat4 modelMatrix;
					uniform mat4 modelViewMatrix;
					uniform mat4 projectionMatrix;
				
					varying vec2 vUV;

					void main() {
						vUV = uv;
						
						vec4 mvPosition = modelViewMatrix * vec4(position,1.0);

						gl_Position = projectionMatrix * mvPosition;
					}
				`;
				
				let fsMedian = `
				
					precision mediump float;
					precision mediump int;
					
					uniform float uWidth;
					uniform float uHeight;					
					uniform sampler2D uTexture;

					varying vec2 vUV;
					
					void main(){
						vec2 uv = gl_FragCoord.xy / vec2(uWidth, uHeight);						
						
						vec4 color = texture2D(uTexture, uv);
						gl_FragColor = color;
                        if(color.a == 0.0){
							
                            vec4 sum;
                            
                            float minVal = 1.0 / 0.0;
                            
                            float sumA = 0.0;
							for(int i = -1; i <= 1; i++){
								for(int j = -1; j <= 1; j++){
									vec2 n = gl_FragCoord.xy + vec2(i, j);
                                    vec2 uv = n / vec2(uWidth, uHeight);	
                                    vec4 c = texture2D(uTexture, uv);
                                    
                                    if(c.a == 1.0){
                                    	minVal = min(c.r, minVal);
                                    }
                                    
                                    sumA += c.a;
								}
							}
                            
                            if(sumA > 0.0){
                            	gl_FragColor = vec4(minVal, 0.0, 0.0, 1.0);
                            }else{
                            	discard;   
                            }
						}else{
							//gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
							gl_FragColor = vec4(color.rgb, 1.0);
						}
						
						
					}
				
				`;
				
				Potree.__dems.elevationMaterial = new THREE.RawShaderMaterial( {
					vertexShader: vsElevation,
					fragmentShader: fsElevation,
				} );
				
				Potree.__dems.medianFilterMaterial = new THREE.RawShaderMaterial( {
					uniforms: {
						uWidth: {value: 1.0},
						uHeight: {value: 1.0},
						uTexture: {type: "t", value: Potree.__dems.targetElevation.texture}
					},
					vertexShader: vsMedian,
					fragmentShader: fsMedian,
				} );
				
			}
			let dems = Potree.__dems;
			let camera = dems.camera;
			viewer.renderer.setClearColor(0x0000FF, 0);
			viewer.renderer.clearTarget(dems.targetElevation, true, true, false );
			viewer.renderer.clearTarget(dems.targetMedian, true, true, false );

			let node = viewer.scene.pointclouds[0].root;
			if(node.geometryNode){
				let box = node.geometryNode.boundingBox;
				
				
				camera.up.set(0, 0, 1);
				//camera.rotation.x = Math.PI / 2;
				camera.left = box.min.x;
				camera.right = box.max.x;
				camera.top = box.max.y;
				camera.bottom = box.min.y;
				camera.near = -1000;
				camera.far = 1000;
				camera.updateProjectionMatrix();
				
				let scene = new THREE.Scene();
				//let material = new THREE.PointsMaterial({color: 0x00ff00, size: 0.0001});
				let material = dems.elevationMaterial;
				let pointcloud = new THREE.Points(node.geometryNode.geometry, material);
				scene.add(pointcloud);
				
				viewer.renderer.render(pointcloud, camera, dems.targetElevation);
				
				dems.medianFilterMaterial.uniforms.uWidth.value = dems.targetMedian.width;
				dems.medianFilterMaterial.uniforms.uHeight.value = dems.targetMedian.height;
				dems.medianFilterMaterial.uniforms.uTexture.value = dems.targetElevation.texture;
				
				Potree.utils.screenPass.render(viewer.renderer, dems.medianFilterMaterial, dems.targetMedian);

				plane.material = new THREE.MeshBasicMaterial({map: dems.targetMedian.texture});
			}
		}*/
		

		//var queryAll = Potree.startQuery("All", viewer.renderer.getContext());
		
		// render skybox
		if(viewer.background === "skybox"){
			viewer.renderer.clear(true, true, false);
			viewer.skybox.camera.rotation.copy(viewer.scene.cameraP.rotation);
			viewer.skybox.camera.fov = viewer.scene.cameraP.fov;
			viewer.skybox.camera.aspect = viewer.scene.cameraP.aspect;
			viewer.skybox.camera.updateProjectionMatrix();
			viewer.renderer.render(viewer.skybox.scene, viewer.skybox.camera);
		}else if(viewer.background === "gradient"){
			//viewer.renderer.clear(true, true, false);
			viewer.renderer.render(viewer.scene.sceneBG, viewer.scene.cameraBG);
		}else if(viewer.background === "black"){
			viewer.renderer.setClearColor(0x000000, 1);
			viewer.renderer.clear(true, true, false);
		}else if(viewer.background === "white"){
			viewer.renderer.setClearColor(0xFFFFFF, 1);
			viewer.renderer.clear(true, true, false);
		}
		
		//var queryPC = Potree.startQuery("PointCloud", viewer.renderer.getContext());
		let activeCam = viewer.scene.getActiveCamera();
		viewer.renderer.render(viewer.scene.scenePointCloud, activeCam);
		//Potree.endQuery(queryPC, viewer.renderer.getContext());
		
		// render scene
		viewer.renderer.render(viewer.scene.scene, activeCam);
		
		viewer.volumeTool.update();
		viewer.renderer.render(viewer.volumeTool.sceneVolume, activeCam);
		viewer.renderer.render(viewer.controls.sceneControls, activeCam);
		
		viewer.renderer.clearDepth();
		
		viewer.measuringTool.update();
		viewer.profileTool.update();
		viewer.transformationTool.update();
		
		viewer.renderer.render(viewer.measuringTool.sceneMeasurement, activeCam);
		viewer.renderer.render(viewer.profileTool.sceneProfile, activeCam);
		viewer.renderer.render(viewer.transformationTool.sceneTransform, activeCam);
		
		
		//Potree.endQuery(queryAll, viewer.renderer.getContext());
		
		//Potree.resolveQueries(viewer.renderer.getContext());
	};
};


class EDLRenderer{
	
	constructor(viewer){
		this.viewer = viewer;
		
		this.edlMaterial = null;
		this.attributeMaterials = [];
		
		this.rtColor = null;
		this.gl = viewer.renderer.context;
	}
	
	initEDL(){
		if(this.edlMaterial != null){
			return;
		}
		
		//var depthTextureExt = gl.getExtension("WEBGL_depth_texture"); 
		
		this.edlMaterial = new Potree.EyeDomeLightingMaterial();
		
		this.rtColor = new THREE.WebGLRenderTarget( 1024, 1024, { 
			minFilter: THREE.NearestFilter, 
			magFilter: THREE.NearestFilter, 
			format: THREE.RGBAFormat, 
			type: THREE.FloatType
		} );
		this.rtColor.depthTexture = new THREE.DepthTexture();
        this.rtColor.depthTexture.type = THREE.UnsignedIntType;
		
	};
	
	resize(){
		let width = viewer.scaleFactor * viewer.renderArea.clientWidth;
		let height = viewer.scaleFactor * viewer.renderArea.clientHeight;
		let aspect = width / height;
		
		let needsResize = (this.rtColor.width != width || this.rtColor.height != height);
	
		// disposal will be unnecessary once this fix made it into three.js master: 
		// https://github.com/mrdoob/three.js/pull/6355
		if(needsResize){
			this.rtColor.dispose();
		}
		
		viewer.scene.cameraP.aspect = aspect;
		viewer.scene.cameraP.updateProjectionMatrix();

		let frustumScale = viewer.moveSpeed * 4.5;
		viewer.scene.cameraO.left = -frustumScale;
		viewer.scene.cameraO.right = frustumScale;		
		viewer.scene.cameraO.top = frustumScale * 1/aspect;
		viewer.scene.cameraO.bottom = -frustumScale * 1/aspect;		
		viewer.scene.cameraO.updateProjectionMatrix();
		
		viewer.renderer.setSize(width, height);
		this.rtColor.setSize(width, height);
	}

	render(){
	
		this.initEDL();
		
		this.resize();
		
		// TODO ortho
		
		if(viewer.background === "skybox"){
			viewer.renderer.clear();
			viewer.skybox.camera.rotation.copy(viewer.scene.cameraP.rotation);
			viewer.skybox.camera.fov = viewer.scene.cameraP.fov;
			viewer.skybox.camera.aspect = viewer.scene.cameraP.aspect;
			viewer.skybox.camera.updateProjectionMatrix();
			viewer.renderer.render(viewer.skybox.scene, viewer.skybox.camera);
		}else if(viewer.background === "gradient"){
			viewer.renderer.clear();
			viewer.renderer.render(viewer.scene.sceneBG, viewer.scene.cameraBG);
		}else if(viewer.background === "black"){
			viewer.renderer.setClearColor(0x000000, 0);
			viewer.renderer.clear();
		}else if(viewer.background === "white"){
			viewer.renderer.setClearColor(0xFFFFFF, 0);
			viewer.renderer.clear();
		}
		
		viewer.measuringTool.update();
		viewer.profileTool.update();
		viewer.transformationTool.update();
		viewer.volumeTool.update();
		
		
		viewer.renderer.render(viewer.scene.scene, viewer.scene.cameraP);
		
		viewer.renderer.clearTarget( this.rtColor, true, true, true );
		
		let width = viewer.renderArea.clientWidth;
		let height = viewer.renderArea.clientHeight;
		
		// COLOR & DEPTH PASS
		for(let pointcloud of viewer.scene.pointclouds){
			let octreeSize = pointcloud.pcoGeometry.boundingBox.getSize().x;
		
			let material = pointcloud.material;
			material.weighted = false;
			material.useLogarithmicDepthBuffer = false;
			material.useEDL = true;
			
			material.screenWidth = width;
			material.screenHeight = height;
			material.uniforms.visibleNodes.value = pointcloud.material.visibleNodesTexture;
			material.uniforms.octreeSize.value = octreeSize;
			material.fov = viewer.scene.cameraP.fov * (Math.PI / 180);
			material.spacing = pointcloud.pcoGeometry.spacing * Math.max(pointcloud.scale.x, pointcloud.scale.y, pointcloud.scale.z);
			material.near = viewer.scene.cameraP.near;
			material.far = viewer.scene.cameraP.far;
		}
		
		viewer.renderer.render(viewer.scene.scenePointCloud, viewer.scene.cameraP, this.rtColor);
		viewer.renderer.render(viewer.scene.scene, viewer.scene.cameraP, this.rtColor);

		// bit of a hack here. The EDL pass will mess up the text of the volume tool
		// so volume tool is rendered again afterwards
		//viewer.volumeTool.render(this.rtColor);
				
		
		viewer.renderer.render(viewer.volumeTool.sceneVolume, viewer.scene.cameraP, this.rtColor);
		
		{ // EDL OCCLUSION PASS
			this.edlMaterial.uniforms.screenWidth.value = width;
			this.edlMaterial.uniforms.screenHeight.value = height;
			this.edlMaterial.uniforms.colorMap.value = this.rtColor;
			this.edlMaterial.uniforms.edlStrength.value = viewer.edlStrength;
			this.edlMaterial.uniforms.radius.value = viewer.edlRadius;
			this.edlMaterial.uniforms.opacity.value = 1;
			this.edlMaterial.depthTest = true;
			this.edlMaterial.depthWrite = true;
			this.edlMaterial.transparent = true;
		
			Potree.utils.screenPass.render(viewer.renderer, this.edlMaterial);
		}	
		
		viewer.renderer.clearDepth();
		viewer.renderer.render(viewer.controls.sceneControls, viewer.scene.cameraP);
		
		viewer.renderer.render(viewer.measuringTool.sceneMeasurement, viewer.scene.cameraP);
		viewer.renderer.render(viewer.profileTool.sceneProfile, viewer.scene.cameraP);
		viewer.renderer.render(viewer.transformationTool.sceneTransform, viewer.scene.cameraP);

	}
};
