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

uniform sampler2D uNormal;
uniform sampler2D uColor;
uniform sampler2D uPosition;

uniform vec3 uLightPos;
uniform vec3 uLightColor;
uniform int uIlluminationMode;

varying vec2 vTextureCoord;

vec3 phongIllumination(vec3 N, vec3 color, vec3 pos){
	vec3 L = normalize(uLightPos - pos);
	float nDotL = clamp(dot(N, L), 0.0, 1.0);
	vec3 diffuse = uLightColor * color * (nDotL*0.8 + 0.2);
	vec3 ambient = vec3(0.0,0.0,0.0);
	
	return diffuse;
}

void main(void){
	vec4 weightedColor = texture2D(uColor, vTextureCoord);
	if(weightedColor.a <= 0.0){
		discard;
	}

	vec4 weightedNormal = texture2D( uNormal, vTextureCoord );
	vec3 N = normalize(weightedNormal.xyz / weightedNormal.w);
	vec3 color = weightedColor.rgb / weightedColor.a;
	vec3 pos = texture2D(uPosition, vTextureCoord).xyz;	

	if(uIlluminationMode == 0){
		gl_FragColor = vec4(color, 1.0);
	}else if(uIlluminationMode == 1){
		gl_FragColor = vec4(phongIllumination(N, color, pos), 1.0);
	}else if(uIlluminationMode == 2){
		gl_FragColor = vec4(N, 1.0);
	}else if(uIlluminationMode == 3){
		gl_FragColor = vec4(pos, 1.0);
	}
}













