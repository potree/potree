
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
		scope.setSceneProjection("+proj=utm +zone=10 +ellps=GRS80 +datum=NAD83 +units=m +no_defs");
		
		scope.sceneExtent = {
			min: [643453.67, 3889087.89, -2.72],
			max: [736910.93, 3971391.48, 1093.60]
		};
		
		scope.mapExtent = {
			min: proj4(scope.sceneProjection, scope.mapProjection, [scope.sceneExtent.min[0], scope.sceneExtent.min[1]]),
			max: proj4(scope.sceneProjection, scope.mapProjection, [scope.sceneExtent.max[0], scope.sceneExtent.max[1]])
		};
		
		
		var p1 = scope.toMap.forward([scope.sceneExtent.min[0], scope.sceneExtent.min[1]]);
		var p2 = scope.toMap.forward([scope.sceneExtent.max[0], scope.sceneExtent.min[1]]);
		var p3 = scope.toMap.forward([scope.sceneExtent.max[0], scope.sceneExtent.max[1]]);
		var p4 = scope.toMap.forward([scope.sceneExtent.min[0], scope.sceneExtent.max[1]]);
		
		scope.olExtent = [scope.mapExtent.min[0], scope.mapExtent.min[1], scope.mapExtent.max[0], scope.mapExtent.max[1]];
		scope.olCenter = [(scope.mapExtent.max[0] + scope.mapExtent.min[0]) / 2, (scope.mapExtent.max[1] + scope.mapExtent.min[1]) / 2];
		
		 // Layer used to draw the point cloud extent
		var box = new ol.geom.LineString([p1, p2, p3, p4, p1]);
		
		var feature = new ol.Feature(box);
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
		
		// Layer used to display the tools drawings in 2D
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
		
		scope.sourcesLayer = new ol.layer.Vector({
			source: new ol.source.Vector({}),
			style: new ol.style.Style({
				fill: new ol.style.Fill({
					color: 'rgba(255, 0, 0, 0.1)'
				}),
				stroke: new ol.style.Stroke({
					  color: 'rgba(255, 0, 0, 1)',
					  width: 2
				})
			})
		});
		
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
			minResolution: 2,
            maxResolution: 20
		});
		
		var mousePositionControl = new ol.control.MousePosition({
			coordinateFormat: ol.coordinate.createStringXY(4),
			projection: scope.mapProjectionName,
			undefinedHTML: '&nbsp;'
		});
		
		
		
		var DownloadSelectionControl = function(opt_options) {
			var options = opt_options || {};
			
			//var myHTMLDoc = "<html><head><title>mydoc</title></head><body>This is a test page</body></html>";
			//var uri = "data:application/octet-stream;base64,"+btoa(myHTMLDoc);
			var link = document.createElement("a");
			link.href = "#";
			link.download = "list.txt";
			
			var button = document.createElement('button');
			button.innerHTML = 'D';
			link.appendChild(button);
			
			var this_ = this;
			var handleDownload = function(e) {
				var features = selectedFeatures.getArray();
				
				if(features.length === 0){
					alert("No tiles were selected. Select area with ctrl + left mouse button!");
					e.preventDefault();
					e.stopImmediatePropagation();
					return false;
					
				}
				
				var content = "";
				for(var i = 0; i < features.length; i++){
					var feature = features[i];
					
					if(feature.source){
						content += feature.source.name + "\n";
					}
				}
				
				var uri = "data:application/octet-stream;base64,"+btoa(content);
				link.href = uri;
				
			};
			
			button.addEventListener('click', handleDownload, false);
			
			var element = document.createElement('div');
			element.className = 'ol-unselectable ol-control';
			element.appendChild(link);
			element.style.bottom = "0.5em";
			element.style.left = "0.5em";
			element.title = "Download list of selected tiles. Select area using ctrl + left mouse.";
			
			ol.control.Control.call(this, {
				element: element,
				target: options.target
			});
			
		};
		ol.inherits(DownloadSelectionControl, ol.control.Control);
		
		scope.map = new ol.Map({
			controls: ol.control.defaults({
				attributionOptions: ({
				collapsible: false
				})
			}).extend([
				new ol.control.ZoomToExtent({
					extent: scope.olExtent,
					closest: true
				}),
				new DownloadSelectionControl()
			]),
			layers: [
				new ol.layer.Tile({source: new ol.source.OSM()}),
				scope.toolLayer,
				scope.sourcesLayer,
				scope.sourcesLabelLayer,
				visibleBoundsLayer
			],
			target: 'potree_map_content',
			view: new ol.View({
				center: scope.olCenter,
				zoom: 9
			})
		});
		


		
		
		
		
		
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
		var dragBoxLine = new ol.geom.LineString([p1, p2, p3, p4, p1])
		var feature = new ol.Feature({'geometry': dragBoxLine});
		scope.sourcesLayer.getSource().addFeature(feature);
		
		
		var select = new ol.interaction.Select();
		scope.map.addInteraction(select);
		
		var selectedFeatures = select.getFeatures();
        
		// a DragBox interaction used to select features by drawing boxes
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
		
		
		
		
		
		scope.viewer.addEventListener("pointcloud_loaded", function(event){
			scope.load(event.pointcloud);
		});
		for(var i = 0; i < scope.viewer.pointclouds.length; i++){
			scope.load(scope.viewer.pointclouds[i]);
		}
		

	};
	
	this.setSceneProjection = function(sceneProjection){
		scope.sceneProjection = sceneProjection;
		this.toMap = proj4(scope.sceneProjection, scope.mapProjection);
		this.toScene = proj4(scope.mapProjection, scope.sceneProjection);
	};
	
	
	this.load = function(pointcloud){
		
		if(!(pointcloud instanceof Potree.PointCloudOctree)){
			return;
		}
		
		scope.sceneExtent = {
			min: [643453.67, 3889087.89, -2.72],
			max: [736910.93, 3971391.48, 1093.60]
		};
		
		

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
				var feature = new ol.Feature({
					'geometry': new ol.geom.LineString([p1, p2, p3, p4, p1])
				});
				feature.source = source;
				scope.sourcesLayer.getSource().addFeature(feature);
				

				feature = new ol.Feature({
					 geometry: new ol.geom.Point(mapCenter),
					 name: name 
				});
				feature.setStyle(createLabelStyle(name));
				scope.sourcesLabelLayer.getSource().addFeature(feature);
				
				

			}
		})



	}
	

	
	
	
	
	
	
	
};



