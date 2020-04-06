"use strict"
import { applyRotation } from "../demo/rtkLoader.js";
import { removeLoadingScreen } from "../common/overlay.js";

export function loadTexturedCar(rtkTrajectory, pos, rot) {
    // CREATE VEHICLE OBJECT:
    // NOTE for Mustang: {texture: models/bodybkgd.JPG, mesh: models/1967-shelby-ford-mustang.obj}
    // NOTE for Volt: {texture: models/Chevy_Volt_Segmented/Chevrolet_Volt_v1_exterior.png, mesh: resources/models/Chevy_Volt_Segmented/Chevy_Volt_2016.obj}
    let manager = new THREE.LoadingManager();
    manager.onProgress = function (item, loaded, total) {
        console.log(item, loaded, total);
    };

    let textureLoader = new THREE.TextureLoader(manager);
    let texture = textureLoader.load(`${Potree.resourcePath}/models/Chevy_Volt_Segmented/reflection_1.png`);
    // let texture = textureLoader.load(`${Potree.resourcePath}/models/bodybkgd.JPG`);

    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    let geometry = new THREE.SphereGeometry(2, 32, 32);
    let material = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide, opacity: 0.92, transparent: true });
    let sphere = new THREE.Mesh(geometry, material);
    sphere.position.copy(new THREE.Vector3(...pos[0]));
    // viewer.scene.scene.add( sphere );

    // once texture is loaded, load the car object with the texture
    // car object loader callbacks
    let onError = function (xhr) { };
    let onProgress = function (xhr) {
        if (xhr.lengthComputable) {
            let percentComplete = xhr.loaded / xhr.total * 100;
        }
    };
    // wrapper to provide more args to callback
    let onLoad = function (object) {
        onLoadVehicleCallback(object, rtkTrajectory, texture, pos, rot);
    };

    let loader = new THREE.OBJLoader(manager);
    loader.load(`${Potree.resourcePath}/models/Chevy_Volt_Segmented/volt_reduce.obj`,
        onLoad, onProgress, onError);

}

// wrapped callback function to include varaibles in callback that are not in scope
// once textured car object is loaded and setup, it is stored in viewer.scene.scene with name "Vehicle"
function onLoadVehicleCallback(object, rtkTrajectory, texture, pos, rot) {
    // loader.load(`${Potree.resourcePath}/models/Chevy_Volt_Segmented/Chevy_Volt_2016.obj`,
    object.traverse(function (child) {
        if (child instanceof THREE.Mesh) {
            child.material.map = texture;
        }
    }); // end of loader.load for car object

    const vehicleGroup = new THREE.Group();
    vehicleGroup.name = "Vehicle";

    // render the path 
    let geometry = new THREE.Geometry();
    for (let ii = 0; ii < rtkTrajectory.numStates; ii++) {
        geometry.vertices[ii] = rtkTrajectory.states[ii].pose.clone();
    }
    let material = new THREE.LineBasicMaterial({ color: new THREE.Color(0x00ff00) });
    let t_init = window.timeframe.tstart;
    material.uniforms = { initialTime: { value: t_init } };
    // material.opacity = 0.0;
    // material.transparent = true;
    const closedPath = false;
    let line = new THREE.Line(geometry, material, { closed: closedPath });
    line.name = "RTK Trajectory";
    line.visible = false;
    viewer.scene.scene.add(line);
    viewer.scene.dispatchEvent({ "type": "vehicle_layer_added", "vehicleLayer": line });

    // Create Polar Grid Helper:
    const gridRadius = 100; // meters
    const gridSpacing = 5; // meters
    const scaleFactor = 1; // HACK for now because attached to vehicle mesh which is 1/100th scale
    const gridHelper = new THREE.GridHelper(scaleFactor * 2 * gridRadius, 2 * gridRadius / gridSpacing, 0x0000ff, 0x808080);
    gridHelper.name = "Cartesian Grid";
    gridHelper.rotateOnAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2);
    gridHelper.position.z -= 2;
    gridHelper.visible = false;
    viewer.scene.dispatchEvent({ "type": "vehicle_layer_added", "vehicleLayer": gridHelper });
    const polarGridHelper = new THREE.PolarGridHelper(scaleFactor * gridRadius, 16, gridRadius / gridSpacing, 64, 0x0000ff, 0x808080);
    polarGridHelper.name = "Polar Grid";
    polarGridHelper.rotateOnAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2);
    polarGridHelper.position.z -= 2;
    polarGridHelper.visible = false;
    viewer.scene.dispatchEvent({ "type": "vehicle_layer_added", "vehicleLayer": polarGridHelper });
    const axesHelper = new THREE.AxesHelper(scaleFactor * gridSpacing);
    axesHelper.name = "3D Axes";
    axesHelper.position.z -= 2;
    // axesHelper.rotateOnAxis(new THREE.Vector3(0,0,1), -Math.PI/2);
    axesHelper.visible = false;
    viewer.scene.dispatchEvent({ "type": "vehicle_layer_added", "vehicleLayer": axesHelper });
    
    // Add Polar Grid Helper
    vehicleGroup.add(gridHelper);
    vehicleGroup.add(polarGridHelper);
    vehicleGroup.add(axesHelper);

    // Apply RTK to Vehicle Mesh Extrinsics:
    object.name = "Vehicle Mesh";
    object.scale.multiplyScalar(.01);
    object.rotation.set(0 * Math.PI / 2, 0 * Math.PI / 2., 1 * Math.PI / 2.0); // Chevy Volt
    object.position.sub(new THREE.Vector3(0, 0, 2)); // Chevy Volt

    // Initialize Vehicle Group:
    vehicleGroup.position.set(...pos[0]);
    applyRotation(vehicleGroup, rot[0][0], rot[0][1], rot[0][2]);
    vehicleGroup.rotation.set(...rot[0]);
    vehicleGroup.rtkTrajectory = rtkTrajectory;
    vehicleGroup.add(object);

    // TODO New Camera Initialization:
    let box = new THREE.Box3().setFromObject(vehicleGroup);
    let node = new THREE.Object3D();
    node.boundingBox = box;
    viewer.zoomTo(node, 0.1, 500);
    // viewer.scene.view.lookAt(object.position);

    // viewer.scene.scene.add( object );
    viewer.scene.scene.add(vehicleGroup);
    viewer.scene.dispatchEvent({ "type": "vehicle_layer_added", "vehicleLayer": object });

    viewer.setFilterGPSTimeRange(0, 0); // Size 0 Time Window at start of timeline
    removeLoadingScreen();
}
