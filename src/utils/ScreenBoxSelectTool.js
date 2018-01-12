

Potree.ScreenBoxSelect = class ScreenBoxSelect extends THREE.EventDispatcher{

	constructor(){
		
	}

};

Potree.ScreenBoxSelectTool = class ScreenBoxSelectTool extends THREE.EventDispatcher{

	constructor(viewer){
		super();

		this.viewer = viewer;
		this.renderer = viewer.renderer;
	}

	setScene(scene){
		if (this.scene === scene) {
			return;
		}

		this.scene = scene;
	}

	startInsertion(){
		let domElement = this.renderer.domElement;

		domElement.addEventListener("mousedown", e => {
			console.log("down");
		});

		domElement.addEventListener("mousemove", e => {
			console.log("move");
		});

		domElement.addEventListener("mouseup", e => {
			console.log("up");
		});
	}

}