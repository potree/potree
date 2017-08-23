/**
 * create worker from a string
 *
 * code from http://stackoverflow.com/questions/10343913/how-to-create-a-web-worker-from-a-string
 */
Potree.utils.createWorker = (code) => {
	let blob = new Blob([code], {type: 'application/javascript'});
	let worker = new Worker(URL.createObjectURL(blob));

	return worker;
};
