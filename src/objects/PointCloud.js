

/**
 * @class
 */
function PointCloud(name, pointAttributes) {
	this.name = name;
	this.vbo = null;
	this.aabb = null;
	this.pointCloudRoot = false;
	this.pointAttributes = pointAttributes;
	this.size = 0;
}

/**
 * delete point cloud data from gpu
 */
PointCloud.prototype.unload = function(){
	if (this.vbo !== null) {
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		gl.deleteBuffer(this.vbo);
		this.vbo = null;
	}
};

/**
 * move pointcloud data to the gpu
 * @param data
 */
PointCloud.prototype.setVertexBufferData = function(data) {

	// wenn vertex buffer noch nicht vorhanden -> neuen erstellen
	if (this.vbo === null) {
		this.vbo = gl.createBuffer();
	}

	gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
	gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
};

