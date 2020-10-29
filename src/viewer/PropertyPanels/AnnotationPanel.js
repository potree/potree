
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
					<th colspan="3">position</th>
					<th></th>
				</tr>
				<tr>
					<td align="center" id="annotation_position_x" style="width: 25%"></td>
					<td align="center" id="annotation_position_y" style="width: 25%"></td>
					<td align="center" id="annotation_position_z" style="width: 25%"></td>
					<td align="right" id="copy_annotation_position" style="width: 25%">
						<img name="copyPosition" title="copy" class="button-icon" src="${copyIconPath}" style="width: 16px; height: 16px"/>
					</td>
				</tr>

			</table>

			<div>

				<div class="heading">Title</div>
				<div id="annotation_title" contenteditable="true">
					Annotation Title
				</div>

				<div class="heading">Description</div>
				<div id="annotation_description" contenteditable="true">
					A longer description of this annotation. 
						Can be multiple lines long. TODO: the user should be able
						to modify title and description. 
				</div>

			</div>

		</div>
		`);

		this.elCopyPosition = this.elContent.find("img[name=copyPosition]");
		this.elCopyPosition.click( () => {
			let pos = this.annotation.position.toArray();
			let msg = pos.map(c => c.toFixed(3)).join(", ");
			Utils.clipboardCopy(msg);

			this.viewer.postMessage(
					`Copied value to clipboard: <br>'${msg}'`,
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


	}
};