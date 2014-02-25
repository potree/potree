

/**
 * Used for some evil javascript inheritance magic.
 * Get rid of it as soon as javascript classes are available.
 * 
 * @see http://livingmachines.net/2009/03/creating-javascript-classes-part-4-method-overrides/
 */
var inheriting = { };



/**
 * load a binary resource from the given url.
 * 
 * @see https://developer.mozilla.org/En/Using_XMLHttpRequest 
 * 
 */
function load_binary_resource(url) {
	var req = new XMLHttpRequest();
	req.open('GET', url, false);
	// The following line says we want to receive data as Binary and not as Unicode
	req.overrideMimeType('text/plain; charset=x-user-defined');
	req.send(null);
	// when accessing local files, req.status will be 0
	if (req.status !== 200 && req.status !== 0) {
		console.log("req.status: '" + req.status + "'");
		console.log("req.readyState: '" + req.readyState + "'");
		return '';
	}
	return req.responseText;
}

/**
 * load a binary resource directly into an an ArrayBuffer
 * 
 * @param url
 * @returns an arraybuffer with data from url
 */
function loadBinaryResourceIntoArrayBuffer(url) {
	var xhr = new XMLHttpRequest();
	xhr.open('GET', url, false);
	xhr.responseType = 'arraybuffer';
	xhr.overrideMimeType('text/plain; charset=x-user-defined');
	xhr.send(null);
	if (xhr.readyState === 4) {
		// when accessing local files, req.status will be 0
		if (xhr.status === 200 || xhr.status === 0) {
			var buffer = xhr.response;
			return buffer;
		} else {
			alert('Failed to load file! HTTP status: ' + xhr.status);
		}
	}

	return null;
}

/**
 * returns a list of get-parameters in the open url
 * 
 * @returns {___anonymous1456_1457}
 */
function getUrlVars() {
    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
        vars[key] = value;
    });
    return vars;
}

/**
 * add separators to large numbers
 * 
 * @param nStr
 * @returns
 */
function addCommas(nStr){
	nStr += '';
	x = nStr.split('.');
	x1 = x[0];
	x2 = x.length > 1 ? '.' + x[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	}
	return x1 + x2;
}

/**
 * from http://stackoverflow.com/questions/55677/how-do-i-get-the-coordinates-of-a-mouse-click-on-a-canvas-element
 * by Ryan Artecona
 */
function relMouseCoords(event, element){
    var totalOffsetX = 0;
    var totalOffsetY = 0;
    var canvasX = 0;
    var canvasY = 0;
    var currentElement = element;

    do{
        totalOffsetX += currentElement.offsetLeft - currentElement.scrollLeft;
        totalOffsetY += currentElement.offsetTop - currentElement.scrollTop;
    }while(currentElement = currentElement.offsetParent);

    canvasX = event.pageX - totalOffsetX;
    canvasY = event.pageY - totalOffsetY;
    
    return {x:canvasX, y:canvasY};
}


//copyright 1999 Idocs, Inc. http://www.idocs.com
//Distribute this script freely but keep this notice in place
function numbersonly(myfield, e, dec) {
	var key;
	var keychar;

	if (window.event)
		key = window.event.keyCode;
	else if (e)
		key = e.which;
	else
		return true;
	keychar = String.fromCharCode(key);

	// control keys
	if ((key == null) || (key === 0) || (key === 8) || (key === 9) || (key === 13)	|| (key === 27))
		return true;

	// numbers
	else if ((("0123456789").indexOf(keychar) > -1))
		return true;

	// decimal point jump
	else if (dec && (keychar === ".")) {
		myfield.form.elements[dec].focus();
		return false;
	} else
		return false;
}