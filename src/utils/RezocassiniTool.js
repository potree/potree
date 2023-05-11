import * as THREE from 'three';
import { Subject } from 'rxjs';

export class RezocassiniTool extends Potree.EventDispatcher {
    constructor(viewer) {
        super();

        // Events subject. To be used in Angular to react to events.
        this._subject = new Subject();
        this.events$ = this._subject.asObservable();

        // Internal count. Set by startInsertion default to one.
        this.count = 0;

        // Currently inserting ?
        this.inserting = false;

        // Convenience
        this.viewer = viewer;
        this.renderer = viewer.renderer;
        this.domElement = this.viewer.renderer.domElement;

        // Sphere to drag on the pointcloud
        this.sg = new THREE.SphereGeometry(1);
        this.sm = new THREE.MeshNormalMaterial();
        this.s = new THREE.Mesh(this.sg, this.sm);

        // User-placed points
        this.points = [];

        // Sphere to represent the points
        this.pg = new THREE.SphereGeometry(1);
        this.pm = new THREE.MeshLambertMaterial({ color: 0xFF0000 });

        // Scene that will host the points
        this.scene = new THREE.Scene();
        this.scene.name = 'scene_rezocassini';
        this.light = new THREE.PointLight(0xffffff, 1.0);
        this.scene.add(this.light);

        this.viewer.inputHandler.registerInteractiveScene(this.scene);

        viewer.addEventListener('update', this.update.bind(this));
        viewer.addEventListener('render.pass.perspective_overlay', this.render.bind(this));
    }

    // Called whenever user moves mouse while dragging something. Makes sphere follow pointcloud.
    // implemented as arrow function to keep "this" context
    drag = (e) => {
        const I = Potree.Utils.getMousePointCloudIntersection(
            e.drag.end,
            e.viewer.scene.getActiveCamera(),
            e.viewer,
            e.viewer.scene.pointclouds,
            { pickClipped: true }
        );

        if (I) this.s.position.copy(I.location);
    }

    // Called whenever some click event is triggered. Inserts a point on left click.
    // implemented as arrow function to keep "this" context
    insertionCallback = (e) => {
        if (e.button === THREE.MOUSE.LEFT) {
            this.insertPoint(this.s.position);
        }
    };

    // Inserts a point and an annotation with its corresponding index on the scene 
    insertPoint(position) {
        const point = new THREE.Mesh(this.pg, this.pm);
        point.position.copy(position);
        this.points.push(point);
        this.scene.add(point);

        const title = $(`<span>${this.points.length}</span>`);
        title.toString = () => this.points.length;
        const annotation = new Potree.Annotation({
            position: point.position,
            title
        });
        this.viewer.scene.annotations.add(annotation);

        this._subject.next({ type: 'point_inserted', point, source: this });

        if (this.points.length >= this.count)
            this.stopInsertion();
        else
            this.viewer.inputHandler.startDragging(this.s);
    }

    // Starts the process of dragging the example sphere
    startInsertion(args = 1) {
        this._subject.next({ type: 'start_insertion', source: this });

        this.count = args;
        this.inserting = true;

        this.scene.add(this.s);
        this.viewer.inputHandler.startDragging(this.s);

        // Add events to listen to. Those MUST be removed when process is over !
        this.s.addEventListener('drag', this.drag);
        this.domElement.addEventListener('mouseup', this.insertionCallback, false);
    }

    // Resumes insertion : makes sphere appear again, rebinds events, but does not set count
    resumeInsertion() {
        if (this.points.length >= this.count) {
            this.stopInsertion();
            return;
        }
        this.inserting = true;
        this._subject.next({ type: 'resume_insertion', source: this });

        this.scene.add(this.s);
        this.viewer.inputHandler.startDragging(this.s);

        // Add events to listen to. Those MUST be removed when process is over !
        this.s.addEventListener('drag', this.drag);
        this.domElement.addEventListener('mouseup', this.insertionCallback, false);
    }

    // Pauses insertion : sphere will disappear from scene, and events will be unbound.
    pauseInsertion() {
        this.scene.remove(this.s);

        this.inserting = true;

        this.s.removeEventListener('drag', this.drag);
        this.domElement.removeEventListener('mouseup', this.insertionCallback, false);

        this._subject.next({ type: 'pause_insertion', source: this });
    }

    // Stops insertion : sphere will disappear from scene, and events will be unbound.
    stopInsertion() {
        this.inserting = false;
        this.scene.remove(this.s);

        this.s.removeEventListener('drag', this.drag);
        this.domElement.removeEventListener('mouseup', this.insertionCallback, false);

        this._subject.next({ type: 'stop_insertion', source: this });
    }

    // Cancels last insertion : remove last user-placed point if available.
    cancelLastInsertion() {
        const point = this.points.pop();
        if (point) {
            const annotation = this.viewer.scene.annotations.flatten().find(a => a.position?.equals(point.position));
            if (annotation) this.viewer.scene.annotations.remove(annotation);
            this.scene.remove(point);
        }
        return point;
    }

    // Called whenever viewer updates the view (which is, every tick).
    // Makes points size scale with the distance of the camera to maintain a constant aspect ratio.
    update() {
        let camera = this.viewer.scene.getActiveCamera();
        let renderAreaSize = this.renderer.getSize(new THREE.Vector2());
        let clientWidth = renderAreaSize.width;
        let clientHeight = renderAreaSize.height;

        this.light.position.copy(camera.position);

        const meshesToKeepScaled = this.points.concat(this.s);

        for (let mesh of meshesToKeepScaled) {
            let distance = camera.position.distanceTo(mesh.getWorldPosition(new THREE.Vector3()));
            let pr = Potree.Utils.projectedRadius(1, camera, distance, clientWidth, clientHeight);
            let scale = 5 / pr;
            mesh.scale.set(scale, scale, scale);
        }
    }

    // Called whenever the viewer re-renders the view (which is, every tick).
    // Simply re-render the rezocassini scene in the viewer since it's been updated already.
    render() {
        this.renderer.render(this.scene, this.viewer.scene.getActiveCamera());
    }
}