


var createToolIcon = function(icon, title, callback){
	var elImg = document.createElement("img");
	elImg.src = icon;
	elImg.onclick = callback;
	elImg.style.width = "32px";
	elImg.style.height = "32px";
	elImg.classList.add("button-icon");
	elImg.setAttribute("data-i18n", title);
	return elImg;
};

function initToolbar(){
	var elToolbar = document.getElementById("tools");
	elToolbar.appendChild(createToolIcon(
		Potree.resourcePath + "/icons/angle.png",
		"[title]tt.angle_measurement",
		function(){viewer.measuringTool.startInsertion({showDistances: false, showAngles: true, showArea: false, closed: true, maxMarkers: 3})}
	));
	
	elToolbar.appendChild(createToolIcon(
		Potree.resourcePath + "/icons/point.svg",
		"[title]tt.angle_measurement",
		function(){viewer.measuringTool.startInsertion({showDistances: false, showAngles: false, showCoordinates: true, showArea: false, closed: true, maxMarkers: 1})}
	));
	
	elToolbar.appendChild(createToolIcon(
		Potree.resourcePath + "/icons/distance.svg",
		"[title]tt.distance_measurement",
		function(){viewer.measuringTool.startInsertion({showDistances: true, showArea: false, closed: false})}
	));
	
	elToolbar.appendChild(createToolIcon(
		Potree.resourcePath + "/icons/area.svg",
		"[title]tt.area_measurement",
		function(){viewer.measuringTool.startInsertion({showDistances: true, showArea: true, closed: true})}
	));
	
	elToolbar.appendChild(createToolIcon(
		Potree.resourcePath + "/icons/volume.svg",
		"[title]tt.volume_measurement",
		function(){viewer.volumeTool.startInsertion()}
	));
	
	elToolbar.appendChild(createToolIcon(
		Potree.resourcePath + "/icons/profile.svg",
		"[title]tt.height_profile",
		function(){viewer.profileTool.startInsertion()}
	));
	
	elToolbar.appendChild(createToolIcon(
		Potree.resourcePath + "/icons/clip_volume.svg",
		"[title]tt.clip_volume",
		function(){viewer.volumeTool.startInsertion({clip: true})}
	));
	
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

	var updateHeightRange = function(){
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

	var options = [ 
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
	
	var elMaterialList = document.getElementById("optMaterial");
	for(var i = 0; i < options.length; i++){
		var option = options[i];
		
		var elOption = document.createElement("option");
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
}

function initClassificationList(){
	var addClassificationItem = function(code, name){
		var elClassificationList = document.getElementById("classificationList");
		
		var elLi = document.createElement("li");
		var elLabel = document.createElement("label");
		var elInput = document.createElement("input");
		var elText = document.createTextNode(" " + name);
		
		elInput.id = "chkClassification_" + code;
		elInput.type = "checkbox";
		elInput.checked = true;
		elInput.onclick = function(event){
			viewer.setClassificationVisibility(code, event.target.checked);
		}
		
		elLabel.style.whiteSpace = "nowrap";
		
		elClassificationList.appendChild(elLi);
		elLi.appendChild(elLabel);
		elLabel.appendChild(elInput);
		elLabel.appendChild(elText);
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
	$('#accordion').accordion({
		autoHeight: true,
		heightStyle: "content",
        collapsible:true,
        beforeActivate: function(event, ui) {
             // The accordion believes a panel is being opened
            if (ui.newHeader[0]) {
                var currHeader  = ui.newHeader;
                var currContent = currHeader.next('.ui-accordion-content');
             // The accordion believes a panel is being closed
            } else {
                var currHeader  = ui.oldHeader;
                var currContent = currHeader.next('.ui-accordion-content');
            }
             // Since we've changed the default behavior, this detects the actual status
            var isPanelSelected = currHeader.attr('aria-selected') == 'true';
            
             // Toggle the panel's header
            currHeader.toggleClass('ui-corner-all',isPanelSelected).toggleClass('accordion-header-active ui-state-active ui-corner-top',!isPanelSelected).attr('aria-selected',((!isPanelSelected).toString()));
            
            // Toggle the panel's icon
            currHeader.children('.ui-icon').toggleClass('ui-icon-triangle-1-e',isPanelSelected).toggleClass('ui-icon-triangle-1-s',!isPanelSelected);
            
             // Toggle the panel's content
            currContent.toggleClass('accordion-content-active',!isPanelSelected)    
            if (isPanelSelected) { currContent.slideUp(); }  else { currContent.slideDown(); }

            return false; // Cancels the default action
        }
    });
	
	//$("#accordion").accordion({ active: 2});
	//$("#accordion").accordion({ active: 3});
	//$("#accordion").accordion({ active: 4});
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

	var elNavigation = document.getElementById("navigation");
	
	elNavigation.appendChild(createToolIcon(
		Potree.resourcePath + "/icons/earth_controls_1.png",
        "[title]tt.earth_control",
		function(){viewer.useEarthControls()}
	));
	
	
	elNavigation.appendChild(createToolIcon(
		Potree.resourcePath + "/icons/fps_controls.png",
        "[title]tt.flight_control",
		function(){viewer.useFPSControls()}
	));
	
	elNavigation.appendChild(createToolIcon(
		Potree.resourcePath + "/icons/orbit_controls.svg",
		"[title]tt.orbit_control",
		function(){viewer.useOrbitControls()}
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
	
	var speedRange = new THREE.Vector2(1, 10*1000);
	
	var toLinearSpeed = function(value){
		return Math.pow(value, 4) * speedRange.y + speedRange.x;
	};
	
	var toExpSpeed = function(value){
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
	
	let trackAnnotation = (annotation) => {
		let elLi = document.createElement("li");
		let elItem = document.createElement("div");
		let elMain = document.createElement("span");
		let elLabel = document.createElement("span");
		
		elLi.appendChild(elItem);
		elItem.append(elMain);
		elMain.append(elLabel);
		annotationPanel.append(elLi);
		
		elItem.classList.add("annotation-item");
		
		elMain.style.display = "flex";
		elMain.classList.add("annotation-main");
		
		let elLabelText = document.createTextNode(annotation.ordinal);
		elLabel.appendChild(elLabelText);
		elLabel.classList.add("annotation-label");
		
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
		if(actions.length > 0){
			let action = actions[0];
			let elIcon = document.createElement("img");
			elIcon.src = action.icon;
			elIcon.classList.add("annotation-icon");
			elMain.appendChild(elIcon);
			elMain.onclick = (e) => {
				action.onclick(e);
			};
			
			elMain.onmouseover = (e) => {
				elIcon.style.opacity = 1;
			};
			
			elMain.onmouseout = (e) => {
				elIcon.style.opacity = 0.5;
			};
			
			actions.splice(0, 1);
		}
		
		// REMAINING ACTIONS
		for(let action of actions){
			let elIcon = document.createElement("img");
			elIcon.src = action.icon;
			elIcon.classList.add("annotation-icon");
			
			elIcon.onmouseover = (e) => {
				elIcon.style.opacity = 1;
			};
			
			elIcon.onmouseout = (e) => {
				elIcon.style.opacity = 0.5;
			};
			
			elIcon.onclick = (e) => {
				action.onclick(e);
			};
			
			elItem.appendChild(elIcon);
		}
		
		elItem.onmouseover = (e) => {
			annotation.setHighlighted(true);
			
		};
		elItem.onmouseout = (e) => {
			annotation.setHighlighted(false);
		};
		
		annotation.setHighlighted(false);
	};
	
	let annotationAddedCallback = (e) => {
		trackAnnotation(e.annotation);
	};
	
	let setScene = (e) => {
		
		annotationPanel.empty();
		
		if(e.oldScene){
			if(e.oldScene.dispatcher.hasEventListener("annotation_added", annotationAddedCallback)){
				e.oldScene.dispatcher.removeEventListener("annotation_added", annotationAddedCallback);
			}
		}
		
		if(e.scene){
			for(let annotation of e.scene.annotations){
				trackAnnotation(annotation);
			}
			
			e.scene.addEventListener("annotation_added", annotationAddedCallback);
		}
		
	};
	
	setScene({
		"scene": viewer.scene
	});
	
	viewer.dispatcher.addEventListener("scene_changed", setScene);
}

function initMeasurementDetails(){

	var id = 0;
	let trackedItems = new Map();
	
	var trackMeasurement = function(scene, measurement){
		id++;
		
		let track = {
			scene: scene,
			measurement: measurement,
			untrack: null
		};
		
		trackedItems.set(measurement, track);
	
		var elLi = document.createElement("li");
		var elPanel = document.createElement("div");
		var elPanelHeader = document.createElement("div");
		var elPanelBody = document.createElement("div");
		var elPanelIcon = document.createElement("img");
		var elPanelStretch = document.createElement("span");
		var elPanelRemove = document.createElement("img");
		
		elPanel.classList.add("potree-panel", "panel-default");
		elPanelHeader.classList.add("potree-panel-heading", "pv-panel-heading");
		
		if(measurement instanceof Potree.Measure){
			if(measurement.showDistances && !measurement.showArea && !measurement.showAngles){
				elPanelIcon.src = Potree.resourcePath + "/icons/distance.svg";
				elPanelStretch.innerHTML = "Distance";
			}else if(measurement.showDistances && measurement.showArea && !measurement.showAngles){
				elPanelIcon.src = Potree.resourcePath + "/icons/area.svg";
				elPanelStretch.innerHTML = "Area";
			}else if(measurement.maxMarkers === 1){
				elPanelIcon.src = Potree.resourcePath + "/icons/point.svg";
				elPanelStretch.innerHTML = "Coordinate";
			}else if(!measurement.showDistances && !measurement.showArea && measurement.showAngles){
				elPanelIcon.src = Potree.resourcePath + "/icons/angle.png";
				elPanelStretch.innerHTML = "Angle";
			}
			
			elPanelRemove.onclick = function(){scene.removeMeasurement(measurement);};
		} else if(measurement instanceof Potree.Profile){
			elPanelIcon.src = Potree.resourcePath + "/icons/profile.svg";
			elPanelStretch.innerHTML = "Profile";
			
			elPanelRemove.onclick = function(){scene.removeProfile(measurement);};
		} else if(measurement instanceof Potree.Volume){
			elPanelIcon.src = Potree.resourcePath + "/icons/volume.svg";
			elPanelStretch.innerHTML = "Volume";
			
			elPanelRemove.onclick = function(){scene.removeVolume(volume);};
		}
		
		elPanelIcon.style.width = "16px";
		elPanelIcon.style.height = "16px";
		elPanelStretch.style.flexGrow = 1;
		elPanelStretch.style.textAlign = "center";
		elPanelRemove.src = Potree.resourcePath + "/icons/remove.svg";
		elPanelRemove.style.width = "16px";
		elPanelRemove.style.height = "16px";
		elPanelBody.classList.add("panel-body");
		
		elLi.appendChild(elPanel);
		elPanel.appendChild(elPanelHeader);
		elPanelHeader.appendChild(elPanelIcon);
		elPanelHeader.appendChild(elPanelStretch);
		elPanelHeader.appendChild(elPanelRemove);
		elPanel.appendChild(elPanelBody);
		
		document.getElementById("measurement_details").appendChild(elLi);
		
		var widthListener;
		var updateDisplay = function(event){
		
			$(elPanelBody).empty();
			
			if(measurement instanceof Potree.Profile){
				var elLi = $('<li style="margin-bottom: 5px">');
				var elText = document.createTextNode("width: ");
				var elWidthLabel = $('<span id="lblProfileWidth_' + id + '">');
				var elWidthSlider = $('<div id="sldProfileWidth_' + id + '">');
				
				elWidthSlider.slider({
					value: Math.pow((measurement.getWidth() / 1000), 1/4).toFixed(3),
					min: 0,
					max: 1,
					step: 0.01,
					slide: function(event, ui){
						var val = Math.pow(ui.value, 4) * 1000;
						measurement.setWidth(val);
					}
				});
				if(measurement.getWidth()){
					elWidthLabel.html(Potree.utils.addCommas(measurement.getWidth().toFixed(3)));
				}else{
					elWidthLabel.html("-");
				}
				
				widthListener = function(event){
					var val = Math.pow((event.width / 1000), 1/4);
					elWidthLabel.html(Potree.utils.addCommas(event.width.toFixed(3)));
					elWidthSlider.slider({value: val});
				};
				if(!measurement.dispatcher.hasEventListener("width_changed", widthListener)){
					measurement.dispatcher.addEventListener("width_changed", widthListener);
				}
				
				elLi.append(elText);
				elLi.append(elWidthLabel);
				elLi.append(elWidthSlider);
				
				elPanelBody.appendChild(elLi[0]);
			}
			
			var positions = [];
			var points;
			
			if(measurement instanceof Potree.Measure){
				points = measurement.points;
				for(var i = 0; i < points.length; i++){
					positions.push(points[i].position);
				}
			} else if(measurement instanceof Potree.Profile){
				positions = measurement.points;
			}
			
			for(var i = 0; i < positions.length; i++){
				// TODO clean this up from the toGeo legacy
				var point = positions[i];
				var geoCoord = point;
	
				var txt = geoCoord.x.toFixed(2) + ", ";
				txt += (geoCoord.y).toFixed(2) + ", ";
				txt += geoCoord.z.toFixed(2);
				
				var elNodeMarker = $('<div>').addClass("measurement-detail-node-marker");
				elNodeMarker.html(txt);
				
				$(elPanelBody).append(elNodeMarker);
				
				if(i < positions.length - 1){
					if(measurement && measurement.showDistances){
						
						var elEdge = $('<div>').addClass("measurement-detail-edge");
						$(elPanelBody).append(elEdge);
						
						var nextPoint = positions[i+1];
						var nextGeo = nextPoint;
						var distance = nextGeo.distanceTo(geoCoord);
						var txt = Potree.utils.addCommas(distance.toFixed(2));
						
						var elNodeDistance = $('<div>').addClass("measurement-detail-node-distance");
						elNodeDistance.html(txt);
						
						$(elPanelBody).append(elNodeDistance);
						
					}
				}
				
				if(measurement && measurement.showAngles){
					var elEdge = $('<div>').addClass("measurement-detail-edge");
					$(elPanelBody).append(elEdge);
					
					var angle = measurement.getAngle(i);
					var txt = Potree.utils.addCommas((angle*(180.0/Math.PI)).toFixed(1)) + '\u00B0';
					var elNodeAngle = $('<div>').addClass("measurement-detail-node-angle");
					elNodeAngle.html(txt);
					$(elPanelBody).append(elNodeAngle);
				}
				
				if(i < positions.length - 1){
					var elEdge = $('<div>').addClass("measurement-detail-edge");
					$(elPanelBody).append(elEdge);
				}
			}
			
			if(points && points.length === 1){
				var point = points[0];
				
				var elTable = $('<table>').css("width", "100%");
				$(elPanelBody).append(elTable);
				
				if(point.color){
					var color = point.color;
					
					var elTr = $('<tr>');
					var elKey = $('<td>').css("padding", "1px 5px");
					var elValue = $('<td>').css("width", "100%").css("padding", "1px 5px");
					
					var value = parseInt(color[0]) 
						+ ", " + parseInt(color[1]) 
						+ ", " + parseInt(color[2]);
					
					elKey.html("rgb");
					elValue.html(value);
					
					elTable.append(elTr);
					elTr.append(elKey);
					elTr.append(elValue);
				}
				
				if(typeof point.intensity !== "undefined"){
					var intensity = point.intensity;
					
					var elTr = $('<tr>');
					var elKey = $('<td>').css("padding", "1px 5px");
					var elValue = $('<td>').css("width", "100%").css("padding", "1px 5px");
					
					elKey.html("intensity");
					elValue.html(intensity);
					
					elTable.append(elTr);
					elTr.append(elKey);
					elTr.append(elValue);
				}
				
				if(typeof point.classification !== "undefined"){
					var classification = point.classification;
					
					var elTr = $('<tr>');
					var elKey = $('<td>').css("padding", "1px 5px");
					var elValue = $('<td>').css("width", "100%").css("padding", "1px 5px");
					
					elKey.html("classification");
					elValue.html(classification);
					
					elTable.append(elTr);
					elTr.append(elKey);
					elTr.append(elValue);
				}
				
				if(typeof point.returnNumber !== "undefined"){
					var returnNumber = point.returnNumber;
					
					var elTr = $('<tr>');
					var elKey = $('<td>').css("padding", "1px 5px");
					var elValue = $('<td>').css("width", "100%").css("padding", "1px 5px");
					
					elKey.html("return nr.");
					elValue.html(returnNumber);
					
					elTable.append(elTr);
					elTr.append(elKey);
					elTr.append(elValue);
				}
				
				if(typeof point.pointSourceID !== "undefined"){
					var source = point.pointSourceID;
					
					var elTr = $('<tr>');
					var elKey = $('<td>').css("padding", "1px 5px");
					var elValue = $('<td>').css("width", "100%").css("padding", "1px 5px");
					
					elKey.html("source");
					elValue.html(source);
					
					elTable.append(elTr);
					elTr.append(elKey);
					elTr.append(elValue);
				}
				
				
			}
			
			if(measurement && measurement.showArea){
				var txt = Potree.utils.addCommas(measurement.getArea().toFixed(1)) + "²";
				
				var elNodeArea = $('<div>').addClass("measurement-detail-node-area");
				elNodeArea.html(txt);
				
				$(elPanelBody).append(elNodeArea);
			}
			
			if(measurement instanceof Potree.Profile){
				var elOpenProfileWindow = $('<input type="button" value="show 2d profile">')
					.addClass("measurement-detail-button");
				elOpenProfileWindow[0].onclick = function(){
					viewer._2dprofile.show();
					viewer._2dprofile.draw(measurement);
				};
				$(elPanelBody).append(elOpenProfileWindow);
			}
		};
		
		updateDisplay();
		
		if(measurement instanceof Potree.Measure){
			let onremove = function(event){
				if(event.measurement === measurement){
					scene.dispatcher.removeEventListener("marker_added", updateDisplay);
					scene.dispatcher.removeEventListener("marker_removed", updateDisplay);
					scene.dispatcher.removeEventListener("marker_moved", updateDisplay);
					$(elLi).remove();
				}
			};
		
			measurement.dispatcher.addEventListener("marker_added", updateDisplay);
			measurement.dispatcher.addEventListener("marker_removed", updateDisplay);
			measurement.dispatcher.addEventListener("marker_moved", updateDisplay);
			scene.addEventListener("measurement_removed", onremove);
			
			track.stopTracking = (e) => {
				measurement.dispatcher.removeEventListener("marker_added", updateDisplay);
				measurement.dispatcher.removeEventListener("marker_removed", updateDisplay);
				measurement.dispatcher.removeEventListener("marker_moved", updateDisplay);
				scene.dispatcher.removeEventListener("measurement_added", onremove);
				scene.dispatcher.removeEventListener("measurement_removed", onremove);
			};
		} else if(measurement instanceof Potree.Profile){
			let onremove = function(event){
				if(event.profile === measurement){
					scene.dispatcher.removeEventListener("marker_added", updateDisplay);
					scene.dispatcher.removeEventListener("marker_removed", updateDisplay);
					scene.dispatcher.removeEventListener("marker_moved", updateDisplay);
					$(elLi).remove();
				}
			};
		
			measurement.dispatcher.addEventListener("marker_added", updateDisplay);
			measurement.dispatcher.addEventListener("marker_removed", updateDisplay);
			measurement.dispatcher.addEventListener("marker_moved", updateDisplay);
			scene.addEventListener("profile_removed", onremove);
			
			track.stopTracking = (e) => {
				measurement.dispatcher.removeEventListener("marker_added", updateDisplay);
				measurement.dispatcher.removeEventListener("marker_removed", updateDisplay);
				measurement.dispatcher.removeEventListener("marker_moved", updateDisplay);
				scene.dispatcher.removeEventListener("profile_added", onremove);
				scene.dispatcher.removeEventListener("profile_removed", onremove);
			};
		}
		
	};
	
	let scenelistener = (e) => {
		if(e.measurement){
			trackMeasurement(e.scene, e.measurement);
		} else if(e.profile){
			trackMeasurement(e.scene, e.profile);
		}
	};
	
	let trackScene = (scene) => {
		$("#measurement_details").empty();
		
		trackedItems.forEach(function(trackedItem, key, map){
			trackedItem.stopTracking();
		});
		
		for(var i = 0; i < scene.measurements.length; i++){
			trackMeasurement(scene, scene.measurements[i]);
		}
		
		for(var i = 0; i < scene.profiles.length; i++){
			trackMeasurement(scene, scene.profiles[i]);
		}
		
		if(!scene.dispatcher.hasEventListener("measurement_added", scenelistener)){
			scene.dispatcher.addEventListener("measurement_added", scenelistener);
		}
		
		if(!scene.dispatcher.hasEventListener("profile_added", scenelistener)){
			scene.dispatcher.addEventListener("profile_added", scenelistener);
		}
	};
	
	trackScene(viewer.scene);
	
	viewer.addEventListener("scene_changed", (e) => {trackScene(e.scene)});
};

function initSceneList(){

	var scenelist = $('#sceneList');
	
	var id = 0;
	// this works but it looks so wrong. any better way to create a closure around pointcloud?
	var addPointcloud = function(pointcloud){
		(function(pointcloud){
			var elLi = $('<li>');
			var elLabel = $('<label>');
			var elInput = $('<input type="checkbox">');
			
			elInput[0].checked = true;
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
			var pointcloudName = " " + (pointcloud.name ? pointcloud.name : "point cloud " + id);
			var elPointCloudName = document.createTextNode(pointcloudName);
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
	
	for(var i = 0; i < viewer.scene.pointclouds.length; i++){
		var pointcloud = viewer.scene.pointclouds[i];
		addPointcloud(pointcloud);
	}
	
	viewer.addEventListener("scene_changed", (e) => {
		scenelist.empty();
		
		let scene = e.scene;
		for(var i = 0; i < scene.pointclouds.length; i++){
			var pointcloud = scene.pointclouds[i];
			addPointcloud(pointcloud);
		}
	});
	
	// TODO update scene list on scene switch
	viewer.addEventListener("pointcloud_loaded", function(event){
		addPointcloud(event.pointcloud);
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
	
	
	var toClipModeCode = function(string){
		if(string === "No Clipping"){
			return Potree.ClipMode.DISABLED;
		}else if(string === "Highlight Inside"){
			return Potree.ClipMode.HIGHLIGHT_INSIDE;
		}else if(string === "Clip Outside"){
			return Potree.ClipMode.CLIP_OUTSIDE;
		}
	};
	
	var toClipModeString = function(code){
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
};


$(document).ready( function() {
    
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
	
});