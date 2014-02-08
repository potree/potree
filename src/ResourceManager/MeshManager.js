

/**
 * @ignore
 */
function MeshManager(){
	
}

MeshManager.getMesh = function(name){
	
}

MeshManager.getMeshFileContent = function(name){
	var url = Config.meshDir + "/" + name;
	
	return load_binary_resource(url);
}