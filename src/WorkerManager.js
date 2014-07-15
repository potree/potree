

Potree.WorkerManager = function(code){
	this.code = code;
	this.instances = [];
	this.createdInstances = 0;
}

Potree.WorkerManager.prototype.getWorker = function(){
	var ww = this.instances.pop();
	
	if(ww === undefined){
		ww = Potree.utils.createWorker(this.code);
		this.createdInstances++;
	}
	
	return ww;
}


Potree.WorkerManager.prototype.returnWorker = function(worker){
	this.instances.push(worker);
}

/**
 * urls point to WebWorker code.
 * Code must not contain calls to importScripts, 
 * concatenation is done by this method.
 * 
 */
Potree.WorkerManager.fromUrls = function(urls){

	var code = "";
	for(var i = 0; i < urls.length; i++){
		var url = urls[i];
		var xhr = new XMLHttpRequest();
		xhr.open('GET', url, false);
		xhr.responseType = 'text';
		xhr.overrideMimeType('text/plain; charset=x-user-defined');
		xhr.send(null);
		
		if(xhr.status === 200){
			code += xhr.responseText + "\n";
		}
	}
	
	return new Potree.WorkerManager(code);
	

	//var codeParts = {};
	//var urlsRead = 0;
	//
	//var callback = function(url, text){
	//	codeParts[url] = text;
	//	urlsRead++;
	//	
	//	if(urlsRead === urls.length){
	//		var code = "";
	//		for(var i = 0; i < urls.length; i++){
	//			code += codeParts[url] + "\n";
	//		}
	//		
	//		var wm = new Potree.WorkerManager(code);
	//		r
	//	}
	//};
	//
	//for(var i = 0; i < urls.length; i++){
	//	var url = urls[i];
	//	var xhr = new XMLHttpRequest();
	//	xhr.open('GET', url, true);
	//	xhr.responseType = 'text';
	//	xhr.overrideMimeType('text/plain; charset=x-user-defined');
	//	xhr.onreadystatechange = function() {
	//		if (xhr.readyState === 4) {
	//			if (xhr.status === 200) {
	//				var text = xhr.response;
	//				callback(url, text);
	//			} else {
	//				console.log('Failed to load file! HTTP status: ' + xhr.status + ", file: " + url);
	//			}
	//		}
	//	};
	//	xhr.send(null);
	//}
}