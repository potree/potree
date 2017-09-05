const queriesPerGL = new Map();
let cached = false;

class GLQueries {
	static forGL (gl) {
		let queries = queriesPerGL.get(gl);
		if (!queries) {
			cached = true;
			queries = new GLQueries(gl);
			cached = false;
		}
		return queries;
	}
	constructor (gl) {
		if (!chached) {
			throw new Error('GLQueries can only be created by GLQueries.forGL() ');
		}
		this.gl = gl;
		this.queries = {};
		this.enabled = false;
	}

	start (name) {
		if (!this.enabled) {
			return null;
		}

		if (this.queries[name] === undefined) {
			this.queries[name] = [];
		}

		let ext = gl.getExtension('EXT_disjoint_timer_query');
		let query = ext.createQueryEXT();
		ext.beginQueryEXT(ext.TIME_ELAPSED_EXT, query);

		this.queries[name].push(query);

		return query;
	};

	end (query) {
		if (!this.enabled) {
			return;
		}

		// TODO: This is not how I imagine this happen? doesn't it need
		// to be deleteQueryEXT(); and only
		let ext = this.gl.getExtension('EXT_disjoint_timer_query');
		ext.endQueryEXT(ext.TIME_ELAPSED_EXT);
	};

	resolve () {
		if (!this.enabled) {
			return;
		}

		let ext = this.gl.getExtension('EXT_disjoint_timer_query');

		for (let name in this.queries) {
			let queries = this.queries[name];

			if (queries.length > 0) {
				let query = queries[0];

				let available = ext.getQueryObjectEXT(query, ext.QUERY_RESULT_AVAILABLE_EXT);
				let disjoint = this.gl.getParameter(ext.GPU_DISJOINT_EXT);

				if (available && !disjoint) {
					// See how much time the rendering of the object took in nanoseconds.
					let timeElapsed = ext.getQueryObjectEXT(query, ext.QUERY_RESULT_EXT);
					let miliseconds = timeElapsed / (1000 * 1000);

					console.log(name + ': ' + miliseconds + 'ms');
					queries.shift();
				}
			}

			if (queries.length === 0) {
				delete this.queries[name];
			}
		}
	};
};

module.exports = GLQueries;
