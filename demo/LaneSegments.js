"use strict"
import { Measure } from "../src/utils/Measure.js";

export class LaneSegments extends THREE.Object3D {
	constructor() {
		super()

		this.offsets = [];
		this.offsets.push(0)
		this.segments = [];
		this.outPoints = [];
		this.outPoints.push([])
	}

	initializeSegment(subName) { // have to be a callback?
		// Right Lane Segment or Left Lane Segment
		let laneSegment = new Measure();
		laneSegment.name = subName + this.offsets.length.toString();
		laneSegment.closed = false;
		laneSegment.showCoordinates = true;
		laneSegment.showAngles = true;

		this.segments.push(laneSegment);
		this.offsets.push(0);
		this.outPoints.push([]);
	};

	finalizeSegment() {
		// add geometry object to this class (each measure object)
		this.add(this.segments[this.segments.length-1]);
	};

	incrementOffset(point) {
		// increment latest offset and add point to latest outPoints
		this.offsets[this.offsets.length-1] = this.offsets[this.offsets.length-1]+1;
		this.outPoints[this.outPoints.length-1].push({position: point});
	};

	addSegmentMarker(point) {
		// call addMarker for latest measure object
		this.segments[this.segments.length-1].addMarker(point);
	};

	getFinalPoints() {
		var finalPoints = [];

		finalPoints = finalPoints.concat(this.outPoints[0]);

		for (let si=0, sLen=this.segments.length; si<sLen; si++) {
			finalPoints = finalPoints.concat(this.segments[si].points);
			finalPoints = finalPoints.concat(this.outPoints[si+1]);
		}

		return finalPoints;
	};
};