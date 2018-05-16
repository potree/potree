
// http://epsg.io/
proj4.defs('UTM10N', '+proj=utm +zone=10 +ellps=GRS80 +datum=NAD83 +units=m +no_defs');

export class MapView{
	
	constructor (viewer) {
		this.viewer = viewer;

		this.webMapService = 'WMTS';
		this.mapProjectionName = 'EPSG:3857';
		this.mapProjection = proj4.defs(this.mapProjectionName);
		this.sceneProjection = null;

		this.extentsLayer = null;
		this.cameraLayer = null;
		this.toolLayer = null;
		this.sourcesLayer = null;
		this.sourcesLabelLayer = null;
		this.enabled = false;

		this.createAnnotationStyle = (text) => {
			return [
				new ol.style.Style({
					image: new ol.style.Circle({
						radius: 10,
						stroke: new ol.style.Stroke({
							color: [255, 255, 255, 0.5],
							width: 2
						}),
						fill: new ol.style.Fill({
							color: [0, 0, 0, 0.5]
						})
					})
				})/*,
				new ol.style.Style({
					text: new ol.style.Text({
						font: '12px helvetica,sans-serif',
						text: text,
						fill: new ol.style.Fill({
							color: '#000'
						}),
						stroke: new ol.style.Stroke({
							color: '#fff',
							width: 2
						})
					})
				}) */
			];
		};

		this.createLabelStyle = (text) => {
			let style = new ol.style.Style({
				image: new ol.style.Circle({
					radius: 6,
					stroke: new ol.style.Stroke({
						color: 'white',
						width: 2
					}),
					fill: new ol.style.Fill({
						color: 'green'
					})
				}),
				text: new ol.style.Text({
					font: '12px helvetica,sans-serif',
					text: text,
					fill: new ol.style.Fill({
						color: '#000'
					}),
					stroke: new ol.style.Stroke({
						color: '#fff',
						width: 2
					})
				})
			});

			return style;
		};
	}

	showSources (show) {
		this.sourcesLayer.setVisible(show);
		this.sourcesLabelLayer.setVisible(show);
	}

	init () {
		this.elMap = $('#potree_map');
		this.elMap.draggable({ handle: $('#potree_map_header') });
		this.elMap.resizable();

		this.elTooltip = $(`<div style="position: relative; z-index: 100"></div>`);
		this.elMap.append(this.elTooltip);

		let extentsLayer = this.getExtentsLayer();
		let cameraLayer = this.getCameraLayer();
		this.getToolLayer();
		let sourcesLayer = this.getSourcesLayer();
		this.getSourcesLabelLayer();
		this.getAnnotationsLayer();

		let mousePositionControl = new ol.control.MousePosition({
			coordinateFormat: ol.coordinate.createStringXY(5),
			projection: 'EPSG:4326',
			undefinedHTML: '&nbsp;'
		});

		let _this = this;
		let DownloadSelectionControl = function (optOptions) {
			let options = optOptions || {};

			// TOGGLE TILES
			let btToggleTiles = document.createElement('button');
			btToggleTiles.innerHTML = 'T';
			btToggleTiles.addEventListener('click', () => {
				let visible = sourcesLayer.getVisible();
				_this.showSources(!visible);
			}, false);
			btToggleTiles.style.float = 'left';
			btToggleTiles.title = 'show / hide tiles';

			// DOWNLOAD SELECTED TILES
			let link = document.createElement('a');
			link.href = '#';
			link.download = 'list.txt';
			link.style.float = 'left';

			let button = document.createElement('button');
			button.innerHTML = 'D';
			link.appendChild(button);

			let handleDownload = (e) => {
				let features = selectedFeatures.getArray();

				let url = [document.location.protocol, '//', document.location.host, document.location.pathname].join('');

				if (features.length === 0) {
					alert('No tiles were selected. Select area with ctrl + left mouse button!');
					e.preventDefault();
					e.stopImmediatePropagation();
					return false;
				} else if (features.length === 1) {
					let feature = features[0];

					if (feature.source) {
						let cloudjsurl = feature.pointcloud.pcoGeometry.url;
						let sourceurl = new URL(url + '/../' + cloudjsurl + '/../source/' + feature.source.name);
						link.href = sourceurl.href;
						link.download = feature.source.name;
					}
				} else {
					let content = '';
					for (let i = 0; i < features.length; i++) {
						let feature = features[i];

						if (feature.source) {
							let cloudjsurl = feature.pointcloud.pcoGeometry.url;
							let sourceurl = new URL(url + '/../' + cloudjsurl + '/../source/' + feature.source.name);
							content += sourceurl.href + '\n';
						}
					}

					let uri = 'data:application/octet-stream;base64,' + btoa(content);
					link.href = uri;
					link.download = 'list_of_files.txt';
				}
			};

			button.addEventListener('click', handleDownload, false);

			// assemble container
			let element = document.createElement('div');
			element.className = 'ol-unselectable ol-control';
			element.appendChild(link);
			element.appendChild(btToggleTiles);
			element.style.bottom = '0.5em';
			element.style.left = '0.5em';
			element.title = 'Download file or list of selected tiles. Select tile with left mouse button or area using ctrl + left mouse.';

			ol.control.Control.call(this, {
				element: element,
				target: options.target
			});
		};
		ol.inherits(DownloadSelectionControl, ol.control.Control);

		this.map = new ol.Map({
			controls: ol.control.defaults({
				attributionOptions: ({
					collapsible: false
				})
			}).extend([
				// this.controls.zoomToExtent,
				new DownloadSelectionControl(),
				mousePositionControl
			]),
			layers: [
				new ol.layer.Tile({source: new ol.source.OSM()}),
				this.toolLayer,
				this.annotationsLayer,
				this.sourcesLayer,
				this.sourcesLabelLayer,
				extentsLayer,
				cameraLayer
			],
			target: 'potree_map_content',
			view: new ol.View({
				center: this.olCenter,
				zoom: 9
			})
		});

		// DRAGBOX / SELECTION
		this.dragBoxLayer = new ol.layer.Vector({
			source: new ol.source.Vector({}),
			style: new ol.style.Style({
				stroke: new ol.style.Stroke({
					color: 'rgba(0, 0, 255, 1)',
					width: 2
				})
			})
		});
		this.map.addLayer(this.dragBoxLayer);

		let select = new ol.interaction.Select();
		this.map.addInteraction(select);

		let selectedFeatures = select.getFeatures();

		let dragBox = new ol.interaction.DragBox({
			condition: ol.events.condition.platformModifierKeyOnly
		});

		this.map.addInteraction(dragBox);

		this.map.on('pointermove', evt => {
			let pixel = evt.pixel;
			let feature = this.map.forEachFeatureAtPixel(pixel, function (feature) {
				return feature;
			});

			// console.log(feature);
			// this.elTooltip.css("display", feature ? '' : 'none');
			this.elTooltip.css('display', 'none');
			if (feature && feature.onHover) {
				feature.onHover(evt);
				// overlay.setPosition(evt.coordinate);
				// tooltip.innerHTML = feature.get('name');
			}
		});

		this.map.on('click', evt => {
			let pixel = evt.pixel;
			let feature = this.map.forEachFeatureAtPixel(pixel, function (feature) {
				return feature;
			});

			if (feature && feature.onHover) {
				feature.onClick(evt);
			}
		});

		dragBox.on('boxend', (e) => {
			// features that intersect the box are added to the collection of
			// selected features, and their names are displayed in the "info"
			// div
			let extent = dragBox.getGeometry().getExtent();
			this.getSourcesLayer().getSource().forEachFeatureIntersectingExtent(extent, (feature) => {
				selectedFeatures.push(feature);
			});
		});

		// clear selection when drawing a new box and when clicking on the map
		dragBox.on('boxstart', (e) => {
			selectedFeatures.clear();
		});
		this.map.on('click', () => {
			selectedFeatures.clear();
		});

		this.viewer.addEventListener('scene_changed', e => {
			this.setScene(e.scene);
		});

		this.onPointcloudAdded = e => {
			this.load(e.pointcloud);
		};

		this.onAnnotationAdded = e => {
			if (!this.sceneProjection) {
				return;
			}

			let annotation = e.annotation;
			let position = annotation.position;
			let mapPos = this.toMap.forward([position.x, position.y]);
			let feature = new ol.Feature({
				geometry: new ol.geom.Point(mapPos),
				name: annotation.title
			});
			feature.setStyle(this.createAnnotationStyle(annotation.title));

			feature.onHover = evt => {
				let coordinates = feature.getGeometry().getCoordinates();
				let p = this.map.getPixelFromCoordinate(coordinates);

				this.elTooltip.html(annotation.title);
				this.elTooltip.css('display', '');
				this.elTooltip.css('left', `${p[0]}px`);
				this.elTooltip.css('top', `${p[1]}px`);
			};

			feature.onClick = evt => {
				annotation.clickTitle();
			};

			this.getAnnotationsLayer().getSource().addFeature(feature);
		};

		this.setScene(this.viewer.scene);
	}

	setScene (scene) {
		if (this.scene === scene) {
			return;
		};

		if (this.scene) {
			this.scene.removeEventListener('pointcloud_added', this.onPointcloudAdded);
			this.scene.annotations.removeEventListener('annotation_added', this.onAnnotationAdded);
		}

		this.scene = scene;

		this.scene.addEventListener('pointcloud_added', this.onPointcloudAdded);
		this.scene.annotations.addEventListener('annotation_added', this.onAnnotationAdded);

		for (let pointcloud of this.viewer.scene.pointclouds) {
			this.load(pointcloud);
		}

		this.viewer.scene.annotations.traverseDescendants(annotation => {
			this.onAnnotationAdded({annotation: annotation});
		});
	}

	getExtentsLayer () {
		if (this.extentsLayer) {
			return this.extentsLayer;
		}

		this.gExtent = new ol.geom.LineString([[0, 0], [0, 0]]);

		let feature = new ol.Feature(this.gExtent);
		let featureVector = new ol.source.Vector({
			features: [feature]
		});

		this.extentsLayer = new ol.layer.Vector({
			source: featureVector,
			style: new ol.style.Style({
				fill: new ol.style.Fill({
					color: 'rgba(255, 255, 255, 0.2)'
				}),
				stroke: new ol.style.Stroke({
					color: '#0000ff',
					width: 2
				}),
				image: new ol.style.Circle({
					radius: 3,
					fill: new ol.style.Fill({
						color: '#0000ff'
					})
				})
			})
		});

		return this.extentsLayer;
	}

	getAnnotationsLayer () {
		if (this.annotationsLayer) {
			return this.annotationsLayer;
		}

		this.annotationsLayer = new ol.layer.Vector({
			source: new ol.source.Vector({
			}),
			style: new ol.style.Style({
				fill: new ol.style.Fill({
					color: 'rgba(255, 0, 0, 1)'
				}),
				stroke: new ol.style.Stroke({
					color: 'rgba(255, 0, 0, 1)',
					width: 2
				})
			})
		});

		return this.annotationsLayer;
	}

	getCameraLayer () {
		if (this.cameraLayer) {
			return this.cameraLayer;
		}

		// CAMERA LAYER
		this.gCamera = new ol.geom.LineString([[0, 0], [0, 0], [0, 0], [0, 0]]);
		let feature = new ol.Feature(this.gCamera);
		let featureVector = new ol.source.Vector({
			features: [feature]
		});

		this.cameraLayer = new ol.layer.Vector({
			source: featureVector,
			style: new ol.style.Style({
				stroke: new ol.style.Stroke({
					color: '#0000ff',
					width: 2
				})
			})
		});

		return this.cameraLayer;
	}

	getToolLayer () {
		if (this.toolLayer) {
			return this.toolLayer;
		}

		this.toolLayer = new ol.layer.Vector({
			source: new ol.source.Vector({
			}),
			style: new ol.style.Style({
				fill: new ol.style.Fill({
					color: 'rgba(255, 0, 0, 1)'
				}),
				stroke: new ol.style.Stroke({
					color: 'rgba(255, 0, 0, 1)',
					width: 2
				})
			})
		});

		return this.toolLayer;
	}

	getSourcesLayer () {
		if (this.sourcesLayer) {
			return this.sourcesLayer;
		}

		this.sourcesLayer = new ol.layer.Vector({
			source: new ol.source.Vector({}),
			style: new ol.style.Style({
				fill: new ol.style.Fill({
					color: 'rgba(0, 0, 150, 0.1)'
				}),
				stroke: new ol.style.Stroke({
					color: 'rgba(0, 0, 150, 1)',
					width: 1
				})
			})
		});

		return this.sourcesLayer;
	}

	getSourcesLabelLayer () {
		if (this.sourcesLabelLayer) {
			return this.sourcesLabelLayer;
		}

		this.sourcesLabelLayer = new ol.layer.Vector({
			source: new ol.source.Vector({
			}),
			style: new ol.style.Style({
				fill: new ol.style.Fill({
					color: 'rgba(255, 0, 0, 0.1)'
				}),
				stroke: new ol.style.Stroke({
					color: 'rgba(255, 0, 0, 1)',
					width: 2
				})
			}),
			minResolution: 0.01,
			maxResolution: 20
		});

		return this.sourcesLabelLayer;
	}

	setSceneProjection (sceneProjection) {
		this.sceneProjection = sceneProjection;
		this.toMap = proj4(this.sceneProjection, this.mapProjection);
		this.toScene = proj4(this.mapProjection, this.sceneProjection);
	};

	getMapExtent () {
		let bb = this.viewer.getBoundingBox();

		let bottomLeft = this.toMap.forward([bb.min.x, bb.min.y]);
		let bottomRight = this.toMap.forward([bb.max.x, bb.min.y]);
		let topRight = this.toMap.forward([bb.max.x, bb.max.y]);
		let topLeft = this.toMap.forward([bb.min.x, bb.max.y]);

		let extent = {
			bottomLeft: bottomLeft,
			bottomRight: bottomRight,
			topRight: topRight,
			topLeft: topLeft
		};

		return extent;
	};

	getMapCenter () {
		let mapExtent = this.getMapExtent();

		let mapCenter = [
			(mapExtent.bottomLeft[0] + mapExtent.topRight[0]) / 2,
			(mapExtent.bottomLeft[1] + mapExtent.topRight[1]) / 2
		];

		return mapCenter;
	};

	updateToolDrawings () {
		this.toolLayer.getSource().clear();

		let profiles = this.viewer.profileTool.profiles;
		for (let i = 0; i < profiles.length; i++) {
			let profile = profiles[i];
			let coordinates = [];

			for (let j = 0; j < profile.points.length; j++) {
				let point = profile.points[j];
				let pointMap = this.toMap.forward([point.x, point.y]);
				coordinates.push(pointMap);
			}

			let line = new ol.geom.LineString(coordinates);
			let feature = new ol.Feature(line);
			this.toolLayer.getSource().addFeature(feature);
		}

		let measurements = this.viewer.measuringTool.measurements;
		for (let i = 0; i < measurements.length; i++) {
			let measurement = measurements[i];
			let coordinates = [];

			for (let j = 0; j < measurement.points.length; j++) {
				let point = measurement.points[j].position;
				let pointMap = this.toMap.forward([point.x, point.y]);
				coordinates.push(pointMap);
			}

			if (measurement.closed && measurement.points.length > 0) {
				coordinates.push(coordinates[0]);
			}

			let line = new ol.geom.LineString(coordinates);
			let feature = new ol.Feature(line);
			this.toolLayer.getSource().addFeature(feature);
		}
	}

	load (pointcloud) {
		if (!pointcloud) {
			return;
		}

		if (!pointcloud.projection) {
			return;
		}

		if (!this.sceneProjection) {
			this.setSceneProjection(pointcloud.projection);
		}

		let mapExtent = this.getMapExtent();
		let mapCenter = this.getMapCenter();

		let view = this.map.getView();
		view.setCenter(mapCenter);

		this.gExtent.setCoordinates([
			mapExtent.bottomLeft,
			mapExtent.bottomRight,
			mapExtent.topRight,
			mapExtent.topLeft,
			mapExtent.bottomLeft
		]);

		view.fit(this.gExtent, [300, 300], {
			constrainResolution: false
		});

		let url = pointcloud.pcoGeometry.url + '/../sources.json';
		$.getJSON(url, (data) => {
			let sources = data.sources;

			for (let i = 0; i < sources.length; i++) {
				let source = sources[i];
				let name = source.name;
				let bounds = source.bounds;

				let mapBounds = {
					min: this.toMap.forward([bounds.min[0], bounds.min[1]]),
					max: this.toMap.forward([bounds.max[0], bounds.max[1]])
				};
				let mapCenter = [
					(mapBounds.min[0] + mapBounds.max[0]) / 2,
					(mapBounds.min[1] + mapBounds.max[1]) / 2
				];

				let p1 = this.toMap.forward([bounds.min[0], bounds.min[1]]);
				let p2 = this.toMap.forward([bounds.max[0], bounds.min[1]]);
				let p3 = this.toMap.forward([bounds.max[0], bounds.max[1]]);
				let p4 = this.toMap.forward([bounds.min[0], bounds.max[1]]);

				// let feature = new ol.Feature({
				//	'geometry': new ol.geom.LineString([p1, p2, p3, p4, p1])
				// });
				let feature = new ol.Feature({
					'geometry': new ol.geom.Polygon([[p1, p2, p3, p4, p1]])
				});
				feature.source = source;
				feature.pointcloud = pointcloud;
				this.getSourcesLayer().getSource().addFeature(feature);

				feature = new ol.Feature({
					geometry: new ol.geom.Point(mapCenter),
					name: name
				});
				feature.setStyle(this.createLabelStyle(name));
				this.sourcesLabelLayer.getSource().addFeature(feature);
			}
		});
	}

	toggle () {
		if (this.elMap.is(':visible')) {
			this.elMap.css('display', 'none');
			this.enabled = false;
		} else {
			this.elMap.css('display', 'block');
			this.enabled = true;
		}
	}

	update (delta) {
		if (!this.sceneProjection) {
			return;
		}

		let pm = $('#potree_map');

		if (!this.enabled) {
			return;
		}

		// resize
		let mapSize = this.map.getSize();
		let resized = (pm.width() !== mapSize[0] || pm.height() !== mapSize[1]);
		if (resized) {
			this.map.updateSize();
		}
		
		// 
		let camera = this.viewer.scene.getActiveCamera();

		let scale = this.map.getView().getResolution();
		let campos = camera.position;
		let camdir = camera.getWorldDirection(new THREE.Vector3());
		let sceneLookAt = camdir.clone().multiplyScalar(30 * scale).add(campos);
		let geoPos = camera.position;
		let geoLookAt = sceneLookAt;
		let mapPos = new THREE.Vector2().fromArray(this.toMap.forward([geoPos.x, geoPos.y]));
		let mapLookAt = new THREE.Vector2().fromArray(this.toMap.forward([geoLookAt.x, geoLookAt.y]));
		let mapDir = new THREE.Vector2().subVectors(mapLookAt, mapPos).normalize();

		mapLookAt = mapPos.clone().add(mapDir.clone().multiplyScalar(30 * scale));
		let mapLength = mapPos.distanceTo(mapLookAt);
		let mapSide = new THREE.Vector2(-mapDir.y, mapDir.x);

		let p1 = mapPos.toArray();
		let p2 = mapLookAt.clone().sub(mapSide.clone().multiplyScalar(0.3 * mapLength)).toArray();
		let p3 = mapLookAt.clone().add(mapSide.clone().multiplyScalar(0.3 * mapLength)).toArray();

		this.gCamera.setCoordinates([p1, p2, p3, p1]);
	}

	get sourcesVisible () {
		return this.getSourcesLayer().getVisible();
	}

	set sourcesVisible (value) {
		this.getSourcesLayer().setVisible(value);
	}

}
