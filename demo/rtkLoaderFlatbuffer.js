import { getLoadingBar, getLoadingBarTotal, numberTasks, removeLoadingScreen, pause } from "../common/overlay.js";


export async function loadRtkFlatbuffer(s3, bucket, name, callback) {
  let loadingBar = getLoadingBar();
  let loadingBarTotal = getLoadingBarTotal(); 
  let lastLoaded = 0;
  if (s3 && bucket && name) {
    const objectName = `${name}/0_Preprocessed/rtk.fb`;
    const schemaFile = `${name}/5_Schemas/RTK_generated.js`;

    const schemaUrl = s3.getSignedUrl('getObject', {
      Bucket: bucket,
      Key: schemaFile
    });

    const request = await s3.getObject({Bucket: bucket,
                  Key: objectName},
                 async (err, data) => {
                   if (err) {
                     console.log(err, err.stack);
                     // have to increment progress bar since function that would isnt going to be called
                     loadingBarTotal.set(Math.min(Math.ceil(loadingBarTotal.value + (100/numberTasks))), 100);
                   } else {
                     // const string = new TextDecoder().decode(data.Body);
                     // const {mpos, orientations, t_init, t_range} = parseRTK(string);
                     const FlatbufferModule = await import(schemaUrl);
                     const {mpos, orientations, timestamps, t_init, t_range} = await parseRTK(data.Body, FlatbufferModule);
                     await callback(mpos, orientations, timestamps, t_init, t_range);
                   }});
    request.on("httpDownloadProgress", async (e) => {
      let val = (e.loaded/e.total); 
      val = Math.max(lastLoaded, val);
      loadingBar.set(val);
      lastLoaded = val;
      await pause();
    });

    request.on("complete", async () => {
      loadingBarTotal.set(Math.min(Math.ceil(loadingBarTotal.value + (100/numberTasks))), 100);
      loadingBar.set(0);
      if (loadingBarTotal.value >= 100) {
        removeLoadingScreen();
      }
      await pause();
    });

  } else {

    const filename = "../data/rtk.fb";
    const schemaFile = "../schemas/RTK_generated.js";
    let t0, t1;
    const tstart = performance.now();

    const xhr = new XMLHttpRequest();
    xhr.open("GET", filename);
    xhr.responseType = "arraybuffer";

    xhr.onprogress = function(event) {
      t1 = performance.now();
      t0 = t1;
    }

    xhr.onload = async function(data) {

      const FlatbufferModule = await import(schemaFile);

      let uint8Array = new Uint8Array(data.target.response);

      const {mpos, orientations, timestamps, t_init, t_range} = await parseRTK(uint8Array, FlatbufferModule);
      await callback(mpos, orientations, timestamps, t_init, t_range);
    };

    t0 = performance.now();
    xhr.send();
  }
}

async function parseRTK(bytesArray, FlatbufferModule) {
  let loadingBar = getLoadingBar();
  let loadingBarTotal = getLoadingBarTotal(); 
  const t0_loop = performance.now();

  let numBytes = bytesArray.length;
  let rtkPoses = [];
  let mpos = [];
  let timestamps = [];
  let orientations = [];
  let adjustedOrientations = [];
  let allAdjustedOrientationsAreZero = true;
  let t_init, t_range;
  let count = 0;

  let segOffset = 0;
  let segSize, viewSize, viewData;
  while (segOffset < numBytes) {
    loadingBar.set(segOffset/numBytes * 100); // update individual task progress
    // put in pause so running javascript can hand over temp control to the UI
    // gives it an opportunity to repaint the UI for the loading bar element
    await pause();

    // Read SegmentSize:
    viewSize = new DataView(bytesArray.buffer, segOffset, 4);
    segSize = viewSize.getUint32(0, true); // True: little-endian | False: big-endian

    // Get Flatbuffer RTK Pose Object:
    segOffset += 4;
    let buf = new Uint8Array(bytesArray.buffer.slice(segOffset, segOffset+segSize));
    let fbuffer = new flatbuffers.ByteBuffer(buf);
    let rtkPosesFB = FlatbufferModule.Flatbuffer.RTK.Poses.getRootAsPoses(fbuffer);

    // Extract RTK Pose Information:
    const epsilonSec = 0.01;
    for (let ii = 0, numPoses = rtkPosesFB.posesLength(); ii < numPoses; ii++) {
      let pose = rtkPosesFB.poses(ii);

      if (pose.timestamp() < epsilonSec) { // (!pose.isValid()) {
        continue;
      }

      if (count == 0)  {
        t_init = pose.timestamp();
      }
      t_range = pose.timestamp() - t_init;

      // Get UTM Position Data:
      if (pose.locXY) {
        mpos.push( [pose.locXY().x(), pose.locXY().y(), pose.pos().z()] );
      } else {
        mpos.push( [pose.utm().x(), pose.utm().y(), pose.utm().z()] );
      }

      // Get Orientation Data:
      if (pose.orientation) {
        orientations.push( [pose.orientation().z(), pose.orientation().y(), pose.orientation().x()] );
        window.usingAdjustedHeading = false;
      } else {
        orientations.push( [pose.roll(), pose.pitch(), pose.utm().yaw()] ); // TODO USE UTM-ADJUSTED ROLL/PITCH EVENTUALLY
        window.usingAdjustedHeading = true;
      }

      timestamps.push(pose.timestamp());

      count += 1;
    }

    if (!window.usingAdjustedHeading) {
      console.error("NOT USING ADJUSTED HEADING FOR RTK POSES");
    }

    // rtkPoses.push(pose);
    segOffset += segSize;
  }

  // update total progress
  loadingBarTotal.set(Math.min(Math.ceil(loadingBarTotal.value + (100/numberTasks))), 100);
  loadingBar.set(0);
  if (loadingBarTotal.value >= 100) {
    removeLoadingScreen();
  }
  await pause()
  return {mpos, orientations, timestamps, t_init, t_range};
}
