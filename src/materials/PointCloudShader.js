
import {Shaders} from "../../build/shaders/shaders.js";

// Note: shaders are registered to a global factory, so thier
// names need to be globally unique. 
export class Potree_PointCloudShader extends ZeaEngine.GLShader {
	constructor () {
		super();
		this.__shaderStages['VERTEX_SHADER'] = Shaders['pointcloud.vs'];
		this.__shaderStages['FRAGMENT_SHADER'] = Shaders['pointcloud.fs'];
		
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
	}

  bind(renderstate) {
    if (super.bind(renderstate)) {
      renderstate.supportsInstancing = false
      return true
    }
    return false
  }

  static getParamDeclarations() {
    const paramDescs = super.getParamDeclarations()
		
		paramDescs.push({ name: "level", type: "float", value: 0.0 })
		paramDescs.push({ name: "vnStart", type: "float", value: 0.0 })
		paramDescs.push({ name: "spacing", type: "float", value: 1.0 })
		paramDescs.push({ name: "blendHardness", type: "float", value: 2.0 })
		paramDescs.push({ name: "blendDepthSupplement", type: "float", value: 0.0 })
		paramDescs.push({ name: "fov", type: "float", value: 1.0 })
		paramDescs.push({ name: "screenWidth", type: "float", value: 1.0 })
		paramDescs.push({ name: "screenHeight", type: "float", value: 1.0 })
		paramDescs.push({ name: "near", type: "float", value: 0.1 })
		paramDescs.push({ name: "far", type: "float", value: 1.0 })
		paramDescs.push({ name: "uColor", type: "c", value: new THREE.Color( 0xffffff ) })
		paramDescs.push({ name: "uOpacity", type: "float", value: 1.0 })
		paramDescs.push({ name: "size", type: "float", value: pointSize })
		paramDescs.push({ name: "minSize", type: "float", value: minSize })
		paramDescs.push({ name: "maxSize", type: "float", value: maxSize })
		paramDescs.push({ name: "octreeSize", type: "float", value: 0 })
		paramDescs.push({ name: "bbSize", type: "fv", value: [0, 0, 0] })
		paramDescs.push({ name: "elevationRange", type: "2fv", value: [0, 0] })

		// paramDescs.push({ name: "clipBoxCount", type: "float", value: 0 })
		// paramDescs.push({ name: "clipPolygonCount", type: "i", value: 0 })
		// paramDescs.push({ name: "clipBoxes", type: "mat4", value: [] })
		// paramDescs.push({ name: "clipPolygons", type: "3fv", value: [] })
		// paramDescs.push({ name: "clipPolygonVCount", type: "iv", value: [] })
		// paramDescs.push({ name: "clipPolygonVP", type: "mat4", value: [] })

		paramDescs.push({ name: "visibleNodes", type: "float", texturable:true })
		paramDescs.push({ name: "pcIndex", type: "float", value: 0 })
		paramDescs.push({ name: "gradient", type: "t", value: this.gradientTexture })
		paramDescs.push({ name: "classificationLUT", type: "t", value: this.classificationTexture })
		paramDescs.push({ name: "uHQDepthMap", type: "t", value: null })
		paramDescs.push({ name: "toModel", type: "mat4", value: [] })
		// paramDescs.push({ name: "diffuse", type: "fv", value: [1, 1, 1] })
		paramDescs.push({ name: "transition", type: "float", value: 0.5 })
		paramDescs.push({ name: "intensityRange", type: "fv", value: [0, 65000] })
		paramDescs.push({ name: "intensityGamma", type: "float", value: 1 })
		paramDescs.push({ name: "intensityContrast", type: "float", value: 0 })
		paramDescs.push({ name: "intensityBrightness",: "float", value: 0 })
		paramDescs.push({ name: "rgbGamma", type: "float", value: 1 })
		paramDescs.push({ name: "rgbContrast", type: "float", value: 0 })
		paramDescs.push({ name: "rgbBrightness", type: "float", value: 0 })
		paramDescs.push({ name: "wRGB", type: "float", value: 1 })
		paramDescs.push({ name: "wIntensity", type: "float", value: 0 })
		paramDescs.push({ name: "wElevation", type: "float", value: 0 })
		paramDescs.push({ name: "wClassification", type: "float", value: 0 })
		paramDescs.push({ name: "wReturnNumber", type: "float", value: 0 })
		paramDescs.push({ name: "wSourceID", type: "float", value: 0 })
		paramDescs.push({ name: "useOrthographicCamera", type: "bool", value: false })
		paramDescs.push({ name: "clipTask", type: "i", value: 1 })
		paramDescs.push({ name: "clipMethod", type: "i", value: 1 })
		paramDescs.push({ name: "uSnapshot", type: "tv", value: [] })
		paramDescs.push({ name: "uSnapshotDepth", type: "tv", value: [] })
		paramDescs.push({ name: "uSnapView", type: "mat4", value: [] })
		paramDescs.push({ name: "uSnapProj", type: "mat4", value: [] })
		paramDescs.push({ name: "uSnapProjInv", type: "mat4", value: [] })
		paramDescs.push({ name: "uSnapViewInv", type: "mat4", value: [] })
		paramDescs.push({ name: "uShadowColor", type: "color", value: [0, 0, 0] })

		paramDescs.push({ name: "uFilterReturnNumberRange", type: "fv", value: [0, 7]})
		paramDescs.push({ name: "uFilterNumberOfReturnsRange", type: "fv", value: [0, 7]})
		paramDescs.push({ name: "uFilterGPSTimeClipRange", type: "fv", value: [0, 7]})
		paramDescs.push({ name: "matcapTextureUniform", type: "t", value: this.matcapTexture })
		paramDescs.push({ name: "backfaceCulling", type: "bool", value: false })

    return paramDescs
  }
}

ZeaEngine.sgFactory.registerClass('Potree_PointCloudShader', Potree_PointCloudShader)