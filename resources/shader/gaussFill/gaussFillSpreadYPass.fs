
precision highp float;

uniform sampler2D uColor;
uniform vec2 uWindowSize;
uniform float uKernel[11];

varying vec2 vTextureCoord;

void main(void){
	vec4 color = vec4(0.0, 0.0, 0.0, 0.0);
	for(int i = 0; i < 11; i++){
		float j = float(i)-5.0;
		
		vec2 offset = vec2(0.0, j/uWindowSize.y);
		color = color + uKernel[i] * texture2D(uColor, vTextureCoord + offset);
	}

	gl_FragColor = color;
}













