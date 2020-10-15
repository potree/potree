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

void main() {
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

uniform mat4 projectionMatrix;

uniform sampler2D uEDLColor;

#define M_PI  3.14159265358979323846
const int numNeighbors = 8;

float response(float depth){
  vec2 uvRadius = radius / viewportSize;
  
  float sum = 0.0;
  vec2 vUv = gl_FragCoord.xy / viewportSize;
  
  int validNeiCount = 0;
  for(int i = 0; i < numNeighbors; i++){
    vec2 uvNeighbor = vUv + uvRadius * vec2(
      cos((float(i) / float(numNeighbors)) * 2.0 * M_PI),
      sin((float(i) / float(numNeighbors)) * 2.0 * M_PI)
    );
    
    float neighborDepth = texture2D(uEDLColor, uvNeighbor).a;
    neighborDepth = (neighborDepth == 1.0) ? 0.0 : neighborDepth;

    if(neighborDepth != 0.0){
      sum += max(0.0, depth - neighborDepth);
      validNeiCount++;
    }
  }
  
  return sum / float(validNeiCount);
}

#ifdef ENABLE_ES3
out vec4 fragColor;
#endif
void main(){
  #ifndef ENABLE_ES3
    vec4 fragColor;
  #endif

  vec2 vUv = gl_FragCoord.xy / viewportSize;
  vec4 cEDL = texture2D(uEDLColor, vUv);
  
  float depth = (cEDL.a == 1.0) ? 0.0 : cEDL.a;

  if(cEDL.a == 99999.0){
    discard;
  }
  else {
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
