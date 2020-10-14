import { GLShader, shaderLibrary } from '@zeainc/zea-engine'

class EyeDomeLightingShader extends GLShader {
  constructor(gl) {
    super(gl)
    this.__shaderStages['VERTEX_SHADER'] = shaderLibrary.parseShader(
      'EyeDomeLightingShader.vertexShader',
      `
      precision mediump float;
      precision mediump int;
      
      attribute vec3 positions;
      
      uniform mat4 projectionMatrix;
      uniform mat4 modelViewMatrix;
      
      varying vec2 v_Uv;
      
      void main() {
        v_Uv = positions.xy+0.5;
        gl_Position = vec4(positions.xy*2.0, 0.0, 1.0);
      }

`
    )
    this.__shaderStages['FRAGMENT_SHADER'] = shaderLibrary.parseShader(
      'EyeDomeLightingShader.fragmentShader',
      `

// 
// adapted from the EDL shader code from Christian Boucheny in cloud compare:
// https://github.com/cloudcompare/trunk/tree/master/plugins/qEDL/shaders/EDL
//

precision mediump float;
precision mediump int;

uniform vec2 viewportSize;
uniform float edlStrength;
uniform float radius;
// uniform float opacity;

// uniform float uNear;
// uniform float uFar;

uniform mat4 projectionMatrix;

uniform sampler2D uEDLColor;
// uniform sampler2D depthTexture;

varying vec2 v_Uv;

#define M_PI       3.14159265358979323846   // pi
const int numNeighbours = 8;

float response(float depth){
  vec2 uvRadius = radius / viewportSize;
  
  float sum = 0.0;
  vec2 vUv = gl_FragCoord.xy / viewportSize;
  
  for(int i = 0; i < numNeighbours; i++){
    vec2 uvNeighbor = vUv + uvRadius * vec2(
      cos((float(i) / float(numNeighbours)) * 2.0 * M_PI),
      sin((float(i) / float(numNeighbours)) * 2.0 * M_PI)
    );
    
    float neighbourDepth = texture2D(uEDLColor, uvNeighbor).a;
    neighbourDepth = (neighbourDepth == 1.0) ? 0.0 : neighbourDepth;

    if(neighbourDepth != 0.0){
      if(depth == 0.0){
        sum += 100.0;
      }else{
        sum += max(0.0, depth - neighbourDepth);
      }
    }
  }
  
  return sum / float(numNeighbours);
}

#ifdef ENABLE_ES3
layout (location = 0) out vec4 fragColor;
#endif
void main(){
  #ifndef ENABLE_ES3
    vec4 fragColor;
  #endif

  vec2 vUv = gl_FragCoord.xy / viewportSize;
  vec4 cEDL = texture2D(uEDLColor, vUv);
  
  float depth = cEDL.a;
  depth = (depth == 1.0) ? 0.0 : depth;
  float res = response(depth);
  float shade = exp(-res * 300.0 * edlStrength);

  fragColor = vec4(cEDL.rgb * shade, 1.0);

  { // write regular hyperbolic depth values to depth buffer
    float dl = pow(2.0, depth);

    vec4 dp = projectionMatrix * vec4(0.0, 0.0, -dl, 1.0);
    float pz = dp.z / dp.w;
    float fragDepth = (pz + 1.0) / 2.0;

    gl_FragDepth = fragDepth;
  }

  if(depth == 0.0){
    discard;
  }

  // fragColor = cEDL;
  // fragColor = vec4(cEDL.a);
  
#ifndef ENABLE_ES3
  gl_FragColor = fragColor;
#endif
}
      

`
    )
  }
}

export { EyeDomeLightingShader }
