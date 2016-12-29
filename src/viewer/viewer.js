var getQueryParam = function(name) {
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(window.location.href);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}


Potree.View = {};

Potree.View.Orbit = class{
	constructor(position, target){
		this.fov = (Math.PI * 60) / 180;
		this.position = new THREE.Vector3(10, 10, 10);
		this.target = new THREE.Vector3(0, 0, 0);
	}
};

Potree.View.FirstPerson = class{
	constructor(){
		this.fov = (Math.PI * 60) / 180;
		this.position = new THREE.Vector3(10, 10, 10);
		this.target = new THREE.Vector3(0, 0, 0);
	}
};

Potree.Scene = class{
	constructor(){
		this.dispatcher = new THREE.EventDispatcher();
		
		this.annotations = [];
		this.scene = new THREE.Scene();
		this.scenePointCloud = new THREE.Scene();
		this.sceneBG = new THREE.Scene();
		this.camera = new THREE.PerspectiveCamera(this.fov, 1, 0.1, 1000*1000);
		this.cameraBG = new THREE.Camera();
		this.pointclouds = [];
		this.referenceFrame;
		
		this.measurements = [];
		this.profiles = [];
		
		this.fpControls;
		this.orbitControls;
		this.earthControls;
		this.geoControls;
		this.controls;
		this.view = new Potree.View.Orbit();
		
		this.directionalLight = null;
		
		this.initialize();
		
	}
	
	addPointCloud(pointcloud){
		this.pointclouds.push(pointcloud);
		this.scenePointCloud.add(pointcloud);
		
		this.dispatcher.dispatchEvent({
			type: "pointcloud_added",
			pointcloud: pointcloud
		});
	};
	
	addMeasurement(measurement){
		this.measurements.push(measurement);
		this.dispatcher.dispatchEvent({
			"type": "measurement_added",
			"scene": this,
			"measurement": measurement
		});
	};
	
	removeMeasurement(measurement){
		let index = this.measurements.indexOf(measurement);
		if (index > -1) {
			this.measurements.splice(index, 1);
			this.dispatcher.dispatchEvent({
				"type": "measurement_removed",
				"scene": this,
				"measurement": measurement
			});
		}
	}
	
	addProfile(profile){
		this.profiles.push(profile);
		this.dispatcher.dispatchEvent({
			"type": "profile_added",
			"scene": this,
			"profile": profile
		});
	}
	
	removeProfile(profile){
		let index = this.profiles.indexOf(profile);
		if (index > -1) {
			this.profiles.splice(index, 1);
			this.dispatcher.dispatchEvent({
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
	}
	
	initialize(){
		
		this.referenceFrame = new THREE.Object3D();
		this.referenceFrame.matrixAutoUpdate = false;
		this.scenePointCloud.add(this.referenceFrame);

		this.camera.up.set(0, 0, 1);
		this.camera.position.set(1000, 1000, 1000);
		//this.camera.rotation.y = -Math.PI / 4;
		//this.camera.rotation.x = -Math.PI / 6;
		
		this.directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
		this.directionalLight.position.set( 10, 10, 10 );
		this.directionalLight.lookAt( new THREE.Vector3(0, 0, 0));
		this.scenePointCloud.add( this.directionalLight );
		
		var light = new THREE.AmbientLight( 0x555555 ); // soft white light
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
	}
	
	addEventListener(type, callback){
		this.dispatcher.addEventListener(type, callback);
	}
	
	addAnnotation(position, args = {}){
		args.position = position;
		
		if(!args.cameraTarget){
			args.cameraTarget = position;
		}
		
		var annotation = new Potree.Annotation(this, args);
		
		this.annotations.push(annotation);
		
		this.dispatcher.dispatchEvent({
			"type": "annotation_added", 
			"scene": this,
			"annotation": annotation});
		
		return annotation;
	}
	
	getAnnotations(){
		return this.annotations;
	};
	
};

Potree.Viewer = class{
	
	constructor(domElement, args){
		var a = args || {};
		this.pointCloudLoadedCallback = a.onPointCloudLoaded || function(){};
		
		this.renderArea = domElement;
		
		//if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
		//	defaultSettings.navigation = "Orbit";
		//}
		
		this.fov = 60;
		this.pointSize = 1;
		this.minPointSize = 1;
		this.maxPointSize = 50;
		this.opacity = 1;
		this.sizeType = "Fixed";
		this.pointSizeType = Potree.PointSizeType.FIXED;
		this.pointColorType = null;
		this.clipMode = Potree.ClipMode.HIGHLIGHT_INSIDE;
		this.quality = "Squares";
		this.isFlipYZ = false;
		this.useDEMCollisions = false;
		this.minNodeSize = 100;
		this.directionalLight;
		this.edlStrength = 1.0;
		this.edlRadius = 1.4;
		this.useEDL = false;
		this.intensityMax = null;
		this.heightMin = 0;
		this.heightMax = 1;
		this.materialTransition = 0.5;
		this.weightRGB = 1.0;
		this.weightIntensity = 0.0;
		this.weightElevation = 0.0;
		this.weightClassification = 0.0;
		this.weightReturnNumber = 0.0;
		this.weightSourceID = 0.0;
		this.intensityRange = [0, 65000];
		this.intensityGamma = 1;
		this.intensityContrast = 0;
		this.intensityBrightness = 0;
		this.rgbGamma = 1;
		this.rgbContrast = 0;
		this.rgbBrightness = 0;
		
		this.moveSpeed = 10;

		this.showDebugInfos = false;
		this.showStats = true;
		this.showBoundingBox = false;
		this.freeze = false;

		this.mapView;

		this.progressBar = new ProgressBar();

		this.stats = new Stats();
		this.stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
		document.body.appendChild( this.stats.dom );
		this.stats.dom.style.left = "100px";
		
		this.potreeRenderer = null;
		this.highQualityRenderer = null;
		this.edlRenderer = null;
		this.renderer;
		
		this.scene;

		this.measuringTool;
		this.profileTool;
		this.volumeTool;
		this.transformationTool;
		
		this.dispatcher = new THREE.EventDispatcher();
		this.skybox;
		this.clock = new THREE.Clock();
		this.background;
		
		this.initThree();
		
		this.scene = new Potree.Scene(this.renderer);
		this.createControls();
		
		{
			this.measuringTool = new Potree.MeasuringTool(this.renderer);
			this.profileTool = new Potree.ProfileTool(this.renderer);
			
			this.measuringTool.setScene(this.scene);
			this.profileTool.setScene(this.scene);
			
			this.dispatcher.addEventListener("scene_changed", (e) => {
				this.measuringTool.setScene(e.scene);
				this.profileTool.setScene(e.scene);
			});
			//this.transformationTool = new Potree.TransformationTool(this.scene.scenePointCloud, this.scene.camera, this.renderer);
			//this.volumeTool = new Potree.VolumeTool(this.scene, this.renderer, this.transformationTool);		
			
			let onKeyDown = (event) => {
				//console.log(event.keyCode);
				
				if(event.keyCode === 69){
					// e pressed
					this.transformationTool.translate();
				}else if(event.keyCode === 82){
					// r pressed
					this.transformationTool.scale();
				}else if(event.keyCode === 84){
					// t pressed
					this.transformationTool.rotate();
				}
			};
			
			this.dispatcher.addEventListener("scene_changed", (e) => {
				this.updateHeightRange();
			});
			
			this.dispatcher.addEventListener("pointcloud_added", (e) => {
				this.updateHeightRange();
			});
			
			window.addEventListener( 'keydown', onKeyDown, false );
		}
		
		{// set defaults
			this.setPointSize(1);
			this.setFOV(60);
			this.setOpacity(1);
			this.setEDLEnabled(false);
			this.setEDLRadius(1.4);
			this.setEDLStrength(1.0);
			this.setClipMode(Potree.ClipMode.HIGHLIGHT_INSIDE);
			this.setPointBudget(1*1000*1000);
			this.setShowBoundingBox(false);
			this.setFreeze(false);
			this.setNavigationMode("Orbit");
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
		
		let oldScene = scene;
		this.scene = scene;
		
		this.dispatcher.dispatchEvent({
			type: "scene_changed",
			oldScene: oldScene,
			scene: scene
		});
		
		
		{ // Annotations
			$(".annotation").detach();
			
			for(let annotation of this.scene.annotations){
				this.renderArea.appendChild(annotation.domElement);
			}
		
			// TODO make sure this isn't added multiple times on scene switches
			this.scene.addEventListener("annotation_added", (e) => {
				if(e.scene === this.scene){
					this.renderArea.appendChild(e.annotation.domElement);
				}
				
				//focusing_finished
				e.annotation.addEventListener("focusing_finished", (event) => {
					let distance = this.scene.view.position.distanceTo(this.scene.view.target);
					//this.setMoveSpeed(distance / 3);
					this.setMoveSpeed(Math.pow(distance, 0.4));
					this.renderer.domElement.focus();
				});
			});
		}
		
	};
	
	getControls(view){
		if(view instanceof Potree.View.Orbit){
			return this.orbitControls;
		}else if(view instanceof Potree.View.FirstPerson){
			return this.fpControls;
		}else{
			return null;
		}
	}
	
	//loadPointCloud(path, name, callback){
    //
	//	// load pointcloud
	//	if(!path){
    //
	//	}else if(path.indexOf("greyhound://") === 0){
	//		// We check if the path string starts with 'greyhound:', if so we assume it's a greyhound server URL.
	//		Potree.GreyhoundLoader.load(path, function(geometry) {
	//			if(!geometry){
	//				callback({type: "loading_failed"});
	//			}else{
	//				pointcloud = new Potree.PointCloudOctree(geometry);
	//				initPointcloud(pointcloud);
	//			}
	//		});
	//	}else if(path.indexOf("cloud.js") > 0){
	//		Potree.POCLoader.load(path, function(geometry){
	//			if(!geometry){
	//				callback({type: "loading_failed"});
	//			}else{
	//				let pointcloud = new Potree.PointCloudOctree(geometry);
    //                pointcloud.name = name;
	//				initPointcloud(pointcloud);				
	//			}
	//		}.bind(this));
	//	}else if(path.indexOf(".vpc") > 0){
	//		Potree.PointCloudArena4DGeometry.load(path, function(geometry){
	//			if(!geometry){
	//				callback({type: "loading_failed"});
	//			}else{
	//				let pointcloud = new Potree.PointCloudArena4D(geometry);
    //                pointcloud.name = name;
	//				initPointcloud(pointcloud);
	//			}
	//		});
	//	}else{
	//		callback({"type": "loading_failed"});
	//	}
	//}

	addEventListener(type, callback){
		this.dispatcher.addEventListener(type, callback);
	}
	
	getMinNodeSize(){
		return this.minNodeSize;
	};
	
	setMinNodeSize(value){
		if(this.minNodeSize !== value){
			this.minNodeSize = value;
			this.dispatcher.dispatchEvent({"type": "minnodesize_changed", "viewer": this});
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
		this.dispatcher.dispatchEvent({"type": "background_changed", "viewer": this});
	}
	
	setDescription(value){
		$('#potree_description')[0].innerHTML = value;
	};
	
	setNavigationMode(value){
		//if(value === "Orbit"){
		//	this.useOrbitControls();
		//}else if(value === "Flight"){
		//	this.useFPSControls();
		//}
		//}else if(value === "Earth"){
		//	this.useEarthControls();
		//}
	};
	
	setShowBoundingBox(value){
		if(this.showBoundingBox !== value){
			this.showBoundingBox = value;
			this.dispatcher.dispatchEvent({"type": "show_boundingbox_changed", "viewer": this});
		}
	};
	
	getShowBoundingBox(){
		return showBoundingBox;
	};
	
	setMoveSpeed(value){
		if(this.moveSpeed !== value){
			this.moveSpeed = value;
			this.fpControls.setMoveSpeed(value);
			this.geoControls.setMoveSpeed(value);
			this.dispatcher.dispatchEvent({"type": "move_speed_changed", "viewer": this, "speed": value});
		}
	};
	
	getMoveSpeed(){
		return this.fpControls.moveSpeed;
	};
	
	//setShowSkybox(value){
	//	if(this.showSkybox !== value){
	//		this.showSkybox = value;
	//		this.dispatcher.dispatchEvent({"type": "show_skybox_changed", "viewer": this});
	//	}
	//};
	//
	//getShowSkybox(){
	//	return this.showSkybox;
	//};
	
	setHeightRange(min, max){
		if(this.heightMin !== min || this.heightMax !== max){
			this.heightMin = min || this.heightMin;
			this.heightMax = max || this.heightMax;
			this.dispatcher.dispatchEvent({"type": "height_range_changed", "viewer": this});
		}
	};
	
	getHeightRange(){
		return {min: this.heightMin, max: this.heightMax};
	};
	
	getElevationRange(){
		return this.getHeightRange();
	};
	
	setIntensityRange(min, max){
		if(this.intensityRange[0] !== min || this.intensityRange[1] !== max){
			this.intensityRange[0] = min || this.intensityRange[0];
			this.intensityRange[1] = max || this.intensityRange[1];
			this.dispatcher.dispatchEvent({"type": "intensity_range_changed", "viewer": this});
		}
	};
	
	getIntensityRange(){
		return this.intensityRange;
	};
	
	setIntensityGamma(value){
		if(this.intensityGamma !== value){
			this.intensityGamma = value;
			this.dispatcher.dispatchEvent({"type": "intensity_gamma_changed", "viewer": this});
		}
	};
	
	getIntensityGamma(){
		return this.intensityGamma;
	};
	
	setIntensityContrast(value){
		if(this.intensityContrast !== value){
			this.intensityContrast = value;
			this.dispatcher.dispatchEvent({"type": "intensity_contrast_changed", "viewer": this});
		}
	};
	
	getIntensityContrast(){
		return this.intensityContrast;
	};
	
	setIntensityBrightness(value){
		if(this.intensityBrightness !== value){
			this.intensityBrightness = value;
			this.dispatcher.dispatchEvent({"type": "intensity_brightness_changed", "viewer": this});
		}
	};
	
	getIntensityBrightness(){
		return this.intensityBrightness;
	};
	
	setRGBGamma(value){
		if(this.rgbGamma !== value){
			this.rgbGamma = value;
			this.dispatcher.dispatchEvent({"type": "rgb_gamma_changed", "viewer": this});
		}
	};
	
	getRGBGamma(){
		return this.rgbGamma;
	};
	
	setRGBContrast(value){
		if(this.rgbContrast !== value){
			this.rgbContrast = value;
			this.dispatcher.dispatchEvent({"type": "rgb_contrast_changed", "viewer": this});
		}
	};
	
	getRGBContrast(){
		return this.rgbContrast;
	};
	
	setRGBBrightness(value){
		if(this.rgbBrightness !== value){
			this.rgbBrightness = value;
			this.dispatcher.dispatchEvent({"type": "rgb_brightness_changed", "viewer": this});
		}
	};
	
	getRGBBrightness(){
		return this.rgbBrightness;
	};
	
	setMaterialTransition(t){
		if(this.materialTransition !== t){
			this.materialTransition = t;
			this.dispatcher.dispatchEvent({"type": "material_transition_changed", "viewer": this});
		}
	};
	
	getMaterialTransition(){
		return this.materialTransition;
	};
	
	setWeightRGB(w){
		if(this.weightRGB !== w){
			this.weightRGB = w;
			this.dispatcher.dispatchEvent({"type": "attribute_weights_changed", "viewer": this});
		}
	};
	
	getWeightRGB(){
		return this.weightRGB;
	};
	
	setWeightIntensity(w){
		if(this.weightIntensity !== w){
			this.weightIntensity = w;
			this.dispatcher.dispatchEvent({"type": "attribute_weights_changed", "viewer": this});
		}
	};
	
	getWeightIntensity(){
		return this.weightIntensity;
	};
	
	setWeightElevation(w){
		if(this.weightElevation !== w){
			this.weightElevation = w;
			this.dispatcher.dispatchEvent({"type": "attribute_weights_changed", "viewer": this});
		}
	};
	
	getWeightElevation(){
		return this.weightElevation;
	};
	
	setWeightClassification(w){
		if(this.weightClassification !== w){
			this.weightClassification = w;
			this.dispatcher.dispatchEvent({"type": "attribute_weights_changed", "viewer": this});
		}
	};
	
	getWeightClassification(){
		return this.weightClassification;
	};
	
	setWeightReturnNumber(w){
		if(this.weightReturnNumber !== w){
			this.weightReturnNumber = w;
			this.dispatcher.dispatchEvent({"type": "attribute_weights_changed", "viewer": this});
		}
	};
	
	getWeightReturnNumber(){
		return this.weightReturnNumber;
	};
	
	setWeightSourceID(w){
		if(this.weightSourceID !== w){
			this.weightSourceID = w;
			this.dispatcher.dispatchEvent({"type": "attribute_weights_changed", "viewer": this});
		}
	};
	
	getWeightSourceID(){
		return this.weightSourceID;
	};
	
	setIntensityMax(max){
		if(this.intensityMax !== max){
			this.intensityMax = max;
			this.dispatcher.dispatchEvent({"type": "intensity_max_changed", "viewer": this});
		}
	};
	
	getIntensityMax(){
		return this.intensityMax;
	};
	
	setFreeze(value){
		if(this.freeze != value){
			this.freeze = value;
			this.dispatcher.dispatchEvent({"type": "freeze_changed", "viewer": this});
		}
	};
	
	getFreeze(){
		return this.freeze;
	};
	
	setPointBudget(value){

		if(Potree.pointBudget != value){
			Potree.pointBudget = parseInt(value);
			this.dispatcher.dispatchEvent({"type": "point_budget_changed", "viewer": this});
		}
	};
	
	getPointBudget(){
		return Potree.pointBudget;
	};
	
	setClipMode(clipMode){
		if(this.clipMode != clipMode){
			this.clipMode = clipMode;
			this.dispatcher.dispatchEvent({"type": "clip_mode_changed", "viewer": this});
		}
	};
	
	getClipMode(){
		return this.clipMode;
	};
	
	setDEMCollisionsEnabled(value){
		if(this.useDEMCollisions !== value){
			this.useDEMCollisions = value;
			this.dispatcher.dispatchEvent({"type": "use_demcollisions_changed", "viewer": this});
		};
	};
	
	getDEMCollisionsEnabled(){
		return this.useDEMCollisions;
	};
	
	setEDLEnabled(value){
		if(this.useEDL != value){
			this.useEDL = value;
			this.dispatcher.dispatchEvent({"type": "use_edl_changed", "viewer": this});
		}
	};
	
	getEDLEnabled(){
		return this.useEDL;
	};
	
	setEDLRadius(value){
		if(this.edlRadius !== value){
			this.edlRadius = value;
			this.dispatcher.dispatchEvent({"type": "edl_radius_changed", "viewer": this});
		}
	};
	
	getEDLRadius(){
		return this.edlRadius;
	};
	
	setEDLStrength(value){
		if(this.edlStrength !== value){
			this.edlStrength = value;
			this.dispatcher.dispatchEvent({"type": "edl_strength_changed", "viewer": this});
		}
	};
	
	getEDLStrength(){
		return this.edlStrength;
	};
	
	setPointSize(value){
		if(this.pointSize !== value){
			this.pointSize = value;
			this.dispatcher.dispatchEvent({"type": "point_size_changed", "viewer": this});
		}
	};
	
	getPointSize(){
		return this.pointSize;
	};
	
	setMinPointSize(value){
		if(this.minPointSize !== value){
			this.minPointSize = value;
			this.dispatcher.dispatchEvent({"type": "min_point_size_changed", "viewer": this});
		}
	}
	
	getMinPointSize(){
		return this.minPointSize;
	}
	
	setMaxPointSize(value){
		if(this.maxPointSize !== value){
			this.maxPointSize = value;
			this.dispatcher.dispatchEvent({"type": "max_point_size_changed", "viewer": this});
		}
	}
	
	getMaxPointSize(){
		return this.maxPointSize;
	}
	
	setFOV(value){
		if(this.fov !== value){
			this.fov = value;
			this.dispatcher.dispatchEvent({"type": "fov_changed", "viewer": this});
		}
	};
	
	getFOV(){
		return this.fov;
	};
	
	setOpacity(value){
		if(this.opacity !== value){
			this.opacity = value;
			this.dispatcher.dispatchEvent({"type": "opacity_changed", "viewer": this});
		}
	};
	
	getOpacity(){
		return this.opacity;
	};

	setPointSizing(value){
		if(this.sizeType !== value){
			this.sizeType = value;
			if(value === "Fixed"){
				this.pointSizeType = Potree.PointSizeType.FIXED;
			}else if(value === "Attenuated"){
				this.pointSizeType = Potree.PointSizeType.ATTENUATED;
			}else if(value === "Adaptive"){
				this.pointSizeType = Potree.PointSizeType.ADAPTIVE;
			}
			
			this.dispatcher.dispatchEvent({"type": "point_sizing_changed", "viewer": this});
		}
	};
	
	getPointSizing(){
		return this.sizeType;
	};

	setQuality(value){
		var oldQuality = this.quality;
		if(value == "Interpolation" && !Potree.Features.SHADER_INTERPOLATION.isSupported()){
			this.quality = "Squares";
		}else if(value == "Splats" && !Potree.Features.SHADER_SPLATS.isSupported()){
			this.quality = "Squares";
		}else{
			this.quality = value;
		}
		
		if(oldQuality !== this.quality){
			this.dispatcher.dispatchEvent({"type": "quality_changed", "viewer": this});
		}
	};
	
	getQuality(){
		return this.quality;
	};
	
	disableAnnotations(){
		for(var i = 0; i < this.scene.annotations.length; i++){
			var annotation = this.scene.annotations[i];
			annotation.domElement.style.pointerEvents = "none";
		};
	};
	
	enableAnnotations(){
		for(var i = 0; i < this.scene.annotations.length; i++){
			var annotation = this.scene.annotations[i];
			annotation.domElement.style.pointerEvents = "auto";
		};
	};
	
	setClassificationVisibility(key, value){

		var changed = false;
		for(var i = 0; i < this.scene.pointclouds.length; i++){
			var pointcloud = this.scene.pointclouds[i];
			var newClass = pointcloud.material.classification;
			var oldValue = newClass[key].w;
			newClass[key].w = value ? 1 : 0;

			if(oldValue !== newClass[key].w){
				changed = true;
			}

			pointcloud.material.classification = newClass;
		}

		if(changed){
			this.dispatcher.dispatchEvent({"type": "classification_visibility_changed", "viewer": this});
		}
	};

	setMaterial(value){
		if(this.pointColorType !== this.toMaterialID(value)){
			this.pointColorType = this.toMaterialID(value);
			
			this.dispatcher.dispatchEvent({"type": "material_changed", "viewer": this});
		}
	};
	
	setMaterialID(value){
		if(this.pointColorType !== value){
			this.pointColorType = value;
			
			this.dispatcher.dispatchEvent({"type": "material_changed", "viewer": this});
		}
	}
	
	getMaterial(){
		return this.pointColorType;
	};
	
	getMaterialName(){
		return this.toMaterialName(this.pointColorType);
	};
	
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
		this.scene.camera.zoomTo(node, factor);
		
		var bs;
		if(node.boundingSphere){
			bs = node.boundingSphere;
		}else if(node.geometry && node.geometry.boundingSphere){
			bs = node.geometry.boundingSphere;
		}else{
			bs = node.boundingBox.getBoundingSphere();
		}
		
		bs = bs.clone().applyMatrix4(node.matrixWorld); 
		
		let view = this.scene.view;
		view.position.copy(this.scene.camera.position);
		if(view.target){
			view.target.copy(bs.center);
		}
		
		this.dispatcher.dispatchEvent({"type": "zoom_to", "viewer": this});
	};
	
	showAbout(){
		$(function() {
			$( "#about-panel" ).dialog();
		});
	};
	
	getBoundingBox(pointclouds){
		pointclouds = pointclouds || this.scene.pointclouds;
		
		var box = new THREE.Box3();
		
		this.scene.scenePointCloud.updateMatrixWorld(true);
		this.scene.referenceFrame.updateMatrixWorld(true);
		
		for(var i = 0; i < this.scene.pointclouds.length; i++){
			var pointcloud = this.scene.pointclouds[i];
			
			pointcloud.updateMatrixWorld(true);
			
			var boxWorld = Potree.utils.computeTransformedBoundingBox(pointcloud.boundingBox, pointcloud.matrixWorld)
			box.union(boxWorld);
		}

		return box;
	};
	
	fitToScreen(){
		var box = this.getBoundingBox(this.scene.pointclouds);
		
		if(this.transformationTool && this.transformationTool.targets.length > 0){
			box = this.transformationTool.getBoundingBox();
		}

		var node = new THREE.Object3D();
		node.boundingBox = box;
		
		this.zoomTo(node, 1);
	};
	
	setTopView(){
		var box = this.getBoundingBox(this.scene.pointclouds);
		
		if(this.transformationTool.targets.length > 0){
			box = this.transformationTool.getBoundingBox();
		}

		var node = new THREE.Object3D();
		node.boundingBox = box;
		
		this.scene.camera.position.set(0, 1, 0);
		this.scene.camera.rotation.set(-Math.PI / 2, 0, 0);
		this.scene.camera.zoomTo(node, 1);
	};
	
	setFrontView(){
		var box = this.getBoundingBox(this.scene.pointclouds);
		
		if(this.transformationTool.targets.length > 0){
			box = this.transformationTool.getBoundingBox();
		}

		var node = new THREE.Object3D();
		node.boundingBox = box;
		
		this.scene.camera.position.set(0, 0, 1);
		this.scene.camera.rotation.set(0, 0, 0);
		this.scene.camera.zoomTo(node, 1);
	};
	
	setLeftView(){
		var box = this.getBoundingBox(this.scene.pointclouds);
		
		if(this.transformationTool.targets.length > 0){
			box = this.transformationTool.getBoundingBox();
		}

		var node = new THREE.Object3D();
		node.boundingBox = box;
		
		this.scene.camera.position.set(-1, 0, 0);
		this.scene.camera.rotation.set(0, -Math.PI / 2, 0);
		this.scene.camera.zoomTo(node, 1);
	};
	
	setRightView(){
		var box = this.getBoundingBox(this.scene.pointclouds);
		
		if(this.transformationTool.targets.length > 0){
			box = this.transformationTool.getBoundingBox();
		}

		var node = new THREE.Object3D();
		node.boundingBox = box;
		
		this.scene.camera.position.set(1, 0, 0);
		this.scene.camera.rotation.set(0, Math.PI / 2, 0);
		this.scene.camera.zoomTo(node, 1);
	};
	
	flipYZ(){
		this.isFlipYZ = !this.isFlipYZ
		
		// TODO flipyz 
		console.log("TODO");
	}
	
	updateHeightRange(){
		var bbWorld = this.getBoundingBox();
		this.setHeightRange(bbWorld.min.z, bbWorld.max.z);
	};
	
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
			var enabled = Potree.utils.getParameterByName("edlEnabled") === "true";
			this.setEDLEnabled(enabled);
		}
		
		if(Potree.utils.getParameterByName("edlRadius")){
			this.setEDLRadius(parseFloat(Potree.utils.getParameterByName("edlRadius")));
		}
		
		if(Potree.utils.getParameterByName("edlStrength")){
			this.setEDLStrength(parseFloat(Potree.utils.getParameterByName("edlStrength")));
		}
		
		if(Potree.utils.getParameterByName("clipMode")){
			var clipMode = Potree.utils.getParameterByName("clipMode");
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
			var enabled = Potree.utils.getParameterByName("showBoundingBox") === "true";
			if(enabled){
				this.setShowBoundingBox(true);
			}else{
				this.setShowBoundingBox(false);
			}
		}

		if(Potree.utils.getParameterByName("material")){
			var material = Potree.utils.getParameterByName("material");
			this.setMaterial(material);
		}

		if(Potree.utils.getParameterByName("pointSizing")){
			var sizing = Potree.utils.getParameterByName("pointSizing");
			this.setPointSizing(sizing);
		}

		if(Potree.utils.getParameterByName("quality")){
			var quality = Potree.utils.getParameterByName("quality");
			this.setQuality(quality);
		}
	};
	
	
	
	

	
	
	
//------------------------------------------------------------------------------------
// Viewer Internals
//------------------------------------------------------------------------------------

	createControls(){
		{ // create FIRST PERSON CONTROLS
			this.fpControls = new Potree.FirstPersonControls(this.renderer);
			this.fpControls.enabled = false;
			this.fpControls.dispatcher.addEventListener("start", this.disableAnnotations.bind(this));
			this.fpControls.dispatcher.addEventListener("end", this.enableAnnotations.bind(this));
			this.fpControls.dispatcher.addEventListener("double_click_move", (event) => {
				let distance = event.targetLocation.distanceTo(event.position);
				//this.setMoveSpeed(distance / 3);
				this.setMoveSpeed(Math.pow(distance, 0.4));
			});
			this.fpControls.dispatcher.addEventListener("move_speed_changed", (event) => {
				this.setMoveSpeed(this.fpControls.moveSpeed);
			});
		}
		
		{ // create GEO CONTROLS
			this.geoControls = new Potree.GeoControls(this.scene.camera, this.renderer.domElement);
			this.geoControls.enabled = false;
			this.geoControls.addEventListener("start", this.disableAnnotations.bind(this));
			this.geoControls.addEventListener("end", this.enableAnnotations.bind(this));
			this.geoControls.addEventListener("move_speed_changed", (event) => {
				this.setMoveSpeed(this.geoControls.moveSpeed);
			});
		}
	
		{ // create ORBIT CONTROLS
			this.orbitControls = new Potree.OrbitControls(this.renderer);
			this.orbitControls.enabled = false;
			this.orbitControls.dispatcher.addEventListener("start", this.disableAnnotations.bind(this));
			this.orbitControls.dispatcher.addEventListener("end", this.enableAnnotations.bind(this));
		}
		
		{ // create EARTH CONTROLS
			this.earthControls = new THREE.EarthControls(this.scene.camera, this.renderer, this.scenePointCloud);
			this.earthControls.enabled = false;
			this.earthControls.addEventListener("start", this.disableAnnotations.bind(this));
			this.earthControls.addEventListener("end", this.enableAnnotations.bind(this));
		}
	};

	toggleSidebar(){
		
		var renderArea = $('#potree_render_area');
		var sidebar = $('#potree_sidebar_container');
		var isVisible = renderArea.css("left") !== "0px";

		if(isVisible){
			renderArea.css("left", "0px");
		}else{
			renderArea.css("left", "300px");
		}
	};
	
	toggleMap(){
		var map = $('#potree_map');
		map.toggle(100);

	};

	loadGUI(){
		var sidebarContainer = $('#potree_sidebar_container');
		sidebarContainer.load(new URL(Potree.scriptPath + "/sidebar.html").href);
		sidebarContainer.css("width", "300px");
		sidebarContainer.css("height", "100%");

		var imgMenuToggle = document.createElement("img");
		imgMenuToggle.src = new URL(Potree.resourcePath + "/icons/menu_button.svg").href;
		imgMenuToggle.onclick = this.toggleSidebar;
		imgMenuToggle.classList.add("potree_menu_toggle");

		var imgMapToggle = document.createElement("img");
		imgMapToggle.src = new URL(Potree.resourcePath + "/icons/map_icon.png").href;
		imgMapToggle.style.display = "none";
		imgMapToggle.onclick = this.toggleMap;
		imgMapToggle.id = "potree_map_toggle";
		
		viewer.renderArea.insertBefore(imgMapToggle, viewer.renderArea.children[0]);
		viewer.renderArea.insertBefore(imgMenuToggle, viewer.renderArea.children[0]);
		
		var elProfile = $('<div>').load(new URL(Potree.scriptPath + "/profile.html").href, function(){
			$('#potree_render_area').append(elProfile.children());
			this._2dprofile = new Potree.Viewer.Profile(this, document.getElementById("profile_draw_container"));
		}.bind(this));
		
        i18n.init({ 
            lng: 'en',
            resGetPath: '../resources/lang/__lng__/__ns__.json',
            preload: ['en', 'fr', 'de'],
            getAsync: true,
            debug: true
            }, function(t) { 
            // Start translation once everything is loaded
            $("body").i18n();
        });
	}
    
    setLanguage(lang){
        i18n.setLng(lang);
        $("body").i18n();
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
		
		this.skybox = Potree.utils.loadSkybox(new URL(Potree.resourcePath + "/textures/skybox/").href);

		// enable frag_depth extension for the interpolation shader, if available
		this.renderer.context.getExtension("EXT_frag_depth");
	}

	update(delta, timestamp){
		
		let scene = this.scene;
		let camera = this.scene.camera;
		
		Potree.pointLoadLimit = Potree.pointBudget * 2;
		
		this.scene.directionalLight.position.copy(camera.position);
		this.scene.directionalLight.lookAt(new THREE.Vector3().addVectors(camera.position, camera.getWorldDirection()));
		
		var visibleNodes = 0;
		var visiblePoints = 0;
		var progress = 0;
		
		for(var i = 0; i < this.scene.pointclouds.length; i++){
			var pointcloud = this.scene.pointclouds[i];
			var bbWorld = Potree.utils.computeTransformedBoundingBox(pointcloud.boundingBox, pointcloud.matrixWorld);
				
			if(!this.intensityMax){
				var root = pointcloud.pcoGeometry.root;
				if(root != null && root.loaded){
					var attributes = pointcloud.pcoGeometry.root.geometry.attributes;
					if(attributes.intensity){
						var array = attributes.intensity.array;

						// chose max value from the 0.75 percentile
						var ordered = [];
						for(var j = 0; j < array.length; j++){
							ordered.push(array[j]);
						}
						ordered.sort();
						var capIndex = parseInt((ordered.length - 1) * 0.75);
						var cap = ordered[capIndex];

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
			
			//if(this.heightMin === null){
			//	this.setHeightRange(bbWorld.min.y, bbWorld.max.y);
			//}
				
			pointcloud.material.clipMode = this.clipMode;
			pointcloud.material.heightMin = this.heightMin;
			pointcloud.material.heightMax = this.heightMax;
			//pointcloud.material.intensityMin = 0;
			//pointcloud.material.intensityMax = this.intensityMax;
			pointcloud.material.uniforms.intensityRange.value = this.getIntensityRange();
			pointcloud.material.uniforms.intensityGamma.value = this.getIntensityGamma();
			pointcloud.material.uniforms.intensityContrast.value = this.getIntensityContrast();
			pointcloud.material.uniforms.intensityBrightness.value = this.getIntensityBrightness();
			pointcloud.material.uniforms.rgbGamma.value = this.getRGBGamma();
			pointcloud.material.uniforms.rgbContrast.value = this.getRGBContrast();
			pointcloud.material.uniforms.rgbBrightness.value = this.getRGBBrightness();
			pointcloud.showBoundingBox = this.showBoundingBox;
			pointcloud.generateDEM = this.useDEMCollisions;
			pointcloud.minimumNodePixelSize = this.minNodeSize;
			pointcloud.material.uniforms.transition.value = this.materialTransition;
			
			pointcloud.material.uniforms.wRGB.value = this.getWeightRGB();
			pointcloud.material.uniforms.wIntensity.value = this.getWeightIntensity();
			pointcloud.material.uniforms.wElevation.value = this.getWeightElevation();
			pointcloud.material.uniforms.wClassification.value = this.getWeightClassification();
			pointcloud.material.uniforms.wReturnNumber.value = this.getWeightReturnNumber();
			pointcloud.material.uniforms.wSourceID.value = this.getWeightSourceID();
			
			//if(!this.freeze){
			//	pointcloud.update(this.scene.camera, this.renderer);
			//}

			visibleNodes += pointcloud.numVisibleNodes;
			visiblePoints += pointcloud.numVisiblePoints;

			progress += pointcloud.progress;
		}
		
		if(!this.freeze){
			var result = Potree.updatePointClouds(this.scene.pointclouds, this.scene.camera, this.renderer);
			visibleNodes = result.visibleNodes.length;
			visiblePoints = result.numVisiblePoints;
		}
		
		
		//if(this.stats && this.showStats){
		//	document.getElementById("lblNumVisibleNodes").style.display = "";
		//	document.getElementById("lblNumVisiblePoints").style.display = "";
		//	this.stats.domElement.style.display = "";
		//
		//	this.stats.update();
		//
		//	document.getElementById("lblNumVisibleNodes").innerHTML = "visible nodes: " + visibleNodes;
		//	document.getElementById("lblNumVisiblePoints").innerHTML = "visible points: " + Potree.utils.addCommas(visiblePoints);
		//}else if(this.stats){
		//	document.getElementById("lblNumVisibleNodes").style.display = "none";
		//	document.getElementById("lblNumVisiblePoints").style.display = "none";
		//	this.stats.domElement.style.display = "none";
		//}
		
		camera.fov = this.fov;
		
		if(this.getControls(scene.view) !== this.controls){
			if(this.controls){
				this.controls.enabled = false;
			}
			
			this.controls = this.getControls(scene.view);
			this.controls.enabled = true;
		}
		
		//let controls = this.getControls(this.scene.view);
		if(this.controls !== null){
			this.controls.setScene(scene);
			this.controls.update(delta);
			
			camera.position.copy(scene.view.position);
			camera.lookAt(scene.view.target);
		}

		// update progress bar
		// TODO fix progressbar
		//if(this.scene.pointclouds.length > 0){
		//	this.progressBar.progress = progress / this.scene.pointclouds.length;
		//	
		//	var message;
		//	if(progress === 0){
		//		message = "loading";
		//	}else{
		//		message = "loading: " + parseInt(progress*100 / this.scene.pointclouds.length) + "%";
		//	}
		//	this.progressBar.message = message;
		//	
		//	if(progress >= 0.999){
		//		this.progressBar.hide();
		//	}else if(progress < 1){
		//		this.progressBar.show();
		//	}
		//}
		
		//this.volumeTool.update();
		//this.transformationTool.update();
		//this.profileTool.update();
		
		
		var clipBoxes = [];
		
		for(let profile of this.scene.profiles){
			for(let box of profile.boxes){
				box.updateMatrixWorld();
				var boxInverse = new THREE.Matrix4().getInverse(box.matrixWorld);
				var boxPosition = box.getWorldPosition();
				clipBoxes.push({inverse: boxInverse, position: boxPosition});
			}
		}
		//
		//for(var i = 0; i < this.volumeTool.volumes.length; i++){
		//	var volume = this.volumeTool.volumes[i];
		//	
		//	if(volume.clip){
		//		volume.updateMatrixWorld();
		//		var boxInverse = new THREE.Matrix4().getInverse(volume.matrixWorld);
		//		var boxPosition = volume.getWorldPosition();
		//		//clipBoxes.push(boxInverse);
		//		clipBoxes.push({inverse: boxInverse, position: boxPosition});
		//	}
		//}
		//
		//
		for(let pointcloud of this.scene.pointclouds){
			pointcloud.material.setClipBoxes(clipBoxes);
		}

		{// update annotations
			var distances = [];
			for(var i = 0; i < this.scene.annotations.length; i++){
				var ann = this.scene.annotations[i];
				var screenPos = ann.position.clone().project(this.scene.camera);
				
				screenPos.x = this.renderArea.clientWidth * (screenPos.x + 1) / 2;
				screenPos.y = this.renderArea.clientHeight * (1 - (screenPos.y + 1) / 2);
				
				ann.domElement.style.left = Math.floor(screenPos.x - ann.domElement.clientWidth / 2) + "px";
				ann.domElement.style.top = Math.floor(screenPos.y - ann.domElement.clientHeight / 2) + "px";
				
				//ann.domDescription.style.left = screenPos.x - ann.domDescription.clientWidth / 2 + 10;
				//ann.domDescription.style.top = screenPos.y + 30;

				distances.push({annotation: ann, distance: screenPos.z});

				if(-1 > screenPos.z || screenPos.z > 1){
					ann.domElement.style.display = "none";
				}else{
					ann.domElement.style.display = "initial";
				}
			}
			distances.sort(function(a,b){return b.distance - a.distance});
			for(var i = 0; i < distances.length; i++){
				var ann = distances[i].annotation;
				ann.domElement.style.zIndex = "" + i;
				if(ann.descriptionVisible){
					ann.domElement.style.zIndex += 100;
				}
			}
		}
		
		if(this.showDebugInfos){
			this.infos.set("camera.position", "camera.position: " + 
				this.scene.camera.position.x.toFixed(2) 
				+ ", " + this.scene.camera.position.y.toFixed(2) 
				+ ", " + this.scene.camera.position.z.toFixed(2)
			);
		}
		
		if(this.mapView){
			this.mapView.update(delta, this.scene.camera);
		}

		TWEEN.update(timestamp);
		
		this.dispatcher.dispatchEvent({"type": "update", "delta": delta, "timestamp": timestamp});
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
		}else if(this.quality === "Splats"){
			if(!this.highQualityRenderer){
				this.highQualityRenderer = new HighQualityRenderer(this);
			}
			this.highQualityRenderer.render(this.renderer);
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
		//	var screenshot = this.renderer.domElement.toDataURL();
		//	
		//	//document.body.appendChild(screenshot); 
		//	var w = this.open();
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
			
			viewer.scene.camera.aspect = aspect;
			viewer.scene.camera.updateProjectionMatrix();
			
			viewer.renderer.setSize(width, height);
		}
		

		//var queryAll = Potree.startQuery("All", viewer.renderer.getContext());
		
		// render skybox
		if(viewer.background === "skybox"){
			viewer.renderer.clear(true, true, false);
			viewer.skybox.camera.rotation.copy(viewer.scene.camera.rotation);
			viewer.renderer.render(viewer.skybox.scene, viewer.skybox.camera);
		}else if(viewer.background === "gradient"){
			viewer.renderer.clear(true, true, false);
			viewer.renderer.render(viewer.scene.sceneBG, viewer.scene.cameraBG);
		}else if(viewer.background === "black"){
			viewer.renderer.setClearColor(0x000000, 1);
			viewer.renderer.clear(true, true, false);
		}else if(viewer.background === "white"){
			viewer.renderer.setClearColor(0xFFFFFF, 1);
			viewer.renderer.clear(true, true, false);
		}
		
		for(let i = 0; i < viewer.scene.pointclouds.length; i++){
			let pointcloud = viewer.scene.pointclouds[i];
			if(pointcloud.originalMaterial){
				pointcloud.material = pointcloud.originalMaterial;
			}
			
			let bbWorld = Potree.utils.computeTransformedBoundingBox(pointcloud.boundingBox, pointcloud.matrixWorld);
			
			pointcloud.material.useEDL = false;
			pointcloud.material.size = viewer.pointSize;
			pointcloud.material.minSize = viewer.minPointSize;
			pointcloud.material.maxSize = viewer.maxPointSize;
			pointcloud.material.opacity = viewer.opacity;
			pointcloud.material.pointColorType = viewer.pointColorType;
			pointcloud.material.pointSizeType = viewer.pointSizeType;
			pointcloud.material.pointShape = (viewer.quality === "Circles") ? Potree.PointShape.CIRCLE : Potree.PointShape.SQUARE;
			pointcloud.material.interpolate = (viewer.quality === "Interpolation");
			pointcloud.material.weighted = false;
		}
		
		// render scene
		viewer.renderer.render(viewer.scene.scene, viewer.scene.camera);
		
		//var queryPC = Potree.startQuery("PointCloud", viewer.renderer.getContext());
		viewer.renderer.render(viewer.scene.scenePointCloud, viewer.scene.camera);
		//Potree.endQuery(queryPC, viewer.renderer.getContext());
		
		viewer.profileTool.render();
		//viewer.volumeTool.render();
		
		viewer.renderer.clearDepth();
		viewer.measuringTool.render();
		//viewer.transformationTool.render();
		
		//Potree.endQuery(queryAll, viewer.renderer.getContext());
		
		//Potree.resolveQueries(viewer.renderer.getContext());
	};
};

// high quality rendering using splats
class HighQualityRenderer{
	
	constructor(viewer){
		this.viewer = viewer;
		
		this.depthMaterial = null;
		this.attributeMaterial = null;
		this.normalizationMaterial = null;
		
		this.rtDepth;
		this.rtNormalize;
	};

	
	
	initHQSPlats(){
		if(this.depthMaterial != null){
			return;
		}
	
		this.depthMaterial = new Potree.PointCloudMaterial();
		this.attributeMaterial = new Potree.PointCloudMaterial();
	
		this.depthMaterial.pointColorType = Potree.PointColorType.DEPTH;
		this.depthMaterial.pointShape = Potree.PointShape.CIRCLE;
		this.depthMaterial.interpolate = false;
		this.depthMaterial.weighted = false;
		this.depthMaterial.minSize = viewer.minPointSize;
		this.depthMaterial.maxSize = viewer.maxPointSize;
					
		this.attributeMaterial.pointShape = Potree.PointShape.CIRCLE;
		this.attributeMaterial.interpolate = false;
		this.attributeMaterial.weighted = true;
		this.attributeMaterial.minSize = viewer.minPointSize;
		this.attributeMaterial.maxSize = viewer.maxPointSize;

		this.rtDepth = new THREE.WebGLRenderTarget( 1024, 1024, { 
			minFilter: THREE.NearestFilter, 
			magFilter: THREE.NearestFilter, 
			format: THREE.RGBAFormat, 
			type: THREE.FloatType
		} );

		this.rtNormalize = new THREE.WebGLRenderTarget( 1024, 1024, { 
			minFilter: THREE.LinearFilter, 
			magFilter: THREE.NearestFilter, 
			format: THREE.RGBAFormat, 
			type: THREE.FloatType
		} );
		
		var uniformsNormalize = {
			depthMap: { type: "t", value: this.rtDepth },
			texture: { type: "t", value: this.rtNormalize }
		};
		
		this.normalizationMaterial = new THREE.ShaderMaterial({
			uniforms: uniformsNormalize,
			vertexShader: Potree.Shaders["normalize.vs"],
			fragmentShader: Potree.Shaders["normalize.fs"]
		});
	};
	
	resize(width, height){
		if(this.rtDepth.width == width && this.rtDepth.height == height){
			return;
		}
		
		this.rtDepth.dispose();
		this.rtNormalize.dispose();
		
		viewer.scene.camera.aspect = width / height;
		viewer.scene.camera.updateProjectionMatrix();
		
		viewer.renderer.setSize(width, height);
		this.rtDepth.setSize(width, height);
		this.rtNormalize.setSize(width, height);
	};

	// render with splats
	render(renderer){
	
		var width = viewer.renderArea.clientWidth;
		var height = viewer.renderArea.clientHeight;
	
		this.initHQSPlats();
		
		this.resize(width, height);
		
		
		viewer.renderer.clear();
		if(viewer.background === "skybox"){
			viewer.renderer.clear();
			viewer.skybox.camera.rotation.copy(viewer.scene.camera.rotation);
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
		
		viewer.renderer.render(viewer.scene.scene, viewer.scene.camera);
		
		for(let pointcloud of viewer.scene.pointclouds){
		
			this.depthMaterial.uniforms.octreeSize.value = pointcloud.pcoGeometry.boundingBox.getSize().x;
			this.attributeMaterial.uniforms.octreeSize.value = pointcloud.pcoGeometry.boundingBox.getSize().x;
		
			let originalMaterial = pointcloud.material;
			
			{// DEPTH PASS
				this.depthMaterial.size = viewer.pointSize;
				this.depthMaterial.pointSizeType = viewer.pointSizeType;
				this.depthMaterial.screenWidth = width;
				this.depthMaterial.screenHeight = height;
				this.depthMaterial.uniforms.visibleNodes.value = pointcloud.material.visibleNodesTexture;
				this.depthMaterial.uniforms.octreeSize.value = pointcloud.pcoGeometry.boundingBox.getSize().x;
				this.depthMaterial.fov = viewer.scene.camera.fov * (Math.PI / 180);
				this.depthMaterial.spacing = pointcloud.pcoGeometry.spacing;
				this.depthMaterial.near = viewer.scene.camera.near;
				this.depthMaterial.far = viewer.scene.camera.far;
				this.depthMaterial.heightMin = viewer.heightMin;
				this.depthMaterial.heightMax = viewer.heightMax;
				this.depthMaterial.uniforms.visibleNodes.value = pointcloud.material.visibleNodesTexture;
				this.depthMaterial.uniforms.octreeSize.value = pointcloud.pcoGeometry.boundingBox.getSize().x;
				this.depthMaterial.bbSize = pointcloud.material.bbSize;
				this.depthMaterial.treeType = pointcloud.material.treeType;
				this.depthMaterial.uniforms.classificationLUT.value = pointcloud.material.uniforms.classificationLUT.value;
				
				viewer.scene.scenePointCloud.overrideMaterial = this.depthMaterial;
				viewer.renderer.clearTarget( this.rtDepth, true, true, true );
				viewer.renderer.render(viewer.scene.scenePointCloud, viewer.scene.camera, this.rtDepth);
				viewer.scene.scenePointCloud.overrideMaterial = null;
			}
			
			{// ATTRIBUTE PASS
				this.attributeMaterial.size = viewer.pointSize;
				this.attributeMaterial.pointSizeType = viewer.pointSizeType;
				this.attributeMaterial.screenWidth = width;
				this.attributeMaterial.screenHeight = height;
				this.attributeMaterial.pointColorType = viewer.pointColorType;
				this.attributeMaterial.depthMap = this.rtDepth;
				this.attributeMaterial.uniforms.visibleNodes.value = pointcloud.material.visibleNodesTexture;
				this.attributeMaterial.uniforms.octreeSize.value = pointcloud.pcoGeometry.boundingBox.getSize().x;
				this.attributeMaterial.fov = viewer.scene.camera.fov * (Math.PI / 180);
				this.attributeMaterial.uniforms.blendHardness.value = pointcloud.material.uniforms.blendHardness.value;
				this.attributeMaterial.uniforms.blendDepthSupplement.value = pointcloud.material.uniforms.blendDepthSupplement.value;
				this.attributeMaterial.spacing = pointcloud.pcoGeometry.spacing;
				this.attributeMaterial.near = viewer.scene.camera.near;
				this.attributeMaterial.far = viewer.scene.camera.far;
				this.attributeMaterial.heightMin = viewer.heightMin;
				this.attributeMaterial.heightMax = viewer.heightMax;
				this.attributeMaterial.intensityMin = pointcloud.material.intensityMin;
				this.attributeMaterial.intensityMax = pointcloud.material.intensityMax;
				this.attributeMaterial.setClipBoxes(pointcloud.material.clipBoxes);
				this.attributeMaterial.clipMode = pointcloud.material.clipMode;
				this.attributeMaterial.bbSize = pointcloud.material.bbSize;
				this.attributeMaterial.treeType = pointcloud.material.treeType;
				this.attributeMaterial.uniforms.classificationLUT.value = pointcloud.material.uniforms.classificationLUT.value;
				
				viewer.scene.scenePointCloud.overrideMaterial = this.attributeMaterial;
				viewer.renderer.clearTarget( this.rtNormalize, true, true, true );
				viewer.renderer.render(viewer.scene.scenePointCloud, viewer.scene.camera, this.rtNormalize);
				viewer.scene.scenePointCloud.overrideMaterial = null;
				
				pointcloud.material = originalMaterial;
			}
		}
		
		if(viewer.scene.pointclouds.length > 0){
			{// NORMALIZATION PASS
				this.normalizationMaterial.uniforms.depthMap.value = this.rtDepth;
				this.normalizationMaterial.uniforms.texture.value = this.rtNormalize;
				Potree.utils.screenPass.render(viewer.renderer, this.normalizationMaterial);
			}
			
			//viewer.volumeTool.render();
			viewer.renderer.clearDepth();
			viewer.profileTool.render();
			viewer.measuringTool.render();
			//viewer.transformationTool.render();
		}

	}
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
			type: THREE.FloatType,
			//type: THREE.UnsignedByteType,
			//depthBuffer: false,
			//stencilBuffer: false
		} );
		
	};
	
	resize(){
		let width = viewer.scaleFactor * viewer.renderArea.clientWidth;
		let height = viewer.scaleFactor * viewer.renderArea.clientHeight;
		let aspect = width / height;
		
		var needsResize = (this.rtColor.width != width || this.rtColor.height != height);
	
		// disposal will be unnecessary once this fix made it into three.js master: 
		// https://github.com/mrdoob/three.js/pull/6355
		if(needsResize){
			this.rtColor.dispose();
		}
		
		viewer.scene.camera.aspect = aspect;
		viewer.scene.camera.updateProjectionMatrix();
		
		viewer.renderer.setSize(width, height);
		this.rtColor.setSize(width, height);
	}

	render(){
	
		this.initEDL();
		
		this.resize();
		
		
		if(viewer.background === "skybox"){
			viewer.renderer.clear();
			viewer.skybox.camera.rotation.copy(viewer.scene.camera.rotation);
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
		
		viewer.renderer.render(viewer.scene.scene, viewer.scene.camera);
		
		viewer.renderer.clearTarget( this.rtColor, true, true, true );
		
		var originalMaterials = [];
		for(var i = 0; i < viewer.scene.pointclouds.length; i++){
			var pointcloud = viewer.scene.pointclouds[i];
			var width = viewer.renderArea.clientWidth;
			var height = viewer.renderArea.clientHeight;
			
			if(this.attributeMaterials.length <= i ){
				var attributeMaterial = new Potree.PointCloudMaterial();
					
				attributeMaterial.pointShape = Potree.PointShape.CIRCLE;
				attributeMaterial.interpolate = (viewer.quality === "Interpolation");
				attributeMaterial.weighted = false;
				attributeMaterial.minSize = viewer.minPointSize;
				attributeMaterial.maxSize = viewer.maxPointSize;
				attributeMaterial.useLogarithmicDepthBuffer = false;
				attributeMaterial.useEDL = true;
				this.attributeMaterials.push(attributeMaterial);
			}
			var attributeMaterial = this.attributeMaterials[i];
		
			var octreeSize = pointcloud.pcoGeometry.boundingBox.getSize().x;
		
			originalMaterials.push(pointcloud.material);
			
			{// COLOR & DEPTH PASS
				attributeMaterial = pointcloud.material;
				attributeMaterial.pointShape = Potree.PointShape.CIRCLE;
				attributeMaterial.interpolate = (viewer.quality === "Interpolation");
				attributeMaterial.weighted = false;
				attributeMaterial.minSize = viewer.minPointSize;
				attributeMaterial.maxSize = viewer.maxPointSize;
				attributeMaterial.useLogarithmicDepthBuffer = false;
				attributeMaterial.useEDL = true;
				
				attributeMaterial.size = viewer.pointSize;
				attributeMaterial.pointSizeType = viewer.pointSizeType;
				attributeMaterial.screenWidth = width;
				attributeMaterial.screenHeight = height;
				attributeMaterial.pointColorType = viewer.pointColorType;
				attributeMaterial.uniforms.visibleNodes.value = pointcloud.material.visibleNodesTexture;
				attributeMaterial.uniforms.octreeSize.value = octreeSize;
				attributeMaterial.fov = viewer.scene.camera.fov * (Math.PI / 180);
				attributeMaterial.spacing = pointcloud.pcoGeometry.spacing;
				attributeMaterial.near = viewer.scene.camera.near;
				attributeMaterial.far = viewer.scene.camera.far;
				attributeMaterial.heightMin = viewer.heightMin;
				attributeMaterial.heightMax = viewer.heightMax;
				attributeMaterial.intensityMin = pointcloud.material.intensityMin;
				attributeMaterial.intensityMax = pointcloud.material.intensityMax;
				attributeMaterial.setClipBoxes(pointcloud.material.clipBoxes);
				attributeMaterial.clipMode = pointcloud.material.clipMode;
				attributeMaterial.bbSize = pointcloud.material.bbSize;
				attributeMaterial.treeType = pointcloud.material.treeType;
				attributeMaterial.uniforms.classificationLUT.value = pointcloud.material.uniforms.classificationLUT.value;
				
				pointcloud.material = attributeMaterial;

				for(var j = 0; j < pointcloud.visibleNodes.length; j++){
					var node = pointcloud.visibleNodes[j];
					if(pointcloud instanceof Potree.PointCloudOctree){
						node.sceneNode.material = attributeMaterial;
					}else if(pointcloud instanceof Potree.PointCloudArena4D){
						node.material = attributeMaterial;
					}
				}
			}
			
		}
		
		//var queryPC = Potree.startQuery("PointCloud", viewer.renderer.getContext());
		viewer.renderer.render(viewer.scene.scenePointCloud, viewer.scene.camera, this.rtColor);
		//Potree.endQuery(queryPC, viewer.renderer.getContext());
		
		
		// bit of a hack here. The EDL pass will mess up the text of the volume tool
		// so volume tool is rendered again afterwards
		//viewer.volumeTool.render(this.rtColor);
				
		for(var i = 0; i < viewer.scene.pointclouds.length; i++){
			var pointcloud = viewer.scene.pointclouds[i];
			var originalMaterial = originalMaterials[i];
			pointcloud.material = originalMaterial;
			for(var j = 0; j < pointcloud.visibleNodes.length; j++){
				var node = pointcloud.visibleNodes[j];
				if(pointcloud instanceof Potree.PointCloudOctree){
					node.sceneNode.material = originalMaterial;
				}else if(pointcloud instanceof Potree.PointCloudArena4D){
					node.material = originalMaterial;
				}
			}
		}
			
		if(viewer.scene.pointclouds.length > 0){
			
			//var ext = viewer.renderer.getContext().getExtension("EXT_disjoint_timer_query");
			//if(window.timerQuery == null){
			//	window.timerQuery = ext.createQueryEXT();
			//	ext.beginQueryEXT(ext.TIME_ELAPSED_EXT, window.timerQuery);
			//}
			
			//var query = Potree.startQuery("EDL", viewer.renderer.getContext());
			
			{ // EDL OCCLUSION PASS
				this.edlMaterial.uniforms.screenWidth.value = width;
				this.edlMaterial.uniforms.screenHeight.value = height;
				this.edlMaterial.uniforms.colorMap.value = this.rtColor;
				this.edlMaterial.uniforms.edlStrength.value = viewer.edlStrength;
				this.edlMaterial.uniforms.radius.value = viewer.edlRadius;
				this.edlMaterial.uniforms.opacity.value = viewer.opacity;
				this.edlMaterial.depthTest = true;
				this.edlMaterial.depthWrite = true;
				this.edlMaterial.transparent = true;
			
				Potree.utils.screenPass.render(viewer.renderer, this.edlMaterial);
			}	
			
			viewer.renderer.render(viewer.scene.scene, viewer.scene.camera);
			
			//Potree.endQuery(query, viewer.renderer.getContext());
			//Potree.resolveQueries(viewer.renderer.getContext());
			
			//if(window.endedQuery == null){
			//	ext.endQueryEXT(ext.TIME_ELAPSED_EXT);
			//	window.endedQuery = window.timerQuery;
			//}
			//
			//
			//if(window.endedQuery != null){
			//	var available = ext.getQueryObjectEXT(window.endedQuery, ext.QUERY_RESULT_AVAILABLE_EXT);
			//	var disjoint = viewer.renderer.getContext().getParameter(ext.GPU_DISJOINT_EXT);
			//	
			//	if (available && !disjoint) {
			//		// See how much time the rendering of the object took in nanoseconds.
			//		var timeElapsed = ext.getQueryObjectEXT(window.endedQuery, ext.QUERY_RESULT_EXT);
			//		var miliseconds = timeElapsed / (1000 * 1000);
			//	
			//		console.log(miliseconds + "ms");
			//	  
			//		window.endedQuery = null;
			//		window.timerQuery = null;
			//	}
			//}

			
			
			viewer.profileTool.render();
			//viewer.volumeTool.render();
			viewer.renderer.clearDepth();
			viewer.measuringTool.render();
			//viewer.transformationTool.render();
		}

		

	}
};
