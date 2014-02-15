
precision highp float;

attribute vec3 	aVertexPosition;
attribute vec4 	aVertexColour;

uniform mat4 	uWorld;
uniform mat4 	uView;
uniform mat4 	uProj;
uniform float	uNear;
uniform float 	uFar;
uniform float	uPointSize;

varying vec3 	vVertexColour;

float pointSize(vec4 pos){
	float trans = 0.5 + max(length(pos)-10.0, 0.0) / 30.0;
	vec4 p1 = uProj * pos;
	vec4 p2 = uProj * (pos + vec4(trans,trans,0.0,0.0));
	p1.xyz = p1.xyz / p1.w;
	p2.xyz = p2.xyz / p1.w;
	vec2 dist = p1.xy - p2.xy;
	float ps = length(dist) * 30.0;
	ps = max(3.0, ps);
	ps = ps * 0.3;
	
	return ps;
}

void main(void){
	vec4 pos = uView * uWorld * vec4(aVertexPosition, 1.0);
	vVertexColour = aVertexColour.xyz / 256.0;
	//float ps = pointSize(pos);
	
	pos = uProj * pos;
	float w = pos.w;
	float depth = pos.z;
	pos = pos / w;
	pos.z = 2.0*((w-uNear) / uFar)-1.0;
	
	gl_PointSize = 1.0;
	//gl_PointSize = ps;
	gl_Position = pos;
	
} 

