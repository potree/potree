
//
//
//
// how to calculate the radius of a projected sphere in screen space
// http://stackoverflow.com/questions/21648630/radius-of-projected-sphere-in-screen-space
// http://stackoverflow.com/questions/3717226/radius-of-projected-sphere
//

//
// to get a ready to use gradient array from a chroma.js gradient:
// http://gka.github.io/chroma.js/
//
// var stops = [];
// for(let i = 0; i <= 10; i++){
//	let range = chroma.scale(['yellow', 'navy']).mode('lch').domain([10,0])(i)._rgb
//		.slice(0, 3)
//		.map(v => (v / 255).toFixed(4))
//		.join(", ");
//
//	let line = `[${i / 10}, new THREE.Color(${range})],`;
//
//	stops.push(line);
// }
// stops.join("\n");

// to get a ready to use gradient array from matplotlib:
// import matplotlib.pyplot as plt
// import matplotlib.colors as colors
//
// norm = colors.Normalize(vmin=0,vmax=1)
// cmap = plt.cm.viridis
//
// for i in range(0,11):
//    u = i / 10
//    rgb = cmap(norm(u))[0:3]
//    rgb = ["{0:.3f}".format(v) for v in rgb]
//    rgb = "[" + str(u) + ", new THREE.Color(" +  ", ".join(rgb) + ")],"
//    print(rgb)

Potree.Gradients = {
	RAINBOW: [
		[0, new THREE.Color(0.278, 0, 0.714)],
		[1 / 6, new THREE.Color(0, 0, 1)],
		[2 / 6, new THREE.Color(0, 1, 1)],
		[3 / 6, new THREE.Color(0, 1, 0)],
		[4 / 6, new THREE.Color(1, 1, 0)],
		[5 / 6, new THREE.Color(1, 0.64, 0)],
		[1, new THREE.Color(1, 0, 0)]
	],
	// From chroma spectral http://gka.github.io/chroma.js/
	SPECTRAL: [
		[0, new THREE.Color(0.3686, 0.3098, 0.6353)],
		[0.1, new THREE.Color(0.1961, 0.5333, 0.7412)],
		[0.2, new THREE.Color(0.4000, 0.7608, 0.6471)],
		[0.3, new THREE.Color(0.6706, 0.8667, 0.6431)],
		[0.4, new THREE.Color(0.9020, 0.9608, 0.5961)],
		[0.5, new THREE.Color(1.0000, 1.0000, 0.7490)],
		[0.6, new THREE.Color(0.9961, 0.8784, 0.5451)],
		[0.7, new THREE.Color(0.9922, 0.6824, 0.3804)],
		[0.8, new THREE.Color(0.9569, 0.4275, 0.2627)],
		[0.9, new THREE.Color(0.8353, 0.2431, 0.3098)],
		[1, new THREE.Color(0.6196, 0.0039, 0.2588)]
	],
	PLASMA: [
		[0.0, new THREE.Color(0.241, 0.015, 0.610)],
		[0.1, new THREE.Color(0.387, 0.001, 0.654)],
		[0.2, new THREE.Color(0.524, 0.025, 0.653)],
		[0.3, new THREE.Color(0.651, 0.125, 0.596)],
		[0.4, new THREE.Color(0.752, 0.227, 0.513)],
		[0.5, new THREE.Color(0.837, 0.329, 0.431)],
		[0.6, new THREE.Color(0.907, 0.435, 0.353)],
		[0.7, new THREE.Color(0.963, 0.554, 0.272)],
		[0.8, new THREE.Color(0.992, 0.681, 0.195)],
		[0.9, new THREE.Color(0.987, 0.822, 0.144)],
		[1.0, new THREE.Color(0.940, 0.975, 0.131)]
	],
	YELLOW_GREEN: [
		[0, new THREE.Color(0.1647, 0.2824, 0.3451)],
		[0.1, new THREE.Color(0.1338, 0.3555, 0.4227)],
		[0.2, new THREE.Color(0.0610, 0.4319, 0.4864)],
		[0.3, new THREE.Color(0.0000, 0.5099, 0.5319)],
		[0.4, new THREE.Color(0.0000, 0.5881, 0.5569)],
		[0.5, new THREE.Color(0.1370, 0.6650, 0.5614)],
		[0.6, new THREE.Color(0.2906, 0.7395, 0.5477)],
		[0.7, new THREE.Color(0.4453, 0.8099, 0.5201)],
		[0.8, new THREE.Color(0.6102, 0.8748, 0.4850)],
		[0.9, new THREE.Color(0.7883, 0.9323, 0.4514)],
		[1, new THREE.Color(0.9804, 0.9804, 0.4314)]
	],
	VIRIDIS: [
		[0.0, new THREE.Color(0.267, 0.005, 0.329)],
		[0.1, new THREE.Color(0.283, 0.141, 0.458)],
		[0.2, new THREE.Color(0.254, 0.265, 0.530)],
		[0.3, new THREE.Color(0.207, 0.372, 0.553)],
		[0.4, new THREE.Color(0.164, 0.471, 0.558)],
		[0.5, new THREE.Color(0.128, 0.567, 0.551)],
		[0.6, new THREE.Color(0.135, 0.659, 0.518)],
		[0.7, new THREE.Color(0.267, 0.749, 0.441)],
		[0.8, new THREE.Color(0.478, 0.821, 0.318)],
		[0.9, new THREE.Color(0.741, 0.873, 0.150)],
		[1.0, new THREE.Color(0.993, 0.906, 0.144)]
	],
	INFERNO: [
		[0.0, new THREE.Color(0.077, 0.042, 0.206)],
		[0.1, new THREE.Color(0.225, 0.036, 0.388)],
		[0.2, new THREE.Color(0.373, 0.074, 0.432)],
		[0.3, new THREE.Color(0.522, 0.128, 0.420)],
		[0.4, new THREE.Color(0.665, 0.182, 0.370)],
		[0.5, new THREE.Color(0.797, 0.255, 0.287)],
		[0.6, new THREE.Color(0.902, 0.364, 0.184)],
		[0.7, new THREE.Color(0.969, 0.516, 0.063)],
		[0.8, new THREE.Color(0.988, 0.683, 0.072)],
		[0.9, new THREE.Color(0.961, 0.859, 0.298)],
		[1.0, new THREE.Color(0.988, 0.998, 0.645)]
	],
	GRAYSCALE: [
		[0, new THREE.Color(0, 0, 0)],
		[1, new THREE.Color(1, 1, 1)]
	]
};

Potree.Classification = {
	'DEFAULT': {
		0: new THREE.Vector4(0.5, 0.5, 0.5, 1.0),
		1: new THREE.Vector4(0.5, 0.5, 0.5, 1.0),
		2: new THREE.Vector4(0.63, 0.32, 0.18, 1.0),
		3: new THREE.Vector4(0.0, 1.0, 0.0, 1.0),
		4: new THREE.Vector4(0.0, 0.8, 0.0, 1.0),
		5: new THREE.Vector4(0.0, 0.6, 0.0, 1.0),
		6: new THREE.Vector4(1.0, 0.66, 0.0, 1.0),
		7:	new THREE.Vector4(1.0, 0, 1.0, 1.0),
		8: new THREE.Vector4(1.0, 0, 0.0, 1.0),
		9: new THREE.Vector4(0.0, 0.0, 1.0, 1.0),
		12:	new THREE.Vector4(1.0, 1.0, 0.0, 1.0),
		'DEFAULT': new THREE.Vector4(0.3, 0.6, 0.6, 0.5)
	}
};

Potree.PointSizeType = {
	FIXED: 0,
	ATTENUATED: 1,
	ADAPTIVE: 2
};

Potree.PointShape = {
	SQUARE: 0,
	CIRCLE: 1,
	PARABOLOID: 2
};

Potree.PointColorType = {
	RGB: 0,
	COLOR: 1,
	DEPTH: 2,
	HEIGHT: 3,
	ELEVATION: 3,
	INTENSITY: 4,
	INTENSITY_GRADIENT:	5,
	LOD: 6,
	LEVEL_OF_DETAIL: 6,
	POINT_INDEX: 7,
	CLASSIFICATION: 8,
	RETURN_NUMBER: 9,
	SOURCE: 10,
	NORMAL: 11,
	PHONG: 12,
	RGB_HEIGHT: 13,
	COMPOSITE: 50
};

Potree.TreeType = {
	OCTREE:	0,
	KDTREE:	1
};

Potree.PointCloudMaterial = class PointCloudMaterial extends THREE.RawShaderMaterial {
	constructor (parameters = {}) {
		super();

		this.visibleNodesTexture = Potree.utils.generateDataTexture(2048, 1, new THREE.Color(0xffffff));
		this.visibleNodesTexture.minFilter = THREE.NearestFilter;
		this.visibleNodesTexture.magFilter = THREE.NearestFilter;

		let pointSize = parameters.size || 1.0;
		let minSize = parameters.minSize || 1.0;
		let maxSize = parameters.maxSize || 50.0;
		let treeType = parameters.treeType || Potree.TreeType.OCTREE;

		this._pointSizeType = Potree.PointSizeType.FIXED;
		this._shape = Potree.PointShape.SQUARE;
		this._pointColorType = Potree.PointColorType.RGB;
		this._useClipBox = false;
		this.numClipBoxes = 0;
		this._weighted = false;
		this._depthMap = null;
		this._gradient = Potree.Gradients.SPECTRAL;
		this._classification = Potree.Classification.DEFAULT;
		this.gradientTexture = Potree.PointCloudMaterial.generateGradientTexture(this._gradient);
		this.classificationTexture = Potree.PointCloudMaterial.generateClassificationTexture(this._classification);
		this.lights = false;
		this.fog = false;
		this._treeType = treeType;
		this._useEDL = false;

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
			level: { type: 'f', value: 0.0 },
			vnStart: { type: 'f', value: 0.0 },
			spacing: { type: 'f', value: 1.0 },
			blendHardness: { type: 'f', value: 2.0 },
			blendDepthSupplement: { type: 'f', value: 0.0 },
			fov: { type: 'f', value: 1.0 },
			screenWidth: { type: 'f', value: 1.0 },
			screenHeight: { type: 'f', value: 1.0 },
			near: { type: 'f', value: 0.1 },
			far: { type: 'f', value: 1.0 },
			uColor: { type: 'c', value: new THREE.Color(0xffffff) },
			opacity: { type: 'f', value: 1.0 },
			size: { type: 'f', value: pointSize },
			minSize: { type: 'f', value: minSize },
			maxSize: { type: 'f', value: maxSize },
			octreeSize: { type: 'f', value: 0 },
			bbSize: { type: 'fv', value: [0, 0, 0] },
			heightMin: { type: 'f', value: 0.0 },
			heightMax: { type: 'f', value: 1.0 },
			clipBoxCount: { type: 'f', value: 0 },
			clipPolygonCount: { type: 'i', value: 0 },
			visibleNodes: { type: 't', value: this.visibleNodesTexture },
			pcIndex: { type: 'f', value: 0 },
			gradient: { type: 't', value: this.gradientTexture },
			classificationLUT: { type: 't', value: this.classificationTexture },
			clipBoxes: { type: 'Matrix4fv', value: [] },
			clipPolygons: { type: '3fv', value: [] },
			clipPolygonVCount: { type: 'iv', value: [] },
			clipPolygonVP: { type: 'Matrix4fv', value: [] },
			toModel: { type: 'Matrix4f', value: [] },
			depthMap: { type: 't', value: null },
			diffuse: { type: 'fv', value: [1, 1, 1] },
			transition: { type: 'f', value: 0.5 },
			intensityRange: { type: 'fv', value: [0, 65000] },
			intensityGamma: { type: 'f', value: 1 },
			intensityContrast: { type: 'f', value: 0 },
			intensityBrightness: { type: 'f', value: 0 },
			rgbGamma: { type: 'f', value: 1 },
			rgbContrast: { type: 'f', value: 0 },
			rgbBrightness: { type: 'f', value: 0 },
			wRGB: { type: 'f', value: 1 },
			wIntensity: { type: 'f', value: 0 },
			wElevation: { type: 'f', value: 0 },
			wClassification: { type: 'f', value: 0 },
			wReturnNumber: { type: 'f', value: 0 },
			wSourceID: { type: 'f', value: 0 },
			useOrthographicCamera: { type: 'b', value: false },
			orthoRange: { type: 'f', value: 10.0 },
			clipMode: { type: 'i', value: 1 }
		};

		this.defaultAttributeValues.normal = [0, 0, 0];
		this.defaultAttributeValues.classification = [0, 0, 0];
		this.defaultAttributeValues.indices = [0, 0, 0, 0];

		this.vertexShader = this.getDefines() + Potree.Shaders['pointcloud.vs'];
		this.fragmentShader = this.getDefines() + Potree.Shaders['pointcloud.fs'];
		this.vertexColors = THREE.VertexColors;
	}

	updateShaderSource () {
		this.vertexShader = this.getDefines() + Potree.Shaders['pointcloud.vs'];
		this.fragmentShader = this.getDefines() + Potree.Shaders['pointcloud.fs'];

		if (this.depthMap) {
			this.uniforms.depthMap.value = this.depthMap;
			// this.depthMap = depthMap;
			// this.setValues({
			//	depthMap: this.depthMap,
			// });
		}

		if (this.opacity === 1.0) {
			this.blending = THREE.NoBlending;
			this.transparent = false;
			this.depthTest = true;
			this.depthWrite = true;
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
		let defines = '';

		if (this.pointSizeType === Potree.PointSizeType.FIXED) {
			defines += '#define fixed_point_size\n';
		} else if (this.pointSizeType === Potree.PointSizeType.ATTENUATED) {
			defines += '#define attenuated_point_size\n';
		} else if (this.pointSizeType === Potree.PointSizeType.ADAPTIVE) {
			defines += '#define adaptive_point_size\n';
		}

		if (this.shape === Potree.PointShape.SQUARE) {
			defines += '#define square_point_shape\n';
		} else if (this.shape === Potree.PointShape.CIRCLE) {
			defines += '#define circle_point_shape\n';
		} else if (this.shape === Potree.PointShape.PARABOLOID) {
			defines += '#define paraboloid_point_shape\n';
		}

		if (this._useEDL) {
			defines += '#define use_edl\n';
		}

		if (this._pointColorType === Potree.PointColorType.RGB) {
			defines += '#define color_type_rgb\n';
		} else if (this._pointColorType === Potree.PointColorType.COLOR) {
			defines += '#define color_type_color\n';
		} else if (this._pointColorType === Potree.PointColorType.DEPTH) {
			defines += '#define color_type_depth\n';
		} else if (this._pointColorType === Potree.PointColorType.HEIGHT) {
			defines += '#define color_type_height\n';
		} else if (this._pointColorType === Potree.PointColorType.INTENSITY) {
			defines += '#define color_type_intensity\n';
		} else if (this._pointColorType === Potree.PointColorType.INTENSITY_GRADIENT) {
			defines += '#define color_type_intensity_gradient\n';
		} else if (this._pointColorType === Potree.PointColorType.LOD) {
			defines += '#define color_type_lod\n';
		} else if (this._pointColorType === Potree.PointColorType.POINT_INDEX) {
			defines += '#define color_type_point_index\n';
		} else if (this._pointColorType === Potree.PointColorType.CLASSIFICATION) {
			defines += '#define color_type_classification\n';
		} else if (this._pointColorType === Potree.PointColorType.RETURN_NUMBER) {
			defines += '#define color_type_return_number\n';
		} else if (this._pointColorType === Potree.PointColorType.SOURCE) {
			defines += '#define color_type_source\n';
		} else if (this._pointColorType === Potree.PointColorType.NORMAL) {
			defines += '#define color_type_normal\n';
		} else if (this._pointColorType === Potree.PointColorType.PHONG) {
			defines += '#define color_type_phong\n';
		} else if (this._pointColorType === Potree.PointColorType.RGB_HEIGHT) {
			defines += '#define color_type_rgb_height\n';
		} else if (this._pointColorType === Potree.PointColorType.COMPOSITE) {
			defines += '#define color_type_composite\n';
		}

		if (this._treeType === Potree.TreeType.OCTREE) {
			defines += '#define tree_type_octree\n';
		} else if (this._treeType === Potree.TreeType.KDTREE) {
			defines += '#define tree_type_kdtree\n';
		}

		if (this.weighted) {
			defines += '#define weighted_splats\n';
		}

		if (this.numClipBoxes > 0) {
			defines += '#define use_clip_box\n';
		}

		if (this.numClipPolygons > 0) {
			defines += '#define use_clip_polygon\n';
		}

		return defines;
	}

	setClipBoxes (clipBoxes) {
		if (!clipBoxes) {
			return;
		}

		this.clipBoxes = clipBoxes;
		let doUpdate = (this.numClipBoxes !== clipBoxes.length) && (clipBoxes.length === 0 || this.numClipBoxes === 0);

		this.numClipBoxes = clipBoxes.length;
		this.uniforms.clipBoxCount.value = this.numClipBoxes;

		if (doUpdate) {
			this.updateShaderSource();
		}

		this.uniforms.clipBoxes.value = new Float32Array(this.numClipBoxes * 16);

		for (let i = 0; i < this.numClipBoxes; i++) {
			let box = clipBoxes[i];

			this.uniforms.clipBoxes.value.set(box.inverse.elements, 16 * i);
		}

		for (let i = 0; i < this.uniforms.clipBoxes.value.length; i++) {
			if (Number.isNaN(this.uniforms.clipBoxes.value[i])) {
				this.uniforms.clipBoxes.value[i] = Infinity;
			}
		}
	}

	setClipPolygons (clipPolygons, maxPolygonVertices) {
		if (!clipPolygons) {
			return;
		}

		this.clipPolygons = clipPolygons;

		let doUpdate = (this.numClipPolygons !== clipPolygons.length) && (clipPolygons.length === 0 || this.numClipPolygons === 0);

		this.numClipPolygons = clipPolygons.length;
		this.uniforms.clipPolygonCount.value = this.numClipPolygons;

		if (doUpdate) {
			this.updateShaderSource();
		}

		this.uniforms.clipPolygons.value = new Float32Array(this.numClipPolygons * maxPolygonVertices * 3);
		this.uniforms.clipPolygonVP.value = new Float32Array(this.numClipPolygons * 16);
		this.uniforms.clipPolygonVCount.value = new Int32Array(this.numClipPolygons);

		for (let i = 0; i < this.numClipPolygons; i++) {
			let poly = clipPolygons[i];

			this.uniforms.clipPolygonVCount.value[i] = poly.count;
			this.uniforms.clipPolygonVP.value.set(poly.view.elements, 16 * i);
			for (let j = 0; j < poly.count; j++) {
				this.uniforms.clipPolygons.value[i * 24 + (j * 3 + 0)] = poly.polygon[j].x;
				this.uniforms.clipPolygons.value[i * 24 + (j * 3 + 1)] = poly.polygon[j].y;
				this.uniforms.clipPolygons.value[i * 24 + (j * 3 + 2)] = poly.polygon[j].z;
			}
		}
	}

	get gradient () {
		return this._gradient;
	}

	set gradient (value) {
		if (this._gradient !== value) {
			this._gradient = value;
			this.gradientTexture = Potree.PointCloudMaterial.generateGradientTexture(this._gradient);
			this.uniforms.gradient.value = this.gradientTexture;
		}
	}

	get useOrthographicCamera () {
		return this.uniforms.useOrthographicCamera.value;
	}

	set useOrthographicCamera (value) {
		if (this.uniforms.useOrthographicCamera.value !== value) {
			this.uniforms.useOrthographicCamera.value = value;
		}
	}

	get classification () {
		return this._classification;
	}

	set classification (value) {
		let isEqual = Object.keys(value).length === Object.keys(this._classification).length;

		for (let key of Object.keys(value)) {
			isEqual = isEqual && this._classification[key] !== undefined;
			isEqual = isEqual && value[key].equals(this._classification[key]);
		}

		if (!isEqual) {
			this.recomputeClassification();
		}
	}

	recomputeClassification () {
		this.classificationTexture = Potree.PointCloudMaterial.generateClassificationTexture(this._classification);
		this.uniforms.classificationLUT.value = this.classificationTexture;

		this.dispatchEvent({
			type: 'material_property_changed',
			target: this
		});
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

	get clipMode () {
		return this.uniforms.clipMode.value;
	}

	set clipMode (mode) {
		this.uniforms.clipMode.value = mode;
	}

	get weighted () {
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

	get orthoRange () {
		return this.uniforms.orthoRange.value;
	}

	set orthoRange (value) {
		if (this.uniforms.orthoRange.value !== value) {
			this.uniforms.orthoRange.value = value;
		}
	}

	get opacity () {
		return this.uniforms.opacity.value;
	}

	set opacity (value) {
		if (this.uniforms && this.uniforms.opacity) {
			if (this.uniforms.opacity.value !== value) {
				this.uniforms.opacity.value = value;
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

	get depthMap () {
		return this._depthMap;
	}

	set depthMap (value) {
		if (this._depthMap !== value) {
			this._depthMap = value;
			this.updateShaderSource();
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

	get useEDL () {
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
		return [this.heightMin, this.heightMax];
	}

	set elevationRange (value) {
		this.heightMin = value[0];
		this.heightMax = value[1];
	}

	get heightMin () {
		return this.uniforms.heightMin.value;
	}

	set heightMin (value) {
		if (this.uniforms.heightMin.value !== value) {
			this.uniforms.heightMin.value = value;

			this._defaultElevationRangeChanged = true;

			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	get heightMax () {
		return this.uniforms.heightMax.value;
	}

	set heightMax (value) {
		if (this.uniforms.heightMax.value !== value) {
			this.uniforms.heightMax.value = value;

			this._defaultElevationRangeChanged = true;

			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
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
		this.uniforms.wRGB.value = value;
	}

	get weightIntensity () {
		return this.uniforms.wIntensity.value;
	}

	set weightIntensity (value) {
		this.uniforms.wIntensity.value = value;
	}

	get weightElevation () {
		return this.uniforms.wElevation.value;
	}

	set weightElevation (value) {
		this.uniforms.wElevation.value = value;
	}

	get weightClassification () {
		return this.uniforms.wClassification.value;
	}

	set weightClassification (value) {
		this.uniforms.wClassification.value = value;
	}

	get weightReturnNumber () {
		return this.uniforms.wReturnNumber.value;
	}

	set weightReturnNumber (value) {
		this.uniforms.wReturnNumber.value = value;
	}

	get weightSourceID () {
		return this.uniforms.wSourceID.value;
	}

	set weightSourceID (value) {
		this.uniforms.wSourceID.value = value;
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

		let texture = new THREE.Texture(canvas);
		texture.needsUpdate = true;
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
};
