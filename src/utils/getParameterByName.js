// from http://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
Potree.utils.getParameterByName = (name) => {
	name = name.replace(/[[]/, '\\[').replace(/[\]]/, '\\]');
	let regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
	let results = regex.exec(document.location.search);
	return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, ' '));
};
