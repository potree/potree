
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
uniform sampler2D uSnapshotDepth[max_snapshots];
uniform mat4 uSnapView[max_snapshots];
uniform mat4 uSnapProj[max_snapshots];
uniform mat4 uSnapProjInv[max_snapshots];
uniform mat4 uSnapViewInv[max_snapshots];
#endif

varying vec4	vSP;
varying float 	vPointSize;
varying vec3 	vPosition;

varying vec4 vSnapProjected[max_snapshots];
varying float vSnapProjectedDistance[max_snapshots];

float specularStrength = 1.0;

void main() {

	vec3 color = vColor;
	float depth = gl_FragCoord.z;


	#if defined(snap_enabled)
		vec3 sRGB = vec3(0.0, 0.0, 0.0);
		float sA = 0.0;

		for(int i = 0; i < max_snapshots; i++){

			float snapLinearDistance = 0.0;
			float currentLinearDistance = vSnapProjectedDistance[i];
			vec2 uv;

			{
				vec2 pc = vec2(gl_PointCoord.x - 0.5, (1.0 - gl_PointCoord.y) - 0.5);
				vec2 offset = (pc * vPointSize) / vec2(screenWidth, screenHeight);
		
				uv = 0.5 * (vSnapProjected[i].xy /vSnapProjected[i].w) + 0.5 + offset;	
				
				vec4 td = texture2D(uSnapshotDepth[i], uv);
				float d = td.r;

				// TODO save linear distance in uSnapshotDepth!!!
				vec4 snapViewPos = uSnapProjInv[i] * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
				snapViewPos = snapViewPos / snapViewPos.w;
				snapLinearDistance = -snapViewPos.z;

			}

			if(abs(currentLinearDistance - snapLinearDistance) < vRadius * 1.0){
				vec4 col = texture2D(uSnapshot[i], uv);
				//vec4 col = vec4(0.5, 1.0, 0.0, 1.0);
				sRGB += col.rgb;

				if(col.a != 0.0){
					sA = sA + 1.0;
				}
			}else{
				//sRGB += vColor;
				//sA += 1.0;
				
			}

		}


		color = sRGB / sA;
		if(sA == 0.0){
			//color = vColor;
			discard;
		}
	
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


