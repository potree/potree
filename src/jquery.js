const $ = window.jQuery;
if (!$) {
	throw new Error('jQuery is required for Potree to run. It needs to be loaded before potree.');
}

module.exports = $;
