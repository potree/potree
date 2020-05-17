

import {MeasurePanel} from "./MeasurePanel.js";

export class CirclePanel extends MeasurePanel{
	constructor(viewer, measurement, propertiesPanel){
		super(viewer, measurement, propertiesPanel);

		let removeIconPath = Potree.resourcePath + '/icons/remove.svg';
		this.elContent = $(`
			<div class="measurement_content selectable">
				<span class="coordinates_table_container"></span>
				<br>
				<table id="infos_table" class="measurement_value_table"></table>

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

		const elInfos = this.elContent.find(`#infos_table`);

		if(this.measurement.points.length !== 3){
			elInfos.empty();
			
			return;
		}

		const A = this.measurement.points[0].position;
		const B = this.measurement.points[1].position;
		const C = this.measurement.points[2].position;

		const center = Potree.Utils.computeCircleCenter(A, B, C);
		const radius = center.distanceTo(A);
		const circumference = 2 * Math.PI * radius;
		
		const format = (number) => {
			return Potree.Utils.addCommas(number.toFixed(3));
		};

		
		const txtCenter = `${format(center.x)} ${format(center.y)} ${format(center.z)}`;
		const txtRadius = format(radius);
		const txtCircumference = format(circumference);

		const thStyle = `style="text-align: left"`;
		const tdStyle = `style="width: 100%; padding: 5px;"`;
		
		elInfos.html(`
			<tr>
				<th ${thStyle}>Center: </th>
				<td ${tdStyle}></td>
			</tr>
			<tr>
				<td ${tdStyle} colspan="2">
					${txtCenter}
				</td>
			</tr>
			<tr>
				<th ${thStyle}>Radius: </th>
				<td ${tdStyle}>${txtRadius}</td>
			</tr>
			<tr>
				<th ${thStyle}>Circumference: </th>
				<td ${tdStyle}>${txtCircumference}</td>
			</tr>
		`);
	}
};
