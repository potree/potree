
// the following is an incomplete list of attributes, uniforms and defines
// which are automatically added through the THREE.ShaderMaterial

//attribute vec3 position;
//attribute vec3 color;
//attribute vec3 normal;

//uniform mat4 modelMatrix;
//uniform mat4 modelViewMatrix;
//uniform mat4 projectionMatrix;
//uniform mat4 viewMatrix;
//uniform mat3 normalMatrix;
//uniform vec3 cameraPosition;

//#define MAX_DIR_LIGHTS 0
//#define MAX_POINT_LIGHTS 1
//#define MAX_SPOT_LIGHTS 0
//#define MAX_HEMI_LIGHTS 0
//#define MAX_SHADOWS 0
//#define MAX_BONES 58

#define max_clip_boxes 30

attribute float intensity;
attribute float classification;
attribute float returnNumber;
attribute float numberOfReturns;
attribute float pointSourceID;
attribute vec4 indices;

uniform float screenWidth;
uniform float screenHeight;
uniform float fov;
uniform float spacing;
uniform float near;
uniform float far;

#if defined use_clip_box
	uniform mat4 clipBoxes[max_clip_boxes];
	uniform vec3 clipBoxPositions[max_clip_boxes];
#endif


uniform float heightMin;
uniform float heightMax;
uniform float intensityMin;
uniform float intensityMax;
uniform float size;				// pixel size factor
uniform float minSize;			// minimum pixel size
uniform float maxSize;			// maximum pixel size
uniform float octreeSize;
uniform vec3 bbSize;
uniform vec3 uColor;
uniform float opacity;
uniform float clipBoxCount;

uniform float transition;


uniform sampler2D visibleNodes;
uniform sampler2D gradient;
uniform sampler2D classificationLUT;
uniform sampler2D depthMap;

varying float	vOpacity;
varying vec3	vColor;
varying float	vLinearDepth;
varying float	vLogDepth;
varying vec3	vViewPosition;
varying float 	vRadius;
varying vec3	vWorldPosition;
varying vec3	vNormal;


// ---------------------
// OCTREE
// ---------------------

#if (defined(adaptive_point_size) || defined(color_type_lod)) && defined(tree_type_octree)
/**
 * number of 1-bits up to inclusive index position
 * number is treated as if it were an integer in the range 0-255
 *
 */
float numberOfOnes(float number, float index){
	float tmp = mod(number, pow(2.0, index + 1.0));
	float numOnes = 0.0;
	for(float i = 0.0; i < 8.0; i++){
		if(mod(tmp, 2.0) != 0.0){
			numOnes++;
		}
		tmp = floor(tmp / 2.0);
	}
	return numOnes;
}


/**
 * checks whether the bit at index is 1
 * number is treated as if it were an integer in the range 0-255
 *
 */
bool isBitSet(float number, float index){
	return mod(floor(number / pow(2.0, index)), 2.0) != 0.0;
}


/**
 * find the LOD at the point position
 */
float getLOD(){
	vec3 offset = vec3(0.0, 0.0, 0.0);
	float iOffset = 0.0;
	float depth = 0.0;
	for(float i = 0.0; i <= 1000.0; i++){
		float nodeSizeAtLevel = octreeSize  / pow(2.0, i);
		vec3 index3d = (position - offset) / nodeSizeAtLevel;
		index3d = floor(index3d + 0.5);
		float index = 4.0*index3d.x + 2.0*index3d.y + index3d.z;
		
		vec4 value = texture2D(visibleNodes, vec2(iOffset / 2048.0, 0.0));
		float mask = value.r * 255.0;
		if(isBitSet(mask, index)){
			// there are more visible child nodes at this position
			iOffset = iOffset + value.g * 255.0 + numberOfOnes(mask, index - 1.0);
			depth++;
		}else{
			// no more visible child nodes at this position
			return depth;
		}
		offset = offset + (vec3(1.0, 1.0, 1.0) * nodeSizeAtLevel * 0.5) * index3d;
	}
		
	return depth;
}

float getPointSizeAttenuation(){
	return pow(1.9, getLOD());
}


#endif


// ---------------------
// KD-TREE
// ---------------------

#if (defined(adaptive_point_size) || defined(color_type_lod)) && defined(tree_type_kdtree)

float getLOD(){
	vec3 offset = vec3(0.0, 0.0, 0.0);
	float iOffset = 0.0;
	float depth = 0.0;
		
		
	vec3 size = bbSize;	
	vec3 pos = position;
		
	for(float i = 0.0; i <= 1000.0; i++){
		
		vec4 value = texture2D(visibleNodes, vec2(iOffset / 2048.0, 0.0));
		
		int children = int(value.r * 255.0);
		float next = value.g * 255.0;
		int split = int(value.b * 255.0);
		
		if(next == 0.0){
		 	return depth;
		}
		
		vec3 splitv = vec3(0.0, 0.0, 0.0);
		if(split == 1){
			splitv.x = 1.0;
		}else if(split == 2){
		 	splitv.y = 1.0;
		}else if(split == 4){
		 	splitv.z = 1.0;
		}
		
		iOffset = iOffset + next;
		
		float factor = length(pos * splitv / size);
		if(factor < 0.5){
		 	// left
		    if(children == 0 || children == 2){
		    	return depth;
		    }
		}else{
		  	// right
		    pos = pos - size * splitv * 0.5;
		    if(children == 0 || children == 1){
		    	return depth;
		    }
		    if(children == 3){
		    	iOffset = iOffset + 1.0;
		    }
		}
		size = size * ((1.0 - (splitv + 1.0) / 2.0) + 0.5);
		
		depth++;
	}
		
		
	return depth;	
}

float getPointSizeAttenuation(){
	return pow(1.3, getLOD());
}

#endif

// https://en.wikipedia.org/wiki/HSL_and_HSV
vec3 HSLtoRGB(vec3 hsl){
	float hd = hsl.r * 6.0;
	float c = hsl.g;
	float l = hsl.b;
	
	float x = c * (1.0 - abs(mod(hd, 2.0) - 1.0));
	
	vec3 rgb;
	if(0.0 <= hd && hd <= 1.0){
		rgb = vec3(c, x, 0.0);
	}else if(1.0 <= hd && hd <= 2.0){
		rgb = vec3(x, c, 0.0);
	}else if(2.0 <= hd && hd <= 3.0){
		rgb = vec3(0.0, c, x);
	}else if(3.0 <= hd && hd <= 4.0){
		rgb = vec3(0.0, x, c);
	}else if(4.0 <= hd && hd <= 5.0){
		rgb = vec3(x, 0.0, c);
	}else if(5.0 <= hd && hd <= 6.0){
		rgb = vec3(c, 0.0, x);
	}else{
		rgb = vec3(0.0, 0.0, 0.0);
	}
	
	float m = l - (0.3 * rgb.r + 0.59 * rgb.g + 0.11 * rgb.b);
	rgb = rgb + m;
	
	return rgb;
}

vec3 combineInHSL(vec3 cMain, vec3 cTarget, float transition){
	
	vec2 xyMain = vec2(
		(2.0*cMain.r - cMain.g - cMain.b) / 2.0,
		(sqrt(3.0) / 2.0) * (cMain.g - cMain.b)
	);
	vec2 xyTarget = vec2(
		(2.0*cTarget.r - cTarget.g - cTarget.b) / 2.0,
		(sqrt(3.0) / 2.0) * (cTarget.g - cTarget.b)
	);
	
	vec2 xy = (1.0 - transition) * xyMain + transition * xyTarget;
	
	float h = (atan(-xy.y, -xy.x) + 3.1415) / (2.0 * 3.1415);
	float c = length(xy);
	vec3 rgb = (1.0 - transition) * cMain + transition * cTarget;
	float l = 0.3 * rgb.r + 0.59 * rgb.g + 0.11 * rgb.b;
	
	return HSLtoRGB(vec3(h, c, l));
}

void main() {
	vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
	vViewPosition = -mvPosition.xyz;
	vWorldPosition = worldPosition.xyz;
	gl_Position = projectionMatrix * mvPosition;
	vOpacity = opacity;
	vLinearDepth = gl_Position.w;
	vLogDepth = log2(gl_Position.w);
	vNormal = normalize(normalMatrix * normal);

	// ---------------------
	// POINT COLOR
	// ---------------------
	
	#ifdef color_type_rgb
		vColor = color;
	#elif defined color_type_height
		vec4 world = modelMatrix * vec4( position, 1.0 );
		float w = (world.y - heightMin) / (heightMax-heightMin);
		vColor = texture2D(gradient, vec2(w,1.0-w)).rgb;
	#elif defined color_type_rgb_height
		vec4 world = modelMatrix * vec4( position, 1.0 );
		float w = (world.y - heightMin) / (heightMax-heightMin);
		vec3 cHeight = texture2D(gradient, vec2(w,1.0-w)).rgb;
		vColor = combineInHSL(color, cHeight, transition);
	#elif defined color_type_depth
		float linearDepth = -mvPosition.z ;
		float expDepth = (gl_Position.z / gl_Position.w) * 0.5 + 0.5;
		vColor = vec3(linearDepth, expDepth, 0.0);
	#elif defined color_type_intensity
		float w = (intensity - intensityMin) / (intensityMax - intensityMin);
		vColor = vec3(w, w, w);
	#elif defined color_type_intensity_gradient
		float w = (intensity - intensityMin) / intensityMax;
		vColor = texture2D(gradient, vec2(w,1.0-w)).rgb;
	#elif defined color_type_color
		vColor = uColor;
	#elif defined color_type_lod
		float depth = getLOD();
		float w = depth / 10.0;
		//float w = mod(depth, 4.0) / 3.0;
		vColor = texture2D(gradient, vec2(w,1.0-w)).rgb;
	#elif defined color_type_point_index
		vColor = indices.rgb;
	#elif defined color_type_classification
		float c = mod(classification, 16.0);
		vec2 uv = vec2(c / 255.0, 0.5);
		vec4 classColor = texture2D(classificationLUT, uv);
		vColor = classColor.rgb;
	#elif defined color_type_return_number
		if(numberOfReturns == 1.0){
			vColor = vec3(1.0, 1.0, 0.0);
		}else{
			if(returnNumber == 1.0){
				vColor = vec3(1.0, 0.0, 0.0);
			}else if(returnNumber == numberOfReturns){
				vColor = vec3(0.0, 0.0, 1.0);
			}else{
				vColor = vec3(0.0, 1.0, 0.0);
			}
		}
	#elif defined color_type_source
		float w = mod(pointSourceID, 10.0) / 10.0;
		vColor = texture2D(gradient, vec2(w,1.0 - w)).rgb;
	#elif defined color_type_normal
		vColor = (modelMatrix * vec4(normal, 0.0)).xyz;
	#elif defined color_type_phong
		vColor = color;
	#endif
	
	{
		// TODO might want to combine with the define block above to avoid reading same LUT two times
		float c = mod(classification, 16.0);
		vec2 uv = vec2(c / 255.0, 0.5);
		
		if(texture2D(classificationLUT, uv).a == 0.0){
			gl_Position = vec4(100.0, 100.0, 100.0, 0.0);
		}
	}
	
	//if(vNormal.z < 0.0){
	//	gl_Position = vec4(1000.0, 1000.0, 1000.0, 1.0);
	//}
	
	// ---------------------
	// POINT SIZE
	// ---------------------
	float pointSize = 1.0;
	
	float slope = tan(fov / 2.0);
	float projFactor =  0.5 * screenHeight / (slope * vViewPosition.z);
	
	float r = spacing * 1.5;
	vRadius = r;
	#if defined fixed_point_size
		pointSize = size;
	#elif defined attenuated_point_size
		pointSize = size * projFactor;
	#elif defined adaptive_point_size
		float worldSpaceSize = size * r / getPointSizeAttenuation();
		pointSize = worldSpaceSize * projFactor;
	#endif

	pointSize = max(minSize, pointSize);
	pointSize = min(maxSize, pointSize);
	
	vRadius = pointSize / projFactor;
	
	gl_PointSize = pointSize;
	
	
	// ---------------------
	// CLIPPING
	// ---------------------
	
	#if defined use_clip_box
		bool insideAny = false;
		for(int i = 0; i < max_clip_boxes; i++){
			if(i == int(clipBoxCount)){
				break;
			}
		
			vec4 clipPosition = clipBoxes[i] * modelMatrix * vec4( position, 1.0 );
			bool inside = -0.5 <= clipPosition.x && clipPosition.x <= 0.5;
			inside = inside && -0.5 <= clipPosition.y && clipPosition.y <= 0.5;
			inside = inside && -0.5 <= clipPosition.z && clipPosition.z <= 0.5;
			insideAny = insideAny || inside;
		}
		if(!insideAny){
	
			#if defined clip_outside
				gl_Position = vec4(1000.0, 1000.0, 1000.0, 1.0);
			#elif defined clip_highlight_inside && !defined(color_type_depth)
				float c = (vColor.r + vColor.g + vColor.b) / 6.0;
			#endif
		}else{
			#if defined clip_highlight_inside
			vColor.r += 0.5;
			#endif
			
			//vec3 cp = clipBoxPositions[0];
			//vec3 diff = vWorldPosition - cp;
			//vec3 dir = normalize(diff);
			//dir.z = 0.0;
			//dir = normalize(dir);
			//
			//vec4 worldPosition = modelMatrix * vec4( position + dir * 20.0, 1.0 );
			//vec4 mvPosition = modelViewMatrix * vec4( position + dir * 20.0, 1.0 );
			//vViewPosition = -mvPosition.xyz;
			//vWorldPosition = worldPosition.xyz;
			//gl_Position = projectionMatrix * mvPosition;
			
		}
	
	#endif
	
}
