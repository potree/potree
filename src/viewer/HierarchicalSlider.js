
function addCommas(nStr){
	nStr += '';
	let x = nStr.split('.');
	let x1 = x[0];
	let x2 = x.length > 1 ? '.' + x[1] : '';
	let rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	}
	return x1 + x2;
};

function format(value){
	return addCommas(value.toFixed(3));
};

export class HierarchicalSlider{

	constructor(params = {}){
		
		this.element = document.createElement("div");

		this.labels = [];
		this.sliders = [];
		this.range = params.range != null ? params.range : [0, 1];
		this.slide = params.slide != null ? params.slide : null;
		this.step = params.step != null ? params.step : 0.0001;

		let levels = params.levels != null ? params.levels : 1;

		for(let level = 0; level < levels; level++){
			this.addLevel();
		}

	}

	setRange(range){
		this.range = [...range];

		{ // root slider
			let slider = this.sliders[0];

			$(slider).slider({
				min: range[0],
				max: range[1],
			});
		}

		for(let i = 1; i < this.sliders.length; i++){
			let parentSlider = this.sliders[i - 1];
			let slider = this.sliders[i];

			let parentValues = $(parentSlider).slider("option", "values");
			let childRange = [...parentValues];

			$(slider).slider({
				min: childRange[0],
				max: childRange[1],
			});
		}
		
		this.updateLabels();
	}

	setValues(values){
		for(let slider of this.sliders){
			$(slider).slider({
				values: [...values],
			});
		}

		this.updateLabels();
	}

	addLevel(){
		const elLevel = document.createElement("li");
		const elRange = document.createTextNode("Range: ");
		const label = document.createElement("span");
		const slider = document.createElement("div");

		let level = this.sliders.length;
		let [min, max] = [0, 0];

		if(this.sliders.length === 0){
			[min, max] = this.range;
		}else{
			let parentSlider = this.sliders[this.sliders.length - 1];
			[min, max] = $(parentSlider).slider("option", "values");
		}
		
		$(slider).slider({
			range: true, 
			min: min, 
			max: max,
			step: this.step,
			values: [min, max],
			slide: (event, ui) => {
				
				// set all descendants to same range
				let levels = this.sliders.length;
				for(let i = level + 1; i < levels; i++){
					let descendant = this.sliders[i];

					$(descendant).slider({
						range: true,
						min: ui.values[0],
						max: ui.values[1],
						values: [...ui.values],
					});
				}

				if(this.slide){
					let values = [...ui.values];

					this.slide({
						target: this, 
						range: this.range,
						values: values,
					});
				}

				this.updateLabels();
			},
		});

		elLevel.append(elRange, label, slider);

		this.sliders.push(slider);
		this.labels.push(label);
		this.element.append(elLevel);

		this.updateLabels();
	}

	removeLevel(){

	}

	updateSliders(){

	}

	updateLabels(){

		let levels = this.sliders.length;

		for(let i = 0; i < levels; i++){

			let slider = this.sliders[i];
			let label = this.labels[i];

			let [min, max] = $(slider).slider("option", "values");
			let strMin = format(min);
			let strMax = format(max);
			let strLabel = `${strMin} to ${strMax}`;

			label.innerHTML = strLabel;
		}

	}


}

