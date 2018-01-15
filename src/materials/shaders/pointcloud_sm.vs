
precision mediump float;
precision mediump int;

attribute vec3 position;
attribute vec3 color;

uniform mat4 uWorldView;

uniform float uScreenWidth;
uniform float uScreenHeight;
uniform float near;
uniform float far;

uniform float uSpacing;
uniform float uOctreeSize;
uniform float uLevel;
uniform float uVNStart;

uniform sampler2D visibleNodes;

varying float vLinearDepth;
varying vec3 vColor;

#define PI 3.141592653589793



// ---------------------
// OCTREE
// ---------------------

#if defined(adaptive_point_size)
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
	float iOffset = uVNStart;
	float depth = uLevel;
	for(float i = 0.0; i <= 30.0; i++){
		float nodeSizeAtLevel = uOctreeSize  / pow(2.0, i + uLevel + 0.0);
		
		vec3 index3d = (position-offset) / nodeSizeAtLevel;
		index3d = floor(index3d + 0.5);
		float index = 4.0 * index3d.x + 2.0 * index3d.y + index3d.z;
		
		vec4 value = texture2D(visibleNodes, vec2(iOffset / 2048.0, 0.0));
		float mask = value.r * 255.0;
		if(isBitSet(mask, index)){
			// there are more visible child nodes at this position
			iOffset = iOffset + value.g * 255.0 * 256.0 + value.b * 255.0 + numberOfOnes(mask, index - 1.0);
			depth++;
		}else{
			// no more visible child nodes at this position
			return depth;
		}
		
		offset = offset + (vec3(1.0, 1.0, 1.0) * nodeSizeAtLevel * 0.5) * index3d;
        
	}
		
	return depth;
}

#endif


vec3 sphericalToPlanar(vec3 pos){
	float u = atan(pos.y, pos.x) / PI;
	float v = atan(pos.z, length(pos.xy)) / PI;
	float distance = length(pos);

	return vec3(u, v, distance);
}

void main() {

	vec3 viewPos = (uWorldView * vec4(position, 1.0)).xyz;
	
	//float u = atan(viewPos.y, viewPos.x) / PI;
	//float v = atan(viewPos.z, length(viewPos.xy)) / PI;
	//float distance = length(viewPos);

	vec3 planar = sphericalToPlanar(viewPos);
	float distance = planar.z;
	vLinearDepth = distance;

	float t = 2.0 * ((planar.z - near) / (far - near)) - 1.0;

	gl_Position = vec4(planar.xy, t, 1.0);

	vColor = vec3(1.0, 1.0, 1.0) * (distance / 20.0);

	float pointSize = 2.0;
	#if defined(adaptive_point_size)
		float lod = getLOD();
		float r = uSpacing / pow(2.0, lod);
		float pr = 0.5 * r / distance;

		pointSize = pr * uScreenWidth;


		vColor = vec3(1.0, 1.0, 1.0) * lod * 0.2;

	#else 
		pointSize = 2.0;
	#endif

	pointSize = min(pointSize, 20.0);

	gl_PointSize = pointSize;


	// ---------------------
	// POINT SIZE
	// ---------------------
	//float pointSize = 1.0;
	//
	//float slope = tan(fov / 2.0);
	//float projFactor =  -0.5 * uScreenHeight / (slope * vViewPosition.z);
	//
	//float r = uSpacing * 1.5;
	//vRadius = r;
	//#if defined fixed_point_size
	//	pointSize = size;
	//#elif defined attenuated_point_size
	//	pointSize = size;
	//	if(!useOrthographicCamera)
	//		pointSize = pointSize * projFactor;
	//#elif defined adaptive_point_size
	//	if(useOrthographicCamera) {
	//		pointSize = size * r / (orthoRange * pow(2.0, getLOD())) * uScreenWidth;
	//	} else {
	//		float worldSpaceSize = size * r / getPointSizeAttenuation();
	//		pointSize = worldSpaceSize * projFactor;
	//	}
	//#endif
//
	//pointSize = max(minSize, pointSize);
	//pointSize = min(maxSize, pointSize);
	//
	//vRadius = pointSize / projFactor;
	//
	//gl_PointSize = pointSize;
	//vPointSize = gl_PointSize;
	
}
