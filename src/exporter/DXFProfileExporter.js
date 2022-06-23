/**
 *
 * @author roy.mdr / http://...
 *
 */

export class DXFProfileExporter {

	static toXYZ(points, flatten = false) {

		/*
		points: {
			...
			data: {
				mileage: [0, 1, 2...], -> one per point
				position: [0, 0, 0, 1, 1, 1, 2, 2, 2...], -> X, Y, Z
				rgba: [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2...] -> R, G, B, A
			},
			numPoints: Int
		}
		*/

		const pointsXYZ = {
			x: [],
			y: [],
			z: [],
			minX:  Number.MAX_VALUE,
			minY:  Number.MAX_VALUE,
			minZ:  Number.MAX_VALUE,
			maxX: -Number.MAX_VALUE,
			maxY: -Number.MAX_VALUE,
			maxZ: -Number.MAX_VALUE,
			numPoints: 0
		};

		const pData    = points.data;
		const pMileage = pData.mileage;
		const pCoords  = pData.position;
		const pColor   = pData.rgba;

		for (let pIx = 0; pIx < points.numPoints; pIx++) {

			const poMileage = pMileage[pIx];
			const poCoordX  = pCoords[ ((pIx * 3) + 0) ];
			const poCoordY  = pCoords[ ((pIx * 3) + 1) ];
			const poCoordZ  = pCoords[ ((pIx * 3) + 2) ];
			// const poColorR  = pColor[ ((pIx * 4) + 0) ];
			// const poColorG  = pColor[ ((pIx * 4) + 1) ];
			// const poColorB  = pColor[ ((pIx * 4) + 2) ];
			// const poColorA  = pColor[ ((pIx * 4) + 3) ];

			if (flatten === true) {

				pointsXYZ.x.push(poMileage);
				pointsXYZ.y.push(0);
				pointsXYZ.z.push(poCoordZ);

				// Get boundaries X
				if (pointsXYZ.maxX < poMileage) pointsXYZ.maxX = poMileage;
				if (pointsXYZ.minX > poMileage) pointsXYZ.minX = poMileage;

				// Get boundaries Z
				if (pointsXYZ.maxZ < poCoordZ) pointsXYZ.maxZ = poCoordZ;
				if (pointsXYZ.minZ > poCoordZ) pointsXYZ.minZ = poCoordZ;

			} else {

				pointsXYZ.x.push(poCoordX);
				pointsXYZ.y.push(poCoordY);
				pointsXYZ.z.push(poCoordZ);

				// Get boundaries X
				if (pointsXYZ.maxX < poCoordX) pointsXYZ.maxX = poCoordX;
				if (pointsXYZ.minX > poCoordX) pointsXYZ.minX = poCoordX;

				// Get boundaries Y
				if (pointsXYZ.maxY < poCoordY) pointsXYZ.maxY = poCoordY;
				if (pointsXYZ.minY > poCoordY) pointsXYZ.minY = poCoordY;

				// Get boundaries Z
				if (pointsXYZ.maxZ < poCoordZ) pointsXYZ.maxZ = poCoordZ;
				if (pointsXYZ.minZ > poCoordZ) pointsXYZ.minZ = poCoordZ;

			}

		}

		if (flatten === true) {
			// Set boundaries Y
			pointsXYZ.maxY = 0;
			pointsXYZ.minY = 0;
		}

		pointsXYZ.numPoints = points.numPoints;

		return pointsXYZ;
	}

	static plotPCloudPoint(x, y, z) {

		const dxfSection = `0
POINT
8
layer_pointCloud
10
${x}
20
${y}
30
${z}
`;

		return dxfSection;
	}

	static toString(points, flatten = false) {

		const pCloud = DXFProfileExporter.toXYZ(points, flatten);

		const dxfHeader = `999
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
${pCloud.minX}
20
${pCloud.minY}
30
${pCloud.minZ}
9
$EXTMAX
10
${pCloud.maxX}
20
${pCloud.maxY}
30
${pCloud.maxZ}
0
ENDSEC
`;

		let dxfBody = `0
SECTION
2
ENTITIES
`;

		for (let i = 0; i < pCloud.numPoints; i++) {
			dxfBody += DXFProfileExporter.plotPCloudPoint(pCloud.x[i], pCloud.y[i], pCloud.z[i]);
		}

		dxfBody += `0
ENDSEC
`;

		const dxf = dxfHeader + dxfBody + '0\nEOF';

		return dxf;
	}

}
