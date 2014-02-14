

precision highp float;

uniform sampler2D uColor;

varying vec2 vTextureCoord;

void main(void){
	vec4 color = texture2D(uColor, vTextureCoord);
	color = color / color.a;
	gl_FragColor = color;
//	gl_FragColor = vec4(0.0, color.a, 0.0, 1.0);
}













