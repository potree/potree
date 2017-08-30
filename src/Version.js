
const Version = function (version) {
	this.version = version;
	var vmLength = (version.indexOf('.') === -1) ? version.length : version.indexOf('.');
	this.versionMajor = parseInt(version.substr(0, vmLength));
	this.versionMinor = parseInt(version.substr(vmLength + 1));
	if (this.versionMinor.length === 0) {
		this.versionMinor = 0;
	}
};

Version.prototype.newerThan = function (version) {
	var v = new Version(version);

	if (this.versionMajor > v.versionMajor) {
		return true;
	} else if (this.versionMajor === v.versionMajor && this.versionMinor > v.versionMinor) {
		return true;
	} else {
		return false;
	}
};

Version.prototype.equalOrHigher = function (version) {
	var v = new Version(version);

	if (this.versionMajor > v.versionMajor) {
		return true;
	} else if (this.versionMajor === v.versionMajor && this.versionMinor >= v.versionMinor) {
		return true;
	} else {
		return false;
	}
};

Version.prototype.upTo = function (version) {
	return !this.newerThan(version);
};

module.exports = Version;
