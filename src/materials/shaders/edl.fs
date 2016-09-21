// 
// adapted from the EDL shader code from Christian Boucheny in cloud compare:
// https://github.com/cloudcompare/trunk/tree/master/plugins/qEDL/shaders/EDL
//

//#define NEIGHBOUR_COUNT 4

uniform float screenWidth;
uniform float screenHeight;
uniform vec2 neighbours[NEIGHBOUR_COUNT];
uniform float edlStrength;
uniform float radius;
uniform float opacity;

uniform sampler2D colorMap;

varying vec2 vUv;

const float infinity = 1.0 / 0.0;

float response(float depth){
	vec2 uvRadius = radius / vec2(screenWidth, screenHeight);
	
	float sum = 0.0;
	
	for(int i = 0; i < NEIGHBOUR_COUNT; i++){
		vec2 uvNeighbor = vUv + uvRadius * neighbours[i];
		
		float neighbourDepth = texture2D(colorMap, uvNeighbor).a;
		
		if(neighbourDepth == 0.0){
			neighbourDepth = infinity;
		}
		
		sum += max(0.0, depth - neighbourDepth);
	}
	
	return sum / float(NEIGHBOUR_COUNT);
}

void main(){
	vec4 color = texture2D(colorMap, vUv);
	
	float depth = color.a;
	if(depth == 0.0){
		depth = infinity;
	}
	
	float res = response(depth);
	float shade = exp(-res * 300.0 * edlStrength);
	
	if(color.a == 0.0 && res == 0.0){
		discard;
	}
	
	gl_FragColor = vec4(color.rgb * shade, opacity);
}
