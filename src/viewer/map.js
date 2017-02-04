
// http://epsg.io/
proj4.defs("UTM10N", "+proj=utm +zone=10 +ellps=GRS80 +datum=NAD83 +units=m +no_defs");

Potree.MapView = class{
		
	constructor(viewer){
		this.viewer = viewer;
		
		this.webMapService = "WMTS";
		this.mapProjectionName = "EPSG:3857";
		this.mapProjection = proj4.defs(this.mapProjectionName);
		this.sceneProjection = null;
		
		this.extentsLayer = null;
		this.cameraLayer = null;
		this.toolLayer = null;
		this.sourcesLayer = null;
		this.sourcesLabelLayer = null;
	}
	
	init(){
		$( "#potree_map" ).draggable({ handle: $('#potree_map_header') });
		$( "#potree_map" ).resizable();
		//$( "#potree_map_toggle" ).css("display", "block");
	
		let extentsLayer = this.getExtentsLayer();
		let cameraLayer = this.getCameraLayer();
		let toolLayer = this.getToolLayer();
		let sourcesLayer = this.getSourcesLayer();
		let sourcesLabelLayer = this.getSourcesLabelLayer();
		
		var mousePositionControl = new ol.control.MousePosition({
			coordinateFormat: ol.coordinate.createStringXY(5),
			projection: "EPSG:4326",
			undefinedHTML: '&nbsp;'
		});
		
		let DownloadSelectionControl = function(opt_options){
			var options = opt_options || {};
			
			// TOGGLE TILES
			var btToggleTiles = document.createElement('button');
			btToggleTiles.innerHTML = 'T';
			btToggleTiles.addEventListener('click', () => {
				var visible = this.sourcesLayer.getVisible();
				this.sourcesLayer.setVisible(!visible);
				this.sourcesLabelLayer.setVisible(!visible);
			}, false);
			btToggleTiles.style.float = "left";
			btToggleTiles.title = "show / hide tiles";
			
			// DOWNLOAD SELECTED TILES
			var link = document.createElement("a");
			link.href = "#";
			link.download = "list.txt";
			link.style.float = "left";
			
			var button = document.createElement('button');
			button.innerHTML = 'D';
			link.appendChild(button);
			
			var this_ = this;
			var handleDownload = (e) => {
				var features = selectedFeatures.getArray();
				
				var url =  [location.protocol, '//', location.host, location.pathname].join('');
				
				if(features.length === 0){
					alert("No tiles were selected. Select area with ctrl + left mouse button!");
					e.preventDefault();
					e.stopImmediatePropagation();
					return false;
				}else if(features.length === 1){
					var feature = features[0];
					
					if(feature.source){
						var cloudjsurl = feature.pointcloud.pcoGeometry.url;
						var sourceurl = new URL(url + '/../' + cloudjsurl + '/../source/' + feature.source.name);
						link.href = sourceurl.href;
						link.download = feature.source.name;
					}
				}else{
					var content = "";
					for(var i = 0; i < features.length; i++){
						var feature = features[i];
						
						if(feature.source){
							var cloudjsurl = feature.pointcloud.pcoGeometry.url;
							var sourceurl = new URL(url + '/../' + cloudjsurl + '/../source/' + feature.source.name);
							content += sourceurl.href + "\n";
						}
					}
					
					var uri = "data:application/octet-stream;base64,"+btoa(content);
					link.href = uri;
					link.download = "list_of_files.txt";
				}
			};
			
			button.addEventListener('click', handleDownload, false);
			
			// assemble container
			var element = document.createElement('div');
			element.className = 'ol-unselectable ol-control';
			element.appendChild(link);
			element.appendChild(btToggleTiles);
			element.style.bottom = "0.5em";
			element.style.left = "0.5em";
			element.title = "Download file or list of selected tiles. Select tile with left mouse button or area using ctrl + left mouse.";
			
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
				//this.controls.zoomToExtent,
				new DownloadSelectionControl(),
				mousePositionControl
			]),
			layers: [
				new ol.layer.Tile({source: new ol.source.OSM()}),
				this.toolLayer,
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
		
		var select = new ol.interaction.Select();
		this.map.addInteraction(select);
		
		var selectedFeatures = select.getFeatures();
        
		var dragBox = new ol.interaction.DragBox({
		  condition: ol.events.condition.platformModifierKeyOnly
		});
        
		this.map.addInteraction(dragBox);
        
		
		dragBox.on('boxend', (e) => {
			// features that intersect the box are added to the collection of
			// selected features, and their names are displayed in the "info"
			// div
			var extent = dragBox.getGeometry().getExtent();
			this.sourcesLayer.getSource().forEachFeatureIntersectingExtent(extent, (feature) => {
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
		
		//// adding pointclouds to map
		//this.viewer.dispatcher.addEventListener("pointcloud_added", (event) => {
		//	this.load(event.pointcloud);
		//});
		//for(var i = 0; i < this.viewer.scene.pointclouds.length; i++){
		//	this.load(this.viewer.scene.pointclouds[i]);
		//}
		
		//this.viewer.profileTool.addEventListener("profile_added", this.updateToolDrawings);
		//this.viewer.profileTool.addEventListener("profile_removed", this.updateToolDrawings);
		//this.viewer.profileTool.addEventListener("marker_moved", this.updateToolDrawings);
		//this.viewer.profileTool.addEventListener("marker_removed", this.updateToolDrawings);
		//this.viewer.profileTool.addEventListener("marker_added", this.updateToolDrawings);
		//
		//this.viewer.measuringTool.addEventListener("measurement_added", this.updateToolDrawings);
		//this.viewer.measuringTool.addEventListener("marker_added", this.updateToolDrawings);
		//this.viewer.measuringTool.addEventListener("marker_removed", this.updateToolDrawings);
		//this.viewer.measuringTool.addEventListener("marker_moved", this.updateToolDrawings);

		this.viewer.addEventListener("scene_changed", e => {
			this.setScene(e.scene);
		});
		
		this.onPointcloudAdded = e => {
			this.load(e.pointcloud);
		};
		
		this.setScene(this.viewer.scene);
	}
	
	setScene(scene){
		if(this.scene === scene){
			return;
		};
		
		if(this.scene){
			this.scene.removeEventListener("pointcloud_added", this.onPointcloudAdded);
		}
		
		this.scene = scene;
		
		this.scene.addEventListener("pointcloud_added", this.onPointcloudAdded);
		
		for(var i = 0; i < this.viewer.scene.pointclouds.length; i++){
			this.load(this.viewer.scene.pointclouds[i]);
		}
	}
	
	getExtentsLayer(){
		if(this.extentsLayer){
			return this.extentsLayer;
		}
		
		this.gExtent = new ol.geom.LineString([[0,0], [0,0]]);
		
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
	
	getCameraLayer(){
		if(this.cameraLayer){
			return this.cameraLayer;
		}
		
		// CAMERA LAYER
		this.gCamera = new ol.geom.LineString([[0,0], [0,0], [0,0], [0,0]]);
		var feature = new ol.Feature(this.gCamera);
		var featureVector = new ol.source.Vector({
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
	
	getToolLayer(){
		if(this.toolLayer){
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
	
	getSourcesLayer(){
		if(this.sourcesLayer){
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
	
	getSourcesLabelLayer(){
		if(this.sourcesLabelLayer){
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
	
	setSceneProjection(sceneProjection){
		this.sceneProjection = sceneProjection;
		this.toMap = proj4(this.sceneProjection, this.mapProjection);
		this.toScene = proj4(this.mapProjection, this.sceneProjection);
	};
	
	getMapExtent(){
		var bb = this.viewer.getBoundingBox();
		
		var bottomLeft = this.toMap.forward([bb.min.x, bb.min.y]);
		var bottomRight = this.toMap.forward([bb.max.x, bb.min.y]);
		var topRight = this.toMap.forward([bb.max.x, bb.max.y]);
		var topLeft = this.toMap.forward([bb.min.x, bb.max.y]);
		
		var extent = {
			bottomLeft: bottomLeft,
			bottomRight: bottomRight,
			topRight: topRight,
			topLeft: topLeft
		};
		
		return extent;
	};
	
	getMapCenter(){
		var mapExtent = this.getMapExtent();
		
		var mapCenter = [
			(mapExtent.bottomLeft[0] + mapExtent.topRight[0]) / 2, 
			(mapExtent.bottomLeft[1] + mapExtent.topRight[1]) / 2
		];
		
		return mapCenter;
	};	
	
	updateToolDrawings(){
		this.toolLayer.getSource().clear();
		
		var profiles = this.viewer.profileTool.profiles;
		for(var i = 0; i < profiles.length; i++){
			var profile = profiles[i];
			var coordinates = [];
			
			for(var j = 0; j < profile.points.length; j++){
				var point = profile.points[j];
				var pointMap = this.toMap.forward([point.x, point.y]);
				coordinates.push(pointMap);
			}
			
			var line = new ol.geom.LineString(coordinates);
			var feature = new ol.Feature(line);
			this.toolLayer.getSource().addFeature(feature);
		}
		
		var measurements = this.viewer.measuringTool.measurements;
		for(var i = 0; i < measurements.length; i++){
			var measurement = measurements[i];
			var coordinates = [];
			
			for(var j = 0; j < measurement.points.length; j++){
				var point = measurement.points[j].position;
				var pointMap = this.toMap.forward([point.x, point.y]);
				coordinates.push(pointMap);
			}
			
			if(measurement.closed && measurement.points.length > 0){
				coordinates.push(coordinates[0]);
			}
			
			var line = new ol.geom.LineString(coordinates);
			var feature = new ol.Feature(line);
			this.toolLayer.getSource().addFeature(feature);
		}
	}
	
	
	load(pointcloud){
		
		if(!(pointcloud instanceof Potree.PointCloudOctree)){
			return;
		}
		
		if(!pointcloud.projection){
			return;
		}
		
		if(!this.sceneProjection){
			this.setSceneProjection(pointcloud.projection);
		}
		
		var mapExtent = this.getMapExtent();
		var mapCenter = this.getMapCenter();
		
		
		var view = this.map.getView();
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

		let createLabelStyle = (text) => {
			var style = new ol.style.Style({
				image: new ol.style.Circle({
					fill: new ol.style.Fill({
						color: 'rgba(100,50,200,0.5)'
					}),
					stroke: new ol.style.Stroke({
						color: 'rgba(120,30,100,0.8)',
						width: 3
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
		}

		var url = pointcloud.pcoGeometry.url + "/../sources.json";
		$.getJSON(url, (data) => {
			var sources = data.sources;
			
			for(var i = 0; i < sources.length; i++){
				var source = sources[i];
				var name = source.name;
				var points = source.points;
				var bounds = source.bounds;

				var mapBounds = {
					min: this.toMap.forward( [bounds.min[0], bounds.min[1]] ),
					max: this.toMap.forward( [bounds.max[0], bounds.max[1]] )
				}
				var mapCenter = [
					(mapBounds.min[0] + mapBounds.max[0]) / 2,
					(mapBounds.min[1] + mapBounds.max[1]) / 2,
				];
				
				var p1 = this.toMap.forward( [bounds.min[0], bounds.min[1]] );
				var p2 = this.toMap.forward( [bounds.max[0], bounds.min[1]] );
				var p3 = this.toMap.forward( [bounds.max[0], bounds.max[1]] );
				var p4 = this.toMap.forward( [bounds.min[0], bounds.max[1]] );
				
				var boxes = [];
				//var feature = new ol.Feature({
				//	'geometry': new ol.geom.LineString([p1, p2, p3, p4, p1])
				//});
				var feature = new ol.Feature({
					'geometry': new ol.geom.Polygon([[p1, p2, p3, p4, p1]])
				});
				feature.source = source;
				feature.pointcloud = pointcloud;
				this.sourcesLayer.getSource().addFeature(feature);
				
                
				feature = new ol.Feature({
					 geometry: new ol.geom.Point(mapCenter),
					 name: name 
				});
				feature.setStyle(createLabelStyle(name));
				this.sourcesLabelLayer.getSource().addFeature(feature);
			}
		});
	}
	
	update(delta){
		if(!this.sceneProjection){
			return;
		}
		
		var pm = $( "#potree_map" );
		
		if(!pm.is(":visible")){
			return;
		}
		
		// resize
		var mapSize = this.map.getSize();
		var resized = (pm.width() != mapSize[0] || pm.height() != mapSize[1]);
		if(resized){
			this.map.updateSize();
		}
		
		// camera
		var scale = this.map.getView().getResolution();
		var camera = this.viewer.scene.camera;
		var campos = camera.position;
		var camdir = camera.getWorldDirection();
		var sceneLookAt = camdir.clone().multiplyScalar(30 * scale).add(campos);
		var geoPos = camera.position;
		var geoLookAt = sceneLookAt;
		var mapPos = new THREE.Vector2().fromArray(this.toMap.forward([geoPos.x, geoPos.y]));
		var mapLookAt = new THREE.Vector2().fromArray(this.toMap.forward([geoLookAt.x, geoLookAt.y]));
		var mapDir = new THREE.Vector2().subVectors(mapLookAt, mapPos).normalize();
		mapLookAt = mapPos.clone().add(mapDir.clone().multiplyScalar(30 * scale));
		var mapLength = mapPos.distanceTo(mapLookAt);
		var mapSide = new THREE.Vector2(-mapDir.y, mapDir.x);
		
		var p1 = mapPos.toArray();
		var p2 = mapLookAt.clone().sub(mapSide.clone().multiplyScalar(0.3 * mapLength)).toArray();
		var p3 = mapLookAt.clone().add(mapSide.clone().multiplyScalar(0.3 * mapLength)).toArray();

		
		this.gCamera.setCoordinates([p1, p2, p3, p1]);
	}
	
};



