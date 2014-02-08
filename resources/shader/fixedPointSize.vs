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

uniform mat4 uWorld;
uniform mat4 uView;
uniform mat4 uProj;
uniform float uPointSize;

varying vec3 vVertexColour;
//varying vec3 vNormal;
varying vec3 vWorldPos;
// vDepth.x:	The linear depth. 
// vDepth.y:	DepthMap depth. 
varying vec2 vDepth; 

void main(void){
	vec4 worldPos = uWorld * vec4(aVertexPosition, 1.0);
	vec4 pos = uView * worldPos;
	//vNormal = (worldPos * vec4(aNormal, 0.0)).xyz;
	vWorldPos = worldPos.xyz;
	
	gl_PointSize = uPointSize;
	gl_Position = uProj * pos;
	vVertexColour = aVertexColour.xyz / 256.0;
	vDepth = vec2( gl_Position.w, gl_Position.z / gl_Position.w * 0.5 + 0.5 );
} 