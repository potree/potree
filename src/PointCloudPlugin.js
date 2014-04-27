
Potree.PointCloudPlugin = function(){
			//TODO scene handling is completely wrong right now. fix this.
			
			var _pointClouds = [];
			var _pointCloudOctrees = [];
			var _renderer;
			var _gl;
			var _this = this;
			
			this.add = function(pointCloud){
				if(pointCloud instanceof Potree.PointCloud){
					_pointClouds.push(pointCloud);
				}else if(pointCloud instanceof Potree.PointCloudOctree){
					_pointCloudOctrees.push(pointCloud);
				}
			};
			this.init = function(renderer){
				_renderer = renderer;
				_gl = renderer.context;
			};
			this.initWebGLObjects = function(scene){
				if(!scene.__potree){
					scene.__potree = {};
					scene.__potree.__webglObjects = [];
				}
			};
			this.render = function(scene, camera){
				var lights = scene.__lights;
				var fog = scene.fog;
				
				this.initWebGLObjects(scene);
				for(var i = 0; i < _pointClouds.length; i++){
					var pc = _pointClouds[i];
					if(pc.addedTo == undefined){
						pc.addedTo = [];
					}
					if(pc.addedTo[scene] === undefined){
						var webglObject = {
								id: null,
								buffer: pc.geometry,
								object: pc,
								opaque: null,
								transparent: null,
								z: 0
							};
						webglObject.material = pc.material;
						scene.__potree.__webglObjects.push(webglObject);
						scene.__webglObjects.push(webglObject);
						pc.addedTo[scene] = true;
					}
					
					var material = null;
					_renderer.setBlending( THREE.NoBlending );
					this.renderObjects(scene.__potree.__webglObjects, true, "opaque", camera, lights, fog, false, material);
				}
				
				
				for(var i = 0; i < _pointCloudOctrees.length; i++){
					var pco = _pointCloudOctrees[i];
					for(var j = 0; j < pco.geometry.geometries.length; j++){
						var pc = pco.geometry.geometries[j];
						if(pc.addedTo == undefined){
							pc.addedTo = [];
						}
						if(pc.addedTo[scene] === undefined){
							var webglObject = {
									id: null,
									buffer: pc,
									object: pco,
									opaque: null,
									transparent: null,
									z: 0
								};
							scene.__potree.__webglObjects.push(webglObject);
							scene.__webglObjects.push(webglObject);
							pc.addedTo[scene] = true;
						}
						
						var material = null;
						_renderer.setBlending( THREE.NoBlending );
						this.renderObjects(scene.__potree.__webglObjects, true, "opaque", camera, lights, fog, false, material);
					}
				}
			};
			
			this.renderObjects = function(renderList, reverse, materialType, camera, lights, fog, useBlending, overrideMaterial){
				var webglObject, object, buffer, material, start, end, delta;
				
				for(var i = 0; i < renderList.length; i++){
					webglObject = renderList[i];
//					if (webglObject.render) {
					if(true){ //FIXME
						object = webglObject.object;
						buffer = webglObject.buffer;
	
						if ( overrideMaterial ) {
							material = overrideMaterial;
						} else {
	
							material = webglObject[ materialType ];
							if ( ! material ) continue;
							if ( useBlending ) _this.setBlending( material.blending, material.blendEquation, material.blendSrc, material.blendDst );
	
							_renderer.setDepthTest( material.depthTest );
							_renderer.setDepthWrite( material.depthWrite );
							_renderer.setPolygonOffset( material.polygonOffset, material.polygonOffsetFactor, material.polygonOffsetUnits );
						}
	
						_renderer.setMaterialFaces( material );
						if ( buffer instanceof THREE.BufferGeometry ) {
							_this.renderBufferDirect( camera, lights, fog, material, buffer, object );
						} else {
							_renderer.renderBuffer( camera, lights, fog, material, buffer, object );
						}
					}
				}
			}
			
			this.renderBufferDirect = function(camera, lights, fog, material, geometry, object){
				if ( material.visible === false ) return;

				var linewidth, a, attribute;
				var attributeItem, attributeName, attributePointer, attributeSize;

				var program = _renderer.setProgram( camera, lights, fog, material, object );

				var programAttributes = program.attributes;
				var geometryAttributes = geometry.attributes;

				var updateBuffers = false,
					wireframeBit = material.wireframe ? 1 : 0,
					geometryHash = ( geometry.id * 0xffffff ) + ( program.id * 2 ) + wireframeBit;

//				if ( geometryHash !== _currentGeometryGroupHash ) {
//					_currentGeometryGroupHash = geometryHash;
//					updateBuffers = true;
//				}
//
//				if ( updateBuffers ) {
					_renderer.disableAttributes();
//				}
				
//				if ( updateBuffers ) {
					for ( attributeName in programAttributes ) {
						attributePointer = programAttributes[ attributeName ];
						attributeItem = geometryAttributes[ attributeName ];
						if ( attributePointer >= 0 ) {
							if ( attributeItem ) {
								attributeSize = attributeItem.itemSize;
								_gl.bindBuffer( _gl.ARRAY_BUFFER, attributeItem.buffer );
								_renderer.enableAttribute( attributePointer );
								_gl.vertexAttribPointer( attributePointer, attributeSize, _gl.FLOAT, false, 0, 0 );
							} else if ( material.defaultAttributeValues && material.defaultAttributeValues[ attributeName ] ) {
								if ( material.defaultAttributeValues[ attributeName ].length === 2 ) {
									_gl.vertexAttrib2fv( attributePointer, material.defaultAttributeValues[ attributeName ] );
								} else if ( material.defaultAttributeValues[ attributeName ].length === 3 ) {
									_gl.vertexAttrib3fv( attributePointer, material.defaultAttributeValues[ attributeName ] );
								}
							}
						}
					}
//				}
				
				var position = geometryAttributes[ "position" ];

				// render particles
				_gl.drawArrays( _gl.POINTS, 0, position.array.length / 3 );

//				_this.info.render.calls ++;
//				_this.info.render.points += position.array.length / 3;
			}
		};