
// 
// adapted from the EDL shader code from Christian Boucheny in cloud compare:
// https://github.com/cloudcompare/trunk/tree/master/plugins/qEDL/shaders/EDL
//




uniform mat4 projectionMatrix;

uniform float screenWidth;
uniform float screenHeight;
uniform float near;
uniform float far;
uniform vec2 neighbours[16];
uniform vec3 lightDir;
uniform float zoom;
uniform float pixScale;
uniform float expScale;

uniform sampler2D depthMap;
uniform sampler2D colorMap;

varying vec2 vUv;
varying vec3 vViewRay;

float ztransform(float depth){
	return 1.0 - (depth - near) / (far - near);
}

float obscurance(float z, float dist){
	return max(0.0, z) / dist;
}

float computeObscurance(float depth, float scale){
	vec4 P = vec4(lightDir, -dot(lightDir, vec3(0.0, 0.0, depth) ) );
	
	float sum = 0.0;
	
	for(int c = 0; c < 8; c++){
		vec2 N_rel_pos = scale * zoom / vec2(screenWidth, screenHeight) * neighbours[c];
		vec2 N_abs_pos = vUv + N_rel_pos;
		
		float Zn = ztransform(texture2D(depthMap, N_abs_pos).r);
		float Znp = dot( vec4( N_rel_pos, Zn, 1.0), P );
		
		//sum += obscurance( Znp, scale );
		sum += obscurance( Znp, 0.1 * texture2D(depthMap, vUv).r  );
	}
	
	return sum;
}

void main(){

	float depth = ztransform(texture2D(depthMap, vUv).r);
	float f = computeObscurance(depth, pixScale);
	f = exp(-expScale * f);
	
	vec3 color = texture2D(colorMap, vUv).rgb;
	
	//gl_FragColor = vec4(f, f, f, 1.0);
	gl_FragColor = vec4(color * f, 1.0);

}
