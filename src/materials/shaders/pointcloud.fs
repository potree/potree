{{defines}}
precision mediump float;
precision mediump int;

#if defined paraboloid_point_shape
	#extension GL_EXT_frag_depth : enable
#endif

uniform mat4 viewMatrix;
uniform vec3 cameraPosition;


uniform mat4 projectionMatrix;
uniform float opacity;

uniform float blendHardness;
uniform float blendDepthSupplement;
uniform float fov;
uniform float spacing;
uniform float near;
uniform float far;
uniform float pcIndex;
uniform float screenWidth;
uniform float screenHeight;

varying vec3	vColor;
varying float	vOpacity;
varying float	vLinearDepth;
varying float	vLogDepth;
varying vec3	vViewPosition;
varying float	vRadius;

#define max_snapshots 5
#if defined(snap_enabled)
uniform sampler2D uSnapshot[max_snapshots];
uniform mat4 uSnapView[max_snapshots];
uniform mat4 uSnapProj[max_snapshots];
#endif

varying vec4	vSP;
varying float 	vPointSize;

varying vec4 vSnapProjected[max_snapshots];

float specularStrength = 1.0;

void main() {

	vec3 color = vColor;
	float depth = gl_FragCoord.z;

	#if defined(snap_enabled)
		//vec2 uv = 0.5 * (vSP.xy / vSP.w) + 0.5;


		vec2 pc = vec2(
			gl_PointCoord.x - 0.5,
			(1.0 - gl_PointCoord.y) - 0.5
		);
		vec2 offset = (pc * vPointSize) / vec2(screenWidth, screenHeight);

		vec2 uv0 = 0.5 * (vSnapProjected[0].xy /vSnapProjected[0].w) + 0.5 + offset;
		vec2 uv1 = 0.5 * (vSnapProjected[1].xy /vSnapProjected[1].w) + 0.5 + offset;
		vec2 uv2 = 0.5 * (vSnapProjected[2].xy /vSnapProjected[2].w) + 0.5 + offset;
		vec2 uv3 = 0.5 * (vSnapProjected[3].xy /vSnapProjected[3].w) + 0.5 + offset;
		vec2 uv4 = 0.5 * (vSnapProjected[4].xy /vSnapProjected[4].w) + 0.5 + offset;

		vec4 tc_0 = texture2D(uSnapshot[0], uv0);
		vec4 tc_1 = texture2D(uSnapshot[1], uv1);
		vec4 tc_2 = texture2D(uSnapshot[2], uv2);
		vec4 tc_3 = texture2D(uSnapshot[3], uv3);
		vec4 tc_4 = texture2D(uSnapshot[4], uv4);

		//color = ((tc_0 + tc_1 + tc_2 + tc_3 + tc_4) / 5.0).rgb;
		//color = ((tc_0 + tc_1 + tc_2 + tc_3) / 4.0).rgb;
		//color = (tc_0.rgb + tc_1.rgb + tc_2.rgb + tc_3.rgb + tc_4.rgb) / 5.0;

		vec3 sRGB = vec3(0.0, 0.0, 0.0);
		float sA = 0.0;

		if(tc_0.a > 0.0){
			sRGB += tc_0.rgb;
			sA += tc_0.a;
		}
		if(tc_1.a > 0.0){
			sRGB += tc_1.rgb;
			sA += tc_1.a;
		}
		if(tc_2.a > 0.0){
			sRGB += tc_2.rgb;
			sA += tc_2.a;
		}
		if(tc_3.a > 0.0){
			sRGB += tc_3.rgb;
			sA += tc_3.a;
		}
		if(tc_4.a > 0.0){
			sRGB += tc_4.rgb;
			sA += tc_4.a;
		}

		//color = sRGB / sA;
		color = sRGB * 0.5;

		//color = tc.rgb;

		//if(tc.a == 0.0){
		//	discard;
		//	return;
		//}

	#endif

	#if defined(circle_point_shape) || defined(paraboloid_point_shape)
		float u = 2.0 * gl_PointCoord.x - 1.0;
		float v = 2.0 * gl_PointCoord.y - 1.0;
	#endif

	#if defined(circle_point_shape)
		float cc = u*u + v*v;
		if(cc > 1.0){
			discard;
		}
	#endif

	#if defined color_type_point_index
		gl_FragColor = vec4(color, pcIndex / 255.0);
	#else
		gl_FragColor = vec4(color, vOpacity);
	#endif

	#if defined paraboloid_point_shape
		float wi = 0.0 - ( u*u + v*v);
		vec4 pos = vec4(vViewPosition, 1.0);
		pos.z += wi * vRadius;
		float linearDepth = -pos.z;
		pos = projectionMatrix * pos;
		pos = pos / pos.w;
		float expDepth = pos.z;
		depth = (pos.z + 1.0) / 2.0;
		gl_FragDepthEXT = depth;

		#if defined(color_type_depth)
			color.r = linearDepth;
			color.g = expDepth;
		#endif

		#if defined(use_edl)
			gl_FragColor.a = log2(linearDepth);
		#endif

	#else
		#if defined(use_edl)
			gl_FragColor.a = vLogDepth;
		#endif
	#endif







}
