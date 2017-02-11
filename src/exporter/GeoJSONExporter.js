/**
 *
 * @author sigeom sa / http://sigeom.ch
 * @author Ioda-Net Sàrl / https://www.ioda-net.ch/
 * @author Markus Schütz / http://potree.org
 *
 */

Potree.GeoJSONExporter = class GeoJSONExporter{
	
	static toString(measurement){
		
		let geojson = {
			"type": "FeatureCollection",
			"features": []
		};
		
		let isLine = measurement.showDistances && !measurement.showArea && !measurement.showAngles;
		let isPolygon = measurement.showDistances && measurement.showArea && !measurement.showAngles;
		
		if(isLine){
			geojson.features.push({
				"type": "Feature",
				"geometry": {
				"type": "LineString",
				"coordinates": []
				},
				"properties": {
				}
			});
		}else if (isPolygon) {
			geojson.features.push({
				"type": "Feature",
				"geometry": {
					"type": "Polygon",
					"coordinates": []
				},
				"properties": {
				}
			});
		}
		
		let coords = measurement.points.map(e => e.position.toArray());
		
		if(isLine){
			geojson.features[0].geometry.coordinates = coords;
		}else if(isPolygon){
			coords.push(coords[0]);
			geojson.features[0].geometry.coordinates.push(coords);
		}
		
		measurement.edgeLabels.forEach(function (label) {
			var labelPoint = {
				type: 'Feature',
				geometry: {
					type: 'Point',
					coordinates: label.position.toArray(),
				},
				properties: {
					name: label.text
				}
			};
			geojson.features.push(labelPoint);
		});
		
		if (isLine) {
			// There is one point more than the number of edges.
			geojson.features.pop();
		}
		
		if (isPolygon) {
			var point = measurement.areaLabel.position;
			var labelArea = {
				type: 'Feature',
				geometry: {
					type: 'Point',
					coordinates: point.toArray(),
				},
				properties: {
					name: measurement.areaLabel.text
				}
			};
			geojson.features.push(labelArea);
		}
		
		return JSON.stringify(geojson);
	}

}


