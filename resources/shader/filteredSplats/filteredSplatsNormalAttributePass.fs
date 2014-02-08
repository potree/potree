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

//varying vec3 	vVertexColour;
varying vec3 	vNormal;
//varying vec3 	vViewNormal;
//varying vec3 	vPos;
//varying vec3	vViewPos;
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

//float getDistance(){
//	vec3 N = normalize(vViewNormal);
//	vec3 P = vec3(0.0, 0.0, 0.0);
//	vec3 Cc = vViewPos;
//	vec3 T1 = vViewTangent1;
//	vec3 T2 = vViewTangent2;
//	T1 = N.yzx;
//	T2 = N.zxy;
//	
//	float u = (gl_FragCoord.x / uWindowSize.x)-0.5;
//	float v = (gl_FragCoord.y / uWindowSize.y)-0.5;
////	float u = 2.0*(gl_PointCoord.x - 0.5);
////	float v = 2.0*((1.0-gl_PointCoord.y)-0.5);
//	
//	vec3 V = vec3(0,0,0);
//	V.x = u*uNearWindowSize.x;
//	V.y = v*uNearWindowSize.y;
//	V.z = -uNear;
//	V = normalize(V);
//	
//	float d = -dot(N, Cc);
////	d = 2.0;
//	float t = -(dot(P,N)+d)/dot(V, N);
//	t = max(t, 0.0);
//	vec3 I = P + V*t - Cc;
////	
//	float val = pow(dot(T1, I), 2.0) + pow(dot(T2, I), 2.0);
//	val = val *	 5000.0;
//	
//	return 1.0 - val;
//}

void main(void){
	float c = getDistance();
	if(c <= 0.0){
		discard;
	}

	// calculate weight
//	float d = 5.0*(c + 0.5);
//	float weight = exp(d*d);
	
	// interpolate normals smoother than color
	float weight = pow(c, 2.0);
//	float weight = pow(c+0.2, 40.0);

	gl_FragColor = vec4( weight * vNormal, weight );
	
} 



