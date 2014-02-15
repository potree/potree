
/**
 * extensions for strings
 * 
 * @author Markus Schuetz
 */

String.prototype.repeat = function(count) {
	var msg = "";
	for ( var i = 0; i < count; i++) {
		msg += this;
	}

	return msg;
};

/**
 * fills the string with character to the left, until it reaches the desired length. <br>
 * if string.length is already >= length, the unmodified string will be returned.
 * 
 * @param length
 * @param character
 * @returns {String}
 */
String.prototype.leftPad = function(length, character){
	if(character == null){
		character = ' ';
	}
	
	var padded = "";
	var diff = length - this.length;
	if(diff > 0){
		padded = character.repeat(diff) + this;
	}
	
	return padded;
};

/**
 * fills the string with character to the right, until it reaches the desired length. <br>
 * if string.length is already >= length, the unmodified string will be returned.
 * 
 * @param length
 * @param character
 * @returns {String}
 */
String.prototype.rightPad = function(length, character){
	if(character == null){
		character = ' ';
	}
	
	var padded = "";
	var diff = length - this.length;
	if(diff > 0){
		padded = this + character.repeat(diff);
	}
	
	return padded;
};

/**
 * turns a buffer object into a string. 
 * 
 * @param buffer
 * @returns {String}
 */
String.fromBuffer = function(buffer){
	var string = "";
	
	var ibuff = new Uint8Array(buffer);
	for(var i = 0; i < ibuff.length; i++){
		string += String.fromCharCode(ibuff[i]);
	}
	
	return string;
};

Object.defineProperty(String.prototype, 'first', {
	get: function(){
		return "lala";
	}
});