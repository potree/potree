'use strict';

// This file contains common constant variables (some of which are pulled from the url params)
export const isLocalDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
export const runLocalPointCloud = location.search === "" && isLocalDevelopment
export const params = new URLSearchParams(location.search);
export const bucket = params.get("bucket");
export const region = params.get("region");
export const names = JSON.parse(params.get("names"));
export const name = params.get("clicked");
export const visualizationMode = params.get("mode");
export const annotateLanesAvailable = params.get('annotate') == 'Annotate';
export const downloadLanesAvailable = annotateLanesAvailable;
export const calibrationModeAvailable = params.get("calibrate") == "Calibrate" || runLocalPointCloud;
export const accessKeyId = params.get("key1");
export const secretAccessKey = params.get("key2");
export const sessionToken = params.get("key3");
export const fonts = JSON.parse(params.get("fonts"));
export const theme = JSON.parse(params.get("theme")); // material-ui theme
export let comparisonDatasets = [];
if (names) {
    comparisonDatasets = names.filter(element => element !== name);
}

if (fonts) {
    const head = document.head;
    fonts.forEach(font => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = font;
        head.appendChild(link);
    });

    // Override fonts with the ones we want.
    const { typography } = theme;
    const style = document.createElement('style');
    const fontFamily = typography.fontFamily;
    style.innerHTML =
      `#value {font-family: ${fontFamily} !important;}
       #sidebar_root {font-family: ${fontFamily} !important;}
       #potree_languages {font-family: ${fontFamily} !important;}
       #loading-bar {font-family: ${fontFamily} !important;}
       #loading-bar-total {font-family: ${fontFamily} !important;}
       #annotation {font-family: ${fontFamily} !important;}
       .draggable-overlay {font-family: ${fontFamily} !important;}`;
    head.appendChild(style);
}

export const s3 = bucket && region && name && accessKeyId && secretAccessKey &&
    new AWS.S3({
        region: region,
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
        sessionToken: sessionToken,
    });

export function getS3 () {
  return bucket && region && name && accessKeyId && secretAccessKey && new AWS.S3({
    region: region,
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
    sessionToken: sessionToken
  });
}

export function getAWSObjectVariables () {
  return {
    bucket,
    name
  };
}

export function getLambda () {
  return new AWS.Lambda({
    region: region,
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
    sessionToken: sessionToken,
    apiVersion: '2015-03-31'
  });
}

export function getAWSCredentials () {
  return {
    region,
    accessKeyId,
    secretAccessKey,
    sessionToken
  };
}

if (!(s3 || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    window.history.back()
};
// We really want this, but it doesn't work in the browser. Only on a server.
// const stream = s3.getObject({Bucket: bucket,
//                              Key: name}).createReadStream();

export const defaultTimeRange = {
    min: -0.05,
    max:  0.05,
    initial: 0
}

// returns a THREE.ShaderMaterial object that should be used as standard
export function getShaderMaterial() {
    let uniforms = {
        color: { value: new THREE.Color(0x00ff00) },
        minGpsTime: { value: defaultTimeRange.min },
        maxGpsTime: { value: defaultTimeRange.max },
        initialTime: { value: defaultTimeRange.initial }, // TODO not used
        // offset: {value: new THREE.Vector3(0,0,0)}
    };
    let shaderMaterial = new THREE.ShaderMaterial({

        uniforms: uniforms,
        vertexShader: document.getElementById('vertexshader').textContent,
        fragmentShader: document.getElementById('fragmentshader').textContent,
        transparent: true,
        depthWrite: false

    });
    return shaderMaterial
}
