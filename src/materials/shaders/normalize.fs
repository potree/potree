
#extension GL_EXT_frag_depth : enable

uniform sampler2D depthMap;
uniform sampler2D occlusionMap;
uniform sampler2D texture;

varying vec2 vUv;

void main() {
    vec4 color = texture2D(texture, vUv); 
    float depth = texture2D(depthMap, vUv).g; 
	float occlusion = texture2D(occlusionMap, vUv).g; 
	color = color / color.w;
    
	color = color * (1.0 - occlusion);
	gl_FragColor = vec4(color.xyz, 1.0); 
	
	gl_FragDepthEXT = depth;
}