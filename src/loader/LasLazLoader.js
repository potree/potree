
function LasLazLoader(){

}

LasLazLoader.load = function(file, handler){		
	var xhr = new XMLHttpRequest();
	xhr.open('GET', file, true);
	xhr.responseType = 'arraybuffer';
	xhr.overrideMimeType('text/plain; charset=x-user-defined');
	xhr.onreadystatechange = function() {
		if (xhr.readyState === 4) {
			if (xhr.status === 200) {
				var buffer = xhr.response;
				LasLazLoader.loadData(buffer, handler);
			} else {
				console.log('Failed to load file! HTTP status: ' + xhr.status + ", file: " + file);
			}
		}
	};
	
	xhr.send(null);
}

LasLazLoader.progressCB = function(arg){

};

LasLazLoader.loadData = function loadData(buffer, handler){
	var lf = new LASFile(buffer);
	
	return Promise.resolve(lf).cancellable().then(function(lf) {
		return lf.open().then(function() {
			lf.isOpen = true;
			return lf;
		})
		.catch(Promise.CancellationError, function(e) {
			// open message was sent at this point, but then handler was not called
			// because the operation was cancelled, explicitly close the file
			return lf.close().then(function() {
				throw e;
			});
		});
	}).then(function(lf) {
		return lf.getHeader().then(function(h) {
			return [lf, h];
		});
	}).then(function(v) {
		var lf = v[0];
		var header = v[1];
		
		var skip = 1;
		var totalRead = 0;
		var totalToRead = (skip <= 1 ? header.pointsCount : header.pointsCount / skip);
		var reader = function() {
			var p = lf.readData(1000000, 0, skip);
			return p.then(function(data) {
				handler.push(new LASDecoder(data.buffer,
												   header.pointsFormatId,
												   header.pointsStructSize,
												   data.count,
												   header.scale,
												   header.offset,
												   header.mins, header.maxs));

				totalRead += data.count;
				LasLazLoader.progressCB(totalRead / totalToRead);

				if (data.hasMoreData)
					return reader();
				else {

					header.totalRead = totalRead;
					header.versionAsString = lf.versionAsString;
					header.isCompressed = lf.isCompressed;
					return [lf, header, handler];
				}
			});
		};
		
		return reader();
	}).then(function(v) {
		var lf = v[0];
		// we're done loading this file
		//
		LasLazLoader.progressCB(1);

		// Close it
		return lf.close().then(function() {
			lf.isOpen = false;
			// Delay this a bit so that the user sees 100% completion
			//
			return Promise.delay(200).cancellable();
		}).then(function() {
			// trim off the first element (our LASFile which we don't really want to pass to the user)
			//
			return v.slice(1);
		});
	}).catch(Promise.CancellationError, function(e) {
		// If there was a cancellation, make sure the file is closed, if the file is open
		// close and then fail
		if (lf.isOpen) 
			return lf.close().then(function() {
				lf.isOpen = false;
				throw e;
			});
		throw e;
	});
}