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

		// CLIP VOLUME
		elToolbar.append(createToolIcon(
			Potree.resourcePath + '/icons/clip_volume.svg',
			'[title]tt.clip_volume',
			function () { viewer.volumeTool.startInsertion({clip: true}); }
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

	function initAnnotationDetails () {
		// annotation_details
		let annotationPanel = $('#annotation_details');

		let registeredEvents = [];

		let rebuild = () => {
			annotationPanel.empty();
			for (let registeredEvent of registeredEvents) {
				let {type, dispatcher, callback} = registeredEvent;
				dispatcher.removeEventListener(type, callback);
			}
			registeredEvents = [];

			let checked = viewer.getShowAnnotations() ? 'checked' : '';

			let chkEnable = $(`
				<li>
					<label>
						<input type="checkbox" id="chkShowAnnotations" ${checked}
							onClick="viewer.setShowAnnotations(this.checked)"/>
						<span data-i18n="annotations.show3D"></span>
					</label>
					<label>
						<input type="checkbox" id="chkShowAnnotationsMap" ${checked}
							onClick="viewer.mapView.getAnnotationsLayer().setVisible(this.checked)"/>
						<span data-i18n="annotations.showMap"></span>
					</label>
				</li>
			`);
			annotationPanel.append(chkEnable);

			// let stack = viewer.scene.annotations.children.reverse().map(
			//	a => ({annotation: a, container: annotationPanel}));

			let stack = viewer.scene.annotations.children.map(
				a => ({annotation: a, container: annotationPanel}));

			while (stack.length > 0) {
				let {annotation, container} = stack.shift();

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

				let elMain = element.find('.annotation-main');
				let elExpand = element.find('.annotation-expand');

				elExpand.css('display', annotation.children.length > 0 ? 'block' : 'none');

				let actions = [];
				{ // ACTIONS, INCLUDING GOTO LOCATION
					if (annotation.hasView()) {
						let action = new Potree.Action({
							'icon': Potree.resourcePath + '/icons/target.svg',
							'onclick': (e) => { annotation.moveHere(viewer.scene.camera); }
						});

						actions.push(action);
					}
				}

				for (let action of annotation.actions) {
					actions.push(action);
				}

				actions = actions.filter(
					a => a.showIn === undefined || a.showIn.includes('sidebar'));

				// FIRST ACTION
				if (annotation.children.length === 0 && actions.length > 0) {
					let action = actions[0];

					let elIcon = $(`<img src="${action.icon}" class="annotation-icon">`);

					if (action.tooltip) {
						elIcon.attr('title', action.tooltip);
					}

					elMain.append(elIcon);
					elMain.click(e => action.onclick({annotation: annotation}));
					elMain.mouseover(e => elIcon.css('opacity', 1));
					elMain.mouseout(e => elIcon.css('opacity', 0.5));

					{
						let iconChanged = e => {
							elIcon.attr('src', e.icon);
						};

						action.addEventListener('icon_changed', iconChanged);
						registeredEvents.push({
							type: 'icon_changed',
							dispatcher: action,
							callback: iconChanged
						});
					}

					actions.splice(0, 1);
				}

				// REMAINING ACTIONS
				for (let action of actions) {
					let elIcon = $(`<img src="${action.icon}" class="annotation-icon">`);

					if (action.tooltip) {
						elIcon.attr('title', action.tooltip);
					}

					elIcon.click(e => {
						action.onclick({annotation: annotation});
						return false;
					});
					elIcon.mouseover(e => elIcon.css('opacity', 1));
					elIcon.mouseout(e => elIcon.css('opacity', 0.5));

					{
						let iconChanged = e => {
							elIcon.attr('src', e.icon);
						};

						action.addEventListener('icon_changed', iconChanged);
						registeredEvents.push({
							type: 'icon_changed',
							dispatcher: action,
							callback: iconChanged
						});
					}

					element.append(elIcon);
				}

				element.mouseover(e => annotation.setHighlighted(true));
				element.mouseout(e => annotation.setHighlighted(false));

				annotation.setHighlighted(false);

				container.append(element);

				if (annotation.children.length > 0) {
					element.click(e => {
						if (element.next().is(':visible')) {
							elExpand.html('\u25BA');
						} else {
							elExpand.html('\u25BC');
						}

						element.next().toggle(100);
					});

					// let left = ((annotation.level()) * 20) + "px";
					let left = '20px';
					let childContainer = $(`<div style="margin: 0px; padding: 0px 0px 0px ${left}; display: none"></div>`);
					for (let child of annotation.children) {
						container.append(childContainer);
						stack.push({annotation: child, container: childContainer});
					}
				}
			};

			annotationPanel.i18n();
		};

		let annotationsChanged = e => {
			rebuild();
		};

		viewer.addEventListener('scene_changed', e => {
			e.oldScene.annotations.removeEventListener('annotation_added', annotationsChanged);
			e.scene.annotations.addEventListener('annotation_added', annotationsChanged);

			rebuild();
		});

		viewer.scene.annotations.addEventListener('annotation_added', annotationsChanged);

		rebuild();
	}

	function initMeasurementDetails () {
		let trackedItems = new Map();

		let removeIconPath = Potree.resourcePath + '/icons/remove.svg';
		let mlist = $('#measurement_list');

		let createCoordinatesTable = (measurement) => {
			let table = $(`
				<table class="measurement_value_table">
					<tr>
						<th>x</th>
						<th>y</th>
						<th>z</th>
					</tr>
				</table>
			`);

			for (let point of measurement.points) {
				let position = point instanceof THREE.Vector3 ? point : point.position;

				let x = Potree.utils.addCommas(position.x.toFixed(3));
				let y = Potree.utils.addCommas(position.y.toFixed(3));
				let z = Potree.utils.addCommas(position.z.toFixed(3));

				let row = $(`
					<tr>
						<td><span>${x}</span></td>
						<td><span>${y}</span></td>
						<td><span>${z}</span></td>
					</tr>
				`);

				table.append(row);
			}

			return table;
		};

		let createAttributesTable = (measurement) => {
			let elTable = $('<table class="measurement_value_table"></table>');

			let point = measurement.points[0];

			if (point.color) {
				let color = point.color;
				let text = color.join(', ');

				elTable.append($(`
					<tr>
						<td>rgb</td>
						<td>${text}</td>
					</tr>
				`));
			}

			return elTable;
		};

		class MeasurePanel {
			constructor (scene, measurement) {
				this.scene = scene;
				this.measurement = measurement;
				this.icon = null;

				this.constructor.counter = (this.constructor.counter === undefined) ? 0 : this.constructor.counter + 1;
				this.id = this.constructor.counter;

				let title = measurement.name;

				this.elPanel = $(`
					<span class="measurement_item">
						<!-- HEADER -->
						<div class="measurement_header" onclick="$(this).next().slideToggle(200)">
							<span class="measurement_icon"><img src="" class="measurement_item_icon" /></span>
							<span class="measurement_header_title">${title}</span>
						</div>

						<!-- DETAIL -->
						<div class="measurement_content selectable" style="display: none">

						</div>
					</span>
				`);

				this.elContentContainer = this.elPanel.find('.measurement_content');
				this.elIcon = this.elPanel.find('.measurement_item_icon');

				this._update = () => { this.update(); };
			}

			destroy () {

			}

			update () {

			}
		};

		class DistancePanel extends MeasurePanel {
			constructor (scene, measurement) {
				super(scene, measurement);

				this.typename = 'Distance';
				this.icon = Potree.resourcePath + '/icons/distance.svg';
				this.elIcon.attr('src', this.icon);

				this.elContent = $(`
					<div>
						<span class="coordinates_table_container"></span>



						<br>
						<table id="distances_table_${this.id}" class="measurement_value_table">
						</table>

						<!-- ACTIONS -->
						<div style="display: flex; margin-top: 12px">
							<span></span>
							<span style="flex-grow: 1"></span>
							<img class="measurement_action_remove" src="${removeIconPath}" style="width: 16px; height: 16px"/>
						</div>
					</div>
				`);
				this.elContentContainer.append(this.elContent);

				let elRemove = this.elContent.find('.measurement_action_remove');
				elRemove.click(() => { this.scene.removeMeasurement(measurement); });

				this.measurement.addEventListener('marker_added', this._update);
				this.measurement.addEventListener('marker_removed', this._update);
				this.measurement.addEventListener('marker_moved', this._update);

				this.update();
			}

			update () {
				let elCoordiantesContainer = this.elContent.find('.coordinates_table_container');
				elCoordiantesContainer.empty();
				elCoordiantesContainer.append(createCoordinatesTable(this.measurement));

				let positions = this.measurement.points.map(p => p.position);
				let distances = [];
				for (let i = 0; i < positions.length - 1; i++) {
					let d = positions[i].distanceTo(positions[i + 1]);
					distances.push(d.toFixed(3));
				}

				let totalDistance = this.measurement.getTotalDistance().toFixed(3);
				let elDistanceTable = this.elContent.find(`#distances_table_${this.id}`);
				elDistanceTable.empty();

				for (let i = 0; i < distances.length; i++) {
					let label = (i === 0) ? 'Distances: ' : '';
					let distance = distances[i];
					let elDistance = $(`
						<tr>
							<th>${label}</th>
							<td style="width: 100%; padding-left: 10px">${distance}</td>
						</tr>`);
					elDistanceTable.append(elDistance);
				}

				let elTotal = $(`
					<tr>
						<th>Total: </td><td style="width: 100%; padding-left: 10px">${totalDistance}</th>
					</tr>`);
				elDistanceTable.append(elTotal);

				// let elDistance = this.elContent.find(`#distance_${this.id}`);
				// elDistance.html(totalDistance);
			}

			destroy () {
				this.elPanel.remove();

				this.measurement.removeEventListener('marker_added', this._update);
				this.measurement.removeEventListener('marker_removed', this._update);
				this.measurement.removeEventListener('marker_moved', this._update);
			}
		};

		class PointPanel extends MeasurePanel {
			constructor (scene, measurement) {
				super(scene, measurement);

				this.typename = 'Point';
				this.icon = Potree.resourcePath + '/icons/point.svg';

				this.elIcon.attr('src', this.icon);

				this.elContent = $(`
					<div>
						<span class="coordinates_table_container"></span>

						<br>

						<span class="attributes_table_container"></span>


						<!-- ACTIONS -->
						<div style="display: flex; margin-top: 12px">
							<span></span>
							<span style="flex-grow: 1"></span>
							<img class="measurement_action_remove" src="${removeIconPath}" style="width: 16px; height: 16px"/>
						</div>
					</div>
				`);
				this.elContentContainer.append(this.elContent);

				let elRemove = this.elContent.find('.measurement_action_remove');
				elRemove.click(() => { this.scene.removeMeasurement(measurement); });

				this.measurement.addEventListener('marker_added', this._update);
				this.measurement.addEventListener('marker_removed', this._update);
				this.measurement.addEventListener('marker_moved', this._update);

				this.update();
			}

			update () {
				let elCoordiantesContainer = this.elContent.find('.coordinates_table_container');
				elCoordiantesContainer.empty();
				elCoordiantesContainer.append(createCoordinatesTable(this.measurement));

				let elAttributesContainer = this.elContent.find('.attributes_table_container');
				elAttributesContainer.empty();
				elAttributesContainer.append(createAttributesTable(this.measurement));
			}

			destroy () {
				this.elPanel.remove();

				this.measurement.removeEventListener('marker_added', this._update);
				this.measurement.removeEventListener('marker_removed', this._update);
				this.measurement.removeEventListener('marker_moved', this._update);
			}
		};

		class AreaPanel extends MeasurePanel {
			constructor (scene, measurement) {
				super(scene, measurement);

				this.typename = 'Area';
				this.icon = Potree.resourcePath + '/icons/area.svg';

				this.elIcon.attr('src', this.icon);

				this.elContent = $(`
					<div>
						<span class="coordinates_table_container"></span>

						<br>

						<span style="font-weight: bold">Area: </span>
						<span id="measurement_area_${this.id}"></span>

						<!-- ACTIONS -->
						<div style="display: flex; margin-top: 12px">
							<span></span>
							<span style="flex-grow: 1"></span>
							<img class="measurement_action_remove" src="${removeIconPath}" style="width: 16px; height: 16px"/>
						</div>
					</div>
				`);
				this.elContentContainer.append(this.elContent);

				let elRemove = this.elContent.find('.measurement_action_remove');
				elRemove.click(() => { this.scene.removeMeasurement(measurement); });

				this.measurement.addEventListener('marker_added', this._update);
				this.measurement.addEventListener('marker_removed', this._update);
				this.measurement.addEventListener('marker_moved', this._update);

				this.update();
			}

			update () {
				let elCoordiantesContainer = this.elContent.find('.coordinates_table_container');
				elCoordiantesContainer.empty();
				elCoordiantesContainer.append(createCoordinatesTable(this.measurement));

				let elArea = this.elContent.find(`#measurement_area_${this.id}`);
				elArea.html(this.measurement.getArea().toFixed(3));
			}

			destroy () {
				this.elPanel.remove();

				this.measurement.removeEventListener('marker_added', this._update);
				this.measurement.removeEventListener('marker_removed', this._update);
				this.measurement.removeEventListener('marker_moved', this._update);
			}
		};

		class AnglePanel extends MeasurePanel {
			constructor (scene, measurement) {
				super(scene, measurement);

				this.typename = 'Angle';
				this.icon = Potree.resourcePath + '/icons/angle.png';

				this.elIcon.attr('src', this.icon);

				this.elContent = $(`
					<div>
						<span class="coordinates_table_container"></span>

						<br>

						<table class="measurement_value_table">
							<tr>
								<th>\u03b1</th>
								<th>\u03b2</th>
								<th>\u03b3</th>
							</tr>
							<tr>
								<td align="center" id="angle_cell_alpha_${this.id}" style="width: 33%"></td>
								<td align="center" id="angle_cell_betta_${this.id}" style="width: 33%"></td>
								<td align="center" id="angle_cell_gamma_${this.id}" style="width: 33%"></td>
							</tr>
						</table>

						<!-- ACTIONS -->
						<div style="display: flex; margin-top: 12px">
							<span></span>
							<span style="flex-grow: 1"></span>
							<img class="measurement_action_remove" src="${removeIconPath}" style="width: 16px; height: 16px"/>
						</div>
					</div>
				`);
				this.elContentContainer.append(this.elContent);

				let elRemove = this.elContent.find('.measurement_action_remove');
				elRemove.click(() => { this.scene.removeMeasurement(measurement); });

				this.measurement.addEventListener('marker_added', this._update);
				this.measurement.addEventListener('marker_removed', this._update);
				this.measurement.addEventListener('marker_moved', this._update);

				this.update();
			}

			update () {
				let elCoordiantesContainer = this.elContent.find('.coordinates_table_container');
				elCoordiantesContainer.empty();
				elCoordiantesContainer.append(createCoordinatesTable(this.measurement));

				let angles = [];
				for (let i = 0; i < this.measurement.points.length; i++) {
					angles.push(this.measurement.getAngle(i) * (180.0 / Math.PI));
				}
				angles = angles.map(a => a.toFixed(1) + '\u00B0');

				let elAlpha = this.elContent.find(`#angle_cell_alpha_${this.id}`);
				let elBetta = this.elContent.find(`#angle_cell_betta_${this.id}`);
				let elGamma = this.elContent.find(`#angle_cell_gamma_${this.id}`);

				elAlpha.html(angles[0]);
				elBetta.html(angles[1]);
				elGamma.html(angles[2]);
			}

			destroy () {
				this.elPanel.remove();

				this.measurement.removeEventListener('marker_added', this._update);
				this.measurement.removeEventListener('marker_removed', this._update);
				this.measurement.removeEventListener('marker_moved', this._update);
			}
		};

		class HeightPanel extends MeasurePanel {
			constructor (scene, measurement) {
				super(scene, measurement);

				this.typename = 'Height';
				this.icon = Potree.resourcePath + '/icons/height.svg';

				this.elIcon.attr('src', this.icon);

				this.elContent = $(`
					<div>
						<span class="coordinates_table_container"></span>

						<br>

						<span id="height_label_${this.id}">Height: </span><br>

						<!-- ACTIONS -->
						<div style="display: flex; margin-top: 12px">
							<span></span>
							<span style="flex-grow: 1"></span>
							<img class="measurement_action_remove" src="${removeIconPath}" style="width: 16px; height: 16px"/>
						</div>
					</div>
				`);
				this.elContentContainer.append(this.elContent);

				let elRemove = this.elContent.find('.measurement_action_remove');
				elRemove.click(() => { this.scene.removeMeasurement(measurement); });

				this.measurement.addEventListener('marker_added', this._update);
				this.measurement.addEventListener('marker_removed', this._update);
				this.measurement.addEventListener('marker_moved', this._update);

				this.update();
			}

			update () {
				let elCoordiantesContainer = this.elContent.find('.coordinates_table_container');
				elCoordiantesContainer.empty();
				elCoordiantesContainer.append(createCoordinatesTable(this.measurement));

				{
					let points = this.measurement.points;

					let sorted = points.slice().sort((a, b) => a.position.z - b.position.z);
					let lowPoint = sorted[0].position.clone();
					let highPoint = sorted[sorted.length - 1].position.clone();
					let min = lowPoint.z;
					let max = highPoint.z;
					let height = max - min;
					height = height.toFixed(3);

					this.elHeightLabel = this.elContent.find(`#height_label_${this.id}`);
					this.elHeightLabel.html(`<b>Height:</b> ${height}`);
				}
			}

			destroy () {
				this.elPanel.remove();

				this.measurement.removeEventListener('marker_added', this._update);
				this.measurement.removeEventListener('marker_removed', this._update);
				this.measurement.removeEventListener('marker_moved', this._update);
			}
		};

		class ProfilePanel extends MeasurePanel {
			constructor (scene, measurement) {
				super(scene, measurement);

				this.typename = 'Profile';
				this.icon = Potree.resourcePath + '/icons/profile.svg';

				this.elIcon.attr('src', this.icon);

				let sliderID = 'sldProfileWidth_' + this.id;

				this.elContent = $(`
					<div>
						<span class="coordinates_table_container"></span>

						<br>

						<span style="display:flex">
							<span style="display:flex; align-items: center; padding-right: 10px">Width: </span>
							<input id="${sliderID}" name="${sliderID}" value="5.06" style="flex-grow: 1; width:100%">
						</span>
						<br>

						<input type="button" value="Prepare Download" id="download_profile_${this.id}"/>
						<span id="download_profile_status_${this.id}"></span>

						<br>

						<input type="button" id="show_2d_profile_${this.id}" value="show 2d profile" style="width: 100%"/>

						<!-- ACTIONS -->
						<div style="display: flex; margin-top: 12px">
							<span></span>
							<span style="flex-grow: 1"></span>
							<img class="measurement_action_remove" src="${removeIconPath}" style="width: 16px; height: 16px"/>
						</div>
					</div>
				`);
				this.elContentContainer.append(this.elContent);
				this.elShow2DProfile = this.elContent.find(`#show_2d_profile_${this.id}`);
				this.elShow2DProfile.click(() => {
					viewer.profileWindow.show();
					viewer.profileWindowController.setProfile(measurement);
					// viewer.profileWindow.draw(measurement);
				});

				{ // download
					this.elDownloadButton = this.elContent.find(`#download_profile_${this.id}`);

					if (viewer.server) {
						this.elDownloadButton.click(() => this.download());
					} else {
						this.elDownloadButton.hide();
					}
				}

				{ // width spinner
					let elWidthSlider = this.elContent.find(`#${sliderID}`);

					elWidthSlider.spinner({
						min: 0,
						max: 10 * 1000 * 1000,
						step: 0.01,
						numberFormat: 'n',
						start: () => {},
						spin: (event, ui) => {
							let value = elWidthSlider.spinner('value');
							measurement.setWidth(value);
						},
						change: (event, ui) => {
							let value = elWidthSlider.spinner('value');
							measurement.setWidth(value);
						},
						stop: (event, ui) => {
							let value = elWidthSlider.spinner('value');
							measurement.setWidth(value);
						},
						incremental: (count) => {
							let value = elWidthSlider.spinner('value');
							let step = elWidthSlider.spinner('option', 'step');

							let delta = value * 0.05;
							let increments = Math.max(1, parseInt(delta / step));

							return increments;
						}
					});
					elWidthSlider.spinner('value', measurement.getWidth());
					elWidthSlider.spinner('widget').css('width', '100%');

					this.widthListener = (event) => {
						let value = elWidthSlider.spinner('value');
						if (value !== measurement.getWidth()) {
							elWidthSlider.spinner('value', measurement.getWidth());
						}
					};

					measurement.addEventListener('width_changed', this.widthListener);
				}

				let elRemove = this.elContent.find('.measurement_action_remove');
				elRemove.click(() => { this.scene.removeProfile(measurement); });

				this.measurement.addEventListener('marker_added', this._update);
				this.measurement.addEventListener('marker_removed', this._update);
				this.measurement.addEventListener('marker_moved', this._update);

				this.update();
			}

			update () {
				let elCoordiantesContainer = this.elContent.find('.coordinates_table_container');
				elCoordiantesContainer.empty();
				let coordinatesTable = createCoordinatesTable(this.measurement);

				let cells = coordinatesTable.find('span');
				cells.attr('contenteditable', 'true');

				cells = cells.toArray();

				for (let i = 0; i < cells.length; i++) {
					let cell = cells[i];
					let measure = this.measurement;
					let updateCallback = this._update;

					let assignValue = () => {
						let text = Potree.utils.removeCommas($(cell).html());

						let num = Number(text);

						if (!isNaN(num)) {
							$(cell).removeClass('invalid_value');

							measure.removeEventListener('marker_moved', updateCallback);

							let index = parseInt(i / 3);
							let coordinateComponent = i % 3;

							let position = measure.points[index].clone();

							if (coordinateComponent === 0) {
								position.x = num;
							} else if (coordinateComponent === 1) {
								position.y = num;
							} else if (coordinateComponent === 2) {
								position.z = num;
							}

							measure.setPosition(index, position);
							measure.addEventListener('marker_moved', updateCallback);
						} else {
							$(cell).addClass('invalid_value');
						}
					};

					$(cell).on('keypress', (e) => {
						if (e.which === 13) {
							assignValue();
							return false;
						}
					});

					$(cell).focusout(() => assignValue());

					$(cell).on('input', function (e) {
						let text = Potree.utils.removeCommas($(this).html());

						let num = Number(text);

						if (!isNaN(num)) {
							$(this).removeClass('invalid_value');
						} else {
							$(this).addClass('invalid_value');
						}
					});
				}

				elCoordiantesContainer.append(coordinatesTable);
			}

			download () {
				let profile = this.measurement;
				let boxes = profile.getSegmentMatrices()
					.map(m => m.elements.join(','))
					.join(',');

				let minLOD = 0;
				let maxLOD = 100;

				let pcs = [];
				for (let pointcloud of this.scene.pointclouds) {
					let urlIsAbsolute = new RegExp('^(?:[a-z]+:)?//', 'i').test(pointcloud.pcoGeometry.url);
					let pc = '';
					if (urlIsAbsolute) {
						pc = pointcloud.pcoGeometry.url;
					} else {
						pc = `${window.location.href}/../${pointcloud.pcoGeometry.url}`;
					}

					pcs.push(pc);
				}

				let pc = pcs
					.map(v => `pointcloud[]=${v}`)
					.join('&');

				let request = `${viewer.server}/start_extract_region_worker?minLOD=${minLOD}&maxLOD=${maxLOD}&box=${boxes}&${pc}`;
				// console.log(request);

				let elMessage = this.elContent.find(`#download_profile_status_${this.id}`);
				elMessage.html('sending request...');

				let workerID = null;

				let start = new Date().getTime();

				let observe = () => {
					let request = `${viewer.server}/observe_status?workerID=${workerID}`;

					let loaded = 0;

					let xhr = new XMLHttpRequest();
					xhr.withCredentials = true;
					xhr.addEventListener('progress', e => {
						let nowLoaded = e.loaded;

						let response = xhr.responseText.substring(loaded, nowLoaded);
						response = JSON.parse(response);

						if (response.status === 'FINISHED') {
							elMessage.html(`<br><a href="${viewer.server}/get_las?workerID=${workerID}">Download ready</a>`);
						} else {
							let current = new Date().getTime();
							let duration = (current - start);
							let seconds = parseInt(duration / 1000);

							elMessage.html(`processing request... ${seconds}s`);
						}

						loaded = nowLoaded;
					});
					xhr.open('GET', request, true);
					xhr.send(null);
				};

				let xhr = new XMLHttpRequest();
				xhr.withCredentials = true;
				xhr.onreadystatechange = () => {
					if (xhr.readyState === XMLHttpRequest.DONE) {
						// alert(xhr.responseText);
						let res = JSON.parse(xhr.responseText);
						console.log(res);

						if (res.status === 'OK') {
							workerID = res.workerID;
							elMessage.html('request is being processed');
							// checkUntilFinished();
							observe();
						} else if (res.status === 'ERROR_POINT_PROCESSED_ESTIMATE_TOO_LARGE') {
							elMessage.html('Too many candidate points in selection.');
						} else {
							elMessage.html(`${res.status}`);
						}
					}
				};
				xhr.open('GET', request, true);
				xhr.send(null);
			}

			destroy () {
				this.elPanel.remove();

				this.measurement.removeEventListener('marker_added', this._update);
				this.measurement.removeEventListener('marker_removed', this._update);
				this.measurement.removeEventListener('marker_moved', this._update);
				this.measurement.removeEventListener('width_changed', this.widthListener);
			}
		};

		class VolumePanel extends MeasurePanel {
			constructor (scene, measurement) {
				super(scene, measurement);

				this.typename = 'Volume';
				this.icon = Potree.resourcePath + '/icons/volume.svg';

				this.elIcon.attr('src', this.icon);

				this.values = {};

				this.elContent = $(`
					<div>

						<div style="width: 100%;">
							<div style="display:inline-flex; width: 100%; ">
								<span class="input-grid-label">x</span>
								<span class="input-grid-label">y</span>
								<span class="input-grid-label">z</span>
							</div>
							<div style="display:inline-flex; width: 100%;">
								<span class="input-grid-cell"><input type="text" id="volume_input_x_${measurement.id}"/></span>
								<span class="input-grid-cell"><input type="text" id="volume_input_y_${measurement.id}"/></span>
								<span class="input-grid-cell"><input type="text" id="volume_input_z_${measurement.id}"/></span>
							</div>
						</div>

						<div style="width: 100%;">
							<div style="display:inline-flex; width: 100%; ">
								<span class="input-grid-label">length</span>
								<span class="input-grid-label">width</span>
								<span class="input-grid-label">height</span>
							</div>
							<div style="display:inline-flex; width: 100%;">
								<span class="input-grid-cell"><input type="text" id="volume_input_length_${measurement.id}"/></span>
								<span class="input-grid-cell"><input type="text" id="volume_input_width_${measurement.id}"/></span>
								<span class="input-grid-cell"><input type="text" id="volume_input_height_${measurement.id}"/></span>
							</div>
						</div>

						<div style="width: 100%;">
							<div style="display:inline-flex; width: 100%; ">
								<span class="input-grid-label">&alpha;</span>
								<span class="input-grid-label">&beta;</span>
								<span class="input-grid-label">&gamma;</span>
							</div>
							<div style="display:inline-flex; width: 100%;">
								<span class="input-grid-cell"><input type="text" id="volume_input_alpha_${measurement.id}"/></span>
								<span class="input-grid-cell"><input type="text" id="volume_input_beta_${measurement.id}"/></span>
								<span class="input-grid-cell"><input type="text" id="volume_input_gamma_${measurement.id}"/></span>
							</div>
						</div>

						<label><input type="checkbox" id="chkClip_${this.measurement.id}"/><span data-i18n="measurements.clip"></span></label>
						<label><input type="checkbox" id="chkVisible_${this.measurement.id}"/><span data-i18n="measurements.show"></span></label>


						<input type="button" value="Prepare Download" id="download_volume_${this.id}"/>
						<span id="download_volume_status_${this.id}"></span>

						<!-- ACTIONS -->
						<div style="display: flex; margin-top: 12px">
							<span></span>
							<span style="flex-grow: 1"></span>
							<img class="measurement_action_remove" src="${removeIconPath}" style="width: 16px; height: 16px"/>
						</div>
					</div>
				`);
				this.elContentContainer.append(this.elContent);

				this.elClip = this.elContent.find(`#chkClip_${this.measurement.id}`);
				this.elVisible = this.elContent.find(`#chkVisible_${this.measurement.id}`);

				this.elClip.click(() => {
					this.measurement.clip = this.elClip.is(':checked');
				});

				this.elVisible.click(() => {
					this.measurement.visible = this.elVisible.is(':checked');
				});

				this.elClip.prop('checked', this.measurement.clip);
				this.elVisible.prop('checked', this.measurement.visible);

				this.elX = this.elContent.find(`#volume_input_x_${this.measurement.id}`);
				this.elY = this.elContent.find(`#volume_input_y_${this.measurement.id}`);
				this.elZ = this.elContent.find(`#volume_input_z_${this.measurement.id}`);

				this.elLength = this.elContent.find(`#volume_input_length_${this.measurement.id}`);
				this.elWidth = this.elContent.find(`#volume_input_width_${this.measurement.id}`);
				this.elHeight = this.elContent.find(`#volume_input_height_${this.measurement.id}`);

				this.elAlpha = this.elContent.find(`#volume_input_alpha_${this.measurement.id}`);
				this.elBeta = this.elContent.find(`#volume_input_beta_${this.measurement.id}`);
				this.elGamma = this.elContent.find(`#volume_input_gamma_${this.measurement.id}`);

				this.elX.on('change', (e) => {
					let val = this.elX.val();
					if ($.isNumeric(val)) {
						val = parseFloat(val);

						this.measurement.position.x = val;
					}
				});

				this.elY.on('change', (e) => {
					let val = this.elY.val();
					if ($.isNumeric(val)) {
						val = parseFloat(val);

						this.measurement.position.y = val;
					}
				});

				this.elZ.on('change', (e) => {
					let val = this.elZ.val();
					if ($.isNumeric(val)) {
						val = parseFloat(val);

						this.measurement.position.z = val;
					}
				});

				this.elLength.on('change', (e) => {
					let val = this.elLength.val();
					if ($.isNumeric(val)) {
						val = parseFloat(val);

						this.measurement.scale.x = val;
					}
				});

				this.elWidth.on('change', (e) => {
					let val = this.elWidth.val();
					if ($.isNumeric(val)) {
						val = parseFloat(val);

						this.measurement.scale.y = val;
					}
				});

				this.elHeight.on('change', (e) => {
					let val = this.elHeight.val();
					if ($.isNumeric(val)) {
						val = parseFloat(val);

						this.measurement.scale.z = val;
					}
				});

				let toRadians = (d) => Math.PI * d / 180;

				this.elAlpha.on('change', (e) => {
					let val = this.elAlpha.val();
					if ($.isNumeric(val)) {
						val = parseFloat(val);

						this.measurement.rotation.x = toRadians(val);
					}
				});

				this.elBeta.on('change', (e) => {
					let val = this.elBeta.val();
					if ($.isNumeric(val)) {
						val = parseFloat(val);

						this.measurement.rotation.y = toRadians(val);
					}
				});

				this.elGamma.on('change', (e) => {
					let val = this.elGamma.val();
					if ($.isNumeric(val)) {
						val = parseFloat(val);

						this.measurement.rotation.z = toRadians(val);
					}
				});

				this.elDownloadButton = this.elContent.find(`#download_volume_${this.id}`);

				if (viewer.server) {
					this.elDownloadButton.click(() => this.download());
				} else {
					this.elDownloadButton.hide();
				}

				let elRemove = this.elContent.find('.measurement_action_remove');
				elRemove.click(() => { this.scene.removeVolume(measurement); });

				this.measurement.addEventListener('marker_added', this._update);
				this.measurement.addEventListener('marker_removed', this._update);
				this.measurement.addEventListener('marker_moved', this._update);

				this.elContent.i18n();

				this.update();
			}

			download () {
				let volume = this.measurement;
				let boxes = volume.matrixWorld.elements.join(',');
				let minLOD = 0;
				let maxLOD = 100;

				let pcs = [];
				for (let pointcloud of this.scene.pointclouds) {
					let urlIsAbsolute = new RegExp('^(?:[a-z]+:)?//', 'i').test(pointcloud.pcoGeometry.url);
					let pc = '';
					if (urlIsAbsolute) {
						pc = pointcloud.pcoGeometry.url;
					} else {
						pc = `${window.location.href}/../${pointcloud.pcoGeometry.url}`;
					}

					pcs.push(pc);
				}

				let pc = pcs
					.map(v => `pointcloud[]=${v}`)
					.join('&');

				let request = `${viewer.server}/start_extract_region_worker?minLOD=${minLOD}&maxLOD=${maxLOD}&box=${boxes}&${pc}`;// &pointCloud=${pc}`;
				// console.log(request);

				let elMessage = this.elContent.find(`#download_volume_status_${this.id}`);
				elMessage.html('sending request...');

				let workerID = null;

				let start = new Date().getTime();

				let observe = () => {
					let request = `${viewer.server}/observe_status?workerID=${workerID}`;

					let loaded = 0;

					let xhr = new XMLHttpRequest();
					xhr.withCredentials = true;
					xhr.addEventListener('progress', e => {
						let nowLoaded = e.loaded;

						let response = xhr.responseText.substring(loaded, nowLoaded);
						response = JSON.parse(response);

						if (response.status === 'FINISHED') {
							elMessage.html(`<br><a href="${viewer.server}/get_las?workerID=${workerID}">Download ready</a>`);
						} else {
							let current = new Date().getTime();
							let duration = (current - start);
							let seconds = parseInt(duration / 1000);

							elMessage.html(`processing request... ${seconds}s`);
						}

						loaded = nowLoaded;
					});
					xhr.open('GET', request, true);
					xhr.send(null);
				};

				let xhr = new XMLHttpRequest();
				xhr.withCredentials = true;
				xhr.onreadystatechange = () => {
					if (xhr.readyState === XMLHttpRequest.DONE) {
						// alert(xhr.responseText);
						let res = JSON.parse(xhr.responseText);
						console.log(res);

						if (res.status === 'OK') {
							workerID = res.workerID;
							elMessage.html('request is being processed');
							// checkUntilFinished();
							observe();
						} else if (res.status === 'ERROR_POINT_PROCESSED_ESTIMATE_TOO_LARGE') {
							elMessage.html('Too many candidate points in selection.');
						} else {
							elMessage.html(`${res.status}`);
						}
					}
				};
				xhr.open('GET', request, true);
				xhr.send(null);
			}

			update () {
				if (!this.destroyed) {
					requestAnimationFrame(this._update);
				}

				if (!this.elContent.is(':visible')) {
					return;
				}

				if (this.measurement.position.x !== this.values.x) {
					this.elX.val(this.measurement.position.x.toFixed(3));
					this.values.x = this.measurement.position.x;
				}

				if (this.measurement.position.y !== this.values.y) {
					let elY = this.elContent.find(`#volume_input_y_${this.measurement.id}`);
					elY.val(this.measurement.position.y.toFixed(3));
					this.values.y = this.measurement.position.y;
				}

				if (this.measurement.position.z !== this.values.z) {
					let elZ = this.elContent.find(`#volume_input_z_${this.measurement.id}`);
					elZ.val(this.measurement.position.z.toFixed(3));
					this.values.z = this.measurement.position.z;
				}

				if (this.measurement.scale.x !== this.values.length) {
					this.elLength.val(this.measurement.scale.x.toFixed(3));
					this.values.length = this.measurement.scale.x;
				}

				if (this.measurement.scale.y !== this.values.width) {
					this.elWidth.val(this.measurement.scale.y.toFixed(3));
					this.values.width = this.measurement.scale.y;
				}

				if (this.measurement.scale.z !== this.values.height) {
					this.elHeight.val(this.measurement.scale.z.toFixed(3));
					this.values.height = this.measurement.scale.z;
				}

				let toDegrees = (r) => 180 * r / Math.PI;

				if (this.measurement.rotation.x !== this.values.alpha) {
					this.elAlpha.val(toDegrees(this.measurement.rotation.x).toFixed(1));
					this.values.alpha = this.measurement.rotation.x;
				}

				if (this.measurement.rotation.y !== this.values.beta) {
					this.elBeta.val(toDegrees(this.measurement.rotation.y).toFixed(1));
					this.values.beta = this.measurement.rotation.y;
				}

				if (this.measurement.rotation.z !== this.values.gamma) {
					this.elGamma.val(toDegrees(this.measurement.rotation.z).toFixed(1));
					this.values.gamma = this.measurement.rotation.z;
				}
			}

			destroy () {
				this.elPanel.remove();

				this.measurement.removeEventListener('marker_added', this._update);
				this.measurement.removeEventListener('marker_removed', this._update);
				this.measurement.removeEventListener('marker_moved', this._update);

				this.destroyed = true;
			}
		};

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
			if (measurement instanceof Potree.Measure) {
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
			} else if (measurement instanceof Potree.Profile) {
				return TYPE.PROFILE;
			} else if (measurement instanceof Potree.Volume) {
				return TYPE.VOLUME;
			}
		};

		let trackMeasurement = (scene, measurement) => {
			// TODO: Dead code?
			// id++;

			let type = getType(measurement);

			const Panel = type.panel;

			let panel = new Panel(scene, measurement);
			mlist.append(panel.elPanel);

			let track = {
				scene: scene,
				measurement: measurement,
				panel: panel,
				stopTracking: (e) => { panel.destroy(); }
			};
			trackedItems.set(measurement, track);

			let onremove = (e) => {
				let remove = () => {
					panel.destroy();
					scene.removeEventListener('measurement_removed', onremove);
					scene.removeEventListener('profile_removed', onremove);
					scene.removeEventListener('volume_removed', onremove);
				};

				if (e.measurement instanceof Potree.Measure && e.measurement === measurement) {
					remove();
				} else if (e.profile instanceof Potree.Profile && e.profile === measurement) {
					remove();
				} else if (e.volume instanceof Potree.Volume && e.volume === measurement) {
					remove();
				}
			};

			scene.addEventListener('measurement_removed', onremove);
			scene.addEventListener('profile_removed', onremove);
			scene.addEventListener('volume_removed', onremove);
		};

		let scenelistener = (e) => {
			if (e.measurement) {
				trackMeasurement(e.scene, e.measurement);
			} else if (e.profile) {
				trackMeasurement(e.scene, e.profile);

				viewer.profileWindow.show();
				viewer.profileWindowController.setProfile(e.profile);
			} else if (e.volume) {
				trackMeasurement(e.scene, e.volume);
			}
		};

		let trackScene = (scene) => {
			// $("#measurement_details").empty();

			trackedItems.forEach(function (trackedItem, key, map) {
				trackedItem.stopTracking();
			});

			let items = scene.measurements
				.concat(scene.profiles)
				.concat(scene.volumes);

			for (let measurement of items) {
				trackMeasurement(scene, measurement);
			}

			if (!scene.hasEventListener('measurement_added', scenelistener)) {
				scene.addEventListener('measurement_added', scenelistener);
			}

			if (!scene.hasEventListener('profile_added', scenelistener)) {
				scene.addEventListener('profile_added', scenelistener);
			}

			if (!scene.hasEventListener('volume_added', scenelistener)) {
				scene.addEventListener('volume_added', scenelistener);
			}
		};

		trackScene(viewer.scene);

		viewer.addEventListener('scene_changed', (e) => { trackScene(e.scene); });

		{ // BOTTOM ACTIONS
			let elActionsB = $('#measurement_list_after');

			{
				let icon = Potree.resourcePath + '/icons/file_geojson.svg';
				let elDownload = $(`
					<a href="#" download="measure.json" class="measurepanel_downloads">
						<img src="${icon}" style="height: 24px" />
					</a>`);
				elActionsB.append(elDownload);

				elDownload.click(function (e) {
					let scene = viewer.scene;
					let measurements = [scene.measurements, scene.profiles, scene.volumes].reduce((a, v) => a.concat(v));

					let geojson = Potree.GeoJSONExporter.toString(measurements);

					let url = window.URL.createObjectURL(new Blob([geojson], {type: 'data:application/octet-stream'}));
					elDownload.attr('href', url);
				});
			}

			{
				let icon = Potree.resourcePath + '/icons/file_dxf.svg';
				let elDownload = $(`
					<a href="#" download="measure.dxf" class="measurepanel_downloads">
						<img src="${icon}" style="height: 24px" />
					</a>`);
				elActionsB.append(elDownload);

				elDownload.click(function (e) {
					let scene = viewer.scene;
					let measurements = [scene.measurements, scene.profiles, scene.volumes].reduce((a, v) => a.concat(v));

					let dxf = Potree.DXFExporter.toString(measurements);

					let url = window.URL.createObjectURL(new Blob([dxf], {type: 'data:application/octet-stream'}));
					elDownload.attr('href', url);
				});
			}
		}
	};

	function initSceneList () {
		let scenelist = $('#scene_list');

		// length units
		$('#optLengthUnit').selectmenu({
			style: 'popup',
			position: {
				my: 'top',
				at: 'bottom',
				collision: 'flip' },
			change: function (e) {
				let selectedValue = $('#optLengthUnit').selectmenu().val();
				viewer.setLengthUnit(selectedValue);
			}
		});
		$('#optLengthUnit').selectmenu().val(viewer.lengthUnit.code);
		$('#optLengthUnit').selectmenu('refresh');

		let initUIElements = function (i) {
			// scene panel in scene list

			let pointcloud = viewer.scene.pointclouds[i];
			let title = pointcloud.name;
			let pcMaterial = pointcloud.material;
			let checked = pointcloud.visible ? 'checked' : '';

			let scenePanel = $(`
				<span class="scene_item">
					<!-- HEADER -->
					<div style="float: right; margin: 6px; margin-right: 15px"><input id="scene_list_item_pointcloud_${i}" type="checkbox" ${checked} /></div>
					<div class="scene_header" onclick="$(this).next().slideToggle(200)">
						<span class="scene_icon"><img src="${Potree.resourcePath + '/icons/cloud_icon.svg'}" class="scene_item_icon" /></span>
						<span class="scene_header_title">${title}</span>
					</div>

					<!-- DETAIL -->
					<div class="scene_content selectable" style="display: none">
						<div>
							<ul class="pv-menu-list">

							<li>
							<span data-i18n="appearance.point_size"></span>:<span id="lblPointSize_${i}"></span> <div id="sldPointSize_${i}"></div>
							</li>

							<!-- SIZE TYPE -->
							<li>
								<label for="optPointSizing_${i}" class="pv-select-label" data-i18n="appearance.point_size_type">Point Sizing </label>
								<select id="optPointSizing_${i}" name="optPointSizing_${i}">
									<option>FIXED</option>
									<option>ATTENUATED</option>
									<option>ADAPTIVE</option>
								</select>
							</li>

							<!--
							Shape:
							<div id="sizing_${i}">
								<label for="radio_${i}_1">FIXED</label>
								<input type="radio" name="radio_${i}" id="radio_${i}_1">
								<label for="radio_${i}_2">ATTENUATED</label>
								<input type="radio" name="radio_${i}" id="radio_${i}_2">
								<label for="radio_${i}_3">ADAPTIVE</label>
								<input type="radio" name="radio_${i}" id="radio_${i}_3">
							</div>
							-->

							<!-- SHAPE -->
							<li>
								<label for="optShape_" class="pv-select-label" data-i18n="appearance.point_shape"></label>
								<select id="optShape_${i}" name="optShape_${i}">
									<option>SQUARE</option>
									<option>CIRCLE</option>
									<option>PARABOLOID</option>
								</select>
							</li>

							<!-- OPACITY -->
							<li><span data-i18n="appearance.point_opacity"></span>:<span id="lblOpacity_${i}"></span><div id="sldOpacity_${i}"></div></li>

							<div class="divider">
								<span>Attribute</span>
							</div>

							<li>
								<!--<label for="optMaterial${i}" class="pv-select-label">Attributes:</label><br>-->
								<select id="optMaterial${i}" name="optMaterial${i}">
								</select>
							</li>

							<div id="materials.composite_weight_container${i}">
								<div class="divider">
									<span>Attribute Weights</span>
								</div>

								<li>RGB: <span id="lblWeightRGB${i}"></span> <div id="sldWeightRGB${i}"></div>	</li>
								<li>Intensity: <span id="lblWeightIntensity${i}"></span> <div id="sldWeightIntensity${i}"></div>	</li>
								<li>Elevation: <span id="lblWeightElevation${i}"></span> <div id="sldWeightElevation${i}"></div>	</li>
								<li>Classification: <span id="lblWeightClassification${i}"></span> <div id="sldWeightClassification${i}"></div>	</li>
								<li>Return Number: <span id="lblWeightReturnNumber${i}"></span> <div id="sldWeightReturnNumber${i}"></div>	</li>
								<li>Source ID: <span id="lblWeightSourceID${i}"></span> <div id="sldWeightSourceID${i}"></div>	</li>
							</div>

							<div id="materials.rgb_container${i}">
								<div class="divider">
									<span>RGB</span>
								</div>

								<li>Gamma: <span id="lblRGBGamma${i}"></span> <div id="sldRGBGamma${i}"></div>	</li>
								<li>Brightness: <span id="lblRGBBrightness${i}"></span> <div id="sldRGBBrightness${i}"></div>	</li>
								<li>Contrast: <span id="lblRGBContrast${i}"></span> <div id="sldRGBContrast${i}"></div>	</li>
							</div>

							<div id="materials.color_container${i}">
								<div class="divider">
									<span>Color</span>
								</div>

								<input id="materials.color.picker${i}" />
							</div>


							<div id="materials.elevation_container${i}">
								<div class="divider">
									<span>Elevation</span>
								</div>

								<li><span data-i18n="appearance.elevation_range"></span>: <span id="lblHeightRange${i}"></span> <div id="sldHeightRange${i}"></div>	</li>
							</div>

							<div id="materials.transition_container${i}">
								<div class="divider">
									<span>Transition</span>
								</div>

								<li>transition: <span id="lblTransition${i}"></span> <div id="sldTransition${i}"></div>	</li>
							</div>

							<div id="materials.intensity_container${i}">
								<div class="divider">
									<span>Intensity</span>
								</div>

								<li>Range: <span id="lblIntensityRange${i}"></span> <div id="sldIntensityRange${i}"></div>	</li>
								<li>Gamma: <span id="lblIntensityGamma${i}"></span> <div id="sldIntensityGamma${i}"></div>	</li>
								<li>Brightness: <span id="lblIntensityBrightness${i}"></span> <div id="sldIntensityBrightness${i}"></div>	</li>
								<li>Contrast: <span id="lblIntensityContrast${i}"></span> <div id="sldIntensityContrast${i}"></div>	</li>
							</div>


							</ul>
						</div>
					</div>
				</span>
			`);

			{ // POINT SIZE
				let sldPointSize = scenePanel.find(`#sldPointSize_${i}`);
				let lblPointSize = scenePanel.find(`#lblPointSize_${i}`);

				sldPointSize.slider({
					value: pcMaterial.size,
					min: 0,
					max: 3,
					step: 0.01,
					slide: function (event, ui) { pcMaterial.size = ui.value; }
				});

				let update = (e) => {
					lblPointSize.html(pcMaterial.size.toFixed(2));
					sldPointSize.slider({value: pcMaterial.size});
				};

				pcMaterial.addEventListener('point_size_changed', update);
				update();
			}

			{ // POINT SIZE TYPE
				let strSizeType = Object.keys(Potree.PointSizeType)[pcMaterial.pointSizeType];

				let opt = scenePanel.find(`#optPointSizing_${i}`);
				opt.selectmenu();
				opt.val(strSizeType).selectmenu('refresh');

				opt.selectmenu({
					change: (event, ui) => {
						pcMaterial.pointSizeType = Potree.PointSizeType[ui.item.value];
					}
				});

				pcMaterial.addEventListener('point_size_type_changed', e => {
					let typename = Object.keys(Potree.PointSizeType)[pcMaterial.pointSizeType];

					$('#optPointSizing').selectmenu().val(typename).selectmenu('refresh');
				});
			}

			{ // SHAPE
				let opt = scenePanel.find(`#optShape_${i}`);

				opt.selectmenu({
					change: (event, ui) => {
						let value = ui.item.value;

						pcMaterial.shape = Potree.PointShape[value];
					}
				});

				pcMaterial.addEventListener('point_shape_changed', e => {
					let typename = Object.keys(Potree.PointShape)[pcMaterial.shape];

					opt.selectmenu().val(typename).selectmenu('refresh');
				});
			}

			{ // OPACITY
				let sldOpacity = scenePanel.find(`#sldOpacity_${i}`);
				let lblOpacity = scenePanel.find(`#lblOpacity_${i}`);

				sldOpacity.slider({
					value: pcMaterial.opacity,
					min: 0,
					max: 1,
					step: 0.001,
					slide: function (event, ui) { pcMaterial.opacity = ui.value; }
				});

				let update = (e) => {
					lblOpacity.html(pcMaterial.opacity.toFixed(2));
					sldOpacity.slider({value: pcMaterial.opacity});
				};

				pcMaterial.addEventListener('opacity_changed', update);
				update();
			}

			let inputVis = scenePanel.find("input[type='checkbox']");

			inputVis.click(function (event) {
				pointcloud.visible = event.target.checked;
				if (viewer.profileWindowController) {
					viewer.profileWindowController.recompute();
				}
			});

			scenelist.append(scenePanel);

			// ui elements
			$('#optMaterial' + i).selectmenu({
				style: 'popup',
				position: {
					my: 'top',
					at: 'bottom',
					collision: 'flip' }
			});

			$('#sldHeightRange' + i).slider({
				range: true,
				min:	0,
				max:	1000,
				values: [0, 1000],
				step: 0.01,
				slide: function (event, ui) {
					pcMaterial.heightMin = ui.values[0];
					pcMaterial.heightMax = ui.values[1];
					viewer.dispatchEvent({'type': 'height_range_changed' + i, 'viewer': viewer});
				}
			});

			$('#sldTransition' + i).slider({
				value: pcMaterial.materialTransition,
				min: 0,
				max: 1,
				step: 0.01,
				slide: function (event, ui) {
					pcMaterial.materialTransition = ui.value;
					viewer.dispatchEvent({'type': 'material_transition_changed' + i, 'viewer': viewer});
				}
			});

			$('#sldIntensityRange' + i).slider({
				range: true,
				min:	0,
				max:	1,
				values: [0, 1],
				step: 0.01,
				slide: function (event, ui) {
					let min = (Number(ui.values[0]) === 0) ? 0 : parseInt(Math.pow(2, 16 * ui.values[0]));
					let max = parseInt(Math.pow(2, 16 * ui.values[1]));
					pcMaterial.intensityRange = [min, max];
					// pcMaterial.intensityRange[0] = min;
					// pcMaterial.intensityRange[1] = max;
					viewer.dispatchEvent({'type': 'intensity_range_changed' + i, 'viewer': viewer});
				}
			});

			$('#sldIntensityGamma' + i).slider({
				value: pcMaterial.intensityGamma,
				min: 0,
				max: 4,
				step: 0.01,
				slide: function (event, ui) {
					pcMaterial.intensityGamma = ui.value;
					viewer.dispatchEvent({'type': 'intensity_gamma_changed' + i, 'viewer': viewer});
				}
			});

			$('#sldIntensityContrast' + i).slider({
				value: pcMaterial.intensityContrast,
				min: -1,
				max: 1,
				step: 0.01,
				slide: function (event, ui) {
					pcMaterial.intensityContrast = ui.value;
					viewer.dispatchEvent({'type': 'intensity_contrast_changed' + i, 'viewer': viewer});
				}
			});

			$('#sldIntensityBrightness' + i).slider({
				value: pcMaterial.intensityBrightness,
				min: -1,
				max: 1,
				step: 0.01,
				slide: function (event, ui) {
					pcMaterial.intensityBrightness = ui.value;
					viewer.dispatchEvent({'type': 'intensity_brightness_changed' + i, 'viewer': viewer});
				}
			});

			$('#sldRGBGamma' + i).slider({
				value: pcMaterial.rgbGamma,
				min: 0,
				max: 4,
				step: 0.01,
				slide: function (event, ui) {
					pcMaterial.rgbGamma = ui.value;
					viewer.dispatchEvent({'type': 'rgb_gamma_changed' + i, 'viewer': viewer});
				}
			});

			$('#sldRGBContrast' + i).slider({
				value: pcMaterial.rgbContrast,
				min: -1,
				max: 1,
				step: 0.01,
				slide: function (event, ui) {
					pcMaterial.rgbContrast = ui.value;
					viewer.dispatchEvent({'type': 'rgb_contrast_changed' + i, 'viewer': viewer});
				}
			});

			$('#sldRGBBrightness' + i).slider({
				value: pcMaterial.rgbBrightness,
				min: -1,
				max: 1,
				step: 0.01,
				slide: function (event, ui) {
					pcMaterial.rgbBrightness = ui.value;
					viewer.dispatchEvent({'type': 'rgb_brightness_changed' + i, 'viewer': viewer});
				}
			});

			$('#sldWeightRGB' + i).slider({
				value: pcMaterial.weightRGB,
				min: 0,
				max: 1,
				step: 0.01,
				slide: function (event, ui) {
					pcMaterial.weightRGB = ui.value;
					viewer.dispatchEvent({'type': 'attribute_weights_changed' + i, 'viewer': viewer});
				}
			});

			$('#sldWeightIntensity' + i).slider({
				value: pcMaterial.weightIntensity,
				min: 0,
				max: 1,
				step: 0.01,
				slide: function (event, ui) {
					pcMaterial.weightIntensity = ui.value;
					viewer.dispatchEvent({'type': 'attribute_weights_changed' + i, 'viewer': viewer});
				}
			});

			$('#sldWeightElevation' + i).slider({
				value: pcMaterial.weightElevation,
				min: 0,
				max: 1,
				step: 0.01,
				slide: function (event, ui) {
					pcMaterial.weightElevation = ui.value;
					viewer.dispatchEvent({'type': 'attribute_weights_changed' + i, 'viewer': viewer});
				}
			});

			$('#sldWeightClassification' + i).slider({
				value: pcMaterial.weightClassification,
				min: 0,
				max: 1,
				step: 0.01,
				slide: function (event, ui) {
					pcMaterial.weightClassification = ui.value;
					viewer.dispatchEvent({'type': 'attribute_weights_changed' + i, 'viewer': viewer});
				}
			});

			$('#sldWeightReturnNumber' + i).slider({
				value: pcMaterial.weightReturnNumber,
				min: 0,
				max: 1,
				step: 0.01,
				slide: function (event, ui) {
					pcMaterial.weightReturnNumber = ui.value;
					viewer.dispatchEvent({'type': 'attribute_weights_changed' + i, 'viewer': viewer});
				}
			});

			$('#sldWeightSourceID' + i).slider({
				value: pcMaterial.weightSourceID,
				min: 0,
				max: 1,
				step: 0.01,
				slide: function (event, ui) {
					pcMaterial.weightSourceID = ui.value;
					viewer.dispatchEvent({'type': 'attribute_weights_changed' + i, 'viewer': viewer});
				}
			});

			$(`#materials\\.color\\.picker${i}`).spectrum({
				flat: true,
				showInput: true,
				preferredFormat: 'rgb',
				cancelText: '',
				chooseText: 'Apply',
				color: `#${pcMaterial.color.getHexString()}`,
				move: color => {
					let cRGB = color.toRgb();
					let tc = new THREE.Color().setRGB(cRGB.r / 255, cRGB.g / 255, cRGB.b / 255);
					pcMaterial.color = tc;
				},
				change: color => {
					let cRGB = color.toRgb();
					let tc = new THREE.Color().setRGB(cRGB.r / 255, cRGB.g / 255, cRGB.b / 255);
					pcMaterial.color = tc;
				}
			});

			pcMaterial.addEventListener('color_changed', e => {
				$(`#materials\\.color\\.picker${i}`)
					.spectrum('set', `#${pcMaterial.color.getHexString()}`);
			});

			let updateHeightRange = function () {
				let box = [pointcloud.pcoGeometry.tightBoundingBox, pointcloud.getBoundingBoxWorld()]
					.find(v => v !== undefined);

				pointcloud.updateMatrixWorld(true);
				box = Potree.utils.computeTransformedBoundingBox(box, pointcloud.matrixWorld);

				let bWidth = box.max.z - box.min.z;
				let bMin = box.min.z - 0.2 * bWidth;
				let bMax = box.max.z + 0.2 * bWidth;

				$('#lblHeightRange' + i)[0].innerHTML = pcMaterial.heightMin.toFixed(2) + ' to ' + pcMaterial.heightMax.toFixed(2);
				$('#sldHeightRange' + i).slider({
					min: bMin,
					max: bMax,
					values: [pcMaterial.heightMin, pcMaterial.heightMax]
				});
			};

			let updateIntensityRange = function () {
				let range = pcMaterial.intensityRange;
				let min = Math.log2(range[0]) / 16;
				let max = Math.log2(range[1]) / 16;

				$('#lblIntensityRange' + i)[0].innerHTML =
					parseInt(pcMaterial.intensityRange[0]) + ' to ' +
					parseInt(pcMaterial.intensityRange[1]);
				$('#sldIntensityRange' + i).slider({
					values: [min, max]
				});
			};

			{
				updateHeightRange();
				$(`#sldHeightRange${i}`).slider('option', 'min');
				$(`#sldHeightRange${i}`).slider('option', 'max');
			}

			pcMaterial.addEventListener('material_property_changed', (event) => {
				updateHeightRange();

				{ // INTENSITY
					let gamma = pcMaterial.intensityGamma;
					let contrast = pcMaterial.intensityContrast;
					let brightness = pcMaterial.intensityBrightness;

					updateIntensityRange();

					$('#lblIntensityGamma' + i)[0].innerHTML = gamma.toFixed(2);
					$('#sldIntensityGamma' + i).slider({value: gamma});

					$('#lblIntensityContrast' + i)[0].innerHTML = contrast.toFixed(2);
					$('#sldIntensityContrast' + i).slider({value: contrast});

					$('#lblIntensityBrightness' + i)[0].innerHTML = brightness.toFixed(2);
					$('#sldIntensityBrightness' + i).slider({value: brightness});
				}

				{ // RGB
					let gamma = pcMaterial.rgbGamma;
					let contrast = pcMaterial.rgbContrast;
					let brightness = pcMaterial.rgbBrightness;

					$('#lblRGBGamma' + i)[0].innerHTML = gamma.toFixed(2);
					$('#sldRGBGamma' + i).slider({value: gamma});

					$('#lblRGBContrast' + i)[0].innerHTML = contrast.toFixed(2);
					$('#sldRGBContrast' + i).slider({value: contrast});

					$('#lblRGBBrightness' + i)[0].innerHTML = brightness.toFixed(2);
					$('#sldRGBBrightness' + i).slider({value: brightness});
				}
			});

			viewer.addEventListener('length_unit_changed', e => {
				$('#optLengthUnit').selectmenu().val(e.value);
				$('#optLengthUnit').selectmenu('refresh');
			});

			viewer.addEventListener('pointcloud_loaded', updateHeightRange);

			updateHeightRange();
			updateIntensityRange();
			$('#lblIntensityGamma' + i)[0].innerHTML = pcMaterial.intensityGamma.toFixed(2);
			$('#lblIntensityContrast' + i)[0].innerHTML = pcMaterial.intensityContrast.toFixed(2);
			$('#lblIntensityBrightness' + i)[0].innerHTML = pcMaterial.intensityBrightness.toFixed(2);

			$('#lblRGBGamma' + i)[0].innerHTML = pcMaterial.rgbGamma.toFixed(2);
			$('#lblRGBContrast' + i)[0].innerHTML = pcMaterial.rgbContrast.toFixed(2);
			$('#lblRGBBrightness' + i)[0].innerHTML = pcMaterial.rgbBrightness.toFixed(2);

			let options = [
				'RGB',
				'RGB and Elevation',
				'Color',
				'Elevation',
				'Intensity',
				'Intensity Gradient',
				'Classification',
				'Return Number',
				'Source',
				'Phong',
				'Level of Detail',
				'Composite'
			];

			let elMaterialList = $('#optMaterial' + i);
			for (let i = 0; i < options.length; i++) {
				let option = options[i];
				let id = 'optMaterial_' + option + '_' + i;

				let elOption = $(`
					<option id="${id}">
						${option}
					</option>`);
				elMaterialList.append(elOption);
			}

			let updateMaterialPanel = function (event, ui) {
				let selectedValue = $('#optMaterial' + i).selectmenu().val();
				pcMaterial.pointColorType = viewer.toMaterialID(selectedValue);
				viewer.dispatchEvent({'type': 'material_changed' + i, 'viewer': viewer});

				let blockWeights = $('#materials\\.composite_weight_container' + i);
				let blockElevation = $('#materials\\.elevation_container' + i);
				let blockRGB = $('#materials\\.rgb_container' + i);
				let blockColor = $('#materials\\.color_container' + i);
				let blockIntensity = $('#materials\\.intensity_container' + i);
				let blockTransition = $('#materials\\.transition_container' + i);

				blockIntensity.css('display', 'none');
				blockElevation.css('display', 'none');
				blockRGB.css('display', 'none');
				blockColor.css('display', 'none');
				blockWeights.css('display', 'none');
				blockTransition.css('display', 'none');

				if (selectedValue === 'Composite') {
					blockWeights.css('display', 'block');
					blockElevation.css('display', 'block');
					blockRGB.css('display', 'block');
					blockIntensity.css('display', 'block');
				} else if (selectedValue === 'Elevation') {
					blockElevation.css('display', 'block');
				} else if (selectedValue === 'RGB and Elevation') {
					blockRGB.css('display', 'block');
					blockElevation.css('display', 'block');
				} else if (selectedValue === 'RGB') {
					blockRGB.css('display', 'block');
				} else if (selectedValue === 'Color') {
					blockColor.css('display', 'block');
				} else if (selectedValue === 'Intensity') {
					blockIntensity.css('display', 'block');
				} else if (selectedValue === 'Intensity Gradient') {
					blockIntensity.css('display', 'block');
				}
			};

			$('#optMaterial' + i).selectmenu({change: updateMaterialPanel});
			$('#optMaterial' + i).val(viewer.toMaterialName(pcMaterial.pointColorType)).selectmenu('refresh');
			updateMaterialPanel();

			viewer.addEventListener('material_changed' + i, e => {
				$('#optMaterial' + i).val(viewer.toMaterialName(pcMaterial.pointColorType)).selectmenu('refresh');
			});

			scenePanel.i18n();
		};

		let buildSceneList = () => {
			scenelist.empty();

			for (let i = 0; i < viewer.scene.pointclouds.length; i++) {
				initUIElements(i);
			}
		};

		buildSceneList();

		viewer.addEventListener('scene_changed', (e) => {
			buildSceneList();

			if (e.oldScene) {
				e.oldScene.removeEventListener('pointcloud_added', buildSceneList);
			}
			e.scene.addEventListener('pointcloud_added', buildSceneList);
		});

		viewer.scene.addEventListener('pointcloud_added', buildSceneList);

		let lastPos = new THREE.Vector3();
		let lastTarget = new THREE.Vector3();
		viewer.addEventListener('update', e => {
			let pos = viewer.scene.view.position;
			let target = viewer.scene.view.getPivot();

			if (pos.equals(lastPos) && target.equals(lastTarget)) {
				return;
			} else {
				lastPos.copy(pos);
				lastTarget.copy(target);
			}

			let strCamPos = '<br>' + [pos.x, pos.y, pos.z].map(e => e.toFixed(2)).join(', ');
			let strCamTarget = '<br>' + [target.x, target.y, target.z].map(e => e.toFixed(2)).join(', ');

			$('#lblCameraPosition').html(strCamPos);
			$('#lblCameraTarget').html(strCamTarget);
		});
	};

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

		let toClipModeCode = function (string) {
			if (string === 'No Clipping') {
				return Potree.ClipMode.DISABLED;
			} else if (string === 'Highlight Inside') {
				return Potree.ClipMode.HIGHLIGHT_INSIDE;
			} else if (string === 'Clip Outside') {
				return Potree.ClipMode.CLIP_OUTSIDE;
			}
		};

		let toClipModeString = function (code) {
			if (code === Potree.ClipMode.DISABLED) {
				return 'No Clipping';
			} else if (code === Potree.ClipMode.HIGHLIGHT_INSIDE) {
				return 'Highlight Inside';
			} else if (code === Potree.ClipMode.CLIP_OUTSIDE) {
				return 'Clip Outside';
			}
		};

		$('#optClipMode').selectmenu();
		$('#optClipMode').val(toClipModeString(viewer.getClipMode())).selectmenu('refresh');
		$('#optClipMode').selectmenu({
			change: function (event, ui) {
				viewer.setClipMode(toClipModeCode(ui.item.value));
			}
		});

		viewer.addEventListener('clip_mode_changed', e => {
			let string = toClipModeString(viewer.clipMode);

			$('#optClipMode')
				.selectmenu()
				.val(string)
				.selectmenu('refresh');
		});
	};

	initAccordion();
	initAppearance();
	initToolbar();
	initNavigation();
	initClassificationList();
	initAnnotationDetails();
	initMeasurementDetails();
	initSceneList();
	initSettings();

	$('#potree_version_number').html(Potree.version.major + '.' + Potree.version.minor + Potree.version.suffix);
	$('.perfect_scrollbar').perfectScrollbar();
};
