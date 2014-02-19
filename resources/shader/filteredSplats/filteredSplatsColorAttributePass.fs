

precision highp float;

varying vec3 	vVertexColour;

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

	gl_FragColor = vec4( weight * vVertexColour, weight );
} 



