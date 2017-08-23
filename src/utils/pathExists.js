Potree.utils.pathExists = (url) => {
	let req = new XMLHttpRequest();
	req.open('GET', url, false);
	req.send(null);
	if (req.status !== 200) {
		return false;
	}
	return true;
};
