

precision highp float;

varying vec2 vTextureCoord;

uniform sampler2D uTexture;
uniform sampler2D uDepth;
uniform float uWidth;
uniform float uHeight;

void main(void)
{
	vec4 col = texture2D(uTexture, vTextureCoord);
	gl_FragColor = vec4(col.xyz, col.w);
} 