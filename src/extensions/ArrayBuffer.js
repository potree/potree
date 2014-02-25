

/**
 * extensions for ArrayBuffers
 * 
 * @author Markus Schuetz
 *
 * @class
 */
ArrayBuffer = ArrayBuffer;

ArrayBuffer.prototype.subarray = function(offset, length){
	if(length == null){
		length = this.byteLength - offset;
	}
	
	var sub = new ArrayBuffer(length);
	var subView = new Int8Array(sub);
	var thisView = new Int8Array(this);
	
	for(var i = 0; i < length; i++ ){
		subView[i] = thisView[offset+i];
	}
	
	return sub;
};