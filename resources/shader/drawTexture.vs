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
attribute vec2 aTexcoord;

varying vec2 vTextureCoord;


void main(void)
{
	gl_PointSize = 50.0;
	gl_Position = vec4(aVertexPosition, 1.0);
	vTextureCoord = aTexcoord;
} 