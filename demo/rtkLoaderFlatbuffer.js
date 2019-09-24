import { getLoadingBar } from "../common/overlay.js";


export async function loadRtkFlatbuffer(s3, bucket, name, callback) {
  let lastLoaded = 0;
  if (s3 && bucket && name) {
    const objectName = `${name}/0_Preprocessed/rtk.fb`;
    const schemaFile = `${name}/5_Schemas/RTK_generated.js`;

    const schemaUrl = s3.getSignedUrl('getObject', {
      Bucket: bucket,
      Key: schemaFile
    });

    const request = s3.getObject({Bucket: bucket,
                  Key: objectName},
                 async (err, data) => {
                   if (err) {
                     console.log(err, err.stack);
                   } else {
                     // const string = new TextDecoder().decode(data.Body);
                     // const {mpos, orientations, t_init, t_range} = parseRTK(string);
                     const FlatbufferModule = await import(schemaUrl);
                     const {mpos, orientations, timestamps, t_init, t_range} = parseRTK(data.Body, FlatbufferModule);
                     callback(mpos, orientations, timestamps, t_init, t_range);
                   }});
    request.on("httpDownloadProgress", (e) => {
      let loadingBar = getLoadingBar();
      let val = 100*(e.loaded/e.total);
      val = Math.max(lastLoaded, val);
      loadingBar.set(val);
      lastLoaded = val;
    });

  } else {
    const filename = "../data/rtk.fb";
    let t0, t1;
    const tstart = performance.now();

    const xhr = new XMLHttpRequest();
    xhr.open("GET", filename);
    xhr.responsetype = "arraybuffer";

    xhr.onprogress = function(event) {
      t1 = performance.now();
      t0 = t1;
    }

    xhr.onload = function(data) {
      const {mpos, orientations, timestamps, t_init, t_range} = parseRTK(new Uint8Array(data.target.response));
      callback(mpos, orientations, timestamps, t_init, t_range);
    };

    t0 = performance.now();
    xhr.send();
  }
}

function parseRTK(bytesArray, FlatbufferModule) {
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

    // Read SegmentSize:
    viewSize = new DataView(bytesArray.buffer, segOffset, 4);
    segSize = viewSize.getUint32(0, true); // True: little-endian | False: big-endian

    // Get Flatbuffer RTK Pose Object:
    segOffset += 4;
    let buf = new Uint8Array(bytesArray.buffer.slice(segOffset, segOffset+segSize));
    let fbuffer = new flatbuffers.ByteBuffer(buf);
    let rtkPosesFB = FlatbufferModule.Flatbuffer.RTK.Poses.getRootAsPoses(fbuffer);

    // Extract RTK Pose Information:
    debugger; // poses.pose below
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

      mpos.push( [pose.locXY().x(), pose.locXY().y(), pose.pos().z()] );
      orientations.push( [pose.orientation().x(), pose.orientation().y(), pose.orientation().z()] );
      timestamps.push(pose.timestamp());

      if(typeof pose.adjustedUTMOrientation === 'function') {
        adjustedOrientations.push( [pose.adjustedUTMOrientation.x(), pose.orientation.y(), pose.orientation.z()] );
        // adjustedOrientations.push( [pose.adjustedUTMOrientation.x(), pose.adjustedUTMOrientation.y(), pose.adjustedUTMOrientation.z()] );
        allAdjustedOrientationsAreZero = allAdjustedOrientationsAreZero && adjustedUTMOrientations[ii][0]; // == 0 && adjustedUTMOrientation[ii][1] == 0 && adjustedUTMOrientations[ii][2] == 0;
      }

      count += 1;
    }

    // rtkPoses.push(pose);
    segOffset += segSize;
  }

  if (!allAdjustedOrientationsAreZero) {
    orientations = adjustedOrientations;
  }

  return {mpos, orientations, timestamps, t_init, t_range};
}
