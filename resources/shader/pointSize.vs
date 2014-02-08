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

attribute vec3 aVertexPosition;
attribute vec4 aVertexColour;
attribute vec3 aNormal;

uniform mat4 uWorld;
uniform mat4 uView;
uniform mat4 uProj;
uniform float uPointSizeMultiplicator;

varying vec3 vVertexColour;

void main(void){
	vec4 worldPos = uWorld * vec4(aVertexPosition, 1.0);
	vec4 pos = uView * worldPos;
	
	// calculate point size depending on the distance from viewport
	// or rather: take a point in view space, translate it by {trans} along the x and y axis
	// and then calculate the translated distance in projected space.  
	// this distance, multiplied by a user defined factor, gives the desired point size.
	float trans = 0.5 + max(length(pos)-10.0, 0.0) / 30.0;
	vec4 p1 = uProj * pos;
	vec4 p2 = uProj * (pos + vec4(trans,trans,0.0,0.0));
	p1.xyz = p1.xyz / p1.w;
	p2.xyz = p2.xyz / p1.w;
	vec2 dist = p1.xy - p2.xy;
	float ps = length(dist) * 30.0;
	ps = max(3.0, ps);
	ps = ps * uPointSizeMultiplicator;
	
	gl_PointSize = ps;
	gl_Position = uProj * pos;
	vVertexColour = aVertexColour.xyz / 256.0;
} 