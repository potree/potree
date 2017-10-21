
precision mediump float;
precision mediump int;

attribute vec3 position;
attribute vec3 color;

uniform mat4 uWorldView;

uniform float near;
uniform float far;

varying vec3 vColor;

#define PI 3.141592653589793

void main() {

	vec3 viewPos = (uWorldView * vec4(position, 1.0)).xyz;
	
	float u = atan(viewPos.y, viewPos.x) / PI;
	float v = atan(viewPos.z, length(viewPos.xy)) / PI;
	float distance = length(viewPos);
	float t = 2.0 * ((distance - near) / (far - near)) - 1.0;

	gl_Position = vec4(u, v, t, 1.0);

	gl_PointSize = 2.0;

	vColor = color;
	
}
