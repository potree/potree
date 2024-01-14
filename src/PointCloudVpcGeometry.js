import {BaseGeometry} from "./PointCloudEptGeometry.js"
import {CopcLaszipLoader} from "./loader/ept/LaszipLoader.js"

export class VpcBaseGeometry extends BaseGeometry {
	static parse(vpc) {
		let xmin, ymin, zmin, xmax, ymax, zmax;

		for(const feature of vpc.features) {
			const box = feature.properties['proj:bbox'];
			xmin = xmin === undefined ? box[0] : Math.min(box[0], xmin);
			ymin = ymin === undefined ? box[1] : Math.min(box[1], ymin);
			zmin = zmin === undefined ? box[2] : Math.min(box[2], zmin);
			xmax = xmax === undefined ? box[3] : Math.max(box[3], xmax);
			ymax = ymax === undefined ? box[4] : Math.max(box[4], ymax);
			zmax = zmax === undefined ? box[5] : Math.max(box[5], zmax);
		}

		const cube = [xmin, ymin, zmin, xmax, ymax, zmax];
		const boundsConforming = cube;
		return ({cube, boundsConforming, spacing: null, srs: null});
	}

	constructor(vpc,feature) {
		super(VpcBaseGeometry.parse(vpc))
		this.type = 'vpc-feature';
		this.feature = feature;
		// use copc loader
		this.loader = new CopcLaszipLoader()
		this.featureId = feature.id

		console.group("VpcBaseGeometry.constructor")
		console.log("vpc...", vpc)
		console.log("feature.id...", feature.id)
		console.log("this...", this)
		console.groupEnd()
	}

	async loadGetter(){
		try{
			const { Copc, Getter} = window.Copc

			const url = this.feature.assets.data.href;
			const getter = Getter.http(url);
			const copc = await Copc.create(getter);

			this.getter = getter
			this.copc = copc;
			this.pages = { '0-0-0-0': copc.info.rootHierarchyPage }

			return true
		}catch(e){
			return false
		}
	}

	async loadHierarchyPage(key) {
		const { Copc, Key } = window.Copc
		// debugger
		const page = this.pages[Key.toString(key)]
		const hierarchy = await Copc.loadHierarchyPage(this.getter, page)
		console.group("VpcBaseGeometry.loadHierarchyPage")
		console.log("key...", key)
		console.log("hierarchy...", hierarchy)
		console.groupEnd()
		return hierarchy
	}
};
