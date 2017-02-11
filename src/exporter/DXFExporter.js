/**
 *
 * @author sigeom sa / http://sigeom.ch
 * @author Ioda-Net Sàrl / https://www.ioda-net.ch/
 * @author Markus Schütz / http://potree.org
 *
 */

Potree.DXFExporter = class DXFExporter{
	
	static toString(measurement){
		let isLine = measurement.showDistances && !measurement.showArea && !measurement.showAngles;
		let isPolygon = measurement.showDistances && measurement.showArea && !measurement.showAngles;
		
		 if (!isLine && !isPolygon) {
			return;
		}
		
		let geomCode = isLine ? 8 : 9;
		
		let dxfBody = '0\n\
SECTION\n\
2\n\
ENTITIES\n\
0\n\
POLYLINE\n\
8\n\
0\n\
62\n\
1\n\
66\n\
1\n\
10\n\
0.0\n\
20\n\
0.0\n\
30\n\
0.0\n\
70\n\
{geomCode}\n'.replace('{geomCode}', geomCode);

		let xMax = 0.0;
		let yMax = 0.0;
		let zMax = 0.0;
		measurement.points.forEach(function (point) {
			point = point.position;
			xMax = Math.max(xMax, point.x);
			yMax = Math.max(yMax, point.y);
			zMax = Math.max(zMax, point.z);
			dxfBody += '0\n\
VERTEX\n\
8\n\
0\n\
10\n\
{X}\n\
20\n\
{Y}\n\
30\n\
{Z}\n\
70\n\
32\n'.replace('{X}', point.x)
                .replace('{Y}', point.y)
                .replace('{Z}', point.z);
            });

            dxfBody += '0\n\
SEQEND\n\
0\n\
ENDSEC\n';

            var dxfHeader = '999\n\
DXF created from potree\n\
0\n\
SECTION\n\
2\n\
HEADER\n\
9\n\
$ACADVER\n\
1\n\
AC1006\n\
9\n\
$INSBASE\n\
10\n\
0.0\n\
20\n\
0.0\n\
30\n\
0.0\n\
9\n\
$EXTMIN\n\
10\n\
0.0\n\
20\n\
0.0\n\
30\n\
0\n\
9\n\
$EXTMAX\n\
10\n\
{xMax}\n\
20\n\
{yMax}\n\
30\n\
{zMax}\n\
0\n\
ENDSEC\n'.replace('{xMax}', xMax)
                .replace('{yMax}', yMax)
                .replace('{zMax}', zMax);

            let dxf = dxfHeader + dxfBody + '0\n\
EOF';

		return dxf;
	}
	
}