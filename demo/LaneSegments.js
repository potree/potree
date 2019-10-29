import { Measure } from "../src/utils/Measure.js";

export class LaneSegments {
	constructor() {
		this.offsets = [];
		this.offsets(0)
		this.measures = [];
		this.outPoints = [];
		this.outPoints.push([])
	}

	initializeSegment(subName) { // have to be a callback?
		// Right Lane Segment or Left Lane Segment
		laneSegment = new Measure();
		laneSegment.name = subName + this.offsets.length.toString();
		laneSegment.closed = false;
		laneSegment.showCoordinates = true;
		laneSegment.showAngles = true;

		this.measures.push(laneSegment);
		this.offsets.push(0);
		this.outPoints.push([]);
	};

	incrementOffset(point) {
		// increment latest offset and add point to latest outPoints
	};

	addSegmentMarker(point) {
		// call addMarker for latest measure object
	};
};