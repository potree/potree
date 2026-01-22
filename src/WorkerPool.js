
export class WorkerPool{
	constructor(){
		this.workers = {};
	}

	getWorker(url){
		if (!this.workers[url]){
			this.workers[url] = [];
		}

		if (this.workers[url].length === 0){
			/* CORS FIX - https://stackoverflow.com/a/62914052 */
			// Returns a blob:// URL which points
			// to a javascript file which will call
			// importScripts with the given URL
			function getWorkerURL(url) 
			{
				const content = `importScripts( "${url}" );`;
				return URL.createObjectURL(
					new Blob([content], { type: "text/javascript" })
				);
			}

			let worker = new Worker(getWorkerURL(url));
			this.workers[url].push(worker);
		}

		let worker = this.workers[url].pop();

		return worker;
	}

	returnWorker(url, worker){
		this.workers[url].push(worker);
	}
};

//Potree.workerPool = new Potree.WorkerPool();
