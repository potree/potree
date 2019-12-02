export async function storeCalibration(s3, bucket, name, callback) {
  // TODO
}

export async function loadRtk2Vehicle(s3, bucket, name, callback) {

  // TODO Hardcoded defaults for now
  const rtk2Vehicle = {
    x:0, y:0, z:-2,
    roll:0, pitch:0, yaw:Math.PI/2
  }

  callback(rtk2Vehicle);
}

export async function loadVelo2Rtk(s3, bucket, name, callback) {
  const tstart = performance.now();
  //is name here the dataset name? We should be more careful about that....
  if (s3 && bucket && name) {
    (async () => {
      const objectName = `${name}/7_Cals/extrinsics.txt`

      try {
        const data = await s3.getObject({Bucket: bucket, Key: objectName}).promise();
        const calibrationText = new TextDecoder("utf-8").decode(data.Body);
        const extrinsics = parseCalibrationFile(calibrationText);
        callback( extrinsics );
      } catch (err) {
        console.log(err, err.stack);
        callback(null);
      }

    })();

  } else {
    const filename = `../cals/extrinsics.txt`;
    let t0, t1;

    const xhr = new XMLHttpRequest();
    xhr.open("GET", filename);
    xhr.responseType = "text";

    xhr.onprogress = function(event) {
      t1 = performance.now();
      t0 = t1;
    }

    xhr.onload = function(data) {

      const calibrationText = data.target.responseText;
      if (!calibrationText) {
        console.error("Could not create load calbiration file");
        return;
      }

      const velo2Rtk = parseCalibrationFile(calibrationText);
      callback( velo2Rtk );
    };

    xhr.onerror = function(err) {
      console.log(err, err.stack);
      callback(null);
    }

    t0 = performance.now();
    xhr.send();
  }
}

function parseCalibrationFile(calibrationText){

  let velo2Rtk = {
    x: 0, y:0, z:0, roll:0, pitch:0, yaw:0, version:1.0
  }

  const lines = calibrationText.split("\n");
  const stringXYZ = lines[0].split(", ");
  const stringRPY = lines[1].split(", ");

  // TODO add validation for results from Number() below:
  velo2Rtk.x = Number(stringXYZ[0]);
  velo2Rtk.y = Number(stringXYZ[1]);
  velo2Rtk.z = Number(stringXYZ[2]);

  velo2Rtk.roll  = Number(stringRPY[0]);
  velo2Rtk.pitch = Number(stringRPY[1]);
  velo2Rtk.yaw   = Number(stringRPY[2]);

  let vals = Object.values(velo2Rtk);
  const allValid = vals.reduce((acc, cur) => acc && !isNaN(cur), true)

  if (!allValid){
    console.error("Error parsing extrinsics file ", velo2Rtk);
    return null;
  }

  if (lines.length > 2) {
    const versionStr = lines[2].split("version: ")[1];
    velo2Rtk.version = Number(versionStr);
  }

  return velo2Rtk;
}
