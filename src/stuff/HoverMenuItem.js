const $ = require('../jquery');

class HoverMenuItem {
	constructor (icon, callback) {
		this.icon = icon;
		this.callback = callback;

		this.element = $(`
			<span class="hover_menu_item">
				<img src="${icon}">
			</span>
		`);

		this.element.click(function () {
			callback();
		});
	}
};

module.exports = HoverMenuItem;
