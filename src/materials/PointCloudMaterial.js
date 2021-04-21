
import * as THREE from "../../libs/three.js/build/three.module.js";
import {Utils} from "../utils.js";
import {Gradients} from "./Gradients.js";
import {Shaders} from "../../build/shaders/shaders.js";
import {ClassificationScheme} from "./ClassificationScheme.js";
import {PointSizeType, PointShape, TreeType, ElevationGradientRepeat} from "../defines.js";

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
		this._useClipBox = false;
		this.clipBoxes = [];
		this.clipPolygons = [];
		this._weighted = false;
		this._gradient = Gradients.SPECTRAL;
		this.gradientTexture = PointCloudMaterial.generateGradientTexture(this._gradient);
		this._matcap = "matcap.jpg";
		this.matcapTexture = Potree.PointCloudMaterial.generateMatcapTexture(this._matcap);
		this.lights = false;
		this.fog = false;
		this._treeType = treeType;
		this._useEDL = false;
		this.defines = new Map();

		this.ranges = new Map();

		this._activeAttributeName = null;

		this._defaultIntensityRangeChanged = false;
		this._defaultElevationRangeChanged = false;

		{
			const [width, height] = [256, 1];
			let data = new Uint8Array(width * 4);
			let texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
			texture.magFilter = THREE.NearestFilter;
			texture.needsUpdate = true;

			this.classificationTexture = texture;
		}

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

			 intensityRange:		{ type: "fv", value: [Infinity, -Infinity] },

			intensity_gbc: 		{ type: "fv", value: [1, 0, 0]},
			uRGB_gbc:	 		{ type: "fv", value: [1, 0, 0]},
			// intensityGamma:		{ type: "f", value: 1 },
			// intensityContrast:	{ type: "f", value: 0 },
			// intensityBrightness:{ type: "f", value: 0 },
			// rgbGamma:			{ type: "f", value: 1 },
			// rgbContrast:		{ type: "f", value: 0 },
			// rgbBrightness:		{ type: "f", value: 0 },
			wRGB:				{ type: "f", value: 1 },
			wIntensity:			{ type: "f", value: 0 },
			wElevation:			{ type: "f", value: 0 },
			wClassification:	{ type: "f", value: 0 },
			wReturnNumber:		{ type: "f", value: 0 },
			wSourceID:			{ type: "f", value: 0 },
			useOrthographicCamera: { type: "b", value: false },
			elevationGradientRepat: { type: "i", value: ElevationGradientRepeat.CLAMP },
			clipTask:			{ type: "i", value: 1 },
			clipMethod:			{ type: "i", value: 1 },
			uShadowColor:		{ type: "3fv", value: [0, 0, 0] },

			uExtraScale:		{ type: "f", value: 1},
			uExtraOffset:		{ type: "f", value: 0},
			uExtraRange:		{ type: "2fv", value: [0, 1] },
			uExtraGammaBrightContr:	{ type: "3fv", value: [1, 0, 0] },

			uFilterReturnNumberRange:		{ type: "fv", value: [0, 7]},
			uFilterNumberOfReturnsRange:	{ type: "fv", value: [0, 7]},
			uFilterGPSTimeClipRange:		{ type: "fv", value: [0, 7]},
			uFilterPointSourceIDClipRange:		{ type: "fv", value: [0, 65535]},
			matcapTextureUniform: 	{ type: "t", value: this.matcapTexture },
			backfaceCulling: { type: "b", value: false },
		};

		this.classification = ClassificationScheme.DEFAULT;

		this.defaultAttributeValues.normal = [0, 0, 0];
		this.defaultAttributeValues.classification = [0, 0, 0];
		this.defaultAttributeValues.indices = [0, 0, 0, 0];

		this.vertexShader = Shaders['pointcloud.vs'];
		this.fragmentShader = Shaders['pointcloud.fs'];
		
		this.vertexColors = THREE.VertexColors;

		this.updateShaderSource();
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

		let vs = Shaders['pointcloud.vs'];
		let fs = Shaders['pointcloud.fs'];
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

		if(this.activeAttributeName){
			let attributeName = this.activeAttributeName.replace(/[^a-zA-Z0-9]/g, '_');

			defines.push(`#define color_type_${attributeName}`);
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

	get matcap(){
		return this._matcap;
	}

	set matcap (value) {
		if (this._matcap !== value) {
			this._matcap = value;
			this.matcapTexture = Potree.PointCloudMaterial.generateMatcapTexture(this._matcap);
			this.uniforms.matcapTextureUniform.value = this.matcapTexture;
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
	get backfaceCulling() {
		return this.uniforms.backfaceCulling.value;
	}

	set backfaceCulling(value) {
		if(this.uniforms.backfaceCulling.value !== value){
			this.uniforms.backfaceCulling.value = value;
			this.dispatchEvent({type: 'backface_changed', target: this});
		}
	}

	recomputeClassification () {
		const classification = this.classification;
		const data = this.classificationTexture.image.data;

		let width = 256;
		const black = [1, 1, 1, 1];

		let valuesChanged = false;

		for (let i = 0; i < width; i++) {

			let color;
			let visible = true;

			if (classification[i]) {
				color = classification[i].color;
				visible = classification[i].visible;
			} else if (classification[i % 32]) {
				color = classification[i % 32].color;
				visible = classification[i % 32].visible;
			} else if(classification.DEFAULT) {
				color = classification.DEFAULT.color;
				visible = classification.DEFAULT.visible;
			}else{
				color = black;
			}

			const r = parseInt(255 * color[0]);
			const g = parseInt(255 * color[1]);
			const b = parseInt(255 * color[2]);
			const a = visible ? parseInt(255 * color[3]) : 0;


			if(data[4 * i + 0] !== r){
				data[4 * i + 0] = r;
				valuesChanged = true;
			}

			if(data[4 * i + 1] !== g){
				data[4 * i + 1] = g;
				valuesChanged = true;
			}

			if(data[4 * i + 2] !== b){
				data[4 * i + 2] = b;
				valuesChanged = true;
			}

			if(data[4 * i + 3] !== a){
				data[4 * i + 3] = a;
				valuesChanged = true;
			}
		}

		if(valuesChanged){
			this.classificationTexture.needsUpdate = true;

			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
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

	get elevationGradientRepat(){
		return this.uniforms.elevationGradientRepat.value;
	}

	set elevationGradientRepat(mode){
		this.uniforms.elevationGradientRepat.value = mode;
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

	get activeAttributeName(){
		return this._activeAttributeName;
	}

	set activeAttributeName(value){
		if (this._activeAttributeName !== value) {
			this._activeAttributeName = value;

			this.updateShaderSource();
			this.dispatchEvent({
				type: 'active_attribute_changed',
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

	get minSize(){
		return this.uniforms.minSize.value;
	}

	set minSize(value){
		if (this.uniforms.minSize.value !== value) {
			this.uniforms.minSize.value = value;

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
		return this.uniforms.intensity_gbc.value[0];
	}

	set intensityGamma (value) {
		if (this.uniforms.intensity_gbc.value[0] !== value) {
			this.uniforms.intensity_gbc.value[0] = value;
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	get intensityContrast () {
		return this.uniforms.intensity_gbc.value[2];
	}

	set intensityContrast (value) {
		if (this.uniforms.intensity_gbc.value[2] !== value) {
			this.uniforms.intensity_gbc.value[2] = value;
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	get intensityBrightness () {
		return this.uniforms.intensity_gbc.value[1];
	}

	set intensityBrightness (value) {
		if (this.uniforms.intensity_gbc.value[1] !== value) {
			this.uniforms.intensity_gbc.value[1] = value;
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	get rgbGamma () {
		return this.uniforms.uRGB_gbc.value[0];
	}

	set rgbGamma (value) {
		if (this.uniforms.uRGB_gbc.value[0] !== value) {
			this.uniforms.uRGB_gbc.value[0] = value;
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	get rgbContrast () {
		return this.uniforms.uRGB_gbc.value[2];
	}

	set rgbContrast (value) {
		if (this.uniforms.uRGB_gbc.value[2] !== value) {
			this.uniforms.uRGB_gbc.value[2] = value;
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	get rgbBrightness () {
		return this.uniforms.uRGB_gbc.value[1];
	}

	set rgbBrightness (value) {
		if (this.uniforms.uRGB_gbc.value[1] !== value) {
			this.uniforms.uRGB_gbc.value[1] = value;
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	
	get extraGamma () {
		return this.uniforms.uExtraGammaBrightContr.value[0];
	}

	set extraGamma (value) {
		if (this.uniforms.uExtraGammaBrightContr.value[0] !== value) {
			this.uniforms.uExtraGammaBrightContr.value[0] = value;
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	get extraBrightness () {
		return this.uniforms.uExtraGammaBrightContr.value[1];
	}

	set extraBrightness (value) {
		if (this.uniforms.uExtraGammaBrightContr.value[1] !== value) {
			this.uniforms.uExtraGammaBrightContr.value[1] = value;
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	get extraContrast () {
		return this.uniforms.uExtraGammaBrightContr.value[2];
	}

	set extraContrast (value) {
		if (this.uniforms.uExtraGammaBrightContr.value[2] !== value) {
			this.uniforms.uExtraGammaBrightContr.value[2] = value;
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	getRange(attributeName){
		return this.ranges.get(attributeName);
	}

	setRange(attributeName, newRange){

		let rangeChanged = false;

		let oldRange = this.ranges.get(attributeName);

		if(oldRange != null && newRange != null){
			rangeChanged = oldRange[0] !== newRange[0] || oldRange[1] !== newRange[1];
		}else{
			rangeChanged = true;
		}

		this.ranges.set(attributeName, newRange);

		if(rangeChanged){
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	get extraRange () {
		return this.uniforms.uExtraRange.value;
	}

	set extraRange (value) {
		if (!(value instanceof Array && value.length === 2)) {
			return;
		}

		if (value[0] === this.uniforms.uExtraRange.value[0] &&
			value[1] === this.uniforms.uExtraRange.value[1]) {
			return;
		}

		this.uniforms.uExtraRange.value = value;

		this._defaultExtraRangeChanged = true;

		this.dispatchEvent({
			type: 'material_property_changed',
			target: this
		});
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
		texture.wrap = THREE.RepeatWrapping;
		texture.repeat = 2;
		// textureImage = texture.image;

		return texture;
	}
	
	static generateMatcapTexture (matcap) {
	var url = new URL(Potree.resourcePath + "/textures/matcap/" + matcap).href;
	let texture = new THREE.TextureLoader().load( url );
		texture.magFilter = texture.minFilter = THREE.LinearFilter; 
		texture.needsUpdate = true;
		// PotreeConverter_1.6_2018_07_29_windows_x64\PotreeConverter.exe autzen_xyzrgbXYZ_ascii.xyz -f xyzrgbXYZ -a RGB NORMAL -o autzen_xyzrgbXYZ_ascii_a -p index --overwrite
		// Switch matcap texture on the fly : viewer.scene.pointclouds[0].material.matcap = 'matcap1.jpg'; 
		// For non power of 2, use LinearFilter and dont generate mipmaps, For power of 2, use NearestFilter and generate mipmaps : matcap2.jpg 1 2 8 11 12 13
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

	// copyFrom(from){

	// 	var a = 10;

	// 	for(let name of Object.keys(this.uniforms)){
	// 		this.uniforms[name].value = from.uniforms[name].value;
	// 	}
	// }

	// copy(from){
	// 	this.copyFrom(from);
	// }

}
