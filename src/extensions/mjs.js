

/**
 * extensions for the mjs.js library
 * 
 * @author Markus Schuetz
 *
 * @class extends the mjs V3 class
 */
V3 = V3;

/**
 * @class extends the mjs M4x4 class
 */
M4x4 = M4x4;


/**
 * Function: V3.transform
 *
 *
 * Parameters:
 *
 *   a - the first vector operand
 *   b - the transformation matrix
 *
 * Returns:
 *
 *   transformed vector
 */
V3.transform = function V3_transform(a, b, r){
	if(r === undefined){
		r = new MJS_FLOAT_ARRAY_TYPE(3);
	}
//	var r = new MJS_FLOAT_ARRAY_TYPE(3);
	
	r[0] = a[0] * b[0] + a[1] * b[4] + a[2] * b[8] + b[12];
	r[1] = a[0] * b[1] + a[1] * b[5] + a[2] * b[9] + b[13];
	r[2] = a[0] * b[2] + a[1] * b[6] + a[2] * b[10] + b[14];
	var h = a[0] * b[3] + a[1] * b[7] + a[2] * b[11] + b[15];
	r[0] = r[0] / h;
	r[1] = r[1] / h;
	r[2] = r[2] / h;
	
	return r;
};

/**
 * Function: V3.rTransform
 *
 *
 * Parameters:
 *
 *   a - the first vector operand
 *   b - the transformation matrix
 *
 * Returns:
 *
 *   vector rotated by the matrix. translation is not applied.
 */
V3.rTransform = function(a, b, r){
	if(r === undefined){
		r = new MJS_FLOAT_ARRAY_TYPE(3);
	}
	
	r[0] = a[0] * b[0] + a[1] * b[4] + a[2] * b[8];
	r[1] = a[0] * b[1] + a[1] * b[5] + a[2] * b[9];
	r[2] = a[0] * b[2] + a[1] * b[6] + a[2] * b[10];
	
	var h = a[0] * b[3] + a[1] * b[7] + a[2] * b[11] + b[15];
	r[0] = r[0] / h;
	r[1] = r[1] / h;
	r[2] = r[2] / h;
	
	return r;
}



/**
 * The original inverseOrthonormal function does not work because it uses Vec3 instead of V3.
 */
M4x4.inverseOrthonormal = function M4x4_inverseOrthonormal(m, r) {

    if (r === undefined)
        r = new MJS_FLOAT_ARRAY_TYPE(16);
    M4x4.transpose(m, r);
    var t = [m[12], m[13], m[14]];
    r[3] = r[7] = r[11] = 0;
    r[12] = -V3.dot([r[0], r[4], r[8]], t);
    r[13] = -V3.dot([r[1], r[5], r[9]], t);
    r[14] = -V3.dot([r[2], r[6], r[10]], t);
    return r;
};

/**
 * the original direction function returned the direction from b to a, instead of a to b as stated in the comment.
 * 
 * Function: V3.direction
 *
 * Perform
 * r = (a - b) / |a - b|.  The result is the normalized
 * direction from a to b.
 *
 * Parameters:
 *
 *   a - the first vector operand
 *   b - the second vector operand
 *   r - optional vector to store the result in
 *
 * Returns:
 *
 *   If r is specified, returns r after performing the operation.
 *   Otherwise, returns a new 3-element vector with the result.
 */
V3.direction = function V3_direction(a, b, r) {
    if (r === undefined)
        r = new MJS_FLOAT_ARRAY_TYPE(3);
    return V3.normalize(V3.sub(b, a, r), r);
};


/**
 * from http://stackoverflow.com/questions/4915462/how-should-i-do-floating-point-comparison
 * 
 * @param a
 * @param b
 * @param epsilon 
 * @returns {Boolean}
 */
V3.equalScalar = function V3_equalScalar(a,b,epsilon){
	var absA = Math.abs(a);
    var absB = Math.abs(b);
    var diff = Math.abs(a - b);

    if (a === b) { // shortcut, handles infinities
        return true;
    } else if (a * b === 0) { // a or b or both are zero
        // relative error is not meaningful here
        return diff < (epsilon * epsilon);
    } else { // use relative error
        return diff / (absA + absB) < epsilon;
    }
};

V3.equal = function V3_equal(a,b,epsilon){
	if(epsilon === undefined){
		epsilon = 0.000001;
	}
//	return 
//		V3.equalScalar(a[0], b[0], 0.000001) && 
//		V3.equalScalar(a[1], b[1], 0.000001) && 
//		V3.equalScalar(a[2], b[2], 0.000001);
	var equals = V3.equalScalar(a[0], b[0], epsilon);
	equals = equals && V3.equalScalar(a[1], b[1], epsilon);
	equals = equals && V3.equalScalar(a[2], b[2], epsilon);
	return equals;
};


M4x4.makeInversePerspective = function M4x4_makeInversePerspective (fovy, aspect, znear, zfar, r) {
    var ymax = znear * Math.tan(fovy * Math.PI / 360.0);
    var ymin = -ymax;
    var xmin = ymin * aspect;
    var xmax = ymax * aspect;

    return M4x4.makeInverseFrustum(xmin, xmax, ymin, ymax, znear, zfar, r);
};

M4x4.makeInverseFrustum = function M4x4_makeInverseFrustum(left, right, bottom, top, near, far, r) {

    if (r === undefined)
        r = new MJS_FLOAT_ARRAY_TYPE(16);

    r[0] = (-left+right)/(2*near);
    r[1] = 0;
    r[2] = 0;
    r[3] = 0;
    r[4] = 0;
    r[5] = (-bottom+top)/(2*near);
    r[6] = 0;
    r[7] = 0;
    r[8] = 0;
    r[9] = 0;
    r[10] = 0;
    r[11] = -(far-near)/(2*far*near);
    r[12] = (left+right)/(2*near);
    r[13] = (bottom+top)/(2*near);
    r[14] = -1;
    r[15] = (far+near)/(2*far*near);

    return r;
};

/**
 * copy values from matrix a into matrix b
 */
M4x4.copy = function(a, b){
	for(var i = 0; i < 16; i++){
		b[i] = a[i];
	}
};
