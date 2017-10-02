if (!window.i18n) {
	throw new Error('i18next is required for Potree to run. It needs to be loaded before potree.');
}

module.exports = window.i18n;
