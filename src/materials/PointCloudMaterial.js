

import {Utils} from "../utils.js";
import {Gradients} from "./Gradients.js";
import {Shaders} from "../../build/shaders/shaders.js";
import {ClassificationScheme} from "./ClassificationScheme.js";
import {PointSizeType, PointColorType, PointShape, TreeType} from "../defines.js";

//
//
//
// how to calculate the radius of a projected sphere in screen space
// http://stackoverflow.com/questions/21648630/radius-of-projected-sphere-in-screen-space
// http://stackoverflow.com/questions/3717226/radius-of-projected-sphere
//


export class PointCloudMaterial extends THREE.RawShaderMaterial {
	constructor (parameters = {}) {
		super();

		this.visibleNodesTexture = Utils.generateDataTexture(2048, 1, new THREE.Color(0xffffff));
		this.visibleNodesTexture.minFilter = THREE.NearestFilter;
		this.visibleNodesTexture.magFilter = THREE.NearestFilter;

		let getValid = (a, b) => {
			if(a !== undefined){
				return a;
			}else{
				return b;
			}
		}

		let pointSize = getValid(parameters.size, 1.0);
		let minSize = getValid(parameters.minSize, 2.0);
		let maxSize = getValid(parameters.maxSize, 50.0);
		let treeType = getValid(parameters.treeType, TreeType.OCTREE);

		this._pointSizeType = PointSizeType.FIXED;
		this._shape = PointShape.SQUARE;
		this._pointColorType = PointColorType.RGB;
		this._useClipBox = false;
		this.clipBoxes = [];
		//this.clipSpheres = [];
		this.clipPolygons = [];
		this._weighted = false;
		this._gradient = Gradients.SPECTRAL;
		this.gradientTexture = PointCloudMaterial.generateGradientTexture(this._gradient);
		this.lights = false;
		this.fog = false;
		this._treeType = treeType;
		this._useEDL = false;
		this._snapEnabled = false;
		this._numSnapshots = 0;
		this.defines = new Map();

		this._defaultIntensityRangeChanged = false;
		this._defaultElevationRangeChanged = false;

		this.attributes = {
			position: { type: 'fv', value: [] },
			color: { type: 'fv', value: [] },
			normal: { type: 'fv', value: [] },
			intensity: { type: 'f', value: [] },
			classification: { type: 'f', value: [] },
			returnNumber: { type: 'f', value: [] },
			numberOfReturns: { type: 'f', value: [] },
			pointSourceID: { type: 'f', value: [] },
			indices: { type: 'fv', value: [] }
		};

		this.uniforms = {
			level:				{ type: "f", value: 0.0 },
			vnStart:			{ type: "f", value: 0.0 },
			spacing:			{ type: "f", value: 1.0 },
			blendHardness:		{ type: "f", value: 2.0 },
			blendDepthSupplement:	{ type: "f", value: 0.0 },
			fov:				{ type: "f", value: 1.0 },
			screenWidth:		{ type: "f", value: 1.0 },
			screenHeight:		{ type: "f", value: 1.0 },
			near:				{ type: "f", value: 0.1 },
			far:				{ type: "f", value: 1.0 },
			uColor:				{ type: "c", value: new THREE.Color( 0xffffff ) },
			uOpacity:			{ type: "f", value: 1.0 },
			size:				{ type: "f", value: pointSize },
			minSize:			{ type: "f", value: minSize },
			maxSize:			{ type: "f", value: maxSize },
			octreeSize:			{ type: "f", value: 0 },
			bbSize:				{ type: "fv", value: [0, 0, 0] },
			elevationRange:		{ type: "2fv", value: [0, 0] },

			clipBoxCount:		{ type: "f", value: 0 },
			//clipSphereCount:	{ type: "f", value: 0 },
			clipPolygonCount:	{ type: "i", value: 0 },
			clipBoxes:			{ type: "Matrix4fv", value: [] },
			//clipSpheres:		{ type: "Matrix4fv", value: [] },
			clipPolygons:		{ type: "3fv", value: [] },
			clipPolygonVCount:	{ type: "iv", value: [] },
			clipPolygonVP:		{ type: "Matrix4fv", value: [] },

			visibleNodes:		{ type: "t", value: this.visibleNodesTexture },
			pcIndex:			{ type: "f", value: 0 },
			gradient:			{ type: "t", value: this.gradientTexture },
			classificationLUT:	{ type: "t", value: this.classificationTexture },
			uHQDepthMap:		{ type: "t", value: null },
			toModel:			{ type: "Matrix4f", value: [] },
			diffuse:			{ type: "fv", value: [1, 1, 1] },
			transition:			{ type: "f", value: 0.5 },
			intensityRange:		{ type: "fv", value: [0, 65000] },
			intensityGamma:		{ type: "f", value: 1 },
			intensityContrast:	{ type: "f", value: 0 },
			intensityBrightness:{ type: "f", value: 0 },
			rgbGamma:			{ type: "f", value: 1 },
			rgbContrast:		{ type: "f", value: 0 },
			rgbBrightness:		{ type: "f", value: 0 },
			wRGB:				{ type: "f", value: 1 },
			wIntensity:			{ type: "f", value: 0 },
			wElevation:			{ type: "f", value: 0 },
			wClassification:	{ type: "f", value: 0 },
			wReturnNumber:		{ type: "f", value: 0 },
			wSourceID:			{ type: "f", value: 0 },
			useOrthographicCamera: { type: "b", value: false },
			clipTask:			{ type: "i", value: 1 },
			clipMethod:			{ type: "i", value: 1 },
			uSnapshot:			{ type: "tv", value: [] },
			uSnapshotDepth:		{ type: "tv", value: [] },
			uSnapView:			{ type: "Matrix4fv", value: [] },
			uSnapProj:			{ type: "Matrix4fv", value: [] },
			uSnapProjInv:		{ type: "Matrix4fv", value: [] },
			uSnapViewInv:		{ type: "Matrix4fv", value: [] },
			uShadowColor:		{ type: "3fv", value: [0, 0, 0] },

			uFilterReturnNumberRange:		{ type: "fv", value: [0, 7]},
			uFilterNumberOfReturnsRange:	{ type: "fv", value: [0, 7]},
			uFilterGPSTimeClipRange:		{ type: "fv", value: [0, 7]},
		};

		this.classification = ClassificationScheme.DEFAULT;

		this.defaultAttributeValues.normal = [0, 0, 0];
		this.defaultAttributeValues.classification = [0, 0, 0];
		this.defaultAttributeValues.indices = [0, 0, 0, 0];

		//if(Potree.Features.WEBGL2.isSupported()){
		//	this.vertexShader = this.getDefines() + Shaders['pointcloud.gl2.vs'];
		//	this.fragmentShader = this.getDefines() + Shaders['pointcloud.fs'];
		//}else{
		//	this.vertexShader = this.getDefines() + Shaders['pointcloud.vs'];
		//	this.fragmentShader = this.getDefines() + Shaders['pointcloud.fs'];
		//}

		this.vertexShader = Shaders['pointcloud.vs'];
		this.fragmentShader = Shaders['pointcloud.fs'];

		
		this.vertexColors = THREE.VertexColors;
	}

	setDefine(key, value){
		if(value !== undefined && value !== null){
			if(this.defines.get(key) !== value){
				this.defines.set(key, value);
				this.updateShaderSource();
			}
		}else{
			this.removeDefine(key);
		}
	}

	removeDefine(key){
		this.defines.delete(key);
	}

	updateShaderSource () {

		let vs = Potree.Features.WEBGL2.isSupported() ?
			Shaders['pointcloud.gl2.vs'] : Shaders['pointcloud.vs'];
		let fs = Potree.Features.WEBGL2.isSupported() ?
			Shaders['pointcloud.gl2.fs'] : Shaders['pointcloud.fs'];
		let definesString = this.getDefines();

		let vsVersionIndex = vs.indexOf("#version ");
		let fsVersionIndex = fs.indexOf("#version ");

		if(vsVersionIndex >= 0){
			vs = vs.replace(/(#version .*)/, `$1\n${definesString}`)
		}else{
			vs = `${definesString}\n${vs}`;
		}

		if(fsVersionIndex >= 0){
			fs = fs.replace(/(#version .*)/, `$1\n${definesString}`)
		}else{
			fs = `${definesString}\n${fs}`;
		}

		this.vertexShader = vs;
		this.fragmentShader = fs;

		if (this.opacity === 1.0) {
			this.blending = THREE.NoBlending;
			this.transparent = false;
			this.depthTest = true;
			this.depthWrite = true;
			this.depthFunc = THREE.LessEqualDepth;
		} else if (this.opacity < 1.0 && !this.useEDL) {
			this.blending = THREE.AdditiveBlending;
			this.transparent = true;
			this.depthTest = false;
			this.depthWrite = true;
			this.depthFunc = THREE.AlwaysDepth;
		}

		if (this.weighted) {
			this.blending = THREE.AdditiveBlending;
			this.transparent = true;
			this.depthTest = true;
			this.depthWrite = false;
		}

		this.needsUpdate = true;
	}

	getDefines () {
		let defines = [];

		if (this.pointSizeType === PointSizeType.FIXED) {
			defines.push('#define fixed_point_size');
		} else if (this.pointSizeType === PointSizeType.ATTENUATED) {
			defines.push('#define attenuated_point_size');
		} else if (this.pointSizeType === PointSizeType.ADAPTIVE) {
			defines.push('#define adaptive_point_size');
		}

		if (this.shape === PointShape.SQUARE) {
			defines.push('#define square_point_shape');
		} else if (this.shape === PointShape.CIRCLE) {
			defines.push('#define circle_point_shape');
		} else if (this.shape === PointShape.PARABOLOID) {
			defines.push('#define paraboloid_point_shape');
		}

		if (this._useEDL) {
			defines.push('#define use_edl');
		}

		if (this._snapEnabled) {
			defines.push('#define snap_enabled');
		}

		if (this._pointColorType === PointColorType.RGB) {
			defines.push('#define color_type_rgb');
		} else if (this._pointColorType === PointColorType.COLOR) {
			defines.push('#define color_type_color');
		} else if (this._pointColorType === PointColorType.DEPTH) {
			defines.push('#define color_type_depth');
		} else if (this._pointColorType === PointColorType.HEIGHT) {
			defines.push('#define color_type_height');
		} else if (this._pointColorType === PointColorType.INTENSITY) {
			defines.push('#define color_type_intensity');
		} else if (this._pointColorType === PointColorType.INTENSITY_GRADIENT) {
			defines.push('#define color_type_intensity_gradient');
		} else if (this._pointColorType === PointColorType.LOD) {
			defines.push('#define color_type_lod');
		} else if (this._pointColorType === PointColorType.POINT_INDEX) {
			defines.push('#define color_type_point_index');
		} else if (this._pointColorType === PointColorType.CLASSIFICATION) {
			defines.push('#define color_type_classification');
		} else if (this._pointColorType === PointColorType.RETURN_NUMBER) {
			defines.push('#define color_type_return_number');
		} else if (this._pointColorType === PointColorType.SOURCE) {
			defines.push('#define color_type_source');
		} else if (this._pointColorType === PointColorType.NORMAL) {
			defines.push('#define color_type_normal');
		} else if (this._pointColorType === PointColorType.PHONG) {
			defines.push('#define color_type_phong');
		} else if (this._pointColorType === PointColorType.RGB_HEIGHT) {
			defines.push('#define color_type_rgb_height');
		} else if (this._pointColorType === PointColorType.GPS_TIME) {
			defines.push('#define color_type_gpstime');
		} else if (this._pointColorType === PointColorType.COMPOSITE) {
			defines.push('#define color_type_composite');
		}
		
		if(this._treeType === TreeType.OCTREE){
			defines.push('#define tree_type_octree');
		}else if(this._treeType === TreeType.KDTREE){
			defines.push('#define tree_type_kdtree');
		}

		if (this.weighted) {
			defines.push('#define weighted_splats');
		}

		for(let [key, value] of this.defines){
			defines.push(value);
		}

		return defines.join("\n");
	}

	setClipBoxes (clipBoxes) {
		if (!clipBoxes) {
			return;
		}

		let doUpdate = (this.clipBoxes.length !== clipBoxes.length) && (clipBoxes.length === 0 || this.clipBoxes.length === 0);

		this.uniforms.clipBoxCount.value = this.clipBoxes.length;
		this.clipBoxes = clipBoxes;

		if (doUpdate) {
			this.updateShaderSource();
		}

		this.uniforms.clipBoxes.value = new Float32Array(this.clipBoxes.length * 16);

		for (let i = 0; i < this.clipBoxes.length; i++) {
			let box = clipBoxes[i];

			this.uniforms.clipBoxes.value.set(box.inverse.elements, 16 * i);
		}

		for (let i = 0; i < this.uniforms.clipBoxes.value.length; i++) {
			if (Number.isNaN(this.uniforms.clipBoxes.value[i])) {
				this.uniforms.clipBoxes.value[i] = Infinity;
			}
		}
	}

	//setClipSpheres(clipSpheres){
	//	if (!clipSpheres) {
	//		return;
	//	}

	//	let doUpdate = (this.clipSpheres.length !== clipSpheres.length) && (clipSpheres.length === 0 || this.clipSpheres.length === 0);

	//	this.uniforms.clipSphereCount.value = this.clipSpheres.length;
	//	this.clipSpheres = clipSpheres;

	//	if (doUpdate) {
	//		this.updateShaderSource();
	//	}

	//	this.uniforms.clipSpheres.value = new Float32Array(this.clipSpheres.length * 16);

	//	for (let i = 0; i < this.clipSpheres.length; i++) {
	//		let sphere = clipSpheres[i];

	//		this.uniforms.clipSpheres.value.set(sphere.matrixWorld.elements, 16 * i);
	//	}

	//	for (let i = 0; i < this.uniforms.clipSpheres.value.length; i++) {
	//		if (Number.isNaN(this.uniforms.clipSpheres.value[i])) {
	//			this.uniforms.clipSpheres.value[i] = Infinity;
	//		}
	//	}
	//}

	setClipPolygons(clipPolygons, maxPolygonVertices) {
		if(!clipPolygons){
			return;
		}

		this.clipPolygons = clipPolygons;

		let doUpdate = (this.clipPolygons.length !== clipPolygons.length);

		if(doUpdate){
			this.updateShaderSource();
		}
	}
	
	get gradient(){
		return this._gradient;
	}

	set gradient (value) {
		if (this._gradient !== value) {
			this._gradient = value;
			this.gradientTexture = PointCloudMaterial.generateGradientTexture(this._gradient);
			this.uniforms.gradient.value = this.gradientTexture;
		}
	}
	
	get useOrthographicCamera() {
		return this.uniforms.useOrthographicCamera.value;
	}

	set useOrthographicCamera(value) {
		if(this.uniforms.useOrthographicCamera.value !== value){
			this.uniforms.useOrthographicCamera.value = value;
		}
	}


	get classification () {
		return this._classification;
	}

	set classification (value) {

		let copy = {};
		for(let key of Object.keys(value)){
			copy[key] = value[key].clone();
		}

		let isEqual = false;
		if(this._classification === undefined){
			isEqual = false;
		}else{
			isEqual = Object.keys(copy).length === Object.keys(this._classification).length;

			for(let key of Object.keys(copy)){
				isEqual = isEqual && this._classification[key] !== undefined;
				isEqual = isEqual && copy[key].equals(this._classification[key]);
			}
		}

		if (!isEqual) {
			this._classification = copy;
			this.recomputeClassification();
		}
	}

	recomputeClassification () {
		this.classificationTexture = PointCloudMaterial.generateClassificationTexture(this._classification);
		this.uniforms.classificationLUT.value = this.classificationTexture;

		this.dispatchEvent({
			type: 'material_property_changed',
			target: this
		});
	}

	get numSnapshots(){
		return this._numSnapshots;
	}

	set numSnapshots(value){
		this._numSnapshots = value;
	}

	get snapEnabled(){
		return this._snapEnabled;
	}

	set snapEnabled(value){
		if(this._snapEnabled !== value){
			this._snapEnabled = value;
			//this.uniforms.snapEnabled.value = value;
			this.updateShaderSource();
		}
	}

	get spacing () {
		return this.uniforms.spacing.value;
	}

	set spacing (value) {
		if (this.uniforms.spacing.value !== value) {
			this.uniforms.spacing.value = value;
		}
	}

	get useClipBox () {
		return this._useClipBox;
	}

	set useClipBox (value) {
		if (this._useClipBox !== value) {
			this._useClipBox = value;
			this.updateShaderSource();
		}
	}

	get clipTask(){
		return this.uniforms.clipTask.value;
	}

	set clipTask(mode){
		this.uniforms.clipTask.value = mode;
	}

	get clipMethod(){
		return this.uniforms.clipMethod.value;
	}

	set clipMethod(mode){
		this.uniforms.clipMethod.value = mode;
	}

	get weighted(){
		return this._weighted;
	}

	set weighted (value) {
		if (this._weighted !== value) {
			this._weighted = value;
			this.updateShaderSource();
		}
	}

	get fov () {
		return this.uniforms.fov.value;
	}

	set fov (value) {
		if (this.uniforms.fov.value !== value) {
			this.uniforms.fov.value = value;
			// this.updateShaderSource();
		}
	}

	get screenWidth () {
		return this.uniforms.screenWidth.value;
	}

	set screenWidth (value) {
		if (this.uniforms.screenWidth.value !== value) {
			this.uniforms.screenWidth.value = value;
			// this.updateShaderSource();
		}
	}

	get screenHeight () {
		return this.uniforms.screenHeight.value;
	}

	set screenHeight (value) {
		if (this.uniforms.screenHeight.value !== value) {
			this.uniforms.screenHeight.value = value;
			// this.updateShaderSource();
		}
	}

	get near () {
		return this.uniforms.near.value;
	}

	set near (value) {
		if (this.uniforms.near.value !== value) {
			this.uniforms.near.value = value;
		}
	}

	get far () {
		return this.uniforms.far.value;
	}

	set far (value) {
		if (this.uniforms.far.value !== value) {
			this.uniforms.far.value = value;
		}
	}
	
	get opacity(){
		return this.uniforms.uOpacity.value;
	}

	set opacity (value) {
		if (this.uniforms && this.uniforms.uOpacity) {
			if (this.uniforms.uOpacity.value !== value) {
				this.uniforms.uOpacity.value = value;
				this.updateShaderSource();
				this.dispatchEvent({
					type: 'opacity_changed',
					target: this
				});
				this.dispatchEvent({
					type: 'material_property_changed',
					target: this
				});
			}
		}
	}

	get pointColorType () {
		return this._pointColorType;
	}

	set pointColorType (value) {
		if (this._pointColorType !== value) {
			this._pointColorType = value;
			this.updateShaderSource();
			this.dispatchEvent({
				type: 'point_color_type_changed',
				target: this
			});
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	get pointSizeType () {
		return this._pointSizeType;
	}

	set pointSizeType (value) {
		if (this._pointSizeType !== value) {
			this._pointSizeType = value;
			this.updateShaderSource();
			this.dispatchEvent({
				type: 'point_size_type_changed',
				target: this
			});
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	get useEDL(){
		return this._useEDL;
	}

	set useEDL (value) {
		if (this._useEDL !== value) {
			this._useEDL = value;
			this.updateShaderSource();
		}
	}

	get color () {
		return this.uniforms.uColor.value;
	}

	set color (value) {
		if (!this.uniforms.uColor.value.equals(value)) {
			this.uniforms.uColor.value.copy(value);
			
			this.dispatchEvent({
				type: 'color_changed',
				target: this
			});
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	get shape () {
		return this._shape;
	}

	set shape (value) {
		if (this._shape !== value) {
			this._shape = value;
			this.updateShaderSource();
			this.dispatchEvent({type: 'point_shape_changed', target: this});
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	get treeType () {
		return this._treeType;
	}

	set treeType (value) {
		if (this._treeType !== value) {
			this._treeType = value;
			this.updateShaderSource();
		}
	}

	get bbSize () {
		return this.uniforms.bbSize.value;
	}

	set bbSize (value) {
		this.uniforms.bbSize.value = value;
	}

	get size () {
		return this.uniforms.size.value;
	}

	set size (value) {
		if (this.uniforms.size.value !== value) {
			this.uniforms.size.value = value;

			this.dispatchEvent({
				type: 'point_size_changed',
				target: this
			});
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	get elevationRange () {
		return this.uniforms.elevationRange.value;
	}

	set elevationRange (value) {
		let changed = this.uniforms.elevationRange.value[0] !== value[0]
			|| this.uniforms.elevationRange.value[1] !== value[1];

		if(changed){
			this.uniforms.elevationRange.value = value;

			this._defaultElevationRangeChanged = true;

			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	get heightMin () {
		return this.uniforms.elevationRange.value[0];
	}

	set heightMin (value) {
		this.elevationRange = [value, this.elevationRange[1]];
	}

	get heightMax () {
		return this.uniforms.elevationRange.value[1];
	}

	set heightMax (value) {
		this.elevationRange = [this.elevationRange[0], value];
	}

	get transition () {
		return this.uniforms.transition.value;
	}

	set transition (value) {
		this.uniforms.transition.value = value;
	}

	get intensityRange () {
		return this.uniforms.intensityRange.value;
	}

	set intensityRange (value) {
		if (!(value instanceof Array && value.length === 2)) {
			return;
		}

		if (value[0] === this.uniforms.intensityRange.value[0] &&
			value[1] === this.uniforms.intensityRange.value[1]) {
			return;
		}

		this.uniforms.intensityRange.value = value;

		this._defaultIntensityRangeChanged = true;

		this.dispatchEvent({
			type: 'material_property_changed',
			target: this
		});
	}

	get intensityGamma () {
		return this.uniforms.intensityGamma.value;
	}

	set intensityGamma (value) {
		if (this.uniforms.intensityGamma.value !== value) {
			this.uniforms.intensityGamma.value = value;
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	get intensityContrast () {
		return this.uniforms.intensityContrast.value;
	}

	set intensityContrast (value) {
		if (this.uniforms.intensityContrast.value !== value) {
			this.uniforms.intensityContrast.value = value;
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	get intensityBrightness () {
		return this.uniforms.intensityBrightness.value;
	}

	set intensityBrightness (value) {
		if (this.uniforms.intensityBrightness.value !== value) {
			this.uniforms.intensityBrightness.value = value;
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	get rgbGamma () {
		return this.uniforms.rgbGamma.value;
	}

	set rgbGamma (value) {
		if (this.uniforms.rgbGamma.value !== value) {
			this.uniforms.rgbGamma.value = value;
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	get rgbContrast () {
		return this.uniforms.rgbContrast.value;
	}

	set rgbContrast (value) {
		if (this.uniforms.rgbContrast.value !== value) {
			this.uniforms.rgbContrast.value = value;
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	get rgbBrightness () {
		return this.uniforms.rgbBrightness.value;
	}

	set rgbBrightness (value) {
		if (this.uniforms.rgbBrightness.value !== value) {
			this.uniforms.rgbBrightness.value = value;
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	get weightRGB () {
		return this.uniforms.wRGB.value;
	}

	set weightRGB (value) {
		if(this.uniforms.wRGB.value !== value){
			this.uniforms.wRGB.value = value;
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	get weightIntensity () {
		return this.uniforms.wIntensity.value;
	}

	set weightIntensity (value) {
		if(this.uniforms.wIntensity.value !== value){
			this.uniforms.wIntensity.value = value;
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	get weightElevation () {
		return this.uniforms.wElevation.value;
	}

	set weightElevation (value) {
		if(this.uniforms.wElevation.value !== value){
			this.uniforms.wElevation.value = value;
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	get weightClassification () {
		return this.uniforms.wClassification.value;
	}

	set weightClassification (value) {
		if(this.uniforms.wClassification.value !== value){
			this.uniforms.wClassification.value = value;
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	get weightReturnNumber () {
		return this.uniforms.wReturnNumber.value;
	}

	set weightReturnNumber (value) {
		if(this.uniforms.wReturnNumber.value !== value){
			this.uniforms.wReturnNumber.value = value;
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	get weightSourceID () {
		return this.uniforms.wSourceID.value;
	}

	set weightSourceID (value) {
		if(this.uniforms.wSourceID.value !== value){
			this.uniforms.wSourceID.value = value;
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	static generateGradientTexture (gradient) {
		let size = 64;

		// create canvas
		let canvas = document.createElement('canvas');
		canvas.width = size;
		canvas.height = size;

		// get context
		let context = canvas.getContext('2d');

		// draw gradient
		context.rect(0, 0, size, size);
		let ctxGradient = context.createLinearGradient(0, 0, size, size);

		for (let i = 0; i < gradient.length; i++) {
			let step = gradient[i];

			ctxGradient.addColorStop(step[0], '#' + step[1].getHexString());
		}

		context.fillStyle = ctxGradient;
		context.fill();
		
		//let texture = new THREE.Texture(canvas);
		let texture = new THREE.CanvasTexture(canvas);
		texture.needsUpdate = true;
		
		texture.minFilter = THREE.LinearFilter;
		// textureImage = texture.image;

		return texture;
	}

	static generateClassificationTexture (classification) {
		let width = 256;
		let height = 256;
		let size = width * height;

		let data = new Uint8Array(4 * size);

		for (let x = 0; x < width; x++) {
			for (let y = 0; y < height; y++) {
				let i = x + width * y;

				let color;
				if (classification[x]) {
					color = classification[x];
				} else if (classification[x % 32]) {
					color = classification[x % 32];
				} else {
					color = classification.DEFAULT;
				}

				data[4 * i + 0] = 255 * color.x;
				data[4 * i + 1] = 255 * color.y;
				data[4 * i + 2] = 255 * color.z;
				data[4 * i + 3] = 255 * color.w;
			}
		}

		let texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
		texture.magFilter = THREE.NearestFilter;
		texture.needsUpdate = true;

		return texture;
	}

	disableEvents(){
		if(this._hiddenListeners === undefined){
			this._hiddenListeners = this._listeners;
			this._listeners = {};
		}
	};

	enableEvents(){
		this._listeners = this._hiddenListeners;
		this._hiddenListeners = undefined;
	};

	copyFrom(from){

		for(let name of this.uniforms){
			this.uniforms[name].value = from.uniforms[name].value;
		}

	}

}