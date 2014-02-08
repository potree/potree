/**
 * potree.js 
 * http://potree.org
 *
 * Copyright 2012, Markus Schütz
 * Licensed under the GPL Version 2 or later.
 * - http://potree.org/wp/?page_id=7
 * - http://www.gnu.org/licenses/gpl-3.0.html
 *
 */

precision highp float;

attribute vec3 	aVertexPosition;
attribute vec4 	aVertexColour;
attribute vec3 	aNormal;

uniform float 	uNear;
uniform float 	uFar;
uniform mat4 	uWorld;
uniform mat4 	uView;
uniform mat4 	uProj;
uniform float 	uPointSize;

varying vec3 	vVertexColour;
varying vec3 	vPos;
//varying vec3	vViewPos;
varying vec3 	vNormal;
//varying vec3 	vViewNormal;
//varying vec3	vViewTangent1;
//varying vec3	vViewTangent2;

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
	ps = ps * uPointSize;
	
	return ps;
}

void main(void){
	vec4 worldPos = uWorld * vec4(aVertexPosition, 1.0);
	vPos = worldPos.xyz;
	vec4 pos = uView * worldPos;
	
	vVertexColour = aVertexColour.xyz / 256.0;
//	vViewPos = pos.xyz;
//	vViewNormal = (uView*uWorld*vec4(aNormal, 0.0)).xyz;
//	vViewTangent1 = (uView*uWorld*vec4(aNormal.yzx, 0.0)).xyz;
//	vViewTangent2 = (uView*uWorld*vec4(aNormal.zxy, 0.0)).xyz;
	vNormal = (uWorld*vec4(aNormal, 0.0)).xyz;
	
	gl_PointSize = pointSize(pos);
	
	// calculate xy and linear z
	pos = uProj * pos;
	float w = pos.w;
	pos = pos / w;
	pos.z = 2.0*((w-uNear) / uFar)-1.0;
	gl_Position = pos;
	
} 

