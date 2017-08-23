Potree.Actions = {};

Potree.Actions.ToggleAnnotationVisibility = class ToggleAnnotationVisibility extends Potree.Action {
	constructor (args = {}) {
		super(args);

		this.icon = Potree.resourcePath + '/icons/eye.svg';
		this.showIn = 'sidebar';
		this.tooltip = 'toggle visibility';
	}

	pairWith (annotation) {
		if (annotation.visible) {
			this.setIcon(Potree.resourcePath + '/icons/eye.svg');
		} else {
			this.setIcon(Potree.resourcePath + '/icons/eye_crossed.svg');
		}

		annotation.addEventListener('visibility_changed', e => {
			let annotation = e.annotation;

			if (annotation.visible) {
				this.setIcon(Potree.resourcePath + '/icons/eye.svg');
			} else {
				this.setIcon(Potree.resourcePath + '/icons/eye_crossed.svg');
			}
		});
	}

	onclick (event) {
		let annotation = event.annotation;

		annotation.visible = !annotation.visible;

		if (annotation.visible) {
			this.setIcon(Potree.resourcePath + '/icons/eye.svg');
		} else {
			this.setIcon(Potree.resourcePath + '/icons/eye_crossed.svg');
		}
	}
};
