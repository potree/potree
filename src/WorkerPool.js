

class WorkerPool{
	constructor(){
		this.workers = {};
	}

	getWorker(workerCls){
		
		if (!this.workers[workerCls]){
			this.workers[workerCls] = [];
		}

		if (this.workers[workerCls].length === 0){
			let worker = new workerCls();
			this.workers[workerCls].push(worker);
		}

		let worker = this.workers[workerCls].pop();

		return worker;
	}

	returnWorker(workerCls, worker){
		this.workers[workerCls].push(worker);
	}
};

const workerPool = new WorkerPool();
export { workerPool }
//Potree.workerPool = new Potree.WorkerPool();
