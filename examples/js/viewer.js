
Potree.Viewer = function(domElement, settings, args){
	var scope = this;
	var defaultSettings = settings;
	var arguments = args || {};
	
	this.renderArea = domElement;

	if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
		defaultSettings.navigation = "Orbit";
	}

	if(defaultSettings.useEDL && !Potree.Features.SHADER_EDL.isSupported()){
		defaultSettings.useEDL = false;
	}

	if(typeof arguments.onPointCloudLoaded !== "undefined"){
		this.addEventListener("pointcloud_loaded", arguments.onPointCloudLoaded);
	}
	
	var fov = defaultSettings.fov || 60;
	var pointSize = defaultSettings.pointSize || 1;
	var pointCountTarget = defaultSettings.pointLimit || 1;
	var opacity = 1;
	var pointSizeType = null;
	var pointColorType = null;
	var pointShape = Potree.PointShape.SQUARE;
	var clipMode = Potree.ClipMode.HIGHLIGHT_INSIDE;
	var quality = defaultSettings.quality || "Squares";
	var isFlipYZ = false;
	var useDEMCollisions = false;
	var minNodeSize = 100;
	var directionalLight;
	var edlScale = defaultSettings.edlScale || 1;
	var edlRadius = defaultSettings.edlRadius || 3;
	var useEDL = defaultSettings.useEDL || false;

	var showStats = false;
	var showBoundingBox = false;
	var freeze = false;

	var fpControls;
	var orbitControls;
	var earthControls;
	var controls;

	var progressBar = new ProgressBar();

	var pointcloudPath = defaultSettings.path;

	var gui;
	this.renderer;
	var camera;
	var scene;
	var scenePointCloud;
	var sceneBG, cameraBG;
	this.pointcloud = null;
	var skybox;
	var stats;
	var clock = new THREE.Clock();
	var showSkybox = false;
	this.measuringTool;
	this.volumeTool;
	this.transformationTool;
	var referenceFrame;

	this.setPointSizeType = function(value){
		if(value === "Fixed"){
			pointSizeType = Potree.PointSizeType.FIXED;
		}else if(value === "Attenuated"){
			pointSizeType = Potree.PointSizeType.ATTENUATED;
		}else if(value === "Adaptive"){
			pointSizeType = Potree.PointSizeType.ADAPTIVE;
		}
	};

	this.setQuality = function(value){
		if(value == "Interpolation" && !Potree.Features.SHADER_INTERPOLATION.isSupported()){
			quality = "Squares";
		}else if(value == "Splats" && !Potree.Features.SHADER_SPLATS.isSupported()){
			quality = "Squares";
		}else{
			quality = value;
		}
	};

	this.setMaterial = function(value){
		if(value === "RGB"){
			pointColorType = Potree.PointColorType.RGB;
		}else if(value === "Color"){
			pointColorType = Potree.PointColorType.COLOR;
		}else if(value === "Elevation"){
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

	this.initGUI = function(){

		scope.setPointSizeType(defaultSettings.sizeType);
		scope.setQuality(defaultSettings.quality);
		scope.setMaterial(defaultSettings.material);

		// dat.gui
		gui = new dat.GUI({
			//height : 5 * 32 - 1
		});
		
		params = {
			"points(m)": pointCountTarget,
			PointSize: pointSize,
			"FOV": fov,
			"opacity": opacity,
			"SizeType" : defaultSettings.sizeType,
			"show octree" : false,
			"Materials" : defaultSettings.material,
			"Clip Mode": "Highlight Inside",
			"quality": defaultSettings.quality,
			"EDL": defaultSettings.useEDL,
			"EDLScale": edlScale,
			"skybox": false,
			"stats": showStats,
			"BoundingBox": showBoundingBox,
			"DEM Collisions": useDEMCollisions,
			"MinNodeSize": minNodeSize,
			"freeze": freeze
		};
		
		var pPoints = gui.add(params, 'points(m)', 0, 4);
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
		var attributes = scope.pointcloud.pcoGeometry.pointAttributes
		if(attributes === "LAS" || attributes === "LAZ"){
			options = [ 
			"RGB", "Color", "Elevation", "Intensity", "Intensity Gradient", 
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
			
			options.push("Elevation");
			options.push("Color");
			options.push("Tree Depth");
		}
		
		// default material is not available. set material to Elevation
		if(options.indexOf(params.Materials) < 0){
			console.error("Default Material '" + params.Material + "' is not available. Using Elevation instead");
			setMaterial("Elevation");
			params.Materials = "Elevation";
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
		
		{ // Eye-Dome-Lighting
			if(Potree.Features.SHADER_EDL.isSupported()){
			
				var edlParams = {
					"enable": useEDL,
					"strength": edlScale,
					"radius": edlRadius
				};
			
				var fEDL = fAppearance.addFolder('Eye-Dome-Lighting');
				var pEDL = fEDL.add(edlParams, 'enable');
				pEDL.onChange(function(value){
					useEDL = value;
				});
				
				var pEDLScale = fEDL.add(edlParams, 'strength', 0, 3, 0.01);
				pEDLScale.onChange(function(value){
					edlScale = value;
				});
				
				var pRadius = fEDL.add(edlParams, 'radius', 1, 5);
				pRadius.onChange(function(value){
					edlRadius = value;
				});
			}
		}
		
		{ // Classification
			var classificationParams = {
				"never classified": true,
				"unclassified": true,
				"ground": true,
				"low vegetation": true,
				"medium vegetation": true,
				"high vegetation": true,
				"building": true,
				"low point(noise)": false,
				"key-point": true,
				"water": true,
				"overlap": true
			};
			
			var setClassificationVisibility = function(key, value){
				if(!scope.pointcloud){
					return;
				}
				var newClass = scope.pointcloud.material.classification;
				newClass[key].w = value ? 1 : 0;
				
				scope.pointcloud.material.classification = newClass;
			};
			
			var fClassification = fAppearance.addFolder('Classification');
			
			var pNeverClassified = fClassification.add(classificationParams, 'never classified');
			pNeverClassified.onChange(function(value){
				setClassificationVisibility(0, value);
			});		
			
			var pUnclassified = fClassification.add(classificationParams, 'unclassified');
			pUnclassified.onChange(function(value){
				setClassificationVisibility(1, value);
			});	
			
			var pGround = fClassification.add(classificationParams, 'ground');
			pGround.onChange(function(value){
				setClassificationVisibility(2, value);
			});	
			
			var pLowVeg = fClassification.add(classificationParams, 'low vegetation');
			pLowVeg.onChange(function(value){
				setClassificationVisibility(3, value);
			});	
			
			var pMedVeg = fClassification.add(classificationParams, 'medium vegetation');
			pMedVeg.onChange(function(value){
				setClassificationVisibility(4, value);
			});	
			
			var pHighVeg = fClassification.add(classificationParams, 'high vegetation');
			pHighVeg.onChange(function(value){
				setClassificationVisibility(5, value);
			});	
			
			var pBuilding = fClassification.add(classificationParams, 'building');
			pBuilding.onChange(function(value){
				setClassificationVisibility(6, value);
			});	
			
			var pNoise = fClassification.add(classificationParams, 'low point(noise)');
			pNoise.onChange(function(value){
				setClassificationVisibility(7, value);
			});	
			
			var pKeyPoint = fClassification.add(classificationParams, 'key-point');
			pKeyPoint.onChange(function(value){
				setClassificationVisibility(8, value);
			});	
			
			var pWater = fClassification.add(classificationParams, 'water');
			pWater.onChange(function(value){
				setClassificationVisibility(9, value);
			});	
			
			var pOverlap = fClassification.add(classificationParams, 'overlap');
			pOverlap.onChange(function(value){
				setClassificationVisibility(12, value);
			});
			
			

		}
		
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
	
	this.createControls = function(){
		{ // create FIRST PERSON CONTROLS
			fpControls = new THREE.FirstPersonControls(camera, scope.renderer.domElement);
			fpControls.addEventListener("proposeTransform", function(event){
				if(!scope.pointcloud || !useDEMCollisions){
					return;
				}
				
				var demHeight = scope.pointcloud.getDEMHeight(event.newPosition);
				if(event.newPosition.y < demHeight){
					event.objections++;
					
					var counterProposal = event.newPosition.clone();
					counterProposal.y = demHeight;
					
					event.counterProposals.push(counterProposal);
				}
			});
		}
	
		{ // create ORBIT CONTROLS
			orbitControls = new Potree.OrbitControls(camera, scope.renderer.domElement);
			orbitControls.addEventListener("proposeTransform", function(event){
				if(!scope.pointcloud || !useDEMCollisions){
					return;
				}
				
				var demHeight = scope.pointcloud.getDEMHeight(event.newPosition);
				if(event.newPosition.y < demHeight){
					event.objections++;
					
					var counterProposal = event.newPosition.clone();
					counterProposal.y = demHeight;
					
					event.counterProposals.push(counterProposal);
				}
			});
			orbitControls.domElement.addEventListener("dblclick", function(event){
				if(!scope.pointcloud){
					return;
				}
				
				event.preventDefault();
			
				var rect = orbitControls.domElement.getBoundingClientRect();
				
				var mouse =  {
					x: ( (event.clientX - rect.left) / orbitControls.domElement.clientWidth ) * 2 - 1,
					y: - ( (event.clientY - rect.top) / orbitControls.domElement.clientHeight ) * 2 + 1
				};
				
				
				var I = getMousePointCloudIntersection(mouse, camera, scope.renderer, [scope.pointcloud]);
				if(I != null){
				
					var camTargetDistance = camera.position.distanceTo(orbitControls.target);
				
					var vector = new THREE.Vector3( mouse.x, mouse.y, 0.5 );
					vector.unproject(camera);

					var direction = vector.sub(camera.position).normalize();
					var ray = new THREE.Ray(camera.position, direction);
					
					var nodes = scope.pointcloud.nodesOnRay(scope.pointcloud.visibleNodes, ray);
					var lastNode = nodes[nodes.length - 1];
					var radius = lastNode.boundingSphere.radius;
					var targetRadius = Math.min(camTargetDistance, radius);
					
					var d = camera.getWorldDirection().multiplyScalar(-1);
					var cameraTargetPosition = new THREE.Vector3().addVectors(I, d.multiplyScalar(targetRadius));
					var controlsTargetPosition = I;
					
					var animationDuration = 600;
					
					var easing = TWEEN.Easing.Quartic.Out;
					
					// animate position
					var tween = new TWEEN.Tween(camera.position).to(cameraTargetPosition, animationDuration);
					tween.easing(easing);
					tween.start();
					
					// animate target
					var tween = new TWEEN.Tween(controls.target).to(I, animationDuration);
					tween.easing(easing);
					tween.start();
				}
			});
		}
		
		{ // create EARTH CONTROLS
			earthControls = new THREE.EarthControls(camera, scope.renderer, scenePointCloud);
			earthControls.addEventListener("proposeTransform", function(event){
				if(!scope.pointcloud || !useDEMCollisions){
					return;
				}
				
				var demHeight = scope.pointcloud.getDEMHeight(event.newPosition);
				if(event.newPosition.y < demHeight){
					event.objections++;
				}
			});
		}
	};
	
	this.initThree = function(){
		var width = renderArea.clientWidth;
		var height = renderArea.clientHeight;
		var aspect = width / height;
		var near = 0.1;
		var far = 1000*1000;

		scene = new THREE.Scene();
		scenePointCloud = new THREE.Scene();
		sceneBG = new THREE.Scene();
		
		camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
		//camera = new THREE.OrthographicCamera(-50, 50, 50, -50, 1, 100000);
		cameraBG = new THREE.Camera();
		camera.rotation.order = 'ZYX';
		
		referenceFrame = new THREE.Object3D();
		scenePointCloud.add(referenceFrame);

		scope.renderer = new THREE.WebGLRenderer();
		scope.renderer.setSize(width, height);
		scope.renderer.autoClear = false;
		renderArea.appendChild(scope.renderer.domElement);
		
		skybox = Potree.utils.loadSkybox("../resources/textures/skybox/");

		// camera and controls
		camera.position.set(-304, 372, 318);
		camera.rotation.y = -Math.PI / 4;
		camera.rotation.x = -Math.PI / 6;
		
		this.createControls();
		
		scope.useEarthControls();
		
		// enable frag_depth extension for the interpolation shader, if available
		scope.renderer.context.getExtension("EXT_frag_depth");
		
		// load pointcloud
		if(!pointcloudPath){
			
		}else if(pointcloudPath.indexOf("cloud.js") > 0){
			Potree.POCLoader.load(pointcloudPath, function(geometry){
				scope.pointcloud = new Potree.PointCloudOctree(geometry);
				
				scope.pointcloud.material.pointSizeType = Potree.PointSizeType.ADAPTIVE;
				scope.pointcloud.material.size = pointSize;
				scope.pointcloud.visiblePointsTarget = pointCountTarget * 1000 * 1000;
				
				referenceFrame.add(scope.pointcloud);
				
				referenceFrame.updateMatrixWorld(true);
				var sg = scope.pointcloud.boundingSphere.clone().applyMatrix4(scope.pointcloud.matrixWorld);
				
				referenceFrame.position.copy(sg.center).multiplyScalar(-1);
				referenceFrame.updateMatrixWorld(true);
				
				if(sg.radius > 50*1000){
					camera.near = 10;
				}else if(sg.radius > 10*1000){
					camera.near = 2;
				}else if(sg.radius > 1000){
					camera.near = 1;
				}else if(sg.radius > 100){
					camera.near = 0.5;
				}else{
					camera.near = 0.1;
				}
				
				
				scope.flipYZ();
				camera.zoomTo(scope.pointcloud, 1);
				
				scope.initGUI();	
			
				earthControls.pointclouds.push(scope.pointcloud);	
				
				
				
				if(defaultSettings.navigation === "Earth"){
					scope.useEarthControls();
				}else if(defaultSettings.navigation === "Orbit"){
					scope.useOrbitControls();
				}else if(defaultSettings.navigation === "Flight"){
					scope.useFPSControls();
				}else{
					console.warning("No navigation mode specified. Using OrbitControls");
					scope.useOrbitControls();
				}
				
				if(defaultSettings.cameraPosition != null){
					var cp = new THREE.Vector3(defaultSettings.cameraPosition[0], defaultSettings.cameraPosition[1], defaultSettings.cameraPosition[2]);
					camera.position.copy(cp);
				}
				
				if(defaultSettings.cameraTarget != null){
					var ct = new THREE.Vector3(defaultSettings.cameraTarget[0], defaultSettings.cameraTarget[1], defaultSettings.cameraTarget[2]);
					camera.lookAt(ct);
					
					if(defaultSettings.navigation === "Orbit"){
						controls.target.copy(ct);
					}
				}
				
				scope.dispatchEvent({
					"type": "pointcloud_loaded",
					"pointcloud": scope.pointcloud
				});
				
			});
		}else if(pointcloudPath.indexOf(".vpc") > 0){
			Potree.PointCloudArena4DGeometry.load(pointcloudPath, function(geometry){
				scope.pointcloud = new Potree.PointCloudArena4D(geometry);
				scope.pointcloud.visiblePointsTarget = 500*1000;
				
				//scope.pointcloud.applyMatrix(new THREE.Matrix4().set(
				//	1,0,0,0,
				//	0,0,1,0,
				//	0,-1,0,0,
				//	0,0,0,1
				//));
				
				referenceFrame.add(scope.pointcloud);
				
				flipYZ();
				
				referenceFrame.updateMatrixWorld(true);
				var sg = scope.pointcloud.boundingSphere.clone().applyMatrix4(scope.pointcloud.matrixWorld);
				
				referenceFrame.position.sub(sg.center);
				referenceFrame.position.y += sg.radius / 2;
				referenceFrame.updateMatrixWorld(true);
				
				camera.zoomTo(scope.pointcloud, 1);
				
				initGUI();
				scope.pointcloud.material.interpolation = false;
				scope.pointcloud.material.pointSizeType = Potree.PointSizeType.ATTENUATED;
				earthControls.pointclouds.push(scope.pointcloud);	
				
				
				if(defaultSettings.navigation === "Earth"){
					scope.useEarthControls();
				}else if(defaultSettings.navigation === "Orbit"){
					scope.useOrbitControls();
				}else if(defaultSettings.navigation === "Flight"){
					scope.useFPSControls();
				}else{
					console.warning("No navigation mode specivied. Using OrbitControls");
					scope.useOrbitControls();
				}
				
				if(defaultSettings.cameraPosition != null){
					var cp = new THREE.Vector3(defaultSettings.cameraPosition[0], defaultSettings.cameraPosition[1], defaultSettings.cameraPosition[2]);
					camera.position.copy(cp);
				}
				
				if(defaultSettings.cameraTarget != null){
					var ct = new THREE.Vector3(defaultSettings.cameraTarget[0], defaultSettings.cameraTarget[1], defaultSettings.cameraTarget[2]);
					camera.lookAt(ct);
				}
				
			});
		}
		
		var grid = Potree.utils.createGrid(5, 5, 2);
		scene.add(grid);
		
		scope.measuringTool = new Potree.MeasuringTool(scenePointCloud, camera, scope.renderer);
		scope.profileTool = new Potree.ProfileTool(scenePointCloud, camera, scope.renderer);
		scope.volumeTool = new Potree.VolumeTool(scenePointCloud, camera, scope.renderer);
		scope.transformationTool = new Potree.TransformationTool(scenePointCloud, camera, scope.renderer);
		
		
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

	this.flipYZ = function(){
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
		scope.pointcloud.updateMatrixWorld();
		var sg = scope.pointcloud.boundingSphere.clone().applyMatrix4(scope.pointcloud.matrixWorld);
		referenceFrame.position.copy(sg.center).multiplyScalar(-1);
		referenceFrame.updateMatrixWorld(true);
		referenceFrame.position.y -= scope.pointcloud.getWorldPosition().y;
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

	this.update = function(delta, timestamp){
		Potree.pointLoadLimit = pointCountTarget * 2 * 1000 * 1000;
		
		directionalLight.position.copy(camera.position);
		directionalLight.lookAt(new THREE.Vector3().addVectors(camera.position, camera.getWorldDirection()));
		
		if(scope.pointcloud){
		
			var bbWorld = Potree.utils.computeTransformedBoundingBox(scope.pointcloud.boundingBox, scope.pointcloud.matrixWorld);
				
			if(!intensityMax){
				var root = scope.pointcloud.pcoGeometry.root;
				if(root != null && root.loaded){
					var attributes = scope.pointcloud.pcoGeometry.root.geometry.attributes;
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
			
			if(heightMin === null){
				heightMin = bbWorld.min.y;
				heightMax = bbWorld.max.y;
			}
				
			scope.pointcloud.material.clipMode = clipMode;
			scope.pointcloud.material.heightMin = heightMin;
			scope.pointcloud.material.heightMax = heightMax;
			scope.pointcloud.material.intensityMin = 0;
			scope.pointcloud.material.intensityMax = intensityMax;
			scope.pointcloud.showBoundingBox = showBoundingBox;
			scope.pointcloud.generateDEM = useDEMCollisions;
			scope.pointcloud.minimumNodePixelSize = minNodeSize;
			
			if(!freeze){
				scope.pointcloud.update(camera, scope.renderer);
			}
		}
		
		if(stats && showStats){
			document.getElementById("lblNumVisibleNodes").style.display = "";
			document.getElementById("lblNumVisiblePoints").style.display = "";
			stats.domElement.style.display = "";
		
			stats.update();
		
			if(scope.pointcloud){
				document.getElementById("lblNumVisibleNodes").innerHTML = "visible nodes: " + scope.pointcloud.numVisibleNodes;
				document.getElementById("lblNumVisiblePoints").innerHTML = "visible points: " + Potree.utils.addCommas(scope.pointcloud.numVisiblePoints);
			}
		}else if(stats){
			document.getElementById("lblNumVisibleNodes").style.display = "none";
			document.getElementById("lblNumVisiblePoints").style.display = "none";
			stats.domElement.style.display = "none";
		}
		
		camera.fov = fov;
		
		if(controls){
			controls.update(delta);
		}

		// update progress bar
		if(scope.pointcloud){
			var progress = scope.pointcloud.progress;
			
			progressBar.progress = progress;
			
			var message;
			if(progress === 0 || scope.pointcloud instanceof Potree.PointCloudArena4D){
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
				clipBoxes.push(boxInverse);
			}
		}
		
		for(var i = 0; i < scope.volumeTool.volumes.length; i++){
			var volume = scope.volumeTool.volumes[i];
			
			if(volume.clip){
				volume.updateMatrixWorld();
				var boxInverse = new THREE.Matrix4().getInverse(volume.matrixWorld);
			
				clipBoxes.push(boxInverse);
			}
		}
		
		if(scope.pointcloud){
			scope.pointcloud.material.setClipBoxes(clipBoxes);
		}
		
		
		TWEEN.update(timestamp);
	}

	this.useEarthControls = function(){
		if(controls){
			controls.enabled = false;
		}		

		controls = earthControls;
		controls.enabled = true;
	}

	this.useFPSControls = function(){
		if(controls){
			controls.enabled = false;
		}

		controls = fpControls;
		controls.enabled = true;
		
		controls.moveSpeed = scope.pointcloud.boundingSphere.radius / 6;
	}

	this.useOrbitControls = function(){
		if(controls){
			controls.enabled = false;
		}
		
		controls = orbitControls;
		controls.enabled = true;
		
		if(scope.pointcloud){
			controls.target.copy(scope.pointcloud.boundingSphere.center.clone().applyMatrix4(scope.pointcloud.matrixWorld));
		}
	};

	var PotreeRenderer = function(){

		this.render = function(){
			{// resize
				var width = renderArea.clientWidth;
				var height = renderArea.clientHeight;
				var aspect = width / height;
				
				camera.aspect = aspect;
				camera.updateProjectionMatrix();
				
				scope.renderer.setSize(width, height);
			}
			

			// render skybox
			if(showSkybox){
				skybox.camera.rotation.copy(camera.rotation);
				scope.renderer.render(skybox.scene, skybox.camera);
			}else{
				scope.renderer.render(sceneBG, cameraBG);
			}
			
			if(scope.pointcloud){
				if(scope.pointcloud.originalMaterial){
					scope.pointcloud.material = scope.pointcloud.originalMaterial;
				}
				
				var bbWorld = Potree.utils.computeTransformedBoundingBox(scope.pointcloud.boundingBox, scope.pointcloud.matrixWorld);
				
				scope.pointcloud.visiblePointsTarget = pointCountTarget * 1000 * 1000;
				scope.pointcloud.material.size = pointSize;
				scope.pointcloud.material.opacity = opacity;
				scope.pointcloud.material.pointColorType = pointColorType;
				scope.pointcloud.material.pointSizeType = pointSizeType;
				scope.pointcloud.material.pointShape = (quality === "Circles") ? Potree.PointShape.CIRCLE : Potree.PointShape.SQUARE;
				scope.pointcloud.material.interpolate = (quality === "Interpolation");
				scope.pointcloud.material.weighted = false;
			}
			
			// render scene
			scope.renderer.render(scene, camera);
			scope.renderer.render(scenePointCloud, camera);
			
			profileTool.render();
			volumeTool.render();
			
			scope.renderer.clearDepth();
			scope.measuringTool.render();
			transformationTool.render();
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
			depthMaterial.minSize = 2;
						
			attributeMaterial.pointShape = Potree.PointShape.CIRCLE;
			attributeMaterial.interpolate = false;
			attributeMaterial.weighted = true;
			attributeMaterial.minSize = 2;

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
			
			camera.aspect = width / height;
			camera.updateProjectionMatrix();
			
			scope.renderer.setSize(width, height);
			rtDepth.setSize(width, height);
			rtNormalize.setSize(width, height);
		};

		// render with splats
		this.render = function(renderer){
		
			var width = renderArea.clientWidth;
			var height = renderArea.clientHeight;
		
			initHQSPlats();
			
			resize(width, height);
			
			
			scope.renderer.clear();
			if(showSkybox){
				skybox.camera.rotation.copy(camera.rotation);
				scope.renderer.render(skybox.scene, skybox.camera);
			}else{
				scope.renderer.render(sceneBG, cameraBG);
			}
			scope.renderer.render(scene, camera);
			
			if(scope.pointcloud){
			
				depthMaterial.uniforms.octreeSize.value = scope.pointcloud.pcoGeometry.boundingBox.size().x;
				attributeMaterial.uniforms.octreeSize.value = scope.pointcloud.pcoGeometry.boundingBox.size().x;
			
				scope.pointcloud.visiblePointsTarget = pointCountTarget * 1000 * 1000;
				var originalMaterial = scope.pointcloud.material;
				
				{// DEPTH PASS
					depthMaterial.size = pointSize;
					depthMaterial.pointSizeType = pointSizeType;
					depthMaterial.screenWidth = width;
					depthMaterial.screenHeight = height;
					depthMaterial.uniforms.visibleNodes.value = scope.pointcloud.material.visibleNodesTexture;
					depthMaterial.uniforms.octreeSize.value = scope.pointcloud.pcoGeometry.boundingBox.size().x;
					depthMaterial.fov = camera.fov * (Math.PI / 180);
					depthMaterial.spacing = scope.pointcloud.pcoGeometry.spacing;
					depthMaterial.near = camera.near;
					depthMaterial.far = camera.far;
					depthMaterial.heightMin = heightMin;
					depthMaterial.heightMax = heightMax;
					depthMaterial.uniforms.visibleNodes.value = scope.pointcloud.material.visibleNodesTexture;
					depthMaterial.uniforms.octreeSize.value = scope.pointcloud.pcoGeometry.boundingBox.size().x;
					depthMaterial.bbSize = scope.pointcloud.material.bbSize;
					depthMaterial.treeType = scope.pointcloud.material.treeType;
					depthMaterial.uniforms.classificationLUT.value = scope.pointcloud.material.uniforms.classificationLUT.value;
					
					scenePointCloud.overrideMaterial = depthMaterial;
					scope.renderer.clearTarget( rtDepth, true, true, true );
					scope.renderer.render(scenePointCloud, camera, rtDepth);
					scenePointCloud.overrideMaterial = null;
				}
				
				{// ATTRIBUTE PASS
					attributeMaterial.size = pointSize;
					attributeMaterial.pointSizeType = pointSizeType;
					attributeMaterial.screenWidth = width;
					attributeMaterial.screenHeight = height;
					attributeMaterial.pointColorType = pointColorType;
					attributeMaterial.depthMap = rtDepth;
					attributeMaterial.uniforms.visibleNodes.value = scope.pointcloud.material.visibleNodesTexture;
					attributeMaterial.uniforms.octreeSize.value = scope.pointcloud.pcoGeometry.boundingBox.size().x;
					attributeMaterial.fov = camera.fov * (Math.PI / 180);
					attributeMaterial.spacing = scope.pointcloud.pcoGeometry.spacing;
					attributeMaterial.near = camera.near;
					attributeMaterial.far = camera.far;
					attributeMaterial.heightMin = heightMin;
					attributeMaterial.heightMax = heightMax;
					attributeMaterial.intensityMin = scope.pointcloud.material.intensityMin;
					attributeMaterial.intensityMax = scope.pointcloud.material.intensityMax;
					attributeMaterial.setClipBoxes(scope.pointcloud.material.clipBoxes);
					attributeMaterial.clipMode = scope.pointcloud.material.clipMode;
					attributeMaterial.bbSize = scope.pointcloud.material.bbSize;
					attributeMaterial.treeType = scope.pointcloud.material.treeType;
					attributeMaterial.uniforms.classificationLUT.value = scope.pointcloud.material.uniforms.classificationLUT.value;
					
					scenePointCloud.overrideMaterial = attributeMaterial;
					scope.renderer.clearTarget( rtNormalize, true, true, true );
					scope.renderer.render(scenePointCloud, camera, rtNormalize);
					scenePointCloud.overrideMaterial = null;
				}
				
				{// NORMALIZATION PASS
					normalizationMaterial.uniforms.depthMap.value = rtDepth;
					normalizationMaterial.uniforms.texture.value = rtNormalize;
					Potree.utils.screenPass.render(scope.renderer, normalizationMaterial);
				}
				
				scope.pointcloud.material = originalMaterial;
				
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
		var attributeMaterial = null;
		
		//var depthTexture = null;
		
		var rtColor = null;
		var gl = scope.renderer.context;
		
		var initEDL = function(){
			if(edlMaterial != null){
				return;
			}
			
			//var depthTextureExt = gl.getExtension("WEBGL_depth_texture"); 
			
			edlMaterial = new Potree.EyeDomeLightingMaterial();
			attributeMaterial = new Potree.PointCloudMaterial();
						
			attributeMaterial.pointShape = Potree.PointShape.CIRCLE;
			attributeMaterial.interpolate = false;
			attributeMaterial.weighted = false;
			attributeMaterial.minSize = 2;
			attributeMaterial.useLogarithmicDepthBuffer = false;
			attributeMaterial.useEDL = true;

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
			var width = renderArea.clientWidth;
			var height = renderArea.clientHeight;
			var aspect = width / height;
			
			var needsResize = (rtColor.width != width || rtColor.height != height);
		
			// disposal will be unnecessary once this fix made it into three.js master: 
			// https://github.com/mrdoob/three.js/pull/6355
			if(needsResize){
				rtColor.dispose();
			}
			
			camera.aspect = aspect;
			camera.updateProjectionMatrix();
			
			scope.renderer.setSize(width, height);
			rtColor.setSize(width, height);
		}

		this.render = function(){
		
			initEDL();
			
			resize();
			
			scope.renderer.clear();
			if(showSkybox){
				skybox.camera.rotation.copy(camera.rotation);
				scope.renderer.render(skybox.scene, skybox.camera);
			}else{
				scope.renderer.render(sceneBG, cameraBG);
			}
			scope.renderer.render(scene, camera);
			
			if(scope.pointcloud){
				var width = renderArea.clientWidth;
				var height = renderArea.clientHeight;
			
				var octreeSize = scope.pointcloud.pcoGeometry.boundingBox.size().x;
			
				scope.pointcloud.visiblePointsTarget = pointCountTarget * 1000 * 1000;
				var originalMaterial = scope.pointcloud.material;
				
				{// COLOR & DEPTH PASS
					attributeMaterial = scope.pointcloud.material;
					attributeMaterial.pointShape = Potree.PointShape.CIRCLE;
					attributeMaterial.interpolate = false;
					attributeMaterial.weighted = false;
					attributeMaterial.minSize = 2;
					attributeMaterial.useLogarithmicDepthBuffer = false;
					attributeMaterial.useEDL = true;
					
					attributeMaterial.size = pointSize;
					attributeMaterial.pointSizeType = pointSizeType;
					attributeMaterial.screenWidth = width;
					attributeMaterial.screenHeight = height;
					attributeMaterial.pointColorType = pointColorType;
					attributeMaterial.uniforms.visibleNodes.value = scope.pointcloud.material.visibleNodesTexture;
					attributeMaterial.uniforms.octreeSize.value = octreeSize;
					attributeMaterial.fov = camera.fov * (Math.PI / 180);
					attributeMaterial.spacing = scope.pointcloud.pcoGeometry.spacing;
					attributeMaterial.near = camera.near;
					attributeMaterial.far = camera.far;
					attributeMaterial.heightMin = heightMin;
					attributeMaterial.heightMax = heightMax;
					attributeMaterial.intensityMin = scope.pointcloud.material.intensityMin;
					attributeMaterial.intensityMax = scope.pointcloud.material.intensityMax;
					attributeMaterial.setClipBoxes(scope.pointcloud.material.clipBoxes);
					attributeMaterial.clipMode = scope.pointcloud.material.clipMode;
					attributeMaterial.bbSize = scope.pointcloud.material.bbSize;
					attributeMaterial.treeType = scope.pointcloud.material.treeType;
					attributeMaterial.uniforms.classificationLUT.value = scope.pointcloud.material.uniforms.classificationLUT.value;
					
					scope.pointcloud.material = attributeMaterial;
					for(var i = 0; i < scope.pointcloud.visibleNodes.length; i++){
						var node = scope.pointcloud.visibleNodes[i];
						node.sceneNode.material = attributeMaterial;
					}
					
					scope.renderer.clearTarget( rtColor, true, true, true );
					scope.renderer.render(scenePointCloud, camera, rtColor);
					
					scope.pointcloud.material = originalMaterial;
					for(var i = 0; i < scope.pointcloud.visibleNodes.length; i++){
						var node = scope.pointcloud.visibleNodes[i];
						node.sceneNode.material = originalMaterial;
					}
				}
				
				{ // EDL OCCLUSION PASS
					edlMaterial.uniforms.screenWidth.value = width;
					edlMaterial.uniforms.screenHeight.value = height;
					edlMaterial.uniforms.near.value = camera.near;
					edlMaterial.uniforms.far.value = camera.far;
					edlMaterial.uniforms.colorMap.value = rtColor;
					edlMaterial.uniforms.expScale.value = camera.far;
					edlMaterial.uniforms.edlScale.value = edlScale;
					edlMaterial.uniforms.radius.value = edlRadius;
					
					//edlMaterial.uniforms.depthMap.value = depthTexture;
				
					Potree.utils.screenPass.render(scope.renderer, edlMaterial);
				}	
				
				scope.renderer.render(scene, camera);
				
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
		
		if(useEDL){
			if(!edlRenderer){
				edlRenderer = new EDLRenderer();
			}
			edlRenderer.render(scope.renderer);
		}else if(quality === "Splats"){
			if(!highQualityRenderer){
				highQualityRenderer = new HighQualityRenderer();
			}
			highQualityRenderer.render(scope.renderer);
		}else{
			potreeRenderer.render();
		}
	};

	scope.initThree();

	requestAnimationFrame(loop);
};

Potree.Viewer.prototype = Object.create( THREE.EventDispatcher.prototype );