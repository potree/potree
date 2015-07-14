
if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
	sceneProperties.navigation = "Orbit";
}

if(sceneProperties.quality === null){
	if(Potree.Features.SHADER_INTERPOLATION.isSupported()){
		sceneProperties.quality = "Interpolation";
	}else{
		sceneProperties.quality = "Squares";
	}
}

var fov = sceneProperties.fov;
var pointSize = sceneProperties.pointSize;
var pointCountTarget = sceneProperties.pointLimit;
var opacity = 1;
var pointSizeType = null;
var pointColorType = null;
var pointShape = Potree.PointShape.SQUARE;
var clipMode = Potree.ClipMode.HIGHLIGHT_INSIDE;
var quality = null;
var isFlipYZ = false;
var useDEMCollisions = false;
var minNodeSize = 150;
var directionalLight;

var showStats = false;
var showBoundingBox = false;
var freeze = false;

var fpControls;
var orbitControls;
var earthControls;
var controls;

var progressBar = new ProgressBar();

var pointcloudPath = sceneProperties.path;

var elRenderArea = document.getElementById("renderArea");

var gui;
var renderer;
var camera;
var scene;
var scenePointCloud;
var sceneBG, cameraBG;
var pointcloud;
var skybox;
var stats;
var clock = new THREE.Clock();
var showSkybox = false;
var measuringTool;
var volumeTool;
var transformationTool;
var referenceFrame;

function setPointSizeType(value){
	if(value === "Fixed"){
		pointSizeType = Potree.PointSizeType.FIXED;
	}else if(value === "Attenuated"){
		pointSizeType = Potree.PointSizeType.ATTENUATED;
	}else if(value === "Adaptive"){
		pointSizeType = Potree.PointSizeType.ADAPTIVE;
	}
};

function setQuality(value){
	

	if(value == "Interpolation" && !Potree.Features.SHADER_INTERPOLATION.isSupported()){
		quality = "Squares";
	}else if(value == "Splats" && !Potree.Features.SHADER_SPLATS.isSupported()){
		quality = "Squares";
	}else{
		quality = value;
	}
};

function setMaterial(value){
	if(value === "RGB"){
		pointColorType = Potree.PointColorType.RGB;
	}else if(value === "Color"){
		pointColorType = Potree.PointColorType.COLOR;
	}else if(value === "Height"){
		pointColorType = Potree.PointColorType.HEIGHT;
	}else if(value === "Intensity"){
		pointColorType = Potree.PointColorType.INTENSITY;
	}else if(value === "Intensity Gradient"){
		pointColorType = Potree.PointColorType.INTENSITY_GRADIENT;
	}else if(value === "Classification"){
		pointColorType = Potree.PointColorType.CLASSIFICATION;
	}else if(value === "Return Number"){
		pointColorType = Potree.PointColorType.RETURN_NUMBER;
	}else if(value === "Source"){
		pointColorType = Potree.PointColorType.SOURCE;
	}else if(value === "Tree Depth"){
		pointColorType = Potree.PointColorType.TREE_DEPTH;
	}else if(value === "Point Index"){
		pointColorType = Potree.PointColorType.POINT_INDEX;
	}else if(value === "Normal"){
		pointColorType = Potree.PointColorType.NORMAL;
	}else if(value === "Phong"){
		pointColorType = Potree.PointColorType.PHONG;
	}
};

function initGUI(){

	setPointSizeType(sceneProperties.sizeType);
	setQuality(sceneProperties.quality);
	setMaterial(sceneProperties.material);

	// dat.gui
	gui = new dat.GUI({
		//height : 5 * 32 - 1
	});
	
	params = {
		"points(m)": pointCountTarget,
		PointSize: pointSize,
		"FOV": sceneProperties.fov,
		"opacity": opacity,
		"SizeType" : sceneProperties.sizeType,
		"show octree" : false,
		"Materials" : sceneProperties.material,
		"Clip Mode": "Highlight Inside",
		"quality": sceneProperties.quality,
		"skybox": false,
		"stats": showStats,
		"BoundingBox": showBoundingBox,
		"DEM Collisions": useDEMCollisions,
		"MinNodeSize": minNodeSize,
		"freeze": freeze
	};
	
	var pPoints = gui.add(params, 'points(m)', 0, 2);
	pPoints.onChange(function(value){
		pointCountTarget = value ;
	});
	
	var fAppearance = gui.addFolder('Appearance');
	
	var pPointSize = fAppearance.add(params, 'PointSize', 0, 3);
	pPointSize.onChange(function(value){
		pointSize = value;
	});
	
	var fFOV = fAppearance.add(params, 'FOV', 20, 100);
	fFOV.onChange(function(value){
		fov = value;
	});
	
	var pOpacity = fAppearance.add(params, 'opacity', 0, 1);
	pOpacity.onChange(function(value){
		opacity = value;
	});
	
	var pSizeType = fAppearance.add(params, 'SizeType', [ "Fixed", "Attenuated", "Adaptive"]);
	pSizeType.onChange(function(value){
		setPointSizeType(value);
	});
	
	var options = [];
	var attributes = pointcloud.pcoGeometry.pointAttributes
	if(attributes === "LAS" || attributes === "LAZ"){
		options = [ 
		"RGB", "Color", "Height", "Intensity", "Intensity Gradient", 
		"Classification", "Return Number", "Source",
		"Tree Depth"];
	}else{
		for(var i = 0; i < attributes.attributes.length; i++){
			var attribute = attributes.attributes[i];
			
			if(attribute === Potree.PointAttribute.COLOR_PACKED){
				options.push("RGB");
			}else if(attribute === Potree.PointAttribute.INTENSITY){
				options.push("Intensity");
				options.push("Intensity Gradient");
			}else if(attribute === Potree.PointAttribute.CLASSIFICATION){
				options.push("Classification");
			}
		}
		if(attributes.hasNormals()){
			options.push("Phong");
			options.push("Normal");
		}
		
		options.push("Height");
		options.push("Tree Depth");
	}
	
	// default material is not available. set material to Height
	if(options.indexOf(params.Materials) < 0){
		console.error("Default Material '" + params.Material + "' is not available. Using Height instead");
		setMaterial("Height");
		params.Materials = "Height";
	}
	
	
	pMaterial = fAppearance.add(params, 'Materials',options);
	pMaterial.onChange(function(value){
		setMaterial(value);
	});
	
	var qualityOptions = ["Squares", "Circles"];
	if(Potree.Features.SHADER_INTERPOLATION.isSupported()){
		qualityOptions.push("Interpolation");
	}
	if(Potree.Features.SHADER_SPLATS.isSupported()){
		qualityOptions.push("Splats");
	}
	var pQuality = fAppearance.add(params, 'quality', qualityOptions);
	pQuality.onChange(function(value){
		quality = value;
	});
	
	var pSykbox = fAppearance.add(params, 'skybox');
	pSykbox.onChange(function(value){
		showSkybox = value;
	});
	
	var fSettings = gui.addFolder('Settings');
	
	var pClipMode = fSettings.add(params, 'Clip Mode', [ "No Clipping", "Clip Outside", "Highlight Inside"]);
	pClipMode.onChange(function(value){
		if(value === "No Clipping"){
			clipMode = Potree.ClipMode.DISABLED;
		}else if(value === "Clip Outside"){
			clipMode = Potree.ClipMode.CLIP_OUTSIDE;
		}else if(value === "Highlight Inside"){
			clipMode = Potree.ClipMode.HIGHLIGHT_INSIDE;
		}
	});
	
	var pDEMCollisions = fSettings.add(params, 'DEM Collisions');
	pDEMCollisions.onChange(function(value){
		useDEMCollisions = value;
	});
	
	var pMinNodeSize = fSettings.add(params, 'MinNodeSize', 0, 1500);
	pMinNodeSize.onChange(function(value){
		minNodeSize = value;
	});
	
	
	
	
	var fDebug = gui.addFolder('Debug');

	
	var pStats = fDebug.add(params, 'stats');
	pStats.onChange(function(value){
		showStats = value;
	});
	
	var pBoundingBox = fDebug.add(params, 'BoundingBox');
	pBoundingBox.onChange(function(value){
		showBoundingBox = value;
	});
	
	var pFreeze = fDebug.add(params, 'freeze');
	pFreeze.onChange(function(value){
		freeze = value;
	});

	// stats
	stats = new Stats();
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.top = '0px';
	stats.domElement.style.margin = '5px';
	document.body.appendChild( stats.domElement );
}

function initThree(){
	var width = elRenderArea.clientWidth;
	var height = elRenderArea.clientHeight;
	var aspect = width / height;
	var near = 0.1;
	var far = 1000000;

	scene = new THREE.Scene();
	scenePointCloud = new THREE.Scene();
	sceneBG = new THREE.Scene();
	
	camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
	//camera = new THREE.OrthographicCamera(-50, 50, 50, -50, 1, 100000);
	cameraBG = new THREE.Camera();
	camera.rotation.order = 'ZYX';
	
	referenceFrame = new THREE.Object3D();
	scenePointCloud.add(referenceFrame);

	renderer = new THREE.WebGLRenderer();
	renderer.setSize(width, height);
	renderer.autoClear = false;
	elRenderArea.appendChild(renderer.domElement);
	
	skybox = Potree.utils.loadSkybox("../resources/textures/skybox/");

	// camera and controls
	camera.position.set(-304, 372, 318);
	camera.rotation.y = -Math.PI / 4;
	camera.rotation.x = -Math.PI / 6;
	//useOrbitControls();
	earthControls = new THREE.EarthControls(camera, renderer, scenePointCloud);
	earthControls.addEventListener("proposeTransform", function(event){
		if(!pointcloud || !useDEMCollisions){
			return;
		}
		
		var demHeight = pointcloud.getDEMHeight(event.newPosition);
		if(event.newPosition.y < demHeight){
			event.objections++;
		}
	});
	useEarthControls();
	
	// enable frag_depth extension for the interpolation shader, if available
	renderer.context.getExtension("EXT_frag_depth");
	
	// load pointcloud
	if(!pointcloudPath){
		
	}else if(pointcloudPath.indexOf("cloud.js") > 0){
		Potree.POCLoader.load(pointcloudPath, function(geometry){
			pointcloud = new Potree.PointCloudOctree(geometry);
			
			pointcloud.material.pointSizeType = Potree.PointSizeType.ADAPTIVE;
			pointcloud.material.size = pointSize;
			pointcloud.visiblePointsTarget = pointCountTarget * 1000 * 1000;
			
			referenceFrame.add(pointcloud);
			
			referenceFrame.updateMatrixWorld(true);
			var sg = pointcloud.boundingSphere.clone().applyMatrix4(pointcloud.matrixWorld);
			
			referenceFrame.position.copy(sg.center).multiplyScalar(-1);
			referenceFrame.updateMatrixWorld(true);
			
			
			flipYZ();
			camera.zoomTo(pointcloud, 1);
			
			initGUI();	
		
			earthControls.pointclouds.push(pointcloud);	
			
			if(sceneProperties.navigation === "Earth"){
				useEarthControls();
			}else if(sceneProperties.navigation === "Orbit"){
				useOrbitControls();
			}else if(sceneProperties.navigation === "Flight"){
				useFPSControls();
			}else{
				console.warning("No navigation mode specivied. Using OrbitControls");
				useOrbitControls();
			}
			
			if(sceneProperties.cameraPosition){
				camera.position.set(sceneProperties.cameraPosition[0], sceneProperties.cameraPosition[1], sceneProperties.cameraPosition[2]);
			}
			if(sceneProperties.cameraTarget){
				camera.lookAt(new THREE.Vector3(sceneProperties.cameraTarget[0], sceneProperties.cameraTarget[1], sceneProperties.cameraTarget[2]));
			}
		});
	}else if(pointcloudPath.indexOf(".vpc") > 0){
		Potree.PointCloudArena4DGeometry.load(pointcloudPath, function(geometry){
			pointcloud = new Potree.PointCloudArena4D(geometry);
			pointcloud.visiblePointsTarget = 500*1000;
			
			//pointcloud.applyMatrix(new THREE.Matrix4().set(
			//	1,0,0,0,
			//	0,0,1,0,
			//	0,-1,0,0,
			//	0,0,0,1
			//));
			
			referenceFrame.add(pointcloud);
			
			flipYZ();
			
			referenceFrame.updateMatrixWorld(true);
			var sg = pointcloud.boundingSphere.clone().applyMatrix4(pointcloud.matrixWorld);
			
			referenceFrame.position.sub(sg.center);
			referenceFrame.position.y += sg.radius / 2;
			referenceFrame.updateMatrixWorld(true);
			
			camera.zoomTo(pointcloud, 1);
			
			initGUI();
			pointcloud.material.interpolation = false;
			pointcloud.material.pointSizeType = Potree.PointSizeType.ATTENUATED;
			earthControls.pointclouds.push(pointcloud);	
			
			
			if(sceneProperties.navigation === "Earth"){
				useEarthControls();
			}else if(sceneProperties.navigation === "Orbit"){
				useOrbitControls();
			}else if(sceneProperties.navigation === "Flight"){
				useFPSControls();
			}else{
				console.warning("No navigation mode specivied. Using OrbitControls");
				useOrbitControls();
			}
			
		});
	}
	
	var grid = Potree.utils.createGrid(5, 5, 2);
	scene.add(grid);
	
	measuringTool = new Potree.MeasuringTool(scenePointCloud, camera, renderer);
	profileTool = new Potree.ProfileTool(scenePointCloud, camera, renderer);
	volumeTool = new Potree.VolumeTool(scenePointCloud, camera, renderer);
	transformationTool = new Potree.TransformationTool(scenePointCloud, camera, renderer);
	
	
	// background
	// var texture = THREE.ImageUtils.loadTexture( '../resources/textures/background.gif' );
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
	sceneBG.add(bg);			
	
	window.addEventListener( 'keydown', onKeyDown, false );
	
	directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
	directionalLight.position.set( 10, 10, 10 );
	directionalLight.lookAt( new THREE.Vector3(0, 0, 0));
	scenePointCloud.add( directionalLight );
	
	var light = new THREE.AmbientLight( 0x555555 ); // soft white light
	scenePointCloud.add( light );
	
}

function flipYZ(){
	isFlipYZ = !isFlipYZ;
	
	if(isFlipYZ){
		referenceFrame.matrix.copy(new THREE.Matrix4());
		referenceFrame.applyMatrix(new THREE.Matrix4().set(
			1,0,0,0,
			0,0,1,0,
			0,-1,0,0,
			0,0,0,1
		));
		
	}else{
		referenceFrame.matrix.copy(new THREE.Matrix4());
		referenceFrame.applyMatrix(new THREE.Matrix4().set(
			1,0,0,0,
			0,1,0,0,
			0,0,1,0,
			0,0,0,1
		));
	}
	
	referenceFrame.updateMatrixWorld(true);
	pointcloud.updateMatrixWorld();
	var sg = pointcloud.boundingSphere.clone().applyMatrix4(pointcloud.matrixWorld);
	referenceFrame.position.copy(sg.center).multiplyScalar(-1);
	referenceFrame.updateMatrixWorld(true);
	referenceFrame.position.y -= pointcloud.getWorldPosition().y;
	referenceFrame.updateMatrixWorld(true);
}

function onKeyDown(event){
	//console.log(event.keyCode);
	
	if(event.keyCode === 69){
		// e pressed
		
		transformationTool.translate();
	}else if(event.keyCode === 82){
		// r pressed
		
		transformationTool.scale();
	}else if(event.keyCode === 84){
		// r pressed
		
		transformationTool.rotate();
	}
};

var intensityMax = null;
var heightMin = null;
var heightMax = null;

function update(){
	Potree.pointLoadLimit = pointCountTarget * 2 * 1000 * 1000;
	
	directionalLight.position.copy(camera.position);
	directionalLight.lookAt(new THREE.Vector3().addVectors(camera.position, camera.getWorldDirection()));
	
	if(pointcloud){
	
		var bbWorld = Potree.utils.computeTransformedBoundingBox(pointcloud.boundingBox, pointcloud.matrixWorld);
			
		if(!intensityMax){
			var root = pointcloud.pcoGeometry.root;
			if(root != null && root.loaded){
				var attributes = pointcloud.pcoGeometry.root.geometry.attributes;
				if(attributes.intensity){
					var array = attributes.intensity.array;
					var max = 0;
					for(var i = 0; i < array.length; i++){
						max = Math.max(array[i]);
					}
					
					if(max <= 1){
						intensityMax = 1;
					}else if(max <= 256){
						intensityMax = 255;
					}else{
						intensityMax = max;
					}
				}
			}
		}
		
		if(!heightMin){
			heightMin = bbWorld.min.y;
			heightMax = bbWorld.max.y;
		}
			
		pointcloud.material.clipMode = clipMode;
		pointcloud.material.heightMin = heightMin;
		pointcloud.material.heightMax = heightMax;
		pointcloud.material.intensityMin = 0;
		pointcloud.material.intensityMax = intensityMax;
		pointcloud.showBoundingBox = showBoundingBox;
		pointcloud.generateDEM = useDEMCollisions;
		pointcloud.minimumNodePixelSize = minNodeSize;
		
		if(!freeze){
			pointcloud.update(camera, renderer);
		}
	}
	
	if(stats && showStats){
		document.getElementById("lblNumVisibleNodes").style.display = "";
	    document.getElementById("lblNumVisiblePoints").style.display = "";
	    stats.domElement.style.display = "";
	
		stats.update();
	
		if(pointcloud){
			document.getElementById("lblNumVisibleNodes").innerHTML = "visible nodes: " + pointcloud.numVisibleNodes;
			document.getElementById("lblNumVisiblePoints").innerHTML = "visible points: " + Potree.utils.addCommas(pointcloud.numVisiblePoints);
		}
	}else if(stats){
		document.getElementById("lblNumVisibleNodes").style.display = "none";
	    document.getElementById("lblNumVisiblePoints").style.display = "none";
	    stats.domElement.style.display = "none";
	}
	
	camera.fov = fov;
	
	if(controls){
		controls.update(clock.getDelta());
	}

	// update progress bar
	if(pointcloud){
		var progress = pointcloud.progress;;
		
		progressBar.progress = progress;
		
		var message;
		if(progress === 0 || pointcloud instanceof Potree.PointCloudArena4D){
			message = "loading";
		}else{
			message = "loading: " + parseInt(progress*100) + "%";
		}
		progressBar.message = message;
		
		if(progress === 1){
			progressBar.hide();
		}else if(progress < 1){
			progressBar.show();
		}
	}
	
	volumeTool.update();
	transformationTool.update();
	profileTool.update();
	
	
	var clipBoxes = [];
	
	for(var i = 0; i < profileTool.profiles.length; i++){
		var profile = profileTool.profiles[i];
		
		for(var j = 0; j < profile.boxes.length; j++){
			var box = profile.boxes[j];
			box.updateMatrixWorld();
			var boxInverse = new THREE.Matrix4().getInverse(box.matrixWorld);
			clipBoxes.push(boxInverse);
		}
	}
	
	for(var i = 0; i < volumeTool.volumes.length; i++){
		var volume = volumeTool.volumes[i];
		
		if(volume.clip){
			volume.updateMatrixWorld();
			var boxInverse = new THREE.Matrix4().getInverse(volume.matrixWorld);
		
			clipBoxes.push(boxInverse);
		}
	}
	
	if(pointcloud){
		pointcloud.material.setClipBoxes(clipBoxes);
	}
	
}

function useEarthControls(){
	if(controls){
		controls.enabled = false;
	}		

	controls = earthControls;
	controls.enabled = true;
}

function useFPSControls(){
	if(controls){
		controls.enabled = false;
	}
	if(!fpControls){
		fpControls = new THREE.FirstPersonControls(camera, renderer.domElement);
		fpControls.addEventListener("proposeTransform", function(event){
			if(!pointcloud || !useDEMCollisions){
				return;
			}
			
			var demHeight = pointcloud.getDEMHeight(event.newPosition);
			if(event.newPosition.y < demHeight){
				event.objections++;
				
				var counterProposal = event.newPosition.clone();
				counterProposal.y = demHeight;
				
				event.counterProposals.push(counterProposal);
			}
		});
	}

	controls = fpControls;
	controls.enabled = true;
	
	controls.moveSpeed = pointcloud.boundingSphere.radius / 2;
}

function useOrbitControls(){
	if(controls){
		controls.enabled = false;
	}
	if(!orbitControls){
		orbitControls = new Potree.OrbitControls(camera, renderer.domElement);
		orbitControls.addEventListener("proposeTransform", function(event){
			if(!pointcloud || !useDEMCollisions){
				return;
			}
			
			var demHeight = pointcloud.getDEMHeight(event.newPosition);
			if(event.newPosition.y < demHeight){
				event.objections++;
				
				var counterProposal = event.newPosition.clone();
				counterProposal.y = demHeight;
				
				event.counterProposals.push(counterProposal);
			}
		});
	}
	
	controls = orbitControls;
	controls.enabled = true;
	
	if(pointcloud){
		controls.target.copy(pointcloud.boundingSphere.center.clone().applyMatrix4(pointcloud.matrixWorld));
	}
}

function render(){
	// resize
	var width = elRenderArea.clientWidth;
	var height = elRenderArea.clientHeight;
	var aspect = width / height;
	
	camera.aspect = aspect;
	camera.updateProjectionMatrix();
	
	renderer.setSize(width, height);
	

	// render skybox
	if(showSkybox){
		skybox.camera.rotation.copy(camera.rotation);
		renderer.render(skybox.scene, skybox.camera);
	}else{
		renderer.render(sceneBG, cameraBG);
	}
	
	if(pointcloud){
		if(pointcloud.originalMaterial){
			pointcloud.material = pointcloud.originalMaterial;
		}
		
		var bbWorld = Potree.utils.computeTransformedBoundingBox(pointcloud.boundingBox, pointcloud.matrixWorld);
		
		pointcloud.visiblePointsTarget = pointCountTarget * 1000 * 1000;
		pointcloud.material.size = pointSize;
		pointcloud.material.opacity = opacity;
		pointcloud.material.pointColorType = pointColorType;
		pointcloud.material.pointSizeType = pointSizeType;
		pointcloud.material.pointShape = (quality === "Circles") ? Potree.PointShape.CIRCLE : Potree.PointShape.SQUARE;
		pointcloud.material.interpolate = (quality === "Interpolation");
		pointcloud.material.weighted = false;
	}
	
	// render scene
	renderer.render(scene, camera);
	renderer.render(scenePointCloud, camera);
	
	profileTool.render();
	volumeTool.render();
	
	renderer.clearDepth();
	measuringTool.render();
	transformationTool.render();
}

// high quality rendering using splats
// 
var rtDepth = new THREE.WebGLRenderTarget( 1024, 1024, { 
	minFilter: THREE.NearestFilter, 
	magFilter: THREE.NearestFilter, 
	format: THREE.RGBAFormat, 
	type: THREE.FloatType
} );
var rtNormalize = new THREE.WebGLRenderTarget( 1024, 1024, { 
	minFilter: THREE.LinearFilter, 
	magFilter: THREE.NearestFilter, 
	format: THREE.RGBAFormat, 
	type: THREE.FloatType
} );

var sceneNormalize;

var depthMaterial, weightedMaterial;

// render with splats
function renderHighQuality(){

	if(!sceneNormalize){
		sceneNormalize = new THREE.Scene();
						
		var vsNormalize = Potree.Shaders["normalize.vs"];
		var fsNormalize = Potree.Shaders["normalize.fs"];
		
		var uniformsNormalize = {
			depthMap: { type: "t", value: rtDepth },
			texture: { type: "t", value: rtNormalize }
		};
		
		var materialNormalize = new THREE.ShaderMaterial({
			uniforms: uniformsNormalize,
			vertexShader: vsNormalize,
			fragmentShader: fsNormalize
		});
		
		var quad = new THREE.Mesh( new THREE.PlaneBufferGeometry(2, 2, 0), materialNormalize);
		quad.material.depthTest = true;
		quad.material.depthWrite = true;
		quad.material.transparent = true;
		sceneNormalize.add(quad);
		sceneNormalize.screenQuad = quad;
	}
	
	// resize
	if(rtDepth){
		if(rtDepth.width != elRenderArea.clientWidth || rtDepth.height != elRenderArea.clientHeight){
			rtDepth.dispose();
			rtNormalize.dispose();
			
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
			
			sceneNormalize.screenQuad.material.uniforms.depthMap.value = rtDepth;
			sceneNormalize.screenQuad.material.uniforms.texture.value = rtNormalize;
		}
	}
	
	var width = elRenderArea.clientWidth;
	var height = elRenderArea.clientHeight;
	var aspect = width / height;
	
	camera.aspect = aspect;
	camera.updateProjectionMatrix();
	
	renderer.setSize(width, height);
	rtDepth.setSize(width, height);
	rtNormalize.setSize(width, height);
	
	renderer.clear();
	//renderer.render(sceneBG, cameraBG);
	// render skybox
	if(showSkybox){
		skybox.camera.rotation.copy(camera.rotation);
		renderer.render(skybox.scene, skybox.camera);
	}else{
		renderer.render(sceneBG, cameraBG);
	}
	renderer.render(scene, camera);
	
	if(pointcloud){
		
		if(typeof pointcloud._hqsplats === "undefined"){
			var hq = {
				originalMaterial:	pointcloud.material,
				depthMaterial:		new Potree.PointCloudMaterial(),
				attributeMaterial:	new Potree.PointCloudMaterial()
			}
			
			hq.depthMaterial.pointColorType = Potree.PointColorType.DEPTH;
			hq.depthMaterial.pointShape = Potree.PointShape.CIRCLE;
			hq.depthMaterial.interpolate = false;
			hq.depthMaterial.weighted = false;
			hq.depthMaterial.minSize = 2;
			hq.depthMaterial.uniforms.octreeSize.value = pointcloud.pcoGeometry.boundingBox.size().x;
			
			hq.attributeMaterial.pointShape = Potree.PointShape.CIRCLE;
			hq.attributeMaterial.interpolate = false;
			hq.attributeMaterial.weighted = true;
			hq.attributeMaterial.minSize = 2;
			hq.attributeMaterial.uniforms.octreeSize.value = pointcloud.pcoGeometry.boundingBox.size().x;
			
			pointcloud._hqsplats = hq;
		}
		
		{// DEPTH PASS
			var material = pointcloud._hqsplats.depthMaterial;
			
			material.size = pointSize;
			material.pointSizeType = pointSizeType;
			material.screenWidth = width;
			material.screenHeight = height;
			material.uniforms.visibleNodes.value = pointcloud.material.visibleNodesTexture;
			material.uniforms.octreeSize.value = pointcloud.pcoGeometry.boundingBox.size().x;
			material.fov = camera.fov * (Math.PI / 180);
			material.spacing = pointcloud.pcoGeometry.spacing;
			material.near = camera.near;
			material.far = camera.far;
			
			pointcloud.material = material;
			
			pointcloud.update(camera, renderer);
			
			renderer.clearTarget( rtDepth, true, true, true );
			renderer.clearTarget( rtNormalize, true, true, true );
			renderer.render(scenePointCloud, camera, rtDepth);
		}
		
		
		{// ATTRIBUTE PASS
			var material = pointcloud._hqsplats.attributeMaterial;
			
			material.size = pointSize;
			material.pointSizeType = pointSizeType;
			material.screenWidth = width;
			material.screenHeight = height;
			material.pointColorType = pointColorType;
			material.depthMap = rtDepth;
			material.uniforms.visibleNodes.value = pointcloud.material.visibleNodesTexture;
			material.uniforms.octreeSize.value = pointcloud.pcoGeometry.boundingBox.size().x;
			material.fov = camera.fov * (Math.PI / 180);
			material.spacing = pointcloud.pcoGeometry.spacing;
			material.near = camera.near;
			material.far = camera.far;
			
			pointcloud.material = material;
			
			pointcloud.update(camera, renderer);
			renderer.render(scenePointCloud, camera, rtNormalize);
		}
		
		// NORMALIZATION PASS
		renderer.render(sceneNormalize, cameraBG);
		
		pointcloud.material = pointcloud._hqsplats.originalMaterial;
	
	    volumeTool.render();
		renderer.clearDepth();
		profileTool.render();
		measuringTool.render();
		transformationTool.render();
			
	}


}



function loop() {
	requestAnimationFrame(loop);
	
	update();
	
	if(quality === "Splats"){
		renderHighQuality();
	}else{
		render();
	}
	
};



initThree();
loop();