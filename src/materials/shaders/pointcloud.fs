
#if defined use_interpolation
	#extension GL_EXT_frag_depth : enable
#endif


// the following is an incomplete list of attributes, uniforms and defines
// which are automatically added through the THREE.ShaderMaterial

// #define USE_COLOR
// 
// uniform mat4 viewMatrix;
// uniform vec3 cameraPosition;


uniform mat4 projectionMatrix;
uniform float opacity;


#if defined(color_type_phong)

	uniform vec3 diffuse;
	uniform vec3 ambient;
	uniform vec3 emissive;
	uniform vec3 specular;
	uniform float shininess;
	uniform vec3 ambientLightColor;

	#if MAX_POINT_LIGHTS > 0

		uniform vec3 	pointLightColor[ MAX_POINT_LIGHTS ];
		uniform vec3 	pointLightPosition[ MAX_POINT_LIGHTS ];
		uniform float 	pointLightDistance[ MAX_POINT_LIGHTS ];
		uniform float 	pointLightDecay[ MAX_POINT_LIGHTS ];

	#endif

	#if MAX_DIR_LIGHTS > 0

		uniform vec3 directionalLightColor[ MAX_DIR_LIGHTS ];
		uniform vec3 directionalLightDirection[ MAX_DIR_LIGHTS ];

	#endif

#endif

//#if MAX_SPOT_LIGHTS > 0
//
//	uniform vec3 spotLightColor[ MAX_SPOT_LIGHTS ];
//	uniform vec3 spotLightPosition[ MAX_SPOT_LIGHTS ];
//	uniform vec3 spotLightDirection[ MAX_SPOT_LIGHTS ];
//	uniform float spotLightAngleCos[ MAX_SPOT_LIGHTS ];
//	uniform float spotLightExponent[ MAX_SPOT_LIGHTS ];
//
//	uniform float spotLightDistance[ MAX_SPOT_LIGHTS ];
//
//#endif

uniform float blendHardness;
uniform float blendDepthSupplement;
uniform float fov;
uniform float spacing;
uniform float near;
uniform float far;
uniform float pcIndex;
uniform float screenWidth;
uniform float screenHeight;

uniform sampler2D depthMap;

varying vec3	vColor;
varying float	vOpacity;
varying float	vLinearDepth;
varying float	vLogDepth;
varying vec3	vViewPosition;
varying float	vRadius;
varying vec3	vWorldPosition;
varying vec3	vNormal;

float specularStrength = 1.0;

void main() {

	vec3 color = vColor;
	float depth = gl_FragCoord.z;

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
		float sDepth = texture2D(depthMap, uv).r;
		if(vLinearDepth > sDepth + vRadius + blendDepthSupplement){
			discard;
		}
	#endif
	
	#if defined use_interpolation
		float wi = 0.0 - ( u*u + v*v);
		vec4 pos = vec4(-vViewPosition, 1.0);
		pos.z += wi * vRadius;
		float linearDepth = pos.z;
		pos = projectionMatrix * pos;
		pos = pos / pos.w;
		float expDepth = pos.z;
		depth = (pos.z + 1.0) / 2.0;
		gl_FragDepthEXT = depth;
		
		#if defined(color_type_depth)
			color.r = linearDepth;
			color.g = expDepth;
		#endif
		
	#endif
	
	#if defined color_type_point_index
		gl_FragColor = vec4(color, pcIndex / 255.0);
	#else
		gl_FragColor = vec4(color, vOpacity);
	#endif
	
	#if defined weighted_splats
	    float w = pow(1.0 - (u*u + v*v), blendHardness);
		gl_FragColor.rgb = gl_FragColor.rgb * w;
		gl_FragColor.a = w;
	#endif
	
	vec3 normal = normalize( vNormal );
	normal.z = abs(normal.z);
	vec3 viewPosition = normalize( vViewPosition );
	
	#if defined(color_type_phong)

	// code taken from three.js phong light fragment shader
	
		#if MAX_POINT_LIGHTS > 0

			vec3 pointDiffuse = vec3( 0.0 );
			vec3 pointSpecular = vec3( 0.0 );

			for ( int i = 0; i < MAX_POINT_LIGHTS; i ++ ) {

				vec4 lPosition = viewMatrix * vec4( pointLightPosition[ i ], 1.0 );
				vec3 lVector = lPosition.xyz + vViewPosition.xyz;

				float lDistance = 1.0;
				if ( pointLightDistance[ i ] > 0.0 )
					lDistance = 1.0 - min( ( length( lVector ) / pointLightDistance[ i ] ), 1.0 );

				lVector = normalize( lVector );

						// diffuse

				float dotProduct = dot( normal, lVector );

				#ifdef WRAP_AROUND

					float pointDiffuseWeightFull = max( dotProduct, 0.0 );
					float pointDiffuseWeightHalf = max( 0.5 * dotProduct + 0.5, 0.0 );

					vec3 pointDiffuseWeight = mix( vec3( pointDiffuseWeightFull ), vec3( pointDiffuseWeightHalf ), wrapRGB );

				#else

					float pointDiffuseWeight = max( dotProduct, 0.0 );

				#endif

				pointDiffuse += diffuse * pointLightColor[ i ] * pointDiffuseWeight * lDistance;

						// specular

				vec3 pointHalfVector = normalize( lVector + viewPosition );
				float pointDotNormalHalf = max( dot( normal, pointHalfVector ), 0.0 );
				float pointSpecularWeight = specularStrength * max( pow( pointDotNormalHalf, shininess ), 0.0 );

				float specularNormalization = ( shininess + 2.0 ) / 8.0;

				vec3 schlick = specular + vec3( 1.0 - specular ) * pow( max( 1.0 - dot( lVector, pointHalfVector ), 0.0 ), 5.0 );
				pointSpecular += schlick * pointLightColor[ i ] * pointSpecularWeight * pointDiffuseWeight * lDistance * specularNormalization;
				pointSpecular = vec3(0.0, 0.0, 0.0);
			}
		
		#endif
		
		#if MAX_DIR_LIGHTS > 0

			vec3 dirDiffuse = vec3( 0.0 );
			vec3 dirSpecular = vec3( 0.0 );

			for( int i = 0; i < MAX_DIR_LIGHTS; i ++ ) {

				vec4 lDirection = viewMatrix * vec4( directionalLightDirection[ i ], 0.0 );
				vec3 dirVector = normalize( lDirection.xyz );

						// diffuse

				float dotProduct = dot( normal, dirVector );

				#ifdef WRAP_AROUND

					float dirDiffuseWeightFull = max( dotProduct, 0.0 );
					float dirDiffuseWeightHalf = max( 0.5 * dotProduct + 0.5, 0.0 );

					vec3 dirDiffuseWeight = mix( vec3( dirDiffuseWeightFull ), vec3( dirDiffuseWeightHalf ), wrapRGB );

				#else

					float dirDiffuseWeight = max( dotProduct, 0.0 );

				#endif

				dirDiffuse += diffuse * directionalLightColor[ i ] * dirDiffuseWeight;

				// specular

				vec3 dirHalfVector = normalize( dirVector + viewPosition );
				float dirDotNormalHalf = max( dot( normal, dirHalfVector ), 0.0 );
				float dirSpecularWeight = specularStrength * max( pow( dirDotNormalHalf, shininess ), 0.0 );

				float specularNormalization = ( shininess + 2.0 ) / 8.0;

				vec3 schlick = specular + vec3( 1.0 - specular ) * pow( max( 1.0 - dot( dirVector, dirHalfVector ), 0.0 ), 5.0 );
				dirSpecular += schlick * directionalLightColor[ i ] * dirSpecularWeight * dirDiffuseWeight * specularNormalization;
			}

		#endif
		
		vec3 totalDiffuse = vec3( 0.0 );
		vec3 totalSpecular = vec3( 0.0 );
		
		#if MAX_POINT_LIGHTS > 0

			totalDiffuse += pointDiffuse;
			totalSpecular += pointSpecular;

		#endif
		
		#if MAX_DIR_LIGHTS > 0

			totalDiffuse += dirDiffuse;
			totalSpecular += dirSpecular;

		#endif
		
		gl_FragColor.xyz = gl_FragColor.xyz * ( emissive + totalDiffuse + ambientLightColor * ambient ) + totalSpecular;

	#endif
	
	
	#if defined(use_edl)
		gl_FragColor.a = vLogDepth;
	#endif
	
}


