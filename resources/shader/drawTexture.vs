
precision highp float;

attribute vec3 aVertexPosition;
attribute vec2 aTexcoord;

varying vec2 vTextureCoord;


void main(void)
{
	gl_PointSize = 50.0;
	gl_Position = vec4(aVertexPosition, 1.0);
	vTextureCoord = aTexcoord;
} 