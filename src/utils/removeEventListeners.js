
Potree.utils.removeEventListeners = function (dispatcher, type) {
	if (dispatcher._listeners === undefined) {
		return;
	}

	if (dispatcher._listeners[ type ]) {
		delete dispatcher._listeners[ type ];
	}
};
