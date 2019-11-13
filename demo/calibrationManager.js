export async function storeCalibration(s3, bucket, name, callback) {

}


export async function loadCalibration(s3, bucket, name, callback) {
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

      const extrinsics = parseCalibrationFile(calibrationText);
      callback( extrinsics );
    };

    t0 = performance.now();
    xhr.send();
  }
}

function parseCalibrationFile(calibrationText){

  let extrinsics = {
    x: 0, y:0, z:0, roll:0, pitch:0, yaw:0, version:1.0
  }

  let lines = calibrationText.split("\n");
  let stringXYZ = lines[0].split(" ");
  let stringRPY = lines[1].split(" ");

  extrinsics.x = parseFloat(stringXYZ[0]);
  extrinsics.y = parseFloat(stringXYZ[1]);
  extrinsics.z = parseFloat(stringXYZ[2]);

  extrinsics.roll  = parseFloat(stringRPY[0]);
  extrinsics.pitch = parseFloat(stringRPY[1]);
  extrinsics.yaw   = parseFloat(stringRPY[2]);

  if (lines.length > 2) {
    let versionStr = lines[2].split("version: ")[1];
    extrinsics.version = parseFloat(versionStr);
  }

  return extrinsics;
}
