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

varying vec3 	vVertexColour;
//varying vec3 	vPos;
//varying vec3	vViewPos;
//varying vec3 	vNormal;
//varying vec3	vViewNormal;
//varying vec3	vViewTangent1;
//varying vec3	vViewTangent2;

//uniform vec2	uWindowSize;
//uniform vec2 	uNearWindowSize;
//uniform float	uNear;

//float getDistance(){
//	float u = 2.0*(gl_PointCoord.x - 0.5);
//	float v = 2.0*(gl_PointCoord.y - 0.5);
//	vec2 uv = vec2(u,v);
//	
//	vec2 a = normalize(vec2(-vViewNormal.y, vViewNormal.x));
//	vec2 b = normalize(vec2(vViewNormal.x, vViewNormal.y));
//	b = b * (1.0/vViewNormal.z);
//	
//	float val = pow(dot(a, uv), 2.0) + pow(dot(b, uv), 2.0);
//	return 1.0 - val;
//}

float getDistance(){
	float a = pow(2.0*(gl_PointCoord.x - 0.5), 2.0);
	float b = pow(2.0*(gl_PointCoord.y - 0.5), 2.0);
	float c = 1.0 - (a + b);
	
	return c;
}

void main(void){
	float c = getDistance();
	if(c <= 0.0){
		discard;
	}

	float weight = pow(c+0.2, 40.0);
//	weight = pow(c, 2.0);

	gl_FragColor = vec4( weight * vVertexColour, weight );
	
} 



