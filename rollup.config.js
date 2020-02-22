export default [
	{
		input: 'src/Potree.js',
		treeshake: false,
		output: {
			file: 'build/potree/potree.js',
			format: 'umd',
			name: 'Potree',
			sourcemap: true,
		}
	},{
		input: 'src/workers/BinaryDecoderWorker.js',
		output: {
			file: 'build/potree/workers/BinaryDecoderWorker.js',
			format: 'es',
			name: 'Potree',
			sourcemap: false
		}
	},{
		input: 'src/modules/Loader_1.8/OctreeDecoderWorker.js',
		output: {
			file: 'build/potree/workers/OctreeDecoderWorker.js',
			format: 'es',
			name: 'Potree',
			sourcemap: false
		}
	}
]