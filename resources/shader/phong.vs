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
attribute vec3 aVertexNormal;

varying vec3 normal;

uniform mat4 uWorld;
uniform mat4 uView;
uniform mat4 uProj;

void main(void){
	vec4 pos = uProj * uView * uWorld * vec4(aVertexPosition, 1.0);
	normal = (uWorld * vec4(aVertexNormal, 0.0)).xyz;
	gl_Position = pos;
	gl_PointSize = 10.0;
} 