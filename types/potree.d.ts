import { Subject, Observable } from "rxjs";
import { Box3, BufferGeometry, Camera, DataTexture, Intersection, Light, Line, LineSegments, Material, Matrix4, Mesh, Object3D, OrthographicCamera, PerspectiveCamera, RawShaderMaterial, Ray, Renderer, Scene as THREEScene, Vector2, Vector3, WebGLRenderer } from "three";

export interface BoundingBox {
	lx: number;
	ly: number;
	lz: number;
	ux: number;
	uy: number;
	uz: number;
}

export interface PointCloudConfig {
	boundingBox: BoundingBox;
	hierarchyStepSize: number;
	octreeDir: string;
	pointAttributes: string;
	points: number;
	projection: string;
	scale: number;
	spacing: number;
	tightBoundingBox: BoundingBox;
	version: string;
}

export function loadPointCloud(pointcloud_config: PointCloudConfig, name: string): Promise<PointCloudEvent>;

export interface PointCloudEvent {
	type: string;
	pointcloud: PointCloudTree;
}

export type BackgroundKeys = 'SKYBOX' | 'GRADIENT' | 'BLACK' | 'WHITE' | 'NONE';
export type BackgroundValues = 'skybox' | 'gradient' | 'black' | 'white' | 'null';
export type BackgroundType = KeyValueBaseType<BackgroundKeys, BackgroundValues>;
export const BackgroundColors: BackgroundType;


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
	interactiveScenes: THREEScene[];
	scene: THREEScene | null;
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

export type MarkerEvent = TBaseEvent<'marker_dropped', Measure, 'measurement', Measure>;
export class Measure extends Object3D {
	getTotalDistance(): number;
	events$: Observable<MarkerEvent>;
	spheres: Mesh[];
	get setEdgesTo(): number | null;
	set setEdgesTo(value: number | null);
	get showEdges(): boolean;
	set showEdges(value: boolean);
	get showEdgesLabels(): boolean;
	set showEdgesLabels(value: boolean);
}
interface MeasuringToolArgs {
	showDistances?: boolean;
	showArea?: boolean;
	showAngles?: boolean;
	showCoordinates?: boolean;
	showHeight?: boolean;
	showCircle?: boolean;
	showAzimuth?: boolean;
	showEdges?: boolean;
	closed?: boolean;
	maxMarkers?: number;
	disableCancel?: boolean;
}
export type MeasureEvent = TBaseEvent<'start_inserting_measurement' | 'cancel_insertions' | 'marker_inserted' | 'measure_done', Mesh, 'measure', MeasuringTool>;
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
	sceneControls: THREEScene;
	rotationSpeed: number;
	fadeFactor: number;
	yawDelta: number;
	pitchDelta: number;
	panDelta: Vector2;
	radiusDelta: number;
	doubleClockZoomEnabled: boolean;
	tweens: any[];
}

export type KeyValueBaseType<K extends string | number | symbol, V> = { [key in K]: V };

export type ClipTaskKeys = 'NONE' | 'HIGHLIGHT' | 'SHOW_INSIDE' | 'SHOW_OUTSIDE';
export type ClipTaskValues = 0 | 1 | 2 | 3;
export type ClipTaskType = KeyValueBaseType<ClipTaskKeys, ClipTaskValues>;
export const ClipTask: ClipTaskType;

export type ClipMethodKeys = 'INSIDE_ANY' | 'INSIDE_ALL';
export type ClipMethodValues = 0 | 1;
export type ClipMethodType = KeyValueBaseType<ClipMethodKeys, ClipMethodValues>;
export const ClipMethod: ClipMethodType;

export type ElevationGradientRepeatKeys = 'CLAMP' | 'REPEAT' | 'MIRRORED_REPEAT';
export type ElevationGradientRepeatValues = 0 | 1 | 2;
export type ElevationGradientRepeatType = KeyValueBaseType<ElevationGradientRepeatKeys, ElevationGradientRepeatValues>;
export const ElevationGradientRepeat: ElevationGradientRepeatType;

export type PointSizeTypeKeys = 'FIXED' | 'ATTENUATED' | 'ADAPTIVE';
export type PointSizeTypeValues = 0 | 1 | 2;
export type PointSizeTypeType = KeyValueBaseType<PointSizeTypeKeys, PointSizeTypeValues>;
export const PointSizeType: PointSizeTypeType;

export type PointShapeKeys = 'SQUARE' | 'CIRCLE' | 'PARABOLOID';
export type PointShapeValues = 0 | 1 | 2;
export type PointShapeType = KeyValueBaseType<PointShapeKeys, PointShapeValues>
export const PointShape: PointShapeType;

export type TreeTypeKeys = 'OCTREE' | 'KDTREE';
export type TreeTypeValues = 0 | 1 | 2;
export type TreeTypeType = KeyValueBaseType<TreeTypeKeys, TreeTypeValues>;
export const TreeType: TreeTypeType;

export type LengthUnitKeys = 'METER' | 'FEET' | 'INCH';
export type LengthUnitCodes = 'm' | 'ft' | '\u2033';
export type LengthUnitValues = { code: LengthUnitCodes , unitspermeter: number };
export type LengthUnitType = KeyValueBaseType<LengthUnitKeys, LengthUnitValues>
export const LengthUnits: LengthUnitType;

export type CameraOptionsKey = 'ORTHOGRAPHIC' | 'PERSPECTIVE' | 'VR';
export type CameraOptions = 0 | 1 | 2;
export type CameraModeType = KeyValueBaseType<CameraOptionsKey, CameraOptions>;
export const CameraMode: CameraModeType;

export type MaterialAttributeOptionsKey = 'COLOR' | 'RGBA' | 'ELEVATION' | 'INTENSITY' | 'INTENSITY_GRADIENT' | 'CLASSIFICATION';
export type MaterialAttributeOptionsValue = 'color' | 'rgba' | 'elevation' | 'intensity' | 'intensity gradient' | 'classification';
export type MaterialAttributeOptionsType = KeyValueBaseType<MaterialAttributeOptionsKey, MaterialAttributeOptionsValue>;
export const MaterialAttributeOptions: MaterialAttributeOptionsType;

export type ControlsOptionsKeys = 'EARTH' | 'FPS' | 'ORBIT' /* | 'CUSTOM' */;
export type ControlsOptionsValues = 'earthControls' /* | 'fpControls' */ | 'orbitControls' | 'customControls';
export type ControlsOptionsType = KeyValueBaseType<ControlsOptionsKeys, ControlsOptionsValues>;
export const ControlsOptions: ControlsOptionsType;

export class Volume extends Object3D {
	constructor(args?: { clip?: boolean, modifiable?: boolean });
	get clip(): boolean;
	set clip(value: boolean);
	get modifieable(): boolean;
	set modifieable(value: boolean);
	getVolume(): number;
}

export class BoxVolume extends Volume {
	override getVolume(): number;
}
export class SphereVolume extends Volume {
	override getVolume(): number;
}

export class Viewer extends EventDispatcher {

	constructor(container: HTMLElement);

	annotationTool: Tool;
	background: BackgroundValues;
	cameraSyncTool: CameraSyncTool;
	classifications: { [key: string]: Classification };
	clipMethod: ClipMethodValues;
	clipTask: ClipTaskValues;
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
	getBackground(): BackgroundValues;
	getCameraMode(): CameraOptions;
	getControls(): Controls;
	getEDLEnabled(): boolean;
	getEDLRadius(): number;
	getEDLStrength(): number;
	getMoveSpeed(): number;
	getPointBudget(): number;
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
	setBackground(background: BackgroundValues): void;
	setClipTask(task: ClipTaskValues): void;
	setControls(controls: Controls): void;
	setCameraMode(mode: CameraOptions): void;
	setEDLEnabled(value: boolean): void;
	setEDLRadius(value: number): void;
	setEDLStrength(value: number): void;
	setMoveSpeed(value: number): void;
	setPointBudget(value: number): void;
	setLeftView(): void;
	setRightView(): void;
	setFrontView(): void;
	setBackView(): void;
	setTopView(): void;
	setBottomView(): void;
	shadowTestCam: PerspectiveCamera;
	showAnnotations: boolean;
	showBoundingBox: boolean;
	skybox: any; // @TODO
	transformationTool: Tool;
	useDEMCollisions: boolean;
	useEDL: boolean;
	useHQ: boolean;
	volumeTool: Tool;
	vrControls: Controls;
	fitToScreen(): void;
}

export class View {
	constructor();

	position: Vector3;
	yaw: number;
	private _pitch: number;
	get pitch(): number;
	set pitch(angle: number);
	radius: number;
	maxPitch: number;
	minPitch: number;
	get direction(): Vector3;
	set direction(vector: Vector3);
	private subject: Subject<Vector3>;
	events$: Observable<Vector3>;

	clone(): View;
	lookAt(t: Vector3);
	getPivot(): Vector3;
	getSide(): Vector3;
	pan(x: number, y: number): void;
	translate(x: number, y: number, z: number): void;
	translateWorld(x: number, y: number, z: number): void;
	setView(position: Vector3 | [number, number, number], target: Vector3 | [number, number, number], duration?: number, callback?: Function): void;
}

export class Scene extends EventDispatcher {
	constructor();

	events$: Observable<{type: 'pointcloud_added', pointcloud: PointCloudTree}>;
	addMeasurement(measure: Measure): void;
	removeMeasurement(measure: Measure | any): void;
	addVolume(volume: Volume): void;
	annotations: any[];
	scene: THREEScene;
	sceneBG: Scene;
	scenePointCloud: THREEScene;
	cameraP: PerspectiveCamera;
	cameraO: OrthographicCamera;
	cameraVR: PerspectiveCamera;
	cameraBG: Camera;
	cameraScreenSpace: OrthographicCamera;
	cameraMode: CameraOptions; //@TODO ENUM A RETROUVER
	overrideCamera: null;
	pointclouds: PointCloudTree[];
	measurements: Measure[];
	profiles: any[];
	volumes: Volume[];
	polygonClipVolumes: any[];
	cameraAnimations: any[];
	orientedImages: any[];
	images360: any[];
	geopackages: any[];
	fpControls: Controls;
	customControls: Controls;
	orbitControls: Controls;
	earthControls: Controls;
	geoControls: Controls;
	deviceControls: Controls;
	inputHandler: EventDispatcher;
	removeAllClipVolumes(): void;
	removeVolume(volume: Volume | any): void;
	view: View;
	directionalLight: Light;
	addPointCloud(pointcloud: PointCloudTree): void;
	getActiveCamera(): Camera;
}

export class PointCloudMaterial extends RawShaderMaterial {
	get activeAttributeName(): MaterialAttributeOptionsValue;
	set activeAttributeName(value: MaterialAttributeOptionsValue);

	get intensityRange(): [number, number];
	set intensityRange(value: [number, number]);

	get elevationRange(): [number, number];
	set elevationRange (value: [number, number]);

	get heightMin(): number;
	set heightMin(value: number);

	get heightMax(): number;
	set heightMax(value: number);

	get pointSizeType(): PointSizeTypeValues;
	set pointSizeType(value: PointSizeTypeValues);
	
	get size(): number;
	set size(value: number);
}

export class PointCloudTree extends Object3D {
	initialized(): boolean;
	material: PointCloudMaterial;
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
