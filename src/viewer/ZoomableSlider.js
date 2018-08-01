
export class ZoomableSlider{

	constructor(){
		this.visibleRange = [0, 10];
		this.chosenRange = [2, 7];
		this.step = 0.001;

		this.clipDragToVisible = true;

		this.changeCallbacks = [];

		this.element = document.createElement("div");
		this.element.innerHTML = `

			<div name="zoomable_slider_widget" class="zs_widget">
				<div name="core" class="zs_core">
					<span name="label_visible_left" class="zs_visible_range_label zs_visible_range_label_left"></span>
					<span name="label_visible_right" class="zs_visible_range_label zs_visible_range_label_right"></span>
					<span name="outside" class="zs_outside">&nbsp;</span>
					<span name="inside" class="zs_inside">&nbsp;</span>
					<span name="left" class="zs_handle">&nbsp;</span>
					<span name="right" class="zs_handle">&nbsp;</span>
					<span name="stretch" class="zs_stretch" title="stretch visible range to selected range">&#8697;</span>
					<span name="label_chosen_left" class="zs_chosen_range_label zs_chosen_range_label_left"></span>
					<span name="label_chosen_right" class="zs_chosen_range_label zs_chosen_range_label_right"></span>
				</div>
			</div>
		`;

		this.elCore = this.element.querySelector('[name=core]');
		this.elLeft = this.element.querySelector('[name=left]');
		this.elRight = this.element.querySelector('[name=right]');
		this.elStretch = this.element.querySelector('[name=stretch]');
		this.elInside = this.element.querySelector('[name=inside]');
		this.elOutside = this.element.querySelector('[name=outside]');

		this.elLabelVisibleLeft = this.element.querySelector('[name=label_visible_left]');
		this.elLabelVisibleRight = this.element.querySelector('[name=label_visible_right]');

		this.elLabelChosenLeft = this.element.querySelector('[name=label_chosen_left]');
		this.elLabelChosenRight = this.element.querySelector('[name=label_chosen_right]');

		this.elRight.style.left = "100px";


		let dragStart = null;
		let onMouseDown = (e) => {
			e.preventDefault();

			let value = (e.target === this.elLeft) ? 
				this.chosenRange[0] : 
				this.chosenRange[1];

			dragStart = {
				x: e.clientX,
				y: e.clientY,
				handle: e.target,
				value: value,
			};

			document.onmouseup = onMouseUp;
			document.onmousemove = onMouseMove;
		};

		let onMouseUp = (e) => {
			document.onmouseup = null;
			document.onmousemove = null;
		};

		let onMouseMove = (e) => {
			let dx = e.clientX - dragStart.x;
			let dy = e.clientY - dragStart.y;


			let normalizedDelta = dx / this.elCore.clientWidth;
			let valueDelta = (this.visibleRange[1] - this.visibleRange[0]) * normalizedDelta;

			let newValue = dragStart.value + valueDelta;
			newValue = Math.round(newValue / this.step) * this.step;
			
			let newRange;
			if(dragStart.handle === this.elLeft){
				 newRange = [newValue, this.chosenRange[1]];
			}else{
				newRange = [this.chosenRange[0], newValue];
			}

			if(this.clipDragToVisible){
				if(dragStart.handle === this.elLeft){
					newRange[0] = Math.max(newRange[0], this.visibleRange[0]);
				}else{
					newRange[1] = Math.min(newRange[1], this.visibleRange[1]);
				}
			}

			this.setRange(newRange);
		};

		for(let handle of [this.elLeft, this.elRight]){
			handle.onmousedown = onMouseDown;
		}



		let onWheel = (e) => {

			e.preventDefault();
			
			let delta = Math.sign(e.deltaY);
			
			let zoom = 1;
			if(delta < 0){
				zoom = 0.8;
			}else if(delta > 0){
				zoom = 1.2;
			}

			let oldRangeWidth = this.visibleRange[1] - this.visibleRange[0];

			if(oldRangeWidth <= 3 * this.step && zoom < 1){
				return;
			}

			let rect = this.elCore.getBoundingClientRect();
			let pivotPixels = e.clientX - rect.left;
			let pivotNormalized = (pivotPixels / this.elCore.clientWidth);
			let pivot = (oldRangeWidth * pivotNormalized) + this.visibleRange[0];

			let leftRatio = (pivot - this.visibleRange[0]) / oldRangeWidth;
			let rightRatio = (this.visibleRange[1] - pivot) / oldRangeWidth;

			let newRangeWidth = oldRangeWidth * zoom;
			let newVisibleRange = [
				pivot - (newRangeWidth * leftRatio),
				pivot + (newRangeWidth * rightRatio),
				];

			this.setVisibleRange(newVisibleRange);


		};
		this.elCore.onmousewheel = onWheel;

		this.elStretch.onclick = () => {
			let choosenRangeWidth = this.chosenRange[1] - this.chosenRange[0];
			let visibleRange = [
				this.chosenRange[0] - choosenRangeWidth * 0.1,
				this.chosenRange[1] + choosenRangeWidth * 0.1,
			];

			this.setVisibleRange(visibleRange);
		};

		this.update();
	}

	setRange(range){

		if(this.chosenRange[0] === range[0] && this.chosenRange[1] === range[1]){
			return;
		}

		this.chosenRange = range;

		for(let callback of this.changeCallbacks){
			callback();
		}

		this.update();
	}

	setVisibleRange(range){
		this.visibleRange = range;

		this.update();
	}

	update(){
		let {elLeft, elRight, elStretch, elInside, visibleRange, chosenRange} = this;

		let pixelWidth = this.elCore.clientWidth;

		let normalizedLeft = (chosenRange[0] - visibleRange[0]) / (visibleRange[1] - visibleRange[0]);
		let normalizedRight = (chosenRange[1] - visibleRange[0]) / (visibleRange[1] - visibleRange[0]);
		let pixelLeft = Math.round(normalizedLeft * pixelWidth) - elLeft.clientWidth / 2;
		let pixelRight = Math.round(normalizedRight * pixelWidth) - elRight.clientWidth / 2;
		
		elLeft.style.left = `${pixelLeft}px`;
		elRight.style.left = `${pixelRight}px`;
		elStretch.style.left = `${(pixelRight + pixelLeft) / 2}px`;

		elInside.style.left = `${pixelLeft}px`;
		elInside.style.width = `${pixelRight - pixelLeft}px`;


		let precision = Math.ceil(Math.log(1 / this.step) / Math.log(10));

		// from: https://stackoverflow.com/questions/2901102/how-to-print-a-number-with-commas-as-thousands-separators-in-javascript
		let addThousandsSeparatorsToString = (str) => {
			let parts = str.split(".");
			parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
			return parts.join(".");
		}

		this.elLabelVisibleLeft.style.left = "0px";
		let visibleLeftString = addThousandsSeparatorsToString(visibleRange[0].toFixed(precision));
		this.elLabelVisibleLeft.innerHTML = `${visibleLeftString}`;

		this.elLabelVisibleRight.style.right = "0px";
		let visibleRightString = addThousandsSeparatorsToString(visibleRange[1].toFixed(precision));
		this.elLabelVisibleRight.innerHTML = `${visibleRightString}`;

		this.elLabelChosenLeft.style.left = `${pixelLeft}px`;
		let chosenLeftString = addThousandsSeparatorsToString(chosenRange[0].toFixed(precision));
		this.elLabelChosenLeft.innerHTML = `${chosenLeftString}`;

		this.elLabelChosenRight.style.left = `${pixelRight}px`;
		let chosenRightString = addThousandsSeparatorsToString(chosenRange[1].toFixed(precision));
		this.elLabelChosenRight.innerHTML = `${chosenRightString}`;
	}

	change(callback){
		this.changeCallbacks.push(callback);
	}
	
};