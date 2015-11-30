
Potree.Features = function(){

	var ftCanvas = document.createElement("canvas");
	var gl = ftCanvas.getContext("webgl") || ftCanvas.getContext("experimental-webgl");
	if (gl === null)
		return null;

	// -- code taken from THREE.WebGLRenderer --
	var _vertexShaderPrecisionHighpFloat = gl.getShaderPrecisionFormat( gl.VERTEX_SHADER, gl.HIGH_FLOAT );
	var _vertexShaderPrecisionMediumpFloat = gl.getShaderPrecisionFormat( gl.VERTEX_SHADER, gl.MEDIUM_FLOAT );
	var _vertexShaderPrecisionLowpFloat = gl.getShaderPrecisionFormat( gl.VERTEX_SHADER, gl.LOW_FLOAT );

	var _fragmentShaderPrecisionHighpFloat = gl.getShaderPrecisionFormat( gl.FRAGMENT_SHADER, gl.HIGH_FLOAT );
	var _fragmentShaderPrecisionMediumpFloat = gl.getShaderPrecisionFormat( gl.FRAGMENT_SHADER, gl.MEDIUM_FLOAT );
	var _fragmentShaderPrecisionLowpFloat = gl.getShaderPrecisionFormat( gl.FRAGMENT_SHADER, gl.LOW_FLOAT );

	var highpAvailable = _vertexShaderPrecisionHighpFloat.precision > 0 && _fragmentShaderPrecisionHighpFloat.precision > 0;
	var mediumpAvailable = _vertexShaderPrecisionMediumpFloat.precision > 0 && _fragmentShaderPrecisionMediumpFloat.precision > 0;
	// -----------------------------------------

	var precision;
	if(highpAvailable){
		precision = "highp";
	}else if(mediumpAvailable){
		precision = "mediump";
	}else{
		precision = "lowp";
	}

	return {
		SHADER_INTERPOLATION: {
			isSupported: function(){

				//if(typeof this.shaderInterpolationSupported === "undefined"){
				//	var material = new Potree.PointCloudMaterial();
				//	material.interpolate = true;
				//
				//	var vs = gl.createShader(gl.VERTEX_SHADER);
				//	var fs = gl.createShader(gl.FRAGMENT_SHADER);
				//	gl.shaderSource(vs, material.vertexShader);
				//	gl.shaderSource(fs, material.fragmentShader);
				//
				//	gl.compileShader(vs);
				//	gl.compileShader(fs);
				//
				//	var successVS = gl.getShaderParameter(vs, gl.COMPILE_STATUS);
				//	var successFS = gl.getShaderParameter(fs, gl.COMPILE_STATUS);
				//	this.shaderInterpolationSupported = successVS && successFS;
				//}
				//
				//return this.shaderInterpolationSupported;


				var supported = true;

				supported = supported && gl.getExtension("EXT_frag_depth");
				supported = supported && gl.getParameter(gl.MAX_VARYING_VECTORS) >= 8;

				return supported;
			}
		},
		SHADER_SPLATS: {
			isSupported: function(){

				var supported = true;

				supported = supported && gl.getExtension("EXT_frag_depth");
				supported = supported && gl.getExtension("OES_texture_float");
				supported = supported && gl.getParameter(gl.MAX_VARYING_VECTORS) >= 8;

				return supported;

			}

		},
		SHADER_EDL: {
			isSupported: function(){
				
				var supported = true;
				
				supported = supported && gl.getExtension("EXT_frag_depth");
				supported = supported && gl.getExtension("OES_texture_float");
				supported = supported && gl.getParameter(gl.MAX_VARYING_VECTORS) >= 8;
				
				return supported;
				
			}
		
		},
		precision: precision
	};

}();
