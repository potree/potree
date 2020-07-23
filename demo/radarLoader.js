'use strict';
import { getShaderMaterial, s3, bucket, name } from "../demo/paramLoader.js"
import { updateLoadingBar, incrementLoadingBarTotal, resetProgressBars} from "../common/overlay.js";
import { getFileInfo } from "./loaderUtilities.js";

function isNan(n) {
  return n !== n;
}

// sets local variable and returns so # files can be counted
let radarFiles = null;
export const radarDownloads = async (datasetFiles) => {
  radarFiles = await getFileInfo(datasetFiles,
                                 "radardata.csv",
                                 "csv/radar_tracks_demo.csv");
  return radarFiles;
}

/**
 * @returns {Promise<{geometry, t_init, boxBufferGeometries} | null>} Resolves to null if error
 */
async function loadRadar(s3, bucket, name) {
  const tstart = performance.now();
  let radarData = null // null == error
  if (!radarFiles) {
    console.log("No radar files present")
    return radarData
  } else {
    // prepare for progress tracking (currently only triggered on button click)
    resetProgressBars(2) // have to download & process/load radar
  }

  if (s3 && bucket && name) {
    const request = s3.getObject({Bucket: bucket,
                  Key: radarFiles.objectName},
                  async (err, data) => {
                    if (err) {
                      console.log(err, err.stack);
                    } else {
                      const string = new TextDecoder().decode(data.Body);
                      radarData = await parseRadar(string); // returns {geometry, t_init, boxBufferGeometries}
                    }
                    incrementLoadingBarTotal()
                    return radarData
                  });
    request.on("httpDownloadProgress", async (e) => {
      await updateLoadingBar(e.loaded/e.total * 100)
    });

    request.on("complete", () => {
      incrementLoadingBarTotal()
    });
  } else {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", radarFiles.objectName);
    xhr.onprogress = async (e) => {
      await updateLoadingBar(e.loaded/e.total*100)
    }
    xhr.onload = async (data) => {
      incrementLoadingBarTotal()
      const radarResult = await parseRadar(data.target.response);
      incrementLoadingBarTotal()
      return radarResult
    };
    xhr.send();
  }
}
async function parseRadar(radarString) {
	const t0_loop = performance.now();
    const rows = radarString.split('\n');

  	const tcol = 3;
  	const xcol = 27;
  	const ycol = 28;
  	const zcol = 29;

    var boxGeometries = new THREE.Geometry(); // TODO REMOVE
    var boxPositions = []; // TODO REMOVE

    var geometry = new THREE.BufferGeometry();
    let positions = [];
    let timestamps = [];
    let colors = [];
    let alphas = [];

    let row, cols;
    let t_init = 0;
    let firstTimestamp = true;
    for (let ii = 0, len = rows.length; ii < len-1; ++ii) {
      await updateLoadingBar(ii/len*100)
      row = rows[ii];
      cols = row.split(',');

      if (cols.length > 0) {
        const t = parseFloat(cols[tcol]);
        const x = parseFloat(cols[xcol]);
        const y = parseFloat(cols[ycol]);
        const z = parseFloat(cols[zcol]);


        if (isNan(t) || isNan(x) || isNan(y) || isNan(z)) {
          // skip
          continue;
        }


        if (firstTimestamp) {
          t_init = t;
          firstTimestamp = false;
        }

        // timestamps.push(t);
        timestamps.push(t-t_init);
        positions.push(x);
        positions.push(y);
        positions.push(z);
        colors.push( Math.random() * 0xffffff );
        colors.push( Math.random() * 0xffffff );
        colors.push( Math.random() * 0xffffff );
        alphas.push( 1.0 );

        let boxSize = 0.15; // TODO REMOVE
        let boxGeometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize); // TODO REMOVE
        boxGeometry.translate(x, y, z); // TODO REMOVE
        boxGeometries.merge(boxGeometry); // TODO REMOVE
        boxPositions.push( new THREE.Vector3(x, y, z) );  // TODO REMOVE
      }
    }
    // debugger; // timestamp


    if ( positions.length > 0 ) geometry.addAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
    if (timestamps.length > 0) geometry.addAttribute('gpsTime', new THREE.Float32BufferAttribute(timestamps, 1));
    if (colors.length > 0) geometry.addAttribute('color', new THREE.Uint8BufferAttribute(colors, 3));
    if (alphas.length > 0) geometry.addAttribute('alpha', new THREE.Float32BufferAttribute(alphas, 1));

    // callback(geometry, t_init);
    let boxBufferGeometries = new THREE.BufferGeometry().fromGeometry(boxGeometries);
    return {geometry, t_init, boxBufferGeometries}; // TODO REMOVE
  };


export function addLoadRadarButton() {
	window.radarLoaded = false;
	// Configure Playbar
	$("#load_radar_button")[0].style.display = "block"
	let loadRadarButton = $("#load_radar_button")[0];
	loadRadarButton.addEventListener("mousedown", async () => {
		if (!window.radarLoaded) {
			const radarData = await loadRadar(s3, bucket, name)
			if (radarData != null) {
				const {geometry, t_init, boxBufferGeometries} = radarData
				let boxMesh = new THREE.Mesh(boxBufferGeometries, new THREE.MeshBasicMaterial({ color: 0xffff00 }));
				boxMesh.name = "radar_boxes";
				// viewer.scene.scene.add(boxMesh);


				// uniforms
				let uniforms = {
					color: { value: new THREE.Color(0xffff00) },
					minGpsTime: { value: 0.0 },
					maxGpsTime: { value: 110.0 },
					initialTime: { value: t_init }
				};

				// point cloud material
				let shaderMaterial = getShaderMaterial()
				var material = new THREE.PointsMaterial({ size: 1.0 });
				var mesh = new THREE.Points(geometry, shaderMaterial);
				mesh.name = "radar";
				// debugger; //radar tracks added?
				viewer.scene.scene.add(mesh);
				viewer.scene.dispatchEvent({ "type": "sensor_layer_added", "sensorLayer": mesh });


				// Create tween:
				{
					animationEngine.tweenTargets.push((t) => {
						// debugger;
						let minGpsTime = t + animationEngine.activeWindow.backward;
						let maxGpsTime = t + animationEngine.activeWindow.forward;
						let radarOffset = t_init;
						let minRadarTime = minGpsTime - radarOffset;
						let maxRadarTime = maxGpsTime - radarOffset;
						let radar = viewer.scene.scene.getObjectByName("radar")
						radar.material.uniforms.minGpsTime.value = minRadarTime;
						radar.material.uniforms.maxGpsTime.value = maxRadarTime;
					});
				}
			}
		}

		// either way update page & btns
		window.radarLoaded = true;
		loadRadarButton.disabled = true;
	});
} // end of add radar button


// // Load Radar Cubes:
// loadRadar((geometry, t_init) => {
	//
//   // uniforms
//   uniforms = {
//       color: { value: new THREE.Color( 0xffff00 ) },
//       minGpsTime: {value: 0.0 },
//       maxGpsTime: {value: 110.0 },
//       initialTime: {value: t_init}
//   };
	//
//   // point cloud material
//   var shaderMaterial = new THREE.ShaderMaterial( {
	//
//       uniforms:       uniforms,
//       vertexShader:   document.getElementById( 'vertexshader' ).textContent,
//       fragmentShader: document.getElementById( 'fragmentshader' ).textContent,
//       transparent:    true
	//
//   });
	//
//   var material = new THREE.PointsMaterial( {size:1.0} );
//   var mesh = new THREE.Points(geometry, shaderMaterial);
//   mesh.name = "radar";
//   // debugger; //radar tracks added?
//   viewer.scene.scene.add(mesh);
// });
