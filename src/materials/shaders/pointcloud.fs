
precision mediump float;
precision mediump int;

#if defined paraboloid_point_shape
	#extension GL_EXT_frag_depth : enable
#endif

uniform mat4 viewMatrix;
uniform mat4 uViewInv;
uniform mat4 uProjInv;
uniform vec3 cameraPosition;


uniform mat4 projectionMatrix;
uniform float uOpacity;

uniform float blendHardness;
uniform float blendDepthSupplement;
uniform float fov;
uniform float uSpacing;
uniform float near;
uniform float far;
uniform float uPCIndex;
uniform float uScreenWidth;
uniform float uScreenHeight;

varying vec3	vColor;
varying float	vLogDepth;
varying vec3	vViewPosition;
varying float	vRadius;
varying float 	vPointSize;
varying vec3 	vPosition;

#if defined(num_snapshots) && num_snapshots > 0
uniform sampler2D uSnapshot[num_snapshots];
uniform sampler2D uSnapshotDepth[num_snapshots];
uniform mat4 uSnapView[num_snapshots];
uniform mat4 uSnapProj[num_snapshots];
uniform mat4 uSnapProjInv[num_snapshots];
uniform mat4 uSnapViewInv[num_snapshots];

varying float vSnapTextureID;
#endif






float specularStrength = 1.0;

void main() {

	vec3 color = vColor;
	float depth = gl_FragCoord.z;


	//#if defined(num_snapshots) && num_snapshots > 0
	//	vec3 sRGB = vec3(0.0, 0.0, 0.0);
	//	float sA = 0.0;

	//	for(int i = 0; i < num_snapshots; i++){

	//		float snapLinearDistance = 0.0;
	//		float currentLinearDistance = vSnapProjectedDistance[i];
	//		vec2 uv;

	//		{
	//			vec2 pc = vec2(gl_PointCoord.x - 0.5, (1.0 - gl_PointCoord.y) - 0.5);
	//			vec2 offset = (pc * vPointSize) / vec2(uScreenWidth, uScreenHeight);
	//	
	//			uv = 0.5 * (vSnapProjected[i].xy /vSnapProjected[i].w) + 0.5 + offset;	
	//			
	//			vec4 td = texture2D(uSnapshotDepth[i], uv);
	//			float d = td.r;

	//			// TODO save linear distance in uSnapshotDepth!!!
	//			vec4 snapViewPos = uSnapProjInv[i] * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
	//			snapViewPos = snapViewPos / snapViewPos.w;
	//			snapLinearDistance = -snapViewPos.z;

	//		}

	//		if(abs(currentLinearDistance - snapLinearDistance) < vRadius * 1.0){
	//			vec4 col = texture2D(uSnapshot[i], uv);
	//			//vec4 col = vec4(0.5, 1.0, 0.0, 1.0);
	//			sRGB += col.rgb;

	//			if(col.a != 0.0){
	//				sA = sA + 1.0;
	//			}
	//		}else{
	//			//sRGB += vColor;
	//			//sA += 1.0;
	//			
	//		}

	//	}


	//	color = sRGB / sA;
	//	if(sA == 0.0){
	//		//color = vColor;
	//		discard;
	//	}
	//
	//#endif


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
		gl_FragColor = vec4(color, uPCIndex / 255.0);
	#else
		gl_FragColor = vec4(color, uOpacity);
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

	#if defined(weighted_splats)
		float distance = 2.0 * length(gl_PointCoord.xy - 0.5);
		float weight = max(0.0, 1.0 - distance);
		weight = pow(weight, 1.5);

		gl_FragColor.a = weight;
		gl_FragColor.xyz = gl_FragColor.xyz * weight;
	#endif
	
}


