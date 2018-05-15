
export class CSVExporter {
	static toString (points) {
		let string = '';

		let attributes = Object.keys(points.data)
			.filter(a => a !== 'normal')
			.sort((a, b) => {
				if (a === 'position') return -1;
				if (b === 'position') return 1;
				if (a === 'color') return -1;
				if (b === 'color') return 1;
			});

		let headerValues = [];
		for (let attribute of attributes) {
			let itemSize = points.data[attribute].length / points.numPoints;

			if (attribute === 'position') {
				headerValues = headerValues.concat(['x', 'y', 'z']);
			} else if (attribute === 'color') {
				headerValues = headerValues.concat(['r', 'g', 'b', 'a']);
			} else if (itemSize > 1) {
				for (let i = 0; i < itemSize; i++) {
					headerValues.push(`${attribute}_${i}`);
				}
			} else {
				headerValues.push(attribute);
			}
		}
		string = headerValues.join(', ') + '\n';

		for (let i = 0; i < points.numPoints; i++) {
			let values = [];

			for (let attribute of attributes) {
				let itemSize = points.data[attribute].length / points.numPoints;
				let value = points.data[attribute]
					.subarray(itemSize * i, itemSize * i + itemSize)
					.join(', ');
				values.push(value);
			}

			string += values.join(', ') + '\n';
		}

		return string;
	}
};
