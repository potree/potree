import { PointAttributeNames } from "../src/loader/PointAttributes.js";


export function updateSidebar() {

  // NOTE Call this function only after the sidebar has been initialized

  const tree = $("#jstree_scene");
  const vehicleTree = tree.jstree('create_node', "#", { "text": "<b>Vehicle</b>", "id": "vehicleViz"}, "first", false, false);
  const truthVizTree = tree.jstree('create_node', "#", { "text": "<b>Truth Visualizations</b>", "id": "truthViz"}, "last", false, false);
  const sensorTree = tree.jstree('create_node', "#", { "text": "<b>Sensor Readings</b>", "id": "sensorViz"}, "last", false, false);
  const assessmentsTree = tree.jstree('create_node', "#", { "text": "<b>Assessment Visualizations</b>", "id": "assessmentsViz"}, "last", false, false);
  const HdMapProvidersTree = tree.jstree('create_node', "#", { "text": "<b>HD Map Providers</b>", "id": "HdMapProvidersViz"}, "last", false, false);
  tree.jstree("check_node", vehicleTree);
  tree.jstree("check_node", truthVizTree);
  tree.jstree("check_node", sensorTree);
  tree.jstree("check_node", assessmentsTree);
  tree.jstree("check_node", HdMapProvidersTree);


  let createNode = (parent, text, icon, object) => {
    let nodeID = tree.jstree('create_node', parent, {
        "text": text,
        "icon": icon,
        "data": object
      },
      "last", false, false);

    if(object.visible){
      tree.jstree('check_node', nodeID);
    }else{
      tree.jstree('uncheck_node', nodeID);
    }

    return nodeID;
  }


  let onVehicleLayerAdded = (e) => {
    let vehicleLayer = e.vehicleLayer;
    let vehicleIcon = `${Potree.resourcePath}/icons/cloud.svg`; // TODO Fix this
    let node = createNode(vehicleTree, vehicleLayer.name, vehicleIcon, vehicleLayer);

    vehicleLayer.addEventListener("visibility_changed", () => {
      if(vehicleLayer.visible){
        tree.jstree('check_node', node);
      }else{
        tree.jstree('uncheck_node', node);
      }
    });
  };

  let onTruthLayerAdded = (e) => {
		let truthLayer = e.truthLayer;
		let truthIcon = `${Potree.resourcePath}/icons/cloud.svg`; // TODO Fix this
		let node = createNode(truthVizTree, truthLayer.name, truthIcon, truthLayer);

		truthLayer.addEventListener("visibility_changed", () => {
			if(truthLayer.visible){
				tree.jstree('check_node', node);
			}else{
				tree.jstree('uncheck_node', node);
			}
		});
	};

  let onSensorLayerAdded = (e) => {
    let sensorLayer = e.sensorLayer;
    let sensorIcon = `${Potree.resourcePath}/icons/cloud.svg`; // TODO Fix this
    let node = createNode(sensorTree, sensorLayer.name, sensorIcon, sensorLayer);

    sensorLayer.addEventListener("visibility_changed", () => {
      if(sensorLayer.visible){
        tree.jstree('check_node', node);
      }else{
        tree.jstree('uncheck_node', node);
      }
    });
  };

  let onAssessmentsLayerAdded = (e) => {
    let assessmentsLayer = e.assessmentsLayer;
    let assessmentsIcon = `${Potree.resourcePath}/icons/cloud.svg`; // TODO Fix this
    let node = createNode(assessmentsTree, assessmentsLayer.name, assessmentsIcon, assessmentsLayer);

    assessmentsLayer.addEventListener("visibility_changed", () => {
      if (assessmentsLayer.visible) {
        tree.jstree('check_node', node);
      } else {
        tree.jstree('uncheck_node', node);
      }
    });
  };

  let onMapProviderLayerAdded = (e) => {
    let mapProviderLayer = e.mapLayer;
    let mapIcon = `${Potree.resourcePath}/icons/focus.svg`; // TODO Fix this
    let node = createNode(HdMapProvidersTree, mapProviderLayer.name, '', mapProviderLayer);

    mapProviderLayer.addEventListener("visibility_changed", () => {
      if (mapProviderLayer.visible) {
        tree.jstree('check_node', node);
      } else {
        tree.jstree('uncheck_node', node);
      }
    });
  };

  window.viewer.scene.addEventListener("vehicle_layer_added", onVehicleLayerAdded);
  window.viewer.scene.addEventListener("truth_layer_added", onTruthLayerAdded);
  window.viewer.scene.addEventListener("sensor_layer_added", onSensorLayerAdded);
  window.viewer.scene.addEventListener("assessments_layer_added", onAssessmentsLayerAdded);
  window.viewer.scene.addEventListener("map_provider_layer_added", onMapProviderLayerAdded);


}


export function togglePointClass(pointcloud) {
    const attributes = pointcloud.pcoGeometry.pointAttributes.attributes;
    let classificationAttributeExists = false;
    for (let k = 0; k < attributes.length; k++) {
       if (attributes[k].name == PointAttributeNames.CLASSIFICATION && !window.pointClassInitialToggle) {
         $("#chkClassification_0").trigger('click');
         console.log("Unknown Points Toggled Off");
         window.pointClassInitialToggle = true;
         break;
       }
    }
}
