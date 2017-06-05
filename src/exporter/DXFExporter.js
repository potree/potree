/**
 *
 * @author sigeom sa / http://sigeom.ch
 * @author Ioda-Net Sàrl / https://www.ioda-net.ch/
 * @author Markus Schütz / http://potree.org
 *
 */

Potree.DXFExporter = class DXFExporter{
	
	static measurementSection(measurement){
		
		if(measurement.points.length <= 1){
			return "";
		}
		
		
		
		// bit code for polygons/polylines: 
		// https://www.autodesk.com/techpubs/autocad/acad2000/dxf/polyline_dxf_06.htm
		let geomCode = 8; 
		if(measurement.closed){
			geomCode += 1;
		}
		
		let dxfSection = `0
SECTION
2
ENTITIES
0
POLYLINE
8
0
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
		for(let point of measurement.points){
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

            dxfSection += `0
SEQEND
0
ENDSEC
`;
		}

		return dxfSection;
	}
	
	
	static toString(measurements){
		
		if(!(measurements instanceof Array)){
			measurements = [measurements];
		}
		measurements = measurements.filter(m => m instanceof Potree.Measure);
		
		let points = measurements.filter(m => (m instanceof Potree.Measure))
			.map(m => m.points)
			.reduce((a, v) => a.concat(v))
			.map(p => p.position);
			
		let min = new THREE.Vector3(Infinity, Infinity, Infinity);
		let max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
		for(let point of points){
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

		let dxfBody = "";
		
		for(let measurement of measurements){
			dxfBody += Potree.DXFExporter.measurementSection(measurement);
		}

		let dxf = dxfHeader + dxfBody + '0\nEOF';
		
		return dxf;
	}

	
}