import { getLoadingBar } from "../common/overlay.js";

const isODC = false;

function isNan(n) {
  return n !== n;
}

function minAngle(theta) {
  if (theta < - Math.PI) {
    theta += 2*Math.PI;
  }
  if (theta > Math.PI) {
    theta -= 2*Math.PI;
  }
  return theta;
}

export async function loadRtk(s3, bucket, name, callback) {
  let lastLoaded = 0;
  if (s3 && bucket && name) {
    const objectName = `${name}/0_Preprocessed/rtk.csv`;
    const request = s3.getObject({Bucket: bucket,
                  Key: objectName},
                 (err, data) => {
                   if (err) {
                     console.log(err, err.stack);
                   } else {
                     const string = new TextDecoder().decode(data.Body);
                     const {mpos, orientations, timestamps, t_init, t_range} = parseRTK(string);
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
    const filename = "../data/rtk.csv";
    let t0, t1;
    const tstart = performance.now();

    const xhr = new XMLHttpRequest();
    xhr.open("GET", filename);

    xhr.onprogress = function(event) {
      t1 = performance.now();
      console.log("Loaded ["+event.loaded+"] bytes in ["+(t1-t0)+"] ms")
      t0 = t1;
    }

    xhr.onload = function(data) {
      const {mpos, orientations, timestamps, t_init, t_range} = parseRTK(data.target.response);
      console.log("Full Runtime: "+(performance.now()-tstart)+"ms");
      callback(mpos, orientations, timestamps, t_init, t_range);
    };

    t0 = performance.now();
    xhr.send();
  }
}

function parseRTK(RTKstring) {
  const t0_loop = performance.now();
  const rows = RTKstring.split('\n');

  let tcol, xcol, ycol, zcol, yawcol, pitchcol, rollcol, validCol;

  if (isODC) {
    tcol = 1;       // GPS_TIME
    // tcol = 3;       // SYSTEM_TIME
    xcol = 12;      // RTK_EASTING_M
    ycol = 13;      // RTK_NORTHING_M
    zcol = 14;      // RTK_ALT_M
    yawcol = 15;    // ADJUSTED_HEADING_RAD
    pitchcol = 16;  // PITCH_RAD
    rollcol = 17;   // ROLL_RAD
    validCol = tcol; // not in ODC data
  } else {
    tcol = 0;       // timestamp
    xcol = 3;       // easting
    ycol = 4;       // northing
    zcol = 5;       // altitude
    yawcol = 14;    // heading
    pitchcol = 15;  // pitch
    rollcol = 16;   // roll
    validCol = 20;  // isValid
  }


  let mpos = [];
  let timestamps = [];
  let colors = [];
  let orientations = [];

  let t_init = 0;
  let t_range = 0;
  let firstTimestamp = true;
  let lastRoll, lastPitch, lastYaw, lastOrientation;
  for (let ii = 0, len = rows.length; ii < len-1; ++ii) {
    const row = rows[ii];
    const cols = row.split(' ');
    if (cols.length > 0) {
      const t = parseFloat(cols[tcol]);
      const x = parseFloat(cols[xcol]);
      const y = parseFloat(cols[ycol]);
      const z = parseFloat(cols[zcol]);
      const roll = parseFloat(cols[rollcol]);
      const pitch = parseFloat(cols[pitchcol]);
      const yaw = parseFloat(cols[yawcol]);

      if (isNan(t) || isNan(x) || isNan(y) || isNan(z) || t < 0.01) {
        // skip
        continue;
      }

      if (firstTimestamp) {
        t_init = t;
        firstTimestamp = false;
        lastRoll = 0;
        lastPitch = 0;
        lastYaw = 0;
      } else {
        lastOrientation = orientations[orientations.length - 1];
        lastRoll = lastOrientation[0];
        lastPitch = lastOrientation[1];
        lastYaw = lastOrientation[2];
        t_range = t - t_init;
      }

      colors.push( Math.random() * 0xffffff );
      colors.push( Math.random() * 0xffffff );
      colors.push( Math.random() * 0xffffff );
      mpos.push([x,y,z]);
      timestamps.push(t);

      orientations.push([
        lastRoll + minAngle(roll-lastRoll),
        lastPitch + minAngle(pitch-lastPitch),
        lastYaw + minAngle(yaw-lastYaw)
      ]);
    }
  }

  console.log("Loop Runtime: "+(performance.now()-t0_loop)+"ms");
  return {mpos, orientations, timestamps, t_init, t_range};
}


export function applyRotation(obj, roll, pitch, yaw) {
  if ( typeof(obj.initialRotation) != "undefined") {
    // console.log(obj.ini)
    roll += obj.initialRotation.x;
    pitch += obj.initialRotation.y;
    yaw += obj.initialRotation.z;
  }


  const sr = Math.sin(roll);
  const sp = Math.sin(pitch);
  const sy = Math.sin(yaw);

  const cr = Math.cos(roll);
  const cp = Math.cos(pitch);
  const cy = Math.cos(yaw);

  const rotMat = new THREE.Matrix4().set(
    cy*cp,  cy*sp*sr - sy*cr,   cy*sp*cr + sy*sr, 0,
    sy*cp,  sy*sp*sr + cy*cr,   sy*sp*cr - cy*sr, 0,
    -sp,    cp*sr,              cp*cr,            0,
    0,      0,                  0,                1,
  )

  // obj.rotation.set(roll, pitch, yaw);
  obj.rotation.setFromRotationMatrix(rotMat);


}
