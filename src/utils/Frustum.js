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
 * @class
 */
function Frustum(){
	this.nearPlane = null;
	this.farPlane = null;
	this.leftPlane = null;
	this.rightPlane =null;
	this.topPlane = null;
	this.bottomPlane = null;
	
	// the 4 coordinates of the near cap. 
	// UL: upper left, UR: upper right, LL: lower left, LR: lower right
	this.pNearUL = null;
	this.pNearUR = null;
	this.pNearLL = null;
	this.pNearLR = null;

	// the 4 coordinates of the far cap. 
	this.pFarUL =  null;
	this.pFarUR =  null;
	this.pFarLL =  null;
	this.pFarLR =  null;
	
	this.planes = new Array();
}

Frustum.fromCamera = function(camera){
	var frustum = new Frustum();
	
	var world = camera.globalTransformation;
	
	var heightNear = 2*camera.nearClipPlane*Math.tan(camera.fieldOfView * Math.PI / 360);
	var heightFar =  2*camera.farClipPlane*Math.tan(camera.fieldOfView * Math.PI / 360);
	var widthNear = heightNear * camera.aspectRatio;
	var widthFar = heightFar * camera.aspectRatio;

	// near and far center coordinates
	var pNearC = [0, 0, -camera.nearClipPlane];
	var pFarC = [0, 0,-camera.farClipPlane];
	
	// the 4 coordinates of the near cap. 
	frustum.pNearUL = V3.add(pNearC, [-widthNear/2, +heightNear/2, 0]); 
	frustum.pNearUR = V3.add(pNearC, [+widthNear/2, +heightNear/2, 0]);
	frustum.pNearLL = V3.add(pNearC, [-widthNear/2, -heightNear/2, 0]);
	frustum.pNearLR = V3.add(pNearC, [+widthNear/2, -heightNear/2, 0]);
	
	// the 4 coordinates of the far cap
	frustum.pFarUL = V3.add(pFarC, [-widthFar/2, +heightFar/2, 0]); 
	frustum.pFarUR = V3.add(pFarC, [+widthFar/2, +heightFar/2, 0]);
	frustum.pFarLL = V3.add(pFarC, [-widthFar/2, -heightFar/2, 0]);
	frustum.pFarLR = V3.add(pFarC, [+widthFar/2, -heightFar/2, 0]);
	
	// transform coordinates into world space
	frustum.pNearUL = V3.transform(frustum.pNearUL, world);
	frustum.pNearUR = V3.transform(frustum.pNearUR, world);
	frustum.pNearLL = V3.transform(frustum.pNearLL, world);
	frustum.pNearLR = V3.transform(frustum.pNearLR, world);
	frustum.pFarUL = V3.transform(frustum.pFarUL, world);
	frustum.pFarUR = V3.transform(frustum.pFarUR, world);
	frustum.pFarLL = V3.transform(frustum.pFarLL, world);
	frustum.pFarLR = V3.transform(frustum.pFarLR, world);
	
	// calculate planes
	frustum.nearPlane = Frustum.calculatePlane(frustum.pNearLL, frustum.pNearUL, frustum.pNearLR);
	frustum.farPlane = Frustum.calculatePlane(frustum.pFarLR, frustum.pFarUR, frustum.pFarLL);
	frustum.leftPlane = Frustum.calculatePlane(frustum.pFarLL, frustum.pFarUL, frustum.pNearLL);
	frustum.rightPlane = Frustum.calculatePlane(frustum.pNearLR, frustum.pNearUR, frustum.pFarLR);
	frustum.topPlane = Frustum.calculatePlane(frustum.pNearUR, frustum.pNearUL, frustum.pFarUR);
	frustum.bottomPlane = Frustum.calculatePlane(frustum.pNearLL, frustum.pNearLR, frustum.pFarLL);
	frustum.planes = [frustum.nearPlane, frustum.farPlane, frustum.leftPlane, 
	                  frustum.rightPlane, frustum.topPlane, frustum.bottomPlane];
	
	
	return frustum;
}

/**
 * calculates a plane from 3 points.
 * 
 * <pre>
 *        p3 
 *       / \          normal
 *      /   \     .~´
 *     /     \.~´ 
 *   p1     ´ \
 *      `.     \
 *         `.   \ 
 *            `  p2
 *            </pre>
 */
Frustum.calculatePlane = function(point1, point2, point3){
	var v1 = V3.direction(point1, point2);
	var v2 = V3.direction(point1, point3);
	var normal = V3.cross(v1, v2);
	var A = normal[0];
	var B = normal[1]; 
	var C = normal[2];
	var x = point1[0];
	var y = point1[1];
	var z = point1[2];
	var distance = -A*x - B*y - C*z;
	
	return new Plane(distance, normal);
}

/** 
 * check whether the aabb is completely outside the frustum or not
 * 
 * @param aabb
 */
Frustum.prototype.isOutside = function isOutside(aabb){
	
	for(var i = 0; i < this.planes.length; i++){
		var plane = this.planes[i];
		
		// is the positive vertex outside?
		if (plane.distanceTo(aabb.getPositive(plane.normal)) < 0)
			return true;
//		// is the negative vertex outside?
//		else if (plane.distanceTo(b.getVertexN(pl[i].normal)) > 0)
//			result =  INTERSECT;
		
	}
	return false;
}