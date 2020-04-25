
import {Utils} from "../../utils.js";

export class CameraAnimationPanel{
	constructor(viewer, propertiesPanel, animation){
		this.viewer = viewer;
		this.propertiesPanel = propertiesPanel;
		this.animation = animation;

		this.elContent = $(`
			<div class="propertypanel_content">
				<span id="animation_keyframes"></span>

				<span>
					<span style="display:flex">
						<span style="display:flex; align-items: center; padding-right: 10px"><span data-i18n="scene.animation_duration">`+i18n.t("scene.animation_duration")+`</span>: </span>
						<input name="spnDuration" value="5.0" style="flex-grow: 1; width:100%">
					</span>

					<span><span data-i18n="scene.animation_time">`+i18n.t("scene.animation_time")+`</span>: </span>					
					<span id="lblTime"></span> <div id="sldTime"></div>

					<input name="play" type="button" data-i18n="[value]scene.button_play"/>
				</span>
				
				<!-- ACTIONS -->
				<div style="display: flex; margin-top: 12px">
					<span></span>
					<span style="flex-grow: 1"></span>
					<img name="remove" data-i18n="[title]scene.button_remove" class="button-icon" src="${Potree.resourcePath}/icons/remove.svg" style="width: 16px; height: 16px"/>
				</div>
			</div>
		`);
		
		this.elRemove = this.elContent.find("img[name=remove]");
		this.elRemove.click( () => {
			this.viewer.scene.removeCameraAnimation(animation);
		});
		
		const elPlay = this.elContent.find("input[name=play]");
		elPlay.click( () => {
			animation.play();
		});

		const elSlider = this.elContent.find('#sldTime');
		elSlider.slider({
			value: 0,
			min: 0,
			max: 1,
			step: 0.001,
			slide: (event, ui) => { 
				animation.set(ui.value);
			}
		});

		let elDuration = this.elContent.find(`input[name=spnDuration]`);
		elDuration.spinner({
			min: 0, max: 300, step: 0.01,
			numberFormat: 'n',
			start: () => {},
			spin: (event, ui) => {
				let value = elDuration.spinner('value');
				animation.setDuration(value);
			},
			change: (event, ui) => {
				let value = elDuration.spinner('value');
				animation.setDuration(value);
			},
			stop: (event, ui) => {
				let value = elDuration.spinner('value');
				animation.setDuration(value);
			},
			incremental: (count) => {
				let value = elDuration.spinner('value');
				let step = elDuration.spinner('option', 'step');

				let delta = value * 0.05;
				let increments = Math.max(1, parseInt(delta / step));

				return increments;
			}
		});
		elDuration.spinner('value', animation.getDuration());
		elDuration.spinner('widget').css('width', '100%');

		const elKeyframes = this.elContent.find("#animation_keyframes");

		const updateKeyframes = () => {
			elKeyframes.empty();

			//let index = 0;

			// <span style="flex-grow: 0;">
			// 				<img name="add" src="${Potree.resourcePath}/icons/add.svg" style="width: 1.5em; height: 1.5em"/>
			// 			</span>

			const addNewKeyframeItem = (index) => {
				let elNewKeyframe = $(`
					<div style="display: flex; margin: 0.2em 0em">
						<span style="flex-grow: 1"></span>
						<input type="button" name="add" data-i18n="[value]scene.animation_create_control_point" />
						<span style="flex-grow: 1"></span>
					</div>
				`);

				const elAdd = elNewKeyframe.find("input[name=add]");
				elAdd.click( () => {
					animation.createControlPoint(index);
					this.update();
				});

				elKeyframes.append(elNewKeyframe);
			};

			const addKeyframeItem = (index) => {
				let elKeyframe = $(`
					<div style="display: flex; margin: 0.2em 0em">
						<span style="flex-grow: 0;">
							<img name="move" data-i18n="[title]scene.button_view" class="button-icon" src="${Potree.resourcePath}/icons/circled_dot.svg" style="width: 1.5em; height: 1.5em"/>
						</span>
						<span style="flex-grow: 0;">
							<img name="assign" data-i18n="[title]scene.button_assign" class="button-icon" src="${Potree.resourcePath}/icons/assign.svg" style="width: 1.5em; height: 1.5em"/>
						</span>
						<span style="flex-grow: 0; width: 1.5em; height: 1.5em"></span>
						<span style="flex-grow: 0; font-size: 1.5em" data-i18n="scene.animation_keyframe">`+i18n.t("scene.animation_keyframe")+`</span>
						<span style="flex-grow: 1"></span>
						<span style="flex-grow: 0;">
							<img name="delete" data-i18n="[title]scene.button_remove" class="button-icon" src="${Potree.resourcePath}/icons/remove.svg" style="width: 1.5em; height: 1.5em"/>
						</span>
					</div>
				`);

				const elAssign = elKeyframe.find("img[name=assign]");
				const elMove = elKeyframe.find("img[name=move]");
				const elDelete = elKeyframe.find("img[name=delete]");

				elAssign.click( () => {
					const cp = animation.controlPoints[index];

					cp.position.copy(viewer.scene.view.position);
					cp.target.copy(viewer.scene.view.getPivot());
				});

				elMove.click( () => {
					const cp = animation.controlPoints[index];

					viewer.scene.view.position.copy(cp.position);
					viewer.scene.view.lookAt(cp.target);
				});

				elDelete.click( () => {
					const cp = animation.controlPoints[index];
					animation.removeControlPoint(cp);
					this.update();
				});

				elKeyframes.append(elKeyframe);
			};

			let index = 0;

			addNewKeyframeItem(index);

			for(const cp of animation.controlPoints){
				
				addKeyframeItem(index);
				index++;
				addNewKeyframeItem(index);

			}
		};

		updateKeyframes();

		animation.addEventListener("controlpoint_added", updateKeyframes);
		animation.addEventListener("controlpoint_removed", updateKeyframes);




		// this._update = () => { this.update(); };

		this.update();
	}

	update(){
		this.elContent.i18n();
	}
};