const shapefile = require('shpjs');

module.exports = (file, callback) => {
	if (file.slice(-4).toLowerCase() === '.shp') {
		file = file.slice(0, -4);
	}
	shapefile(file)
			.then(function log (result) {
				callback(result.features)
			}).catch(err=> {
				console.log(err);
			});
};
