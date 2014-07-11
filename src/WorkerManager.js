

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