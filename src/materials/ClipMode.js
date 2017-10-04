const ClipMode = {
	DISABLED: 0,
	HIGHLIGHT: 1,
	INSIDE: 2,
	OUTSIDE: 3
};
Object.defineProperty(ClipMode, 'forCode', {
	enumerable: false,
	value: (code) => {
		for (let name in ClipMode) {
			if (ClipMode[name] === code) {
				return name;
			}
		}
	}
});
module.exports = ClipMode;
