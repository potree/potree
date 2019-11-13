export async function storeCalibration(s3, bucket, name, callback) {

}


export async function loadVelo2Rtk(s3, bucket, name, callback) {
  const tstart = performance.now();
  //is name here the dataset name? We should be more careful about that....
  if (s3 && bucket && name) {
    (async () => {
      const objectName = `${name}/7_Cals/extrinsics.txt`//`${name}/3_Assessments/gaps.fb`;//fb schema from s3

      s3.getObject({Bucket: bucket,
                    Key: objectName},
                   async (err, data) => {
                     if (err) {
                       console.log(err, err.stack);
                     } else {
                       let calibrationText = new TextDecoder("utf-8").decode(data.Body);
                       const extrinsics = parseCalibrationFile(calibrationText);
                       callback( extrinsics );
                     }});
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

    xhr.onload = async function(data) {


      let calibrationText = data.target.responseText;
      if (!calibrationText) {
        console.error("Could not create load calbiration file");
        return;
      }

      const velo2Rtk = parseCalibrationFile(calibrationText);
      callback( velo2Rtk );
    };

    t0 = performance.now();
    xhr.send();
  }
}

function parseCalibrationFile(calibrationText){

  let velo2Rtk = {
    x: 0, y:0, z:0, roll:0, pitch:0, yaw:0, version:1.0
  }

  let lines = calibrationText.split("\n");
  let stringXYZ = lines[0].split(" ");
  let stringRPY = lines[1].split(" ");

  velo2Rtk.x = parseFloat(stringXYZ[0]);
  velo2Rtk.y = parseFloat(stringXYZ[1]);
  velo2Rtk.z = parseFloat(stringXYZ[2]);

  velo2Rtk.roll  = parseFloat(stringRPY[0]);
  velo2Rtk.pitch = parseFloat(stringRPY[1]);
  velo2Rtk.yaw   = parseFloat(stringRPY[2]);

  let vals = Object.values(velo2Rtk);
  let allValid = vals.reduce((acc, cur) => acc && !isNaN(cur), true)

  if (!allValid){
    console.error("Error parsing extrinsics file ", velo2Rtk);
  }

  if (lines.length > 2) {
    let versionStr = lines[2].split("version: ")[1];
    velo2Rtk.version = parseFloat(versionStr);
  }

  return velo2Rtk;
}
