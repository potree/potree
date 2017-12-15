const queriesPerGL = new Map();
let cached = false;

class GLQueries {
	static forGL (gl) {
		let queries = queriesPerGL.get(gl);
		if (!queries) {
			cached = true;
			queries = new GLQueries(gl);
			queriesPerGL.set(gl, queries);
			cached = false;
		}
		return queries;
	}
	constructor (gl) {
		if (!cached) {
			throw new Error('GLQueries can only be created by GLQueries.forGL() ');
		}
		this.gl = gl;
		this.queries = {};
	}

	start (name) {
		let ext = this.gl.getExtension('EXT_disjoint_timer_query');

		if (!ext) {
			return;
		}

		if (this.queries[name] === undefined) {
			this.queries[name] = [];
		}

		let query = ext.createQueryEXT();
		ext.beginQueryEXT(ext.TIME_ELAPSED_EXT, query);

		this.queries[name].push(query);

		return query;
	};

	end (query) {
		// TODO: This is not how I imagine this happen? doesn't it need
		// to be deleteQueryEXT(); and only
		let ext = this.gl.getExtension('EXT_disjoint_timer_query');
		if (!ext) {
			return;
		}
		ext.endQueryEXT(ext.TIME_ELAPSED_EXT);
	};

	resolve () {
		let ext = this.gl.getExtension('EXT_disjoint_timer_query');

		let resolved = new Map();

		for (let name in this.queries) {
			let queries = this.queries[name];

			// TODO: unused: let sum = 0;
			// TODO: unused: let n = 0;
			let remainingQueries = [];
			for (let query of queries) {
				let available = ext.getQueryObjectEXT(query, ext.QUERY_RESULT_AVAILABLE_EXT);
				let disjoint = this.gl.getParameter(ext.GPU_DISJOINT_EXT);

				if (available && !disjoint) {
					// See how much time the rendering of the object took in nanoseconds.
					let timeElapsed = ext.getQueryObjectEXT(query, ext.QUERY_RESULT_EXT);
					let miliseconds = timeElapsed / (1000 * 1000);

					console.log(name + ': ' + miliseconds + 'ms');
					if (!resolved.get(name)) {
						resolved.set(name, []);
					}
					resolved.get(name).push(miliseconds);

					// sum += miliseconds;
					// n++;
				} else {
					remainingQueries.push(query);
				}
			}

			// let mean = sum / n;
			// console.log(`mean: ${mean.toFixed(3)}, samples: ${n}`);

			if (remainingQueries.length === 0) {
				delete this.queries[name];
			} else {
				this.queries[name] = remainingQueries;
			}
		}

		return resolved;
	};
};

module.exports = GLQueries;
