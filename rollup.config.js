export default [
	{
		input: 'src/Potree.js',
		output: {
			file: 'build/potree/potree.js',
			format: 'umd',
			name: 'Potree',
			sourcemap: true
		}
	},
	{
		input: 'src/workers/BinaryDecoderWorker.js',
		output: {
			file: 'build/potree/workers/BinaryDecoderWorker.js',
			format: 'es',
			name: 'Potree',
			sourcemap: true
		}
	}
]