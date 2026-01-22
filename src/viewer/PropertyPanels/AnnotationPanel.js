
import {Utils} from "../../utils.js";

export class AnnotationPanel{
	constructor(viewer, propertiesPanel, annotation){
		this.viewer = viewer;
		this.propertiesPanel = propertiesPanel;
		this.annotation = annotation;

		this._update = () => { this.update(); };
		
		this.isEditMode = false;
		this.isCameraMode = false;

		let copyIconPath = `${Potree.resourcePath}/icons/copy.svg`;
		let editIconPath = Potree.resourcePath + '/icons/edit.svg';
		let saveIconPath = Potree.resourcePath + '/icons/save.svg';
		let removeIconPath = Potree.resourcePath + '/icons/remove.svg';
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
						<img name="copyPosition" data-i18n="[title]scene.button_copy" class="button-icon" src="${copyIconPath}" style="width: 16px; height: 16px"/>
					</td>
				</tr>
				<tr>
					<th colspan="4" data-i18n="scene.camera_position">`+i18n.t("scene.camera_position")+`</th>
				</tr>
				<tr>
					<td align="center" id="annotation_camera_position_x" style="width: 25%"></td>
					<td align="center" id="annotation_camera_position_y" style="width: 25%"></td>
					<td align="center" id="annotation_camera_position_z" style="width: 25%"></td>
					<td align="right" id="copy_annotation_camera_position" style="width: 25%">
						<img name="copyCameraPosition" data-i18n="[title]scene.button_copy" class="button-icon" src="${copyIconPath}" style="width: 16px; height: 16px"/>
					</td>
				</tr>
				<tr>
					<th colspan="4" data-i18n="scene.camera_target">`+i18n.t("scene.camera_target")+`</th>
				</tr>
				<tr>
					<td align="center" id="annotation_camera_target_x" style="width: 25%"></td>
					<td align="center" id="annotation_camera_target_y" style="width: 25%"></td>
					<td align="center" id="annotation_camera_target_z" style="width: 25%"></td>
					<td align="right" id="copy_annotation_camera_target" style="width: 25%">
						<img name="copyCameraTarget" data-i18n="[title]scene.button_copy" class="button-icon" src="${copyIconPath}" style="width: 16px; height: 16px"/>
					</td>
				</tr>
			</table>
			<div id="annotation_save_camera"></div>

			<div>

				<div class="heading"><span data-i18n="annotations.annotation_title">`+i18n.t("annotations.annotation_title")+`</span></div>
				<div id="annotation_title" contenteditable="false">
					Annotation Title
				</div>

				<div class="heading"><span data-i18n="annotations.annotation_description">`+i18n.t("annotations.annotation_description")+`</span></div>
				<div id="annotation_description" contenteditable="false">
					A longer description of this annotation.
				</div>

			</div>
			
			<div id="annotation_hierarchy"></div>
			
			<!-- ACTIONS -->
				<div style="display: flex; margin-top: 12px">
					<span></span>
					<span style="flex-grow: 1"></span>
					<img name="edit" data-i18n="[title]scene.button_edit" class="button-icon" src="${editIconPath}" style="width: 16px; height: 16px"/>
					<img name="save" data-i18n="[title]scene.button_valid" class="button-icon" src="${saveIconPath}" style="width: 16px; height: 16px"/>
					<img name="remove" data-i18n="[title]scene.button_remove" class="button-icon" src="${removeIconPath}" style="width: 16px; height: 16px"/>
				</div>
		</div>
		`);
		
		this.elCopyPosition = this.elContent.find("img[name=copyPosition]");
		this.elCopyPosition.click( () => {
			let pos = this.annotation.position.toArray();
			let msg = pos.map(c => c.toFixed(3)).join(", ");
			Utils.clipboardCopy(msg);

			this.viewer.postMessage(
					`<span data-i18n=\"scene.camera_copy">`+i18n.t("scene.camera_copy")+`</span>: <br>'${msg}'`,
					{duration: 3000});
		});
		
		this.elCopyCameraPosition = this.elContent.find("img[name=copyCameraPosition]");
		this.elCopyCameraPosition.click( () => {
			if(this.annotation.cameraPosition !== undefined && !this.isEditMode){
				let pos = this.annotation.cameraPosition.toArray();
				let msg = pos.map(c => c.toFixed(3)).join(", ");
				Utils.clipboardCopy(msg);

				this.viewer.postMessage(
						`<span data-i18n=\"scene.camera_copy">`+i18n.t("scene.camera_copy")+`</span>: <br>'${msg}'`,
						{duration: 3000});
			} else if(this.isEditMode) {
				let pos = this.viewer.scene.getActiveCamera().position.toArray();
				let msg = pos.map(c => c.toFixed(3)).join(", ");
				Utils.clipboardCopy(msg);

				this.viewer.postMessage(
						`<span data-i18n=\"scene.camera_copy">`+i18n.t("scene.camera_copy")+`</span>: <br>'${msg}'`,
						{duration: 3000});
			}
		});
		
		this.elCopyCameraTarget = this.elContent.find("img[name=copyCameraTarget]");
		this.elCopyCameraTarget.click( () => {
			if(this.annotation.cameraTarget !== undefined && !this.isEditMode){
				let pos = this.annotation.cameraTarget.toArray();
				let msg = pos.map(c => c.toFixed(3)).join(", ");
				Utils.clipboardCopy(msg);

				this.viewer.postMessage(
						`<span data-i18n=\"scene.camera_copy">`+i18n.t("scene.camera_copy")+`</span>: <br>'${msg}'`,
						{duration: 3000});
			} else if(this.isEditMode) {
				let pos = this.viewer.scene.view.getPivot().toArray();
				let msg = pos.map(c => c.toFixed(3)).join(", ");
				Utils.clipboardCopy(msg);

				this.viewer.postMessage(
						`<span data-i18n=\"scene.camera_copy">`+i18n.t("scene.camera_copy")+`</span>: <br>'${msg}'`,
						{duration: 3000});
			}
		});

		this.elTitle = this.elContent.find("#annotation_title");//.html(annotation.title);
		this.elDescription = this.elContent.find("#annotation_description");//.html(annotation.description);

		this.elTitle[0].addEventListener("input", () => {
			const title = this.elTitle.text();
			annotation.title = title;
		}, false);

		this.elDescription[0].addEventListener("input", () => {
			const description = this.elDescription.text();
			annotation.description = description;
			annotation.setHighlighted(true);
		}, false);
		
		this.elEdit = this.elContent.find("img[name=edit]");
		this.elEdit.click( () => {
			this.isEditMode = true;
			
			this.elTitle[0].setAttribute("contenteditable", "true");
			this.elDescription[0].setAttribute("contenteditable", "true");
			
			annotation.setHighlighted(true);
			annotation.moveHere(this.viewer.scene.getActiveCamera());
			
			
			//Annotation camera modifier
			this.propertiesPanel.addVolatileListener(viewer, "camera_changed", this._update);
			
			let elCameraSave = this.elContent.find("#annotation_save_camera");
			elCameraSave.append(`
				<li>
					<center>
					<label style="whitespace: nowrap">
						<input id="save_camera" type="checkbox"/>
						<span data-i18n="annotations.annotation_save_camera">` + i18n.t("annotations.annotation_save_camera") +`</span>
					</label>
					
					<button id="move_annotation" data-i18n="annotations.annotation_move">` + i18n.t("annotations.annotation_move") +`</button>				
					</center>
				</li>
			`);
			
			this.elCheckClip = this.elContent.find('#save_camera');
			this.isCameraMode = (annotation.cameraPosition !== undefined && annotation.cameraTarget !== undefined);
			this.elCheckClip[0].checked = this.isCameraMode;
			
			this.elCheckClip.click(event => {
				this.isCameraMode = event.target.checked;
				
				if(!this.isEditMode) {
					annotation.cameraPosition = undefined;
					annotation.cameraTarget = undefined;
					
					this.elContent.find("#annotation_camera_position_x").html("");
					this.elContent.find("#annotation_camera_position_y").html("");
					this.elContent.find("#annotation_camera_position_z").html("");
					
					this.elContent.find("#annotation_camera_target_x").html("");
					this.elContent.find("#annotation_camera_target_y").html("");
					this.elContent.find("#annotation_camera_target_z").html("");
				}
				
				this.update();
			});
			
			
			
			//Annotation position modifier
			this.elContent.find("#move_annotation").click(() => {
				annotation.setHighlighted(false);
				this.viewer.disableAnnotations ();
				this.viewer.annotationTool.startInsertion({annotation: annotation});
			});
			
			
			
			//Annotation hierarchy modifier
			let annotationChildren = annotation.flatten();
			let annotationList = this.viewer.scene.annotations.flatten().filter(e => annotationChildren.indexOf(e) === -1);
			
			let elAnnotationHierarchy = this.elContent.find("#annotation_hierarchy");
			elAnnotationHierarchy.append(`
				<br><span data-i18n="annotations.annotation_hierarchy">`+i18n.t("annotations.annotation_hierarchy")+`</span>
				<select id="optAnnotation" name="optAnnotation"></select>
			`);
			
			let attributeSelection = elAnnotationHierarchy.find('#optAnnotation');
			for(let option of annotationList){
				let elOption;
				if(option.uuid === annotation.parent.uuid) {
					elOption = $(`<option value='${option.uuid}' selected="selected">${option.title}</option>`);
				} else {
					elOption = $(`<option value='${option.uuid}'>${option.title}</option>`);
				}
				attributeSelection.append(elOption);
			}
			
			let updateHierarchy = (event, ui) => {
				let selectedValue = attributeSelection.selectmenu().val();
				annotation.parent = annotationList.find(e => e.uuid === selectedValue);
				
				this.viewer.scene.removeAnnotation(annotation);
				for(let annotationSaved of annotationChildren) {
					annotationSaved.parent.add(annotationSaved);
				}
			};
			attributeSelection.selectmenu({change: updateHierarchy});
			
			
			this.elEdit.hide();
			this.elSave.show();
			this.elRemove.hide();
			
			this.update();
		});
		
		this.elSave = this.elContent.find("img[name=save]");
		this.elSave.hide();
		this.elSave.click( () => {
			this.elTitle[0].setAttribute("contenteditable", "false");
			this.elDescription[0].setAttribute("contenteditable", "false");
			
			this.elContent.find("#annotation_save_camera").empty();
			this.elContent.find('#save_camera').empty();
			this.elContent.find("#annotation_hierarchy").empty();
			
			this.isEditMode = false;
			this.isCameraMode = false;
			
			this.elEdit.show();
			this.elSave.hide();
			this.elRemove.show();
			
			this.update();
		});
		
		this.elRemove = this.elContent.find("img[name=remove]");
		this.elRemove.click( () => {
			this.viewer.scene.removeAnnotation(annotation);
		});
		
		this.propertiesPanel.addVolatileListener(this.viewer.annotationTool, "annotation_position_changed", this._update);

		this.update();
	}

	update(){
		const {annotation, elContent, elTitle, elDescription} = this;

		let pos = annotation.position.toArray().map(c => Utils.addCommas(c.toFixed(3)));
		elContent.find("#annotation_position_x").html(pos[0]);
		elContent.find("#annotation_position_y").html(pos[1]);
		elContent.find("#annotation_position_z").html(pos[2]);
		
		if(!this.isCameraMode){
			if(annotation.cameraPosition !== undefined){
				let cameraPosition = annotation.cameraPosition.toArray().map(c => Utils.addCommas(c.toFixed(3)));
				elContent.find("#annotation_camera_position_x").html(cameraPosition[0]);
				elContent.find("#annotation_camera_position_y").html(cameraPosition[1]);
				elContent.find("#annotation_camera_position_z").html(cameraPosition[2]);
			}
			if(annotation.cameraTarget !== undefined){
				let cameraTarget = annotation.cameraTarget.toArray().map(c => Utils.addCommas(c.toFixed(3)));
				elContent.find("#annotation_camera_target_x").html(cameraTarget[0]);
				elContent.find("#annotation_camera_target_y").html(cameraTarget[1]);
				elContent.find("#annotation_camera_target_z").html(cameraTarget[2]);
			}
		} else {
			let camera = this.viewer.scene.getActiveCamera();
			let view = this.viewer.scene.view;

			let pos = camera.position.toArray().map(c => Utils.addCommas(c.toFixed(3)));
			this.elContent.find("#annotation_camera_position_x").html(pos[0]);
			this.elContent.find("#annotation_camera_position_y").html(pos[1]);
			this.elContent.find("#annotation_camera_position_z").html(pos[2]);

			let target = view.getPivot().toArray().map(c => Utils.addCommas(c.toFixed(3)));
			this.elContent.find("#annotation_camera_target_x").html(target[0]);
			this.elContent.find("#annotation_camera_target_y").html(target[1]);
			this.elContent.find("#annotation_camera_target_z").html(target[2]);
			
			annotation.cameraPosition = camera.position.clone();
			annotation.cameraTarget = view.getPivot().clone();
		}
		
		if(!this.isEditMode){
			elDescription.html(annotation.description);
		} else {
			elDescription.text(annotation.description);
		}

		elTitle.text(annotation.title);	
		
		elContent.i18n();
	}
};