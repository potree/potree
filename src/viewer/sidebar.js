initSidebar = (viewer) => {
	let createToolIcon = function (icon, title, callback) {
		let element = $(`
			<img src="${icon}"
				style="width: 32px; height: 32px"
				class="button-icon"
				data-i18n="${title}" />
		`);

		element.click(callback);

		return element;
	};

	function initToolbar () {
		// ANGLE
		let elToolbar = $('#tools');
		elToolbar.append(createToolIcon(
			Potree.resourcePath + '/icons/angle.png',
			'[title]tt.angle_measurement',
			function () {
				$('#menu_measurements').next().slideDown();
				viewer.measuringTool.startInsertion({
					showDistances: false,
					showAngles: true,
					showArea: false,
					closed: true,
					maxMarkers: 3,
					name: 'Angle'});
			}
		));

		// POINT
		elToolbar.append(createToolIcon(
			Potree.resourcePath + '/icons/point.svg',
			'[title]tt.point_measurement',
			function () {
				$('#menu_measurements').next().slideDown();
				viewer.measuringTool.startInsertion({
					showDistances: false,
					showAngles: false,
					showCoordinates: true,
					showArea: false,
					closed: true,
					maxMarkers: 1,
					name: 'Point'});
			}
		));

		// DISTANCE
		elToolbar.append(createToolIcon(
			Potree.resourcePath + '/icons/distance.svg',
			'[title]tt.distance_measurement',
			function () {
				$('#menu_measurements').next().slideDown();
				viewer.measuringTool.startInsertion({
					showDistances: true,
					showArea: false,
					closed: false,
					name: 'Distance'});
			}
		));

		// HEIGHT
		elToolbar.append(createToolIcon(
			Potree.resourcePath + '/icons/height.svg',
			'[title]tt.height_measurement',
			function () {
				$('#menu_measurements').next().slideDown();
				viewer.measuringTool.startInsertion({
					showDistances: false,
					showHeight: true,
					showArea: false,
					closed: false,
					maxMarkers: 2,
					name: 'Height'});
			}
		));

		// AREA
		elToolbar.append(createToolIcon(
			Potree.resourcePath + '/icons/area.svg',
			'[title]tt.area_measurement',
			function () {
				$('#menu_measurements').next().slideDown();
				viewer.measuringTool.startInsertion({
					showDistances: true,
					showArea: true,
					closed: true,
					name: 'Area'});
			}
		));

		// VOLUME
		elToolbar.append(createToolIcon(
			Potree.resourcePath + '/icons/volume.svg',
			'[title]tt.volume_measurement',
			function () { viewer.volumeTool.startInsertion(); }
		));

		// PROFILE
		elToolbar.append(createToolIcon(
			Potree.resourcePath + '/icons/profile.svg',
			'[title]tt.height_profile',
			function () {
				$('#menu_measurements').next().slideDown(); ;
				viewer.profileTool.startInsertion();
			}
		));

		// REMOVE ALL
		elToolbar.append(createToolIcon(
			Potree.resourcePath + '/icons/reset_tools.svg',
			'[title]tt.remove_all_measurement',
			function () {
				viewer.scene.removeAllMeasurements();
			}
		));
	}

	function initScene(){

		let elScene = $("#menu_scene");
		let elObjects = elScene.find("#scene_objects");
		let elProperties = elScene.find("#scene_object_properties");
		
		
	}

	function initClippingTool() {

		$("#optClipMode").selectmenu();
		$("#optClipMode").val(1).selectmenu("refresh");
		$("#optClipMode").selectmenu({
			change: function(event, ui){
				viewer.clippingTool.setClipMode(parseInt(ui.item.value));
			}
		});

		//viewer.addEventListener("clipper.clipMode_changed", function(event){		
		//	$("#optClipMode").val(viewer.clippingTool.clipMode).selectmenu("refresh");
		//});


		let clippingToolBar = $("#clipping_tools");

		// CLIP VOLUME
		clippingToolBar.append(createToolIcon(
			Potree.resourcePath + '/icons/clip_volume.svg',
			'[title]tt.clip_volume',
			function () { viewer.volumeTool.startInsertion({clip: true}); }
		));

		// CLIP POLYGON
		clippingToolBar.append(createToolIcon(
			Potree.resourcePath + "/icons/clip-polygon.svg",
			"[title]tt.clip_polygon",
			function(){
				viewer.clippingTool.startInsertion({type: "polygon"});
			}
		));

	}

	function initClassificationList () {
		let elClassificationList = $('#classificationList');

		let addClassificationItem = function (code, name) {
			let inputID = 'chkClassification_' + code;

			let element = $(`
				<li>
					<label style="whitespace: nowrap">
						<input id="${inputID}" type="checkbox" checked/>
						<span>${name}</span>
					</label>
				</li>
			`);

			let elInput = element.find('input');

			elInput.click(event => {
				viewer.setClassificationVisibility(code, event.target.checked);
			});

			elClassificationList.append(element);
		};

		addClassificationItem(0, 'never classified');
		addClassificationItem(1, 'unclassified');
		addClassificationItem(2, 'ground');
		addClassificationItem(3, 'low vegetation');
		addClassificationItem(4, 'medium vegetation');
		addClassificationItem(5, 'high vegetation');
		addClassificationItem(6, 'building');
		addClassificationItem(7, 'low point(noise)');
		addClassificationItem(8, 'key-point');
		addClassificationItem(9, 'water');
		addClassificationItem(12, 'overlap');
	}

	function initAccordion () {
		$('.accordion > h3').each(function () {
			let header = $(this);
			let content = $(this).next();

			header.addClass('accordion-header ui-widget');
			content.addClass('accordion-content ui-widget');

			content.hide();

			header.click(function () {
				content.slideToggle();
			});
		});

		let languages = [
			["EN", "en"],
			["FR", "fr"],
			["DE", "de"],
			["JP", "jp"]
		];

		let elLanguages = $('#potree_languages');
		for(let i = 0; i < languages.length; i++){
			let [key, value] = languages[i];
			let element = $(`<a>${key}</a>`);
			element.click(() => viewer.setLanguage(value));

			if(i === 0){
				element.css("margin-left", "30px");
			}
			
			elLanguages.append(element);

			if(i < languages.length - 1){
				elLanguages.append($(document.createTextNode(' - ')));	
			}
		}


		// to close all, call
		// $(".accordion > div").hide()

		// to open the, for example, tool menu, call:
		// $("#menu_tools").next().show()
	}

	function initAppearance () {
		// $( "#optQuality" ).selectmenu();

		// $("#optQuality").val(viewer.getQuality()).selectmenu("refresh")
		// $("#optQuality").selectmenu({
		//	change: function(event, ui){
		//		viewer.setQuality(ui.item.value);
		//	}
		// });

		$('#sldPointBudget').slider({
			value: viewer.getPointBudget(),
			min: 100 * 1000,
			max: 5 * 1000 * 1000,
			step: 1000,
			slide: function (event, ui) { viewer.setPointBudget(ui.value); }
		});

		$('#sldFOV').slider({
			value: viewer.getFOV(),
			min: 20,
			max: 100,
			step: 1,
			slide: function (event, ui) { viewer.setFOV(ui.value); }
		});

		$('#sldEDLRadius').slider({
			value: viewer.getEDLRadius(),
			min: 1,
			max: 4,
			step: 0.01,
			slide: function (event, ui) { viewer.setEDLRadius(ui.value); }
		});

		$('#sldEDLStrength').slider({
			value: viewer.getEDLStrength(),
			min: 0,
			max: 5,
			step: 0.01,
			slide: function (event, ui) { viewer.setEDLStrength(ui.value); }
		});

		viewer.addEventListener('point_budget_changed', function (event) {
			$('#lblPointBudget')[0].innerHTML = Potree.utils.addCommas(viewer.getPointBudget());
			$('#sldPointBudget').slider({value: viewer.getPointBudget()});
		});

		viewer.addEventListener('fov_changed', function (event) {
			$('#lblFOV')[0].innerHTML = parseInt(viewer.getFOV());
			$('#sldFOV').slider({value: viewer.getFOV()});
		});

		// viewer.addEventListener("quality_changed", e => {
		//
		//	let name = viewer.quality;
		//
		//	$( "#optQuality" )
		//		.selectmenu()
		//		.val(name)
		//		.selectmenu("refresh");
		// });

		viewer.addEventListener('edl_radius_changed', function (event) {
			$('#lblEDLRadius')[0].innerHTML = viewer.getEDLRadius().toFixed(1);
			$('#sldEDLRadius').slider({value: viewer.getEDLRadius()});
		});

		viewer.addEventListener('edl_strength_changed', function (event) {
			$('#lblEDLStrength')[0].innerHTML = viewer.getEDLStrength().toFixed(1);
			$('#sldEDLStrength').slider({value: viewer.getEDLStrength()});
		});

		viewer.addEventListener('background_changed', function (event) {
			$("input[name=background][value='" + viewer.getBackground() + "']").prop('checked', true);
		});

		$('#lblPointBudget')[0].innerHTML = Potree.utils.addCommas(viewer.getPointBudget());
		$('#lblFOV')[0].innerHTML = parseInt(viewer.getFOV());
		$('#lblEDLRadius')[0].innerHTML = viewer.getEDLRadius().toFixed(1);
		$('#lblEDLStrength')[0].innerHTML = viewer.getEDLStrength().toFixed(1);
		$('#chkEDLEnabled')[0].checked = viewer.getEDLEnabled();
		$("input[name=background][value='" + viewer.getBackground() + "']").prop('checked', true);

		$("input[name=background]").click(function(){
			viewer.setBackground(this.value);
		});

		$('#chkEDLEnabled').click( () => {
			viewer.setEDLEnabled($('#chkEDLEnabled').prop("checked"));
		});
	}

	function initNavigation () {
		let elNavigation = $('#navigation');
		let sldMoveSpeed = $('#sldMoveSpeed');
		let lblMoveSpeed = $('#lblMoveSpeed');

		elNavigation.append(createToolIcon(
			Potree.resourcePath + '/icons/earth_controls_1.png',
			'[title]tt.earth_control',
			function () { viewer.setNavigationMode(Potree.EarthControls); }
		));

		elNavigation.append(createToolIcon(
			Potree.resourcePath + '/icons/fps_controls.png',
			'[title]tt.flight_control',
			function () { viewer.setNavigationMode(Potree.FirstPersonControls); }
		));

		elNavigation.append(createToolIcon(
			Potree.resourcePath + '/icons/orbit_controls.svg',
			'[title]tt.orbit_control',
			function () { viewer.setNavigationMode(Potree.OrbitControls); }
		));

		elNavigation.append(createToolIcon(
			Potree.resourcePath + '/icons/focus.svg',
			'[title]tt.focus_control',
			function () { viewer.fitToScreen(); }
		));

		elNavigation.append(createToolIcon(
			Potree.resourcePath + '/icons/topview.svg',
			'[title]tt.top_view_control',
			function () { viewer.setTopView(); }
		));

		elNavigation.append(createToolIcon(
			Potree.resourcePath + '/icons/frontview.svg',
			'[title]tt.front_view_control',
			function () { viewer.setFrontView(); }
		));

		elNavigation.append(createToolIcon(
			Potree.resourcePath + '/icons/leftview.svg',
			'[title]tt.left_view_control',
			function () { viewer.setLeftView(); }
		));
		
		elNavigation.append(createToolIcon(
			Potree.resourcePath + "/icons/navigation_cube.svg",
			"[title]tt.navigation_cube_control",
			function(){viewer.toggleNavigationCube()}
		));

		elNavigation.append(createToolIcon(
			Potree.resourcePath + "/icons/perspective-camera.svg",
			"[title]tt.perspective_camera_control",
			function(){viewer.switchCameraMode(Potree.CameraMode.PERSPECTIVE)}
		));

		elNavigation.append(createToolIcon(
			Potree.resourcePath + "/icons/orthographic-camera.svg",
			"[title]tt.orthographic_camera_control",
			function(){viewer.switchCameraMode(Potree.CameraMode.ORTHOGRAPHIC)}
		));

		let speedRange = new THREE.Vector2(1, 10 * 1000);

		let toLinearSpeed = function (value) {
			return Math.pow(value, 4) * speedRange.y + speedRange.x;
		};

		let toExpSpeed = function (value) {
			return Math.pow((value - speedRange.x) / speedRange.y, 1 / 4);
		};

		sldMoveSpeed.slider({
			value: toExpSpeed(viewer.getMoveSpeed()),
			min: 0,
			max: 1,
			step: 0.01,
			slide: function (event, ui) { viewer.setMoveSpeed(toLinearSpeed(ui.value)); }
		});

		viewer.addEventListener('move_speed_changed', function (event) {
			lblMoveSpeed.html(viewer.getMoveSpeed().toFixed(1));
			sldMoveSpeed.slider({value: toExpSpeed(viewer.getMoveSpeed())});
		});

		lblMoveSpeed.html(viewer.getMoveSpeed().toFixed(1));
	}


	let initSettings = function () {
		$('#sldMinNodeSize').slider({
			value: viewer.getMinNodeSize(),
			min: 0,
			max: 1000,
			step: 0.01,
			slide: function (event, ui) { viewer.setMinNodeSize(ui.value); }
		});

		viewer.addEventListener('minnodesize_changed', function (event) {
			$('#lblMinNodeSize').html(parseInt(viewer.getMinNodeSize()));
			$('#sldMinNodeSize').slider({value: viewer.getMinNodeSize()});
		});
		$('#lblMinNodeSize').html(parseInt(viewer.getMinNodeSize()));

		$('#show_bounding_box').click(() => {
			viewer.setShowBoundingBox($('#show_bounding_box').prop("checked"));
		});

		$('#set_freeze').click(function(){
			viewer.setFreeze($('#set_freeze').prop("checked"));
		});
		

		
	};

	initAccordion();
	initAppearance();
	initToolbar();
	initScene();
	initNavigation();
	initClassificationList();
	initClippingTool();
	initSettings();
	
	$('#potree_version_number').html(Potree.version.major + "." + Potree.version.minor + Potree.version.suffix);
	$('.perfect_scrollbar').perfectScrollbar();
};
