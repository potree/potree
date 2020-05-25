

import {MeasurePanel} from "./MeasurePanel.js";

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
};
