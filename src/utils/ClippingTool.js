
Potree.ClippingTool = class {

	constructor(viewer){
		this.viewer = viewer;

		this.clipInside = false; 
	}

	setClipInside(inside) {
		this.clipInside = inside;
		viewer.dispatchEvent({"type": "clipper.clipInside_changed", "viewer": viewer});		
	}	
};

Potree.ClippingTool.ClipMode = {
	NONE: 0,
	BOX: 1,
	POLYGON: 2,
	PROFILE: 3
};