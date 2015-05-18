
#if defined use_interpolation
	#extension GL_EXT_frag_depth : enable
#endif

uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat3 normalMatrix;
uniform vec3 cameraPosition;

uniform float fov;
uniform float spacing;
uniform float near;
uniform float far;
uniform float pcIndex;
uniform float screenWidth;
uniform float screenHeight;
uniform float blendDepth;

uniform sampler2D depthMap;
varying vec3 vColor;
varying float vOpacity;
varying float vLinearDepth;
varying float vDepth;
varying vec3 vViewPos;
varying float vRadius;

void main() {

	#if defined(circle_point_shape) || defined(use_interpolation) || defined (weighted_splats)
		float u = 2.0 * gl_PointCoord.x - 1.0;
		float v = 2.0 * gl_PointCoord.y - 1.0;
	#endif
	
	#if defined(circle_point_shape) || defined (weighted_splats)
		float cc = u*u + v*v;
		if(cc > 1.0){
			discard;
		}
	#endif
	
	#if defined weighted_splats
		vec2 uv = gl_FragCoord.xy / vec2(screenWidth, screenHeight);
		float depth = texture2D(depthMap, uv).r;
		if(vLinearDepth > depth + vRadius * 0.5){
			discard;
		}
	#endif
	
	#if defined use_interpolation
		float w = 1.0 - ( u*u + v*v);
		vec4 pos = vec4(vViewPos, 1.0);
		pos.z += w * vRadius;
		pos = projectionMatrix * pos;
		pos = pos / pos.w;
		gl_FragDepthEXT = (pos.z + 1.0) / 2.0;
	#endif
	
	#if defined color_type_point_index
		gl_FragColor = vec4(vColor, pcIndex / 255.0);
	#else
		gl_FragColor = vec4(vColor, vOpacity);
	#endif
	
	#if defined weighted_splats
	    float w = pow(1.0 - (u*u + v*v), 2.0);
		gl_FragColor.rgb = gl_FragColor.rgb * w;
		gl_FragColor.a = w;
	#endif
	
}


