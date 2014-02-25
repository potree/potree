
/**
 * @class extensions for Arrays
 * 
 * @author Markus Schuetz
 */
Array = Array;

/**
 * remove all occurences of element in the array
 */
Array.prototype.remove=function(element){
	var index = null;
	while((index = this.indexOf(element)) !== -1){
		this.splice(index, 1);
	}
};

Array.prototype.contains = function(element){
	var index = this.indexOf(element);
	return index !== -1;
};

Object.defineProperties(Array.prototype, {
	'x':  {
		get: function(){
			return this[0];
		}
	},
	'y':  {
		get: function(){
			return this[1];
		}
	},
	'z':  {
		get: function(){
			return this[2];
		}
	},
	'w':  {
		get: function(){
			return this[3];
		}
	},
	'r':  {
		get: function(){
			return this[0];
		}
	},
	'g':  {
		get: function(){
			return this[1];
		}
	},
	'b':  {
		get: function(){
			return this[2];
		}
	},
	'a':  {
		get: function(){
			return this[3];
		}
	}
});
