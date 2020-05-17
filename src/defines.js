
import {Enum} from "./Enum.js";


export const CameraMode = {
	ORTHOGRAPHIC: 0,
	PERSPECTIVE: 1,
	VR: 2,
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

export const ElevationGradientRepeat = {
	CLAMP: 0,
	REPEAT: 1,
	MIRRORED_REPEAT: 2,
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

export const TreeType = {
	OCTREE:	0,
	KDTREE:	1
};

export const LengthUnits = {
	METER: {code: 'm', unitspermeter: 1.0},
	FEET: {code: 'ft', unitspermeter: 3.28084},
	INCH: {code: '\u2033', unitspermeter: 39.3701}
};