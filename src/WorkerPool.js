
export class WorkerPool{
	constructor(){
		this.workers = {};
	}

	getWorker(url){
		if (!this.workers[url]){
			this.workers[url] = [];
		}

		if (this.workers[url].length === 0){
			let worker = new Worker(url);
			this.workers[url].push(worker);
		}

		let worker = this.workers[url].pop();

		return worker;
	}

	returnWorker(url, worker){
		// An idle worker must not keep its last onmessage closure: it references the
		// last decoded node and, through it, the whole octree and point cloud.
		worker.onmessage = null;
		this.workers[url].push(worker);
	}
};

//Potree.workerPool = new Potree.WorkerPool();
