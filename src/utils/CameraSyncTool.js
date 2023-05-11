import { EventDispatcher } from '../EventDispatcher.js';


export class CameraSyncTool extends EventDispatcher {
    constructor(viewer) {
        super();

        // Convenience
        this.viewer = viewer;
        this.renderer = viewer.renderer;
        this.domElement = this.viewer.renderer.domElement;

        // The viewer we wish to sync this one with
        this.viewerToSyncWith = null;

        // Function to be called on update when this viewer is synced
        this.boundUpdate = this.update.bind(this);

    }

    // Starts sync. All view movements will be copied.
    startSync(viewer) {
        this.viewerToSyncWith = viewer;
        this.viewer.addEventListener('update', this.boundUpdate);
    }

    // Stop sync. Control will be returned to the viewer.
    stopSync() {
        this.viewerToSyncWith = null;
        this.viewer.removeEventListener('update', this.boundUpdate);
    }
   
    // Called whenever viewer updates the view (which is, every tick).
    // Copies the view from another viewer.
    update() {
        if (!this.viewerToSyncWith) return;
        
        let position = this.viewer.scene.view.position;
        let positionToSyncWith = this.viewerToSyncWith.scene.view.position;
        position.copy(positionToSyncWith);
        this.viewer.scene.view.yaw = this.viewerToSyncWith.scene.view.yaw;
        this.viewer.scene.view.pitch = this.viewerToSyncWith.scene.view.pitch;
        this.viewer.scene.view.radius = this.viewerToSyncWith.scene.view.radius;
    }

    render() {}
}