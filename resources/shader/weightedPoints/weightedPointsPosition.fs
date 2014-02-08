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

varying vec3 vPos;

void main(void){
	float a = pow(2.0*(gl_PointCoord.x - 0.5), 2.0);
	float b = pow(2.0*(gl_PointCoord.y - 0.5), 2.0);
	float c = 1.0 - (a + b);
	
	if(c < 0.0){
		discard;
	}

	gl_FragColor = vec4( vPos, 1.0 );
} 