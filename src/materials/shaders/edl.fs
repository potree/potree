
#define KERNEL_SIZE 16

uniform mat4 projectionMatrix;

uniform float near;
uniform float far;
uniform float radius;
uniform vec3 kernel[KERNEL_SIZE];

uniform sampler2D depthMap;
uniform sampler2D randomMap;

varying vec2 vUv;
varying vec3 vViewRay;

// TODO don't fetch same texel multiple times (depth + alpha)

void main() {
    float linearDepth = texture2D(depthMap, vUv).r; 
	vec3 origin = linearDepth * vViewRay;
	
	vec2 uvRand = gl_FragCoord.xy;
    uvRand.x = mod(uvRand.x, 4.0) / 4.0;
    uvRand.y = mod(uvRand.y, 4.0) / 4.0;
	float random = texture2D(randomMap, uvRand).r * 3.1415;
	mat2 randomRotation = mat2(cos(random), sin(random), -sin(random), cos(random));
	
	float occlusion = 0.0;
	float occlusionCount = 0.0;
	for(int i = 0; i < KERNEL_SIZE; i++){	
		vec3 sampleVec = kernel[i] * 0.05;
		sampleVec.xy = randomRotation * sampleVec.xy;
		
		float opacity = texture2D(depthMap, vUv + sampleVec.xy).a;
		float sampleDepth = texture2D(depthMap, vUv + sampleVec.xy).r;
		
		occlusionCount += opacity;
		if(linearDepth > sampleDepth){
			occlusion += 1.0;
		}
	}
    
    if(occlusionCount > 0.0){
		occlusion =  (occlusion / float(KERNEL_SIZE));
    }else{
        occlusion = 0.0;
    }
	
	if(texture2D(depthMap, vUv).a == 0.0){
     	occlusion = 0.0;   
    }
	
	float w = occlusion;
	
	gl_FragColor = vec4(w, w, w, 1.0); 
}