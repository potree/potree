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

varying vec3 normal;

uniform vec4 uColor; 

void main(void){
	gl_FragColor = uColor;
	gl_FragColor = vec4(normal, 1.0);
//	gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
} 