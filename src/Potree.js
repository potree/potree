const GLQueries = require('./webgl/GLQueries');

function Potree () {}

const context = require('./context');
Potree.version = context.version;

console.log('Potree ' + context.version.major + '.' + context.version.minor + context.version.suffix);

// LEGACY: this property exists just in case someone used it.
Object.defineProperty(Potree, 'pointBudget', {
	get: () => context.pointBudget,
	set: (value) => (context.pointBudget = value)
});

// LEGACY: this property exists just in case someone used it.
Object.defineProperty(Potree, 'framenumber', {
	get: () => context.framenumber,
	set: (value) => (context.framenumber = value)
});

// LEGACY: this property exists just in case someone used it.
Object.defineProperty(Potree, 'pointLoadLimit', {
	get: () => context.pointBudget,
	set: (value) => (context.pointBudget = value)
});

// LEGACY: this property exists just in case someone used it.
Object.defineProperty(Potree, 'measureTimings', {
	get: () => context.measureTimings,
	set: (value) => (context.measureTimings = value)
});

// contains WebWorkers with base64 encoded code
// Potree.workers = {};

Object.defineProperty(Potree, 'Shaders', {
	get: function () { throw new Error('legacy, has been removed for the greater good'); },
	set: function () { throw new Error('legacy, has been removed for the greater good'); }
});

Potree.webgl = {
	shaders: {},
	vaos: {},
	vbos: {}
};

Potree.scriptPath = context.scriptPath;
Potree.resourcePath = context.resourcePath;
Potree.workerPool = context.workerPool;

function legacyGL () {
	return window.viewer.renderer.getContext();
};

// LEGACY: this property exists just in case someone used it.
Object.defineProperty(Potree, 'timerQueries', {
	get: () => GLQueries.forGL(legacyGL()).queries,
	set: (value) => (GLQueries.forGL(legacyGL()).queries = value)
});

Potree.startQuery = function (name, gl) {
	return GLQueries.forGL(gl || legacyGL()).start(name);
};

Potree.endQuery = function (query, gl) {
	return GLQueries.forGL(gl || legacyGL()).end();
};

Potree.resolveQueries = function (gl) {
	return GLQueries.forGL(gl || legacyGL()).resolve();
};

// LEGACY: placeholder
Potree.getLRU = function () {
	Potree.lru = context.getLRU();
	return Potree.lru;
};

// LEGACY: placeholder
Potree.getDEMWorkerInstance = function () {
	Potree.DEMWorkerInstance = context.getDEMWorkerInstance();
	return Potree.DEMWorkerInstance;
};

Potree.Points = require('./Points');
Potree.MOUSE = require('./utils/Mouse');
Potree.DEMNode = require('./tree/DEMNode');
Potree.DEM = require('./tree/DEM');
Potree.PointCloudTreeNode = require('./tree/PointCloudTreeNode');
Potree.PointCloudTree = require('./tree/PointCloudTree');
Potree.WorkerPool = require('./WorkerPool');
Potree.POCLoader = require('./loader/POCLoader');
Potree.PointAttributeNames = require('./loader/PointAttributeNames');
Potree.PointAttributeTypes = require('./loader/PointAttributeTypes');
Potree.PointAttribute = require('./loader/PointAttribute');
Potree.PointAttributes = require('./loader/PointAttributes');
Potree.BinaryLoader = require('./loader/BinaryLoader');
Potree.GreyhoundBinaryLoader = require('./loader/GreyhoundBinaryLoader');
Potree.GreyhoundLoader = require('./loader/GreyhoundLoader');
Potree.LasLazLoader = require('./loader/LasLazLoader');
Potree.LasLazBatcher = require('./loader/LasLazBatcher');
Potree.Gradients = require('./materials/Gradients');
Potree.Classification = require('./materials/Classification');
Potree.PointSizeType = require('./materials/PointSizeType');
Potree.PointShape = require('./materials/PointShape');
Potree.PointColorType = require('./materials/PointColorType');
Potree.ClipMode = require('./materials/ClipMode');
Potree.TreeType = require('./materials/TreeType');
Potree.PointCloudMaterial = require('./materials/PointCloudMaterial');
Potree.EyeDomeLightingMaterial = require('./materials/EyeDomeLightingMaterial');
Potree.BlurMaterial = require('./materials/BlurMaterial');
Potree.InputHandler = require('./navigation/InputHandler');
Potree.FirstPersonControls = require('./navigation/FirstPersonControls');
Potree.GeoControls = require('./navigation/GeoControls');
Potree.OrbitControls = require('./navigation/OrbitControls');
Potree.EarthControls = require('./navigation/EarthControls');
Potree.Annotation = require('./Annotation');
Potree.Action = require('./Action');
Potree.Actions = require('./Actions');
Potree.ProfileData = require('./ProfileData');
Potree.PointCloudOctreeNode = require('./tree/PointCloudOctreeNode');
Potree.PointCloudOctree = require('./tree/PointCloudOctree');
Potree.PointCloudOctreeGeometry = require('./PointCloudOctreeGeometry');
Potree.PointCloudOctreeGeometryNode = require('./PointCloudOctreeGeometry');
Potree.PointCloudGreyhoundGeometry = require('./PointCloudGreyhoundGeometry');
Potree.PointCloudGreyhoundGeometryNode = require('./PointCloudGreyhoundGeometryNode');
Potree.utils = require('./utils');
Potree.Features = require('./Features');
Potree.TextSprite = require('./TextSprite');
Potree.AnimationPath = require('./AnimationPath');
Potree.Measure = require('./utils/Measure');
Potree.MeasuringTool = require('./utils/MeasuringTool');
Potree.Profile = require('./utils/Profile');
Potree.ProfileTool = require('./utils/ProfileTool');
Potree.TransformationTool = require('./utils/TransformationTool');
Potree.Volume = require('./utils/Volume');
Potree.VolumeTool = require('./utils/VolumeTool');
Potree.Box3Helper = require('./utils/Box3Helper');
Potree.Version = require('./Version');
Potree.GeoJSONExporter = require('./exporter/GeoJSONExporter');
Potree.DXFExporter = require('./exporter/DXFExporter');
Potree.CSVExporter = require('./exporter/CSVExporter');
Potree.LASExporter = require('./exporter/LASExporter');
Potree.PointCloudArena4DNode = require('./arena4d/PointCloudArena4DNode');
Potree.PointCloudArena4D = require('./arena4d/PointCloudArena4D');
Potree.PointCloudArena4DGeometryNode = require('./arena4d/PointCloudArena4DGeometryNode');
Potree.PointCloudArena4DGeometry = require('./arena4d/PointCloudArena4DGeometry');
Potree.View = require('./viewer/View');
Potree.Scene = require('./viewer/Scene');
Potree.Viewer = require('./viewer/Viewer');
Potree.ProfileWindow = require('./ProfileWindow');
Potree.ProfileWindowController = require('./ProfileWindowController');
Potree.MapView = require('./viewer/MapView');
Potree.GLProgram = require('./webgl/GLProgram');
Potree.updatePointClouds = require('./utils/updatePointClouds');
Potree.updateVisibility = require('./utils/updateVisibility');
Potree.updateVisibilityStructures = require('./utils/updateVisibilityStructures');
Potree.loadPointCloud = require('./utils/loadPointCloud');
Potree.CameraMode = require('./viewer/CameraMode');
Potree.NavigationCube = require('./viewer/NavigationCube');
Potree.ClipVolume = require('./utils/PolygonClipVolume');
Potree.PolygonClipVolume = require('./utils/PolygonClipVolume');
Potree.paramThreeToGL = require('./utils/paramThreeToGL');
Potree.Shader = require('./webgl/Shader');
Potree.WebGLBuffer = require('./webgl/WebGLBuffer');
Potree.WebGLTexture = require('./webgl/WebGLTexture');
Potree.Renderer = require('./Renderer');
Potree.InterleavedBuffer = require('./InterleavedBuffer');
Potree.InterleavedBufferAttribute = require('./InterleavedBufferAttribute');
Potree.toInterleavedBufferAttribute = require('./utils/toInterleavedBufferAttribute');
Potree.PointCloudSM = require('./utils/PointCloudSM');
Potree.PathAnimation = require('./PathAnimation');
Potree.updateVisibilityStructures = require('./utils/updateVisibilityStructures');
Potree.attributeLocations = require('./attributeLocations');

module.exports = Potree;
