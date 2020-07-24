'use strict';

const numberOrZero = (string) => {
  const value = Number(string);
  return isNaN(value) ? 0 : value;
}

// sets up playbar in window
export function createPlaybar () {

    // Get HTML for Playbar:
    const playbarhtml = $("#playbarhtml");

    function updateTimeWindow(disable=false) {

      const lidarOffset = window.animationEngine.tstart;
      const lidarRange = window.animationEngine.timeRange;

      if (disable) {
        // NOTE: is there a better way of disabling the gps clip range filter?
        window.viewer.setFilterGPSTimeRange(lidarOffset-1, lidarOffset+lidarRange+1);
        $( "#playbar_tmin" ).prop( "disabled", true ); //Disable
        $( "#playbar_tmax" ).prop( "disabled", true ); //Disable

      } else {
        $( "#playbar_tmin" ).prop( "disabled", false ); //Enable
        $( "#playbar_tmax" ).prop( "disabled", false ); //Enable

        const sliderVal = $("#myRange").val() / 100.;
        const t = sliderVal * lidarRange + lidarOffset;
        $("#demo").html((t-lidarOffset).toFixed(4));

        const dtMin = numberOrZero(window.animationEngine.activeWindow.backward);
        const dtMax = numberOrZero(window.animationEngine.activeWindow.forward);
        window.viewer.setFilterGPSTimeRange(t + dtMin, t + dtMax);
      }
    }

    const tmin = document.getElementById('playbar_tmin');
    const tmax = document.getElementById('playbar_tmax');

    // Initialize DOM element values from initial activeWindow values
    tmin.value = window.animationEngine.activeWindow.backward;
    tmin.max = window.animationEngine.activeWindow.forward;
    tmin.step = window.animationEngine.activeWindow.step;
    tmax.value = window.animationEngine.activeWindow.forward;
    tmax.min = window.animationEngine.activeWindow.backward;
    tmax.step = window.animationEngine.activeWindow.step;

    tmin.addEventListener('input',
                          () => {
                            const min = numberOrZero(tmin.value);
                            window.animationEngine.activeWindow.backward = min;
                            tmax.min = min;
                            updateTimeWindow();
                            window.animationEngine.updateTimeForAll();
                          });

    tmax.addEventListener('input',
                          () => {
                            const max = numberOrZero(tmax.value);
                            window.animationEngine.activeWindow.forward = max;
                            tmin.max = max;
                            updateTimeWindow();
                            window.animationEngine.updateTimeForAll();
                          });

    function updateSlider(slideval) {
      playbarhtml.find("#myRange").val(slideval);
      updateTimeWindow();
    }

    // Make sure to call updateTimeWindow with disable false
    playbarhtml.find("#myRange").on('input', () => updateTimeWindow());

    playbarhtml.find("#myRange").on('wheel', function(e) {
      const slider = playbarhtml.find("#myRange");
      const slideval = numberOrZero(slider.val());

      const tmin = window.animationEngine.activeWindow.backward;
      const tmax = window.animationEngine.activeWindow.forward;

      const scalefactor = e.originalEvent.shiftKey ? 100 : 1;

      let lidarRange = 1;
      try {
       // lidarRange = window.viewer.scene.pointclouds[0].pcoGeometry.nodes.r.gpsTime.range;
        lidarRange = window.animationEngine.timeRange;
      } catch (e) {
      }
      const dt = Math.sign(e.originalEvent.deltaY) * (tmin - tmax) * scalefactor;
      const sliderange = Number(slider.attr("max")) - Number(slider.attr("min"));
      const stepY = sliderange*dt/lidarRange;

      updateSlider(slideval + stepY);
    });
    playbarhtml.find("#myRange").on("scroll", function(e) {
      console.log(e);
    });

    playbarhtml.find("#playbar_toggle").click(function() {
      updateTimeWindow(disable=this.checked);
    });
    playbarhtml.find("#playbar_toggle").trigger('click');

    playbarhtml.find("#playbutton").mousedown(function() {
      playbarhtml.find("#playbutton").hide();
      playbarhtml.find("#pausebutton").show();

    });

    playbarhtml.find("#pausebutton").mousedown(function() {
      playbarhtml.find("#playbutton").show();
      playbarhtml.find("#pausebutton").hide();

    });

    playbarhtml.find("#toggle_calibration_panels").mouseup(function() {

      // Find Calibration Panels:
      let panels = $(".draggable-overlay");
      for(let ii=0, len=panels.length; ii<len; ii++) {

        let panel = panels[ii];

        // Check is visible and toggle:
        if (panel.style.display == "none" || panel.style.display == "") {
          panel.style.display = "block";
        } else {
          panel.style.display = "none"
        }

      }

    });

    playbarhtml.find("#download_lanes_button").click(function() {

      function download(text, filename) {

        let blob = new Blob([text], {
          type: "data:text/plain;charset=utf-8"
        })

        let fileUrl = URL.createObjectURL(blob)

        var element = document.createElement('a');
        element.setAttribute('href', fileUrl)
        element.setAttribute('download', filename);

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
      }

      // Download Left Lane Vertices:
      try {
        const laneLeftSegments = window.viewer.scene.scene.getChildByName("Left Lane Segments");
        if (laneLeftSegments == undefined) {
          const laneLeft = window.viewer.scene.scene.getChildByName("Lane Left");
          download(JSON.stringify(laneLeft.points, null, 2), "lane-left.json");
        } else {
          download(JSON.stringify(laneLeftSegments.getFinalPoints(), null, 2), "lane-left.json");
        }

      } catch (e) {
        console.error("Couldn't download left lane vertices: ", e);
      }

      // Download Lane Spine Vertices:
      try {
        const laneSpine = window.viewer.scene.scene.getChildByName("Lane Spine");
        download(JSON.stringify(laneSpine.points, null, 2), "lane-spine.json", "text/plain");
      } catch (e) {
        console.error("Couldn't download lane spine vertices: ", e);
      }

      // Download Right Lane Vertices:
      try {
        const laneRightSegments = window.viewer.scene.scene.getChildByName("Right Lane Segments");
        if (laneRightSegments == undefined) {
          const laneRight = window.viewer.scene.scene.getChildByName("Lane Right");
          download(JSON.stringify(laneRight.points, null, 2), "lane-right.json", "text/plain");
        } else {
          download(JSON.stringify(laneRightSegments.getFinalPoints(), null, 2), "lane-right.json", "text/plain");
        }
      } catch (e) {
        console.error("Couldn't download right lane vertices: ", e);
      }




    });

    window.addEventListener("message", e => {
     if (e.data === 'pause') {
       window.animationEngine.stop()
     }
    });

    playbarhtml.find("#toggle_hideshow").click(function() {
      for (let cloud of window.viewer.scene.pointclouds) {
        cloud.material.uniforms.uExtrinsicsMode.value = !cloud.material.uniforms.uExtrinsicsMode.value;
      }
    });

    $(document).tooltip();

    // Configure Playbar Appearance:
    // document.getElementById("playbar_tmin").style.display = "none";
    // document.getElementById("playbar_tmax").style.display = "none";
    // document.getElementById("elevation_max").style.display = "none";
    // document.getElementById("elevation_min").style.display = "none";
    document.getElementById("playback_speed").style.display = "none";
    document.getElementById("toggleslider").style.display = "none";
    // document.getElementById("toggle_calibration_panels").style.display = "none";
    document.getElementById("load_detections_button").style.display = "none";
    document.getElementById("load_gaps_button").style.display = "none";
    document.getElementById("download_lanes_button").style.display = "none";

	// originall from radar.html
	document.getElementById("playbar_tmax").disabled = false;
	document.getElementById("playbar_tmin").disabled = false;
	document.getElementById("elevation_max").display = false;
	document.getElementById("elevation_min").disabled = false;

	window.truthAnnotationMode = 0;	// 0: None, 1: Delete, 2: Add
	let annotationScreen = $(`<div id="annotationScreen"><p id="annotation-label">ANNOTATION MODE: <b id="annotation-mode-text"></b></p></div>`);
	$('body').prepend(annotationScreen);
	let div = document.getElementById("annotationScreen");
	div.style.opacity=0;

	// event listeners
	window.addEventListener('keydown', (e) => {
		if (window.annotateLanesModeActive) {
			if (e.code == "KeyA") {
				window.truthAnnotationMode = 2;
			} else if (e.code == "KeyS") {
				window.truthAnnotationMode = 1;
			} else if (e.shiftKey) {
				window.truthAnnotationMode = (window.truthAnnotationMode + 1) % 3;
			}

			let div = document.getElementById("annotationScreen");
			let label = document.getElementById("annotation-mode-text");
			if (window.truthAnnotationMode == 0) {
				div.style.background = "black";
				div.style.opacity=0;
				label.innerHTML = "NONE";
			}
			else if (window.truthAnnotationMode == 1) {
				div.style.background = "red";
				div.style.opacity=0.25;
				label.innerHTML = "DELETE POINTS";
			} else if (window.truthAnnotationMode == 2) {
				div.style.background = "green";
				div.style.opacity=0.25;
				label.innerHTML = "ADD POINTS";
			}
		}
	});

	window.addEventListener("keyup", (e) => {
		if (window.annotateLanesModeActive) {
			window.truthAnnotationMode = 0;
			let div = document.getElementById("annotationScreen");
			let label = document.getElementById("annotation-mode-text");
			div.style.background = "black";
			div.style.opacity=0;
			label.innerHTML = "NONE";
		}
	});
  addPlaybarListeners();
}


// adds event listeners to animate the viewer and playbar's slider and play/pause button
function addPlaybarListeners() {
    // create Animation Path & make light follow it
    // ANIMATION + SLIDER LOGIC:
    let slider = document.getElementById("myRange");
    let time_display = document.getElementById("time_display");
    let tmin = document.getElementById("playbar_tmin");
    let tmax = document.getElementById("playbar_tmax");
    let zmin = document.getElementById("elevation_min");
    let zmax = document.getElementById("elevation_max");
    let animationEngine = window.animationEngine;
    let toggleplay = document.getElementById("toggleplay");
    time_display.value = numberOrZero(slider.value).toFixed(3);

    // Playbar Button Functions:
    let playbutton = document.getElementById("playbutton");
    let pausebutton = document.getElementById("pausebutton");
    pausebutton.addEventListener("mousedown", () => {
        animationEngine.stop();
    });
    playbutton.addEventListener("mousedown", () => {
        animationEngine.start();
    });

	// Pre-Start/Stop Callbacks
	animationEngine.preStartCallback = function () {
		if (!animationEngine.isPlaying) {
			$("#playbutton").trigger("mousedown");
		}
	}

	animationEngine.preStopCallback = function () {
		if (animationEngine.isPlaying) {
			$("#pausebutton").trigger("mousedown");
		}
	}

	// Playbar:
    animationEngine.tweenTargets.push((gpsTime, updateDisplayedTime) => {
	  let t = (gpsTime - animationEngine.tstart) / (animationEngine.timeRange);
	  slider.value = 100*t;

          // If this change came from typing, don't rewrite it.
          if (updateDisplayedTime) {
            time_display.value = (gpsTime - animationEngine.tstart).toFixed(3) ; // Centered to zero
          }
    });

	// Camera:
	// let updateCamera = false;
	// let lag = 1.01; // seconds
	// let camPointZOffset = 10; // meters
	// window.camControlInitialized = false;
	// window.camPointNeedsToBeComputed = true;
	// window.camControlInUse = false;
	// window.camDeltaTransform = {camStart: new THREE.Matrix4(), vehicleStart: new THREE.Vector3(), camEnd: new THREE.Matrix4(), vehicleEnd: new THREE.Vector3()};
	// window.camPointLocalFrame = {position: new THREE.Vector3(-10,0,10)};
	// window.camTargetLocalFrame = {position: new THREE.Vector3(0, 0, 0)};
	viewer.renderArea.addEventListener("keypress", (e) => {
		if (e.key == "r") {
			let box = new THREE.Box3().setFromObject(viewer.scene.scene.getObjectByName("Vehicle").getObjectByName("Vehicle Mesh"));
			let node = new THREE.Object3D();
			node.boundingBox = box;
			viewer.zoomTo(node, 5, 500);
		}
	});

    time_display.addEventListener('input',
                                  e => {
                                    animationEngine.stop();
                                    const time = numberOrZero(time_display.value);
                                    const clipped = Math.min(Math.max(0, time), animationEngine.timeRange - .001);
                                    animationEngine.timeline.t = clipped + animationEngine.tstart;
                                    animationEngine.updateTimeForAll();
                                  });

    slider.addEventListener("input", () => {
        animationEngine.stop();
        var val = slider.value / 100.0;
        animationEngine.timeline.t = val * animationEngine.timeRange + animationEngine.tstart;
        animationEngine.updateTimeForAll(true);
    });

    slider.addEventListener("wheel", () => {
        animationEngine.stop();
        var val = slider.value / 100.0;
        animationEngine.timeline.t = val * animationEngine.timeRange + animationEngine.tstart;
        animationEngine.updateTimeForAll(true);
    });

    // Initialize DOM element values from initial elevationWindow values
    zmin.value = window.animationEngine.elevationWindow.min;
    zmin.max = window.animationEngine.elevationWindow.max;
    zmin.step = window.animationEngine.elevationWindow.step;
    zmax.value = window.animationEngine.elevationWindow.max;
    zmax.min = window.animationEngine.elevationWindow.min;
    zmax.step = window.animationEngine.elevationWindow.step;

    zmin.addEventListener("input", () => {
      const min = numberOrZero(zmin.value);
      window.animationEngine.elevationWindow.min = min;
      window.animationEngine.elevationWindow.max = numberOrZero(zmax.value);
      zmax.min = min;
      animationEngine.updateTimeForAll();
    });

    zmax.addEventListener("input", () => {
      const max = numberOrZero(zmax.value);
      window.animationEngine.elevationWindow.min = numberOrZero(zmin.value);
      window.animationEngine.elevationWindow.max = max;
      zmin.max = max;
      animationEngine.updateTimeForAll();
    });

	// PointCloud:
	animationEngine.tweenTargets.push((gpsTime) => {
		// debugger; // account for pointcloud offset
                const {backward, forward} = animationEngine.activeWindow;
                const timeMin = numberOrZero(backward);
                const timeMax = numberOrZero(forward);
		viewer.setFilterGPSTimeRange(gpsTime + timeMin, gpsTime + timeMax);
		viewer.setFilterGPSTimeExtent(gpsTime + 2.5 * timeMin, gpsTime + 2.5 * timeMax);
	});
}


function updateLane () {
  // create lanes flatbuffer
  const lane = {
    id: 0,
    timestamp: [],
    left: [],
    right: [],
    laneTypeLeft: [],
    laneTypeRight: [],
    leftPointValidity: [],
    rightPointValidity: [],
    leftPointAnnotationStatus: [],
    rightPointAnnotationStatus: []
  }

  // Left Lane Vertices:
  const laneLeftSegments = window.viewer.scene.scene.getChildByName("Left Lane Segments");
  if (laneLeftSegments === undefined) {
    const laneLeft = window.viewer.scene.scene.getChildByName("Lane Left");
    lane.left = laneLeft.points; // download(JSON.stringify(laneLeft.points, null, 2), "lane-left.json");
  } else {
    lane.left = laneLeftSegments.getFinalPoints(); // download(JSON.stringify(laneLeftSegments.getFinalPoints(), null, 2), "lane-left.json");
  }

  // Right Lane Vertices:
  const laneRightSegments = window.viewer.scene.scene.getChildByName("Right Lane Segments");
  if (laneRightSegments === undefined) {
    const laneRight = window.viewer.scene.scene.getChildByName("Lane Right");
    lane.right = laneRight.points; // download(JSON.stringify(laneRight.points, null, 2), "lane-right.json", "text/plain");
  } else {
    lane.right = laneRightSegments.getFinalPoints(); // download(JSON.stringify(laneRightSegments.getFinalPoints(), null, 2), "lane-right.json", "text/plain");
  }

  // Get New Spine Vertices
  lane.spine = updateSpine(lane.left, lane.right);
  // Update Lane attributes to be valid
  updateLaneHelper(lane);

  const bytes = createLanesFlatbuffer([lane]);

  writeFileToS3(s3, bucket, name, "2_Truth", "upload-testing-lanes.fb", bytes);
}

export async function writeFileToS3 (s3, bucket, name, subdirectory, filename, buffer) {
  try {
    const request = s3.putObject({
      Bucket: bucket,
      Key: `${name}/${subdirectory}/${filename}`,
      Body: buffer
    });
    request.on("httpUploadProgress", async (e) => {
      await updateLoadingBar(e.loaded / e.total * 100)
    });
    await request.promise();
    incrementLoadingBarTotal("lanes uploaded")
  } catch (e) {
    console.error("Error: could not write file to S3: ", e);
  }
}

function updateLaneHelper (lane) {
  const spineLength = lane.spine.length;
  const leftLength = lane.left.length;
  const rightLength = lane.right.length;
  lane.timestamp = Array.from({length: spineLength}).map(x => 0.0)
  lane.leftPointValidity = Array.from({length: leftLength}).map(x => Flatbuffer.GroundTruth.PointValidity(0));
  lane.rightPointValidity = Array.from({length: rightLength}).map(x => Flatbuffer.GroundTruth.PointValidity(0));
  lane.leftPointAnnotationStatus = Array.from({ length: leftLength }).map(x => Flatbuffer.GroundTruth.PointAnnotationStatus(0));
  lane.rightPointAnnotationStatus = Array.from({ length: rightLength }).map(x => Flatbuffer.GroundTruth.PointAnnotationStatus(0));
}

export function createLanesFlatbuffer (input) {
  const lanesArray = []
  const builder = new flatbuffers.flatbuffers.Builder(0);
  // create each lane and push to lanesArray
  for (const lane of input.all) {
    Flatbuffer.GroundTruth.Lane.startLane(builder);
    Flatbuffer.GroundTruth.Lane.addId(builder, lane.id);
    Flatbuffer.GroundTruth.Lane.addTimestamp(builder, lane.timestamp);
    Flatbuffer.GroundTruth.Lane.addLeft(builder, lane.left);
    Flatbuffer.GroundTruth.Lane.addRight(builder, lane.right);
    Flatbuffer.GroundTruth.Lane.addlaneTypeLeft(builder, lane.laneTypeLeft);
    Flatbuffer.GroundTruth.Lane.addLaneTypeRight(builder, lane.laneTypeRight);
    Flatbuffer.GroundTruth.Lane.addLeftPointValidity(builder, lane.leftPointValidity);
    Flatbuffer.GroundTruth.Lane.addRightPointValidity(builder, lane.rightPointValidity);
    Flatbuffer.GroundTruth.Lane.addLeftPointAnnotationStatus(builder, lane.leftPointAnnotationStatus);
    Flatbuffer.GroundTruth.Lane.addRightPointAnnotationStatus(builder, lane.rightPointAnnotationStatus);
    const newLane = Flatbuffer.GroundTruth.Lane.endLane(builder);
    lanesArray.push(newLane)
  }
  const lanes = Flatbuffer.GroundTruth.Lanes.createLanesVector(builder, lanesArray);
  Flatbuffer.GroundTruth.Lanes.finishLanesBuffer(builder, lanes);
  const bytes = builder.asUint8Array();
  const lenBytes = new Uint8Array(4);
  const dv = new DataView(lenBytes.buffer);
  dv.setUint32(0, bytes.length, true);

  const outbytes = new Int8Array(lenBytes.length + bytes.length);
  outbytes.set(lenBytes);
  outbytes.set(bytes, lenBytes.length);
  return outbytes;
}


function getXYZ(data) {
    x = data['position']['x'];
    y = data['position']['y'];
    z = data['position']['z'];
    return [x, y, z];
}

function getHeading(pt1, pt2) {
    p1 = np.array(pt1).transpose()
    p2 = np.array(pt2).transpose()
    delta = p2-p1;
    heading = Math.atan2(delta[1], delta[0]);
    return heading;
}

function minAngle(theta, bounds=[-Math.pi, Math.pi]) {
    while (theta < bounds[0]) {
        theta += 2 * Math.pi
    }
    while (theta > bounds[1]) {
        theta -= 2 * Math.pi
    }
    return theta;
}

function minAngleDiff(theta1, theta2, bounds=[-np.pi, np.pi]) {
    delta = theta2 - theta1;
    return minAngle(delta);
}

function normalizeVector(vector) {
    vector = Array(vector);
    return vector / math.norm(vector)
}


function find_plane_line_intersection(plane_pt, plane_normal, line_pt, line_direction) {
    plane_normal = normalizeVector(plane_normal);
    line_direction = normalizeVector(line_direction);

    alpha = math.dot(plane_normal, plane_pt) - math.dot(plane_normal, line_pt) / math.dot(plane_normal, line_direction)
    return line_pt + alpha * line_direction;
}


function updateSpine (laneLefts, laneRights) {
    laneChangeNNRange = 5 // meters
    rightLaneNeighborPointsQueryNumber = 10 // number of neighbors
    laneChangeHeadingThresh = np.pi/4 // Radians
    prevPointSuppressionRadius = .1 // meters
    // Compute Spine Vertices (using left lane as reference):
    // PROBLEM: No shapely libary in JS need to find alternative as we need interpolation and projection functions below
    rightLine = LineString(laneRights) // Create shapely linestring for right line
    // PROBLEM no built in libraries for this one either. Can build tree structure on our own though
    kdtree = cKDTree(laneRights) // Create KD-Tree for right lane points as well
    lastIdx = len(laneLefts)-1
    for (let ii = 0; ii < lastIdx+1; ii++) {
        p = laneLefts[ii];
        pt = Point(p);
        projPt = rightLine.interpolate(rightLine.project(pt));
        minLine = LineString([pt, projPt]) // Shortest line from pt to right line
        spinePt = minLine.interpolate(minLine.length / 2)

        if (ii !== 0 && ii !== lastIdx) {
            lastPt = Point(laneLefts[ii-1]);
            nextPt = Point(laneLefts[ii+1]);
            lastHeading = getHeading(lastPt, pt);
            nextHeading = getHeading(pt, nextPt);

            leftHeadingDelta = minAngleDiff(lastHeading, nextHeading);

            if (Math.abs(leftHeadingDelta) > laneChangeHeadingThresh) {

                // Get idxs of nearby right points
                dists_nn, idxs_nn = kdtree.query(p, rightLaneNeighborPointsQueryNumber)

                filterer = dists_nn <= laneChangeNNRange;
                dists_nn = dists_nn[filterer];
                idxs_nn = idxs_nn[filterer];

                if (idxs_nn.length === 0) { continue }

                idxs_nn_min = Math.max(idxs_nn.min()-1, 0)
                idxs_nn_max = Math.min(idxs_nn.max()+2, laneRights.length)

                idxs_nn = np.arange(idxs_nn_min, idxs_nn_max) // Closed set of points approximately within laneChangeNNRange of pt

                if (idxs_nn.length < 3) {
                    console.log(`Not Enough Neighbors for pt: [idx: ${ii}, pos: ${p}]`);
                    continue
                }
                // Find closest lane change point in right line:
                rightPts = Array(laneRights)[idxs_nn]
                rightPtDeltas = np.diff(rightPts, axis=0)
                rightHeadings = Math.atan2(rightPtDeltas[:,1], rightPtDeltas[:,0])
                rightHeadingDeltas = Array([minAngle(x) for x in np.diff(rightHeadings)])


                if (rightHeadingDeltas.shape[0] == 0) {
                    console.log(`No RightHeadingDeltas for pt: [idx: ${ii}, pos: ${p}]`);
                    continue
                }
                leftRightHeadingDeltaSimilarity = Math.abs(rightHeadingDeltas-leftHeadingDelta)
                bestRightHeadingIdx = leftRightHeadingDeltaSimilarity.argmin() + 1
                rightPtIdx = idxs_nn[bestRightHeadingIdx] // +1 inside []

                // Simple Solution (Just Compute Spine Point using the Right Lane Change Point and append):
                rightPt = Point(laneRights[rightPtIdx])
                minLine = LineString([pt, rightPt])
                spinePt2 = minLine.interpolate(minLine.length / 2)

                p1 = Array(laneSpines[-1].slice(2)])
                p2 = Array(spinePt2.xy).flatten()

                if (math.norm((p2-p1)) > prevPointSuppressionRadius) { // If spine point is farther than thresh from previous point append
                    laneSpines.push([spinePt2.x, spinePt2.y, spinePt2.z])
                }
            }
        }
        // Don't append lane spine if duplicate (within 10cm of last) or if going backwards:
        function should_append(spinePt) {

            if (laneSpines.length < 1) {
                return true;
            }

            // TODO double check with original
            p1 = Array(laneSpines[-1]).slice(2);
            p2 = Array(spinePt.xy).flatten()

            if (np.linalg.norm(p2-p1) < prevPointSuppressionRadius) {
                console.log("Skipping lane spine point-- too close to existing spine point");
                return false;
            } else {
                if (laneSpines.length >=2) {
                    p0 = Array(laneSpines[-2]).slice(2);

                    v1 = (p1-p0).slice(2);
                    v2 = (p2-p1).slice(2);

                    magV1 = math.norm(v1)
                    magV2 = math.norm(v2)

                    cosHeading = math.dot(v1, v2)/(magV1 * magV2)

                    if (Math.abs(cosHeading - (-1)) < .1) {
                        console.log("Skipping lane spine point -- going backwards");
                        return false;
                    } else {
                        return true;
                    }
                } else {
                    return true;
                }
            }
        } //end function should_append

        if (should_append(spinePt)) {
            laneSpines.push([spinePt.x, spinePt.y, spinePt.z])
        }
    }
    // laneSpines = Array(laneSpines[laneSpines.length])
    return laneSpines
}
