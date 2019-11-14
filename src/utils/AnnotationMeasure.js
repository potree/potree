
//import {TextSprite} from "../TextSprite.js";
import {Utils} from "../utils.js";


export class AnnotationMeasure extends THREE.Object3D {
	
	constructor() {
        super();

        this.constructor.counter = (this.constructor.counter === undefined) ? 0 : this.constructor.counter + 1;

        this.name = 'Annotation_' + this.constructor.counter;
        this.points = [];
        this._closed = true;
        this.maxMarkers = 1;
		this.selected = false;

        this.sphereGeometry = new THREE.SphereGeometry(0.5, 10, 10);
        this.color = new THREE.Color(0xff0000);

        this.spheres = [];
    }

	createSphereMaterial () {
		let sphereMaterial = new THREE.MeshLambertMaterial({
			color: this.color,
			depthTest: false,
			depthWrite: false}
		);

		return sphereMaterial;
	};
	
    addMarker (point) {
        if (point instanceof THREE.Vector3) {
			point = {position: point};
		}else if(point instanceof Array){
			point = {position: new THREE.Vector3(...point)};
        }
        this.points.push(point.position);

		// sphere
		let sphere = new THREE.Mesh(this.sphereGeometry, this.createSphereMaterial());		
		this.add(sphere);
		this.spheres.push(sphere);
		
		{ // Event Listeners
			let drag = (e) => {
				let I = Utils.getMousePointCloudIntersection(
					e.drag.end, 
					e.viewer.scene.getActiveCamera(), 
					e.viewer, 
					e.viewer.scene.pointclouds,
					{pickClipped: true});

                if (I) {
                    let i = this.spheres.indexOf(e.drag.object);
					if (i !== -1) {
                        let point = this.points[i];
						for (let key of Object.keys(I.point).filter(e => e !== 'position')) {
							point[key] = I.point[key];
						}

						this.setPosition(i, I.location);
					}
				}
            };

			let drop = e => {
				let i = this.spheres.indexOf(e.drag.object);
				if (i !== -1) {
					this.dispatchEvent({
						'type': 'marker_dropped',
						'annotation': this,
						'index': i
					});
				}
            };

			let mouseover = (e) => {
				e.object.material.emissive.setHex(0x888888);
				this.selected = true;
			};
			let mouseleave = (e) => {
				e.object.material.emissive.setHex(0x000000);
				this.selected = false;
			};

			sphere.addEventListener('drag', drag);
			sphere.addEventListener('drop', drop);
			sphere.addEventListener('mouseover', mouseover);
			sphere.addEventListener('mouseleave', mouseleave);
		}

		let event = {
			type: 'marker_added',
			annotation: this,
			sphere: sphere
		};
		this.dispatchEvent(event);

		this.setMarker(this.points.length - 1, point);
	};

    removeMarker(index) {
		this.points.splice(index, 1);

		this.remove(this.spheres[index]);
		this.spheres.splice(index, 1);

		this.update();
        this.dispatchEvent({ type: 'marker_removed', measurement: this });
	};

	setMarker (index, point) {
		this.points[index] = point;

		let event = {
			type: 'marker_moved',
			measure: this,
            index: index,
            position: point.position.clone()
		};
		this.dispatchEvent(event);
	
		this.update();
	}
	
	getPosition(index) {
		let point = this.points[index];
		
		return point.position;
    };

	changePosition(index, axis, value) {
		let position = this.points[index].position;		
		position[axis] = value;
		
		this.points[index].position.copy(position);
		this.spheres[index].position.copy(position);
    };
	
    setPosition(index, position) {
		let point = this.points[index];
		point.position.copy(position);
		
        let event = {
            type: 'marker_moved',
            measure: this,
            index: index,
            position: point.position.clone()
        };

		this.dispatchEvent(event);

		this.update();
    };

    update() {
		if (this.points.length === 0) {
			
			return;
		} else if (this.points.length === 1) {
			let point = this.points[0];
            let position = point.position;
            this.spheres[0].position.copy(position);
			return;
		}
	};

	get closed () {
		return this._closed;
	}

	set closed (value) {
		this._closed = value;
		this.update();
	}
}
