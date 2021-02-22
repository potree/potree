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
    this.outValidities = [];
    this.outValidities.push([]);
    this.outAnomalies = [];
    this.outAnomalies.push([]);
    this.outAnnotations = [];
    this.outAnnotations.push([]);
  }

  initializeSegment(subName) { // have to be a callback?
    // Right Lane Segment or Left Lane Segment
    const laneSegment = new Measure();
    laneSegment.name = subName + this.offsets.length.toString();
    laneSegment.closed = false;
    laneSegment.showCoordinates = true;
    laneSegment.showAngles = true;

    this.segments.push(laneSegment);
    this.offsets.push(0);
    this.outPoints.push([]);
    this.outValidities.push([]);
    this.outAnomalies.push([]);
    this.outAnnotations.push([]);
  };

  finalizeSegment() {
    // add geometry object to this class (each measure object)
    this.add(this.segments[this.segments.length-1]);
  };

  incrementOffset(point, pointValidity, pointAnomaly, pointAnnotation) {
    // increment latest offset and add point to latest outPoints
    this.offsets[this.offsets.length-1] = this.offsets[this.offsets.length-1]+1;
    this.outPoints[this.outPoints.length-1].push({ position: point });
    this.outValidities[this.outValidities.length-1].push({ pointValidity: pointValidity });
    this.outAnomalies[this.outAnomalies.length-1].push({ pointAnomaly: pointAnomaly });
    this.outAnnotations[this.outAnnotations.length-1].push({ pointAnnotation: pointAnnotation });
  };

  addSegmentMarker(point, anomalyType, validity) {
    // call addMarker for latest measure object
    this.segments[this.segments.length-1].addMarker(point, null, anomalyType, validity);
  };

  getFinalPoints() {
    var finalPoints = [];
    var finalPointValidities = [];
    var finalPointAnomalies = [];
    var finalPointAnnotations = [];

    finalPoints = finalPoints.concat(this.outPoints[0]);
    var outPointValidities = this.outValiditiesHelper(0);
    finalPointValidities = finalPointValidities.concat(outPointValidities);
    var outPointAnomalies = this.outAnomaliesHelper(0);
    finalPointAnomalies = finalPointAnomalies.concat(outPointAnomalies);
    var outPointAnnotations = this.outAnnotationsHelper(0);
    finalPointAnnotations = finalPointAnnotations.concat(outPointAnnotations);

    for (let si=0, sLen=this.segments.length; si<sLen; si++) {
      // points
      finalPoints = finalPoints.concat(this.segments[si].points);
      finalPoints = finalPoints.concat(this.outPoints[si+1]);
      // validities
      const segmentValidities = window.usingInvalidLanesSchema ? this.segments[si].spheres.map(({validity}) => validity) : Array(this.segments[si].points.length).fill(0);
      finalPointValidities = finalPointValidities.concat(segmentValidities);
      outPointValidities = this.outValiditiesHelper(si+1);
      finalPointValidities = finalPointValidities.concat(outPointValidities);
      // anomalies
      const segmentAnomalies = window.usingInvalidLanesSchema && this.segments[si].spheres.map(({validity, anomalyType}) => validity && anomalyType);
      finalPointAnomalies = finalPointAnomalies.concat(segmentAnomalies);
      outPointAnomalies = this.outAnomaliesHelper(si+1);
      finalPointAnomalies = finalPointAnomalies.concat(outPointAnomalies);
      // annotations
      const segmentAnnotations = Array(this.segments[si].points.length).fill(1);
      finalPointAnnotations = finalPointAnnotations.concat(segmentAnnotations);
      outPointAnnotations = this.outAnnotationsHelper(si+1);
      finalPointAnnotations = finalPointAnnotations.concat(outPointAnnotations);
    }
    return {
      points: finalPoints,
      pointValidities: finalPointValidities,
      pointAnomalies: finalPointAnomalies,
      pointAnnotations: finalPointAnnotations
    };
  };

  updateSegments(clonedBoxes, prevIsContains, point, pointValidity, pointAnomaly, pointAnnotation, index, lengthArray) {
    let newIsContains = false;
    for (let bbi=0, bbLen=clonedBoxes.length; bbi<bbLen; bbi++) {
      const isContains = clonedBoxes[bbi].containsPoint(new THREE.Vector3(point.x(), point.y(), point.z()));
      if (isContains) {
        newIsContains = isContains;
      }
    }
    if (newIsContains && !prevIsContains) {
      this.initializeSegment("Lane Segment "); // can pass as a parameter and differentiate between left and right, but not required for now
    }
    if (!newIsContains && prevIsContains) {
      this.finalizeSegment();
    }

    if (newIsContains) {
      this.addSegmentMarker(new THREE.Vector3(point.x(), point.y(), point.z()), window.usingInvalidLanesSchema && pointAnomaly, window.usingInvalidLanesSchema && pointValidity);
    } else {
      this.incrementOffset(new THREE.Vector3(point.x(), point.y(), point.z()), pointValidity, pointAnomaly, pointAnnotation);
    }

    // edge case if a segment exists at the end
    if (newIsContains && index == lengthArray-1) {
      this.finalizeSegment();
    }

    return newIsContains;
  };

  outValiditiesHelper(index) {
    return this.outValidities[index].map(validity => validity.pointValidity);
  };

  outAnomaliesHelper(index) {
    return this.outAnomalies[index].map(anomaly => anomaly.pointAnomaly);
  };

  outAnnotationsHelper(index) {
    return this.outAnnotations[index].map(annotation => annotation.pointAnnotation);
  };

};
