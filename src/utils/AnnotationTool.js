

//import {Volume, BoxVolume} from "./Volume.js";
import {AnnotationMeasure} from "./AnnotationMeasure.js";
import {Utils} from "../utils.js";
import {EventDispatcher} from "../EventDispatcher.js";

export class AnnotationTool extends EventDispatcher{
	
	constructor (viewer) {
		super();

		this.viewer = viewer;
		this.renderer = viewer.renderer;
		
		this.annotation = null;

		this.scene = new THREE.Scene();
		this.scene.name = 'scene_annotation';
		this.light = new THREE.PointLight(0xffffff, 1.0);
		this.scene.add(this.light);

		this.viewer.inputHandler.registerInteractiveScene(this.scene);
		
		this.isOrientationSavecChecked = false;
		this.title = "";
		this.description = "";
		
		this.onEdit = (e) => {
			if(this.annotationMeasure !== null) {
				viewer.postMessage(`<span data-i18n=\"annotations.annotation_edit_msg">`+i18n.t("annotations.annotation_edit_msg")+`</span>`, {duration: 2000});
				return;
			}
			
			this.annotation = e.annotation;
			
			let cameraPosition = this.annotation.cameraPosition;
			let cameraTarget = this.annotation.cameraTarget;
			if(cameraPosition !== undefined && cameraTarget !== undefined) {
				viewer.scene.view.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
				viewer.scene.view.lookAt(cameraTarget.x, cameraTarget.y, cameraTarget.z);
				
				this.isOrientationSavecChecked = true;
				this.dispatchEvent({
					'type': 'annotation_marker_updated',
					'title': this.annotation.title,
					'position': this.annotation.position,
					'description': this.annotation.description,
					'orientation': 'checked'
				});
			} else {
				this.isOrientationSavecChecked = false;
				this.dispatchEvent({
					'type': 'annotation_marker_updated',
					'title': this.annotation.title,
					'position': this.annotation.position,
					'description': this.annotation.description,
					'orientation': 'unchecked'
				});
			}
			
			this.startInsertion({
				position: this.annotation.position
			});
			
			viewer.scene.annotations.remove(e.annotation);
			
			$("#menu_annotations").next().show();
			document.getElementById("menu_annotations").scrollIntoView();
		};

		this.annotationMeasure = null;

		viewer.addEventListener("update", this.update.bind(this));
		viewer.addEventListener("render.pass.perspective_overlay", this.render.bind(this));
		viewer.addEventListener("scene_changed", this.onSceneChange.bind(this));

		viewer.scene.addEventListener('annotation_edited', this.onEdit);
	}

	onSceneChange(e){
		this.cancelAnnotation({ scene : e.oldScene });
		
		if(e.oldScene){
			e.oldScene.removeEventListener('annotation_edited', this.onEdit);
		}

		e.scene.addEventListener('annotation_edited', this.onEdit);
	}

    startInsertion(args = {}) {
		if(this.annotationMeasure !== null) {
			viewer.postMessage(`<span data-i18n=\"annotations.annotation_edit_msg">`+i18n.t("annotations.annotation_edit_msg")+`</span>`, {duration: 2000});
			return;
		}
		
        let domElement = this.viewer.renderer.domElement;
		this.annotationMeasure = new AnnotationMeasure();
		
		this.onMarkerMove = (e) => {
			this.dispatchEvent({
				'type': 'annotation_marker_updated',
				'position': e.position
			});
		};
		this.annotationMeasure.addEventListener('marker_moved', this.onMarkerMove);
		
        let cancel = {
            removeLastMarker: false,
            callback: null
        };

        let insertionCallback = (e) => {
            if (e.button === THREE.MOUSE.RIGHT) {
				if(this.annotationMeasure !== null && this.annotationMeasure.selected) {
					cancel.removeLastMarker = true;
					cancel.callback();
				}
            }
        };

        cancel.callback = e => {
            if (cancel.removeLastMarker) {
                this.annotationMeasure.removeMarker(this.annotationMeasure.points.length - 1);
				this.annotationMeasure = null;
				
				this.dispatchEvent({
					'type': 'annotation_marker_updated',
					'clear': 'clear_position'
				});
            }
            domElement.removeEventListener('mouseup', insertionCallback);
            this.viewer.removeEventListener('cancel_insertions', cancel.callback);
        };

        this.viewer.addEventListener('cancel_insertions', cancel.callback);
        domElement.addEventListener('mouseup', insertionCallback);
		
		if (args.position) {
			this.annotationMeasure.addMarker(args.position.clone());
			this.scene.add(this.annotationMeasure);
		} else {
			this.annotationMeasure.addMarker(new THREE.Vector3(0, 0, 0));
			this.viewer.inputHandler.startDragging(this.annotationMeasure.spheres[0]);
            this.scene.add(this.annotationMeasure);
		}
		
		
		
		
        /*if (args.create == true) {
            this.viewer.scene.addAnnotation(args.position,
                {
                    cameraPosition: args.cameraPosition,
                    cameraTarget: args.cameraTarget,
                    title: args.title,
                    description: args.description
                });
        } else if ((args.create == false) && (args.position != false)) {
            this.annotationMeasure.addMarker(new THREE.Vector3(parseFloat(args.position[0]), parseFloat(args.position[1]), parseFloat(args.position[2])));
            this.viewer.inputHandler.startDragging(
                this.annotationMeasure.spheres[this.annotationMeasure.spheres.length - 1]);
            this.scene.add(this.annotationMeasure);
        }else {
            this.annotationMeasure.addMarker(new THREE.Vector3(0, 0, 0));
			this.viewer.inputHandler.startDragging(
                this.annotationMeasure.spheres[this.annotationMeasure.spheres.length - 1]);
            this.scene.add(this.annotationMeasure);
		}*/
		
        return this.annotationMeasure;
	}
	
	update(){
		if(this.annotationMeasure != null) {
			let camera = this.viewer.scene.getActiveCamera();
			let clientWidth = this.renderer.getSize().width;
			let clientHeight = this.renderer.getSize().height;
		
			this.light.position.copy(camera.position);
		
			this.annotationMeasure.update();
			
			for (let sphere of this.annotationMeasure.spheres) {
                let distance = camera.position.distanceTo(sphere.getWorldPosition(new THREE.Vector3()));
                let pr = Utils.projectedRadius(1, camera, distance, clientWidth, clientHeight);
                let scale = (15 / pr);
                sphere.scale.set(scale, scale, scale);
            }
		}
	}

	render(){
		this.viewer.renderer.render(this.scene, this.viewer.scene.getActiveCamera());
	}
	
	onTitleChanged(e) {
		this.title = e.target.value;
	}
	
	onDescriptionChanged(e) {
		this.description = e.target.value;
	}
	
	onPositionXChanged(e) {
		if(this.annotationMeasure !== null) {
			this.annotationMeasure.changePosition(0, 'x', parseFloat(e.target.value));
		}
	}
	onPositionYChanged(e) {
		if(this.annotationMeasure !== null) {
			this.annotationMeasure.changePosition(0, 'y', parseFloat(e.target.value));
		}
	}
	onPositionZChanged(e) {
		if(this.annotationMeasure !== null) {
			this.annotationMeasure.changePosition(0, 'z', parseFloat(e.target.value));
		}
	}
	
	onOrientationSaveChanged(e) {
		this.isOrientationSavecChecked = e.target.checked;
	}
	
	cancelAnnotation(args = {}) {
		if(this.annotationMeasure !== null) {
			this.annotationMeasure.removeMarker(0);
			this.annotationMeasure = null;
		}
		
		if(this.annotation !== null) {
			let scene = this.viewer.scene;
			if(args.scene) {
				args.scene.annotations.addOnly(this.annotation);
			} else {
				this.viewer.scene.annotations.add(this.annotation);
			}
			
			this.annotation = null;
		}
		
		this.dispatchEvent({
			'type': 'annotation_marker_updated',
			'clear': 'clear_all'
		});
		
		this.isOrientationSavecChecked = false;
		this.description = "";
		this.title = "";
	}
	
	validAnnotation() {		
		if(this.annotation !== null) {
			this.annotation.position = this.annotationMeasure.getPosition(0);
			
			let cameraPosition = null;
			let cameraTarget = null;			
			if(this.isOrientationSavecChecked) {
				cameraPosition = this.viewer.scene.getActiveCamera().position.clone();
				cameraTarget = this.annotationMeasure.getPosition(0).clone();
			}
			this.annotation.cameraPosition = cameraPosition;
			this.annotation.cameraTarget = cameraTarget;
			
			if(this.title.length > 0) {
				this.annotation.title = this.title;
			}			
			if(this.description.length > 0) {
				this.annotation.description = this.description;
			}

			this.viewer.scene.annotations.add(this.annotation);		
			this.annotation = null;
		} else {
			let position = this.annotationMeasure.getPosition(0);
			let cameraPosition = null;
			let cameraTarget = null;			
			if(this.isOrientationSavecChecked) {
				cameraPosition = this.viewer.scene.getActiveCamera().position.clone();
				cameraTarget = this.annotationMeasure.getPosition(0).clone();
			}
		
			this.viewer.scene.addAnnotation(position,
			{
				cameraPosition: cameraPosition,
				cameraTarget: cameraTarget,
				title: this.title,
				description: this.description
			});
		}
		
		this.cancelAnnotation();
	}
}
