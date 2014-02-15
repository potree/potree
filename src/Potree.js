

/**
 * holds the WebGL context
 */
var gl = null;
//Config.shaderDir="resources/shader";

/**
 *
 * @class
 */
function Potree(){
	this.camHandler = null;
}

Potree.shaderDir="resources/shader";

/**
 * a list of all js files that must be included by Potree
 */
Potree.includes = [
	"libs/mjs/mjs.js",
	"src/extensions/Array.js",
	"src/extensions/mjs.js",
	"src/extensions/String.js",
	"src/extensions/ArrayBuffer.js",
	"src/extensions/Float32Array.js",
	"src/utils/utils.js",
	"src/KeyListener.js",
	"src/KeyCodes.js",
	"src/MouseListener.js",
	"src/Mouse.js",
	"src/ResourceManager/TextureManager.js",
	"src/ResourceManager/MaterialManager.js",
	"src/shader/Shader.js",
	"src/utils/Plane.js",
	"src/utils/Frustum.js",
	"src/rendering/Renderer.js",
	"src/scenegraph/AABB.js",
	"src/scenegraph/SceneNode.js",
	"src/scenegraph/Camera.js",
	"src/scenegraph/Scene.js",
	"src/scenegraph/MeshNode.js",
	"src/scenegraph/Light.js",
	"src/scenegraph/Sphere.js",
//	"src/scenegraph/Plane.js",
	"src/objects/Mesh.js",
	"src/Viewport.js",
	"src/navigation/CamHandler.js",
	"src/navigation/FreeFlightCamHandler.js",
	"src/navigation/OrbitCamHandler.js",
	"src/Framebuffer.js",
	"src/FramebufferFloat32.js",
	"src/ResourceManager/ShaderManager.js",
	"src/utils/MeshUtils.js",
	"src/scenegraph/PointcloudOctreeSceneNode.js",
	"src/scenegraph/PointCloudSceneNode.js",
	"src/objects/PointCloud.js",
	"src/objects/PointcloudOctreeNode.js",
	"src/objects/PointcloudOctree.js",
	"src/materials/Material.js",
	"src/materials/WeightedPointSizeMaterial.js",
	"src/materials/FixedPointSizeMaterial.js",
	"src/materials/PointCloudMaterial.js",
	"src/materials/FlatMaterial.js",
	"src/materials/PhongMaterial.js",
	"src/materials/FilteredSplatsMaterial.js",
	"src/materials/GaussFillMaterial.js",
	"src/loader/POCLoader.js",
	"src/loader/PointAttributes.js",
	"src/loader/ProceduralPointcloudGenerator.js",
	"src/loader/PlyLoader.js",
	"src/utils/LRU.js",
                  ];

Potree.Settings = {};

//settings
Potree.Settings.showBoundingBoxes = false;
Potree.Settings.LOD = true;
Potree.Settings.LODMultiplicator = 10.0;
Potree.Settings.pointSize = 1;
Potree.Settings.backgroundColor = [0,0,0,1];//[ 0.3, 0.3, 0.4, 1 ];
Potree.Settings.showGrid = false;
Potree.Settings.frustumCulling = true;

//other
Potree.gridSceneNode = null;
Potree.canvas = null;
Potree.initialized = false;
Potree.updateHandlers = [];
Potree.drawHandlers = [];
var renderer = null;
Potree.fpsHistory = [];
Potree.fps = 0;


/**
 * includes the javascript file at {path} by adding a script tag to the document.
 * 
 * @param path Potree library path
 * @returns
 */
Potree.importScripts = function(path){
	var importText = "";
	for(var i = 0; i < Potree.includes.length; i++){
		var include = Potree.includes[i];
		//document.write("<scri" + "pt type=\"text/javascript\" src=\"" + path + "/" +include+"\"></scri" + "pt>");
		importText += "<scri" + "pt type=\"text/javascript\" src=\"" + path + "/" +include+"\"></scri" + "pt>\n";
	}
	document.write(importText);
};


Potree.isWebGLEnabled = function(canvas){
	var names = [ "webgl", "experimental-webgl", "moz-webgl", "webkit-3d" ];
	for ( var i = 0; names.length > i; i++) {
		try {
			gl = canvas.getContext(names[i], {
				antialias : false
			});
			if (gl) {
				break;
			}
		} catch (e) {
		}
	}
	if (!gl) {
		console.log("No known OpenGL context detected! Is it enabled?");
		return false;
	}
	
	return true;
};

/**
 * 
 * @param canvas the canvas element for rendering.
 * Potree can only be intialized once.
 * @returns
 */
Potree.init = function(canvas) {
	if(Potree.initialized){
		console.log("Potree has already been initialized");
		return true;
	}
	
	Potree.canvas = canvas;
	Potree.currentScene = new Scene("default");
	
	if(!Potree.initGL()){
		// init failed -> display error message
		var soSorry = document.createElement("div");
		var msg = "<br>Could not create a WebGL context. ";
		msg += "<br><br>Try using <a href='http://www.mozilla.org' style='color: red'>Firefox</a> ";
		msg += "or <a href='www.google.com/chrome/' style='color: red'>Chrome</a>.";
		msg += "<br>Other WebGL enabled browsers are not supported but they might work as well.";
		soSorry.innerHTML = msg;
		soSorry.style.fontSize = "large";
		soSorry.style.fontWeight = "bold";
		soSorry.style.color = "#FFF";
		soSorry.style.textShadow = "black 0 0 4px, black 0 0 4px, black 0 0 4px, black 0 0 4px, black 0 0 4px, black 0 0 4px";
		soSorry.style.textAlign = "center";
		soSorry.style.verticalAlign = "bottom";
		soSorry.style.height = "100%";
		canvas.parentNode.replaceChild(soSorry, canvas);
		
		return false;
	}
	
	{// register mouse and key listener
		var mousewheelevt=(/Firefox/i.test(navigator.userAgent))? "DOMMouseScroll" : "mousewheel"; //FF doesn't recognize mousewheel as of FF3.x
		if (document.attachEvent){ //if IE (and Opera depending on user setting)
			document.attachEvent("on"+mousewheelevt,MouseListener.mouseWheel);
		} else if (document.addEventListener){ //WC3 browsers
			document.addEventListener(mousewheelevt, MouseListener.mouseWheel, false);
		}
		document.onkeydown = KeyListener.keyDown;
		document.onkeyup = KeyListener.keyUp;
		document.onkeypress = KeyListener.keyPress;
		document.onmousedown = MouseListener.mouseDown;
		document.onmouseup = MouseListener.mouseUp;
		document.onmousemove = MouseListener.mouseMove;
	}
	
	
	{// install cam handler
		Potree.camHandler = new FreeFlightCamHandler(Potree.currentScene.activeCamera);
		MouseListener.addListener(Potree.camHandler);
		canvas.onfocus = function(){
			KeyListener.addListener(Potree.camHandler);
			MouseListener.addListener(Potree.camHandler);
		};
	
		canvas.onblur= function(){
			KeyListener.removeListener(Potree.camHandler);
			MouseListener.removeListener(Potree.camHandler);
		};
	}
	
	Potree.initialized = true;
	
	// shaders
	var drawTextureShader = new Shader("drawTexture", "drawTexture.vs", "drawTexture.fs");
	
	// materials
	var pointCloudMaterial = new PointCloudMaterial("pointCloud");
	var defaultMaterial = new FlatMaterial("default");
	
//	Potree.mainLoop();
	setInterval(Potree.mainLoop, 33);
	
	return Potree.initialized;
};

Object.defineProperty(Potree, "camHandler", {
	get: function(){
		return Potree._camHandler;
	},
	set: function(camHandler){
		KeyListener.removeListener(Potree._camHandler);
		MouseListener.removeListener(Potree._camHandler);
		Potree._camHandler = camHandler;
		KeyListener.addListener(Potree._camHandler);
		MouseListener.addListener(Potree._camHandler);
	}
});

/**
 * creates the WebGL context
 * 
 */
Potree.initGL = function() {
	
	viewportWidth = Potree.canvas.width;
	viewportHeight = Potree.canvas.height;

	var names = [ "webgl", "experimental-webgl", "moz-webgl", "webkit-3d" ];
	for ( var i = 0; names.length > i; i++) {
		try {
			gl = Potree.canvas.getContext(names[i], {
				antialias : false
			});
			if (gl) {
				break;
			}
		} catch (e) {
		}
	}
	if (!gl) {
		console.log("No known OpenGL context detected! Is it enabled?");
		return false;
	}

	// extensions
	if (!gl.getExtension("OES_texture_float")) {
		console.log("some functions require OES_texture_float extension");
		return false;
	}
	
	// basic settings
	var cColor = Potree.Settings.backgroundColor;
	gl.clearColor(cColor.r, cColor.g, cColor.b, cColor.a);
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

	return true;
};


/**
 * draws a frame to the canvas
 */
Potree.draw = function() {
	if(renderer === null){
		renderer = new Renderer(Potree.currentScene, Framebuffer.getSystemBuffer());
	}
	
	Potree.canvas.width = Potree.canvas.clientWidth;
	Potree.canvas.height = Potree.canvas.clientHeight;

	var cam = renderer.scene.activeCamera;
	cam.aspectRatio = Potree.canvas.clientWidth / Potree.canvas.clientHeight;
	renderer.viewport(0, 0, Potree.canvas.clientWidth, Potree.canvas.clientHeight);
	renderer.render();
	
	for(var i = 0; i < Potree.drawHandlers.length; i++) {
		var drawHandler = Potree.drawHandlers[i];
		drawHandler();
	}
};

Potree.mainLoop = function mainLoop(){
	Potree.calculateTimeSinceLastFrame();
	
	Potree.update(timeSinceLastFrame);
	Potree.draw();
	
	// with 0ms, interaction becomes a lot slower in firefox.
//	setTimeout(mainLoop, 10);
};

var lastLoopTime = null;
var timeSinceLastFrame = null;
Potree.calculateTimeSinceLastFrame = function calculateTimeSinceLastFrame(){
	var newDrawTime = new Date().getTime();
	if (lastLoopTime !== null) {
		timeSinceLastFrame = (newDrawTime - lastLoopTime) / 1000.0;
	}else{
		timeSinceLastFrame = 0;
	}
	lastLoopTime = new Date().getTime();

};


Potree.update = function update(time){
	
	var i;
	var fps = 1 / time;
	
	Potree.fpsHistory.push(fps);
	if(Potree.fpsHistory.length > 10){
		Potree.fpsHistory.splice(0, 1);
	}
	var mean = 0;
	for(i = 0; i < Potree.fpsHistory.length; i++){
		mean += Potree.fpsHistory[i];
	}
	mean = mean / Potree.fpsHistory.length;
	Potree.fps = mean.toFixed(2);
	
	Potree.currentScene.rootNode.addTime(time);
	PointcloudOctreeNode.nodesLoadedThisFrame = 0;
	
	Potree.camHandler.addTime(time);
	
	for(i = 0; i < Potree.updateHandlers.length; i++) {
		var updateHandler = Potree.updateHandlers[i];
		updateHandler(time);
	}
};








