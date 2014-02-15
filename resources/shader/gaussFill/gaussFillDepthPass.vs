
precision highp float;

attribute vec3 aVertexPosition;
attribute vec3 aNormal;

uniform float uNear;
uniform float uFar;
uniform mat4 uWorld;
uniform mat4 uView;
uniform mat4 uProj;
uniform float uPointSize;
uniform float uBlendDepth;

// calculate point size depending on the distance from viewport
// or rather: take a point in view space, translate it by {trans} along the x and y axis
// and then calculate the translated distance in projected space.  
// this distance, multiplied by a user defined factor, gives the desired point size.
float pointSize(vec4 pos){
	float trans = 0.5 + max(length(pos)-10.0, 0.0) / 30.0;
	vec4 p1 = uProj * pos;
	vec4 p2 = uProj * (pos + vec4(trans,trans,0.0,0.0));
	p1.xyz = p1.xyz / p1.w;
	p2.xyz = p2.xyz / p1.w;
	vec2 dist = p1.xy - p2.xy;
	float ps = length(dist) * 30.0;
	ps = max(3.0, ps);
//	ps = ps * uPointSize;
	
	return ps;
}

void main(void){
	vec4 worldPos = uWorld * vec4(aVertexPosition, 1.0);
//	vPos = (uWorld * vec4(aVertexPosition, 1.0)).xyz;
	vec4 pos = uView * worldPos;
	
	gl_PointSize = pointSize(pos);
	pos = uProj * pos;
	float w = pos.w;
	float depth = pos.z;
	pos = pos / w;
	pos.z = 2.0*((w+uBlendDepth-uNear) / uFar)-1.0;
	gl_Position = pos;
} 
