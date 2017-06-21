
Potree.Clipper = class {

	constructor(viewer){
		this.viewer = viewer;

		this.clipMode = 0;
		this.clipInside = false; 
	}

	setClipMode(mode) {
		this.clipMode = mode;
		viewer.dispatchEvent({"type": "clipper.clipMode_changed", "viewer": viewer});
	}

	setClipInside(inside) {
		this.clipInside = inside;
		viewer.dispatchEvent({"type": "clipper.clipInside_changed", "viewer": viewer});		
	}

};

Potree.Clipper.ClipMode = {
	NONE: 0,
	BOX: 1,
	POLYGON: 2,
	PROFILE: 3
};