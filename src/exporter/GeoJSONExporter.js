/**
 *
 * @author sigeom sa / http://sigeom.ch
 * @author Ioda-Net Sàrl / https://www.ioda-net.ch/
 * @author Markus Schütz / http://potree.org
 *
 */

import {Measure} from "../utils/Measure.js";
import {Annotation} from "../Annotation.js";
import {Volume, BoxVolume, SphereVolume} from "../utils/Volume.js";
import {Profile} from "../utils/Profile.js";

export class GeoJSONExporter{

	static dataToJSON(datas, convertFunction) {
		let data_features = [];
		
		for (let data of datas) {
			let f = convertFunction(data);
			data_features = data_features.concat(f);
		}

		return data_features;	
	}
	
	static measurementToFeatures(measurement) {
		let coords = measurement.points.map(e => e.position.toArray());
		let features = [];

		if (coords.length === 1) {
			let feature = {
				type: 'Point',
				coordinates: coords[0],
				name: measurement.name
			};
			features.push(feature);
		} else if (coords.length > 1 && !measurement.closed && !measurement.showHeight) {
			let object = {
				type: 'LineString',
				coordinates: coords,
				name: measurement.name
			};
			features.push(object);
		} else if (coords.length > 1 && !measurement.closed && measurement.showHeight) {
			let object = {
				type: 'Height',
				coordinates: coords,
				name: measurement.name
			};
			features.push(object);
		} else if (coords.length > 1 && measurement.closed && measurement.showArea) {
			let object = {
				type: 'Polygon',
				coordinates: [...coords, coords[0]],
				name: measurement.name
			};
			features.push(object);
		} else if (coords.length > 1 && measurement.closed && measurement.showAngles) {
			let object = {
				type: 'Angle',
				coordinates: [...coords, coords[0]],
				name: measurement.name
			};
			features.push(object);
		}

		if (measurement.showDistances) {
			measurement.edgeLabels.forEach((label) => {
				let labelPoint = {
					type: 'Distance label',
					coordinates: label.position.toArray(),
					distance: label.text
				};
				features.push(labelPoint);
			});
		}

		if (measurement.showHeight) {
			let point = measurement.heightLabel.position;
			let labelHeight = {
				type: 'Height label',
				coordinates: point.toArray(),
				area: measurement.heightLabel.text
			};
			features.push(labelHeight);
		}
		
		if (measurement.showArea) {
			let point = measurement.areaLabel.position;
			let labelArea = {
				type: 'Area label',
				coordinates: point.toArray(),
				area: measurement.areaLabel.text
			};
			features.push(labelArea);
		}
		
		if (measurement.showAngles) {
			measurement.angleLabels.forEach((label) => {
				let labelPoint = {
					type: 'Angel label',
					coordinates: label.position.toArray(),
					distance: label.text
				};
				features.push(labelPoint);
			});
		}

		return features;
	}
	
	static annotationToFeatures(annotation) {
        let features = {
			name: '' + annotation.title,
			description: annotation.description,
			position: annotation.position.toArray()
		}						
		if(annotation.cameraPosition)
			features['cameraPosition'] = annotation.cameraPosition.toArray();
			
		if(annotation.cameraTarget)
			features['cameraTarget'] = annotation.cameraTarget.toArray();
		
		if(annotation.children.length > 0) {
			features['child'] = GeoJSONExporter.annotationsToJSON(annotation.children);
		}
		
		return features;
    }

	static volumeToFeatures(volume) {
		let features = [];
				
		let feature = {
			name: '' + volume.name,
			position: volume.position.toArray(),
			rotation: volume.rotation.toArray(),
			scale: volume.scale.toArray(),
			clip: volume.clip
		}
		
		if(volume instanceof SphereVolume) {
			feature['type'] = 'SphereVolume';
			feature['up'] = volume.up.toArray();
		} else if(volume instanceof BoxVolume) {
			feature['type'] = 'BoxVolume';
			feature['up'] = volume.up.toArray();
		}		
		features.push(feature);
		
		if (volume.showVolumeLabel) {
			let point = volume.label.position;
			let labelVolume = {
				type: 'Volume label',
				coordinates: point.toArray(),
				volume: volume.label.text
			};
			features.push(labelVolume);
		}
			
		return features;
	}
	
	static profileToFeatures(profile) {
		let coords = profile.points.map(e => e.toArray());
		
		let features = {
			name: '' + profile.name,
			coordinates: coords,
			width: profile.width
		}
		
		return features;
	}
	
	static toString (data) {
		if (!(data instanceof Array)) {
			data = [data];
		}

		let measurements_list = data.filter(m => m instanceof Measure);
		let measurements_features = GeoJSONExporter.dataToJSON(measurements_list, GeoJSONExporter.measurementToFeatures);

		let annotations_list = data.filter(m => m instanceof Annotation);
		let annotations_features = GeoJSONExporter.dataToJSON(annotations_list, GeoJSONExporter.annotationToFeatures);
		
		let volumes_list = data.filter(m => m instanceof Volume);		
		let volumes_features = GeoJSONExporter.dataToJSON(volumes_list, GeoJSONExporter.volumeToFeatures);
		
		let profiles_list = data.filter(m => m instanceof Profile);		
		let profiles_features = GeoJSONExporter.dataToJSON(profiles_list, GeoJSONExporter.profileToFeatures);
		
		let feature = {
			Features: measurements_features
		}
		if(annotations_features.length > 0)
			feature["Annotations"] = annotations_features;
		if(volumes_features.length > 0)
			feature["Volumes"] = volumes_features;
		if(profiles_features.length > 0)
			feature["Profiles"] = profiles_features;
		
		return JSON.stringify(feature, null, '\t');
	}
	
	static JSONToAnnotations(annotation_json, annotation_parent) {
		let annotation = new Annotation();
		
		annotation.title = annotation_json.name;
		annotation.description = annotation_json.description;
		annotation.position = new THREE.Vector3(...annotation_json.position);
		
		if(annotation_json.cameraPosition)
			annotation.cameraPosition = new THREE.Vector3(...annotation_json.cameraPosition);
		
		if(annotation_json.cameraTarget)
			annotation.cameraTarget = new THREE.Vector3(...annotation_json.cameraTarget);
		
		if(annotation_json.child) {
			for(let child of annotation_json.child) {
				GeoJSONExporter.JSONToAnnotation(child, annotation);					
			}
		}
		
		annotation_parent.add(annotation);		
	}
	
	static JSONToMeasurements(measurement_json, measurement_parent) {
		let measure = new Measure();
		switch (measurement_json.type) {
			case "Point":
				// SINGLE POINT MEASURE
				measure.name = measurement_json.name;
				measure.showDistances = false;
				measure.showCoordinates = true;
				measure.maxMarkers = 1;
				
				if(measurement_json.visible) {
					measure.visible = measurement_json.visible;
				} else {
					measure.visible = false;
				}
				
				measure.addMarker(new THREE.Vector3(...measurement_json.coordinates));
				break;
			case "LineString":
				// DISTANCE MEASURE
				measure.name = measurement_json.name;
				measure.closed = false;
				
				if(measurement_json.visible) {
					measure.visible = measurement_json.visible;
				} else {
					measure.visible = false;
				}

				for (var j = 0; j < measurement_json.coordinates.length; j++) {
					measure.addMarker(new THREE.Vector3(...measurement_json.coordinates[j]));
				}
				break;
			case "Height":
				// HEIGHT MEASURE
				measure.name = measurement_json.name;
				measure.closed = false;
				measure.showHeight = true;
				measure.showDistances = false;
				
				if(measurement_json.visible) {
					measure.visible = measurement_json.visible;
				} else {
					measure.visible = false;
				}

				for (var j = 0; j < measurement_json.coordinates.length; j++) {
					measure.addMarker(new THREE.Vector3(...measurement_json.coordinates[j]));
				}
				break;
			case "Polygon":
				// AREA MEASURE
				measure.name = measurement_json.name;
				measure.showDistances = true;
				measure.showArea = true;
				measure.showAngles = false;
				measure.closed = true;
				
				if(measurement_json.visible) {
					measure.visible = measurement_json.visible;
				} else {
					measure.visible = false;
				}
				
				for (var j = 0; j < (measurement_json.coordinates.length - 1); j++) {
					measure.addMarker(new THREE.Vector3(...measurement_json.coordinates[j]));
				}
				break;
			case "Angle":
				// ANGLE MEASURE
				measure = new Measure();
				measure.name = measurement_json.name;
				measure.showDistances = false;
				measure.showAngles = true;
				measure.showArea = false;
				measure.closed = true;
				
				if(measurement_json.visible) {
					measure.visible = measurement_json.visible;
				} else {
					measure.visible = false;
				}

				for (var j = 0; j < (measurement_json.coordinates.length - 1); j++) {
					measure.addMarker(new THREE.Vector3(...measurement_json.coordinates[j]));
				}
				break;
			default:
				return;
		}
		
		measurement_parent.addMeasurement(measure);
	}
	
	static JSONToVolumes(volume_json, volume_parent) {
		let volume;
		switch (volume_json.type) {
			case "SphereVolume":
				volume = new SphereVolume();
				volume.name = volume_json.name;
				
				volume.position.copy(new THREE.Vector3(...volume_json.position));
				volume.up.copy(new THREE.Vector3(...volume_json.up));
				volume.rotation.copy(new THREE.Euler(...volume_json.rotation));
				volume.scale.set(volume_json.scale[0], volume_json.scale[1], volume_json.scale[2]);
				volume.clip = volume_json.clip;
				
				if(volume_json.visible) {
					volume.visible = volume_json.visible;
				} else {
					volume.visible = false;
				}
				
				break;
			case "BoxVolume":
				volume = new BoxVolume();
				volume.name = volume_json.name;
				
				volume.position.copy(new THREE.Vector3(...volume_json.position));
				volume.up.copy(new THREE.Vector3(...volume_json.up));
				volume.rotation.copy(new THREE.Euler(...volume_json.rotation));
				volume.scale.set(volume_json.scale[0], volume_json.scale[1], volume_json.scale[2]);
				volume.clip = volume_json.clip;
				
				if(volume_json.visible) {
					volume.visible = volume_json.visible;
				} else {
					volume.visible = false;
				}
				
				break;
			default:
				return;
		}
		
		volume_parent.addVolume(volume);
	}
	
	static JSONToProfiles(profile_json, profile_parent) {
		let profile = new Profile();
		
		profile.name = profile_json.name;
		profile.width = profile_json.width;
		
		for (var j = 0; j < profile_json.coordinates.length; j++) {
			profile.addMarker(new THREE.Vector3(...profile_json.coordinates[j]));
		}
		
		if(profile_json.visible) {
			profile.visible = profile_json.visible;
		} else {
			profile.visible = false;
		}
		
		profile_parent.addProfile(profile);
	}
}
