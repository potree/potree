
import * as THREE from "../../libs/three.js/build/three.module.js";
import {GeoJSONExporter} from "../exporter/GeoJSONExporter.js"
import {DXFExporter} from "../exporter/DXFExporter.js"
import {Volume, SphereVolume} from "../utils/Volume.js"
import {PolygonClipVolume} from "../utils/PolygonClipVolume.js"
import {PropertiesPanel} from "./PropertyPanels/PropertiesPanel.js"
import {PointCloudTree} from "../PointCloudTree.js"
import {Profile} from "../utils/Profile.js"
import {Measure} from "../utils/Measure.js"
import {Annotation} from "../Annotation.js"
import {CameraMode, ClipTask, ClipMethod} from "../defines.js"
import {ScreenBoxSelectTool} from "../utils/ScreenBoxSelectTool.js"
import {Utils} from "../utils.js"
import {CameraAnimation} from "../modules/CameraAnimation/CameraAnimation.js"
import {HierarchicalSlider} from "./HierarchicalSlider.js"
import {OrientedImage} from "../modules/OrientedImages/OrientedImages.js";
import {Images360} from "../modules/Images360/Images360.js";

import JSON5 from "../../libs/json5-2.1.3/json5.mjs";

import * as THREE from "../libs/three.js/build/three.module.js";
	
	// 1: define html of toolbar first 
	// 2: then populate with content and actions 
	//
	// Following files can be used as references on how to add certain functionality to the toolbar:
	// - sidebar.html
	// - sidebar.js
	// - PropertiesPanel.html and its dependencies (DistancePanel, ProfilePanel, ...)
	// 

	// HTML
	const elToolbar = $("#potree_toolbar");
	elToolbar.html(`
		<span>
			<div>
				SWEREF99 13 30 - RH2000
			</div>
		</span>
		<span>
			<div class="potree_toolbar_label">
				View
			</div>
			<div>
				<img name="action_elevation" src="${Potree.resourcePath}/ikoner/sw_profile.svg" class="annotation-action-icon" style="width: 2em; height: auto;"/>
				<img name="action_rgb" src="${Potree.resourcePath}/icons/rgb.svg" class="annotation-action-icon" style="width: 2em; height: auto;"/>
			</div>
		</span>

		

		<span class="potree_toolbar_separator" />

		<span>
			<div class="potree_toolbar_label">
				Tools
			</div>
			<div>
				<img name="action_measure_point" src="${Potree.resourcePath}/ikoner/sw_point.svg" class="annotation-action-icon" style="width: 2em; height: auto;"/>
				<img name="action_measure_distance" src="${Potree.resourcePath}/ikoner/sw_distance.svg" class="annotation-action-icon" style="width: 2em; height: auto;"/>
				<img name="action_measure_height" src="${Potree.resourcePath}/ikoner/sw_height.svg" class="annotation-action-icon" style="width: 2em; height: auto;"/>
				<img name="action_measure_profile" src="${Potree.resourcePath}/ikoner/sw_profile.svg" class="annotation-action-icon" style="width: 2em; height: auto;"/>
				<img name="action_measure_reset" src="${Potree.resourcePath}/ikoner/sw_reset_tools.svg" class="annotation-action-icon" style="width: 2em; height: auto;"/>
			</div>
		</span>

		<span class="potree_toolbar_separator" />

		<span>
			<div class="potree_toolbar_label">
				Clipping
			</div>
			<div>
				<ul id="clipping_tools"></ul>
				
			</div>
		</span>

		<span class="potree_toolbar_separator" />

		<!--<span>
			<div class="potree_toolbar_label" style="width: 12em">
				Material
			</div>
			<div>
				<select id="optMaterial" name="optMaterial"></select>
			</div>
		</span>

		<span class="potree_toolbar_separator" />-->
		
		<span>
			<div class="potree_toolbar_label">
				Navigation
			</div>
			<div id="navigation">
				 
			</div>
		</span>
		<span class= "potree_toolbar_separator" />
		
		<span>
			<div class="potree_toolbar_label" style="width: 12em">
				Oriented Images
			</div>
			<div>
				<label><input type="checkbox" id="checkoi" onchange="viewer.scene.updateOI()">Show/Hide</label>
			</div>
		</span>
	`);

	// CONTENT & ACTIONS

	{ // ATTRIBUTE
		elToolbar.find("img[name=action_elevation]").click( () => {
			viewer.scene.pointclouds.forEach( pc => pc.material.activeAttributeName = "elevation" );
		});

		elToolbar.find("img[name=action_rgb]").click( () => {
			viewer.scene.pointclouds.forEach( pc => pc.material.activeAttributeName = "rgba" );
		});
	}

	{ // GRADIENT
		const schemes = Object.keys(Potree.Gradients).map(name => ({name: name, values: Potree.Gradients[name]}));
		const elGradientSchemes = elToolbar.find("span[name=gradient_schemes]");

		for(const scheme of schemes){
			const elButton = $(`
				<span style=""></span>
			`);

			const svg = Potree.Utils.createSvgGradient(scheme.values);
			svg.setAttributeNS(null, "class", `button-icon`);
			svg.style.height = "2em";
			svg.style.width = "1.3em";

			elButton.append($(svg));

			elButton.click( () => {
				for(const pointcloud of viewer.scene.pointclouds){
					pointcloud.material.activeAttributeName = "elevation";
					pointcloud.material.gradient = Potree.Gradients[scheme.name];
				}
			});

			elGradientSchemes.append(elButton);
		}
	}

	{ // MEASURE
		//Koordinater
		elToolbar.find("img[name=action_measure_point]").click( () => {
			const measurement = viewer.measuringTool.startInsertion({
				showDistances: false,
				showAngles: false,
				showCoordinates: true,
				showArea: false,
				closed: true,
				maxMarkers: 1,
				name: 'Point'
			});
		});
		//Mäta avstånd
		elToolbar.find("img[name=action_measure_distance]").click( () => {
			const measurement = viewer.measuringTool.startInsertion({
				showDistances: true,
				showArea: false,
				closed: false,
				name: 'Distance'
			});
		});
		//Mäta höjd

		elToolbar.find("img[name=action_measure_height]").click( () => {
			const measurement = viewer.measuringTool.startInsertion({
				showDistances: false,
					showHeight: true,
					showArea: false,
					closed: false,
					maxMarkers: 2,
					name: 'Height'
				});
			});
			elToolbar.find("img[name=action_measure_profile]").click( () => {
			const measurement = viewer.measuringTool.startInsertion({
				
					name: 'Profile'
				});
			});
		//Remove measurements
		elToolbar.find("img[name=action_measure_reset]").click( () => {
			
				this.viewer.scene.removeAllMeasurements();
			
			
		});
	}

	/* { // MATERIAL
		let options = [
			"rgba", 
			"elevation",
			"level of detail",
			"indices",
			// "intensity",
			// "classification",
			// "source id",
		];

		let attributeSelection = elToolbar.find('#optMaterial');
		for(let option of options){
			let elOption = $(`<option>${option}</option>`);
			attributeSelection.append(elOption);
		}

		const updateMaterialSelection = (event, ui) => {
			let selectedValue = attributeSelection.selectmenu().val();

			for(const pointcloud of viewer.scene.pointclouds){
				pointcloud.material.activeAttributeName = selectedValue;
			}
		};

		attributeSelection.selectmenu({change: updateMaterialSelection});
	}
 */

    
}