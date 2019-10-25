

class PotreePointsShader extends ZeaEngine.GLShader {
  constructor(gl) {
    super(gl)
    this.__shaderStages['VERTEX_SHADER'] = ZeaEngine.shaderLibrary.parseShader(
      'PointsShader.vertexShader',
      `
precision highp float;

instancedattribute vec3 positions;
instancedattribute vec4 colors;

uniform vec3 offset;

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform float PointSize;

<%include file="utils/quadVertexFromID.glsl"/>

/* VS Outputs */
varying vec4 v_color;
varying vec3 v_viewPos;

void main(void) {
  vec2 quadPointPos = getQuadVertexPositionFromID();
//   v_texCoord = quadPointPos + 0.5;

  vec4 pos = vec4(positions + offset, 1.);
  mat4 modelViewMatrix = viewMatrix * modelMatrix;
  vec4 viewPos = modelViewMatrix * pos;

  viewPos += vec4(vec3(quadPointPos, 0.0) * PointSize, 0.);

  gl_Position = projectionMatrix * viewPos;
//   gl_PointSize = PointSize;

  v_color = colors / 255.0; // Unsigned byte attributes need to be scaled down from 0-255 > 0..1
  v_viewPos = -viewPos.xyz;
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

  static getGeomDataShaderName() {
    return 'PotreePointsGeomDataShader'
  }

  static getSelectedShaderName() {
    return 'PotreePointsHilighlightShader'
  }
}

ZeaEngine.sgFactory.registerClass('PotreePointsShader', PotreePointsShader)



class PotreePointsGeomDataShader extends PotreePointsShader {
  constructor(gl) {
    super(gl)

    this.__shaderStages['FRAGMENT_SHADER'] = ZeaEngine.shaderLibrary.parseShader(
      'PointsShader.fragmentShader',
      `
precision highp float;

uniform int passId;
uniform int assetId;

/* VS Outputs */
varying vec4 v_color;
varying vec3 v_viewPos;

#ifdef ENABLE_ES3
out vec4 fragColor;
#endif

void main(void) {

#ifndef ENABLE_ES3
  vec4 fragColor;
#endif
    float dist = length(v_viewPos);

    fragColor.r = float(passId); 
    fragColor.g = float(assetId);
    fragColor.b = 0.0;// TODO: store poly-id or something.
    fragColor.a = dist;

#ifndef ENABLE_ES3
  gl_FragColor = fragColor;
#endif
}
`
    )
  }
}

ZeaEngine.sgFactory.registerClass('PotreePointsGeomDataShader', PotreePointsGeomDataShader)

class PotreePointsHilighlightShader extends PotreePointsShader {
  constructor(gl) {
    super(gl)

    this.__shaderStages['FRAGMENT_SHADER'] = ZeaEngine.shaderLibrary.parseShader(
      'PointsShader.fragmentShader',
      `
precision highp float;

uniform color highlightColor;

/* VS Outputs */
varying vec4 v_color;
varying vec3 v_viewPos;

#ifdef ENABLE_ES3
out vec4 fragColor;
#endif

void main(void) {

#ifndef ENABLE_ES3
  vec4 fragColor;
#endif
    fragColor = highlightColor;

#ifndef ENABLE_ES3
  gl_FragColor = fragColor;
#endif
}
`
    )
  }
}

ZeaEngine.sgFactory.registerClass('PotreePointsHilighlightShader', PotreePointsHilighlightShader)

export { PotreePointsShader, PotreePointsGeomDataShader, PotreePointsHilighlightShader }
