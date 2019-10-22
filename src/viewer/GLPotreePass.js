
import {ClipTask, ClipMethod, CameraMode, LengthUnits} from "../defines.js";
import {Renderer} from "../PotreeRenderer.js";
import {PotreeRenderer} from "./PotreeRenderer.js";
import {EDLRenderer} from "./EDLRenderer.js";
import {HQSplatRenderer} from "./HQSplatRenderer.js";
import {ClippingTool} from "../utils/ClippingTool.js";
import {BoxVolume} from "../utils/Volume.js";
import {Features} from "../Features.js";
import {Message} from "../utils/Message.js";

import { EventDispatcher } from "../EventDispatcher.js";

export class GLPotreePass extends ZeaEngine.GLPass {
	constructor(){

		super();

		// From: Scene.js
		this.pointclouds = [];

		this.measurements = [];
		this.profiles = [];
		this.volumes = [];
		this.polygonClipVolumes = [];

		// this.scenePointCloud = new THREE.Scene();
		// this.cameraP = new THREE.PerspectiveCamera(this.fov, 1, 0.1, 1000*1000);
		// this.cameraP.up.set(0, 0, 1);
		// this.cameraP.position.set(1000, 1000, 1000);

		// From viewer.js
		
		this.isFlipYZ = false;
		this.useDEMCollisions = false;
		this.generateDEM = false;
		this.minNodeSize = 30;
		this.edlStrength = 1.0;
		this.edlRadius = 1.4;
		this.useEDL = false;
		this.classifications = {
			0: { visible: true, name: 'never classified' },
			1: { visible: true, name: 'unclassified' },
			2: { visible: true, name: 'ground' },
			3: { visible: true, name: 'low vegetation' },
			4: { visible: true, name: 'medium vegetation' },
			5: { visible: true, name: 'high vegetation' },
			6: { visible: true, name: 'building' },
			7: { visible: true, name: 'low point(noise)' },
			8: { visible: true, name: 'key-point' },
			9: { visible: true, name: 'water' },
			12: { visible: true, name: 'overlap' }
		};

		this.lengthUnit = LengthUnits.METER;
		this.lengthUnitDisplay = LengthUnits.METER;

		this.showBoundingBox = false;
		this.showAnnotations = true;
		this.freeze = false;
		this.clipTask = ClipTask.HIGHLIGHT;
		this.clipMethod = ClipMethod.INSIDE_ANY;

		this.filterReturnNumberRange = [0, 7];
		this.filterNumberOfReturnsRange = [0, 7];
		this.filterGPSTimeRange = [0, Infinity];
		this.filterGPSTimeExtent = [0, 1];

		this.potreeRenderer = null;
		this.edlRenderer = null;
		this.renderer = null;
		this.pRenderer = null;

		this.scene = null;
		this.overlay = null;
		this.overlayCamera = null;

		this.inputHandler = null;

		this.clippingTool =  null;
		this.transformationTool = null;
		this.navigationCube = null;
		
		this.skybox = null;
		this.clock = new THREE.Clock();
		this.background = null;
		this.defaultGPSTimeChanged = false;

		///////////////////
		// Add Parameters
		


		
		this.octrees = [];
    	this.glshader = this.__renderer.getOrCreateShader("PointCloudShader")
		
		const shadowMaps = []
		const numSnapshots = 0;
		const numClipBoxes = 0;
		const numClipSpheres = 0;
		const numClipPolygons = 0;
		let defines = [
			`#define num_shadowmaps ${shadowMaps.length}`,
			`#define num_snapshots ${numSnapshots}`,
			`#define num_clipboxes ${numClipBoxes}`,
			`#define num_clipspheres ${numClipSpheres}`,
			`#define num_clippolygons ${numClipPolygons}`,
		];
	}

	// Reference: ../PotreeRenderer.renderOctree(){
	render(renderstate) {

		const gl = this.__gl;
	
		gl.disable(gl.BLEND);
		gl.depthMask(true);
		gl.enable(gl.DEPTH_TEST);

		// const camera = this.scene.getActiveCamera();
		// this.pRenderer.render(this.scene.scenePointCloud, camera, null, {
		// 	clipSpheres: this.scene.volumes.filter(v => (v instanceof Potree.SphereVolume)),
		// });

		this.glshader.bind(renderstate);

		// RENDER
		for (const octree of this.octrees) {
			this.render(renderstate);
		}
	}

}