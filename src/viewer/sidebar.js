


let createToolIcon = function(icon, title, callback){
	let elImg = document.createElement("img");
	elImg.src = icon;
	elImg.onclick = callback;
	elImg.style.width = "32px";
	elImg.style.height = "32px";
	elImg.classList.add("button-icon");
	elImg.setAttribute("data-i18n", title);
	return elImg;
};

function initToolbar(){

	// ANGLE
	let elToolbar = document.getElementById("tools");
	elToolbar.appendChild(createToolIcon(
		Potree.resourcePath + "/icons/angle.png",
		"[title]tt.angle_measurement",
		function(){
			$("#menu_measurements").next().slideDown();
			viewer.measuringTool.startInsertion({
				showDistances: false, 
				showAngles: true, 
				showArea: false, 
				closed: true, 
				maxMarkers: 3});
		}
	));
	
	// POINT
	elToolbar.appendChild(createToolIcon(
		Potree.resourcePath + "/icons/point.svg",
		"[title]tt.angle_measurement",
		function(){
			$("#menu_measurements").next().slideDown();
			viewer.measuringTool.startInsertion({
				showDistances: false, 
				showAngles: false, 
				showCoordinates: true, 
				showArea: false, 
				closed: true, 
				maxMarkers: 1});
		}
	));
	
	// DISTANCE
	elToolbar.appendChild(createToolIcon(
		Potree.resourcePath + "/icons/distance.svg",
		"[title]tt.distance_measurement",
		function(){
			$("#menu_measurements").next().slideDown();
			viewer.measuringTool.startInsertion({
				showDistances: true, 
				showArea: false, 
				closed: false});
		}
	));
	
	// HEIGHT
	elToolbar.appendChild(createToolIcon(
		Potree.resourcePath + "/icons/height.svg",
		"[title]tt.height_measurement",
		function(){
			$("#menu_measurements").next().slideDown();
			viewer.measuringTool.startInsertion({
				showDistances: false, 
				showHeight: true, 
				showArea: false, 
				closed: false, 
				maxMarkers: 2});
		}
	));
	
	// AREA
	elToolbar.appendChild(createToolIcon(
		Potree.resourcePath + "/icons/area.svg",
		"[title]tt.area_measurement",
		function(){
			$("#menu_measurements").next().slideDown();
			viewer.measuringTool.startInsertion({
				showDistances: true, 
				showArea: true, 
				closed: true});
		}
	));
	
	// VOLUME
	elToolbar.appendChild(createToolIcon(
		Potree.resourcePath + "/icons/volume.svg",
		"[title]tt.volume_measurement",
		function(){viewer.volumeTool.startInsertion()}
	));
	
	// PROFILE
	elToolbar.appendChild(createToolIcon(
		Potree.resourcePath + "/icons/profile.svg",
		"[title]tt.height_profile",
		function(){
			$("#menu_measurements").next().slideDown();;
			viewer.profileTool.startInsertion();
		}
	));
	
	// CLIP VOLUME
	elToolbar.appendChild(createToolIcon(
		Potree.resourcePath + "/icons/clip_volume.svg",
		"[title]tt.clip_volume",
		function(){viewer.volumeTool.startInsertion({clip: true})}
	));
	
	// REMOVE ALL
	elToolbar.appendChild(createToolIcon(
		Potree.resourcePath + "/icons/reset_tools.svg",
		"[title]tt.remove_all_measurement",
		function(){
			viewer.scene.removeAllMeasurements();
		}
	));
}

function initMaterials(){
	
	$( "#optMaterial" ).selectmenu({
		style:'popup',
		position: { 
			my: "top", 
			at: "bottom", 
			collision: "flip" }	
	});
		
	$( "#sldHeightRange" ).slider({
		range: true,
		min:	0,
		max:	1000,
		values: [0, 1000],
		step: 	0.01,
		slide: function( event, ui ) {
			viewer.setHeightRange(ui.values[0], ui.values[1]);
		}
	});
	
	$( "#sldTransition" ).slider({
		value: viewer.getMaterialTransition(),
		min: 0,
		max: 1,
		step: 0.01,
		slide: function( event, ui ) {viewer.setMaterialTransition(ui.value);}
	});
	
	$( "#sldIntensityRange" ).slider({
		range: true,
		min:	0,
		max:	1,
		values: [0, 1],
		step: 	0.01,
		slide: function( event, ui ) {
			let min = (ui.values[0] == 0) ? 0 : parseInt(Math.pow(2, 16 * ui.values[0]));
			let max = parseInt(Math.pow(2, 16 * ui.values[1]));
			viewer.setIntensityRange(min, max);
		}
	});
	
	$( "#sldIntensityGamma" ).slider({
		value: viewer.getIntensityGamma(),
		min: 0,
		max: 4,
		step: 0.01,
		slide: function( event, ui ) {viewer.setIntensityGamma(ui.value);}
	});
	
	$( "#sldIntensityContrast" ).slider({
		value: viewer.getIntensityContrast(),
		min: -1,
		max: 1,
		step: 0.01,
		slide: function( event, ui ) {viewer.setIntensityContrast(ui.value);}
	});
	
	$( "#sldIntensityBrightness" ).slider({
		value: viewer.getIntensityBrightness(),
		min: -1,
		max: 1,
		step: 0.01,
		slide: function( event, ui ) {viewer.setIntensityBrightness(ui.value);}
	});
	
	$( "#sldRGBGamma" ).slider({
		value: viewer.getRGBGamma(),
		min: 0,
		max: 4,
		step: 0.01,
		slide: function( event, ui ) {viewer.setRGBGamma(ui.value);}
	});
	
	$( "#sldRGBContrast" ).slider({
		value: viewer.getRGBContrast(),
		min: -1,
		max: 1,
		step: 0.01,
		slide: function( event, ui ) {viewer.setRGBContrast(ui.value);}
	});
	
	$( "#sldRGBBrightness" ).slider({
		value: viewer.getRGBBrightness(),
		min: -1,
		max: 1,
		step: 0.01,
		slide: function( event, ui ) {viewer.setRGBBrightness(ui.value);}
	});
	
	$( "#sldWeightRGB" ).slider({
		value: viewer.getWeightRGB(),
		min: 0,
		max: 1,
		step: 0.01,
		slide: function( event, ui ) {viewer.setWeightRGB(ui.value);}
	});
	
	$( "#sldWeightIntensity" ).slider({
		value: viewer.getWeightIntensity(),
		min: 0,
		max: 1,
		step: 0.01,
		slide: function( event, ui ) {viewer.setWeightIntensity(ui.value);}
	});
	
	$( "#sldWeightElevation" ).slider({
		value: viewer.getWeightElevation(),
		min: 0,
		max: 1,
		step: 0.01,
		slide: function( event, ui ) {viewer.setWeightElevation(ui.value);}
	});
	
	$( "#sldWeightClassification" ).slider({
		value: viewer.getWeightClassification(),
		min: 0,
		max: 1,
		step: 0.01,
		slide: function( event, ui ) {viewer.setWeightClassification(ui.value);}
	});
	
	$( "#sldWeightReturnNumber" ).slider({
		value: viewer.getWeightReturnNumber(),
		min: 0,
		max: 1,
		step: 0.01,
		slide: function( event, ui ) {viewer.setWeightReturnNumber(ui.value);}
	});
	
	$( "#sldWeightSourceID" ).slider({
		value: viewer.getWeightSourceID(),
		min: 0,
		max: 1,
		step: 0.01,
		slide: function( event, ui ) {viewer.setWeightSourceID(ui.value);}
	});

	let updateHeightRange = function(){
		let box = viewer.getBoundingBox();
		let bWidth = box.max.z - box.min.z;
		bMin = box.min.z - 0.2 * bWidth;
		bMax = box.max.z + 0.2 * bWidth;
		
		let hr = viewer.getHeightRange();
		let hrWidth = hr.max - hr.min;
		
		$( '#lblHeightRange')[0].innerHTML = hr.min.toFixed(2) + " to " + hr.max.toFixed(2);
		$( "#sldHeightRange" ).slider({
			min: bMin,
			max: bMax,
			values: [hr.min, hr.max]
		});
	};
	
	let updateIntensityRange = function(){
		let range = viewer.getIntensityRange();
		let min = Math.log2(range[0]) / 16;
		let max = Math.log2(range[1]) / 16;
		
		$('#lblIntensityRange')[0].innerHTML = 
			parseInt(viewer.getIntensityRange()[0]) + " to " + 
			parseInt(viewer.getIntensityRange()[1]);
		$( "#sldIntensityRange" ).slider({
			values: [min, max]
		});
	};
	
	viewer.addEventListener("height_range_changed", updateHeightRange);
	viewer.addEventListener("intensity_range_changed", updateIntensityRange);
	
	viewer.addEventListener("intensity_gamma_changed", function(event){
		let gamma = viewer.getIntensityGamma();
		
		$('#lblIntensityGamma')[0].innerHTML = gamma.toFixed(2);
		$("#sldIntensityGamma").slider({value: gamma});
	});
	
	viewer.addEventListener("intensity_contrast_changed", function(event){
		let contrast = viewer.getIntensityContrast();
		
		$('#lblIntensityContrast')[0].innerHTML = contrast.toFixed(2);
		$("#sldIntensityContrast").slider({value: contrast});
	});
	
	viewer.addEventListener("intensity_brightness_changed", function(event){
		let brightness = viewer.getIntensityBrightness();
		
		$('#lblIntensityBrightness')[0].innerHTML = brightness.toFixed(2);
		$("#sldIntensityBrightness").slider({value: brightness});
	});
	
	viewer.addEventListener("rgb_gamma_changed", function(event){
		let gamma = viewer.getRGBGamma();
		
		$('#lblRGBGamma')[0].innerHTML = gamma.toFixed(2);
		$("#sldRGBGamma").slider({value: gamma});
	});
	
	viewer.addEventListener("rgb_contrast_changed", function(event){
		let contrast = viewer.getRGBContrast();
		
		$('#lblRGBContrast')[0].innerHTML = contrast.toFixed(2);
		$("#sldRGBContrast").slider({value: contrast});
	});
	
	viewer.addEventListener("rgb_brightness_changed", function(event){
		let brightness = viewer.getRGBBrightness();
		
		$('#lblRGBBrightness')[0].innerHTML = brightness.toFixed(2);
		$("#sldRGBBrightness").slider({value: brightness});
	});
	
	viewer.addEventListener("pointcloud_loaded", updateHeightRange);
	
	updateHeightRange();
	updateIntensityRange();
	$('#lblIntensityGamma')[0].innerHTML = viewer.getIntensityGamma().toFixed(2);
	$('#lblIntensityContrast')[0].innerHTML = viewer.getIntensityContrast().toFixed(2);
	$('#lblIntensityBrightness')[0].innerHTML = viewer.getIntensityBrightness().toFixed(2);
	
	$('#lblRGBGamma')[0].innerHTML = viewer.getRGBGamma().toFixed(2);
	$('#lblRGBContrast')[0].innerHTML = viewer.getRGBContrast().toFixed(2);
	$('#lblRGBBrightness')[0].innerHTML = viewer.getRGBBrightness().toFixed(2);

	let options = [ 
		"RGB", 
		"RGB and Elevation",
		"Color", 
		"Elevation", 
		"Intensity", 
		"Intensity Gradient", 
		"Classification", 
		"Return Number", 
		"Source", 
		"Phong",
		"Level of Detail",
		"Composite",
	];
	
	let elMaterialList = document.getElementById("optMaterial");
	for(let i = 0; i < options.length; i++){
		let option = options[i];
		
		let elOption = document.createElement("option");
		elOption.innerHTML = option;
		elOption.id = "optMaterial_" + option;
		
		elMaterialList.appendChild(elOption);
	}
	
	let updateMaterialPanel = function(event, ui){
		//viewer.setMaterial(ui.item.value);
		
		let selectedValue = $("#optMaterial").selectmenu().val();
		viewer.setMaterial(selectedValue);
		
		let blockWeights = $("#materials\\.composite_weight_container");
		let blockElevation = $("#materials\\.elevation_container");
		let blockRGB = $("#materials\\.rgb_container");
		let blockIntensity = $("#materials\\.intensity_container");
		let blockTransition = $("#materials\\.transition_container");
		
		blockIntensity.css("display", "none");
		blockElevation.css("display", "none");
		blockRGB.css("display", "none");
		blockWeights.css("display", "none");
		blockTransition.css("display", "none");
		
		if(selectedValue === "Composite"){
			blockWeights.css("display", "block");
			blockElevation.css("display", "block");
			blockRGB.css("display", "block");
			blockIntensity.css("display", "block");
		}
		
		if(selectedValue === "Elevation"){
			blockElevation.css("display", "block");
		}
		
		if(selectedValue === "RGB and Elevation"){
			blockRGB.css("display", "block");
			blockElevation.css("display", "block");
		}
		
		if(selectedValue === "RGB"){
			blockRGB.css("display", "block");
		}
		
		if(selectedValue === "Intensity"){
			blockIntensity.css("display", "block");
		}
		
		if(selectedValue === "Intensity Gradient"){
			blockIntensity.css("display", "block");
		}
	};
	
	$("#optMaterial").selectmenu({change: updateMaterialPanel});
	$("#optMaterial").val(viewer.getMaterialName()).selectmenu("refresh");
	updateMaterialPanel();
	
	viewer.addEventListener("material_changed", e => {
		$("#optMaterial").val(viewer.getMaterialName()).selectmenu("refresh");
	});
}

function initClassificationList(){
	let elClassificationList = $("#classificationList");
	
	let addClassificationItem = function(code, name){
		
		let id = "chkClassification_" + code;
		
		let element = $(`
			<li>
				<label style="white-space: nowrap">
					<input id="${id}" type="checkbox" checked="true"/> ${name} 
				</label>
			</li>
		`);
		
		let elInput = element.find("input");

		elInput.click(event => {
			viewer.setClassificationVisibility(code, event.target.checked);
		});
		
		elClassificationList.append(element);
	};
	
	addClassificationItem(0, "never classified");
	addClassificationItem(1, "unclassified");
	addClassificationItem(2, "ground");
	addClassificationItem(3, "low vegetation");
	addClassificationItem(4, "medium vegetation");
	addClassificationItem(5, "high vegetation");
	addClassificationItem(6, "building");
	addClassificationItem(7, "low point(noise)");
	addClassificationItem(8, "key-point");
	addClassificationItem(9, "water");
	addClassificationItem(12, "overlap");
}

function initAccordion(){
	
	$(".accordion > h3").each(function(){
		let header = $(this);
		let content = $(this).next();
		
		header.addClass("accordion-header ui-widget");
		content.addClass("accordion-content ui-widget");
		
		content.hide();
		
		header.click(function(){
			content.slideToggle();
		});
	});
	
	// to close all, call
	// $(".accordion > div").hide()
	
	// to open the, for example, tool menu, call: 
	// $("#menu_tools").next().show()
	
}

function initAppearance(){

	$( "#optPointSizing" ).selectmenu();
	$( "#optQuality" ).selectmenu();
	
	$("#optPointSizing").val(viewer.getPointSizing()).selectmenu("refresh")
	$("#optPointSizing").selectmenu({
		change: function(event, ui){
			viewer.setPointSizing(ui.item.value);
		}
	});
	
	$("#optQuality").val(viewer.getQuality()).selectmenu("refresh")
	$("#optQuality").selectmenu({
		change: function(event, ui){
			viewer.setQuality(ui.item.value);
		}
	});


	$( "#sldPointBudget" ).slider({
		value: viewer.getPointBudget(),
		min: 100*1000,
		max: 5*1000*1000,
		step: 1000,
		slide: function( event, ui ) {viewer.setPointBudget(ui.value);}
	});
	
	$( "#sldPointSize" ).slider({
		value: viewer.getPointSize(),
		min: 0,
		max: 3,
		step: 0.01,
		slide: function( event, ui ) {viewer.setPointSize(ui.value);}
	});
	
	$( "#sldFOV" ).slider({
		value: viewer.getFOV(),
		min: 20,
		max: 100,
		step: 1,
		slide: function( event, ui ) {viewer.setFOV(ui.value);}
	});
	
	$( "#sldOpacity" ).slider({
		value: viewer.getOpacity(),
		min: 0,
		max: 1,
		step: 0.01,
		slide: function( event, ui ) {viewer.setOpacity(ui.value);}
	});
	
	$( "#sldEDLRadius" ).slider({
		value: viewer.getEDLRadius(),
		min: 1,
		max: 4,
		step: 0.01,
		slide: function( event, ui ) {viewer.setEDLRadius(ui.value);}
	});
	
	$( "#sldEDLStrength" ).slider({
		value: viewer.getEDLStrength(),
		min: 0,
		max: 5,
		step: 0.01,
		slide: function( event, ui ) {viewer.setEDLStrength(ui.value);}
	});
	
	viewer.addEventListener("point_budget_changed", function(event){
		$( '#lblPointBudget')[0].innerHTML = Potree.utils.addCommas(viewer.getPointBudget());
		$( "#sldPointBudget" ).slider({value: viewer.getPointBudget()});
	});
	
	viewer.addEventListener("point_size_changed", function(event){
		$('#lblPointSize')[0].innerHTML = viewer.getPointSize().toFixed(2);
		$( "#sldPointSize" ).slider({value: viewer.getPointSize()});
	});
	
	viewer.addEventListener("fov_changed", function(event){
		$('#lblFOV')[0].innerHTML = parseInt(viewer.getFOV());
		$( "#sldFOV" ).slider({value: viewer.getFOV()});
	});
	
	viewer.addEventListener("opacity_changed", function(event){
		$('#lblOpacity')[0].innerHTML = viewer.getOpacity().toFixed(2);
		$( "#sldOpacity" ).slider({value: viewer.getOpacity()});
	});
	
	viewer.addEventListener("point_sizing_changed", e => {
		let type = viewer.pointSizeType;
		let conversion = new Map([
			[Potree.PointSizeType.FIXED, "Fixed"],
			[Potree.PointSizeType.ATTENUATED, "Attenuated"],
			[Potree.PointSizeType.ADAPTIVE, "Adaptive"]
		]);
		
		let typename = conversion.get(type);
		
		$( "#optPointSizing" )
			.selectmenu()
			.val(typename)
			.selectmenu("refresh");
	});
	
	viewer.addEventListener("quality_changed", e => {
		
		let name = viewer.quality;
		
		$( "#optQuality" )
			.selectmenu()
			.val(name)
			.selectmenu("refresh");
	});
	
	viewer.addEventListener("edl_radius_changed", function(event){
		$('#lblEDLRadius')[0].innerHTML = viewer.getEDLRadius().toFixed(1);
		$( "#sldEDLRadius" ).slider({value: viewer.getEDLRadius()});
	});
	
	viewer.addEventListener("edl_strength_changed", function(event){
		$('#lblEDLStrength')[0].innerHTML = viewer.getEDLStrength().toFixed(1);
		$( "#sldEDLStrength" ).slider({value: viewer.getEDLStrength()});
	});
	
	viewer.addEventListener("background_changed", function(event){
		$("input[name=background][value='" + viewer.getBackground() +  "']").prop("checked",true);
	});
	
	
	$('#lblPointBudget')[0].innerHTML = Potree.utils.addCommas(viewer.getPointBudget());
	$('#lblPointSize')[0].innerHTML = viewer.getPointSize().toFixed(2);
	$('#lblFOV')[0].innerHTML = parseInt(viewer.getFOV());
	$('#lblOpacity')[0].innerHTML = viewer.getOpacity().toFixed(2);
	$('#lblEDLRadius')[0].innerHTML = viewer.getEDLRadius().toFixed(1);
	$('#lblEDLStrength')[0].innerHTML = viewer.getEDLStrength().toFixed(1);
	$('#chkEDLEnabled')[0].checked = viewer.getEDLEnabled();
	$("input[name=background][value='" + viewer.getBackground() +  "']").prop("checked",true);
}
	
	
function initNavigation(){

	let elNavigation = document.getElementById("navigation");
	
	elNavigation.appendChild(createToolIcon(
		Potree.resourcePath + "/icons/earth_controls_1.png",
        "[title]tt.earth_control",
		function(){viewer.setNavigationMode(Potree.EarthControls)}
	));
	
	elNavigation.appendChild(createToolIcon(
		Potree.resourcePath + "/icons/fps_controls.png",
        "[title]tt.flight_control",
		function(){viewer.setNavigationMode(Potree.FirstPersonControls)}
	));
	
	elNavigation.appendChild(createToolIcon(
		Potree.resourcePath + "/icons/orbit_controls.svg",
		"[title]tt.orbit_control",
		function(){viewer.setNavigationMode(Potree.OrbitControls)}
	));
	
	elNavigation.appendChild(createToolIcon(
		Potree.resourcePath + "/icons/focus.svg",
		"[title]tt.focus_control",
		function(){viewer.fitToScreen()}
	));
	
	elNavigation.appendChild(createToolIcon(
		Potree.resourcePath + "/icons/topview.svg",
		"[title]tt.top_view_control",
		function(){viewer.setTopView()}
	));
	
	elNavigation.appendChild(createToolIcon(
		Potree.resourcePath + "/icons/frontview.svg",
		"[title]tt.front_view_control",
		function(){viewer.setFrontView()}
	));
	
	elNavigation.appendChild(createToolIcon(
		Potree.resourcePath + "/icons/leftview.svg",
		"[title]tt.left_view_control",
		function(){viewer.setLeftView()}
	));
	
	let speedRange = new THREE.Vector2(1, 10*1000);
	
	let toLinearSpeed = function(value){
		return Math.pow(value, 4) * speedRange.y + speedRange.x;
	};
	
	let toExpSpeed = function(value){
		return Math.pow((value - speedRange.x) / speedRange.y, 1 / 4);
	};

	$( "#sldMoveSpeed" ).slider({
		value: toExpSpeed( viewer.getMoveSpeed() ),
		min: 0,
		max: 1,
		step: 0.01,
		slide: function( event, ui ) { viewer.setMoveSpeed(toLinearSpeed(ui.value)); }
	});
	
	viewer.addEventListener("move_speed_changed", function(event){
		$('#lblMoveSpeed')[0].innerHTML = viewer.getMoveSpeed().toFixed(1);
		$( "#sldMoveSpeed" ).slider({value: toExpSpeed(viewer.getMoveSpeed())});
	});
	
	$('#lblMoveSpeed')[0].innerHTML = viewer.getMoveSpeed().toFixed(1);
}

function initAnnotationDetails(){
	
	// annotation_details
	let annotationPanel = $("#annotation_details");
	
	let rebuild = () => {
		console.log("rebuild");
		
		annotationPanel.empty();
		
		let stack = viewer.scene.annotations.children.reverse().map(
			a => ({annotation: a, container: annotationPanel}));
		
		
		while(stack.length > 0){
			
			let {annotation, container} = stack.pop();
			
			// ►	U+25BA	\u25BA
			// ▼	U+25BC	\u25BC
			
			let element = $(`
				<div class="annotation-item" style="margin: 8px 20px">
					<span class="annotation-main">
						<span class="annotation-expand">\u25BA</span>
						<span class="annotation-label">
							${annotation.title}
						</span>
					</span>
				</div>
			`);
			
			let elMain = element.find(".annotation-main");
			let elExpand = element.find(".annotation-expand");
			
			elExpand.css("display", annotation.children.length > 0 ? "block" : "none");
			
			let actions = [];
			{ // ACTIONS, INCLUDING GOTO LOCATION
				if(annotation.hasView()){
					let action = {
						"icon": Potree.resourcePath + "/icons/target.svg",
						"onclick": (e) => {annotation.moveHere(viewer.scene.camera)}
					};
					
					actions.push(action);
				}
				
				for(let action of annotation.actions){
					actions.push(action);
				}
			}
			
			// FIRST ACTION
			if(annotation.children.length === 0 && actions.length > 0){
				let action = actions[0];
				
				let elIcon = $(`<img src="${action.icon}" class="annotation-icon">`);
				
				elMain.append(elIcon);
				elMain.click(e => action.onclick(e));
				elMain.mouseover(e => elIcon.css("opacity", 1));
				elMain.mouseout(e => elIcon.css("opacity", 0.5));
				
				actions.splice(0, 1);
			}
			
			// REMAINING ACTIONS
			for(let action of actions){
				
				let elIcon = $(`<img src="${action.icon}" class="annotation-icon">`);
				
				elIcon.click(e => {
					action.onclick(e); 
					return false;
				});
				elIcon.mouseover(e => elIcon.css("opacity", 1));
				elIcon.mouseout(e => elIcon.css("opacity", 0.5));
				
				element.append(elIcon);
			}
			
			element.mouseover(e => annotation.setHighlighted(true));
			element.mouseout(e => annotation.setHighlighted(false));
			
			annotation.setHighlighted(false);
			
			container.append(element);
			
			if(annotation.children.length > 0){
				
				element.click(e => {
					
					if(element.next().is(":visible")){
						elExpand.html("\u25BA");
					}else{
						elExpand.html("\u25BC");
					}
					
					element.next().toggle(100);
				});
				
				let left = ((annotation.level()) * 20) + "px";
				let childContainer = $(`<div style="margin: 0px; padding: 0px 0px 0px ${left}; display: none"></div>`);
				for(let child of annotation.children){
					container.append(childContainer);
					stack.push({annotation: child, container: childContainer});
				}
			}
			
		};
	};
	
	let annotationsChanged = e => {
		rebuild();
	};
	
	viewer.addEventListener("scene_changed", e => {
		e.oldScene.removeEventListener("annotation_added", annotationsChanged);
		e.scene.addEventListener("annotation_added", annotationsChanged);
		
		rebuild();
	});
	
	rebuild();
}

function initMeasurementDetails(){

	let id = 0;
	let trackedItems = new Map();
	
	let elMeasurements = $("#measurement_details");
	
	let trackMeasurement = function(scene, measurement){
		id++;
		
		let track = {
			scene: scene,
			measurement: measurement,
			untrack: null
		};
		
		trackedItems.set(measurement, track);
		
		let removeIcon = Potree.resourcePath + "/icons/remove.svg";
		
		let icon = "";
		let title = "";
		let removeAction;
		
		if(measurement instanceof Potree.Measure){
			if(measurement.showDistances && !measurement.showArea && !measurement.showAngles){
				icon = Potree.resourcePath + "/icons/distance.svg";
				title = "Distance";
			}else if(measurement.showDistances && measurement.showArea && !measurement.showAngles){
				icon = Potree.resourcePath + "/icons/area.svg";
				title = "Area";
			}else if(measurement.maxMarkers === 1){
				icon = Potree.resourcePath + "/icons/point.svg";
				title = "Coordinate";
			}else if(!measurement.showDistances && !measurement.showArea && measurement.showAngles){
				icon = Potree.resourcePath + "/icons/angle.png";
				title = "Angle";
			}else if(measurement.showHeight){
				icon = Potree.resourcePath + "/icons/height.svg";
				title = "Height";
			}
			
			removeAction = function(){scene.removeMeasurement(measurement);};
		} else if(measurement instanceof Potree.Profile){
			icon = Potree.resourcePath + "/icons/profile.svg";
			title = "Profile";
			
			removeAction = function(){scene.removeProfile(measurement);};
		} else if(measurement instanceof Potree.Volume){
			icon = Potree.resourcePath + "/icons/volume.svg";
			title = "Volume";
			
			removeAction = function(){scene.removeVolume(volume);};
		}
		
		let element = $(`
			<li>
				<div class="potree-panel panel-default">
					<div class="potree-panel-heading pv-panel-heading">
						<img class="measurement-panel-icon" src="${icon}"/>
						<span class="measurement-panel-title">${title}</span>
						<img class="measurement-panel-remove" src="${removeIcon}"/>
					</div>
					<div class="panel-body">
					
					</div>
				</div>
			</li>
		`);
		
		let elIcon = element.find(".measurement-panel-icon");
		let elRemove = element.find(".measurement-panel-remove");
		let elPanelBody = element.find(".panel-body");
		elRemove.click(removeAction);
		
		elMeasurements.append(element);
		
		let widthListener = null;
		let updateDisplay = function(event){
		
			elPanelBody.empty();
			
			if(measurement instanceof Potree.Profile){
				
				let lblID = "lblProfileWidth_" + id;
				let sldID = "sldProfileWidth_" + id;
				
				let element = $(`
					<li style="margin-bottom: 5px">
						width: 
						<span id="${lblID}" />
						<div id="${sldID}"/>
					</li>
				`);
				
				let elWidthLabel = element.find(`#${lblID}`);
				let elWidthSlider = element.find(`#${sldID}`);
				
				elWidthSlider.slider({
					value: Math.pow((measurement.getWidth() / 1000), 1/4).toFixed(3),
					min: 0,
					max: 1,
					step: 0.01,
					slide: function(event, ui){
						let val = Math.pow(ui.value, 4) * 1000;
						measurement.setWidth(val);
					}
				});
				if(measurement.getWidth()){
					elWidthLabel.html(Potree.utils.addCommas(measurement.getWidth().toFixed(3)));
				}else{
					elWidthLabel.html("-");
				}
				
				if(widthListener === null){
					widthListener = function(event){
						let val = Math.pow((event.width / 1000), 1/4);
						elWidthLabel.html(Potree.utils.addCommas(event.width.toFixed(3)));
						elWidthSlider.slider({value: val});
					};
				}
				if(!measurement.hasEventListener("width_changed", widthListener)){
					measurement.addEventListener("width_changed", widthListener);
				}
				
				elPanelBody.append(element);
			}
			
			let positions = [];
			let points;
			
			if(measurement instanceof Potree.Measure){
				points = measurement.points;
				for(let i = 0; i < points.length; i++){
					positions.push(points[i].position);
				}
			} else if(measurement instanceof Potree.Profile){
				positions = measurement.points;
			}
			
			if(measurement instanceof Potree.Measure && measurement.showHeight){
				let points = measurement.points;
				
				let sorted = points.slice().sort( (a, b) => a.position.z - b.position.z );
				let lowPoint = sorted[0].position.clone();
				let highPoint = sorted[sorted.length - 1].position.clone();
				let min = lowPoint.z;
				let max = highPoint.z;
				let height = max - min;
				
				let txt = height.toFixed(3);
				
				let elNodeHeight = $(`<div class="measurement-detail-node-marker">${txt}</div>`);
				elPanelBody.append(elNodeHeight);
			}
			
			for(let i = 0; i < positions.length; i++){
				let point = positions[i];
	
				let txt = point.toArray().map(e => e.toFixed(3)).join(", ");
				
				if(measurement && !measurement.showHeight){
					let elNodeMarker = $(`<div class="measurement-detail-node-marker">${txt}</div>`);
					elPanelBody.append(elNodeMarker);
				}
				
				if(i < positions.length - 1){
					if(measurement && measurement.showDistances){
						
						let elEdge = $('<div class="measurement-detail-edge"></div>');
						elPanelBody.append(elEdge);
						
						let nextPoint = positions[i+1];
						let nextGeo = nextPoint;
						let distance = nextGeo.distanceTo(point);
						let txt = Potree.utils.addCommas(distance.toFixed(2));
						
						let elNodeDistance = $(`<div class="measurement-detail-node-distance">${txt}</div>`);
						
						elPanelBody.append(elNodeDistance);
					}
				}
				
				if(measurement && measurement.showAngles){
					let elEdge = $('<div class="measurement-detail-edge"></div>');
					elPanelBody.append(elEdge);
					
					let angle = measurement.getAngle(i);
					let txt = Potree.utils.addCommas((angle*(180.0/Math.PI)).toFixed(1)) + '\u00B0';
					let elNodeAngle = $('<div>').addClass("measurement-detail-node-angle");
					elNodeAngle.html(txt);
					$(elPanelBody).append(elNodeAngle);
				}
				
				if(i < positions.length - 1){
					let elEdge = $('<div class="measurement-detail-edge"></div>');
					elPanelBody.append(elEdge);
				}
			}
			
			if(points && points.length === 1){
				let point = points[0];
				
				let elTable = $('<table stlye="width: 100%"></table>');
				elPanelBody.append(elTable);
				
				if(point.color){
					let value = point.color.join(", ");
					
					elTable.append($(`
						<tr>
							<td style="padding: 1px 5px;">rgb</td>
							<td style="width: 100%; padding: 1px 5px;">${value}</td>
						</tr>
					`));
				}
				
				if(typeof point.intensity !== "undefined"){
					let intensity = point.intensity;
					
					elTable.append($(`
						<tr>
							<td style="padding: 1px 5px;">intensity</td>
							<td style="width: 100%; padding: 1px 5px;">${intensity}</td>
						</tr>
					`));
				}
				
				if(typeof point.classification !== "undefined"){
					let classification = point.classification;
					
					elTable.append($(`
						<tr>
							<td style="padding: 1px 5px;">classification</td>
							<td style="width: 100%; padding: 1px 5px;">${classification}</td>
						</tr>
					`));
				}
				
				if(typeof point.returnNumber !== "undefined"){
					let returnNumber = point.returnNumber;

					elTable.append($(`
						<tr>
							<td style="padding: 1px 5px;">return nr.</td>
							<td style="width: 100%; padding: 1px 5px;">${returnNumber}</td>
						</tr>
					`));
				}
				
				if(typeof point.pointSourceID !== "undefined"){
					let source = point.pointSourceID;
					
					elTable.append($(`
						<tr>
							<td style="padding: 1px 5px;">source</td>
							<td style="width: 100%; padding: 1px 5px;">${source}</td>
						</tr>
					`));
				}
				
				
			}
			
			if(measurement && measurement.showDistances && measurement.points.length > 1){
				let txt = "Total: " + Potree.utils.addCommas(measurement.getTotalDistance().toFixed(3));
				
				let elNodeTotalDistance = $(`<div class="measurement-detail-node-distance">${txt}</div>`);
				
				elPanelBody.append(elNodeTotalDistance);
			}
			
			if(measurement && measurement.showArea){
				let txt = Potree.utils.addCommas(measurement.getArea().toFixed(1)) + "\u00B2";
				
				let elNodeArea = $(`<div class="measurement-detail-node-area">${txt}</div>`);
				
				elPanelBody.append(elNodeArea);
			}
			
			if(measurement instanceof Potree.Profile){
				let elOpenProfileWindow = $('<input type="button" value="show 2d profile" class="measurement-detail-button">');
				elOpenProfileWindow.click(e => {
					viewer._2dprofile.show();
					viewer._2dprofile.draw(measurement);
				});
				elPanelBody.append(elOpenProfileWindow);
			}
			
			let doExport = measurement.showDistances && !measurement.showAngles;
			if(doExport){
				let elBottomBar = $(`
					<span style="display:flex">
						<span style="flex-grow: 1"></span>
					</span>
				`);
				elPanelBody.append(elBottomBar);
				
				{
					let icon = Potree.resourcePath + "/icons/file_geojson.svg";
					let elDownload = $(`<a href="#" download="measure.json" class="measurepanel_downloads"><img src="${icon}"></img></a>`);
					
					elDownload.click(function(e){
						let geojson = Potree.GeoJSONExporter.toString(measurement);
						let url = window.URL.createObjectURL(new Blob([geojson], {type: 'data:application/octet-stream'}));
						elDownload.attr("href", url);
					});
					
					elBottomBar.append(elDownload);
				}
				
				{
					let icon = Potree.resourcePath + "/icons/file_dxf.svg";
					let elDownload = $(`<a href="#" download="measure.dxf" class="measurepanel_downloads"><img src="${icon}"></img></a>`);
					
					elDownload.click(function(e){
						let dxf = Potree.DXFExporter.toString(measurement);
						let url = window.URL.createObjectURL(new Blob([dxf], {type: 'data:application/octet-stream'}));
						elDownload.attr("href", url);
					});
					
					elBottomBar.append(elDownload);
				}
			}
		};
		
		updateDisplay();
		
		if(measurement instanceof Potree.Measure){
			let onremove = function(event){
				if(event.measurement === measurement){
					element.remove();
				}
			};
		
			measurement.addEventListener("marker_added", updateDisplay);
			measurement.addEventListener("marker_removed", updateDisplay);
			measurement.addEventListener("marker_moved", updateDisplay);
			scene.addEventListener("measurement_removed", onremove);
			
			track.stopTracking = (e) => {
				measurement.removeEventListener("marker_added", updateDisplay);
				measurement.removeEventListener("marker_removed", updateDisplay);
				measurement.removeEventListener("marker_moved", updateDisplay);
				scene.removeEventListener("measurement_added", onremove);
				scene.removeEventListener("measurement_removed", onremove);
			};
		} else if(measurement instanceof Potree.Profile){
			let onremove = function(event){
				if(event.profile === measurement){
					scene.removeEventListener("marker_added", updateDisplay);
					scene.removeEventListener("marker_removed", updateDisplay);
					scene.removeEventListener("marker_moved", updateDisplay);
					$(elLi).remove();
				}
			};
		
			measurement.addEventListener("marker_added", updateDisplay);
			measurement.addEventListener("marker_removed", updateDisplay);
			measurement.addEventListener("marker_moved", updateDisplay);
			scene.addEventListener("profile_removed", onremove);
			
			track.stopTracking = (e) => {
				measurement.removeEventListener("marker_added", updateDisplay);
				measurement.removeEventListener("marker_removed", updateDisplay);
				measurement.removeEventListener("marker_moved", updateDisplay);
				scene.removeEventListener("profile_added", onremove);
				scene.removeEventListener("profile_removed", onremove);
			};
		}
		
	};
	
	let scenelistener = (e) => {
		if(e.measurement){
			trackMeasurement(e.scene, e.measurement);
		} else if(e.profile){
			trackMeasurement(e.scene, e.profile);
			
			viewer._2dprofile.show();
			viewer._2dprofile.draw(e.profile);
		}
	};
	
	let trackScene = (scene) => {
		$("#measurement_details").empty();
		
		trackedItems.forEach(function(trackedItem, key, map){
			trackedItem.stopTracking();
		});
		
		for(let i = 0; i < scene.measurements.length; i++){
			trackMeasurement(scene, scene.measurements[i]);
		}
		
		for(let i = 0; i < scene.profiles.length; i++){
			trackMeasurement(scene, scene.profiles[i]);
		}
		
		if(!scene.hasEventListener("measurement_added", scenelistener)){
			scene.addEventListener("measurement_added", scenelistener);
		}
		
		if(!scene.hasEventListener("profile_added", scenelistener)){
			scene.addEventListener("profile_added", scenelistener);
		}
	};
	
	trackScene(viewer.scene);
	
	viewer.addEventListener("scene_changed", (e) => {trackScene(e.scene)});
};

function initSceneList(){

	let scenelist = $('#sceneList');
	
	let id = 0;
	// this works but it looks so wrong. any better way to create a closure around pointcloud?
	let addPointcloud = function(pointcloud){
		(function(pointcloud){
			let elLi = $('<li>');
			let elLabel = $('<label>');
			let elInput = $('<input type="checkbox">');
			
			elInput[0].checked = pointcloud.visible;
			elInput[0].id = "scene_list_item_pointcloud_" + id;
			elLabel[0].id = "scene_list_item_label_pointcloud_" + id;
			elLabel[0].htmlFor = "scene_list_item_pointcloud_" + id;
			elLabel.addClass("menu-item");
			elInput.click(function(event){
				pointcloud.visible = event.target.checked;
				if(viewer._2dprofile){
					viewer._2dprofile.redraw();
				}
			});
			
			elLi.append(elLabel);
			elLabel.append(elInput);
			let pointcloudName = " " + (pointcloud.name ? pointcloud.name : "point cloud " + id);
			let elPointCloudName = document.createTextNode(pointcloudName);
			elLabel.append(elPointCloudName);
			
			scenelist.append(elLi);
			
			pointcloud.addEventListener("name_changed", function(e){
				if(e.name){
					elPointCloudName.textContent = " " + e.name;
				}else{
					elPointCloudName.textContent = " point cloud " + id;
				}
			});
			
			id++;
		})(pointcloud);
	};
	
	for(let i = 0; i < viewer.scene.pointclouds.length; i++){
		let pointcloud = viewer.scene.pointclouds[i];
		addPointcloud(pointcloud);
	}
	
	viewer.addEventListener("scene_changed", (e) => {
		scenelist.empty();
		
		let scene = e.scene;
		for(let i = 0; i < scene.pointclouds.length; i++){
			let pointcloud = scene.pointclouds[i];
			addPointcloud(pointcloud);
		}
	});
	
	// TODO update scene list on scene switch
	viewer.addEventListener("pointcloud_loaded", function(event){
		addPointcloud(event.pointcloud);
	});
	
	let lastPos = new THREE.Vector3();
	let lastTarget = new THREE.Vector3();
	viewer.addEventListener("update", e => {
		let pos = viewer.scene.view.position;
		let target = viewer.scene.view.getPivot();
		
		if(pos.equals(lastPos) && target.equals(lastTarget)){
			return;
		}else{
			lastPos.copy(pos);
			lastTarget.copy(target);
		}
		
		let strCamPos = "<br>" + [pos.x, pos.y, pos.z].map(e => e.toFixed(2)).join(", ");
		let strCamTarget = "<br>" + [target.x, target.y, target.z].map(e => e.toFixed(2)).join(", ");
		
		$('#lblCameraPosition').html(strCamPos);
		$('#lblCameraTarget').html(strCamTarget);
	});
};

initSettings = function(){
	//<li>Min Node Size: <span id="lblMinNodeSize"></span><div id="sldMinNodeSize"></div>	</li>
	
	$( "#sldMinNodeSize" ).slider({
		value: viewer.getMinNodeSize(),
		min: 0,
		max: 1000,
		step: 0.01,
		slide: function( event, ui ) {viewer.setMinNodeSize(ui.value);}
	});
	
	viewer.addEventListener("minnodesize_changed", function(event){
		$('#lblMinNodeSize')[0].innerHTML = parseInt(viewer.getMinNodeSize());
		$( "#lblMinNodeSize" ).slider({value: viewer.getMinNodeSize()});
	});
	
	
	let toClipModeCode = function(string){
		if(string === "No Clipping"){
			return Potree.ClipMode.DISABLED;
		}else if(string === "Highlight Inside"){
			return Potree.ClipMode.HIGHLIGHT_INSIDE;
		}else if(string === "Clip Outside"){
			return Potree.ClipMode.CLIP_OUTSIDE;
		}
	};
	
	let toClipModeString = function(code){
		if(code === Potree.ClipMode.DISABLED){
			return "No Clipping";
		}else if(code === Potree.ClipMode.HIGHLIGHT_INSIDE){
			return "Highlight Inside";
		}else if(code === Potree.ClipMode.CLIP_OUTSIDE){
			return "Clip Outside";
		}
	};
	
	$("#optClipMode").selectmenu();
	$("#optClipMode").val(toClipModeString(viewer.getClipMode())).selectmenu("refresh")
	$("#optClipMode").selectmenu({
		change: function(event, ui){
			viewer.setClipMode(toClipModeCode(ui.item.value));
		}
	});
	
	viewer.addEventListener("clip_mode_changed", e => {
		let string = toClipModeString(viewer.clipMode);
		
		$( "#optClipMode" )
			.selectmenu()
			.val(string)
			.selectmenu("refresh");
	});
};

let initSidebar = function(){
	initAccordion();
	initAppearance();
	initToolbar();
	initNavigation();
	initMaterials();
	initClassificationList();
	initAnnotationDetails();
	initMeasurementDetails();
	initSceneList();
	initSettings()
	
	$('#potree_version_number').html(Potree.version.major + "." + Potree.version.minor + Potree.version.suffix);
	$('.perfect_scrollbar').perfectScrollbar();
}