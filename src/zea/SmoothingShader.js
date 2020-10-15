import { GLShader, shaderLibrary } from '@zeainc/zea-engine'

class SmoothingShader extends GLShader {
  constructor(gl) {
    super(gl)
    this.__shaderStages['VERTEX_SHADER'] = shaderLibrary.parseShader(
      'SmoothingShader.vertexShader',
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
      'SmoothingShader.fragmentShader',
      `
precision mediump float;
precision mediump int;

uniform vec2 viewportSize;
uniform float smoothRadius;

uniform mat4 projectionMatrix;

uniform sampler2D colorTexture;

varying vec2 v_Uv;

#define M_PI       3.14159265358979323846   // pi
const int numNeighbors = 8;

vec4 fillGaps(vec2 uv, vec4 color){

  
  float depth = (color.a == 1.0) ? 0.0 : color.a;
  float dl = 0.0;//pow(2.0, depth);
  float closestPixelDepth = depth;
  // int j = 0;
  for(int j = 0; j < 2; j++)
  {
    vec2 uvRadius = (smoothRadius * pow(2.0, float(j))) / viewportSize;

    for(int i = 0; i < numNeighbors; i++){
      vec2 uvNeighbor = uv + uvRadius * vec2(
        cos((float(i) / float(numNeighbors)) * 2.0 * M_PI),
        sin((float(i) / float(numNeighbors)) * 2.0 * M_PI)
      );
      
      vec4 neighborCol = texture2D(colorTexture, uvNeighbor);
      float neighborDepth = (neighborCol.a == 1.0) ? 0.0 : neighborCol.a;

      if(neighborDepth != 0.0 && neighborDepth < closestPixelDepth){
        color = neighborCol;
        closestPixelDepth = neighborDepth;
      }
    }
  }

  return color;
}

#ifdef ENABLE_ES3
out vec4 fragColor;
#endif
void main(){
  #ifndef ENABLE_ES3
    vec4 fragColor;
  #endif

  vec2 uv = gl_FragCoord.xy / viewportSize;
  vec4 color = texture2D(colorTexture, uv);
  
  fragColor = fillGaps(uv, color);

  // fragColor = color;
  
#ifndef ENABLE_ES3
  gl_FragColor = fragColor;
#endif
}
      

`
    )
  }
}

export { SmoothingShader }
