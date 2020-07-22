'use strict';


/**
 * @brief Helper function for loaders to determine if a local point cloud file exists
 * @param {String} path
 * @returns {String | null} Returns 'path' if exists, null if file does not exist
 */
async function existsOrNull(path) {
    return new Promise((resolve, reject) => {
        const req = new XMLHttpRequest();
        req.open('HEAD', path, true)
        req.onreadystatechange = () => {
            if (req.readyState === 4) { // completed (error or done)
                const fileExists = req.status == 200
                const toRtn = fileExists ? path : null
                resolve(toRtn)
            }
        }
        req.send()
    })
}

export const getFbFileInfo = async (datasetFiles, objNameMatch, schemaMatch, localObj, localSchema) =>
  {
    if (datasetFiles) {
      const objectName = datasetFiles.filter(path => path.endsWith(objNameMatch))[0];
      const schemaFile = datasetFiles.filter(path => path.endsWith(schemaMatch))[0];
      return objectName && schemaFile && {objectName, schemaFile};
    } else {
      const objectName = await existsOrNull(localObj);
      const schemaFile = await existsOrNull(localSchema);
      return objectName && schemaFile && {objectName, schemaFile};
    }
  };

export const getFileInfo = async (datasetFiles, objNameMatch, localObj) =>
  {
    if (datasetFiles) {
      const objectName = datasetFiles.filter(path => path.endsWith(objNameMatch))[0];
      return objectName && {objectName};
    } else {
      const objectName = await existsOrNull(localObj);
      return objectName && {objectName};
    }
  };

export const getFbFileInfox = async (datasetFiles, objNameMatch, schemaMatch, localObjList, localSchema) =>
  {
    if (datasetFiles) {
      const schemaFile = datasetFiles.filter(path => path.endsWith(schemaMatch))[0];
      const keys = datasetFiles.filter(path => path.endsWith(objNameMatch));
      return map(key => ({s3Key: key, s3Schema: schemaFile}), keys);
    } else {
      const schemaPath = await existsOrNull(localSchema);
      for (const localObj of localObjList) {
        const path = await existsOrNull(localObj);
        if (path) {
          paths.push({localPath: path, localSchema: schemaPath});
        }
      }
      return paths;
    }
  };

export const getFileInfox = async (datasetFiles, objNameEnding, localObjList) =>
  {
    if (datasetFiles) {
      const keys = datasetFiles.filter(key => key.endsWith(objNameEnding));
      return map(key => ({s3key: key}), keys);
    } else {
      let paths = [];
      for (const localObj of localObjList) {
        const path = await existsOrNull(localObj);
        if (path) {
          paths.push({localPath: path});
        }
      }
      return paths;
    }
  };


export function applyRotation(obj, roll, pitch, yaw) {
  if ( typeof(obj.initialRotation) != "undefined") {
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
