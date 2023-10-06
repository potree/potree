
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
					<span>Speed: </span><span id="lblSpeed"></span> <div id="sldSpeed"></div>

					<input name="play" type="button" value="play"/>
					<input name="stop" type="button" value="stop"/>
				</span>
			</div>
		`);

		const elPlay = this.elContent.find("input[name=play]");
		elPlay.click( () => {
			animation.play();
			const speed_as_int = Math.round(animation.getSpeed());
			this.elContent.find('#lblSpeed').html(speed_as_int);
			const elSlider = this.elContent.find('#sldSpeed');
			elSlider.slider({value: speed_as_int});
		});

		const elStop = this.elContent.find("input[name=stop]");
		elStop.click( () => {
			animation.stopAnimation();
		});

		const elSlider = this.elContent.find('#sldSpeed');
		elSlider.slider({
			value: 0,
			min: 0,
			max: 1000,
			step: 0.001,
			slide: (event, ui) => { 
				animation.setSpeed(ui.value);
				const speed_as_int = Math.round(ui.value);
				this.elContent.find('#lblSpeed').html(speed_as_int);
			}
		});

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
						<input type="button" name="add" value="insert control point" />
						<span style="flex-grow: 1"></span>
					</div>
				`);

				const elAdd = elNewKeyframe.find("input[name=add]");
				elAdd.click( () => {
					animation.createControlPoint(index);
				});

				elKeyframes.append(elNewKeyframe);
			};

			const addKeyframeItem = (index) => {
				let elKeyframe = $(`
					<div style="display: flex; margin: 0.2em 0em">
						<span style="flex-grow: 0;">
							<img name="assign" src="${Potree.resourcePath}/icons/assign.svg" style="width: 1.5em; height: 1.5em"/>
						</span>
						<span style="flex-grow: 0;">
							<img name="move" src="${Potree.resourcePath}/icons/circled_dot.svg" style="width: 1.5em; height: 1.5em"/>
						</span>
						<span style="flex-grow: 0; width: 1.5em; height: 1.5em"></span>
						<span style="flex-grow: 0; font-size: 1.5em">keyframe</span>
						<span style="flex-grow: 1"></span>
						<span style="flex-grow: 0;">
							<img name="delete" src="${Potree.resourcePath}/icons/remove.svg" style="width: 1.5em; height: 1.5em"/>
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

		// this.update();
	}

	update(){
		
	}
};