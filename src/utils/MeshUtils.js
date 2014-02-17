
/**
 * @class
 */
function MeshUtils() {

}

/**
 * box daten von:https://cvs.khronos.org/svn/repos/registry/trunk/public/webgl/sdk/demos/webkit/SpinningBox.html
 * 
 */
MeshUtils.createRectangle = function() {
	var mesh = new Mesh();
	var subMesh = new SubMesh();
	mesh.addSubMesh(subMesh);

	// box
    //    v6----- v5
    //   /|      /|
    //  v1------v0|
    //  | |     | |
    //  | |v7---|-|v4
    //  |/      |/
    //  v2------v3
    //
    // vertex coords array
    var vertices = new Float32Array(
        [  1, 1, 1,  -1, 1, 1,  -1,-1, 1,   1,-1, 1,    // v0-v1-v2-v3 front
           1, 1, 1,   1,-1, 1,   1,-1,-1,   1, 1,-1,    // v0-v3-v4-v5 right
           1, 1, 1,   1, 1,-1,  -1, 1,-1,  -1, 1, 1,    // v0-v5-v6-v1 top
          -1, 1, 1,  -1, 1,-1,  -1,-1,-1,  -1,-1, 1,    // v1-v6-v7-v2 left
          -1,-1,-1,   1,-1,-1,   1,-1, 1,  -1,-1, 1,    // v7-v4-v3-v2 bottom
           1,-1,-1,  -1,-1,-1,  -1, 1,-1,   1, 1,-1 ]   // v4-v7-v6-v5 back
    );

    // normal array
    var normals = new Float32Array(
        [  0, 0, 1,   0, 0, 1,   0, 0, 1,   0, 0, 1,     // v0-v1-v2-v3 front
           1, 0, 0,   1, 0, 0,   1, 0, 0,   1, 0, 0,     // v0-v3-v4-v5 right
           0, 1, 0,   0, 1, 0,   0, 1, 0,   0, 1, 0,     // v0-v5-v6-v1 top
          -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0,     // v1-v6-v7-v2 left
           0,-1, 0,   0,-1, 0,   0,-1, 0,   0,-1, 0,     // v7-v4-v3-v2 bottom
           0, 0,-1,   0, 0,-1,   0, 0,-1,   0, 0,-1 ]    // v4-v7-v6-v5 back
       );


    // texCoord array
    var texCoords = new Float32Array(
        [  1, 1,   0, 1,   0, 0,   1, 0,    // v0-v1-v2-v3 front
           0, 1,   0, 0,   1, 0,   1, 1,    // v0-v3-v4-v5 right
           1, 0,   1, 1,   0, 1,   0, 0,    // v0-v5-v6-v1 top
           1, 1,   0, 1,   0, 0,   1, 0,    // v1-v6-v7-v2 left
           0, 0,   1, 0,   1, 1,   0, 1,    // v7-v4-v3-v2 bottom
           0, 0,   1, 0,   1, 1,   0, 1 ]   // v4-v7-v6-v5 back
       );

    // index array
    var indices = new Uint8Array(
        [  0, 1, 2,   0, 2, 3,    // front
           4, 5, 6,   4, 6, 7,    // right
           8, 9,10,   8,10,11,    // top
          12,13,14,  12,14,15,    // left
          16,17,18,  16,18,19,    // bottom
          20,21,22,  20,22,23 ]   // back
      );
	
	subMesh.setVertexBufferData("POSITION", vertices);
	subMesh.setVertexBufferData("NORMAL", normals);
	subMesh.setVertexBufferData("TEXCOORD_0", texCoords);
	subMesh.setIndexBufferData(indices);
	
	var material = MaterialManager.getMaterial("grid");
	mesh.setMaterial(material);
	
	return mesh;
};


MeshUtils.createGrid = function(cellWidth, rows, columns) {
	var mesh = new Mesh();
	var subMesh = new SubMesh();
	mesh.addSubMesh(subMesh);

	
	var lineCount = rows + columns + 2;
	var vertices = new Float32Array(lineCount*2*3);
	
	{ // make column lines
		var x = - (cellWidth * columns / 2.0);
		var z = - (cellWidth * rows / 2.0);
		for(var i = 0; i <= columns; i++){
			var index = i*6;
			// start
			vertices[index+0] = x;
			vertices[index+1] = 0.0;
			vertices[index+2] = z;
			// end
			vertices[index+3] = x;
			vertices[index+4] = 0.0;
			vertices[index+5] = -z;
			
			x += cellWidth;
		}
	}
	
	{ // make row lines
		var x = - (cellWidth * rows / 2.0);
		var z = - (cellWidth * columns / 2.0);
		for(var i = columns+1; i <= (rows+columns+1); i++){
			var index = i*6;
			// start
			vertices[index+0] = x;
			vertices[index+1] = 0.0;
			vertices[index+2] = z;
			// end
			vertices[index+3] = -x;
			vertices[index+4] = 0.0;
			vertices[index+5] = z;
			
			z += cellWidth;
		}
	}
	
	subMesh.setVertexBufferData("POSITION", vertices);
	subMesh.vertexCount = lineCount*2;
	//subMesh.setVertexCount(1+columns*2);
	mesh.setType(MeshType.LINES);
	
	var gridMaterial = new FlatMaterial("grid", [0.7, 0.7, 0.7, 1.0]);
//	var material = MaterialManager.getMaterial("grid");
	mesh.setMaterial(gridMaterial);
	
	return mesh;
};

MeshUtils.createLine = function(start, end) {
	var mesh = new Mesh();
	var subMesh = new SubMesh();
	mesh.addSubMesh(subMesh);

	var vertices = new Float32Array([start[0], start[1], start[2],end[0], end[1], end[2]]);
	
	subMesh.setVertexBufferData("POSITION", vertices);
	subMesh.vertexCount = 2;
	mesh.setType(MeshType.LINES);
	
	var material = ShaderManager.getShader("defaultFlat");
	mesh.setMaterial(material);
	
	return mesh;
};

MeshUtils.createQuad = function(p1, p2, p3, p4){
	var mesh = new Mesh();
	var subMesh = new SubMesh();
	mesh.addSubMesh(subMesh);

	var vertices = new Float32Array([
										p1[0], p1[1], p1[2],
										p2[0], p2[1], p2[2],
										p3[0], p3[1], p3[2],
										p1[0], p1[1], p1[2],
										p3[0], p3[1], p3[2],
										p4[0], p4[1], p4[2]
									]);
	
	subMesh.setVertexBufferData("POSITION", vertices);
	subMesh.vertexCount = 6;
	mesh.setType(MeshType.TRIANGLES);
	
	var material = ShaderManager.getShader("defaultFlat");
	mesh.setMaterial(material);
	
	return mesh;
};


