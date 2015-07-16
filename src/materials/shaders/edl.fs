
#define KERNEL_SIZE 16

uniform mat4 projectionMatrix;

uniform float near;
uniform float far;
uniform float radius;
uniform vec3 kernel[KERNEL_SIZE];

uniform sampler2D depthMap;



varying vec2 vUv;
varying vec3 vViewRay;

void main() {
    float linearDepth = texture2D(depthMap, vUv).r; 
	vec3 origin = linearDepth * vViewRay;
	
	float occlusion = 0.0;
	float occlusionCount = 0.0;
	for(int i = 0; i < KERNEL_SIZE; i++){
		vec3 sampleVec = kernel[i] * 0.005;
		
		float opacity = texture2D(depthMap, vUv + sampleVec.xy).a;
		float sampleDepth = texture2D(depthMap, vUv + sampleVec.xy).r;
		
		occlusionCount += opacity;
		if(linearDepth > sampleDepth){
			occlusion += 1.0;
		}
	}
	occlusion = 1.0 - (occlusion / float(KERNEL_SIZE));
	
	float w = occlusion;
	
	gl_FragColor = vec4(w, w, w, 1.0); 
}