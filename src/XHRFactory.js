
const XHRFactory = {
	config: {
		withCredentials: false,
		customHeaders: [
			{ header: null, value: null }
		],
        sasToken: null
	},

	createXMLHttpRequest: function () {
		let xhr = new XMLHttpRequest();
        let oldXHROpen = xhr.open;
        //in case required to add sas token to the end of url should configure config.sasToken
        //the sas token will be added to the end of url as a query string
        //example:
        // Potree.XHRFactory.config.sasToken = "abcdef=1&qwerty=2"
        // to all url it will add ?abcdef=1&qwerty=2
        if (this.config.sasToken != null && typeof this.config.sasToken == "string") {
            let token = this.config.sasToken;
            xhr.open = function (method, url, async, user, password) {
                if (url.includes("?")) {
                    arguments[1] = url + "&" + token;
                } else {
                    arguments[1] = url + "?" + token;
                }
                return oldXHROpen.apply(this, arguments);
            }
        }
		if (this.config.customHeaders &&
			Array.isArray(this.config.customHeaders) &&
			this.config.customHeaders.length > 0) {
			let baseOpen = xhr.open;
			let customHeaders = this.config.customHeaders;
			xhr.open = function () {
				baseOpen.apply(this, [].slice.call(arguments));
				customHeaders.forEach(function (customHeader) {
					if (!!customHeader.header && !!customHeader.value) {
						xhr.setRequestHeader(customHeader.header, customHeader.value);
					}
				});
			};
		}

		return xhr;
	}
};

export {XHRFactory};
