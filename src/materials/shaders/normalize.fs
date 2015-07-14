
#extension GL_EXT_frag_depth : enable

uniform sampler2D depthMap;
uniform sampler2D texture;

varying vec2 vUv;

void main() {
    vec4 color = texture2D(texture, vUv); 
    float depth = texture2D(depthMap, vUv).g; 
	color = color / color.w;
    gl_FragColor = color; 
	
	gl_FragDepthEXT = depth;
}