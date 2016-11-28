
Potree.Scene = class{
	constructor(){
		this.scene = new THREE.Scene();
		this.scenePointCloud = new THREE.Scene();
		this.sceneBG = new THREE.Scene();
		this.cameraBG;
		this.pointclouds = [];
		this.referenceFrame;
		
		this.referenceFrame = new THREE.Object3D();
		this.referenceFrame.matrixAutoUpdate = false;
		this.scenePointCloud.add(this.referenceFrame);
	}
};

Potree.Viewer = class{
	
	constructor(domElement, args){
		var a = args || {};
		this.pointCloudLoadedCallback = a.onPointCloudLoaded || function(){};
		
		this.renderArea = domElement;
		
		//if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
		//	defaultSettings.navigation = "Orbit";
		//}
		
		this.annotations = [];
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
		this.minimumJumpDistance = 0.2;
		this.jumpDistance = null;
		this.intensityMax = null;
		this.heightMin = null;
		this.heightMax = null;
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

		this.fpControls;
		this.orbitControls;
		this.earthControls;
		this.geoControls;
		this.controls;
		this.mapView;

		this.progressBar = new ProgressBar();

		this.stats = new Stats();
		//this.stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
		//document.body.appendChild( this.stats.dom );
		//this.stats.dom.style.left = "100px";
		
		this.potreeRenderer = null;
		this.highQualityRenderer = null;
		this.edlRenderer = null;
		this.renderer;
		this.camera;
		
		this.scene = new Potree.Scene();

		this.measuringTool;
		this.volumeTool;
		this.transformationTool;
		
		this.dispatcher = new THREE.EventDispatcher();
		this.skybox;
		this.stats;
		this.clock = new THREE.Clock();
		this.showSkybox = false;
		
		this.initThree();
		
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
			
			this.scaleFactor = 1;
		
			this.loadSettingsFromURL();
		}

		// start rendering!
		requestAnimationFrame(this.loop.bind(this));
		
	}

//------------------------------------------------------------------------------------
// Viewer API 
//------------------------------------------------------------------------------------
	
	addEventListener(type, callback){
		this.dispatcher.addEventListener(type, callback);
	}
	
	addPointCloud(path, callback){
		callback = callback || function(){};
		var initPointcloud = function(pointcloud){
			
			if(!this.mapView){
				if(pointcloud.projection){
					this.mapView = new Potree.MapView(this);
					this.mapView.init(this);
				}
			}
		
			this.scene.pointclouds.push(pointcloud);
			this.scene.referenceFrame.add(pointcloud);
		
			var sg = pointcloud.boundingSphere.clone().applyMatrix4(pointcloud.matrixWorld);
			 
			this.scene.referenceFrame.updateMatrixWorld(true);
			
			if(sg.radius > 50*1000){
				this.camera.near = 10;
			}else if(sg.radius > 10*1000){
				this.camera.near = 2;
			}else if(sg.radius > 1000){
				this.camera.near = 1;
			}else if(sg.radius > 100){
				this.camera.near = 0.5;
			}else{
				this.camera.near = 0.1;
			}

			//if(this.scene.pointclouds.length === 1){
			//	this.scene.referenceFrame.position.sub(sg.center);
			//	this.scene.referenceFrame.updateMatrixWorld(true);
			//	var moveSpeed = sg.radius / 6;
			//	this.setMoveSpeed(moveSpeed);
			//}
			
			//this.flipYZ();
			
			this.zoomTo(pointcloud, 1);
			
			var hr = this.getHeightRange();
			if(hr.min === null || hr.max === null){
				var bbWorld = this.getBoundingBox();
				
				this.setHeightRange(bbWorld.min.y, bbWorld.max.y);
			}
			
			this.earthControls.pointclouds.push(pointcloud);	
			
			
			if(this.scene.pointclouds.length === 1){
				this.setNavigationMode("Orbit");
				this.flipYZ();
				this.zoomTo(pointcloud, 1);
			}
			
			this.dispatcher.dispatchEvent({"type": "pointcloud_loaded", "pointcloud": pointcloud});
			
			callback({type: "pointcloud_loaded", pointcloud: pointcloud});
		}.bind(this);
		this.dispatcher.addEventListener("pointcloud_loaded", this.pointCloudLoadedCallback);
		
		// load pointcloud
		if(!path){
			
		}else if(path.indexOf("cloud.js") > 0){
			Potree.POCLoader.load(path, function(geometry){
				if(!geometry){
					callback({type: "loading_failed"});
				}else{
					let pointcloud = new Potree.PointCloudOctree(geometry);
					initPointcloud(pointcloud);				
				}
			}.bind(this));
		}else if(path.indexOf(".vpc") > 0){
			Potree.PointCloudArena4DGeometry.load(path, function(geometry){
				if(!geometry){
					callback({type: "loading_failed"});
				}else{
					let pointcloud = new Potree.PointCloudArena4D(geometry);
					initPointcloud(pointcloud);
				}
			});
		}else{
			callback({"type": "loading_failed"});
		}
	};
	
	toLocal(position){
		var scenePos = position.clone().applyMatrix4(this.scene.referenceFrame.matrixWorld);
			
		return scenePos;
	};
	
	
	toGeo(position){
		var inverse = new THREE.Matrix4().getInverse(this.scene.referenceFrame.matrixWorld);
		var geoPos = position.clone().applyMatrix4(inverse);

		return geoPos;
	};

	getMinNodeSize(){
		return this.minNodeSize;
	};
	
	setMinNodeSize(value){
		if(this.minNodeSize !== value){
			this.minNodeSize = value;
			this.dispatcher.dispatchEvent({"type": "minnodesize_changed", "viewer": this});
		}
	};
	
	setDescription(value){
		$('#potree_description')[0].innerHTML = value;
	};
	
	setNavigationMode(value){
		if(value === "Orbit"){
			this.useOrbitControls();
		}else if(value === "Flight"){
			this.useFPSControls();
		}else if(value === "Earth"){
			this.useEarthControls();
		}
		
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
	
	setShowSkybox(value){
		if(this.showSkybox !== value){
			this.showSkybox = value;
			this.dispatcher.dispatchEvent({"type": "show_skybox_changed", "viewer": this});
		}
	};
	
	getShowSkybox(){
		return this.showSkybox;
	};
	
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
		for(var i = 0; i < this.annotations.length; i++){
			var annotation = this.annotations[i];
			annotation.domElement.style.pointerEvents = "none";
		};
	};
	
	enableAnnotations(){
		for(var i = 0; i < this.annotations.length; i++){
			var annotation = this.annotations[i];
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
		this.camera.zoomTo(node, factor);
		
		var bs;
		if(node.boundingSphere){
			bs = node.boundingSphere;
		}else if(node.geometry && node.geometry.boundingSphere){
			bs = node.geometry.boundingSphere;
		}else{
			bs = node.boundingBox.getBoundingSphere();
		}
		
		bs = bs.clone().applyMatrix4(node.matrixWorld); 
		
		this.orbitControls.target.copy(bs.center);
		
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
			
			//var boxWorld = pointcloud.boundingBox.clone().applyMatrix4(pointcloud.matrixWorld);
			var boxWorld = Potree.utils.computeTransformedBoundingBox(pointcloud.boundingBox, pointcloud.matrixWorld)
			box.union(boxWorld);
		}
		
		return box;
	};
	
	getBoundingBoxGeo(pointclouds){
		pointclouds = pointclouds || this.scene.pointclouds;
		
		var box = new THREE.Box3();
		
		this.scene.scenePointCloud.updateMatrixWorld(true);
		this.scene.referenceFrame.updateMatrixWorld(true);
		
		for(var i = 0; i < this.scene.pointclouds.length; i++){
			var pointcloud = this.scene.pointclouds[i];
			
			pointcloud.updateMatrixWorld(true);
			
			var boxWorld = Potree.utils.computeTransformedBoundingBox(pointcloud.boundingBox, pointcloud.matrix)
			box.union(boxWorld);
		}
		
		return box;
	};
	
	fitToScreen(){
		var box = this.getBoundingBox(this.scene.pointclouds);
		
		if(this.transformationTool.targets.length > 0){
			box = this.transformationTool.getBoundingBox();
		}
		
		var node = new THREE.Object3D();
		node.boundingBox = box;
		
		//this.camera.zoomTo(node, 1);
		this.zoomTo(node, 1);
	};
	
	setTopView(){
		var box = this.getBoundingBox(this.scene.pointclouds);
		
		if(this.transformationTool.targets.length > 0){
			box = this.transformationTool.getBoundingBox();
		}
		
		var node = new THREE.Object3D();
		node.boundingBox = box;
		
		this.camera.position.set(0, 1, 0);
		this.camera.rotation.set(-Math.PI / 2, 0, 0);
		this.camera.zoomTo(node, 1);
	};
	
	setFrontView(){
		var box = this.getBoundingBox(this.scene.pointclouds);
		
		if(this.transformationTool.targets.length > 0){
			box = this.transformationTool.getBoundingBox();
		}
		
		var node = new THREE.Object3D();
		node.boundingBox = box;
		
		this.camera.position.set(0, 0, 1);
		this.camera.rotation.set(0, 0, 0);
		this.camera.zoomTo(node, 1);
	};
	
	setLeftView(){
		var box = this.getBoundingBox(this.scene.pointclouds);
		
		if(this.transformationTool.targets.length > 0){
			box = this.transformationTool.getBoundingBox();
		}
		
		var node = new THREE.Object3D();
		node.boundingBox = box;
		
		this.camera.position.set(-1, 0, 0);
		this.camera.rotation.set(0, -Math.PI / 2, 0);
		this.camera.zoomTo(node, 1);
	};
	
	setRightView(){
		var box = this.getBoundingBox(this.scene.pointclouds);
		
		if(this.transformationTool.targets.length > 0){
			box = this.transformationTool.getBoundingBox();
		}
		
		var node = new THREE.Object3D();
		node.boundingBox = box;
		
		this.camera.position.set(1, 0, 0);
		this.camera.rotation.set(0, Math.PI / 2, 0);
		this.camera.zoomTo(node, 1);
	};
	
	flipYZ(){
		this.isFlipYZ = !this.isFlipYZ;
		
		if(this.isFlipYZ){
			this.scene.referenceFrame.matrix.copy(new THREE.Matrix4().set(
				1,0,0,0,
				0,0,1,0,
				0,-1,0,0,
				0,0,0,1
			));
		}else{
			this.scene.referenceFrame.matrix.copy(new THREE.Matrix4().set(
				1,0,0,0,
				0,1,0,0,
				0,0,1,0,
				0,0,0,1
			));
		}
		
		this.scene.referenceFrame.updateMatrixWorld(true);
		var box = this.getBoundingBox();
		//this.scene.referenceFrame.position.copy(box.getCenter()).multiplyScalar(-1);
		//this.scene.referenceFrame.position.y = -box.min.y;
		this.scene.referenceFrame.updateMatrixWorld(true);
		
		this.updateHeightRange();
		
		
		//this.isFlipYZ = !this.isFlipYZ;
		//
		//this.scene.referenceFrame.matrix.copy(new THREE.Matrix4());
		//if(this.isFlipYZ){
		//	this.scene.referenceFrame.applyMatrix(new THREE.Matrix4().set(
		//		1,0,0,0,
		//		0,0,1,0,
		//		0,-1,0,0,
		//		0,0,0,1
		//	));
		//	
		//}else{
		//	this.scene.referenceFrame.applyMatrix(new THREE.Matrix4().set(
		//		1,0,0,0,
		//		0,1,0,0,
		//		0,0,1,0,
		//		0,0,0,1
		//	));
		//}
		//
		//this.scene.referenceFrame.updateMatrixWorld(true);
		//var box = this.getBoundingBox();
		//this.scene.referenceFrame.position.copy(box.getCenter()).multiplyScalar(-1);
		//this.scene.referenceFrame.position.y = -box.min.y;
		//this.scene.referenceFrame.updateMatrixWorld(true);
		//
		//this.updateHeightRange();
	}
	
	updateHeightRange(){
		var bbWorld = this.getBoundingBox();
		this.setHeightRange(bbWorld.min.y, bbWorld.max.y);
	};
	
	useEarthControls(){
		if(this.controls){
			this.controls.enabled = false;
		}		

		this.controls = this.earthControls;
		this.controls.enabled = true;
	}
	
	useGeoControls(){
		if(this.controls){
			this.controls.enabled = false;
		}

		this.controls = this.geoControls;
		this.controls.enabled = true;
		
		//this.controls.moveSpeed = this.scene.pointclouds[0].boundingSphere.radius / 6;
	}

	useFPSControls(){
		if(this.controls){
			this.controls.enabled = false;
		}

		this.controls = this.fpControls;
		this.controls.enabled = true;
		
		//this.controls.moveSpeed = this.scene.pointclouds[0].boundingSphere.radius / 6;
	}

	useOrbitControls(){
		if(this.controls){
			this.controls.enabled = false;
		}
		
		this.controls = this.orbitControls;
		this.controls.enabled = true;
		
		if(this.scene.pointclouds.length > 0){
			this.controls.target.copy(this.scene.pointclouds[0].boundingSphere.center.clone().applyMatrix4(this.scene.pointclouds[0].matrixWorld));
		}
	};
	
	addAnnotation(position, args){
		var cameraPosition = args.cameraPosition;
		var cameraTarget = args.cameraTarget || position;
		var description = args.description || null;
		var title = args.title || null;
		var actions = args.actions || null;
		
		var annotation = new Potree.Annotation(this, {
			"position": position,
			"cameraPosition": cameraPosition,
			"cameraTarget": cameraTarget,
			"title": title,
			"description": description,
			"actions": actions
		});
		
		this.annotations.push(annotation);
		this.renderArea.appendChild(annotation.domElement);
		
		this.dispatcher.dispatchEvent({"type": "annotation_added", "viewer": this});
		
		return annotation;
	}
	
	getAnnotations(){
		return this.annotations;
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
        console.log("ici");
    }

	createControls(){
		
		var demCollisionHandler =  function(event){
			
			if(!this.useDEMCollisions){
				return
			}
			
			var demHeight = null;
			
			for(var i = 0; i < this.scene.pointclouds.length; i++){
				var pointcloud = this.scene.pointclouds[i];
				pointcloud.generateDEM = true;
				
				var height = pointcloud.getDEMHeight(event.newPosition);
				
				if(demHeight){
					demHeight = Math.max(demHeight, height);
				}else{
					demHeight = height;
				}
			}
			
			if(event.newPosition.y < demHeight){
				event.objections++;
				var counterProposal = event.newPosition.clone();
				counterProposal.y = demHeight;
				event.counterProposals.push(counterProposal);
			}
		};
		
		{ // create FIRST PERSON CONTROLS
			this.fpControls = new THREE.FirstPersonControls(this.camera, this.renderer.domElement);
			this.fpControls.enabled = false;
			this.fpControls.addEventListener("start", this.disableAnnotations.bind(this));
			this.fpControls.addEventListener("end", this.enableAnnotations.bind(this));
			this.fpControls.addEventListener("proposeTransform", demCollisionHandler);
			this.fpControls.addEventListener("move_speed_changed", function(event){
				this.setMoveSpeed(this.fpControls.moveSpeed);
			}.bind(this));
		}
		
		{ // create GEO CONTROLS
			this.geoControls = new Potree.GeoControls(this.camera, this.renderer.domElement);
			this.geoControls.enabled = false;
			this.geoControls.addEventListener("start", this.disableAnnotations.bind(this));
			this.geoControls.addEventListener("end", this.enableAnnotations.bind(this));
			this.geoControls.addEventListener("proposeTransform", demCollisionHandler.bind(this));
			this.geoControls.addEventListener("move_speed_changed", function(event){
				this.setMoveSpeed(this.geoControls.moveSpeed);
			}.bind(this));
		}
	
		{ // create ORBIT CONTROLS
			this.orbitControls = new Potree.OrbitControls(this.camera, this.renderer.domElement);
			this.orbitControls.enabled = false;
			this.orbitControls.addEventListener("start", this.disableAnnotations.bind(this));
			this.orbitControls.addEventListener("end", this.enableAnnotations.bind(this));
			this.orbitControls.addEventListener("proposeTransform", demCollisionHandler.bind(this));
			this.renderArea.addEventListener("dblclick", function(event){
				if(this.scene.pointclouds.length === 0){
					return;
				}
				
				event.preventDefault();
			
				var rect = this.renderArea.getBoundingClientRect();
				
				var mouse =  {
					x: ( (event.clientX - rect.left) / this.renderArea.clientWidth ) * 2 - 1,
					y: - ( (event.clientY - rect.top) / this.renderArea.clientHeight ) * 2 + 1
				};
				
				var pointcloud = null;
				var distance = Number.POSITIVE_INFINITY;
				var I = null;
				
				for(var i = 0; i < this.scene.pointclouds.length; i++){
					intersection = getMousePointCloudIntersection(mouse, this.camera, this.renderer, [this.scene.pointclouds[i]]);
					if(!intersection){
						continue;
					}
					
					var tDist = this.camera.position.distanceTo(intersection);
					if(tDist < distance){
						pointcloud = this.scene.pointclouds[i];
						distance = tDist;
						I = intersection;
					}
				}
				
				if(I != null){
				
					var targetRadius = 0;
					if(!this.jumpDistance){
						var camTargetDistance = this.camera.position.distanceTo(this.orbitControls.target);
					
						var vector = new THREE.Vector3( mouse.x, mouse.y, 0.5 );
						vector.unproject(this.camera);

						var direction = vector.sub(this.camera.position).normalize();
						var ray = new THREE.Ray(this.camera.position, direction);
						
						var nodes = pointcloud.nodesOnRay(pointcloud.visibleNodes, ray);
						var lastNode = nodes[nodes.length - 1];
						var radius = lastNode.getBoundingSphere().radius;
						var targetRadius = Math.min(camTargetDistance, radius);
						var targetRadius = Math.max(this.minimumJumpDistance, targetRadius);
					}else{
						targetRadius = this.jumpDistance;
					}
					
					var d = this.camera.getWorldDirection().multiplyScalar(-1);
					var cameraTargetPosition = new THREE.Vector3().addVectors(I, d.multiplyScalar(targetRadius));
					var controlsTargetPosition = I;
					
					var animationDuration = 600;
					
					var easing = TWEEN.Easing.Quartic.Out;
					
					this.controls.enabled = false;
					
					// animate position
					var tween = new TWEEN.Tween(this.camera.position).to(cameraTargetPosition, animationDuration);
					tween.easing(easing);
					tween.start();
					
					// animate target
					var tween = new TWEEN.Tween(this.orbitControls.target).to(I, animationDuration);
					tween.easing(easing);
					tween.onComplete(function(){
						this.controls.enabled = true;
						this.fpControls.moveSpeed = radius / 2;
						this.geoControls.moveSpeed = radius / 2;
					});
					tween.start();
				}
			});
		}
		
		{ // create EARTH CONTROLS
			this.earthControls = new THREE.EarthControls(this.camera, this.renderer, this.scene.scenePointCloud);
			this.earthControls.enabled = false;
			this.earthControls.addEventListener("start", this.disableAnnotations);
			this.earthControls.addEventListener("end", this.enableAnnotations);
			this.earthControls.addEventListener("proposeTransform", demCollisionHandler);
		}
	};
	
	
	initThree(){
		let width = this.renderArea.clientWidth;
		let height = this.renderArea.clientHeight;
		let aspect = width / height;
		let near = 0.1;
		let far = 1000*1000;
		
		this.camera = new THREE.PerspectiveCamera(this.fov, aspect, near, far);
		this.cameraBG = new THREE.Camera();
		this.camera.rotation.order = 'ZYX';
		
		

		this.renderer = new THREE.WebGLRenderer();
		this.renderer.setSize(width, height);
		this.renderer.autoClear = false;
		this.renderArea.appendChild(this.renderer.domElement);
		this.renderer.domElement.tabIndex = "2222";
		this.renderer.domElement.addEventListener("mousedown", 
			function(){this.renderer.domElement.focus();}.bind(this));
		
		this.skybox = Potree.utils.loadSkybox(new URL(Potree.resourcePath + "/textures/skybox/").href);

		// camera and controls
		this.camera.position.set(-304, 372, 318);
		this.camera.rotation.y = -Math.PI / 4;
		this.camera.rotation.x = -Math.PI / 6;
		
		this.createControls();
		
		//this.useEarthControls();
		
		// enable frag_depth extension for the interpolation shader, if available
		this.renderer.context.getExtension("EXT_frag_depth");
		
		//this.addPointCloud(pointcloudPath);
		
		let grid = Potree.utils.createGrid(5, 5, 2);
		this.scene.scene.add(grid);
		
		this.measuringTool = new Potree.MeasuringTool(this.scene.scenePointCloud, this.camera, this.renderer, this.toGeo);
		this.profileTool = new Potree.ProfileTool(this.scene.scenePointCloud, this.camera, this.renderer);
		this.transformationTool = new Potree.TransformationTool(this.scene.scenePointCloud, this.camera, this.renderer);
		this.volumeTool = new Potree.VolumeTool(this.scene.scenePointCloud, this.camera, this.renderer, this.transformationTool);
		
		this.profileTool.addEventListener("profile_added", function(profileEvent){
		
			//var poSelect = document.getElementById("profile_selection");
			//var po = document.createElement("option");
			//po.innerHTML = "profile " + this.profileTool.profiles.length;
			//poSelect.appendChild(po);
			
		
			var profileButton = document.createElement("button");
			profileButton.type = "button";
			profileButton.classList.add("btn");
			profileButton.classList.add("btn-primary");
			profileButton.id = "btn_rofile_" + this.profileTool.profiles.length;
			//profileButton.style.width = "100%";
			profileButton.value = "profile " + this.profileTool.profiles.length;
			profileButton.innerHTML = "profile " + this.profileTool.profiles.length;
			
			//type="button" class="btn btn-primary"
			
			profileButton.onclick = function(clickEvent){
				this.profileTool.draw(
					profileEvent.profile, 
					$("#profile_draw_container")[0], 
					this.toGeo);
				profileEvent.profile.addEventListener("marker_moved", function(){
					this.profileTool.draw(
					profileEvent.profile, 
					$("#profile_draw_container")[0], 
					this.toGeo);
				});
				profileEvent.profile.addEventListener("width_changed", function(){
					this.profileTool.draw(
					profileEvent.profile, 
					$("#profile_draw_container")[0], 
					this.toGeo);
				});
			};
		});
		
		
		// background
		// var texture = THREE.ImageUtils.loadTexture( Potree.resourcePath + '/textures/background.gif' );
		var texture = Potree.utils.createBackgroundTexture(512, 512);
		
		texture.minFilter = texture.magFilter = THREE.NearestFilter;
		texture.minFilter = texture.magFilter = THREE.LinearFilter;
		
		var bg = new THREE.Mesh(
			new THREE.PlaneBufferGeometry(2, 2, 0),
			new THREE.MeshBasicMaterial({
				map: texture
			})
		);
		//bg.position.z = -1;
		bg.material.depthTest = false;
		bg.material.depthWrite = false;
		this.scene.sceneBG.add(bg);			
		
		let onKeyDown = function(event){
			//console.log(event.keyCode);
			
			if(event.keyCode === 69){
				// e pressed
				
				this.transformationTool.translate();
			}else if(event.keyCode === 82){
				// r pressed
				
				this.transformationTool.scale();
			}else if(event.keyCode === 84){
				// r pressed
				
				this.transformationTool.rotate();
			}
		};
		
		window.addEventListener( 'keydown', onKeyDown, false );
		
		this.directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
		this.directionalLight.position.set( 10, 10, 10 );
		this.directionalLight.lookAt( new THREE.Vector3(0, 0, 0));
		this.scene.scenePointCloud.add( this.directionalLight );
		
		var light = new THREE.AmbientLight( 0x555555 ); // soft white light
		this.scene.scenePointCloud.add( light );
		
	}

	update(delta, timestamp){
		Potree.pointLoadLimit = Potree.pointBudget * 2;
		
		this.directionalLight.position.copy(this.camera.position);
		this.directionalLight.lookAt(new THREE.Vector3().addVectors(this.camera.position, this.camera.getWorldDirection()));
		
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
			//	pointcloud.update(this.camera, this.renderer);
			//}
			
			visibleNodes += pointcloud.numVisibleNodes;
			visiblePoints += pointcloud.numVisiblePoints;
			
			progress += pointcloud.progress;
		}
		
		if(!this.freeze){
			var result = Potree.updatePointClouds(this.scene.pointclouds, this.camera, this.renderer);
			visibleNodes = result.visibleNodes.length;
			visiblePoints = result.numVisiblePoints;
		}
		
		
		//if(stats && this.showStats){
		//	document.getElementById("lblNumVisibleNodes").style.display = "";
		//	document.getElementById("lblNumVisiblePoints").style.display = "";
		//	stats.domElement.style.display = "";
		//
		//	stats.update();
		//
		//	document.getElementById("lblNumVisibleNodes").innerHTML = "visible nodes: " + visibleNodes;
		//	document.getElementById("lblNumVisiblePoints").innerHTML = "visible points: " + Potree.utils.addCommas(visiblePoints);
		//}else if(stats){
		//	document.getElementById("lblNumVisibleNodes").style.display = "none";
		//	document.getElementById("lblNumVisiblePoints").style.display = "none";
		//	stats.domElement.style.display = "none";
		//}
		
		this.camera.fov = this.fov;
		
		if(this.controls){
			this.controls.update(delta);
		}

		// update progress bar
		if(this.scene.pointclouds.length > 0){
			this.progressBar.progress = progress / this.scene.pointclouds.length;
			
			var message;
			if(progress === 0){
				message = "loading";
			}else{
				message = "loading: " + parseInt(progress*100 / this.scene.pointclouds.length) + "%";
			}
			this.progressBar.message = message;
			
			if(progress >= 0.999){
				this.progressBar.hide();
			}else if(progress < 1){
				this.progressBar.show();
			}
		}
		
		this.volumeTool.update();
		this.transformationTool.update();
		this.profileTool.update();
		
		
		var clipBoxes = [];
		
		for(var i = 0; i < this.profileTool.profiles.length; i++){
			var profile = this.profileTool.profiles[i];
			
			for(var j = 0; j < profile.boxes.length; j++){
				var box = profile.boxes[j];
				box.updateMatrixWorld();
				var boxInverse = new THREE.Matrix4().getInverse(box.matrixWorld);
				var boxPosition = box.getWorldPosition();
				clipBoxes.push({inverse: boxInverse, position: boxPosition});
			}
		}
		
		for(var i = 0; i < this.volumeTool.volumes.length; i++){
			var volume = this.volumeTool.volumes[i];
			
			if(volume.clip){
				volume.updateMatrixWorld();
				var boxInverse = new THREE.Matrix4().getInverse(volume.matrixWorld);
				var boxPosition = volume.getWorldPosition();
				//clipBoxes.push(boxInverse);
				clipBoxes.push({inverse: boxInverse, position: boxPosition});
			}
		}
		
		
		for(var i = 0; i < this.scene.pointclouds.length; i++){
			this.scene.pointclouds[i].material.setClipBoxes(clipBoxes);
		}
		
		{// update annotations
			var distances = [];
			for(var i = 0; i < this.annotations.length; i++){
				var ann = this.annotations[i];
				var screenPos = ann.position.clone().project(this.camera);
				
				screenPos.x = this.renderArea.clientWidth * (screenPos.x + 1) / 2;
				screenPos.y = this.renderArea.clientHeight * (1 - (screenPos.y + 1) / 2);
				
				ann.domElement.style.left = Math.floor(screenPos.x - ann.domElement.clientWidth / 2) + "px";
				ann.domElement.style.top = Math.floor(screenPos.y) + "px";
				
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
				this.camera.position.x.toFixed(2) 
				+ ", " + this.camera.position.y.toFixed(2) 
				+ ", " + this.camera.position.z.toFixed(2)
			);
		}
		
		if(this.mapView){
			this.mapView.update(delta, this.camera);
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
			
			viewer.camera.aspect = aspect;
			viewer.camera.updateProjectionMatrix();
			
			viewer.renderer.setSize(width, height);
		}
		

		//var queryAll = Potree.startQuery("All", viewer.renderer.getContext());
		
		// render skybox
		if(viewer.showSkybox){
			viewer.skybox.camera.rotation.copy(viewer.camera.rotation);
			viewer.renderer.render(viewer.skybox.scene, viewer.skybox.camera);
		}else{
			viewer.renderer.render(viewer.scene.sceneBG, viewer.cameraBG);
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
		viewer.renderer.render(viewer.scene.scene, viewer.camera);
		
		//var queryPC = Potree.startQuery("PointCloud", viewer.renderer.getContext());
		viewer.renderer.render(viewer.scene.scenePointCloud, viewer.camera);
		//Potree.endQuery(queryPC, viewer.renderer.getContext());
		
		viewer.profileTool.render();
		viewer.volumeTool.render();
		
		viewer.renderer.clearDepth();
		viewer.measuringTool.render();
		viewer.transformationTool.render();
		
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
		if(depthMaterial != null){
			return;
		}
	
		depthMaterial = new Potree.PointCloudMaterial();
		attributeMaterial = new Potree.PointCloudMaterial();
	
		depthMaterial.pointColorType = Potree.PointColorType.DEPTH;
		depthMaterial.pointShape = Potree.PointShape.CIRCLE;
		depthMaterial.interpolate = false;
		depthMaterial.weighted = false;
		depthMaterial.minSize = viewer.minPointSize;
		depthMaterial.maxSize = viewer.maxPointSize;
					
		attributeMaterial.pointShape = Potree.PointShape.CIRCLE;
		attributeMaterial.interpolate = false;
		attributeMaterial.weighted = true;
		attributeMaterial.minSize = viewer.minPointSize;
		attributeMaterial.maxSize = viewer.maxPointSize;

		rtDepth = new THREE.WebGLRenderTarget( 1024, 1024, { 
			minFilter: THREE.NearestFilter, 
			magFilter: THREE.NearestFilter, 
			format: THREE.RGBAFormat, 
			type: THREE.FloatType
		} );

		rtNormalize = new THREE.WebGLRenderTarget( 1024, 1024, { 
			minFilter: THREE.LinearFilter, 
			magFilter: THREE.NearestFilter, 
			format: THREE.RGBAFormat, 
			type: THREE.FloatType
		} );
		
		var uniformsNormalize = {
			depthMap: { type: "t", value: rtDepth },
			texture: { type: "t", value: rtNormalize }
		};
		
		normalizationMaterial = new THREE.ShaderMaterial({
			uniforms: uniformsNormalize,
			vertexShader: Potree.Shaders["normalize.vs"],
			fragmentShader: Potree.Shaders["normalize.fs"]
		});
	};
	
	resize(width, height){
		if(rtDepth.width == width && rtDepth.height == height){
			return;
		}
		
		rtDepth.dispose();
		rtNormalize.dispose();
		
		viewer.camera.aspect = width / height;
		viewer.camera.updateProjectionMatrix();
		
		viewer.renderer.setSize(width, height);
		rtDepth.setSize(width, height);
		rtNormalize.setSize(width, height);
	};

	// render with splats
	render(renderer){
	
		var width = viewer.renderArea.clientWidth;
		var height = viewer.renderArea.clientHeight;
	
		initHQSPlats();
		
		resize(width, height);
		
		
		viewer.renderer.clear();
		if(viewer.showSkybox){
			skybox.camera.rotation.copy(viewer.camera.rotation);
			viewer.renderer.render(skybox.scene, skybox.camera);
		}else{
			viewer.renderer.render(viewer.sceneBG, viewer.cameraBG);
		}
		viewer.renderer.render(viewer.scene, viewer.camera);
		
		for(var i = 0; i < viewer.pointclouds.length; i++){
			var pointcloud = viewer.pointclouds[i];
		
			depthMaterial.uniforms.octreeSize.value = pointcloud.pcoGeometry.boundingBox.getSize().x;
			attributeMaterial.uniforms.octreeSize.value = pointcloud.pcoGeometry.boundingBox.getSize().x;
		
			var originalMaterial = pointcloud.material;
			
			{// DEPTH PASS
				depthMaterial.size = viewer.pointSize;
				depthMaterial.pointSizeType = viewer.pointSizeType;
				depthMaterial.screenWidth = width;
				depthMaterial.screenHeight = height;
				depthMaterial.uniforms.visibleNodes.value = pointcloud.material.visibleNodesTexture;
				depthMaterial.uniforms.octreeSize.value = pointcloud.pcoGeometry.boundingBox.getSize().x;
				depthMaterial.fov = viewer.camera.fov * (Math.PI / 180);
				depthMaterial.spacing = pointcloud.pcoGeometry.spacing;
				depthMaterial.near = viewer.camera.near;
				depthMaterial.far = viewer.camera.far;
				depthMaterial.heightMin = viewer.heightMin;
				depthMaterial.heightMax = viewer.heightMax;
				depthMaterial.uniforms.visibleNodes.value = pointcloud.material.visibleNodesTexture;
				depthMaterial.uniforms.octreeSize.value = pointcloud.pcoGeometry.boundingBox.getSize().x;
				depthMaterial.bbSize = pointcloud.material.bbSize;
				depthMaterial.treeType = pointcloud.material.treeType;
				depthMaterial.uniforms.classificationLUT.value = pointcloud.material.uniforms.classificationLUT.value;
				
				viewer.scenePointCloud.overrideMaterial = depthMaterial;
				viewer.renderer.clearTarget( rtDepth, true, true, true );
				viewer.renderer.render(viewer.scenePointCloud, viewer.camera, rtDepth);
				viewer.scenePointCloud.overrideMaterial = null;
			}
			
			{// ATTRIBUTE PASS
				attributeMaterial.size = viewer.pointSize;
				attributeMaterial.pointSizeType = viewer.pointSizeType;
				attributeMaterial.screenWidth = width;
				attributeMaterial.screenHeight = height;
				attributeMaterial.pointColorType = viewer.pointColorType;
				attributeMaterial.depthMap = rtDepth;
				attributeMaterial.uniforms.visibleNodes.value = pointcloud.material.visibleNodesTexture;
				attributeMaterial.uniforms.octreeSize.value = pointcloud.pcoGeometry.boundingBox.getSize().x;
				attributeMaterial.fov = viewer.camera.fov * (Math.PI / 180);
				attributeMaterial.uniforms.blendHardness.value = pointcloud.material.uniforms.blendHardness.value;
				attributeMaterial.uniforms.blendDepthSupplement.value = pointcloud.material.uniforms.blendDepthSupplement.value;
				attributeMaterial.spacing = pointcloud.pcoGeometry.spacing;
				attributeMaterial.near = viewer.camera.near;
				attributeMaterial.far = viewer.camera.far;
				attributeMaterial.heightMin = viewer.heightMin;
				attributeMaterial.heightMax = viewer.heightMax;
				attributeMaterial.intensityMin = pointcloud.material.intensityMin;
				attributeMaterial.intensityMax = pointcloud.material.intensityMax;
				attributeMaterial.setClipBoxes(pointcloud.material.clipBoxes);
				attributeMaterial.clipMode = pointcloud.material.clipMode;
				attributeMaterial.bbSize = pointcloud.material.bbSize;
				attributeMaterial.treeType = pointcloud.material.treeType;
				attributeMaterial.uniforms.classificationLUT.value = pointcloud.material.uniforms.classificationLUT.value;
				
				viewer.scenePointCloud.overrideMaterial = attributeMaterial;
				viewer.renderer.clearTarget( rtNormalize, true, true, true );
				viewer.renderer.render(viewer.scenePointCloud, viewer.camera, rtNormalize);
				viewer.scenePointCloud.overrideMaterial = null;
				
				pointcloud.material = originalMaterial;
			}
		}
		
		if(viewer.pointclouds.length > 0){
			{// NORMALIZATION PASS
				normalizationMaterial.uniforms.depthMap.value = rtDepth;
				normalizationMaterial.uniforms.texture.value = rtNormalize;
				Potree.utils.screenPass.render(viewer.renderer, normalizationMaterial);
			}
			
			viewer.volumeTool.render();
			viewer.renderer.clearDepth();
			viewer.profileTool.render();
			viewer.measuringTool.render();
			viewer.transformationTool.render();
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
		
		viewer.camera.aspect = aspect;
		viewer.camera.updateProjectionMatrix();
		
		viewer.renderer.setSize(width, height);
		this.rtColor.setSize(width, height);
	}

	render(){
	
		this.initEDL();
		
		this.resize();
		
		viewer.renderer.clear();
		if(viewer.showSkybox){
			viewer.skybox.camera.rotation.copy(viewer.camera.rotation);
			viewer.renderer.render(viewer.skybox.scene, viewer.skybox.camera);
		}else{
			viewer.renderer.render(viewer.scene.sceneBG, viewer.cameraBG);
		}
		viewer.renderer.render(viewer.scene.scene, viewer.camera);
		
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
			
			viewer.renderer.clearTarget( this.rtColor, true, true, true );
			
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
				attributeMaterial.fov = viewer.camera.fov * (Math.PI / 180);
				attributeMaterial.spacing = pointcloud.pcoGeometry.spacing;
				attributeMaterial.near = viewer.camera.near;
				attributeMaterial.far = viewer.camera.far;
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
		viewer.renderer.render(viewer.scene.scenePointCloud, viewer.camera, this.rtColor);
		//Potree.endQuery(queryPC, viewer.renderer.getContext());
		
		
		// bit of a hack here. The EDL pass will mess up the text of the volume tool
		// so volume tool is rendered again afterwards
		viewer.volumeTool.render(this.rtColor);
				
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
			
			viewer.renderer.render(viewer.scene.scene, viewer.camera);
			
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
			viewer.volumeTool.render();
			viewer.renderer.clearDepth();
			viewer.measuringTool.render();
			viewer.transformationTool.render();
		}

		

	}
};