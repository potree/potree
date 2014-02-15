

precision highp float;

attribute vec3 aVertexPosition;

uniform mat4 uWorld;
uniform mat4 uView;
uniform mat4 uProj;

void main(void){
	vec4 pos = uProj * uView * uWorld * vec4(aVertexPosition, 1.0);
	gl_Position = pos;
} 