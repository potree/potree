
class EnumItem{
	constructor(object){
		for(let key of Object.keys(object)){
			this[key] = object[key];
		}
	}

	inspect(){
		return `Enum(${this.name}: ${this.value})`;
	}
};

class Enum{

	constructor(object){
		this.object = object;

		for(let key of Object.keys(object)){
			let value = object[key];

			if(typeof value === "object"){
				value.name = key;
			}else{
				value = {name: key, value: value};
			}
			
			this[key] = new EnumItem(value);
		}
	}

	fromValue(value){
		for(let key of Object.keys(this.object)){
			if(this[key].value === value){
				return this[key];
			}
		}

		throw new Error(`No enum for value: ${value}`);
	}
	
};

export {Enum, EnumItem};