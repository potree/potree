module.exports = (url) => {
	let u = new URL(url);

	return u.protocol + '//' + u.hostname + u.pathname.replace(/\/+/g, '/');
};
