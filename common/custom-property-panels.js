import {Utils} from "../src/utils.js";

export class TruthPanel{
	constructor(viewer, propertiesPanel){
		this.viewer = viewer;
		this.propertiesPanel = propertiesPanel;

		this._update = () => { this.update(); };

		let copyIconPath = Potree.resourcePath + '/icons/copy.svg';
		this.elContent = $(`
		<div class="propertypanel_content">
      <p> CUSTOM PANEL </p>
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
};
