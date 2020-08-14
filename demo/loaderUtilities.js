'use strict';

import { updateLoadingBar, incrementLoadingBarTotal } from "../common/overlay.js";


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

export async function writeFileToS3 (s3, bucket, name, subdirectory, filename, buffer) {
  try {
    const request = s3.putObject({
      Bucket: bucket,
      Key: `${name}/${subdirectory}/${filename}`,
      Body: buffer
    });
    request.on("httpUploadProgress", async (e) => {
    });
    await request.promise();
  } catch (e) {
    console.error("Error: could not write file to S3: ", e);
  }
}

export async function createLanesFlatbuffer (lane, FlatbufferModule) {
  const builder = new flatbuffers.Builder(0);

  // Add left vec3s
  FlatbufferModule.Flatbuffer.GroundTruth.Lane.startLeftVector(builder, lane.left.length);
  for (const point of lane.left) {
    FlatbufferModule.Flatbuffer.GroundTruth.Vec3.createVec3(builder, point.position.x, point.position.y, point.position.z);
  }
  const leftOffset = builder.endVector();

  // Add right vec3s
  FlatbufferModule.Flatbuffer.GroundTruth.Lane.startRightVector(builder, lane.right.length);
  for (const point of lane.right) {
    FlatbufferModule.Flatbuffer.GroundTruth.Vec3.createVec3(builder, point.position.x, point.position.y, point.position.z);
  }
  const rightOffset = builder.endVector();

  // Add spine vec3s
  FlatbufferModule.Flatbuffer.GroundTruth.Lane.startSpineVector(builder, lane.spine.length);
  for (const point of lane.spine) {
    FlatbufferModule.Flatbuffer.GroundTruth.Vec3.createVec3(builder, point.position.x, point.position.y, point.position.z);
  }
  const spineOffset = builder.endVector();

  const timestampOffset = FlatbufferModule.Flatbuffer.GroundTruth.Lane.createTimestampVector(builder, lane.timestamp);
  const laneTypeLeftOffset = FlatbufferModule.Flatbuffer.GroundTruth.Lane.createLaneTypeLeftVector(builder, lane.laneTypeLeft);
  const laneTypeRightOffset = FlatbufferModule.Flatbuffer.GroundTruth.Lane.createLaneTypeLeftVector(builder, lane.laneTypeRight);
  const leftPointValidityOffset = FlatbufferModule.Flatbuffer.GroundTruth.Lane.createLeftPointValidityVector(builder, lane.leftPointValidity);
  const rightPointValidityOffset = FlatbufferModule.Flatbuffer.GroundTruth.Lane.createRightPointValidityVector(builder, lane.rightPointValidity);
  const leftPointAnnotationStatusOffset = FlatbufferModule.Flatbuffer.GroundTruth.Lane.createLeftPointAnnotationStatusVector(builder, lane.leftPointAnnotationStatus);
  const rightPointAnnotationStatusOffset = FlatbufferModule.Flatbuffer.GroundTruth.Lane.createRightPointAnnotationStatusVector(builder, lane.rightPointAnnotationStatus);

  // Create lane flatbuffer
  FlatbufferModule.Flatbuffer.GroundTruth.Lane.startLane(builder);
  FlatbufferModule.Flatbuffer.GroundTruth.Lane.addId(builder, lane.id);
  FlatbufferModule.Flatbuffer.GroundTruth.Lane.addTimestamp(builder, timestampOffset);
  FlatbufferModule.Flatbuffer.GroundTruth.Lane.addLeft(builder, leftOffset);
  FlatbufferModule.Flatbuffer.GroundTruth.Lane.addRight(builder, rightOffset);
  FlatbufferModule.Flatbuffer.GroundTruth.Lane.addSpine(builder, spineOffset);
  FlatbufferModule.Flatbuffer.GroundTruth.Lane.addLaneTypeLeft(builder, laneTypeLeftOffset);
  FlatbufferModule.Flatbuffer.GroundTruth.Lane.addLaneTypeRight(builder, laneTypeRightOffset);
  FlatbufferModule.Flatbuffer.GroundTruth.Lane.addLeftPointValidity(builder, leftPointValidityOffset);
  FlatbufferModule.Flatbuffer.GroundTruth.Lane.addRightPointValidity(builder, rightPointValidityOffset);
  FlatbufferModule.Flatbuffer.GroundTruth.Lane.addLeftPointAnnotationStatus(builder, leftPointAnnotationStatusOffset);
  FlatbufferModule.Flatbuffer.GroundTruth.Lane.addRightPointAnnotationStatus(builder, rightPointAnnotationStatusOffset);

  const newLane = FlatbufferModule.Flatbuffer.GroundTruth.Lane.endLane(builder);
  builder.finish(newLane);
  const bytes = builder.asUint8Array();
  const lenBytes = new Uint8Array(4);
  const dv = new DataView(lenBytes.buffer);
  dv.setUint32(0, bytes.length, true);

  const outbytes = new Int8Array(lenBytes.length + bytes.length);
  outbytes.set(lenBytes);
  outbytes.set(bytes, lenBytes.length);
  return outbytes;
}

/**
 * @brief Gets list of "all" files located in s3 for the dataset
 * @note Have to do a request for each sub dir as there is a limit on # objects that can be requested
 * (1_Viz has >1000 raw .bin that take up all the space so do multiple requests -- not all 1_Viz's .bin are included)
 * @returns {Promise<Array<String> | null>} List of files located within s3 for the dataset (null if running local point cloud)
 */
export async function getS3Files (s3, bucket, name) {
  if (bucket == null) return null; // local point cloud
  const removePrefix = (str) => str.split(name + "/")[1];

  const topLevel = await s3.listObjectsV2({
    Bucket: bucket,
    Delimiter: "/",
    Prefix: `${name}/`
  }).promise();
  const topLevelDirs = topLevel.CommonPrefixes
    .map(listing => listing.Prefix)
    .filter(str => {
      const noPrefix = removePrefix(str);
      const delimIdx = noPrefix.indexOf("/");
      // -1 if no other '/' found, meaning is a file & not a directory
      return delimIdx !== -1;
    })

  // consolidate each subdirs' contents after doing multiple requests
  // prevent one folder's numerous binary files from blocking the retrieval of other dirs' files
  const filePaths = [];
  const table = {};
  for (const dir of topLevelDirs) {
    const list = [];
    const listData = await s3.listObjectsV2({
      Bucket: bucket,
      Prefix: dir
    }).promise();
    listData.Contents.forEach(fileListing => filePaths.push(fileListing.Key));
    listData.Contents.forEach(fileListing => list.push(fileListing.Key));
    const key = dir.split("/");
    table[key[2]] = list;
  }
  return [filePaths, table];
}
