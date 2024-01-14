// import {PointCloudTreeNode} from "./PointCloudTree.js";
import {PointAttributes, PointAttribute, PointAttributeTypes} from "./loader/PointAttributes.js";
import * as THREE from "../libs/three.js/build/three.module.js";

export class U {
	static toVector3(v, offset) {
		return new THREE.Vector3().fromArray(v, offset || 0);
	}

	static toBox3(b) {
		return new THREE.Box3(U.toVector3(b), U.toVector3(b, 3));
	};

	static findDim(schema, name) {
		var dim = schema.find((dim) => dim.name == name);
		if (!dim) throw new Error('Failed to find ' + name + ' in schema');
		return dim;
	}

	static sphereFrom(b) {
		return b.getBoundingSphere(new THREE.Sphere());
	}

	static toPotreeName([d, x, y, z]) {
		var name = 'r';

		for (var i = 0; i < d; ++i) {
			var shift = d - i - 1;
			var mask = 1 << shift;
			var step = 0;

			if (x & mask) step += 4;
			if (y & mask) step += 2;
			if (z & mask) step += 1;

			name += step;
		}

		return name;
	}

	static maybeSrs(srs) {
		try {
			proj4(srs)
			return srs
		} catch (e) {}
	}
};

export class BaseGeometry {
	constructor({
		cube,
		boundsConforming,
		spacing,
		srs,
	}) {
		this.cube = cube;

		this.boundingBox = U.toBox3(cube);
		this.tightBoundingBox = U.toBox3(boundsConforming);
		this.boundingSphere = U.sphereFrom(this.boundingBox);
		this.tightBoundingSphere = U.sphereFrom(this.tightBoundingBox);
		this.offset = U.toVector3([0, 0, 0]);
		this.version = new Potree.Version('1.7');

		this.loader = new Potree.CopcLaszipLoader();

		this.spacing = spacing;
		this.projection = srs || null;
		try {
			proj4(this.projection);
		} catch(e) {
			this.projection = null;
		}

		const attributes = new PointAttributes();
		attributes.add(PointAttribute.POSITION_CARTESIAN);
		attributes.add(new PointAttribute("rgba", PointAttributeTypes.DATA_TYPE_UINT8, 4));
		attributes.add(new PointAttribute("intensity", PointAttributeTypes.DATA_TYPE_UINT16, 1));
		attributes.add(new PointAttribute("classification", PointAttributeTypes.DATA_TYPE_UINT8, 1));
		attributes.add(new PointAttribute("gps-time", PointAttributeTypes.DATA_TYPE_FLOAT, 1));
		attributes.add(new PointAttribute("returnNumber", PointAttributeTypes.DATA_TYPE_UINT8, 1));
		attributes.add(new PointAttribute("number of returns", PointAttributeTypes.DATA_TYPE_UINT8, 1));
		attributes.add(new PointAttribute("return number", PointAttributeTypes.DATA_TYPE_UINT8, 1));
		attributes.add(new PointAttribute("source id", PointAttributeTypes.DATA_TYPE_UINT16, 1));
		this.pointAttributes = attributes;
	}
}

export class PointCloudEptGeometry extends BaseGeometry {
	static parse(ept) {
		const { bounds: cube, boundsConforming, span, srs: filesrs } = ept

		const spacing = (cube[3] - cube[0]) / span

		let srs
		if (filesrs) {
			const { authority, horizontal, wkt } = filesrs
			if (authority && horizontal) {
				srs = U.maybeSrs(`${authority}:${horizontal}`)
			}
			if (!srs && wkt) srs = U.maybeSrs(wkt)
		}

		return { cube, boundsConforming, spacing, srs }
	}

	constructor(base, ept) {
		super(PointCloudEptGeometry.parse(ept))

		this.type = 'ept';
		this.base = base;
		this.ept = ept;

		this.loader = (() => {
			switch (ept.dataType) {
				case 'laszip': return new Potree.EptLaszipLoader()
				case 'binary': return new Potree.EptBinaryLoader()
				case 'zstandard': return new Potree.EptZstandardLoader()
				default: throw new Error('Invalid data type: ' + ept.dataType)
			}
		})()
	}

	async loadHierarchyPage(key) {
		const { Ept, Key } = window.Copc

		const filename = `${this.base}/ept-hierarchy/${Key.toString(key)}.json`
		const response = await fetch(filename);
		const json = await response.json();
		debugger
		const hierarchy = Ept.Hierarchy.parse(json)
		return hierarchy
	}
}
