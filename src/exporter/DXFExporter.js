/**
 *
 * @author sigeom sa / http://sigeom.ch
 * @author Ioda-Net Sàrl / https://www.ioda-net.ch/
 * @author Markus Schuetz / http://potree.org
 *
 */

import * as THREE from "../../libs/three.js/build/three.module.js";
import {Measure} from "../utils/Measure.js";

export class DXFExporter {

	static measurementPointSection (measurement) {
		let position = measurement.points[0].position;

		if (!position) {
			return '';
		}

		let dxfSection = `0
CIRCLE
8
layer_point
10
${position.x}
20
${position.y}
30
${position.z}
40
1.0
`;

		return dxfSection;
	}

	static measurementPolylineSection (measurement) {
		// bit code for polygons/polylines:
		// https://www.autodesk.com/techpubs/autocad/acad2000/dxf/polyline_dxf_06.htm
		let geomCode = 8;
		if (measurement.closed) {
			geomCode += 1;
		}

		let dxfSection = `0
POLYLINE
8
layer_polyline
62
1
66
1
10
0.0
20
0.0
30
0.0
70
${geomCode}
`;

		let xMax = 0.0;
		let yMax = 0.0;
		let zMax = 0.0;
		for (let point of measurement.points) {
			point = point.position;
			xMax = Math.max(xMax, point.x);
			yMax = Math.max(yMax, point.y);
			zMax = Math.max(zMax, point.z);

			dxfSection += `0
VERTEX
8
0
10
${point.x}
20
${point.y}
30
${point.z}
70
32
`;
		}
		dxfSection += `0
SEQEND
`;

		return dxfSection;
	}

	static measurementSection (measurement) {
		// if(measurement.points.length <= 1){
		//	return "";
		// }

		if (measurement.points.length === 0) {
			return '';
		} else if (measurement.points.length === 1) {
			return DXFExporter.measurementPointSection(measurement);
		} else if (measurement.points.length >= 2) {
			return DXFExporter.measurementPolylineSection(measurement);
		}
	}

	static toString(measurements){
		if (!(measurements instanceof Array)) {
			measurements = [measurements];
		}
		measurements = measurements.filter(m => m instanceof Measure);

		let points = measurements.filter(m => (m instanceof Measure))
			.map(m => m.points)
			.reduce((a, v) => a.concat(v))
			.map(p => p.position);

		let min = new THREE.Vector3(Infinity, Infinity, Infinity);
		let max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
		for (let point of points) {
			min.min(point);
			max.max(point);
		}

		let dxfHeader = `999
DXF created from potree
0
SECTION
2
HEADER
9
$ACADVER
1
AC1006
9
$INSBASE
10
0.0
20
0.0
30
0.0
9
$EXTMIN
10
${min.x}
20
${min.y}
30
${min.z}
9
$EXTMAX
10
${max.x}
20
${max.y}
30
${max.z}
0
ENDSEC
`;

		let dxfBody = `0
SECTION
2
ENTITIES
`;

		for (let measurement of measurements) {
			dxfBody += DXFExporter.measurementSection(measurement);
		}

		dxfBody += `0
ENDSEC
`;

		let dxf = dxfHeader + dxfBody + '0\nEOF';

		return dxf;
	}

}
