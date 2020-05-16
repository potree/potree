

import {MeasurePanel} from "./MeasurePanel.js";

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
};