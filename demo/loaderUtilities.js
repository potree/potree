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
