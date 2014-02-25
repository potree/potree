
/**
 * 
 * @param {String} name a unique name for the material or null. If name is null, a unique name will be generated.  
 * @class The base class for all materials.
 * @author Markus Schuetz
 */
function Material(name){
	if (arguments[0] === inheriting) return;
	
	if(name == null){
		name = "Material_" + Material.count;
	}
	this.name = name;
	
	MaterialManager.addMaterial(this);
	
	Material.count++;
}

Material.count = 0;