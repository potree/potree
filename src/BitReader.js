
/**
 * Reads unsigned integers encoded in a variable amount of bits from the buffer.
 * Bits are aligned into 32bit unsigned integers.
 * for example, given 3 integers:
 * x: 123		encoded in 11 bits, binary: 00001111011
 * y: 7945		encoded in 17 bits, binary: 00001111100001001
 * z: 12		encoded in 6 bits,  binary: 001100
 * 
 * |        --- 32 bits ---         ||        --- 32 bits ---         |       
 * |................................||................................|
 * |00001111011000011111000010010011||00
 * |     x    ||       y       ||   z  |
 *
 * z does not fit fully into the first 32 bit integer. 
 * The first 4 bits of z are stored at the end of the first 32 bit integer 
 * and the remaining 2 bits at the next 32 bit integer.
 * 
 */
BitReader = function(buf){

	var buffer = new Uint32Array(buf);
	var bitOffset = 0;
	
	this.read = function(bits){
		var result;
		
		if((bitOffset % 32) + bits <= 32){
			var val = buffer[Math.floor(bitOffset / 32)];
			var leftGap = bitOffset % 32;
			var rightGap = 32 - (leftGap + bits);
			
			result = (val << leftGap) >>> (leftGap + rightGap);
		}else{
			var val = buffer[Math.floor(bitOffset / 32)];
			var leftGap = bitOffset % 32;
			var rightGap = (leftGap + bits) - 32;
			
			result = (val << leftGap) >>> (leftGap - rightGap);
			
			val = buffer[Math.floor(bitOffset / 32)+1];
			result = result | val >>> (32 - rightGap);
		}
		
		bitOffset += bits;
		
		return result;
	};
};