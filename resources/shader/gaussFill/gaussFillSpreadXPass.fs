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

// gauss kernel, r = 3:  0.034793, 0.102006, 0.216137, 0.294128, 0.216137, 0.102006, 0.034793
// gauss kernel, r = 5:  0.0216149, 0.0439554, 0.0778778, 0.118718, 0.153857, 0.167953, 0.153857, 0.118718, 0.0778778, 0.0439554, 0.0216149

precision highp float;

uniform sampler2D uColor;
uniform vec2 uWindowSize;
uniform float uKernel[11];

varying vec2 vTextureCoord;

void main(void){

	vec4 color = vec4(0.0, 0.0, 0.0, 0.0);
	for(int i = 0; i < 11; i++){
		float j = float(i)-5.0;
		
		vec2 offset = vec2(j/uWindowSize.x, 0.0);
		color = color + uKernel[i] * texture2D(uColor, vTextureCoord + offset);
	}
	
	gl_FragColor = color;
}













