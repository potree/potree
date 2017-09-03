const Actions = {};
const Action = require('./Action');
const context = require('./context');

Actions.ToggleAnnotationVisibility = class ToggleAnnotationVisibility extends Action {
	constructor (args = {}) {
		super(args);

		this.icon = context.resourcePath + '/icons/eye.svg';
		this.showIn = 'sidebar';
		this.tooltip = 'toggle visibility';
	}

	pairWith (annotation) {
		if (annotation.visible) {
			this.setIcon(context.resourcePath + '/icons/eye.svg');
		} else {
			this.setIcon(context.resourcePath + '/icons/eye_crossed.svg');
		}

		annotation.addEventListener('visibility_changed', e => {
			let annotation = e.annotation;

			if (annotation.visible) {
				this.setIcon(context.resourcePath + '/icons/eye.svg');
			} else {
				this.setIcon(context.resourcePath + '/icons/eye_crossed.svg');
			}
		});
	}

	onclick (event) {
		let annotation = event.annotation;

		annotation.visible = !annotation.visible;

		if (annotation.visible) {
			this.setIcon(context.resourcePath + '/icons/eye.svg');
		} else {
			this.setIcon(context.resourcePath + '/icons/eye_crossed.svg');
		}
	}
};

module.exports = Actions;
