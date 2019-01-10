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
                 (err, data) => {
                   if (err) {
                     console.log(err, err.stack);
                   } else {
                     // const string = new TextDecoder().decode(data.Body);
                     // const {mpos, orientations, t_init, t_range} = parseRTK(string);
                     const FlatbufferModule = await import(schemaUrl);
                     const gapGeometries = parseGaps(data.Body, FlatbufferModule);
                     callback(mpos, orientations, t_init, t_range);
                   }});
    request.on("httpDownloadProgress", (e) => {
      let loadingBar = getLoadingBar();
      let val = 100*(e.loaded/e.total);
      val = Math.max(lastLoaded, val);
      loadingBar.set(val);
      lastLoaded = val;
      if (val < 1) {
        debugger; // shouldn't get here after past
      }
    });

  } else {
    const filename = "csv/rtk.fb";
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
      const {mpos, orientations, t_init, t_range} = parseRTK(data.target.response);
      console.log("Full Runtime: "+(performance.now()-tstart)+"ms");
      callback(mpos, orientations, t_init, t_range);
    };

    t0 = performance.now();
    xhr.send();
  }
}

function parseRTK(flatbufferData) {
  const t0_loop = performance.now();


  console.log("Loop Runtime: "+(performance.now()-t0_loop)+"ms");
  return {mpos, orientations, t_init, t_range};
}
