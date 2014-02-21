

precision highp float;

varying vec3	vPos;

void main(void){
	float a = pow(2.0*(gl_PointCoord.x - 0.5), 2.0);
	float b = pow(2.0*(gl_PointCoord.y - 0.5), 2.0);
	float c = 1.0 - (a + b);
	
	if(c < 0.0){
		discard;
	}
	
	vec3 id = vec3(1.0,1.0,1.0);
	gl_FragColor = vec4(vPos, 1.0);
} 