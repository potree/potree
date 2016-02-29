
Potree.Viewer = function(domElement, args){
	var scope = this;
	var arguments = args || {};
	var pointCloudLoadedCallback = arguments.onPointCloudLoaded || function(){};

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
	this.edlScale = 1;
	this.edlRadius = 3;
	this.useEDL = false;
	this.minimumJumpDistance = 0.2;
	this.jumpDistance = null;
	this.intensityMax = null;
	this.heightMin = null;
	this.heightMax = null;
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

	this.progressBar = new ProgressBar();

	var gui;

	this.renderer;
	this.camera;
	this.scene;
	this.scenePointCloud;
	this.sceneBG;
	this.cameraBG;
	this.pointclouds = [];
	this.measuringTool;
	this.volumeTool;
	this.transformationTool;

	var skybox;
	var stats;
	var clock = new THREE.Clock();
	this.showSkybox = false;
	this.referenceFrame;



























//------------------------------------------------------------------------------------
// Viewer API
//------------------------------------------------------------------------------------

	this.addPointCloud = function(path, callback){
		callback = callback || function(){};
		var initPointcloud = function(pointcloud){

			if(!scope.mapView){
				if(pointcloud.projection){
					scope.mapView = new Potree.Viewer.MapView(viewer);
					scope.mapView.init(viewer);
				}
			}

			scope.pointclouds.push(pointcloud);

			scope.referenceFrame.add(pointcloud);

			var sg = pointcloud.boundingSphere.clone().applyMatrix4(pointcloud.matrixWorld);

			scope.referenceFrame.updateMatrixWorld(true);

			if(sg.radius > 50*1000){
				scope.camera.near = 10;
			}else if(sg.radius > 10*1000){
				scope.camera.near = 2;
			}else if(sg.radius > 1000){
				scope.camera.near = 1;
			}else if(sg.radius > 100){
				scope.camera.near = 0.5;
			}else{
				scope.camera.near = 0.1;
			}

			if(scope.pointclouds.length === 1){
				scope.referenceFrame.position.sub(sg.center);
				scope.referenceFrame.updateMatrixWorld(true);
				var moveSpeed = sg.radius / 6;
				scope.setMoveSpeed(moveSpeed);
			}

			//scope.flipYZ();

			scope.zoomTo(pointcloud, 1);


			var hr = scope.getHeightRange();
			if(hr.min === null || hr.max === null){
				var bbWorld = scope.getBoundingBox();

				scope.setHeightRange(bbWorld.min.y, bbWorld.max.y);
			}

			scope.earthControls.pointclouds.push(pointcloud);


			if(scope.pointclouds.length === 1){
				scope.setNavigationMode("Orbit");
				scope.flipYZ();
				scope.zoomTo(pointcloud, 1);
			}



			scope.dispatchEvent({"type": "pointcloud_loaded", "pointcloud": pointcloud});

			callback({type: "pointclouad_loaded", pointcloud: pointcloud});
		};
		this.addEventListener("pointcloud_loaded", pointCloudLoadedCallback);

		// load pointcloud
		if(!path){

		}else if(path.indexOf("greyhound://") === 0){
			// We check if the path string starts with 'greyhound:', if so we assume it's a greyhound server URL.
			Potree.GreyhoundLoader.load(path, function(geometry) {
				if(!geometry){
					callback({type: "loading_failed"});
				}else{
					pointcloud = new Potree.PointCloudOctree(geometry);
					initPointcloud(pointcloud);
				}
			});
		}else if(path.indexOf("cloud.js") > 0){
			Potree.POCLoader.load(path, function(geometry){
				if(!geometry){
					callback({type: "loading_failed"});
				}else{
					pointcloud = new Potree.PointCloudOctree(geometry);
					initPointcloud(pointcloud);
				}
			});
		}else if(path.indexOf(".vpc") > 0){
			Potree.PointCloudArena4DGeometry.load(path, function(geometry){
				if(!geometry){
					callback({type: "loading_failed"});
				}else{
					pointcloud = new Potree.PointCloudArena4D(geometry);
					initPointcloud(pointcloud);
				}
			});
		}else{
			callback({"type": "loading_failed"});
		}
	};

	this.toLocal = (function(viewer){
		return function(position){
			var scenePos = position.clone().applyMatrix4(viewer.referenceFrame.matrixWorld);

			return scenePos;
		}
	})(this);


	this.toGeo = (function(viewer){
		return function(position){
			var inverse = new THREE.Matrix4().getInverse(viewer.referenceFrame.matrixWorld);
			var geoPos = position.clone().applyMatrix4(inverse);

			return geoPos;
		}
	})(this);

	this.getMinNodeSize = function(){
		return scope.minNodeSize;
	};

	this.setMinNodeSize = function(value){
		if(scope.minNodeSize !== value){
			scope.minNodeSize = value;
			scope.dispatchEvent({"type": "minnodesize_changed", "viewer": scope});
		}
	};

	this.setDescription = function(value){
		$('#potree_description')[0].innerHTML = value;
	};

	this.setNavigationMode = function(value){
		if(value === "Orbit"){
			scope.useOrbitControls();
		}else if(value === "Flight"){
			scope.useFPSControls();
		}else if(value === "Earth"){
			scope.useEarthControls();
		}

	};

	this.setShowBoundingBox = function(value){
		if(scope.showBoundingBox !== value){
			scope.showBoundingBox = value;
			scope.dispatchEvent({"type": "show_boundingbox_changed", "viewer": scope});
		}
	};

	this.getShowBoundingBox = function(){
		return scope.showBoundingBox;
	};

	this.setMoveSpeed = function(value){
		if(scope.moveSpeed !== value){
			scope.moveSpeed = value;
			scope.fpControls.setMoveSpeed(value);
			scope.geoControls.setMoveSpeed(value);
			scope.dispatchEvent({"type": "move_speed_changed", "viewer": scope, "speed": value});
		}
	};

	this.getMoveSpeed = function(){
		return scope.fpControls.moveSpeed;
	};

	this.setShowSkybox = function(value){
		if(scope.showSkybox !== value){
			scope.showSkybox = value;
			scope.dispatchEvent({"type": "show_skybox_changed", "viewer": scope});
		}
	};

	this.getShowSkybox = function(){
		return scope.showSkybox;
	};

	this.setHeightRange = function(min, max){
		if(scope.heightMin !== min || scope.heightMax !== max){
			scope.heightMin = min || scope.heightMin;
			scope.heightMax = max || scope.heightMax;
			scope.dispatchEvent({"type": "height_range_changed", "viewer": scope});
		}
	};

	this.getHeightRange = function(){
		return {min: scope.heightMin, max: scope.heightMax};
	};

	this.setIntensityMax = function(max){
		if(scope.intensityMax !== max){
			scope.intensityMax = max;
			scope.dispatchEvent({"type": "intensity_max_changed", "viewer": scope});
		}
	};

	this.getIntensityMax = function(){
		return scope.intensityMax;
	};

	this.setFreeze = function(value){
		if(scope.freeze != value){
			scope.freeze = value;
			scope.dispatchEvent({"type": "freeze_changed", "viewer": scope});
		}
	};

	this.getFreeze = function(){
		return scope.freeze;
	};

	this.setPointBudget = function(value){
		if(Potree.pointBudget != value){
			Potree.pointBudget = parseInt(value);
			scope.dispatchEvent({"type": "point_budget_changed", "viewer": scope});
		}
	};

	this.getPointBudget = function(){
		return Potree.pointBudget;
	};

	this.setClipMode = function(clipMode){
		if(scope.clipMode != clipMode){
			scope.clipMode = clipMode;
			scope.dispatchEvent({"type": "clip_mode_changed", "viewer": scope});
		}
	};

	this.getClipMode = function(){
		return scope.clipMode;
	};

	this.setDEMCollisionsEnabled = function(value){
		if(scope.useDEMCollisions !== value){
			scope.useDEMCollisions = value;
			scope.dispatchEvent({"type": "use_demcollisions_changed", "viewer": scope});
		};
	};

	this.getDEMCollisionsEnabled = function(){
		return scope.useDEMCollisions;
	};

	this.setEDLEnabled = function(value){
		if(scope.useEDL != value){
			scope.useEDL = value;
			scope.dispatchEvent({"type": "use_edl_changed", "viewer": scope});
		}
	};

	this.getEDLEnabled = function(){
		return scope.useEDL;
	};

	this.setEDLRadius = function(value){
		if(scope.edlRadius !== value){
			scope.edlRadius = value;
			scope.dispatchEvent({"type": "edl_radius_changed", "viewer": scope});
		}
	};

	this.getEDLRadius = function(){
		return scope.edlRadius;
	};

	this.setEDLStrength = function(value){
		if(scope.edlScale !== value){
			scope.edlScale = value;
			scope.dispatchEvent({"type": "edl_strength_changed", "viewer": scope});
		}
	};

	this.getEDLStrength = function(){
		return scope.edlScale;
	};

	this.setPointSize = function(value){
		if(scope.pointSize !== value){
			scope.pointSize = value;
			scope.dispatchEvent({"type": "point_size_changed", "viewer": scope});
		}
	};

	this.getPointSize = function(){
		return scope.pointSize;
	};

	this.setMinPointSize = function(value){
		if(scope.minPointSize !== value){
			scope.minPointSize = value;
			scope.dispatchEvent({"type": "min_point_size_changed", "viewer": scope});
		}
	}

	this.getMinPointSize = function(){
		return scope.minPointSize;
	}

	this.setMaxPointSize = function(value){
		if(scope.maxPointSize !== value){
			scope.maxPointSize = value;
			scope.dispatchEvent({"type": "max_point_size_changed", "viewer": scope});
		}
	}

	this.getMaxPointSize = function(){
		return scope.maxPointSize;
	}

	this.setFOV = function(value){
		if(scope.fov !== value){
			scope.fov = value;
			scope.dispatchEvent({"type": "fov_changed", "viewer": scope});
		}
	};

	this.getFOV = function(){
		return scope.fov;
	};

	this.setOpacity = function(value){
		if(scope.opacity !== value){
			scope.opacity = value;
			scope.dispatchEvent({"type": "opacity_changed", "viewer": scope});
		}
	};

	this.getOpacity = function(){
		return scope.opacity;
	};

	this.setPointSizing = function(value){
		if(scope.sizeType !== value){
			scope.sizeType = value;
			if(value === "Fixed"){
				scope.pointSizeType = Potree.PointSizeType.FIXED;
			}else if(value === "Attenuated"){
				scope.pointSizeType = Potree.PointSizeType.ATTENUATED;
			}else if(value === "Adaptive"){
				scope.pointSizeType = Potree.PointSizeType.ADAPTIVE;
			}

			scope.dispatchEvent({"type": "point_sizing_changed", "viewer": scope});
		}
	};

	this.getPointSizing = function(){
		return scope.sizeType;
	};

	this.setQuality = function(value){
		var oldQuality = scope.quality;
		if(value == "Interpolation" && !Potree.Features.SHADER_INTERPOLATION.isSupported()){
			scope.quality = "Squares";
		}else if(value == "Splats" && !Potree.Features.SHADER_SPLATS.isSupported()){
			scope.quality = "Squares";
		}else{
			scope.quality = value;
		}

		if(oldQuality !== scope.quality){
			scope.dispatchEvent({"type": "quality_changed", "viewer": scope});
		}
	};

	this.getQuality = function(){
		return scope.quality;
	};

	this.disableAnnotations = function(){
		for(var i = 0; i < scope.annotations.length; i++){
			var annotation = scope.annotations[i];
			annotation.domElement.style.pointerEvents = "none";
		};
	};

	this.enableAnnotations = function(){
		for(var i = 0; i < scope.annotations.length; i++){
			var annotation = scope.annotations[i];
			annotation.domElement.style.pointerEvents = "auto";
		};
	};

	this.setClassificationVisibility = function(key, value){
		var changed = false;
		for(var i = 0; i < scope.pointclouds.length; i++){
			var pointcloud = scope.pointclouds[i];
			var newClass = pointcloud.material.classification;
			var oldValue = newClass[key].w;
			newClass[key].w = value ? 1 : 0;

			if(oldValue !== newClass[key].w){
				changed = true;
			}

			pointcloud.material.classification = newClass;
		}

		if(changed){
			scope.dispatchEvent({"type": "classification_visibility_changed", "viewer": scope});
		}
	};

	this.setMaterial = function(value){
		if(scope.pointColorType !== scope.toMaterialID(value)){
			scope.pointColorType = scope.toMaterialID(value);

			scope.dispatchEvent({"type": "material_changed", "viewer": scope});
		}
	};

	this.setMaterialID = function(value){
		if(scope.pointColorType !== value){
			scope.pointColorType = value;

			scope.dispatchEvent({"type": "material_changed", "viewer": scope});
		}
	}

	this.getMaterial = function(){
		return scope.pointColorType;
	};

	this.getMaterialName = function(){
		return scope.toMaterialName(scope.pointColorType);
	};

	this.toMaterialID = function(materialName){
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
		}
	};

	this.toMaterialName = function(materialID){
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
		}
	};

	this.zoomTo = function(node, factor){
		scope.camera.zoomTo(node, factor);

		var bs;
		if(node.boundingSphere){
			bs = node.boundingSphere;
		}else if(node.geometry && node.geometry.boundingSphere){
			bs = node.geometry.boundingSphere;
		}else{
			bs = node.boundingBox.getBoundingSphere();
		}

		bs = bs.clone().applyMatrix4(node.matrixWorld);

		scope.orbitControls.target.copy(bs.center);

		scope.dispatchEvent({"type": "zoom_to", "viewer": scope});
	};

	this.showAbout = function(){
		$(function() {
			$( "#about-panel" ).dialog();
		});
	};

	this.getBoundingBox = function(pointclouds){
		pointclouds = pointclouds || scope.pointclouds;

		var box = new THREE.Box3();

		scope.scenePointCloud.updateMatrixWorld(true);
		scope.referenceFrame.updateMatrixWorld(true);

		for(var i = 0; i < scope.pointclouds.length; i++){
			var pointcloud = scope.pointclouds[i];

			pointcloud.updateMatrixWorld(true);

			//var boxWorld = pointcloud.boundingBox.clone().applyMatrix4(pointcloud.matrixWorld);
			var boxWorld = Potree.utils.computeTransformedBoundingBox(pointcloud.boundingBox, pointcloud.matrixWorld)
			box.union(boxWorld);
		}

		return box;
	};

	this.getBoundingBoxGeo = function(pointclouds){
		pointclouds = pointclouds || scope.pointclouds;

		var box = new THREE.Box3();

		scope.scenePointCloud.updateMatrixWorld(true);
		scope.referenceFrame.updateMatrixWorld(true);

		for(var i = 0; i < scope.pointclouds.length; i++){
			var pointcloud = scope.pointclouds[i];

			pointcloud.updateMatrixWorld(true);

			var boxWorld = Potree.utils.computeTransformedBoundingBox(pointcloud.boundingBox, pointcloud.matrix)
			box.union(boxWorld);
		}

		return box;
	};

	this.fitToScreen = function(){
		var box = this.getBoundingBox(scope.pointclouds);

		if(scope.transformationTool.targets.length > 0){
			box = scope.transformationTool.getBoundingBox();
		}

		var node = new THREE.Object3D();
		node.boundingBox = box;

		//scope.camera.zoomTo(node, 1);
		scope.zoomTo(node, 1);
	};

	this.setTopView = function(){
		var box = this.getBoundingBox(scope.pointclouds);

		if(scope.transformationTool.targets.length > 0){
			box = scope.transformationTool.getBoundingBox();
		}

		var node = new THREE.Object3D();
		node.boundingBox = box;

		scope.camera.position.set(0, 1, 0);
		scope.camera.rotation.set(-Math.PI / 2, 0, 0);
		scope.camera.zoomTo(node, 1);
	};

	this.setFrontView = function(){
		var box = this.getBoundingBox(scope.pointclouds);

		if(scope.transformationTool.targets.length > 0){
			box = scope.transformationTool.getBoundingBox();
		}

		var node = new THREE.Object3D();
		node.boundingBox = box;

		scope.camera.position.set(0, 0, 1);
		scope.camera.rotation.set(0, 0, 0);
		scope.camera.zoomTo(node, 1);
	};

	this.setLeftView = function(){
		var box = this.getBoundingBox(scope.pointclouds);

		if(scope.transformationTool.targets.length > 0){
			box = scope.transformationTool.getBoundingBox();
		}

		var node = new THREE.Object3D();
		node.boundingBox = box;

		scope.camera.position.set(-1, 0, 0);
		scope.camera.rotation.set(0, -Math.PI / 2, 0);
		scope.camera.zoomTo(node, 1);
	};

	this.setRightView = function(){
		var box = this.getBoundingBox(scope.pointclouds);

		if(scope.transformationTool.targets.length > 0){
			box = scope.transformationTool.getBoundingBox();
		}

		var node = new THREE.Object3D();
		node.boundingBox = box;

		scope.camera.position.set(1, 0, 0);
		scope.camera.rotation.set(0, Math.PI / 2, 0);
		scope.camera.zoomTo(node, 1);
	};

	this.flipYZ = function(){
		scope.isFlipYZ = !scope.isFlipYZ;

		scope.referenceFrame.matrix.copy(new THREE.Matrix4());
		if(scope.isFlipYZ){
			scope.referenceFrame.applyMatrix(new THREE.Matrix4().set(
				1,0,0,0,
				0,0,1,0,
				0,-1,0,0,
				0,0,0,1
			));

		}else{
			scope.referenceFrame.applyMatrix(new THREE.Matrix4().set(
				1,0,0,0,
				0,1,0,0,
				0,0,1,0,
				0,0,0,1
			));
		}

		scope.referenceFrame.updateMatrixWorld(true);
		var box = scope.getBoundingBox();
		scope.referenceFrame.position.copy(box.center()).multiplyScalar(-1);
		scope.referenceFrame.position.y = -box.min.y;
		scope.referenceFrame.updateMatrixWorld(true);

		scope.updateHeightRange();


		//scope.referenceFrame.updateMatrixWorld(true);
		//scope.pointclouds[0].updateMatrixWorld();
		//var sg = scope.pointclouds[0].boundingSphere.clone().applyMatrix4(scope.pointclouds[0].matrixWorld);
		//scope.referenceFrame.position.copy(sg.center).multiplyScalar(-1);
		//scope.referenceFrame.updateMatrixWorld(true);
		//scope.referenceFrame.position.y -= scope.pointclouds[0].getWorldPosition().y;
		//scope.referenceFrame.updateMatrixWorld(true);
	}

	this.updateHeightRange = function(){
		var bbWorld = scope.getBoundingBox();
		scope.setHeightRange(bbWorld.min.y, bbWorld.max.y);
	};

	this.useEarthControls = function(){
		if(scope.controls){
			scope.controls.enabled = false;
		}

		scope.controls = scope.earthControls;
		scope.controls.enabled = true;
	}

	this.useGeoControls = function(){
		if(scope.controls){
			scope.controls.enabled = false;
		}

		scope.controls = scope.geoControls;
		scope.controls.enabled = true;

		//scope.controls.moveSpeed = scope.pointclouds[0].boundingSphere.radius / 6;
	}

	this.useFPSControls = function(){
		if(scope.controls){
			scope.controls.enabled = false;
		}

		scope.controls = scope.fpControls;
		scope.controls.enabled = true;

		//scope.controls.moveSpeed = scope.pointclouds[0].boundingSphere.radius / 6;
	}

	this.useOrbitControls = function(){
		if(scope.controls){
			scope.controls.enabled = false;
		}

		scope.controls = scope.orbitControls;
		scope.controls.enabled = true;

		if(scope.pointclouds.length > 0){
			scope.controls.target.copy(scope.pointclouds[0].boundingSphere.center.clone().applyMatrix4(scope.pointclouds[0].matrixWorld));
		}
	};

	this.addAnnotation = function(position, args){
		var cameraPosition = args.cameraPosition;
		var cameraTarget = args.cameraTarget || position;
		var description = args.description || null;
		var title = args.title || null;

		var annotation = new Potree.Annotation(scope, {
			"position": position,
			"cameraPosition": cameraPosition,
			"cameraTarget": cameraTarget,
			"title": title,
			"description": description
		});

		scope.annotations.push(annotation);
		scope.renderArea.appendChild(annotation.domElement);

		scope.dispatchEvent({"type": "annotation_added", "viewer": scope});

		return annotation;
	}

	this.getAnnotations = function(){
		return scope.annotations;
	};

	this.loadSettingsFromURL = function(){
		if(Potree.utils.getParameterByName("pointSize")){
			scope.setPointSize(parseFloat(Potree.utils.getParameterByName("pointSize")));
		}

		if(Potree.utils.getParameterByName("FOV")){
			scope.setFOV(parseFloat(Potree.utils.getParameterByName("FOV")));
		}

		if(Potree.utils.getParameterByName("opacity")){
			scope.setOpacity(parseFloat(Potree.utils.getParameterByName("opacity")));
		}

		if(Potree.utils.getParameterByName("edlEnabled")){
			var enabled = Potree.utils.getParameterByName("edlEnabled") === "true";
			scope.setEDLEnabled(enabled);
		}

		if(Potree.utils.getParameterByName("edlRadius")){
			scope.setEDLRadius(parseFloat(Potree.utils.getParameterByName("edlRadius")));
		}

		if(Potree.utils.getParameterByName("edlStrength")){
			scope.setEDLStrength(parseFloat(Potree.utils.getParameterByName("edlStrength")));
		}

		if(Potree.utils.getParameterByName("clipMode")){
			var clipMode = Potree.utils.getParameterByName("clipMode");
			if(clipMode === "HIGHLIGHT_INSIDE"){
				scope.setClipMode(Potree.ClipMode.HIGHLIGHT_INSIDE);
			}else if(clipMode === "CLIP_OUTSIDE"){
				scope.setClipMode(Potree.ClipMode.CLIP_OUTSIDE);
			}else if(clipMode === "DISABLED"){
				scope.setClipMode(Potree.ClipMode.DISABLED);
			}
		}

		if(Potree.utils.getParameterByName("pointBudget")){
			scope.setPointBudget(parseFloat(Potree.utils.getParameterByName("pointBudget")));
		}

		if(Potree.utils.getParameterByName("showBoundingBox")){
			var enabled = Potree.utils.getParameterByName("showBoundingBox") === "true";
			if(enabled){
				scope.setShowBoundingBox(true);
			}else{
				scope.setShowBoundingBox(false);
			}
		}

		if(Potree.utils.getParameterByName("material")){
			var material = Potree.utils.getParameterByName("material");
			scope.setMaterial(material);
		}

		if(Potree.utils.getParameterByName("pointSizing")){
			var sizing = Potree.utils.getParameterByName("pointSizing");
			scope.setPointSizing(sizing);
		}

		if(Potree.utils.getParameterByName("quality")){
			var quality = Potree.utils.getParameterByName("quality");
			scope.setQuality(quality);
		}
	};











//------------------------------------------------------------------------------------
// Viewer Internals
//------------------------------------------------------------------------------------

	this.toggleSidebar = function(){

		var renderArea = $('#potree_render_area');
		var sidebar = $('#potree_sidebar_container');
		var isVisible = renderArea.css("left") !== "0px";

		if(isVisible){
			renderArea.css("left", "0px");
		}else{
			renderArea.css("left", "300px");
		}
	};

	this.toggleMap = function(){
		var map = $('#potree_map');
		map.toggle(100);

	};

	this.loadGUI = function(){
		var sidebarContainer = $('#potree_sidebar_container');
		sidebarContainer.load(Potree.scriptPath + "/sidebar.html");
		sidebarContainer.css("width", "300px");
		sidebarContainer.css("height", "100%");

		var imgMenuToggle = document.createElement("img");
		imgMenuToggle.src = Potree.resourcePath + "/icons/menu_button.svg";
		imgMenuToggle.onclick = scope.toggleSidebar;
		imgMenuToggle.classList.add("potree_menu_toggle");
		//viewer.renderArea.appendChild(imgMenuToggle);

		var imgMapToggle = document.createElement("img");
		imgMapToggle.src = Potree.resourcePath + "/icons/map_icon.png";
		imgMapToggle.style.display = "none";
		imgMapToggle.onclick = scope.toggleMap;
		imgMapToggle.id = "potree_map_toggle";
		//viewer.renderArea.appendChild(imgMapToggle);

		viewer.renderArea.insertBefore(imgMapToggle, viewer.renderArea.children[0]);
		viewer.renderArea.insertBefore(imgMenuToggle, viewer.renderArea.children[0]);



		//$('head').append( $('<link rel="stylesheet" type="text/css" />').attr('href', '../src/viewer/viewer.css') );
		//$('head').append( $('<link rel="stylesheet" type="text/css" />').attr('href', "../libs/bootstrap/css/bootstrap.min.css"));
		//$('head').append( $('<link rel="stylesheet" type="text/css" />').attr('href', "../libs/jasny-bootstrap/css/jasny-bootstrap.css"));
		//$('head').append( $('<link rel="stylesheet" type="text/css" />').attr('href', "../libs/jasny-bootstrap/css/navmenu-reveal.css" ));
		//$('head').append( $('<link rel="stylesheet" type="text/css" />').attr('href', "../libs/jquery-ui-1.11.4/jquery-ui.css"	));

		//var elProfile = $('<div style="position: absolute; width: 100%; height: 30%; bottom: 0; display: none" >');
		var elProfile = $('<div>').load(Potree.scriptPath + "/profile.html", function(){
			$('#potree_render_area').append(elProfile.children());
			scope._2dprofile = new Potree.Viewer.Profile(scope, document.getElementById("profile_draw_container"));
		});

	}

	this.createControls = function(){

		var demCollisionHandler =  function(event){

			if(!scope.useDEMCollisions){
				return
			}

			var demHeight = null;

			for(var i = 0; i < scope.pointclouds.length; i++){
				var pointcloud = scope.pointclouds[i];
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
			scope.fpControls = new THREE.FirstPersonControls(scope.camera, scope.renderer.domElement);
			scope.fpControls.enabled = false;
			scope.fpControls.addEventListener("start", scope.disableAnnotations);
			scope.fpControls.addEventListener("end", scope.enableAnnotations);
			scope.fpControls.addEventListener("proposeTransform", demCollisionHandler);
			scope.fpControls.addEventListener("move_speed_changed", function(event){
				scope.setMoveSpeed(scope.fpControls.moveSpeed);
			});
		}

		{ // create GEO CONTROLS
			scope.geoControls = new Potree.GeoControls(scope.camera, scope.renderer.domElement);
			scope.geoControls.enabled = false;
			scope.geoControls.addEventListener("start", scope.disableAnnotations);
			scope.geoControls.addEventListener("end", scope.enableAnnotations);
			scope.geoControls.addEventListener("proposeTransform", demCollisionHandler);
			scope.geoControls.addEventListener("move_speed_changed", function(event){
				scope.setMoveSpeed(scope.geoControls.moveSpeed);
			});
		}

		{ // create ORBIT CONTROLS
			scope.orbitControls = new Potree.OrbitControls(scope.camera, scope.renderer.domElement);
			scope.orbitControls.enabled = false;
			scope.orbitControls.addEventListener("start", scope.disableAnnotations);
			scope.orbitControls.addEventListener("end", scope.enableAnnotations);
			scope.orbitControls.addEventListener("proposeTransform", demCollisionHandler);
			scope.renderArea.addEventListener("dblclick", function(event){
				if(scope.pointclouds.length === 0){
					return;
				}

				event.preventDefault();

				var rect = scope.renderArea.getBoundingClientRect();

				var mouse =  {
					x: ( (event.clientX - rect.left) / scope.renderArea.clientWidth ) * 2 - 1,
					y: - ( (event.clientY - rect.top) / scope.renderArea.clientHeight ) * 2 + 1
				};

				var pointcloud = null;
				var distance = Number.POSITIVE_INFINITY;
				var I = null;

				for(var i = 0; i < scope.pointclouds.length; i++){
					intersection = getMousePointCloudIntersection(mouse, scope.camera, scope.renderer, [scope.pointclouds[i]]);
					if(!intersection){
						continue;
					}

					var tDist = scope.camera.position.distanceTo(intersection);
					if(tDist < distance){
						pointcloud = scope.pointclouds[i];
						distance = tDist;
						I = intersection;
					}
				}

				if(I != null){

					var targetRadius = 0;
					if(!scope.jumpDistance){
						var camTargetDistance = scope.camera.position.distanceTo(scope.orbitControls.target);

						var vector = new THREE.Vector3( mouse.x, mouse.y, 0.5 );
						vector.unproject(scope.camera);

						var direction = vector.sub(scope.camera.position).normalize();
						var ray = new THREE.Ray(scope.camera.position, direction);

						var nodes = pointcloud.nodesOnRay(pointcloud.visibleNodes, ray);
						var lastNode = nodes[nodes.length - 1];
						var radius = lastNode.getBoundingSphere().radius;
						var targetRadius = Math.min(camTargetDistance, radius);
						var targetRadius = Math.max(scope.minimumJumpDistance, targetRadius);
					}else{
						targetRadius = scope.jumpDistance;
					}

					var d = scope.camera.getWorldDirection().multiplyScalar(-1);
					var cameraTargetPosition = new THREE.Vector3().addVectors(I, d.multiplyScalar(targetRadius));
					var controlsTargetPosition = I;

					var animationDuration = 600;

					var easing = TWEEN.Easing.Quartic.Out;

					scope.controls.enabled = false;

					// animate position
					var tween = new TWEEN.Tween(scope.camera.position).to(cameraTargetPosition, animationDuration);
					tween.easing(easing);
					tween.start();

					// animate target
					var tween = new TWEEN.Tween(scope.orbitControls.target).to(I, animationDuration);
					tween.easing(easing);
					tween.onComplete(function(){
						scope.controls.enabled = true;
						scope.fpControls.moveSpeed = radius / 2;
						scope.geoControls.moveSpeed = radius / 2;
					});
					tween.start();
				}
			});
		}

		{ // create EARTH CONTROLS
			scope.earthControls = new THREE.EarthControls(scope.camera, scope.renderer, scope.scenePointCloud);
			scope.earthControls.enabled = false;
			scope.earthControls.addEventListener("start", scope.disableAnnotations);
			scope.earthControls.addEventListener("end", scope.enableAnnotations);
			scope.earthControls.addEventListener("proposeTransform", demCollisionHandler);
		}
	};


	this.initThree = function(){
		var width = scope.renderArea.clientWidth;
		var height = scope.renderArea.clientHeight;
		var aspect = width / height;
		var near = 0.1;
		var far = 1000*1000;

		scope.scene = new THREE.Scene();
		scope.scenePointCloud = new THREE.Scene();
		scope.sceneBG = new THREE.Scene();

		scope.camera = new THREE.PerspectiveCamera(scope.fov, aspect, near, far);
		//camera = new THREE.OrthographicCamera(-50, 50, 50, -50, 1, 100000);
		scope.cameraBG = new THREE.Camera();
		scope.camera.rotation.order = 'ZYX';

		scope.referenceFrame = new THREE.Object3D();
		scope.scenePointCloud.add(scope.referenceFrame);

		scope.renderer = new THREE.WebGLRenderer();
		scope.renderer.setSize(width, height);
		scope.renderer.autoClear = false;
		scope.renderArea.appendChild(scope.renderer.domElement);
		scope.renderer.domElement.tabIndex = "2222";
		scope.renderer.domElement.addEventListener("mousedown", function(){scope.renderer.domElement.focus();});

		skybox = Potree.utils.loadSkybox(Potree.resourcePath + "/textures/skybox/");

		// camera and controls
		scope.camera.position.set(-304, 372, 318);
		scope.camera.rotation.y = -Math.PI / 4;
		scope.camera.rotation.x = -Math.PI / 6;

		this.createControls();

		//scope.useEarthControls();

		// enable frag_depth extension for the interpolation shader, if available
		scope.renderer.context.getExtension("EXT_frag_depth");

		//this.addPointCloud(pointcloudPath);

		var grid = Potree.utils.createGrid(5, 5, 2);
		scope.scene.add(grid);

		scope.measuringTool = new Potree.MeasuringTool(scope.scenePointCloud, scope.camera, scope.renderer, scope.toGeo);
		scope.profileTool = new Potree.ProfileTool(scope.scenePointCloud, scope.camera, scope.renderer);
		scope.transformationTool = new Potree.TransformationTool(scope.scenePointCloud, scope.camera, scope.renderer);
		scope.volumeTool = new Potree.VolumeTool(scope.scenePointCloud, scope.camera, scope.renderer, scope.transformationTool);

		scope.profileTool.addEventListener("profile_added", function(profileEvent){

			//var poSelect = document.getElementById("profile_selection");
			//var po = document.createElement("option");
			//po.innerHTML = "profile " + scope.profileTool.profiles.length;
			//poSelect.appendChild(po);


			var profileButton = document.createElement("button");
			profileButton.type = "button";
			profileButton.classList.add("btn");
			profileButton.classList.add("btn-primary");
			profileButton.id = "btn_rofile_" + scope.profileTool.profiles.length;
			//profileButton.style.width = "100%";
			profileButton.value = "profile " + scope.profileTool.profiles.length;
			profileButton.innerHTML = "profile " + scope.profileTool.profiles.length;

			//type="button" class="btn btn-primary"

			profileButton.onclick = function(clickEvent){
				scope.profileTool.draw(
					profileEvent.profile,
					$("#profile_draw_container")[0],
					scope.toGeo);
				profileEvent.profile.addEventListener("marker_moved", function(){
					scope.profileTool.draw(
					profileEvent.profile,
					$("#profile_draw_container")[0],
					scope.toGeo);
				});
				profileEvent.profile.addEventListener("width_changed", function(){
					scope.profileTool.draw(
					profileEvent.profile,
					$("#profile_draw_container")[0],
					scope.toGeo);
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
		scope.sceneBG.add(bg);

		window.addEventListener( 'keydown', onKeyDown, false );

		scope.directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
		scope.directionalLight.position.set( 10, 10, 10 );
		scope.directionalLight.lookAt( new THREE.Vector3(0, 0, 0));
		scope.scenePointCloud.add( scope.directionalLight );

		var light = new THREE.AmbientLight( 0x555555 ); // soft white light
		scope.scenePointCloud.add( light );

	}

	function onKeyDown(event){
		//console.log(event.keyCode);

		if(event.keyCode === 69){
			// e pressed

			scope.transformationTool.translate();
		}else if(event.keyCode === 82){
			// r pressed

			scope.transformationTool.scale();
		}else if(event.keyCode === 84){
			// r pressed

			scope.transformationTool.rotate();
		}
	};

	this.update = function(delta, timestamp){
		Potree.pointLoadLimit = Potree.pointBudget * 2;

		scope.directionalLight.position.copy(scope.camera.position);
		scope.directionalLight.lookAt(new THREE.Vector3().addVectors(scope.camera.position, scope.camera.getWorldDirection()));

		var visibleNodes = 0;
		var visiblePoints = 0;
		var progress = 0;

		for(var i = 0; i < scope.pointclouds.length; i++){
			var pointcloud = scope.pointclouds[i];
			var bbWorld = Potree.utils.computeTransformedBoundingBox(pointcloud.boundingBox, pointcloud.matrixWorld);

			if(!scope.intensityMax){
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
							scope.intensityMax = 1;
						}else if(cap <= 256){
							scope.intensityMax = 255;
						}else{
							scope.intensityMax = cap;
						}
					}
				}
			}

			//if(scope.heightMin === null){
			//	scope.setHeightRange(bbWorld.min.y, bbWorld.max.y);
			//}

			pointcloud.material.clipMode = scope.clipMode;
			pointcloud.material.heightMin = scope.heightMin;
			pointcloud.material.heightMax = scope.heightMax;
			pointcloud.material.intensityMin = 0;
			pointcloud.material.intensityMax = scope.intensityMax;
			pointcloud.showBoundingBox = scope.showBoundingBox;
			pointcloud.generateDEM = scope.useDEMCollisions;
			pointcloud.minimumNodePixelSize = scope.minNodeSize;

			//if(!scope.freeze){
			//	pointcloud.update(scope.camera, scope.renderer);
			//}

			visibleNodes += pointcloud.numVisibleNodes;
			visiblePoints += pointcloud.numVisiblePoints;

			progress += pointcloud.progress;
		}

		if(!scope.freeze){
			var result = Potree.updatePointClouds(scope.pointclouds, scope.camera, scope.renderer);
			visibleNodes = result.visibleNodes.length;
			visiblePoints = result.numVisiblePoints;
		}


		//if(stats && scope.showStats){
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

		scope.camera.fov = scope.fov;

		if(scope.controls){
			scope.controls.update(delta);
		}

		// update progress bar
		if(scope.pointclouds.length > 0){
			scope.progressBar.progress = progress / scope.pointclouds.length;

			var message;
			if(progress === 0){
				message = "loading";
			}else{
				message = "loading: " + parseInt(progress*100 / scope.pointclouds.length) + "%";
			}
			scope.progressBar.message = message;

			if(progress >= 0.999){
				scope.progressBar.hide();
			}else if(progress < 1){
				scope.progressBar.show();
			}
		}

		scope.volumeTool.update();
		scope.transformationTool.update();
		scope.profileTool.update();


		var clipBoxes = [];

		for(var i = 0; i < scope.profileTool.profiles.length; i++){
			var profile = scope.profileTool.profiles[i];

			for(var j = 0; j < profile.boxes.length; j++){
				var box = profile.boxes[j];
				box.updateMatrixWorld();
				var boxInverse = new THREE.Matrix4().getInverse(box.matrixWorld);
				var boxPosition = box.getWorldPosition();
				clipBoxes.push({inverse: boxInverse, position: boxPosition});
			}
		}

		for(var i = 0; i < scope.volumeTool.volumes.length; i++){
			var volume = scope.volumeTool.volumes[i];

			if(volume.clip){
				volume.updateMatrixWorld();
				var boxInverse = new THREE.Matrix4().getInverse(volume.matrixWorld);
				var boxPosition = volume.getWorldPosition();
				//clipBoxes.push(boxInverse);
				clipBoxes.push({inverse: boxInverse, position: boxPosition});
			}
		}


		for(var i = 0; i < scope.pointclouds.length; i++){
			scope.pointclouds[i].material.setClipBoxes(clipBoxes);
		}

		{// update annotations
			var distances = [];
			for(var i = 0; i < scope.annotations.length; i++){
				var ann = scope.annotations[i];
				var screenPos = ann.position.clone().project(scope.camera);

				screenPos.x = scope.renderArea.clientWidth * (screenPos.x + 1) / 2;
				screenPos.y = scope.renderArea.clientHeight * (1 - (screenPos.y + 1) / 2);

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

		if(scope.showDebugInfos){
			scope.infos.set("camera.position", "camera.position: " +
				scope.camera.position.x.toFixed(2)
				+ ", " + scope.camera.position.y.toFixed(2)
				+ ", " + scope.camera.position.z.toFixed(2)
			);
		}

		if(scope.mapView){
			scope.mapView.update(delta, scope.camera);
		}

		TWEEN.update(timestamp);

		scope.dispatchEvent({"type": "update", "delta": delta, "timestamp": timestamp});
	}




















//------------------------------------------------------------------------------------
// Renderers
//------------------------------------------------------------------------------------

	var PotreeRenderer = function(){

		this.render = function(){
			{// resize
				var width = scope.renderArea.clientWidth;
				var height = scope.renderArea.clientHeight;
				var aspect = width / height;

				scope.camera.aspect = aspect;
				scope.camera.updateProjectionMatrix();

				scope.renderer.setSize(width, height);
			}


			// render skybox
			if(scope.showSkybox){
				skybox.camera.rotation.copy(scope.camera.rotation);
				scope.renderer.render(skybox.scene, skybox.camera);
			}else{
				scope.renderer.render(scope.sceneBG, scope.cameraBG);
			}

			for(var i = 0; i < scope.pointclouds.length; i++){
				var pointcloud = scope.pointclouds[i];
				if(pointcloud.originalMaterial){
					pointcloud.material = pointcloud.originalMaterial;
				}

				var bbWorld = Potree.utils.computeTransformedBoundingBox(pointcloud.boundingBox, pointcloud.matrixWorld);

				pointcloud.material.size = scope.pointSize;
				pointcloud.material.minSize = scope.minPointSize;
				pointcloud.material.maxSize = scope.maxPointSize;
				pointcloud.material.opacity = scope.opacity;
				pointcloud.material.pointColorType = scope.pointColorType;
				pointcloud.material.pointSizeType = scope.pointSizeType;
				pointcloud.material.pointShape = (scope.quality === "Circles") ? Potree.PointShape.CIRCLE : Potree.PointShape.SQUARE;
				pointcloud.material.interpolate = (scope.quality === "Interpolation");
				pointcloud.material.weighted = false;
			}

			// render scene
			scope.renderer.render(scope.scene, scope.camera);
			scope.renderer.render(scope.scenePointCloud, scope.camera);

			scope.profileTool.render();
			scope.volumeTool.render();

			scope.renderer.clearDepth();
			scope.measuringTool.render();
			scope.transformationTool.render();
		};
	};
	var potreeRenderer = new PotreeRenderer();

	// high quality rendering using splats
	var highQualityRenderer = null;
	var HighQualityRenderer = function(){

		var depthMaterial = null;
		var attributeMaterial = null;
		var normalizationMaterial = null;

		var rtDepth;
		var rtNormalize;

		var initHQSPlats = function(){
			if(depthMaterial != null){
				return;
			}

			depthMaterial = new Potree.PointCloudMaterial();
			attributeMaterial = new Potree.PointCloudMaterial();

			depthMaterial.pointColorType = Potree.PointColorType.DEPTH;
			depthMaterial.pointShape = Potree.PointShape.CIRCLE;
			depthMaterial.interpolate = false;
			depthMaterial.weighted = false;
			depthMaterial.minSize = scope.minPointSize;
			depthMaterial.maxSize = scope.maxPointSize;

			attributeMaterial.pointShape = Potree.PointShape.CIRCLE;
			attributeMaterial.interpolate = false;
			attributeMaterial.weighted = true;
			attributeMaterial.minSize = scope.minPointSize;
			attributeMaterial.maxSize = scope.maxPointSize;

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
		}

		var resize = function(width, height){
			if(rtDepth.width == width && rtDepth.height == height){
				return;
			}

			rtDepth.dispose();
			rtNormalize.dispose();

			scope.camera.aspect = width / height;
			scope.camera.updateProjectionMatrix();

			scope.renderer.setSize(width, height);
			rtDepth.setSize(width, height);
			rtNormalize.setSize(width, height);
		};

		// render with splats
		this.render = function(renderer){

			var width = scope.renderArea.clientWidth;
			var height = scope.renderArea.clientHeight;

			initHQSPlats();

			resize(width, height);


			scope.renderer.clear();
			if(scope.showSkybox){
				skybox.camera.rotation.copy(scope.camera.rotation);
				scope.renderer.render(skybox.scene, skybox.camera);
			}else{
				scope.renderer.render(scope.sceneBG, scope.cameraBG);
			}
			scope.renderer.render(scope.scene, scope.camera);

			for(var i = 0; i < scope.pointclouds.length; i++){
				var pointcloud = scope.pointclouds[i];

				depthMaterial.uniforms.octreeSize.value = pointcloud.pcoGeometry.boundingBox.size().x;
				attributeMaterial.uniforms.octreeSize.value = pointcloud.pcoGeometry.boundingBox.size().x;

				var originalMaterial = pointcloud.material;

				{// DEPTH PASS
					depthMaterial.size = scope.pointSize;
					depthMaterial.pointSizeType = scope.pointSizeType;
					depthMaterial.screenWidth = width;
					depthMaterial.screenHeight = height;
					depthMaterial.uniforms.visibleNodes.value = pointcloud.material.visibleNodesTexture;
					depthMaterial.uniforms.octreeSize.value = pointcloud.pcoGeometry.boundingBox.size().x;
					depthMaterial.fov = scope.camera.fov * (Math.PI / 180);
					depthMaterial.spacing = pointcloud.pcoGeometry.spacing;
					depthMaterial.near = scope.camera.near;
					depthMaterial.far = scope.camera.far;
					depthMaterial.heightMin = scope.heightMin;
					depthMaterial.heightMax = scope.heightMax;
					depthMaterial.uniforms.visibleNodes.value = pointcloud.material.visibleNodesTexture;
					depthMaterial.uniforms.octreeSize.value = pointcloud.pcoGeometry.boundingBox.size().x;
					depthMaterial.bbSize = pointcloud.material.bbSize;
					depthMaterial.treeType = pointcloud.material.treeType;
					depthMaterial.uniforms.classificationLUT.value = pointcloud.material.uniforms.classificationLUT.value;

					scope.scenePointCloud.overrideMaterial = depthMaterial;
					scope.renderer.clearTarget( rtDepth, true, true, true );
					scope.renderer.render(scope.scenePointCloud, scope.camera, rtDepth);
					scope.scenePointCloud.overrideMaterial = null;
				}

				{// ATTRIBUTE PASS
					attributeMaterial.size = scope.pointSize;
					attributeMaterial.pointSizeType = scope.pointSizeType;
					attributeMaterial.screenWidth = width;
					attributeMaterial.screenHeight = height;
					attributeMaterial.pointColorType = scope.pointColorType;
					attributeMaterial.depthMap = rtDepth;
					attributeMaterial.uniforms.visibleNodes.value = pointcloud.material.visibleNodesTexture;
					attributeMaterial.uniforms.octreeSize.value = pointcloud.pcoGeometry.boundingBox.size().x;
					attributeMaterial.fov = scope.camera.fov * (Math.PI / 180);
					attributeMaterial.uniforms.blendHardness.value = pointcloud.material.uniforms.blendHardness.value;
					attributeMaterial.uniforms.blendDepthSupplement.value = pointcloud.material.uniforms.blendDepthSupplement.value;
					attributeMaterial.spacing = pointcloud.pcoGeometry.spacing;
					attributeMaterial.near = scope.camera.near;
					attributeMaterial.far = scope.camera.far;
					attributeMaterial.heightMin = scope.heightMin;
					attributeMaterial.heightMax = scope.heightMax;
					attributeMaterial.intensityMin = pointcloud.material.intensityMin;
					attributeMaterial.intensityMax = pointcloud.material.intensityMax;
					attributeMaterial.setClipBoxes(pointcloud.material.clipBoxes);
					attributeMaterial.clipMode = pointcloud.material.clipMode;
					attributeMaterial.bbSize = pointcloud.material.bbSize;
					attributeMaterial.treeType = pointcloud.material.treeType;
					attributeMaterial.uniforms.classificationLUT.value = pointcloud.material.uniforms.classificationLUT.value;

					scope.scenePointCloud.overrideMaterial = attributeMaterial;
					scope.renderer.clearTarget( rtNormalize, true, true, true );
					scope.renderer.render(scope.scenePointCloud, scope.camera, rtNormalize);
					scope.scenePointCloud.overrideMaterial = null;

					pointcloud.material = originalMaterial;
				}
			}

			if(scope.pointclouds.length > 0){
				{// NORMALIZATION PASS
					normalizationMaterial.uniforms.depthMap.value = rtDepth;
					normalizationMaterial.uniforms.texture.value = rtNormalize;
					Potree.utils.screenPass.render(scope.renderer, normalizationMaterial);
				}

				scope.volumeTool.render();
				scope.renderer.clearDepth();
				scope.profileTool.render();
				scope.measuringTool.render();
				scope.transformationTool.render();
			}

		}
	};



	var edlRenderer = null;
	var EDLRenderer = function(){

		var edlMaterial = null;
		var attributeMaterials = [];

		//var depthTexture = null;

		var rtColor = null;
		var gl = scope.renderer.context;

		var initEDL = function(){
			if(edlMaterial != null){
				return;
			}

			//var depthTextureExt = gl.getExtension("WEBGL_depth_texture");

			edlMaterial = new Potree.EyeDomeLightingMaterial();


			rtColor = new THREE.WebGLRenderTarget( 1024, 1024, {
				minFilter: THREE.LinearFilter,
				magFilter: THREE.NearestFilter,
				format: THREE.RGBAFormat,
				type: THREE.FloatType,
				//type: THREE.UnsignedByteType,
				//depthBuffer: false,
				//stencilBuffer: false
			} );

		};

		var resize = function(){
			var width = scope.renderArea.clientWidth;
			var height = scope.renderArea.clientHeight;
			var aspect = width / height;

			var needsResize = (rtColor.width != width || rtColor.height != height);

			// disposal will be unnecessary once this fix made it into three.js master:
			// https://github.com/mrdoob/three.js/pull/6355
			if(needsResize){
				rtColor.dispose();
			}

			scope.camera.aspect = aspect;
			scope.camera.updateProjectionMatrix();

			scope.renderer.setSize(width, height);
			rtColor.setSize(width, height);
		}

		this.render = function(){

			initEDL();

			resize();

			scope.renderer.clear();
			if(scope.showSkybox){
				skybox.camera.rotation.copy(scope.camera.rotation);
				scope.renderer.render(skybox.scene, skybox.camera);
			}else{
				scope.renderer.render(scope.sceneBG, scope.cameraBG);
			}
			scope.renderer.render(scope.scene, scope.camera);

			var originalMaterials = [];
			for(var i = 0; i < scope.pointclouds.length; i++){
				var pointcloud = scope.pointclouds[i];
				var width = scope.renderArea.clientWidth;
				var height = scope.renderArea.clientHeight;

				if(attributeMaterials.length <= i ){
					var attributeMaterial = new Potree.PointCloudMaterial();

					attributeMaterial.pointShape = Potree.PointShape.CIRCLE;
					attributeMaterial.interpolate = false;
					attributeMaterial.weighted = false;
					attributeMaterial.minSize = scope.minPointSize;
					attributeMaterial.maxSize = scope.maxPointSize;
					attributeMaterial.useLogarithmicDepthBuffer = false;
					attributeMaterial.useEDL = true;
					attributeMaterials.push(attributeMaterial);
				}
				var attributeMaterial = attributeMaterials[i];

				var octreeSize = pointcloud.pcoGeometry.boundingBox.size().x;

				originalMaterials.push(pointcloud.material);

				scope.renderer.clearTarget( rtColor, true, true, true );

				{// COLOR & DEPTH PASS
					attributeMaterial = pointcloud.material;
					attributeMaterial.pointShape = Potree.PointShape.CIRCLE;
					attributeMaterial.interpolate = false;
					attributeMaterial.weighted = false;
					attributeMaterial.minSize = scope.minPointSize;
					attributeMaterial.maxSize = scope.maxPointSize;
					attributeMaterial.useLogarithmicDepthBuffer = false;
					attributeMaterial.useEDL = true;

					attributeMaterial.size = scope.pointSize;
					attributeMaterial.pointSizeType = scope.pointSizeType;
					attributeMaterial.screenWidth = width;
					attributeMaterial.screenHeight = height;
					attributeMaterial.pointColorType = scope.pointColorType;
					attributeMaterial.uniforms.visibleNodes.value = pointcloud.material.visibleNodesTexture;
					attributeMaterial.uniforms.octreeSize.value = octreeSize;
					attributeMaterial.fov = scope.camera.fov * (Math.PI / 180);
					attributeMaterial.spacing = pointcloud.pcoGeometry.spacing;
					attributeMaterial.near = scope.camera.near;
					attributeMaterial.far = scope.camera.far;
					attributeMaterial.heightMin = scope.heightMin;
					attributeMaterial.heightMax = scope.heightMax;
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

			scope.renderer.render(scope.scenePointCloud, scope.camera, rtColor);
			// bit of a hack here. The EDL pass will mess up the text of the volume tool
			// so volume tool is rendered again afterwards
			scope.volumeTool.render(rtColor);

			for(var i = 0; i < scope.pointclouds.length; i++){
				var pointcloud = scope.pointclouds[i];
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

			if(scope.pointclouds.length > 0){
				{ // EDL OCCLUSION PASS
					edlMaterial.uniforms.screenWidth.value = width;
					edlMaterial.uniforms.screenHeight.value = height;
					edlMaterial.uniforms.near.value = scope.camera.near;
					edlMaterial.uniforms.far.value = scope.camera.far;
					edlMaterial.uniforms.colorMap.value = rtColor;
					edlMaterial.uniforms.expScale.value = scope.camera.far;
					edlMaterial.uniforms.edlScale.value = scope.edlScale;
					edlMaterial.uniforms.radius.value = scope.edlRadius;
					edlMaterial.uniforms.opacity.value = scope.opacity;
					edlMaterial.depthTest = true;
					edlMaterial.depthWrite = true;
					edlMaterial.transparent = true;

					Potree.utils.screenPass.render(scope.renderer, edlMaterial);
				}

				scope.renderer.render(scope.scene, scope.camera);

				scope.profileTool.render();
				scope.volumeTool.render();
				scope.renderer.clearDepth();
				scope.measuringTool.render();
				scope.transformationTool.render();
			}


		}
	};

	//var toggleMessage = 0;

	function loop(timestamp) {
		requestAnimationFrame(loop);

		//var start = new Date().getTime();
		scope.update(clock.getDelta(), timestamp);
		//var end = new Date().getTime();
		//var duration = end - start;
		//toggleMessage++;
		//if(toggleMessage > 30){
		//	document.getElementById("lblMessage").innerHTML = "update: " + duration + "ms";
		//	toggleMessage = 0;
		//}

		if(scope.useEDL && Potree.Features.SHADER_EDL.isSupported()){
			if(!edlRenderer){
				edlRenderer = new EDLRenderer();
			}
			edlRenderer.render(scope.renderer);
		}else if(scope.quality === "Splats"){
			if(!highQualityRenderer){
				highQualityRenderer = new HighQualityRenderer();
			}
			highQualityRenderer.render(scope.renderer);
		}else{
			potreeRenderer.render();
		}
	};

	scope.initThree();
	//scope.initGUI();

	// set defaults
	scope.setPointSize(1);
	scope.setFOV(60);
	scope.setOpacity(1);
	scope.setEDLEnabled(false);
	scope.setEDLRadius(2);
	scope.setEDLStrength(1);
	scope.setClipMode(Potree.ClipMode.HIGHLIGHT_INSIDE);
	scope.setPointBudget(1*1000*1000);
	scope.setShowBoundingBox(false);
	scope.setFreeze(false);
	scope.setNavigationMode("Orbit");

	scope.loadSettingsFromURL();

	// start rendering!
	requestAnimationFrame(loop);
};

Potree.Viewer.prototype = Object.create( THREE.EventDispatcher.prototype );
