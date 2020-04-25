

import {Utils} from "../../utils.js";

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
						<img name="copy" data-i18n="[title]scene.button_copy" class="button-icon" src="${copyIconPath}" style="width: 16px; height: 16px"/>
					</td>
				</tr>
			`);

			this.elCopy = row.find("img[name=copy]");
			this.elCopy.click( () => {
				let msg = point.toArray().map(c => c.toFixed(3)).join(", ");
				Utils.clipboardCopy(msg);

				this.viewer.postMessage(
					`<span data-i18n=\"scene.camera_copy">`+i18n.t("scene.camera_copy")+`</span>: <br>'${msg}'`,
					{duration: 3000});
			});

			table.append(row);
		}

		return table;
	};

	createAttributesTable(){
		let elTable = $('<table class="measurement_value_table"></table>');

		let point = this.measurement.points[0];
		
		for(let attributeName of Object.keys(point)){
			if(attributeName === "position"){			
			} else if(attributeName === "rgba" || attributeName === 'color'){
				let color = point.rgba;
				let text = color.join(', ');

				elTable.append($(`
					<tr>
						<td><span data-i18n=\"profile.attribute_color">`+i18n.t("profile.attribute_color")+`</span></td>
						<td>${text}</td>
					</tr>
				`));
			} else {
				let value = point[attributeName];
				let text = value.join(', ');
				
				if (attributeName === 'intensity') {
					elTable.append($(`
						<tr>
							<td><span data-i18n=\"profile.attribute_intensity">`+i18n.t("profile.attribute_intensity")+`</span></td>
							<td>${text}</td>
						</tr>
					`));
				} else if (attributeName === 'classification') {
					elTable.append($(`
						<tr>
							<td><span data-i18n=\"profile.attribute_classification">`+i18n.t("profile.attribute_classification")+`</span></td>
							<td>${text}</td>
						</tr>
					`));
				} else if (attributeName === 'return number') {
					elTable.append($(`
						<tr>
							<td><span data-i18n=\"profile.attribute_returnnumber">`+i18n.t("profile.attribute_returnnumber")+`</span></td>
							<td>${text}</td>
						</tr>
					`));
				} else if (attributeName === 'number of returns') {
					elTable.append($(`
						<tr>
							<td><span data-i18n=\"profile.attribute_numberofreturns">`+i18n.t("profile.attribute_numberofreturns")+`</span></td>
							<td>${text}</td>
						</tr>
					`));
				} else if (attributeName === 'source id') {
					elTable.append($(`
						<tr>
							<td><span data-i18n=\"profile.attribute_sourceid">`+i18n.t("profile.attribute_sourceid")+`</span></td>
							<td>${text}</td>
						</tr>
					`));
				} else if (attributeName === 'gps-time') {
					elTable.append($(`
						<tr>
							<td><span data-i18n=\"profile.attribute_gpstime">`+i18n.t("profile.attribute_gpstime")+`</span></td>
							<td>${text}</td>
						</tr>
					`));
				} else{
					elTable.append($(`
						<tr>
							<td>${attributeName}</td>
							<td>${text}</td>
						</tr>
					`));
				}
			}
		}

		return elTable;
	}

	update(){

	}
};