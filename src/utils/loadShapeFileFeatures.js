module.exports = (file, callback) => {
	let features = [];

	let handleFinish = () => {
		callback(features);
	};

	shapefile.open(file)
		.then(source => {
			source.read()
				.then(function log (result) {
					if (result.done) {
						handleFinish();
						return;
					}

					// console.log(result.value);

					if (result.value && result.value.type === 'Feature' && result.value.geometry !== undefined) {
						features.push(result.value);
					}

					return source.read().then(log);
				});
		});
};
