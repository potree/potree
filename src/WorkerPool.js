const onErr = err => {
	console.log('err', err);
};

module.exports = class WorkerPool {
	constructor (url, max = 4) {
		this.workers = [];
		this.url = url;
		this.max = max;
	}

	getWorker () {
		if (this.workers.length === 0) {
			let worker = new Worker(this.url);
			worker.addEventListener('error', onErr);
			this.workers.push(worker);
		}

		let worker = this.workers.pop();

		return worker;
	}

	returnWorker (worker) {
		if (this.workers.length >= this.max) {
			worker.terminate();
			return;
		}
		this.workers.push(worker);
	}

	runTask (type, data, transfers, callback) {
		let worker = this.getWorker();
		let msg = {
			data,
			type
		};
		let cb = (e) => {
			if (!e.data) {
				return;
			}
			worker.removeEventListener('message', cb);
			this.returnWorker(worker);
			callback(e.data);
		};
		worker.addEventListener('message', cb);
		worker.postMessage(msg, transfers);
	}
};
