

/**
 * @class
 * 
 * keeps track of all material instances. 
 * materials register themselves upon creation.
 */
function MaterialManager(){
	
}

MaterialManager.materials = new Array();

MaterialManager.addMaterial = function(material){
	if(MaterialManager.getMaterial(material.name) != null){
		var message= "material has already been created: " + material.name;
		Logger.error(message);
		throw message;
	}
	
	this.materials.push(material);
};

MaterialManager.getMaterial = function(name){
	for(var i = 0; i < this.materials.length; i++){
		var material = this.materials[i];
		if(material.name === name){
			return material;
		}
	}
	
	return null;
};
