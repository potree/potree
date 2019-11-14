import {Utils} from "../../utils.js";

export class AnnotationPanel{

    constructor(viewer, annotation, propertiesPanel) {
        this.viewer = viewer;
        this.annotation = annotation;
        this.propertiesPanel = propertiesPanel;

        this._update = () => { this.update(); };

        let copyIconPath = Potree.resourcePath + '/icons/copy.svg';
        let removeIconPath = Potree.resourcePath + '/icons/remove.svg';
		let editIconPath = Potree.resourcePath + '/icons/edit.svg';

        this.elContent = $(`
			<div class="propertypanel_content">
				<table>
					<tr>
						<th colspan="4" data-i18n="scene.annotation_position">`+i18n.t("scene.annotation_position")+`</th>
					</tr>
					<tr>
						<td align="center" id="annotation_position_x" style="width: 25%"></td>
						<td align="center" id="annotation_position_y" style="width: 25%"></td>
						<td align="center" id="annotation_position_z" style="width: 25%"></td>
						<td align="right" id="copyAnnotationPosition" style="width: 25%">
							<img name="copyAnnotationPosition" data-i18n="[title]scene.button_copy" class="button-icon" src="${copyIconPath}" style="width: 16px; height: 16px"/>
						</td>
					</tr>
					<tr>
						<th colspan="4" data-i18n="scene.camera_position">`+i18n.t("scene.camera_position")+`</th>
					</tr>
					<tr>
						<td align="center" id="camera_position_x" style="width: 25%"></td>
						<td align="center" id="camera_position_y" style="width: 25%"></td>
						<td align="center" id="camera_position_z" style="width: 25%"></td>
						<td align="right" id="copy_camera_position" style="width: 25%">
							<img name="copyCameraPosition" data-i18n="[title]scene.button_copy" class="button-icon" src="${copyIconPath}" style="width: 16px; height: 16px"/>
						</td>
					</tr>
					<tr>
						<th colspan="4" data-i18n="scene.camera_target">`+i18n.t("scene.camera_target")+`</th>
					</tr>
					<tr>
						<td align="center" id="camera_target_x" style="width: 25%"></td>
						<td align="center" id="camera_target_y" style="width: 25%"></td>
						<td align="center" id="camera_target_z" style="width: 25%"></td>
						<td align="right" id="copyCameraTarget" style="width: 25%">
							<img name="copyCameraTarget" data-i18n="[title]scene.button_remove" class="button-icon" src="${copyIconPath}" style="width: 16px; height: 16px"/>
						</td>
					</tr>				
				</table>
				
				
			</div>
		`);
		
		if(!this.viewer.restrictedAccess){
			this.elContent.append(`
				<!-- ACTIONS -->
				<div style="display: flex; margin-top: 12px">
					<span></span>
					<span style="flex-grow: 1"></span>
					<img name="edit" class="button-icon" data-i18n="[title]scene.button_edit" src="${editIconPath}" style="width: 16px; height: 16px"/>
					<img name="remove" class="button-icon" data-i18n="[title]scene.button_remove" src="${removeIconPath}" style="width: 16px; height: 16px"/>
				</div>
			`);
			
			this.elAnnotationEdit = this.elContent.find("img[name=edit]");
			this.elAnnotationEdit.click( () => {
				this.viewer.scene.editAnnotation(this.annotation);
			});
			
			this.elAnnotationRemove = this.elContent.find("img[name=remove]");
			this.elAnnotationRemove.click( () => {
				this.viewer.scene.removeAnnotation(this.annotation);
				
			});
		}
		
		this.elCopyAnnotationPosition = this.elContent.find("img[name=copyAnnotationPosition]");
		this.elCopyAnnotationPosition.click( () => {
			if(this.annotation.position !== undefined){
				let pos = this.annotation.position.toArray();
				let msg = pos.map(c => c.toFixed(3)).join(", ");
				Utils.clipboardCopy(msg);

				this.viewer.postMessage(
						`<span data-i18n=\"scene.camera_copy">`+i18n.t("scene.camera_copy")+`</span>: <br>'${msg}'`,
						{duration: 3000});
			}
		});

		this.elCopyCameraPosition = this.elContent.find("img[name=copyCameraPosition]");
		this.elCopyCameraPosition.click( () => {
			if(this.annotation.cameraPosition !== undefined){
				let pos = this.annotation.cameraPosition.toArray();
				let msg = pos.map(c => c.toFixed(3)).join(", ");
				Utils.clipboardCopy(msg);

				this.viewer.postMessage(
						`<span data-i18n=\"scene.camera_copy">`+i18n.t("scene.camera_copy")+`</span>: <br>'${msg}'`,
						{duration: 3000});
			}
		});
		
		this.copyCameraTarget = this.elContent.find("img[name=copyCameraTarget]");
		this.copyCameraTarget.click( () => {
			if(this.annotation.cameraTarget !== undefined){
				let pos = this.annotation.cameraTarget.toArray();
				let msg = pos.map(c => c.toFixed(3)).join(", ");
				Utils.clipboardCopy(msg);

				this.viewer.postMessage(
						`<span data-i18n=\"scene.camera_copy">`+i18n.t("scene.camera_copy")+`</span>: <br>'${msg}'`,
						{duration: 3000});
			}
		});
		
		this.propertiesPanel.addVolatileListener(this.annotation, "annotation_added", this._update);
		this.propertiesPanel.addVolatileListener(this.annotation, "annotation_edited", this._update);
		this.propertiesPanel.addVolatileListener(this.annotation, "annotation_removed", this._update);
        
        this.update();
    }

    update() {
        console.log("Updating Annotation panel");
		
		if(this.annotation.position !== undefined){
			let annotationPos = this.annotation.position.toArray().map(c => Utils.addCommas(c.toFixed(3)));
			this.elContent.find("#annotation_position_x").html(annotationPos[0]);
			this.elContent.find("#annotation_position_y").html(annotationPos[1]);
			this.elContent.find("#annotation_position_z").html(annotationPos[2]);
		}

		if(this.annotation.cameraPosition !== undefined){
			let cameraPosition = this.annotation.cameraPosition.toArray().map(c => Utils.addCommas(c.toFixed(3)));
			this.elContent.find("#camera_position_x").html(cameraPosition[0]);
			this.elContent.find("#camera_position_y").html(cameraPosition[1]);
			this.elContent.find("#camera_position_z").html(cameraPosition[2]);
		}
		
		if(this.annotation.cameraTarget !== undefined){
			let cameraTarget = this.annotation.cameraTarget.toArray().map(c => Utils.addCommas(c.toFixed(3)));
			this.elContent.find("#camera_target_x").html(cameraTarget[0]);
			this.elContent.find("#camera_target_y").html(cameraTarget[1]);
			this.elContent.find("#camera_target_z").html(cameraTarget[2]);
		}
    }
}