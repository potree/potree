
import {
	GLShader,
	sgFactory,
	shaderLibrary
} from '@zeainc/zea-engine'

class PotreePointsShader extends GLShader {
  constructor(gl) {
    super(gl)
    this.__shaderStages['VERTEX_SHADER'] = shaderLibrary.parseShader(
      'PointsShader.vertexShader',
      `
precision highp float;

instancedattribute vec3 positions;
instancedattribute vec4 colors;

uniform vec3 offset;
uniform float uOctreeSize;
uniform int uVNStart;
uniform float uLevel;
uniform float uOctreeSpacing;
uniform sampler2D visibleNodes;


uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform float PointSizeAttenuation;
uniform float PointSize;

<%include file="utils/quadVertexFromID.glsl"/>

/* VS Outputs */
varying vec4 v_color;
varying vec2 v_texCoord;
varying vec3 v_viewPos;

// ---------------------
// OCTREE
// ---------------------

/**
 * number of 1-bits up to inclusive index position
 * number is treated as if it were an integer in the range 0-255
 *
 */
int numberOfOnes(int number, int index){
    int numOnes = 0;
    int tmp = 128;
    for(int i = 7; i >= 0; i--){
        
        if(number >= tmp){
            number = number - tmp;

            if(i <= index){
                numOnes++;
            }
        }
        
        tmp = tmp / 2;
    }

    return numOnes;
}


/**
 * checks whether the bit at index is 1
 * number is treated as if it were an integer in the range 0-255
 *
 */
bool isBitSet(int number, int index){

    // weird multi else if due to lack of proper array, int and bitwise support in WebGL 1.0
    int powi = 1;
    if(index == 0){
        powi = 1;
    }else if(index == 1){
        powi = 2;
    }else if(index == 2){
        powi = 4;
    }else if(index == 3){
        powi = 8;
    }else if(index == 4){
        powi = 16;
    }else if(index == 5){
        powi = 32;
    }else if(index == 6){
        powi = 64;
    }else if(index == 7){
        powi = 128;
    }else{
        return false;
    }

    int ndp = number / powi;

    return mod(float(ndp), 2.0) != 0.0;
}


/**
 * find the LOD at the point position
 */
float getLOD(vec3 position){
    
    vec3 offset = vec3(0.0, 0.0, 0.0);
    int iOffset = uVNStart;
    float depth = uLevel;
    for(float i = 0.0; i <= 30.0; i++){
        float nodeSizeAtLevel = uOctreeSize / pow(2.0, i + uLevel + 0.0);
        
        vec3 index3d = (position-offset) / nodeSizeAtLevel;
        index3d = floor(index3d + 0.5);
        int index = int(round(4.0 * index3d.x + 2.0 * index3d.y + index3d.z));
        
        vec4 value = texture2D(visibleNodes, vec2(float(iOffset) / 2048.0, 0.0));
        int mask = int(round(value.r * 255.0));

        if(isBitSet(mask, index)){
            // there are more visible child nodes at this position
            int advanceG = int(round(value.g * 255.0)) * 256;
            int advanceB = int(round(value.b * 255.0));
            int advanceChild = numberOfOnes(mask, index - 1);
            int advance = advanceG + advanceB + advanceChild;

            iOffset = iOffset + advance;
            
            depth++;
        }else{
            // no more visible child nodes at this position
            return value.a * 255.0;
            //return depth;
        }
        
        offset = offset + (nodeSizeAtLevel * 0.5) * index3d;
    }
    
        
    return depth;
}

float getPointSizeAttenuation(vec3 position){
  float lod = getLOD(position);
  // v_color = vec4(0.0, 0.0, 0.0, 1.0);
  // v_color.r = lod / 5.0;
  return mix(1.0, pow(2.0, lod), PointSizeAttenuation);
}


float getPointSize(vec3 position){
	
	float r = uOctreeSpacing * PointSize;
  
  float pointSize = r / getPointSizeAttenuation(position);

	// pointSize = clamp(pointSize, minSize, maxSize);
	
	return pointSize;
}


void main(void) {
  v_color = colors / 255.0; // Unsigned byte attributes need to be scaled down from 0-255 > 0..1
  
  vec2 quadPointPos = getQuadVertexPositionFromID();
  v_texCoord = quadPointPos + 0.5;

  vec4 pos = vec4(positions + offset, 1.);
  mat4 modelViewMatrix = viewMatrix * modelMatrix;
  vec4 viewPos = modelViewMatrix * pos;

	float pointSize = getPointSize(positions);

  viewPos += vec4(vec3(quadPointPos, 0.0) * pointSize, 0.);
  v_viewPos = -viewPos.xyz;

  gl_Position = projectionMatrix * viewPos;

//   gl_PointSize = PointSize;

}
`
    )

    this.__shaderStages['FRAGMENT_SHADER'] = shaderLibrary.parseShader(
      'PointsShader.fragmentShader',
      `
precision highp float;

uniform color BaseColor;

/* VS Outputs */
varying vec4 v_color;
varying vec2 v_texCoord;

#ifdef ENABLE_ES3
out vec4 fragColor;
#endif

void main(void) {

#ifndef ENABLE_ES3
  vec4 fragColor;
#endif

  if(length(v_texCoord - 0.5) > 0.5)
    discard;

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

sgFactory.registerClass('PotreePointsShader', PotreePointsShader)



class PotreePointsGeomDataShader extends PotreePointsShader {
  constructor(gl) {
    super(gl)

    this.__shaderStages['FRAGMENT_SHADER'] = shaderLibrary.parseShader(
      'PointsShader.fragmentShader',
      `
precision highp float;

uniform int passId;
uniform int assetId;

/* VS Outputs */
varying vec4 v_color;
varying vec2 v_texCoord;
varying vec3 v_viewPos;

#ifdef ENABLE_ES3
out vec4 fragColor;
#endif

void main(void) {

#ifndef ENABLE_ES3
  vec4 fragColor;
#endif

  if(length(v_texCoord - 0.5) > 0.5)
    discard;

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

sgFactory.registerClass('PotreePointsGeomDataShader', PotreePointsGeomDataShader)

class PotreePointsHilighlightShader extends PotreePointsShader {
  constructor(gl) {
    super(gl)

    this.__shaderStages['FRAGMENT_SHADER'] = shaderLibrary.parseShader(
      'PointsShader.fragmentShader',
      `
precision highp float;

uniform color highlightColor;

/* VS Outputs */
varying vec4 v_color;
varying vec2 v_texCoord;
varying vec3 v_viewPos;

#ifdef ENABLE_ES3
out vec4 fragColor;
#endif

void main(void) {

#ifndef ENABLE_ES3
  vec4 fragColor;
#endif

  if(length(v_texCoord - 0.5) > 0.5)
    discard;

  fragColor = highlightColor;

#ifndef ENABLE_ES3
  gl_FragColor = fragColor;
#endif
}
`
    )
  }
}

sgFactory.registerClass('PotreePointsHilighlightShader', PotreePointsHilighlightShader)

export { PotreePointsShader, PotreePointsGeomDataShader, PotreePointsHilighlightShader }
