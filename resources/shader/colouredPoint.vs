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
//attribute vec3 aNormal;

uniform mat4 world;
uniform mat4 view;
uniform mat4 proj;
uniform float uOpacity;
uniform float uPointSize;
uniform float uPointSizeMultiplicator;

varying vec3 vVertexColour;
varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec2 	vDepth; 

void main(void){
	vec4 worldPos = world * vec4(aVertexPosition, 1.0);
	vec4 pos = view * worldPos;
	//vNormal = (worldPos * vec4(aNormal, 0.0)).xyz;
	vWorldPos = worldPos.xyz;
	
	// calculate point size depending on the distance from viewport
	// or rather: take a point in view space, translate it by {trans} along the x and y axis
	// and then calculate the translated distance in projected space.  
	// this distance, multiplied by a user defined factor, gives the desired point size.
	float trans = 0.5 + max(length(pos)-10.0, 0.0) / 30.0;
	vec4 p1 = proj * pos;
	vec4 p2 = proj * (pos + vec4(trans,trans,0.0,0.0));
	p1.xyz = p1.xyz / p1.w;
	p2.xyz = p2.xyz / p1.w;
	vec2 dist = p1.xy - p2.xy;
	float ps = length(dist) * 30.0;
	ps = max(3.0, ps);
	ps = ps * uPointSizeMultiplicator;
	
	gl_PointSize = ps;
	gl_Position = proj * pos;;
	vVertexColour = aVertexColour.xyz / 256.0;
	vDepth = vec2( gl_Position.w, gl_Position.z / gl_Position.w * 0.5 + 0.5 );
} 