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

    var iso_8859_15_table = { 338: 188, 339: 189, 352: 166, 353: 168, 376: 190, 381: 180, 382: 184, 8364: 164 }

    function iso_8859_15_to_uint8array(iso_8859_15_str) {
        let buf = new ArrayBuffer(iso_8859_15_str.length);
        let bufView = new Uint8Array(buf);
        for (let i = 0, strLen = iso_8859_15_str.length; i < strLen; i++) {
            let octet = iso_8859_15_str.charCodeAt(i);
            if (iso_8859_15_table.hasOwnProperty(octet))
                octet = iso_8859_15_table[octet]
            bufView[i] = octet;
            if(octet < 0 || 255 < octet)
                console.error(`invalid data error`)
        }
        return bufView
    }


    const filename = "../data/rtk.fb";
    const schemaFile = "../schemas/RTK_generated.js";
    let t0, t1;
    const tstart = performance.now();

    const xhr = new XMLHttpRequest();
    xhr.overrideMimeType('text/plain; charset=ISO-8859-15');
    xhr.open("GET", filename);
    // xhr.responsetype = "blob";

    xhr.onprogress = function(event) {
      t1 = performance.now();
      t0 = t1;
    }

    xhr.onload = async function(data) {
      
      const FlatbufferModule = await import(schemaFile);

      let uint8Array = iso_8859_15_to_uint8array(data.target.responseText);

      const {mpos, orientations, timestamps, t_init, t_range} = parseRTK(uint8Array, FlatbufferModule);
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
      orientations.push( [pose.orientation().z(), pose.orientation().y(), pose.orientation().x()] );
      timestamps.push(pose.timestamp());

      if(typeof pose.adjustedOrientation === 'function') {
        adjustedOrientations.push( [pose.orientation().z(), pose.orientation().y(), pose.adjustedOrientation().x()] ); // TODO use adjustedRoll and adjusted
        allAdjustedOrientationsAreZero = allAdjustedOrientationsAreZero && (adjustedOrientations[adjustedOrientations.length-1][2] == 0); // == 0 && adjustedUTMOrientation[ii][1] == 0 && adjustedUTMOrientations[ii][2] == 0;
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
