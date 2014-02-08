/* -*- Mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil; tab-width: 40; -*- */
/*
 * Copyright (c) 2010 Mozilla Corporation
 * Copyright (c) 2010 Vladimir Vukicevic
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */

/*
 * File: mjs
 *
 * Vector and Matrix math utilities for JavaScript, optimized for WebGL.
 */

/*
 * Constant: MJS_VERSION
 * 
 * mjs version number aa.bb.cc, encoded as an integer of the form:
 * 0xaabbcc.
 */
const MJS_VERSION = 0x000000;

/*
 * Constant: MJS_DO_ASSERT
 * 
 * Enables or disables runtime assertions.
 * 
 * For potentially more performance, the assert methods can be
 * commented out in each place where they are called.
 */
const MJS_DO_ASSERT = true;

// Some hacks for running in both the shell and browser,
// and for supporting F32 and WebGLFloat arrays
try { WebGLFloatArray; } catch (x) { WebGLFloatArray = Float32Array; }

/*
 * Constant: MJS_FLOAT_ARRAY_TYPE
 *
 * The base float array type.  By default, WebGLFloatArray.
 * 
 * mjs can work with any array-like elements, but if an array
 * creation is requested, it will create an array of the type
 * MJS_FLOAT_ARRAY_TYPE.  Also, the builtin constants such as (M4x4.I)
 * will be of this type.
 */
const MJS_FLOAT_ARRAY_TYPE = WebGLFloatArray;
//const MJS_FLOAT_ARRAY_TYPE = Float32Array;
//const MJS_FLOAT_ARRAY_TYPE = Float64Array;
//const MJS_FLOAT_ARRAY_TYPE = Array;

if (MJS_DO_ASSERT) {
function MathUtils_assert(cond, msg) {
    if (!cond)
        throw "Assertion failed: " + msg;
}
} else {
function MathUtils_assert() { }
}

/*
 * Class: V3
 *
 * Methods for working with 3-element vectors.  A vector is represented by a 3-element array.
 * Any valid JavaScript array type may be used, but if new
 * vectors are created they are created using the configured MJS_FLOAT_ARRAY_TYPE.
 */

var V3 = { };

V3._temp1 = new MJS_FLOAT_ARRAY_TYPE(3);
V3._temp2 = new MJS_FLOAT_ARRAY_TYPE(3);
V3._temp3 = new MJS_FLOAT_ARRAY_TYPE(3);

if (MJS_FLOAT_ARRAY_TYPE == Array) {
    V3.x = [1.0, 0.0, 0.0];
    V3.y = [0.0, 1.0, 0.0];
    V3.z = [0.0, 0.0, 1.0];

    V3.$ = function V3_$(x, y, z) {
        return [x, y, z];
    };

    V3.clone = function V3_clone(a) {
        //MathUtils_assert(a.length == 3, "a.length == 3");
        return [a[0], a[1], a[2]];
    };
} else {
    V3.x = new MJS_FLOAT_ARRAY_TYPE([1.0, 0.0, 0.0]);
    V3.y = new MJS_FLOAT_ARRAY_TYPE([0.0, 1.0, 0.0]);
    V3.z = new MJS_FLOAT_ARRAY_TYPE([0.0, 0.0, 1.0]);

/*
 * Function: V3.$
 *
 * Creates a new 3-element vector with the given values.
 *
 * Parameters:
 *
 *   x,y,z - the 3 elements of the new vector.
 *
 * Returns:
 *
 * A new vector containing with the given argument values.
 */

    V3.$ = function V3_$(x, y, z) {
        return new MJS_FLOAT_ARRAY_TYPE([x, y, z]);
    };

/*
 * Function: V3.clone
 *
 * Clone the given 3-element vector.
 *
 * Parameters:
 *
 *   a - the 3-element vector to clone
 *
 * Returns:
 *
 * A new vector with the same values as the passed-in one.
 */

    V3.clone = function V3_clone(a) {
        //MathUtils_assert(a.length == 3, "a.length == 3");
        return new MJS_FLOAT_ARRAY_TYPE(a);
    };
}

V3.u = V3.x;
V3.v = V3.y;

/*
 * Function: V3.add
 *
 * Perform r = a + b.
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
V3.add = function V3_add(a, b, r) {
    //MathUtils_assert(a.length == 3, "a.length == 3");
    //MathUtils_assert(b.length == 3, "b.length == 3");
    //MathUtils_assert(r == undefined || r.length == 3, "r == undefined || r.length == 3");

    if (r == undefined)
        r = new MJS_FLOAT_ARRAY_TYPE(3);
    r[0] = a[0] + b[0];
    r[1] = a[1] + b[1];
    r[2] = a[2] + b[2];
    return r;
};

/*
 * Function: V3.sub
 *
 * Perform
 * r = a - b.
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
V3.sub = function V3_sub(a, b, r) {
    //MathUtils_assert(a.length == 3, "a.length == 3");
    //MathUtils_assert(b.length == 3, "b.length == 3");
    //MathUtils_assert(r == undefined || r.length == 3, "r == undefined || r.length == 3");

    if (r == undefined)
        r = new MJS_FLOAT_ARRAY_TYPE(3);
    r[0] = a[0] - b[0];
    r[1] = a[1] - b[1];
    r[2] = a[2] - b[2];
    return r;
};

/*
 * Function: V3.neg
 *
 * Perform
 * r = - a.
 *
 * Parameters:
 *
 *   a - the vector operand
 *   r - optional vector to store the result in
 *
 * Returns:
 *
 *   If r is specified, returns r after performing the operation.
 *   Otherwise, returns a new 3-element vector with the result.
 */
V3.neg = function V3_neg(a, r) {
    //MathUtils_assert(a.length == 3, "a.length == 3");
    //MathUtils_assert(r == undefined || r.length == 3, "r == undefined || r.length == 3");

    if (r == undefined)
        r = new MJS_FLOAT_ARRAY_TYPE(3);
    r[0] = - a[0];
    r[1] = - a[1];
    r[2] = - a[2];
    return r;
};

/*
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
    //MathUtils_assert(a.length == 3, "a.length == 3");
    //MathUtils_assert(b.length == 3, "b.length == 3");
    //MathUtils_assert(r == undefined || r.length == 3, "r == undefined || r.length == 3");

    if (r == undefined)
        r = new MJS_FLOAT_ARRAY_TYPE(3);
    return V3.normalize(V3.sub(a, b, r), r);
};

/*
 * Function: V3.length
 *
 * Perform r = |a|.
 *
 * Parameters:
 *
 *   a - the vector operand
 *
 * Returns:
 *
 *   The length of the given vector.
 */
V3.length = function V3_length(a) {
    //MathUtils_assert(a.length == 3, "a.length == 3");

    return Math.sqrt(a[0]*a[0] + a[1]*a[1] + a[2]*a[2]);
};

/*
 * Function: V3.lengthSquard
 *
 * Perform r = |a|*|a|.
 *
 * Parameters:
 *
 *   a - the vector operand
 *
 * Returns:
 *
 *   The square of the length of the given vector.
 */
V3.lengthSquared = function V3_lengthSquared(a) {
    //MathUtils_assert(a.length == 3, "a.length == 3");

    return a[0]*a[0] + a[1]*a[1] + a[2]*a[2];
};

/*
 * Function: V3.normalize
 *
 * Perform r = a / |a|.
 *
 * Parameters:
 *
 *   a - the vector operand
 *   r - optional vector to store the result in
 *
 * Returns:
 *
 *   If r is specified, returns r after performing the operation.
 *   Otherwise, returns a new 3-element vector with the result.
 */
V3.normalize = function V3_normalize(a, r) {
    //MathUtils_assert(a.length == 3, "a.length == 3");
    //MathUtils_assert(r == undefined || r.length == 3, "r == undefined || r.length == 3");

    if (r == undefined)
        r = new MJS_FLOAT_ARRAY_TYPE(3);
    var im = 1.0 / V3.length(a);
    r[0] = a[0] * im;
    r[1] = a[1] * im;
    r[2] = a[2] * im;
    return r;
};

/*
 * Function: V3.scale
 *
 * Perform r = a * k.
 *
 * Parameters:
 *
 *   a - the vector operand
 *   k - a scalar value
 *   r - optional vector to store the result in
 *
 * Returns:
 *
 *   If r is specified, returns r after performing the operation.
 *   Otherwise, returns a new 3-element vector with the result.
 */
V3.scale = function V3_scale(a, k, r) {
    //MathUtils_assert(a.length == 3, "a.length == 3");
    //MathUtils_assert(r == undefined || r.length == 3, "r == undefined || r.length == 3");

    if (r == undefined)
        r = new MJS_FLOAT_ARRAY_TYPE(3);
    r[0] = a[0] * k;
    r[1] = a[1] * k;
    r[2] = a[2] * k;
    return r;
}

/*
 * Function: V3.dot
 *
 * Perform
 * r = dot(a, b).
 *
 * Parameters:
 *
 *   a - the first vector operand
 *   b - the second vector operand
 *
 * Returns:
 *
 *   The dot product of a and b.
 */
V3.dot = function V3_dot(a, b) {
    //MathUtils_assert(a.length == 3, "a.length == 3");
    //MathUtils_assert(b.length == 3, "b.length == 3");

    return a[0] * b[0] +
        a[1] * b[1] +
        a[2] * b[2];
};

/*
 * Function: V3.cross
 *
 * Perform r = a x b.
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
V3.cross = function V3_cross(a, b, r) {
    //MathUtils_assert(a.length == 3, "a.length == 3");
    //MathUtils_assert(b.length == 3, "b.length == 3");
    //MathUtils_assert(r == undefined || r.length == 3, "r == undefined || r.length == 3");

    if (r == undefined)
        r = new MJS_FLOAT_ARRAY_TYPE(3);
    r[0] = a[1]*b[2] - a[2]*b[1];
    r[1] = a[2]*b[0] - a[0]*b[2];
    r[2] = a[0]*b[1] - a[1]*b[0];
    return r;
};

/*
 * Class: M4x4
 *
 * Methods for working with 4x4 matrices.  A matrix is represented by a 16-element array
 * in column-major order.  Any valid JavaScript array type may be used, but if new
 * matrices are created they are created using the configured MJS_FLOAT_ARRAY_TYPE.
 */

var M4x4 = { };

M4x4._temp1 = new MJS_FLOAT_ARRAY_TYPE(16);
M4x4._temp2 = new MJS_FLOAT_ARRAY_TYPE(16);

if (MJS_FLOAT_ARRAY_TYPE == Array) {
    M4x4.I = [1.0, 0.0, 0.0, 0.0,
              0.0, 1.0, 0.0, 0.0,
              0.0, 0.0, 1.0, 0.0,
              0.0, 0.0, 0.0, 1.0];

    M4x4.$ = function M4x4_$(m00, m01, m02, m03,
                             m04, m05, m06, m07,
                             m08, m09, m10, m11,
                             m12, m13, m14, m15)
    {
        return [m00, m01, m02, m03,
                m04, m05, m06, m07,
                m08, m09, m10, m11,
                m12, m13, m14, m15];
    };

    M4x4.clone = function M4x4_clone(m) {
        //MathUtils_assert(m.length == 16, "m.length == 16");
        return new [m[0], m[1], m[2], m[3],
                    m[4], m[5], m[6], m[7],
                    m[8], m[9], m[10], m[11]];
    };
} else {
    M4x4.I = new MJS_FLOAT_ARRAY_TYPE([1.0, 0.0, 0.0, 0.0,
                                   0.0, 1.0, 0.0, 0.0,
                                   0.0, 0.0, 1.0, 0.0,
                                   0.0, 0.0, 0.0, 1.0]);

/*
 * Function: M4x4.$
 *
 * Creates a new 4x4 matrix with the given values.
 *
 * Parameters:
 *
 *   m00..m15 - the 16 elements of the new matrix.
 *
 * Returns:
 *
 * A new matrix filled with the given argument values.
 */
    M4x4.$ = function M4x4_$(m00, m01, m02, m03,
                             m04, m05, m06, m07,
                             m08, m09, m10, m11,
                             m12, m13, m14, m15)
    {
        return new MJS_FLOAT_ARRAY_TYPE([m00, m01, m02, m03,
                                         m04, m05, m06, m07,
                                         m08, m09, m10, m11,
                                         m12, m13, m14, m15]);
    };

/*
 * Function: M4x4.clone
 *
 * Clone the given 4x4 matrix.
 *
 * Parameters:
 *
 *   m - the 4x4 matrix to clone
 *
 * Returns:
 *
 * A new matrix with the same values as the passed-in one.
 */
    M4x4.clone = function M4x4_clone(m) {
        //MathUtils_assert(m.length == 16, "m.length == 16");
        return new MJS_FLOAT_ARRAY_TYPE(m);
    };
}

M4x4.identity = M4x4.I;

/*
 * Function: M4x4.topLeft3x3
 *
 * Return the top left 3x3 matrix from the given 4x4 matrix m.
 *
 * Parameters:
 *
 *   m - the matrix
 *   r - optional 3x3 matrix to store the result in
 *
 * Returns:
 *
 *   If r is specified, returns r after performing the operation.
 *   Otherwise, returns a new 3x3 matrix with the result.
 */
M4x4.topLeft3x3 = function M4x4_topLeft3x3(m, r) {
    //MathUtils_assert(m.length == 16, "m.length == 16");
    //MathUtils_assert(r == undefined || r.length == 9, "r == undefined || r.length == 9");

    if (r == undefined)
        r = new MJS_FLOAT_ARRAY_TYPE(9);
    r[0] = m[0]; r[1] = m[1]; r[2] = m[2];
    r[3] = m[4]; r[4] = m[5]; r[5] = m[6];
    r[6] = m[8]; r[7] = m[9]; r[8] = m[10];
    return r;
};

/*
 * Function: M4x4.inverseOrthonormal
 *
 * Computes the inverse of the given matrix m, assuming that
 * the matrix is orthonormal.
 *
 * Parameters:
 *
 *   m - the matrix
 *   r - optional 4x4 matrix to store the result in
 *
 * Returns:
 *
 *   If r is specified, returns r after performing the operation.
 *   Otherwise, returns a new 4x4 matrix with the result.
 */
M4x4.inverseOrthonormal = function M4x4_inverseOrthonormal(m, r) {
    //MathUtils_assert(m.length == 16, "m.length == 16");
    //MathUtils_assert(r == undefined || r.length == 16, "r == undefined || r.length == 16");
    //MathUtils_assert(m != r, "m != r");

    if (r == undefined)
        r = new MJS_FLOAT_ARRAY_TYPE(16);
    M4x4.transpose(m, r);
    var t = [m[12], m[13], m[14]];
    r[3] = r[7] = r[11] = 0;
    r[12] = -Vec3.dot([r[0], r[4], r[8]], t);
    r[13] = -Vec3.dot([r[1], r[5], r[9]], t);
    r[14] = -Vec3.dot([r[2], r[6], r[10]], t);
    return r;
}

/*
 * Function: M4x4.inverseTo3x3
 *
 * Computes the inverse of the given matrix m, but calculates
 * only the top left 3x3 values of the result.
 *
 * Parameters:
 *
 *   m - the matrix
 *   r - optional 3x3 matrix to store the result in
 *
 * Returns:
 *
 *   If r is specified, returns r after performing the operation.
 *   Otherwise, returns a new 3x3 matrix with the result.
 */
M4x4.inverseTo3x3 = function M4x4_inverseTo3x3(m, r) {
    //MathUtils_assert(m.length == 16, "m.length == 16");
    //MathUtils_assert(r == undefined || r.length == 9, "r == undefined || r.length == 9");

    if (r == undefined)
        r = new MJS_FLOAT_ARRAY_TYPE(9);

    var a11 = m[10]*m[5]-m[6]*m[9],
        a21 = -m[10]*m[1]+m[2]*m[9],
        a31 = m[6]*m[1]-m[2]*m[5],
        a12 = -m[10]*m[4]+m[6]*m[8],
        a22 = m[10]*m[0]-m[2]*m[8],
        a32 = -m[6]*m[0]+m[2]*m[4],
        a13 = m[9]*m[4]-m[5]*m[8],
        a23 = -m[9]*m[0]+m[1]*m[8],
        a33 = m[5]*m[0]-m[1]*m[4];
    var det = m[0]*(a11) + m[1]*(a12) + m[2]*(a13);
    if (det == 0) // no inverse
        throw "matrix not invertible";
    var idet = 1.0 / det;

    r[0] = idet*a11;
    r[1] = idet*a21;
    r[2] = idet*a31;
    r[3] = idet*a12;
    r[4] = idet*a22;
    r[5] = idet*a32;
    r[6] = idet*a13;
    r[7] = idet*a23;
    r[8] = idet*a33;

    return r;
};

/*
 * Function: M4x4.makeFrustum
 *
 * Creates a matrix for a projection frustum with the given parameters.
 *
 * Parameters:
 *
 *   left - the left coordinate of the frustum
 *   right- the right coordinate of the frustum
 *   bottom - the bottom coordinate of the frustum
 *   top - the top coordinate of the frustum
 *   znear - the near z distance of the frustum
 *   zfar - the far z distance of the frustum
 *   r - optional 4x4 matrix to store the result in
 *
 * Returns:
 *
 *   If r is specified, returns r after creating the projection matrix.
 *   Otherwise, returns a new 4x4 matrix.
 */
M4x4.makeFrustum = function M4x4_makeFrustum(left, right, bottom, top, znear, zfar, r) {
    //MathUtils_assert(r == undefined || r.length == 16, "r == undefined || r.length == 16");

    if (r == undefined)
        r = new MJS_FLOAT_ARRAY_TYPE(16);

    var X = 2*znear/(right-left);
    var Y = 2*znear/(top-bottom);
    var A = (right+left)/(right-left);
    var B = (top+bottom)/(top-bottom);
    var C = -(zfar+znear)/(zfar-znear);
    var D = -2*zfar*znear/(zfar-znear);

    r[0] = 2*znear/(right-left);
    r[1] = 0;
    r[2] = 0;
    r[3] = 0;
    r[4] = 0;
    r[5] = 2*znear/(top-bottom);
    r[6] = 0;
    r[7] = 0;
    r[8] = (right+left)/(right-left);
    r[9] = (top+bottom)/(top-bottom);
    r[10] = -(zfar+znear)/(zfar-znear);
    r[11] = -1;
    r[12] = 0;
    r[13] = 0;
    r[14] = -2*zfar*znear/(zfar-znear);
    r[15] = 0;

    return r;
};

/*
 * Function: M4x4.makePerspective
 *
 * Creates a matrix for a perspective projection with the given parameters.
 *
 * Parameters:
 *
 *   fovy - field of view in the y axis, in degrees
 *   aspect - aspect ratio
 *   znear - the near z distance of the projection
 *   zfar - the far z distance of the projection
 *   r - optional 4x4 matrix to store the result in
 *
 * Returns:
 *
 *   If r is specified, returns r after creating the projection matrix.
 *   Otherwise, returns a new 4x4 matrix.
 */
M4x4.makePerspective = function M4x4_makePerspective (fovy, aspect, znear, zfar, r) {
    //MathUtils_assert(r == undefined || r.length == 16, "r == undefined || r.length == 16");

    var ymax = znear * Math.tan(fovy * Math.PI / 360.0);
    var ymin = -ymax;
    var xmin = ymin * aspect;
    var xmax = ymax * aspect;

    return M4x4.makeFrustum(xmin, xmax, ymin, ymax, znear, zfar, r);
};

/*
 * Function: M4x4.makeOrtho
 *
 * Creates a matrix for an orthogonal frustum projection with the given parameters.
 *
 * Parameters:
 *
 *   left - the left coordinate of the frustum
 *   right- the right coordinate of the frustum
 *   bottom - the bottom coordinate of the frustum
 *   top - the top coordinate of the frustum
 *   znear - the near z distance of the frustum
 *   zfar - the far z distance of the frustum
 *   r - optional 4x4 matrix to store the result in
 *
 * Returns:
 *
 *   If r is specified, returns r after creating the projection matrix.
 *   Otherwise, returns a new 4x4 matrix.
 */
M4x4.makeOrtho = function M4x4_makeOrtho (left, right, bottom, top, znear, zfar, r) {
    //MathUtils_assert(r == undefined || r.length == 16, "r == undefined || r.length == 16");

    if (r == undefined)
        r = new MJS_FLOAT_ARRAY_TYPE(16);

    var tX = -(right+left)/(right-left);
    var tY = -(top+bottom)/(top-bottom);
    var tZ = -(zfar+znear)/(zfar-znear);
    var X = 2 / (right-left);
    var Y = 2 / (top-bottom);
    var Z = -2 / (zfar-znear);

    r[0] = 2 / (right-left);
    r[1] = 0;
    r[2] = 0;
    r[3] = 0;
    r[4] = 0;
    r[5] = 2 / (top-bottom);
    r[6] = 0;
    r[7] = 0;
    r[8] = 0;
    r[9] = 0;
    r[10] = -2 / (zfar-znear);
    r[11] = 0;
    r[12] = -(right+left)/(right-left);
    r[13] = -(top+bottom)/(top-bottom);
    r[14] = -(zfar+znear)/(zfar-znear);
    r[15] = 0;

    return r;
};

/*
 * Function: M4x4.makeOrtho
 *
 * Creates a matrix for a 2D orthogonal frustum projection with the given parameters.
 * znear and zfar are assumed to be -1 and 1, respectively.
 *
 * Parameters:
 *
 *   left - the left coordinate of the frustum
 *   right- the right coordinate of the frustum
 *   bottom - the bottom coordinate of the frustum
 *   top - the top coordinate of the frustum
 *   r - optional 4x4 matrix to store the result in
 *
 * Returns:
 *
 *   If r is specified, returns r after creating the projection matrix.
 *   Otherwise, returns a new 4x4 matrix.
 */
M4x4.makeOrtho2D = function M4x4_makeOrtho2D (left, right, bottom, top, r) {
    //MathUtils_assert(r == undefined || r.length == 16, "r == undefined || r.length == 16");

    return M4x4.makeOrtho(left, right, bottom, top, -1, 1, r);
};

/*
 * Function: M4x4.mul
 *
 * Performs r = a * b.
 *
 * Parameters:
 *
 *   a - the first matrix operand
 *   b - the second matrix operand
 *   r - optional 4x4 matrix to store the result in
 *
 * Returns:
 *
 *   If r is specified, returns r after performing the operation.
 *   Otherwise, returns a new 4x4 matrix with the result.
 */
M4x4.mul = function M4x4_mul(a, b, r) {
    //MathUtils_assert(a.length == 16, "a.length == 16");
    //MathUtils_assert(b.length == 16, "b.length == 16");
    //MathUtils_assert(r == undefined || r.length == 16, "r == undefined || r.length == 16");
    //MathUtils_assert(a != r && b != r, "a != r && b != r");

    if (r == undefined)
        r = new MJS_FLOAT_ARRAY_TYPE(16);

    r[0] =
        b[0] * a[0] +
        b[0+1] * a[4] +
        b[0+2] * a[8] +
        b[0+3] * a[12];
    r[0+1] =
        b[0] * a[1] +
        b[0+1] * a[5] +
        b[0+2] * a[9] +
        b[0+3] * a[13];
    r[0+2] =
        b[0] * a[2] +
        b[0+1] * a[6] +
        b[0+2] * a[10] +
        b[0+3] * a[14];
    r[0+3] =
        b[0] * a[3] +
        b[0+1] * a[7] +
        b[0+2] * a[11] +
        b[0+3] * a[15];
    r[4] =
        b[4] * a[0] +
        b[4+1] * a[4] +
        b[4+2] * a[8] +
        b[4+3] * a[12];
    r[4+1] =
        b[4] * a[1] +
        b[4+1] * a[5] +
        b[4+2] * a[9] +
        b[4+3] * a[13];
    r[4+2] =
        b[4] * a[2] +
        b[4+1] * a[6] +
        b[4+2] * a[10] +
        b[4+3] * a[14];
    r[4+3] =
        b[4] * a[3] +
        b[4+1] * a[7] +
        b[4+2] * a[11] +
        b[4+3] * a[15];
    r[8] =
        b[8] * a[0] +
        b[8+1] * a[4] +
        b[8+2] * a[8] +
        b[8+3] * a[12];
    r[8+1] =
        b[8] * a[1] +
        b[8+1] * a[5] +
        b[8+2] * a[9] +
        b[8+3] * a[13];
    r[8+2] =
        b[8] * a[2] +
        b[8+1] * a[6] +
        b[8+2] * a[10] +
        b[8+3] * a[14];
    r[8+3] =
        b[8] * a[3] +
        b[8+1] * a[7] +
        b[8+2] * a[11] +
        b[8+3] * a[15];
    r[12] =
        b[12] * a[0] +
        b[12+1] * a[4] +
        b[12+2] * a[8] +
        b[12+3] * a[12];
    r[12+1] =
        b[12] * a[1] +
        b[12+1] * a[5] +
        b[12+2] * a[9] +
        b[12+3] * a[13];
    r[12+2] =
        b[12] * a[2] +
        b[12+1] * a[6] +
        b[12+2] * a[10] +
        b[12+3] * a[14];
    r[12+3] =
        b[12] * a[3] +
        b[12+1] * a[7] +
        b[12+2] * a[11] +
        b[12+3] * a[15];
    return r;
};

/*
 * Function: M4x4.makeRotate
 *
 * Creates a transformation matrix for rotation by angle radians about the 3-element vector axis.
 *
 * Parameters:
 *
 *   angle - the angle of rotation, in radians
 *   axis - the axis around which the rotation is performed, a 3-element vector
 *   r - optional 4x4 matrix to store the result in
 *
 * Returns:
 *
 *   If r is specified, returns r after creating the matrix.
 *   Otherwise, returns a new 4x4 matrix with the result.
 */
M4x4.makeRotate = function M4x4_makeRotate(angle, axis, r) {
    //MathUtils_assert(angle.length == 3, "angle.length == 3");
    //MathUtils_assert(axis.length == 3, "axis.length == 3");
    //MathUtils_assert(r == undefined || r.length == 16, "r == undefined || r.length == 16");

    if (r == undefined)
        r = new MJS_FLOAT_ARRAY_TYPE(16);

    axis = V3.normalize(axis);
    var x = axis[0], y = axis[1], z = axis[2];
    var c = Math.cos(angle);
    var c1 = 1-c;
    var s = Math.sin(angle);

    r[0] = x*x*c1+c;
    r[1] = y*x*c1+z*s;
    r[2] = z*x*c1-y*s;
    r[3] = 0;
    r[4] = x*y*c1-z*s;
    r[5] = y*y*c1+c;
    r[6] = y*z*c1+x*s;
    r[7] = 0;
    r[8] = x*z*c1+y*s;
    r[9] = y*z*c1-x*s;
    r[10] = z*z*c1+c;
    r[11] = 0;
    r[12] = 0;
    r[13] = 0;
    r[14] = 0;
    r[15] = 1;

    return r;
};

/*
 * Function: M4x4.rotate
 *
 * Concatenates a rotation of angle radians about the axis to the give matrix m.
 *
 * Parameters:
 *
 *   angle - the angle of rotation, in radians
 *   axis - the axis around which the rotation is performed, a 3-element vector
 *   m - the matrix to concatenate the rotation to
 *   r - optional 4x4 matrix to store the result in
 *
 * Returns:
 *
 *   If r is specified, returns r after performing the operation.
 *   Otherwise, returns a new 4x4 matrix with the result.
 */
M4x4.rotate = function M4x4_rotate(angle, axis, m, r) {
    //MathUtils_assert(angle.length == 3, "angle.length == 3");
    //MathUtils_assert(axis.length == 3, "axis.length == 3");
    //MathUtils_assert(m.length == 16, "m.length == 16");
    //MathUtils_assert(r == undefined || r.length == 16, "r == undefined || r.length == 16");

    M4x4.makeRotate(angle, axis, M4x4._temp1);
    return M4x4.mul(m, M4x4._temp1, r);
};

/*
 * Function: M4x4.makeScale3
 *
 * Creates a transformation matrix for scaling by 3 scalar values, one for
 * each of the x, y, and z directions.
 *
 * Parameters:
 *
 *   x - the scale for the x axis
 *   y - the scale for the y axis
 *   z - the scale for the z axis
 *   r - optional 4x4 matrix to store the result in
 *
 * Returns:
 *
 *   If r is specified, returns r after creating the matrix.
 *   Otherwise, returns a new 4x4 matrix with the result.
 */
M4x4.makeScale3 = function M4x4_makeScale3(x, y, z, r) {
    //MathUtils_assert(r == undefined || r.length == 16, "r == undefined || r.length == 16");

    if (r == undefined)
        r = new MJS_FLOAT_ARRAY_TYPE(16);

    r[0] = x;
    r[1] = 0;
    r[2] = 0;
    r[3] = 0;
    r[4] = 0;
    r[5] = y;
    r[6] = 0;
    r[7] = 0;
    r[8] = 0;
    r[9] = 0;
    r[10] = z;
    r[11] = 0;
    r[12] = 0;
    r[13] = 0;
    r[14] = 0;
    r[15] = 1;

    return r;
};

/*
 * Function: M4x4.makeScale1
 *
 * Creates a transformation matrix for a uniform scale by a single scalar value.
 *
 * Parameters:
 *
 *   k - the scale factor
 *   r - optional 4x4 matrix to store the result in
 *
 * Returns:
 *
 *   If r is specified, returns r after creating the matrix.
 *   Otherwise, returns a new 4x4 matrix with the result.
 */
M4x4.makeScale1 = function M4x4_makeScale1(k, r) {
    //MathUtils_assert(r == undefined || r.length == 16, "r == undefined || r.length == 16");

    return M4x4.makeScale3(k, k, k, r);
};

/*
 * Function: M4x4.makeScale
 *
 * Creates a transformation matrix for scaling each of the x, y, and z axes by the amount
 * given in the corresponding element of the 3-element vector.
 *
 * Parameters:
 *
 *   v - the 3-element vector containing the scale factors
 *   r - optional 4x4 matrix to store the result in
 *
 * Returns:
 *
 *   If r is specified, returns r after creating the matrix.
 *   Otherwise, returns a new 4x4 matrix with the result.
 */
M4x4.makeScale = function M4x4_makeScale(v, r) {
    //MathUtils_assert(v.length == 3, "v.length == 3");
    //MathUtils_assert(r == undefined || r.length == 16, "r == undefined || r.length == 16");

    return M4x4.makeScale3(v[0], v[1], v[2], r);
};

/*
 * Function: M4x4.scale3
 */
M4x4.scale3 = function M4x4_scale3(x, y, z, m, r) {
    //MathUtils_assert(m.length == 16, "m.length == 16");
    //MathUtils_assert(r == undefined || r.length == 16, "r == undefined || r.length == 16");

    M4x4.makeScale3(x, y, z, M4x4._temp1);
    return M4x4.mul(m, M4x4._temp1, r);
};

/*
 * Function: M4x4.scale1
 */
M4x4.scale1 = function M4x4_scale1(k, m, r) {
    //MathUtils_assert(m.length == 16, "m.length == 16");
    //MathUtils_assert(r == undefined || r.length == 16, "r == undefined || r.length == 16");

    M4x4.makeScale3(k, k, k, M4x4._temp1);
    return M4x4.mul(m, M4x4._temp1, r);
};

/*
 * Function: M4x4.scale1
 */
M4x4.scale = function M4x4_scale(v, m, r) {
    //MathUtils_assert(v.length == 3, "v.length == 3");
    //MathUtils_assert(m.length == 16, "m.length == 16");
    //MathUtils_assert(r == undefined || r.length == 16, "r == undefined || r.length == 16");

    M4x4.makeScale3(v[0], v[1], v[2], M4x4._temp1);
    return M4x4.mul(m, M4x4._temp1, r);
};

/*
 * Function: M4x4.makeTranslate3
 */
M4x4.makeTranslate3 = function M4x4_makeTranslate3(x, y, z, r) {
    //MathUtils_assert(r == undefined || r.length == 16, "r == undefined || r.length == 16");

    if (r == undefined)
        r = new MJS_FLOAT_ARRAY_TYPE(16);

    r[0] = 1;
    r[1] = 0;
    r[2] = 0;
    r[3] = 0;
    r[4] = 0;
    r[5] = 1;
    r[6] = 0;
    r[7] = 0;
    r[8] = 0;
    r[9] = 0;
    r[10] = 1;
    r[11] = 0;
    r[12] = x;
    r[13] = y;
    r[14] = z;
    r[15] = 1;

    return r;
};

/*
 * Function: M4x4.makeTranslate1
 */
M4x4.makeTranslate1 = function M4x4_makeTranslate1 (k, r) {
    //MathUtils_assert(r == undefined || r.length == 16, "r == undefined || r.length == 16");

    return M4x4.makeTranslate3(k, k, k, r);
};

/*
 * Function: M4x4.makeTranslate
 */
M4x4.makeTranslate = function M4x4_makeTranslate (v, r) {
    //MathUtils_assert(v.length == 3, "v.length == 3");
    //MathUtils_assert(r == undefined || r.length == 16, "r == undefined || r.length == 16");

    return M4x4.makeTranslate3(v[0], v[1], v[2], r);
};

/*
 * Function: M4x4.translate3
 */
M4x4.translate3 = function M4x4_translate3 (x, y, z, m, r) {
    //MathUtils_assert(m.length == 16, "m.length == 16");
    //MathUtils_assert(r == undefined || r.length == 16, "r == undefined || r.length == 16");

    M4x4.makeTranslate3(x, y, z, M4x4._temp1);
    return M4x4.mul(m, M4x4._temp1, r);
};

/*
 * Function: M4x4.translate1
 */
M4x4.translate1 = function M4x4_translate1 (k, m, r) {
    //MathUtils_assert(m.length == 16, "m.length == 16");
    //MathUtils_assert(r == undefined || r.length == 16, "r == undefined || r.length == 16");

    M4x4.makeTranslate3(k, k, k, M4x4._temp1);
    return M4x4.mul(m, M4x4._temp1, r);
};

/*
 * Function: M4x4.translate
 */
M4x4.translate = function M4x4_translate (v, m, r) {
    //MathUtils_assert(v.length == 3, "v.length == 3");
    //MathUtils_assert(m.length == 16, "m.length == 16");
    //MathUtils_assert(r == undefined || r.length == 16, "r == undefined || r.length == 16");

    M4x4.makeTranslate3(v[0], v[1], v[2], M4x4._temp1);
    return M4x4.mul(m, M4x4._temp1, r);
};

/*
 * Function: M4x4.makeLookAt
 */
M4x4.makeLookAt = function M4x4_makeLookAt (eye, center, up, r) {
    //MathUtils_assert(eye.length == 3, "eye.length == 3");
    //MathUtils_assert(center.length == 3, "center.length == 3");
    //MathUtils_assert(up.length == 3, "up.length == 3");
    //MathUtils_assert(r == undefined || r.length == 16, "r == undefined || r.length == 16");

    var z = V3.direction(eye, center, V3._temp1);
    var x = V3.normalize(V3.cross(up, z, V3._temp2), V3._temp2);
    var y = V3.normalize(V3.cross(z, x, V3._temp3), V3._temp3);

    var tm1 = M4x4._temp1;
    var tm2 = M4x4._temp2;

    tm1[0] = x[0];
    tm1[1] = y[0];
    tm1[2] = z[0];
    tm1[3] = 0;
    tm1[4] = x[1];
    tm1[5] = y[1];
    tm1[6] = z[1];
    tm1[7] = 0;
    tm1[8] = x[2];
    tm1[9] = y[2];
    tm1[10] = z[2];
    tm1[11] = 0;
    tm1[12] = 0;
    tm1[13] = 0;
    tm1[14] = 0;
    tm1[15] = 1;

    tm2[0] = 1; tm2[1] = 0; tm2[2] = 0; tm2[3] = 0;
    tm2[4] = 0; tm2[5] = 1; tm2[6] = 0; tm2[7] = 0;
    tm2[8] = 0; tm2[9] = 0; tm2[10] = 1; tm2[3] = 0;
    tm2[0] = -eye[0]; tm2[1] = -eye[1]; tm2[2] = -eye[2]; tm2[3] = 0;

    if (r == undefined)
        r = new MJS_FLOAT_ARRAY_TYPE(16);
    return M4x4.mul(tm1, tm2, r);
};

/*
 * Function: M4x4.transpose
 */
M4x4.transpose = function M4x4_transpose (m, r) {
    //MathUtils_assert(m.length == 16, "m.length == 16");
    //MathUtils_assert(r == undefined || r.length == 16, "r == undefined || r.length == 16");

    if (m == r) {
        var tmp = 0.0;
        tmp = m[1]; m[1] = m[4]; m[4] = tmp;
        tmp = m[2]; m[2] = m[8]; m[8] = tmp;
        tmp = m[3]; m[3] = m[12]; m[12] = tmp;
        tmp = m[6]; m[6] = m[9]; m[9] = tmp;
        tmp = m[7]; m[7] = m[13]; m[13] = tmp;
        tmp = m[11]; m[11] = m[14]; m[14] = tmp;
        return m;
    }

    if (r == undefined)
        r = new MJS_FLOAT_ARRAY_TYPE(16);

    r[0] = m[0]; r[1] = m[4]; r[2] = m[8]; r[3] = m[12];
    r[4] = m[1]; r[5] = m[5]; r[6] = m[9]; r[7] = m[13];
    r[8] = m[2]; r[9] = m[6]; r[10] = m[10]; r[11] = m[14];
    r[12] = m[3]; r[13] = m[7]; r[14] = m[11]; r[15] = m[15];

    return r;
};
