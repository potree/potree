// import { Color } from '../../Math'
// import { sgFactory } from '../../SceneTree'
// import { shaderLibrary } from '../ShaderLibrary'
// import { GLShader } from '../GLShader.js'

// import './GLSL/stack-gl/inverse.js'
// import './GLSL/stack-gl/transpose.js'

class PotreePointsShader extends ZeaEngine.GLShader {
  constructor(gl) {
    super(gl)
    this.__shaderStages['VERTEX_SHADER'] = ZeaEngine.shaderLibrary.parseShader(
      'PointsShader.vertexShader',
      `
precision highp float;

attribute vec3 positions;
attribute vec4 colors;

uniform vec3 offset;

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;

/* VS Outputs */
varying vec4 v_color;

void main(void) {
  mat4 modelViewProjectionMatrix = projectionMatrix * viewMatrix * modelMatrix;
  gl_Position = modelViewProjectionMatrix * vec4(positions + offset, 1.);
  gl_PointSize = 3.0;

  v_color = colors / 255.0; // Unsigned byte attributes need to be scaled down from 0-255 > 0..1
}
`
    )

    this.__shaderStages['FRAGMENT_SHADER'] = ZeaEngine.shaderLibrary.parseShader(
      'PointsShader.fragmentShader',
      `
precision highp float;

uniform color BaseColor;

/* VS Outputs */
varying vec4 v_color;

#ifdef ENABLE_ES3
out vec4 fragColor;
#endif

void main(void) {

#ifndef ENABLE_ES3
  vec4 fragColor;
#endif

  fragColor = v_color;
  fragColor.a = 1.0;

#ifndef ENABLE_ES3
  gl_FragColor = fragColor;
#endif
}
`
    )
  }

  static getParamDeclarations() {
    const paramDescs = super.getParamDeclarations()
    paramDescs.push({
      name: 'BaseColor',
      defaultValue: new ZeaEngine.Color(1.0, 1.0, 0.5),
    })
    return paramDescs
  }
}

ZeaEngine.sgFactory.registerClass('PotreePointsShader', PotreePointsShader)

export { PotreePointsShader }
