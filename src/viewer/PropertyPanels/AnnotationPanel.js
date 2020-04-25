
import {Utils} from "../../utils.js";

export class AnnotationPanel{
	constructor(viewer, propertiesPanel, annotation){
		this.viewer = viewer;
		this.propertiesPanel = propertiesPanel;
		this.annotation = annotation;

		this._update = () => { this.update(); };

		let copyIconPath = `${Potree.resourcePath}/icons/copy.svg`;
		this.elContent = $(`
		<div class="propertypanel_content">
			<table>
				<tr>
					<th colspan="3"><span data-i18n="annotations.annotation_position">`+i18n.t("annotations.annotation_position")+`</span></th>
					<th></th>
				</tr>
				<tr>
					<td align="center" id="annotation_position_x" style="width: 25%"></td>
					<td align="center" id="annotation_position_y" style="width: 25%"></td>
					<td align="center" id="annotation_position_z" style="width: 25%"></td>
					<td align="right" id="copy_annotation_position" style="width: 25%">
						<img name="copy" data-i18n="[title]scene.button_copy" class="button-icon" src="${copyIconPath}" style="width: 16px; height: 16px"/>
					</td>
				</tr>

			</table>

			<div>

				<div class="heading"><span data-i18n="annotations.annotation_title">`+i18n.t("annotations.annotation_title")+`</span></div>
				<div id="annotation_title" contenteditable="true">
					Annotation Title
				</div>

				<div class="heading"><span data-i18n="annotations.annotation_description">`+i18n.t("annotations.annotation_description")+`</span></div>
				<div id="annotation_description" contenteditable="true">
					A longer description of this annotation.
				</div>

			</div>

		</div>
		`);

		this.elCopyPosition = this.elContent.find("img[name=copy]");
		this.elCopyPosition.click( () => {
			let pos = this.annotation.position.toArray();
			let msg = pos.map(c => c.toFixed(3)).join(", ");
			Utils.clipboardCopy(msg);

			this.viewer.postMessage(
					`<span data-i18n=\"scene.camera_copy">`+i18n.t("scene.camera_copy")+`</span>: <br>'${msg}'`,
					{duration: 3000});
		});

		this.elTitle = this.elContent.find("#annotation_title").html(annotation.title);
		this.elDescription = this.elContent.find("#annotation_description").html(annotation.description);

		this.elTitle[0].addEventListener("input", () => {
			const title = this.elTitle.html();
			annotation.title = title;

		}, false);

		this.elDescription[0].addEventListener("input", () => {
			const description = this.elDescription.html();
			annotation.description = description;
		}, false);

		this.update();
	}

	update(){
		const {annotation, elContent, elTitle, elDescription} = this;

		let pos = annotation.position.toArray().map(c => Utils.addCommas(c.toFixed(3)));
		elContent.find("#annotation_position_x").html(pos[0]);
		elContent.find("#annotation_position_y").html(pos[1]);
		elContent.find("#annotation_position_z").html(pos[2]);

		elTitle.html(annotation.title);
		elDescription.html(annotation.description);

		this.elContent.i18n();
	}
};