
precision highp float;

varying float vDepth;

/**
 * from http://stackoverflow.com/questions/9882716/packing-float-into-vec4-how-does-this-code-work
 */
vec4 pack_depth(const in float depth)
{
    const vec4 bit_shift = vec4(256.0*256.0*256.0, 256.0*256.0, 256.0, 1.0);
    const vec4 bit_mask  = vec4(0.0, 1.0/256.0, 1.0/256.0, 1.0/256.0);
    vec4 res = fract(depth * bit_shift);
    res -= res.xxyz * bit_mask;
    return res;
}

void main(void){
	float a = pow(2.0*(gl_PointCoord.x - 0.5), 2.0);
	float b = pow(2.0*(gl_PointCoord.y - 0.5), 2.0);
	float c = 1.0 - (a + b);
	
	if(c < 0.0){
		discard;
	}

	gl_FragColor = pack_depth(vDepth);
} 