
function minAngle(theta) {
  if (theta < - Math.PI) {
    theta += 2*Math.PI;
  }
  if (theta > Math.PI) {
    theta -= 2*Math.PI;
  }
  return theta;
}

function loadRtk(s3, bucket, name, callback) {
  if (s3 && bucket && name) {
    const objectName = `${name}/0_Preprocessed/rtkdata.csv`;
    s3.getObject({Bucket: bucket,
                  Key: objectName},
                 (err, data) => {
                   if (err) {
                     console.log(err, err.stack);
                   } else {
                     const string = new TextDecoder().decode(data.Body);
                     const {mpos, orientations, t_init} = parseRTK(string);
                     callback(mpos, orientations, t_init);
                   }});
  } else {
    const filename = "csv/rtkdata.csv";
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
      const {mpos, orientations, t_init} = parseRTK(data.target.response);
      console.log("Full Runtime: "+(performance.now()-tstart)+"ms");
      callback(mpos, orientations, t_init);
    };

    t0 = performance.now();
    xhr.send();
  }
}

function parseRTK(RTKstring) {
  const t0_loop = performance.now();
  const rows = RTKstring.split('\n');

  const tcol = 1;       // GPS_TIME
  // const tcol = 3;       // SYSTEM_TIME
  const xcol = 12;      // RTK_EASTING_M
  const ycol = 13;      // RTK_NORTHING_M
  const zcol = 14;      // RTK_ALT_M
  const yawcol = 15;    // ADJUSTED_HEADING_RAD
  const pitchcol = 16;  // PITCH_RAD
  const rollcol = 17;   // ROLL_RAD

  let mpos = [];
  let colors = [];
  let orientations = [];

  let t_init = 0;
  let firstTimestamp = true;
  let lastRoll, lastPitch, lastYaw;
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

      if (isNan(t) || isNan(x) || isNan(y) || isNan(z)) {
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
      }

      colors.push( Math.random() * 0xffffff );
      colors.push( Math.random() * 0xffffff );
      colors.push( Math.random() * 0xffffff );
      mpos.push([x,y,z]);

      orientations.push([
        lastRoll + minAngle(roll-lastRoll),
        lastPitch + minAngle(pitch-lastPitch),
        lastYaw + minAngle(yaw-lastYaw)
      ]);
    }
  }

  console.log("Loop Runtime: "+(performance.now()-t0_loop)+"ms");

  return {mpos, orientations, t_init};
}


function applyRotation(obj, roll, pitch, yaw) {
  if ( typeof(obj.initialRotation) != "undefined") {
    console.log(obj.ini)
    roll += obj.initialRotation.x;
    pitch += obj.initialRotation.y;
    yaw += obj.initialRotation.z;
  }

  obj.rotation.set(roll, pitch, yaw);
}
