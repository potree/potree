
#extension GL_EXT_frag_depth : enable

uniform sampler2D uWeightMap;
uniform sampler2D uDepthMap;

varying vec2 vUv;

void main() {
	float depth = texture2D(uDepthMap, vUv).g; 
	
	if(depth >= 1.0){
		discard;
	}
	
	vec4 color = texture2D(uWeightMap, vUv); 
	color = color / color.w;

	gl_FragColor = vec4(color.xyz, 1.0); 

	gl_FragDepthEXT = depth;
}