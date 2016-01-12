
// http://epsg.io/
proj4.defs("UTM10N", "+proj=utm +zone=10 +ellps=GRS80 +datum=NAD83 +units=m +no_defs");

Potree.Viewer.MapView = function(viewer){
	var scope = this;
	
	this.viewer = viewer;
	
	this.webMapService = "WMTS";
	this.mapProjectionName = "EPSG:3857";
	this.mapProjection = proj4.defs(scope.mapProjectionName);
	this.sceneProjection = null;
	
	this.init = function(){
		//scope.setSceneProjection("+proj=utm +zone=10 +ellps=GRS80 +datum=NAD83 +units=m +no_defs");
		
		$( "#potree_map" ).draggable({ handle: $('#potree_map_header') });
		$( "#potree_map" ).resizable();
		//$( "#potree_map" ).css("display", "block");
		$( "#potree_map_toggle" ).css("display", "block");
	
		scope.gExtent = new ol.geom.LineString([[0,0], [0,0]]);
		
		// EXTENT LAYER
		var feature = new ol.Feature(scope.gExtent);
		var featureVector = new ol.source.Vector({
			features: [feature]
		});
		var visibleBoundsLayer = new ol.layer.Vector({
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
		
		// CAMERA LAYER
		scope.gCamera = new ol.geom.LineString([[0,0], [0,0], [0,0], [0,0]]);
		var feature = new ol.Feature(scope.gCamera);
		var featureVector = new ol.source.Vector({
			features: [feature]
		});
		var cameraLayer = new ol.layer.Vector({
			source: featureVector,
			style: new ol.style.Style({
				stroke: new ol.style.Stroke({
					  color: '#0000ff',
					  width: 2
				})
			})
		});
		
		// TOOL DRAWINGS LAYER
		scope.toolLayer = new ol.layer.Vector({
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
		
		// SOURCES EXTENT LAYER
		scope.sourcesLayer = new ol.layer.Vector({
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
		
		// SOURCES LABEL LAYER
		scope.sourcesLabelLayer = new ol.layer.Vector({
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
		
		var mousePositionControl = new ol.control.MousePosition({
			coordinateFormat: ol.coordinate.createStringXY(4),
			projection: scope.sceneProjection,
			undefinedHTML: '&nbsp;'
		});
		
		var DownloadSelectionControl = function(opt_options) {
			var options = opt_options || {};
			
			// TOGGLE TILES
			var btToggleTiles = document.createElement('button');
			btToggleTiles.innerHTML = 'T';
			btToggleTiles.addEventListener('click', function(){
				var visible = scope.sourcesLayer.getVisible();
				scope.sourcesLayer.setVisible(!visible);
				scope.sourcesLabelLayer.setVisible(!visible);
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
			var handleDownload = function(e) {
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
		
		
		//scope.controls = {};
		//scope.controls.zoomToExtent = new ol.control.ZoomToExtent({
		//	extent: undefined,
		//	closest: true
		//})
		
		scope.map = new ol.Map({
			controls: ol.control.defaults({
				attributionOptions: ({
				collapsible: false
				})
			}).extend([
				//scope.controls.zoomToExtent,
				new DownloadSelectionControl(),
				mousePositionControl
			]),
			layers: [
				new ol.layer.Tile({source: new ol.source.OSM()}),
				scope.toolLayer,
				scope.sourcesLayer,
				scope.sourcesLabelLayer,
				visibleBoundsLayer,
				cameraLayer
			],
			target: 'potree_map_content',
			view: new ol.View({
				center: scope.olCenter,
				zoom: 9
			})
		});

		// DRAGBOX / SELECTION
		scope.dragBoxLayer = new ol.layer.Vector({
			source: new ol.source.Vector({}),
			style: new ol.style.Style({
				stroke: new ol.style.Stroke({
					  color: 'rgba(0, 0, 255, 1)',
					  width: 2
				})
			})
		});
		scope.map.addLayer(scope.dragBoxLayer);
		
		var select = new ol.interaction.Select();
		scope.map.addInteraction(select);
		
		var selectedFeatures = select.getFeatures();
        
		var dragBox = new ol.interaction.DragBox({
		  condition: ol.events.condition.platformModifierKeyOnly
		});
        
		scope.map.addInteraction(dragBox);
        
		
		dragBox.on('boxend', function(e) {
		  // features that intersect the box are added to the collection of
		  // selected features, and their names are displayed in the "info"
		  // div
		  var extent = dragBox.getGeometry().getExtent();
		  scope.sourcesLayer.getSource().forEachFeatureIntersectingExtent(extent, function(feature) {
			selectedFeatures.push(feature);
		  });
		});
		
		// clear selection when drawing a new box and when clicking on the map
		dragBox.on('boxstart', function(e) {
		  selectedFeatures.clear();
		});
		scope.map.on('click', function() {
		  selectedFeatures.clear();
		});
		
		
		
		
		// adding pointclouds to map
		scope.viewer.addEventListener("pointcloud_loaded", function(event){
			scope.load(event.pointcloud);
		});
		for(var i = 0; i < scope.viewer.pointclouds.length; i++){
			scope.load(scope.viewer.pointclouds[i]);
		}
		
		scope.viewer.profileTool.addEventListener("profile_added", scope.updateToolDrawings);
		scope.viewer.profileTool.addEventListener("profile_removed", scope.updateToolDrawings);
		scope.viewer.profileTool.addEventListener("marker_moved", scope.updateToolDrawings);
		scope.viewer.profileTool.addEventListener("marker_removed", scope.updateToolDrawings);
		scope.viewer.profileTool.addEventListener("marker_added", scope.updateToolDrawings);
		
		scope.viewer.measuringTool.addEventListener("measurement_added", scope.updateToolDrawings);
		scope.viewer.measuringTool.addEventListener("marker_added", scope.updateToolDrawings);
		scope.viewer.measuringTool.addEventListener("marker_removed", scope.updateToolDrawings);
		scope.viewer.measuringTool.addEventListener("marker_moved", scope.updateToolDrawings);

	};
	
	this.setSceneProjection = function(sceneProjection){
		scope.sceneProjection = sceneProjection;
		this.toMap = proj4(scope.sceneProjection, scope.mapProjection);
		this.toScene = proj4(scope.mapProjection, scope.sceneProjection);
	};
	
	this.getMapExtent = function(){
		var bb = scope.viewer.getBoundingBoxGeo();
		
		var bottomLeft = scope.toMap.forward([bb.min.x, bb.min.y]);
		var bottomRight = scope.toMap.forward([bb.max.x, bb.min.y]);
		var topRight = scope.toMap.forward([bb.max.x, bb.max.y]);
		var topLeft = scope.toMap.forward([bb.min.x, bb.max.y]);
		
		var extent = {
			bottomLeft: bottomLeft,
			bottomRight: bottomRight,
			topRight: topRight,
			topLeft: topLeft
		};
		
		return extent;
	};
	
	this.getMapCenter = function(){
		var mapExtent = scope.getMapExtent();
		
		var mapCenter = [
			(mapExtent.bottomLeft[0] + mapExtent.topRight[0]) / 2, 
			(mapExtent.bottomLeft[1] + mapExtent.topRight[1]) / 2
		];
		
		return mapCenter;
	};	
	
	this.updateToolDrawings = function(){
		scope.toolLayer.getSource().clear();
		
		var profiles = scope.viewer.profileTool.profiles;
		for(var i = 0; i < profiles.length; i++){
			var profile = profiles[i];
			var coordinates = [];
			
			for(var j = 0; j < profile.points.length; j++){
				var point = profile.points[j];
				var pointGeo = scope.viewer.toGeo(point);
				var pointMap = scope.toMap.forward([pointGeo.x, pointGeo.y]);
				coordinates.push(pointMap);
			}
			
			var line = new ol.geom.LineString(coordinates);
			var feature = new ol.Feature(line);
			scope.toolLayer.getSource().addFeature(feature);
		}
		
		var measurements = scope.viewer.measuringTool.measurements;
		for(var i = 0; i < measurements.length; i++){
			var measurement = measurements[i];
			var coordinates = [];
			
			for(var j = 0; j < measurement.points.length; j++){
				var point = measurement.points[j].position;
				var pointGeo = scope.viewer.toGeo(point);
				var pointMap = scope.toMap.forward([pointGeo.x, pointGeo.y]);
				coordinates.push(pointMap);
			}
			
			if(measurement.closed && measurement.points.length > 0){
				coordinates.push(coordinates[0]);
			}
			
			var line = new ol.geom.LineString(coordinates);
			var feature = new ol.Feature(line);
			scope.toolLayer.getSource().addFeature(feature);
		}
		
	};
	
	
	this.load = function(pointcloud){
		
		if(!(pointcloud instanceof Potree.PointCloudOctree)){
			return;
		}
		
		if(!scope.sceneProjection){
			scope.setSceneProjection(pointcloud.projection);
		}
		
		var mapExtent = scope.getMapExtent();
		var mapCenter = scope.getMapCenter();
		
		//viewer.mapView.controls.zoomToExtent.extent_ = [ mapExtent.bottomLeft, mapExtent.topRight ];
		//viewer.mapView.controls.zoomToExtent.set("extent", [ mapExtent.bottomLeft, mapExtent.topRight ]);
		
		var view = scope.map.getView();
		view.setCenter(mapCenter);
		
		scope.gExtent.setCoordinates([
			mapExtent.bottomLeft, 
			mapExtent.bottomRight, 
			mapExtent.topRight, 
			mapExtent.topLeft,
			mapExtent.bottomLeft
		]);
		
		//view.fit(scope.gExtent, scope.map.getSize());
		view.fit(scope.gExtent, [300, 300], {
			constrainResolution: false
		});

		var createLabelStyle = function(text){
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
		$.getJSON(url, function(data){
			var sources = data.sources;
			
			for(var i = 0; i < sources.length; i++){
				var source = sources[i];
				var name = source.name;
				var points = source.points;
				var bounds = source.bounds;

				var mapBounds = {
					min: scope.toMap.forward( [bounds.min[0], bounds.min[1]] ),
					max: scope.toMap.forward( [bounds.max[0], bounds.max[1]] )
				}
				var mapCenter = [
					(mapBounds.min[0] + mapBounds.max[0]) / 2,
					(mapBounds.min[1] + mapBounds.max[1]) / 2,
				];
				
				var p1 = scope.toMap.forward( [bounds.min[0], bounds.min[1]] );
				var p2 = scope.toMap.forward( [bounds.max[0], bounds.min[1]] );
				var p3 = scope.toMap.forward( [bounds.max[0], bounds.max[1]] );
				var p4 = scope.toMap.forward( [bounds.min[0], bounds.max[1]] );
				
				var boxes = [];
				//var feature = new ol.Feature({
				//	'geometry': new ol.geom.LineString([p1, p2, p3, p4, p1])
				//});
				var feature = new ol.Feature({
					'geometry': new ol.geom.Polygon([[p1, p2, p3, p4, p1]])
				});
				feature.source = source;
				feature.pointcloud = pointcloud;
				scope.sourcesLayer.getSource().addFeature(feature);
				
                
				feature = new ol.Feature({
					 geometry: new ol.geom.Point(mapCenter),
					 name: name 
				});
				feature.setStyle(createLabelStyle(name));
				scope.sourcesLabelLayer.getSource().addFeature(feature);
			}
		});
	}
	
	this.update = function(delta){
		var pm = $( "#potree_map" );
		
		if(!pm.is(":visible")){
			return;
		}
		
		// resize
		var mapSize = scope.map.getSize();
		var resized = (pm.width() != mapSize[0] || pm.height() != mapSize[1]);
		if(resized){
			scope.map.updateSize();
		}
		
		// camera
		var scale = scope.map.getView().getResolution();
		var camera = scope.viewer.camera;
		var campos = camera.position;
		var camdir = camera.getWorldDirection();
		var sceneLookAt = camdir.clone().multiplyScalar(30 * scale).add(campos);
		var geoPos = scope.viewer.toGeo(camera.position);
		var geoLookAt = scope.viewer.toGeo(sceneLookAt);
		var mapPos = new THREE.Vector2().fromArray(scope.toMap.forward([geoPos.x, geoPos.y]));
		var mapLookAt = new THREE.Vector2().fromArray(scope.toMap.forward([geoLookAt.x, geoLookAt.y]));
		var mapDir = new THREE.Vector2().subVectors(mapLookAt, mapPos).normalize();
		mapLookAt = mapPos.clone().add(mapDir.clone().multiplyScalar(30 * scale));
		var mapLength = mapPos.distanceTo(mapLookAt);
		var mapSide = new THREE.Vector2(-mapDir.y, mapDir.x);
		
		var p1 = mapPos.toArray();
		var p2 = mapLookAt.clone().sub(mapSide.clone().multiplyScalar(0.3 * mapLength)).toArray();
		var p3 = mapLookAt.clone().add(mapSide.clone().multiplyScalar(0.3 * mapLength)).toArray();

		
		scope.gCamera.setCoordinates([p1, p2, p3, p1]);
		//
		//viewer.mapView.map.getPixelFromCoordinate(p1);
		
		
	};
	
};



