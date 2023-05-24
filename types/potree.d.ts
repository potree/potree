import { Subject, Observable } from "rxjs";
import THREE, { Box3, BufferGeometry, Camera, DataTexture, Intersection, Light, Line, LineSegments, Material, Matrix4, Mesh, Object3D, OrthographicCamera, PerspectiveCamera, Ray, Renderer, Vector2, Vector3, WebGLRenderer } from "three";

export function loadPointCloud(path: string, name: string): Promise<PointCloudEvent>;

export interface PointCloudEvent {
	type: string;
	pointcloud: PointCloudTree;
}

export type Background = 'gradient' | 'black' | 'white' | 'none';

export interface Classification {
	visible: boolean,
	name: string,
	color: number[]
}

export interface Clock {
	autoStart: boolean,
	startTime: number,
	oldTime: number,
	elapsedTime: number,
	running: boolean
}

export class EventDispatcher {
	constructor();
	_listeners: any;
	addEventListener(type: string, listener: any): void;
	hasEventListener(type: string, listener: any): boolean;
	removeEventListener(type: string, listener: any): void;
	removeEventListeners(type: string): void;
	dispatchEvent(event: any): void;
}

export class InputHandler extends EventDispatcher {
	constructor();
	startDragging(m: Object3D): void;
	getHoveredElements(): Array<Intersection>;
	interactiveScenes: THREE.Scene[];
	scene: THREE.Scene | null;
}

export class Tool extends EventDispatcher {
	constructor(viewer: Viewer);
	startInsertion(args: any): void;
	render(): void;
	update(): void;
}

export type TBaseEvent<T, O, OT extends string, S> = {
	[key in OT]?: O;
} & {
	type: T; source: S;
};

export type InsertionEvent = TBaseEvent<'start_insertion' | 'stop_insertion' | 'point_inserted', Mesh, 'point', RezocassiniTool>;
export class RezocassiniTool extends Tool {
	override startInsertion(pointsNumber: number): void;
	pauseInsertion(): void;
	resumeInsertion(): void;
	insertPoint(position: Vector3): void;
	cancelLastInsertion(): Mesh | undefined;
	private _subject: Subject<InsertionEvent>;
	events$: Observable<InsertionEvent>;
	inserting: boolean;
	private count: number;
	points: Mesh[];
}

export class Measure extends Object3D {
	getTotalDistance(): number;
}
interface MeasuringToolArgs {
	showDistances: boolean;
	showArea: boolean;
	showAngles: boolean;
	showCoordinates: boolean;
	showHeight: boolean;
	showCircle: boolean;
	showAzimuth: boolean;
	showEdges: boolean;
	closed: boolean;
	maxMarkers: number;
}
export type MeasureEvent = TBaseEvent<'start_inserting_measurement' | 'cancel_insertions' | 'marker_inserted', Mesh, 'measure', MeasuringTool>;
export class MeasuringTool extends Tool {
	startInsertion(args: MeasuringToolArgs): Measure;
	private _subject: Subject<MeasureEvent>;
	events$: Observable<MeasureEvent>;
}

export class CameraSyncTool extends Tool {
	startSync(viewer: Viewer): void;
	stopSync(): void;
}

export class Controls extends EventDispatcher {
	constructor(viewer: Viewer);
	setScene(scene: Scene): void;
	stop(): void;
	zoomToLocation(mouse: any): void; // @FIXME mouse any ?
	viewer: Viewer;
	renderer: Renderer;
	scene: Scene;
	sceneControls: THREE.Scene;
	rotationSpeed: number;
	fadeFactor: number;
	yawDelta: number;
	pitchDelta: number;
	panDelta: Vector2;
	radiusDelta: number;
	doubleClockZoomEnabled: boolean;
	tweens: any[];
}

export type CameraOptionsKey = 'ORTHOGRAPHIC' | 'PERSPECTIVE' | 'VR';
export type CameraOptions = 0 | 1 | 2;
export type CameraModeType = { [key in CameraOptionsKey]: CameraOptions };

export const CameraMode: CameraModeType;

export class Viewer extends EventDispatcher {

	constructor(container: HTMLElement);

	annotationTool: Tool;
	background: Background;
	cameraSyncTool: CameraSyncTool;
	classifications: { [key: string]: Classification };
	clipMethod: number; // @ENUM A RETROUVER
	clipTask: number; // @ENUM A RETROUVER
	clippingTool: Tool;
	compass: any; // @TODO
	controls: Controls;
	customControls: Controls;
	description: string
	deviceControls: Controls;
	earthControls: Controls;
	edlOpacity: number;
	edlRadius: number;
	edlRenderer: any; // @TODO
	edlStrength: number;
	elMessages: any; //@TODO
	elevationGradientRepeat: number;
	filterGPSTimeRange: number[];
	filterNumberOfReturnsRange: number[];
	filterPointSourceIDRange: number[];
	filterReturnNumberRange: number[];
	fov: number;
	fpControls: Controls;
	freeze: boolean;
	generateDEM: boolean;
	getControls(): Controls;
	guiLoadTasks: Function[];
	guiLoaded: boolean;
	inputHandler: InputHandler;
	isFlipYZ: boolean;
	lengthUnit: { code: string; unitspermeter: number };
	lengthUnitDisplay: { code: string; unitspermeter: number };
	loadGUI: Function;
	measuringTool: MeasuringTool;
	messages: string[];
	minNodeSize: number;
	moveSpeed: number;
	navigationCube: Object3D;
	onAnnotationAdded: Function;
	onVrListeners: any[];
	orbitControls: Controls;
	overlay: Scene;
	overlayCamera: OrthographicCamera;
	pRenderer: Renderer;
	pointCloudLoadedCallback: Function;
	potreeRenderer: Renderer;
	profileTool: Tool;
	renderArea: HTMLElement;
	renderer: WebGLRenderer;
	rezocassiniTool: RezocassiniTool;
	scaleFactor: number;
	scene: Scene;
	sceneVR: Scene;
	server: any;
	setControls(controls: Controls): void;
	setCameraMode(mode: number): void;
	shadowTestCam: PerspectiveCamera;
	showAnnotations: boolean;
	showBoundingBox: boolean;
	skybox: any; // @TODO
	transformationTool: Tool;
	useDEMCollisions: boolean;
	useEDL: boolean;
	volumeTool: Tool;
	vrControls: Controls;
	fitToScreen(): void;
}

export class Scene extends EventDispatcher {
	constructor();

	annotations: any[];
	scene: THREE.Scene;
	sceneBG: Scene;
	scenePointCloud: THREE.Scene;
	cameraP: PerspectiveCamera;
	cameraO: OrthographicCamera;
	cameraVR: PerspectiveCamera;
	cameraBG: Camera;
	cameraScreenSpace: OrthographicCamera;
	cameraMode: number; //@TODO ENUM A RETROUVER
	overrideCamera: null;
	pointclouds: PointCloudTree[];
	measurements: any[];
	profiles: any[];
	volumes: any[];
	polygonClipVolumes: any[];
	cameraAnimations: any[];
	orientedImages: any[];
	images360: any[];
	geopackages: any[];
	fpControls: Controls;
	orbitControls: Controls;
	earthControls: Controls;
	geoControls: Controls;
	deviceControls: Controls;
	inputHandler: EventDispatcher;
	view: any;
	directionalLight: Light;
	addPointCloud(pointcloud: PointCloudTree): void;
	getActiveCamera(): Camera;
}

export class PointCloudTree extends Object3D {
	initialized(): boolean;
}

export class PointCloudOctree extends PointCloudTree {
	constructor(geometry: BufferGeometry, material: Material);
}

export class Utils {
	static loadShapefileFeatures(file: any, callback: any): Promise<void>;
	static toString(value: any): string;
	static normalizeURL(url: any): string;
	static pathExists(url: any): boolean;
	static debugSphere(parent: any, position: any, scale: any, color: any): Mesh;
	static debugLine(parent: any, start: any, end: any, color: any): { node: Line, set: (start: any, end: any) => void };
	static debugCircle(parent: any, center: any, radius: any, normal: any, color: any): void;
	static debugBox(parent: any, box: any, transform?: Matrix4, color?: number): void;
	static debugPlane(parent: any, plane: any, size?: number, color?: number): void;
	static computeTransformedBoundingBox(box: any, transform: any): Box3;
	static addCommas(nStr: any): string;
	static removeCommas(str: any): any;
	static createWorker(code: any): Worker;
	static moveTo(scene: any, endPosition: any, endTarget: any): void;
	static loadSkybox(path: any): { camera: PerspectiveCamera, scene: Scene, parent: Object3D };
	static createGrid(width: any, length: any, spacing: any, color: any): LineSegments;
	static createBackgroundTexture(width: any, height: any): DataTexture;
	static getMousePointCloudIntersection(mouse: any, camera: Camera, viewer: Viewer, pointclouds: PointCloudOctree, params?: {}): {
		location: any;
		distance: number;
		pointcloud: any;
		point: any;
	} | null;
	static pixelsArrayToImage(pixels: any, width: any, height: any): HTMLImageElement;
	static pixelsArrayToDataUrl(pixels: any, width: any, height: any): string;
	static pixelsArrayToCanvas(pixels: any, width: any, height: any): HTMLCanvasElement;
	static removeListeners(dispatcher: EventDispatcher, type: any): void;
	static mouseToRay(mouse: any, camera: Camera, width: any, height: any): Ray;
	static projectedRadius(radius: any, camera: Camera, distance: any, screenWidth: any, screenHeight: any): any;
	static projectedRadiusPerspective(radius: any, fov: any, distance: any, screenHeight: any): number;
	static projectedRadiusOrtho(radius: any, proj: any, screenWidth: any, screenHeight: any): any;
	static topView(camera: Camera, node: any): void;
	static leftView(camera: Camera, node: any): void;
	static rightView(camera: Camera, node: any): void;
	static frontView(camera: Camera, node: any): void;
	static findClosestGpsTime(target: any, viewer: Viewer): { node: any, index: number, position: Vector3 };
	static frustumSphereIntersection(frustum: any, sphere: any): 0 | 1 | 2;
	static generateDataTexture(width: any, height: any, color: any): DataTexture;
	static getParameterByName(name: any): string | null;
	static setParameter(name: any, value: any): void;
	static createChildAABB(aabb: any, index: any): Box3;
	static clipboardCopy(text: any): void;
	static getMeasurementIcon(measurement: any): string | undefined;
	static lineToLineIntersection(P0: any, P1: any, P2: any, P3: any): any;
	static computeCircleCenter(A: any, B: any, C: any): any;
	static getNorthVec(p1: any, distance: any, projection: any): Vector3;
	static computeAzimuth(p1: any, p2: any, projection: any): number;
	static loadScript(url: any): Promise<any>;
	static createSvgGradient(scheme: any): SVGSVGElement;
	static waitAny(promises: any): Promise<any>;
}
