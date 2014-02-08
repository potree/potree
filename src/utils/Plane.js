/**
 * potree.js 
 * http://potree.org
 *
 * Copyright 2012, Markus Schütz
 * Licensed under the GPL Version 2 or later.
 * - http://potree.org/wp/?page_id=7
 * - http://www.gnu.org/licenses/gpl-3.0.html
 *
 */

/**
 * 
 * @param distance
 * @param normal
 * @class
 */
function Plane(distance, normal){
	this.distance = distance;
	this.normal = normal;
}

/**
 * calculate distance from plane to point.
 * distance is negative if the point is behind the plane.
 */
Plane.prototype.distanceTo = function distanceTo(point){
	var A = this.normal[0];
	var B = this.normal[1];
	var C = this.normal[2];
	
	// distance to point assuming that the plane lies at the origin
	var d = -(A*point[0] + B*point[1] + C*point[2]);

	return this.distance - d;
};

/**
 * dir is a 3 element array, like [0, 1, 0]
 */
Plane.prototype.intersection = function(origin, dir){
	var N = this.normal;
	var O = origin;
	var D = dir;
	var d = this.distance;
	
	// calculate distance from ray origin to intersection
	var t = -(d + V3.dot(N, O))/(V3.dot(N, D));
	
	// calculate intersection = O + t*D
	var I = V3.add(O, V3.scale(dir, t));
	
	return I;
}