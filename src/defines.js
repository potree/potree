
import {Enum} from "./Enum.js";


export const CameraMode = {
	ORTHOGRAPHIC: 0,
	PERSPECTIVE: 1
};

export const ClipTask = {
	NONE: 0,
	HIGHLIGHT: 1,
	SHOW_INSIDE: 2,
	SHOW_OUTSIDE: 3
};

export const ClipMethod = {
	INSIDE_ANY: 0,
	INSIDE_ALL: 1
};

export const MOUSE = {
	LEFT: 0b0001,
	RIGHT: 0b0010,
	MIDDLE: 0b0100
};

export const PointSizeType = {
	FIXED: 0,
	ATTENUATED: 1,
	ADAPTIVE: 2
};

export const PointShape = {
	SQUARE: 0,
	CIRCLE: 1,
	PARABOLOID: 2
};

export const PointColorType = {
	RGB: 0,
	COLOR: 1,
	DEPTH: 2,
	HEIGHT: 3,
	ELEVATION: 3,
	INTENSITY: 4,
	INTENSITY_GRADIENT:	5,
	LOD: 6,
	LEVEL_OF_DETAIL: 6,
	POINT_INDEX: 7,
	CLASSIFICATION: 8,
	RETURN_NUMBER: 9,
	SOURCE: 10,
	NORMAL: 11,
	PHONG: 12,
	RGB_HEIGHT: 13,
	GPS_TIME: 14,
	COMPOSITE: 50
};

export const TreeType = {
	OCTREE:	0,
	KDTREE:	1
};