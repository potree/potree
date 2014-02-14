
precision highp float;

varying vec3 normal;

uniform vec4 uColor; 

void main(void){
	gl_FragColor = uColor;
	gl_FragColor = vec4(normal, 1.0);
//	gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
} 