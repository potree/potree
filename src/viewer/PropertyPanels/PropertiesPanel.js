

import {Utils} from "../../utils.js";
import {PointCloudTree} from "../../PointCloudTree.js";
import {Measure} from "../../utils/Measure.js";
import {Profile} from "../../utils/Profile.js";
import {Volume, BoxVolume, SphereVolume} from "../../utils/Volume.js";
import {PointSizeType, PointShape} from "../../defines.js";
import {Gradients} from "../../materials/Gradients.js";

import {MeasurePanel} from "./MeasurePanel.js";
import {DistancePanel} from "./DistancePanel.js";
import {PointPanel} from "./PointPanel.js";
import {AreaPanel} from "./AreaPanel.js";
import {AnglePanel} from "./AnglePanel.js";
import {HeightPanel} from "./HeightPanel.js";
import {VolumePanel} from "./VolumePanel.js";
import {ProfilePanel} from "./ProfilePanel.js";
import {CameraPanel} from "./CameraPanel.js";

export class PropertiesPanel{

	constructor(container, viewer){
		this.container = container;
		this.viewer = viewer;
		this.object = null;
		this.cleanupTasks = [];
		this.scene = null;
	}

	setScene(scene){
		this.scene = scene;
	}

	set(object){
		if(this.object === object){ 
			return;
		}

		this.object = object;
		
		for(let task of this.cleanupTasks){
			task();
		}
		this.cleanupTasks = [];
		this.container.empty();

		if(object instanceof PointCloudTree){
			this.setPointCloud(object);
		}else if(object instanceof Measure || object instanceof Profile || object instanceof Volume){
			this.setMeasurement(object);
		}else if(object instanceof THREE.Camera){
			this.setCamera(object);
		}
	}
	
	refresh(){
		if(this.object === undefined || this.object === null){ 
			return;
		}
		
		for(let task of this.cleanupTasks){
			task();
		}
		this.cleanupTasks = [];
		this.container.empty();

		if(this.object instanceof PointCloudTree){
			this.setPointCloud(this.object);
		}else if(this.object instanceof Measure || this.object instanceof Profile || this.object instanceof Volume){
			console.log(this.object);
			this.setMeasurement(this.object);
			
		}else if(this.object instanceof THREE.Camera){
			this.setCamera(this.object);
		}
	}

	//
	// Used for events that should be removed when the property object changes.
	// This is for listening to materials, scene, point clouds, etc.
	// not required for DOM listeners, since they are automatically cleared by removing the DOM subtree.
	//
	addVolatileListener(target, type, callback){
		target.addEventListener(type, callback);
		this.cleanupTasks.push(() => {
			target.removeEventListener(type, callback);
		});
	}

	setPointCloud(pointcloud){

		let material = pointcloud.material;

		let panel = $(`
			<div class="scene_content selectable">
				<ul class="pv-menu-list">

				<li>
				<span data-i18n="scene.point_size"></span>:<span id="lblPointSize"></span> <div id="sldPointSize"></div>
				</li>

				<!-- SIZE TYPE -->
				<li>
					<span data-i18n="scene.point_size_type"></span>
					<select id="optPointSizing" name="optPointSizing">
                        <option value="FIXED">` + i18n.t("scene.point_fixed") + `</option>
						<option value="ATTENUATED">` + i18n.t("scene.point_attenuated") + `</option>
						<option value="ADAPTIVE">` + i18n.t("scene.point_adaptative") + `</option>
					</select>
				</li>

				<!-- SHAPE -->
				<li>
					<span data-i18n="scene.point_shape"></span>
					<select id="optShape" name="optShape">
                        <option value="SQUARE">` + i18n.t("scene.point_square") + `</option>
						<option value="CIRCLE">` + i18n.t("scene.point_circle") + `</option>
						<option value="PARABOLOID">` + i18n.t("scene.point_paraboloid") + `</option>
					</select>
				</li>

				<li id="materials_backface_container">
				<input id="set_backface_culling" type="checkbox"/><span data-i18n="scene.backface_culling"></span>
				</li>
				
				<!-- OPACITY -->
				<li><span data-i18n="scene.point_opacity"></span>:<span id="lblOpacity"></span><div id="sldOpacity"></div></li>

				<div class="divider">
					<span data-i18n="scene.attribute"></span>
				</div>

				<li>
					<select id="optMaterial" name="optMaterial">
					</select>
				</li>
				
				<div id="materials.composite_weight_container">
					<div class="divider">
						<span data-i18n="scene.attribute_weights"></span>
					</div>

					<li><span data-i18n="scene.attribute_rgb"></span>: <span id="lblWeightRGB"></span> <div id="sldWeightRGB"></div>	</li>
					<li><span data-i18n="scene.attribute_intensity"></span>: <span id="lblWeightIntensity"></span> <div id="sldWeightIntensity"></div>	</li>
					<li><span data-i18n="scene.attribute_elevation"></span>: <span id="lblWeightElevation"></span> <div id="sldWeightElevation"></div>	</li>
					<li><span data-i18n="scene.attribute_classification"></span>: <span id="lblWeightClassification"></span> <div id="sldWeightClassification"></div>	</li>
					<li><span data-i18n="scene.attribute_returnnumber"></span>: <span id="lblWeightReturnNumber"></span> <div id="sldWeightReturnNumber"></div>	</li>
					<li><span data-i18n="scene.attribute_source"></span>: <span id="lblWeightSourceID"></span> <div id="sldWeightSourceID"></div>	</li>
				</div>

				<div id="materials.rgb_container">
					<div class="divider">
						<span data-i18n="scene.attribute_rgb"></span>
					</div>

					<li><span data-i18n="scene.gamma"></span>: <span id="lblRGBGamma"></span> <div id="sldRGBGamma"></div>	</li>
					<li><span data-i18n="scene.brightness"></span>: <span id="lblRGBBrightness"></span> <div id="sldRGBBrightness"></div>	</li>
					<li><span data-i18n="scene.contrast"></span>: <span id="lblRGBContrast"></span> <div id="sldRGBContrast"></div>	</li>
				</div>
				
				<div id="materials.matcap_container">
					<div class="divider">
						<span data-i18n="scene.attribute_matcap"></span>
					</div>

					<li>
						<div id="matcap_scheme_selection" style="display: flex; flex-wrap: wrap;"> </div>
					</li>
				</div>

				<div id="materials.color_container">
					<div class="divider">
						<span data-i18n="scene.attribute_color"></span>
					</div>

					<center><input id="materials.color.picker" /></center>
				</div>


				<div id="materials.elevation_container">
					<div class="divider">
						<span data-i18n="scene.attribute_elevation"></span>
					</div>

					<li><span data-i18n="scene.elevation_range"></span>: <span id="lblHeightRange"></span> <div id="sldHeightRange"></div>	</li>
					<li>
						<span data-i18n="scene.gradient_scheme"></span>:
						<div id="elevation_gradient_scheme_selection" style="display: flex"></div>
					</li>
				</div>

				<div id="materials.transition_container">
					<div class="divider">
						<span>Transition</span>
					</div>

					<li>transition: <span id="lblTransition"></span> <div id="sldTransition"></div>	</li>
				</div>

				<div id="materials.intensity_container">
					<div class="divider">
						<span data-i18n="scene.attribute_intensity"></span>
					</div>

					<li><span data-i18n="scene.intensity_range"></span>: <span id="lblIntensityRange"></span> <div id="sldIntensityRange"></div>	</li>
					<li><span data-i18n="scene.gamma"></span>: <span id="lblIntensityGamma"></span> <div id="sldIntensityGamma"></div>	</li>
					<li><span data-i18n="scene.brightness"></span>: <span id="lblIntensityBrightness"></span> <div id="sldIntensityBrightness"></div>	</li>
					<li><span data-i18n="scene.contrast"></span>: <span id="lblIntensityContrast"></span> <div id="sldIntensityContrast"></div>	</li>
				</div>

				</ul>
			</div>
		`);

		panel.i18n();
		this.container.append(panel);

		{ // POINT SIZE
			let sldPointSize = panel.find(`#sldPointSize`);
			let lblPointSize = panel.find(`#lblPointSize`);

			sldPointSize.slider({
				value: material.size,
				min: 0,
				max: 3,
				step: 0.01,
				slide: function (event, ui) { material.size = ui.value; }
			});

			let update = (e) => {
				lblPointSize.html(material.size.toFixed(2));
				sldPointSize.slider({value: material.size});
			};
			this.addVolatileListener(material, "point_size_changed", update);
			
			update();
		}

		{ // POINT SIZING
			let strSizeType = Object.keys(PointSizeType)[material.pointSizeType];

			let opt = panel.find(`#optPointSizing`);
			opt.selectmenu();
			opt.val(strSizeType).selectmenu('refresh');

			opt.selectmenu({
				change: (event, ui) => {
					material.pointSizeType = PointSizeType[ui.item.value];
				}
			});
		}

		{ // SHAPE
			let opt = panel.find(`#optShape`);

			opt.selectmenu({
				change: (event, ui) => {
					let value = ui.item.value;

					material.shape = PointShape[value];
				}
			});

			let update = () => {
				let typename = Object.keys(PointShape)[material.shape];

				opt.selectmenu().val(typename).selectmenu('refresh');
			};
			this.addVolatileListener(material, "point_shape_changed", update);

			update();
		}

		{ // BACKFACE CULLING
			
			let opt = panel.find(`#set_backface_culling`);
			opt.click(() => {
				material.backfaceCulling = opt.prop("checked");
			});
			let update = () => {
				let value = material.backfaceCulling;
				opt.prop("checked", value);
			};
			this.addVolatileListener(material, "backface_changed", update);
			update();

			let blockBackface = $('#materials_backface_container');
			blockBackface.css('display', 'none');
			if (pointcloud.pcoGeometry.pointAttributes.hasNormals()) {
				blockBackface.css('display', 'block');
			}
		}

		{ // OPACITY
			let sldOpacity = panel.find(`#sldOpacity`);
			let lblOpacity = panel.find(`#lblOpacity`);

			sldOpacity.slider({
				value: material.opacity,
				min: 0,
				max: 1,
				step: 0.001,
				slide: function (event, ui) { 
					material.opacity = ui.value;
				}
			});

			let update = (e) => {
				lblOpacity.html(material.opacity.toFixed(2));
				sldOpacity.slider({value: material.opacity});
			};
			this.addVolatileListener(material, "opacity_changed", update);

			update();
		}

		{
			let options = [
                ['rgb_attribute', i18n.t("scene.attribute_rgb")],
                ['rgbandelev_attribute', i18n.t("scene.attribute_rgbandelev")],
                ['color_attribute', i18n.t("scene.attribute_color")],
				['matcap_attribute', i18n.t("scene.attribute_matcap")],
				['elevation_attribute', i18n.t("scene.attribute_elevation")],
				['intensity_attribute', i18n.t("scene.attribute_intensity")],
				['intensitygrad_attribute', i18n.t("scene.attribute_intensitygrad")],
				['classification_attribute', i18n.t("scene.attribute_classification")],
				['returnnumber_attribute', i18n.t("scene.attribute_returnnumber")],
				['source_attribute', i18n.t("scene.attribute_source")],
				['gpstime_attribute', i18n.t("scene.attribute_gpstime")],
				['index_attribute', i18n.t("scene.attribute_index")],
				['levelofdetail_attribute', i18n.t("scene.attribute_levelofdetail")],
				['composite_attribute', i18n.t("scene.attribute_composite")]
            ];			
			
			let attributeSelection = panel.find('#optMaterial');			
			for(let option of options){
				let [key, value] = option;

                let elOption = $(`<option value=${key}>${value}</option>`);				
                attributeSelection.append(elOption);
			}

			let updateMaterialPanel = (event, ui) => {
				let selectedValue = attributeSelection.selectmenu().val();
				material.pointColorType = Utils.toMaterialID(selectedValue);

				let blockWeights = $('#materials\\.composite_weight_container');
				let blockElevation = $('#materials\\.elevation_container');
				let blockRGB = $('#materials\\.rgb_container');
				let blockColor = $('#materials\\.color_container');
				let blockIntensity = $('#materials\\.intensity_container');
				let blockTransition = $('#materials\\.transition_container');
				let blockMatcap = $('#materials\\.matcap_container');

				blockIntensity.css('display', 'none');
				blockElevation.css('display', 'none');
				blockRGB.css('display', 'none');
				blockColor.css('display', 'none');
				blockWeights.css('display', 'none');
				blockTransition.css('display', 'none');
				blockMatcap.css('display', 'none');
				
				if (selectedValue === 'composite_attribute') {
                    blockWeights.css('display', 'block');
                    blockElevation.css('display', 'block');
                    blockRGB.css('display', 'block');
                    blockIntensity.css('display', 'block');
                } else if (selectedValue === 'elevation_attribute') {
                    blockElevation.css('display', 'block');
                } else if (selectedValue === 'rgbandelev_attribute') {
                    blockRGB.css('display', 'block');
                    blockElevation.css('display', 'block');
                } else if (selectedValue === 'rgb_attribute') {
                    blockRGB.css('display', 'block');
                } else if (selectedValue === 'color_attribute') {
                    blockColor.css('display', 'block');
                } else if (selectedValue === 'intensity_attribute') {
                    blockIntensity.css('display', 'block');
                } else if (selectedValue === 'intensitygrad_attribute') {
                    blockIntensity.css('display', 'block');
                } else if (selectedValue === "matcap_attribute" ){
					blockMatcap.css('display', 'block');
				}
			};

			attributeSelection.selectmenu({change: updateMaterialPanel});

			let update = () => {
				attributeSelection.val(Utils.toMaterialName(material.pointColorType)).selectmenu('refresh');
			};
			this.addVolatileListener(material, "point_color_type_changed", update);

			update();
			updateMaterialPanel();
		}

		{
			let schemes = [
				{name: "SPECTRAL", icon: `${Potree.resourcePath}/icons/gradients_spectral.png`},
				{name: "YELLOW_GREEN", icon: `${Potree.resourcePath}/icons/gradients_yellow_green.png`},
				{name: "PLASMA", icon: `${Potree.resourcePath}/icons/gradients_plasma.png`},
				{name: "GRAYSCALE", icon: `${Potree.resourcePath}/icons/gradients_grayscale.png`},
				{name: "RAINBOW", icon: `${Potree.resourcePath}/icons/gradients_rainbow.png`}
			];

			let elSchemeContainer = panel.find("#elevation_gradient_scheme_selection");

			for(let scheme of schemes){
				let elScheme = $(`
					<span style="flex-grow: 1;">
						<img src="${scheme.icon}" class="button-icon" style="max-width: 100%" />
					</span>
				`);

				elScheme.click( () => {
					material.gradient = Gradients[scheme.name];
				});

				elSchemeContainer.append(elScheme);
			}
		}

		{
			let matcaps = [
				{name: "Normals", icon: `${Potree.resourcePath}/icons/matcap/check_normal+y.jpg`}, 
				{name: "Basic 1", icon: `${Potree.resourcePath}/icons/matcap/basic_1.jpg`}, 
				{name: "Basic 2", icon: `${Potree.resourcePath}/icons/matcap/basic_2.jpg`}, 
				{name: "Basic Dark", icon: `${Potree.resourcePath}/icons/matcap/basic_dark.jpg`}, 
				{name: "Basic Side", icon: `${Potree.resourcePath}/icons/matcap/basic_side.jpg`}, 
				{name: "Ceramic Dark", icon: `${Potree.resourcePath}/icons/matcap/ceramic_dark.jpg`}, 
				{name: "Ceramic Lightbulb", icon: `${Potree.resourcePath}/icons/matcap/ceramic_lightbulb.jpg`}, 
				{name: "Clay Brown", icon: `${Potree.resourcePath}/icons/matcap/clay_brown.jpg`}, 
				{name: "Clay Muddy", icon: `${Potree.resourcePath}/icons/matcap/clay_muddy.jpg`}, 
				{name: "Clay Studio", icon: `${Potree.resourcePath}/icons/matcap/clay_studio.jpg`}, 
				{name: "Resin", icon: `${Potree.resourcePath}/icons/matcap/resin.jpg`}, 
				{name: "Skin", icon: `${Potree.resourcePath}/icons/matcap/skin.jpg`}, 
				{name: "Jade", icon: `${Potree.resourcePath}/icons/matcap/jade.jpg`}, 
				{name: "Metal_ Anisotropic", icon: `${Potree.resourcePath}/icons/matcap/metal_anisotropic.jpg`}, 
				{name: "Metal Carpaint", icon: `${Potree.resourcePath}/icons/matcap/metal_carpaint.jpg`}, 
				{name: "Metal Lead", icon: `${Potree.resourcePath}/icons/matcap/metal_lead.jpg`}, 
				{name: "Metal Shiny", icon: `${Potree.resourcePath}/icons/matcap/metal_shiny.jpg`}, 
				{name: "Pearl", icon: `${Potree.resourcePath}/icons/matcap/pearl.jpg`}, 
				{name: "Toon", icon: `${Potree.resourcePath}/icons/matcap/toon.jpg`},
				{name: "Check Rim Light", icon: `${Potree.resourcePath}/icons/matcap/check_rim_light.jpg`}, 
				{name: "Check Rim Dark", icon: `${Potree.resourcePath}/icons/matcap/check_rim_dark.jpg`}, 
				{name: "Contours 1", icon: `${Potree.resourcePath}/icons/matcap/contours_1.jpg`}, 
				{name: "Contours 2", icon: `${Potree.resourcePath}/icons/matcap/contours_2.jpg`}, 
				{name: "Contours 3", icon: `${Potree.resourcePath}/icons/matcap/contours_3.jpg`}, 
				{name: "Reflection Check Horizontal", icon: `${Potree.resourcePath}/icons/matcap/reflection_check_horizontal.jpg`}, 
				{name: "Reflection Check Vertical", icon: `${Potree.resourcePath}/icons/matcap/reflection_check_vertical.jpg`}, 
			];

			let elMatcapContainer = panel.find("#matcap_scheme_selection");

			for(let matcap of matcaps){
				let elMatcap = $(`
						<img src="${matcap.icon}" class="button-icon" style="width: 25%;" />
				`);

				elMatcap.click( () => {
					material.matcap = matcap.icon.substring(matcap.icon.lastIndexOf('/'));
				});

				elMatcapContainer.append(elMatcap);
			}
		}

		{
			panel.find('#sldRGBGamma').slider({
				value: material.rgbGamma,
				min: 0, max: 4, step: 0.01,
				slide: (event, ui) => {material.rgbGamma = ui.value}
			});

			panel.find('#sldRGBContrast').slider({
				value: material.rgbContrast,
				min: -1, max: 1, step: 0.01,
				slide: (event, ui) => {material.rgbContrast = ui.value}
			});

			panel.find('#sldRGBBrightness').slider({
				value: material.rgbBrightness,
				min: -1, max: 1, step: 0.01,
				slide: (event, ui) => {material.rgbBrightness = ui.value}
			});

			panel.find('#sldHeightRange').slider({
				range: true,
				min: 0, max: 1000, step: 0.01,
				values: [0, 1000],
				slide: (event, ui) => {
					material.heightMin = ui.values[0];
					material.heightMax = ui.values[1];
				}
			});

			panel.find('#sldIntensityRange').slider({
				range: true,
				min: 0, max: 1, step: 0.01,
				values: [0, 1],
				slide: (event, ui) => {
					let min = (Number(ui.values[0]) === 0) ? 0 : parseInt(Math.pow(2, 16 * ui.values[0]));
					let max = parseInt(Math.pow(2, 16 * ui.values[1]));
					material.intensityRange = [min, max];
				}
			});

			panel.find('#sldIntensityGamma').slider({
				value: material.intensityGamma,
				min: 0, max: 4, step: 0.01,
				slide: (event, ui) => {material.intensityGamma = ui.value}
			});

			panel.find('#sldIntensityContrast').slider({
				value: material.intensityContrast,
				min: -1, max: 1, step: 0.01,
				slide: (event, ui) => {material.intensityContrast = ui.value}
			});

			panel.find('#sldIntensityBrightness').slider({
				value: material.intensityBrightness,
				min: -1, max: 1, step: 0.01,
				slide: (event, ui) => {material.intensityBrightness = ui.value}
			});

			panel.find('#sldWeightRGB').slider({
				value: material.weightRGB,
				min: 0, max: 1, step: 0.01,
				slide: (event, ui) => {material.weightRGB = ui.value}
			});

			panel.find('#sldWeightIntensity').slider({
				value: material.weightIntensity,
				min: 0, max: 1, step: 0.01,
				slide: (event, ui) => {material.weightIntensity = ui.value}
			});

			panel.find('#sldWeightElevation').slider({
				value: material.weightElevation,
				min: 0, max: 1, step: 0.01,
				slide: (event, ui) => {material.weightElevation = ui.value}
			});

			panel.find('#sldWeightClassification').slider({
				value: material.weightClassification,
				min: 0, max: 1, step: 0.01,
				slide: (event, ui) => {material.weightClassification = ui.value}
			});

			panel.find('#sldWeightReturnNumber').slider({
				value: material.weightReturnNumber,
				min: 0, max: 1, step: 0.01,
				slide: (event, ui) => {material.weightReturnNumber = ui.value}
			});

			panel.find('#sldWeightSourceID').slider({
				value: material.weightSourceID,
				min: 0, max: 1, step: 0.01,
				slide: (event, ui) => {material.weightSourceID = ui.value}
			});

			panel.find(`#materials\\.color\\.picker`).spectrum({
				flat: true,
				showInput: true,
				preferredFormat: 'rgb',
				cancelText: '',
				chooseText: i18n.t("scene.color_apply"),
				color: `#${material.color.getHexString()}`,
				move: color => {
					let cRGB = color.toRgb();
					let tc = new THREE.Color().setRGB(cRGB.r / 255, cRGB.g / 255, cRGB.b / 255);
					material.color = tc;
				},
				change: color => {
					let cRGB = color.toRgb();
					let tc = new THREE.Color().setRGB(cRGB.r / 255, cRGB.g / 255, cRGB.b / 255);
					material.color = tc;
				}
			});

			this.addVolatileListener(material, "color_changed", () => {
				panel.find(`#materials\\.color\\.picker`)
					.spectrum('set', `#${material.color.getHexString()}`);
			});

			let updateHeightRange = function () {
				let box = [pointcloud.pcoGeometry.tightBoundingBox, pointcloud.getBoundingBoxWorld()]
					.find(v => v !== undefined);

				pointcloud.updateMatrixWorld(true);
				box = Utils.computeTransformedBoundingBox(box, pointcloud.matrixWorld);

				let bWidth = box.max.z - box.min.z;
				let bMin = box.min.z - 0.2 * bWidth;
				let bMax = box.max.z + 0.2 * bWidth;

				let range = material.elevationRange;

				panel.find('#lblHeightRange').html(`[${range[0].toFixed(2)}, ${range[1].toFixed(2)}]`);
				panel.find('#sldHeightRange').slider({min: bMin, max: bMax, values: range});
			};

			let updateIntensityRange = function () {
				let range = material.intensityRange;
				let [min, max] = range.map(v => Math.log2(v) / 16);

				panel.find('#lblIntensityRange').html(`[${parseInt(range[0])}, ${parseInt(range[1])}]`);
				panel.find('#sldIntensityRange').slider({values: [min, max]});
			};

			{
				updateHeightRange();
				panel.find(`#sldHeightRange`).slider('option', 'min');
				panel.find(`#sldHeightRange`).slider('option', 'max');
			}

			let onIntensityChange = () => {
				let gamma = material.intensityGamma;
				let contrast = material.intensityContrast;
				let brightness = material.intensityBrightness;

				updateIntensityRange();

				panel.find('#lblIntensityGamma').html(gamma.toFixed(2));
				panel.find('#lblIntensityContrast').html(contrast.toFixed(2));
				panel.find('#lblIntensityBrightness').html(brightness.toFixed(2));

				panel.find('#sldIntensityGamma').slider({value: gamma});
				panel.find('#sldIntensityContrast').slider({value: contrast});
				panel.find('#sldIntensityBrightness').slider({value: brightness});
			};

			let onRGBChange = () => {
				let gamma = material.rgbGamma;
				let contrast = material.rgbContrast;
				let brightness = material.rgbBrightness;

				panel.find('#lblRGBGamma').html(gamma.toFixed(2));
				panel.find('#lblRGBContrast').html(contrast.toFixed(2));
				panel.find('#lblRGBBrightness').html(brightness.toFixed(2));

				panel.find('#sldRGBGamma').slider({value: gamma});
				panel.find('#sldRGBContrast').slider({value: contrast});
				panel.find('#sldRGBBrightness').slider({value: brightness});
			};

			this.addVolatileListener(material, "material_property_changed", updateHeightRange);
			this.addVolatileListener(material, "material_property_changed", onIntensityChange);
			this.addVolatileListener(material, "material_property_changed", onRGBChange);

			updateHeightRange();
			onIntensityChange();
			onRGBChange();
		}

	}

	setMeasurement(object){

		let TYPE = {
			DISTANCE: {panel: DistancePanel},
			AREA: {panel: AreaPanel},
			POINT: {panel: PointPanel},
			ANGLE: {panel: AnglePanel},
			HEIGHT: {panel: HeightPanel},
			PROFILE: {panel: ProfilePanel},
			VOLUME: {panel: VolumePanel}
		};

		let getType = (measurement) => {
			if (measurement instanceof Measure) {
				if (measurement.showDistances && !measurement.showArea && !measurement.showAngles) {
					return TYPE.DISTANCE;
				} else if (measurement.showDistances && measurement.showArea && !measurement.showAngles) {
					return TYPE.AREA;
				} else if (measurement.maxMarkers === 1) {
					return TYPE.POINT;
				} else if (!measurement.showDistances && !measurement.showArea && measurement.showAngles) {
					return TYPE.ANGLE;
				} else if (measurement.showHeight) {
					return TYPE.HEIGHT;
				} else {
					return TYPE.OTHER;
				}
			} else if (measurement instanceof Profile) {
				return TYPE.PROFILE;
			} else if (measurement instanceof Volume) {
				return TYPE.VOLUME;
			}
		};

		let type = getType(object);
		let Panel = type.panel;

		let panel = new Panel(this.viewer, object, this);
		this.container.append(panel.elContent);
	}

	setCamera(camera){
		let panel = new CameraPanel(this.viewer, this);
		this.container.append(panel.elContent);
	}

}
