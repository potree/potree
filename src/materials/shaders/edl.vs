

varying vec2 vUv;
varying vec3 vViewRay;

void main() {
    vUv = uv;
	
	vec4 mvPosition = modelViewMatrix * vec4(position,1.0);
	vViewRay = mvPosition.xyz;

    gl_Position = projectionMatrix * mvPosition;
	
	
}