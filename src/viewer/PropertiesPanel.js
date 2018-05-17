

import {Utils} from "../utils.js";
import {PointCloudTree} from "../PointCloudTree.js";
import {Measure} from "../utils/Measure.js";
import {Profile} from "../utils/Profile.js";
import {Volume, BoxVolume, SphereVolume} from "../utils/Volume.js";
import {PointSizeType, PointShape} from "../defines.js";
import {Gradients} from "../materials/Gradients.js";


export class MeasurePanel{

	constructor(viewer, measurement, propertiesPanel){
		this.viewer = viewer;
		this.measurement = measurement;
		this.propertiesPanel = propertiesPanel;

		this._update = () => { this.update(); };
	}

	createCoordinatesTable(points){
		let table = $(`
			<table class="measurement_value_table">
				<tr>
					<th>x</th>
					<th>y</th>
					<th>z</th>
					<th></th>
				</tr>
			</table>
		`);

		let copyIconPath = Potree.resourcePath + '/icons/copy.svg';

		for (let point of points) {
			let x = Utils.addCommas(point.x.toFixed(3));
			let y = Utils.addCommas(point.y.toFixed(3));
			let z = Utils.addCommas(point.z.toFixed(3));

			let row = $(`
				<tr>
					<td><span>${x}</span></td>
					<td><span>${y}</span></td>
					<td><span>${z}</span></td>
					<td align="right" style="width: 25%">
						<img name="copy" title="copy" class="button-icon" src="${copyIconPath}" style="width: 16px; height: 16px"/>
					</td>
				</tr>
			`);

			this.elCopy = row.find("img[name=copy]");
			this.elCopy.click( () => {
				let msg = point.toArray().map(c => c.toFixed(3)).join(", ");
				Utils.clipboardCopy(msg);

				this.viewer.postMessage(
					`Copied value to clipboard: <br>'${msg}'`,
					{duration: 3000});
			});

			table.append(row);
		}

		return table;
	};

	createAttributesTable(){
		let elTable = $('<table class="measurement_value_table"></table>');

		let point = this.measurement.points[0];

		if(point.color){
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
	}

	update(){

	}
};

export class DistancePanel extends MeasurePanel{
	constructor(viewer, measurement, propertiesPanel){
		super(viewer, measurement, propertiesPanel);

		let removeIconPath = Potree.resourcePath + '/icons/remove.svg';
		this.elContent = $(`
			<div class="measurement_content selectable">
				<span class="coordinates_table_container"></span>
				<br>
				<table id="distances_table" class="measurement_value_table"></table>

				<!-- ACTIONS -->
				<div style="display: flex; margin-top: 12px">
					<span></span>
					<span style="flex-grow: 1"></span>
					<img name="remove" class="button-icon" src="${removeIconPath}" style="width: 16px; height: 16px"/>
				</div>
			</div>
		`);

		this.elRemove = this.elContent.find("img[name=remove]");
		this.elRemove.click( () => {
			this.viewer.scene.removeMeasurement(measurement);
		});

		this.propertiesPanel.addVolatileListener(measurement, "marker_added", this._update);
		this.propertiesPanel.addVolatileListener(measurement, "marker_removed", this._update);
		this.propertiesPanel.addVolatileListener(measurement, "marker_moved", this._update);

		this.update();
	}

	update(){
		let elCoordiantesContainer = this.elContent.find('.coordinates_table_container');
		elCoordiantesContainer.empty();
		elCoordiantesContainer.append(this.createCoordinatesTable(this.measurement.points.map(p => p.position)));

		let positions = this.measurement.points.map(p => p.position);
		let distances = [];
		for (let i = 0; i < positions.length - 1; i++) {
			let d = positions[i].distanceTo(positions[i + 1]);
			distances.push(d.toFixed(3));
		}

		let totalDistance = this.measurement.getTotalDistance().toFixed(3);
		let elDistanceTable = this.elContent.find(`#distances_table`);
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
	}
}


export class PointPanel extends MeasurePanel{
	constructor(viewer, measurement, propertiesPanel){
		super(viewer, measurement, propertiesPanel);

		let removeIconPath = Potree.resourcePath + '/icons/remove.svg';
		this.elContent = $(`
			<div class="measurement_content selectable">
				<span class="coordinates_table_container"></span>
				<br>
				<span class="attributes_table_container"></span>

				<!-- ACTIONS -->
				<div style="display: flex; margin-top: 12px">
					<span></span>
					<span style="flex-grow: 1"></span>
					<img name="remove" class="button-icon" src="${removeIconPath}" style="width: 16px; height: 16px"/>
				</div>
			</div>
		`);

		this.elRemove = this.elContent.find("img[name=remove]");
		this.elRemove.click( () => {
			this.viewer.scene.removeMeasurement(measurement);
		});

		this.propertiesPanel.addVolatileListener(measurement, "marker_added", this._update);
		this.propertiesPanel.addVolatileListener(measurement, "marker_removed", this._update);
		this.propertiesPanel.addVolatileListener(measurement, "marker_moved", this._update);

		this.update();
	}

	update(){
		let elCoordiantesContainer = this.elContent.find('.coordinates_table_container');
		elCoordiantesContainer.empty();
		elCoordiantesContainer.append(this.createCoordinatesTable(this.measurement.points.map(p => p.position)));

		let elAttributesContainer = this.elContent.find('.attributes_table_container');
		elAttributesContainer.empty();
		elAttributesContainer.append(this.createAttributesTable());
	}
}


export class AreaPanel extends MeasurePanel{
	constructor(viewer, measurement, propertiesPanel){
		super(viewer, measurement, propertiesPanel);

		let removeIconPath = Potree.resourcePath + '/icons/remove.svg';
		this.elContent = $(`
			<div class="measurement_content selectable">
				<span class="coordinates_table_container"></span>
				<br>
				<span style="font-weight: bold">Area: </span>
				<span id="measurement_area"></span>

				<!-- ACTIONS -->
				<div style="display: flex; margin-top: 12px">
					<span></span>
					<span style="flex-grow: 1"></span>
					<img name="remove" class="button-icon" src="${removeIconPath}" style="width: 16px; height: 16px"/>
				</div>
			</div>
		`);

		this.elRemove = this.elContent.find("img[name=remove]");
		this.elRemove.click( () => {
			this.viewer.scene.removeMeasurement(measurement);
		});

		this.propertiesPanel.addVolatileListener(measurement, "marker_added", this._update);
		this.propertiesPanel.addVolatileListener(measurement, "marker_removed", this._update);
		this.propertiesPanel.addVolatileListener(measurement, "marker_moved", this._update);

		this.update();
	}

	update(){
		let elCoordiantesContainer = this.elContent.find('.coordinates_table_container');
		elCoordiantesContainer.empty();
		elCoordiantesContainer.append(this.createCoordinatesTable(this.measurement.points.map(p => p.position)));

		let elArea = this.elContent.find(`#measurement_area`);
		elArea.html(this.measurement.getArea().toFixed(3));
	}
}


export class AnglePanel extends MeasurePanel{
	constructor(viewer, measurement, propertiesPanel){
		super(viewer, measurement, propertiesPanel);

		let removeIconPath = Potree.resourcePath + '/icons/remove.svg';
		this.elContent = $(`
			<div class="measurement_content selectable">
				<span class="coordinates_table_container"></span>
				<br>
				<table class="measurement_value_table">
					<tr>
						<th>\u03b1</th>
						<th>\u03b2</th>
						<th>\u03b3</th>
					</tr>
					<tr>
						<td align="center" id="angle_cell_alpha" style="width: 33%"></td>
						<td align="center" id="angle_cell_betta" style="width: 33%"></td>
						<td align="center" id="angle_cell_gamma" style="width: 33%"></td>
					</tr>
				</table>

				<!-- ACTIONS -->
				<div style="display: flex; margin-top: 12px">
					<span></span>
					<span style="flex-grow: 1"></span>
					<img name="remove" class="button-icon" src="${removeIconPath}" style="width: 16px; height: 16px"/>
				</div>
			</div>
		`);

		this.elRemove = this.elContent.find("img[name=remove]");
		this.elRemove.click( () => {
			this.viewer.scene.removeMeasurement(measurement);
		});

		this.propertiesPanel.addVolatileListener(measurement, "marker_added", this._update);
		this.propertiesPanel.addVolatileListener(measurement, "marker_removed", this._update);
		this.propertiesPanel.addVolatileListener(measurement, "marker_moved", this._update);

		this.update();
	}

	update(){
		let elCoordiantesContainer = this.elContent.find('.coordinates_table_container');
		elCoordiantesContainer.empty();
		elCoordiantesContainer.append(this.createCoordinatesTable(this.measurement.points.map(p => p.position)));

		let angles = [];
		for(let i = 0; i < this.measurement.points.length; i++){
			angles.push(this.measurement.getAngle(i) * (180.0 / Math.PI));
		}
		angles = angles.map(a => a.toFixed(1) + '\u00B0');

		let elAlpha = this.elContent.find(`#angle_cell_alpha`);
		let elBetta = this.elContent.find(`#angle_cell_betta`);
		let elGamma = this.elContent.find(`#angle_cell_gamma`);

		elAlpha.html(angles[0]);
		elBetta.html(angles[1]);
		elGamma.html(angles[2]);
	}
}


export class HeightPanel extends MeasurePanel{
	constructor(viewer, measurement, propertiesPanel){
		super(viewer, measurement, propertiesPanel);

		let removeIconPath = Potree.resourcePath + '/icons/remove.svg';
		this.elContent = $(`
			<div class="measurement_content selectable">
				<span class="coordinates_table_container"></span>
				<br>
				<span id="height_label">Height: </span><br>

				<!-- ACTIONS -->
				<div style="display: flex; margin-top: 12px">
					<span></span>
					<span style="flex-grow: 1"></span>
					<img name="remove" class="button-icon" src="${removeIconPath}" style="width: 16px; height: 16px"/>
				</div>
			</div>
		`);

		this.elRemove = this.elContent.find("img[name=remove]");
		this.elRemove.click( () => {
			this.viewer.scene.removeMeasurement(measurement);
		});

		this.propertiesPanel.addVolatileListener(measurement, "marker_added", this._update);
		this.propertiesPanel.addVolatileListener(measurement, "marker_removed", this._update);
		this.propertiesPanel.addVolatileListener(measurement, "marker_moved", this._update);

		this.update();
	}

	update(){
		let elCoordiantesContainer = this.elContent.find('.coordinates_table_container');
		elCoordiantesContainer.empty();
		elCoordiantesContainer.append(this.createCoordinatesTable(this.measurement.points.map(p => p.position)));

		{
			let points = this.measurement.points;

			let sorted = points.slice().sort((a, b) => a.position.z - b.position.z);
			let lowPoint = sorted[0].position.clone();
			let highPoint = sorted[sorted.length - 1].position.clone();
			let min = lowPoint.z;
			let max = highPoint.z;
			let height = max - min;
			height = height.toFixed(3);

			this.elHeightLabel = this.elContent.find(`#height_label`);
			this.elHeightLabel.html(`<b>Height:</b> ${height}`);
		}
	}
}

export class VolumePanel extends MeasurePanel{
	constructor(viewer, measurement, propertiesPanel){
		super(viewer, measurement, propertiesPanel);

		let copyIconPath = Potree.resourcePath + '/icons/copy.svg';
		let removeIconPath = Potree.resourcePath + '/icons/remove.svg';

		let lblLengthText = new Map([
			[BoxVolume, "length"],
			[SphereVolume, "rx"],
		]).get(measurement.constructor);

		let lblWidthText = new Map([
			[BoxVolume, "width"],
			[SphereVolume, "ry"],
		]).get(measurement.constructor);

		let lblHeightText = new Map([
			[BoxVolume, "height"],
			[SphereVolume, "rz"],
		]).get(measurement.constructor);

		this.elContent = $(`
			<div class="measurement_content selectable">
				<span class="coordinates_table_container"></span>

				<table class="measurement_value_table">
					<tr>
						<th>\u03b1</th>
						<th>\u03b2</th>
						<th>\u03b3</th>
						<th></th>
					</tr>
					<tr>
						<td align="center" id="angle_cell_alpha" style="width: 33%"></td>
						<td align="center" id="angle_cell_betta" style="width: 33%"></td>
						<td align="center" id="angle_cell_gamma" style="width: 33%"></td>
						<td align="right" style="width: 25%">
							<img name="copyRotation" title="copy" class="button-icon" src="${copyIconPath}" style="width: 16px; height: 16px"/>
						</td>
					</tr>
				</table>

				<table class="measurement_value_table">
					<tr>
						<th>${lblLengthText}</th>
						<th>${lblWidthText}</th>
						<th>${lblHeightText}</th>
						<th></th>
					</tr>
					<tr>
						<td align="center" id="cell_length" style="width: 33%"></td>
						<td align="center" id="cell_width" style="width: 33%"></td>
						<td align="center" id="cell_height" style="width: 33%"></td>
						<td align="right" style="width: 25%">
							<img name="copyScale" title="copy" class="button-icon" src="${copyIconPath}" style="width: 16px; height: 16px"/>
						</td>
					</tr>
				</table>

				<br>
				<span style="font-weight: bold">Volume: </span>
				<span id="measurement_volume"></span>

				<!--
				<li>
					<label style="whitespace: nowrap">
						<input id="volume_show" type="checkbox"/>
						<span>show volume</span>
					</label>
				</li>-->

				<li>
					<label style="whitespace: nowrap">
						<input id="volume_clip" type="checkbox"/>
						<span>make clip volume</span>
					</label>
				</li>

				<li>
					<input name="download_volume" type="button" value="download" style="display:hidden" />
				</li>


				<!-- ACTIONS -->
				<input id="volume_reset_orientation" type="button" value="reset orientation"/>
				<input id="volume_make_uniform" type="button" value="make uniform"/>
				<div style="display: flex; margin-top: 12px">
					<span></span>
					<span style="flex-grow: 1"></span>
					<img name="remove" class="button-icon" src="${removeIconPath}" style="width: 16px; height: 16px"/>
				</div>
			</div>
		`);

		{ // download
			this.elDownloadButton = this.elContent.find("input[name=download_volume]");

			if(this.propertiesPanel.viewer.server){
				this.elDownloadButton.click(() => this.download());
			} else {
				this.elDownloadButton.hide();
			}
		}

		this.elCopyRotation = this.elContent.find("img[name=copyRotation]");
		this.elCopyRotation.click( () => {
			let rotation = this.measurement.rotation.toArray().slice(0, 3);
			let msg = rotation.map(c => c.toFixed(3)).join(", ");
			Utils.clipboardCopy(msg);

			this.viewer.postMessage(
					`Copied value to clipboard: <br>'${msg}'`,
					{duration: 3000});
		});

		this.elCopyScale = this.elContent.find("img[name=copyScale]");
		this.elCopyScale.click( () => {
			let scale = this.measurement.scale.toArray();
			let msg = scale.map(c => c.toFixed(3)).join(", ");
			Utils.clipboardCopy(msg);

			this.viewer.postMessage(
					`Copied value to clipboard: <br>'${msg}'`,
					{duration: 3000});
		});

		this.elRemove = this.elContent.find("img[name=remove]");
		this.elRemove.click( () => {
			this.viewer.scene.removeVolume(measurement);
		});

		this.elContent.find("#volume_reset_orientation").click(() => {
			measurement.rotation.set(0, 0, 0);
		});

		this.elContent.find("#volume_make_uniform").click(() => {
			let mean = (measurement.scale.x + measurement.scale.y + measurement.scale.z) / 3;
			measurement.scale.set(mean, mean, mean);
		});

		this.elCheckClip = this.elContent.find('#volume_clip');
		this.elCheckClip.click(event => {
			this.measurement.clip = event.target.checked;
		});

		this.elCheckShow = this.elContent.find('#volume_show');
		this.elCheckShow.click(event => {
			this.measurement.visible = event.target.checked;
		});

		this.propertiesPanel.addVolatileListener(measurement, "position_changed", this._update);
		this.propertiesPanel.addVolatileListener(measurement, "orientation_changed", this._update);
		this.propertiesPanel.addVolatileListener(measurement, "scale_changed", this._update);
		this.propertiesPanel.addVolatileListener(measurement, "clip_changed", this._update);

		this.update();
	}

	download(){
		let boxes = [this.measurement.matrixWorld]
			.map(m => m.elements.join(','))
			.join(',');

		let minLOD = 0;
		let maxLOD = 100;

		let pcs = [];
		for (let pointcloud of this.viewer.scene.pointclouds) {
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
		console.log(request);
	}

	update(){
		let elCoordiantesContainer = this.elContent.find('.coordinates_table_container');
		elCoordiantesContainer.empty();
		elCoordiantesContainer.append(this.createCoordinatesTable([this.measurement.position]));

		{
			let angles = this.measurement.rotation.toVector3();
			angles = angles.toArray();
			//angles = [angles.z, angles.x, angles.y];
			angles = angles.map(v => 180 * v / Math.PI);
			angles = angles.map(a => a.toFixed(1) + '\u00B0');

			let elAlpha = this.elContent.find(`#angle_cell_alpha`);
			let elBetta = this.elContent.find(`#angle_cell_betta`);
			let elGamma = this.elContent.find(`#angle_cell_gamma`);

			elAlpha.html(angles[0]);
			elBetta.html(angles[1]);
			elGamma.html(angles[2]);
		}

		{
			let dimensions = this.measurement.scale.toArray();
			dimensions = dimensions.map(v => Utils.addCommas(v.toFixed(2)));

			let elLength = this.elContent.find(`#cell_length`);
			let elWidth = this.elContent.find(`#cell_width`);
			let elHeight = this.elContent.find(`#cell_height`);

			elLength.html(dimensions[0]);
			elWidth.html(dimensions[1]);
			elHeight.html(dimensions[2]);
		}

		{
			let elVolume = this.elContent.find(`#measurement_volume`);
			let volume = this.measurement.getVolume();
			elVolume.html(Utils.addCommas(volume.toFixed(2)));
		}

		this.elCheckClip.prop("checked", this.measurement.clip);
		this.elCheckShow.prop("checked", this.measurement.visible);

	}
}


export class ProfilePanel extends MeasurePanel{
	constructor(viewer, measurement, propertiesPanel){
		super(viewer, measurement, propertiesPanel);

		let removeIconPath = Potree.resourcePath + '/icons/remove.svg';
		this.elContent = $(`
			<div class="measurement_content selectable">
				<span class="coordinates_table_container"></span>
				<br>
				<span style="display:flex">
					<span style="display:flex; align-items: center; padding-right: 10px">Width: </span>
					<input id="sldProfileWidth" name="sldProfileWidth" value="5.06" style="flex-grow: 1; width:100%">
				</span>
				<br>

				<input type="button" value="Prepare Download" id="download_profile"/>
				<span id="download_profile_status"></span>
				<br>
				<input type="button" id="show_2d_profile" value="show 2d profile" style="width: 100%"/>

				<!-- ACTIONS -->
				<div style="display: flex; margin-top: 12px">
					<span></span>
					<span style="flex-grow: 1"></span>
					<img name="remove" class="button-icon" src="${removeIconPath}" style="width: 16px; height: 16px"/>
				</div>
			</div>
		`);

		this.elRemove = this.elContent.find("img[name=remove]");
		this.elRemove.click( () => {
			this.viewer.scene.removeProfile(measurement);
		});

		{ // download
			this.elDownloadButton = this.elContent.find(`#download_profile`);

			if(this.propertiesPanel.viewer.server){
				this.elDownloadButton.click(() => this.download());
			} else {
				this.elDownloadButton.hide();
			}
		}

		{ // width spinner
			let elWidthSlider = this.elContent.find(`#sldProfileWidth`);

			elWidthSlider.spinner({
				min: 0, max: 10 * 1000 * 1000, step: 0.01,
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

			let widthListener = (event) => {
				let value = elWidthSlider.spinner('value');
				if (value !== measurement.getWidth()) {
					elWidthSlider.spinner('value', measurement.getWidth());
				}
			};
			this.propertiesPanel.addVolatileListener(measurement, "width_changed", widthListener);
		}

		let elShow2DProfile = this.elContent.find(`#show_2d_profile`);
		elShow2DProfile.click(() => {
			this.propertiesPanel.viewer.profileWindow.show();
			this.propertiesPanel.viewer.profileWindowController.setProfile(measurement);
		});

		this.propertiesPanel.addVolatileListener(measurement, "marker_added", this._update);
		this.propertiesPanel.addVolatileListener(measurement, "marker_removed", this._update);
		this.propertiesPanel.addVolatileListener(measurement, "marker_moved", this._update);

		this.update();
	}

	update(){
		let elCoordiantesContainer = this.elContent.find('.coordinates_table_container');
		elCoordiantesContainer.empty();
		elCoordiantesContainer.append(this.createCoordinatesTable(this.measurement.points));
	}
}

export class CameraPanel{
	constructor(viewer, propertiesPanel){
		this.viewer = viewer;
		this.propertiesPanel = propertiesPanel;

		this._update = () => { this.update(); };

		let copyIconPath = Potree.resourcePath + '/icons/copy.svg';
		this.elContent = $(`
		<div class="propertypanel_content">
			<table>
				<tr>
					<th colspan="3">position</th>
					<th></th>
				</tr>
				<tr>
					<td align="center" id="camera_position_x" style="width: 25%"></td>
					<td align="center" id="camera_position_y" style="width: 25%"></td>
					<td align="center" id="camera_position_z" style="width: 25%"></td>
					<td align="right" id="copy_camera_position" style="width: 25%">
						<img name="copyPosition" title="copy" class="button-icon" src="${copyIconPath}" style="width: 16px; height: 16px"/>
					</td>
				</tr>
				<tr>
					<th colspan="3">target</th>
					<th></th>
				</tr>
				<tr>
					<td align="center" id="camera_target_x" style="width: 25%"></td>
					<td align="center" id="camera_target_y" style="width: 25%"></td>
					<td align="center" id="camera_target_z" style="width: 25%"></td>
					<td align="right" id="copy_camera_target" style="width: 25%">
						<img name="copyTarget" title="copy" class="button-icon" src="${copyIconPath}" style="width: 16px; height: 16px"/>
					</td>
				</tr>
			</table>
		</div>
		`);

		this.elCopyPosition = this.elContent.find("img[name=copyPosition]");
		this.elCopyPosition.click( () => {
			let pos = this.viewer.scene.getActiveCamera().position.toArray();
			let msg = pos.map(c => c.toFixed(3)).join(", ");
			Utils.clipboardCopy(msg);

			this.viewer.postMessage(
					`Copied value to clipboard: <br>'${msg}'`,
					{duration: 3000});
		});

		this.elCopyTarget = this.elContent.find("img[name=copyTarget]");
		this.elCopyTarget.click( () => {
			let pos = this.viewer.scene.view.getPivot().toArray();
			let msg = pos.map(c => c.toFixed(3)).join(", ");
			Utils.clipboardCopy(msg);

			this.viewer.postMessage(
					`Copied value to clipboard: <br>'${msg}'`,
					{duration: 3000});
		});

		this.propertiesPanel.addVolatileListener(viewer, "camera_changed", this._update);

		this.update();
	}

	update(){
		console.log("updating camera panel");

		let camera = this.viewer.scene.getActiveCamera();
		let view = this.viewer.scene.view;

		let pos = camera.position.toArray().map(c => Utils.addCommas(c.toFixed(3)));
		this.elContent.find("#camera_position_x").html(pos[0]);
		this.elContent.find("#camera_position_y").html(pos[1]);
		this.elContent.find("#camera_position_z").html(pos[2]);

		let target = view.getPivot().toArray().map(c => Utils.addCommas(c.toFixed(3)));
		this.elContent.find("#camera_target_x").html(target[0]);
		this.elContent.find("#camera_target_y").html(target[1]);
		this.elContent.find("#camera_target_z").html(target[2]);
	}
}


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
				<span data-i18n="appearance.point_size"></span>:<span id="lblPointSize"></span> <div id="sldPointSize"></div>
				</li>

				<!-- SIZE TYPE -->
				<li>
					<label for="optPointSizing" class="pv-select-label" data-i18n="appearance.point_size_type">Point Sizing </label>
					<select id="optPointSizing" name="optPointSizing">
						<option>FIXED</option>
						<option>ATTENUATED</option>
						<option>ADAPTIVE</option>
					</select>
				</li>

				<!-- SHAPE -->
				<li>
					<label for="optShape" class="pv-select-label" data-i18n="appearance.point_shape"></label><br>
					<select id="optShape" name="optShape">
						<option>SQUARE</option>
						<option>CIRCLE</option>
						<option>PARABOLOID</option>
					</select>
				</li>

				<!-- OPACITY -->
				<li><span data-i18n="appearance.point_opacity"></span>:<span id="lblOpacity"></span><div id="sldOpacity"></div></li>

				<div class="divider">
					<span>Attribute</span>
				</div>

				<li>
					<!--<label for="optMaterial" class="pv-select-label">Attributes:</label><br>-->
					<select id="optMaterial" name="optMaterial">
					</select>
				</li>

				<div id="materials.composite_weight_container">
					<div class="divider">
						<span>Attribute Weights</span>
					</div>

					<li>RGB: <span id="lblWeightRGB"></span> <div id="sldWeightRGB"></div>	</li>
					<li>Intensity: <span id="lblWeightIntensity"></span> <div id="sldWeightIntensity"></div>	</li>
					<li>Elevation: <span id="lblWeightElevation"></span> <div id="sldWeightElevation"></div>	</li>
					<li>Classification: <span id="lblWeightClassification"></span> <div id="sldWeightClassification"></div>	</li>
					<li>Return Number: <span id="lblWeightReturnNumber"></span> <div id="sldWeightReturnNumber"></div>	</li>
					<li>Source ID: <span id="lblWeightSourceID"></span> <div id="sldWeightSourceID"></div>	</li>
				</div>

				<div id="materials.rgb_container">
					<div class="divider">
						<span>RGB</span>
					</div>

					<li>Gamma: <span id="lblRGBGamma"></span> <div id="sldRGBGamma"></div>	</li>
					<li>Brightness: <span id="lblRGBBrightness"></span> <div id="sldRGBBrightness"></div>	</li>
					<li>Contrast: <span id="lblRGBContrast"></span> <div id="sldRGBContrast"></div>	</li>
				</div>

				<div id="materials.color_container">
					<div class="divider">
						<span>Color</span>
					</div>

					<input id="materials.color.picker" />
				</div>


				<div id="materials.elevation_container">
					<div class="divider">
						<span>Elevation</span>
					</div>

					<li><span data-i18n="appearance.elevation_range"></span>: <span id="lblHeightRange"></span> <div id="sldHeightRange"></div>	</li>
					<li>
						<span>Gradient Scheme:</span>
						<div id="elevation_gradient_scheme_selection" style="display: flex">
						<!--
							<span style="flex-grow: 1;">
								<img id="gradient_spectral" class="button-icon" style="max-width: 100%" src="${Potree.resourcePath}/icons/gradients_spectral.png" />
							</span>
							<span style="flex-grow: 1;">
								<img id="gradient_yellow_green" class="button-icon" style="max-width: 100%" src="${Potree.resourcePath}/icons/gradients_yellow_green.png" />
							</span>
							<span style="flex-grow: 1;">
								<img class="button-icon" style="max-width: 100%" src="${Potree.resourcePath}/icons/gradients_plasma.png" />
							</span>
							<span style="flex-grow: 1;">
								<img class="button-icon" style="max-width: 100%" src="${Potree.resourcePath}/icons/gradients_grayscale.png" />
							</span>
							<span style="flex-grow: 1;">
								<img class="button-icon" style="max-width: 100%" src="${Potree.resourcePath}/icons/gradients_rainbow.png" />
							</span>
							-->
						</div>
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
						<span>Intensity</span>
					</div>

					<li>Range: <span id="lblIntensityRange"></span> <div id="sldIntensityRange"></div>	</li>
					<li>Gamma: <span id="lblIntensityGamma"></span> <div id="sldIntensityGamma"></div>	</li>
					<li>Brightness: <span id="lblIntensityBrightness"></span> <div id="sldIntensityBrightness"></div>	</li>
					<li>Contrast: <span id="lblIntensityContrast"></span> <div id="sldIntensityContrast"></div>	</li>
				</div>
				
				<div id="materials.index_container">
					<div class="divider">
						<span>Indices</span>
					</div>
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
				'RGB',
				'RGB and Elevation',
				'Color',
				'Elevation',
				'Intensity',
				'Intensity Gradient',
				'Classification',
				'Return Number',
				'Source',
				'Index',
				'Level of Detail',
				'Composite'
			];

			let attributeSelection = panel.find('#optMaterial');
			for(let option of options){
				let elOption = $(`<option>${option}</option>`);
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
				let blockIndex = $('#materials\\.index_container');
				let blockTransition = $('#materials\\.transition_container');

				blockIndex.css('display', 'none');
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
				} else if (selectedValue === "Index" ){
					blockIndex.css('display', 'block');
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
				{name: "RAINBOW", icon: `${Potree.resourcePath}/icons/gradients_rainbow.png`},
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

			//panel.find("#gradient_spectral").click( () => {
			//	pointcloud.material.gradient = Potree.Gradients.SPECTRAL;
			//});

			//panel.find("#gradient_yellow_green").click( () => {
			//	pointcloud.material.gradient = Potree.Gradients.YELLOW_GREEN;
			//});
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
				chooseText: 'Apply',
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

				panel.find('#lblHeightRange').html(`${range[0].toFixed(2)} to ${range[1].toFixed(2)}`);
				panel.find('#sldHeightRange').slider({min: bMin, max: bMax, values: range});
			};

			let updateIntensityRange = function () {
				let range = material.intensityRange;
				let [min, max] = range.map(v => Math.log2(v) / 16);

				panel.find('#lblIntensityRange').html(`${parseInt(range[0])} to ${parseInt(range[1])}`);
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

		//this.container.html("measurement");

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