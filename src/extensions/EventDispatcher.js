
THREE.EventDispatcher.prototype.removeEventListeners = function (type) {
	if (this._listeners === undefined) {
		return;
	}

	if (this._listeners[ type ]) {
		delete this._listeners[ type ];
	}
};