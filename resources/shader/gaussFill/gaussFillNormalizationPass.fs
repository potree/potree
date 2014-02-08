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

uniform sampler2D uColor;

varying vec2 vTextureCoord;

void main(void){
	vec4 color = texture2D(uColor, vTextureCoord);
	color = color / color.a;
	gl_FragColor = color;
//	gl_FragColor = vec4(0.0, color.a, 0.0, 1.0);
}













