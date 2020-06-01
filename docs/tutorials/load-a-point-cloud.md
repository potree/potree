# Load a point cloud


```javascript
// const socket = io('http://localhost');
const domElement = document.getElementById("viewport");

const scene = new Scene();
scene.setupGrid(10.0, 10);

const renderer = new GLRenderer( domElement, {
  webglOptions: {
    antialias: true
  },
});

renderer.setScene(scene);
renderer.resumeDrawing();

////////////////////////////////////
// Point Cloud renderer
const pointcloudPass = new GLPointCloudPass();
renderer.addPass(pointcloudPass, PassType.OPAQUE);

const pointcloudAsset = new PointCloudAsset();
const pointClouudUrl = "https://storage.googleapis.com/visualive-tmp/CNA/Old_Aguathuna_Ship_Loading_Area-Medium_Density_Cloud2/cloud.js"
pointcloudAsset.loadPointCloud(pointClouudUrl, "PointCloud").then(e => {
  renderer.frameAll()
});
scene.getRoot().addChild(pointcloudAsset);
```

> See the live example

[Labels](./load-a-point-cloud.html ':include :type=iframe width=100% height=800px')

Click here to download the file to your computer to try it for yourself: 
<a id="raw-url" onClick="downloadTutorial('load-a-point-cloud.zip', ['./tutorials/load-a-point-cloud.html', './tutorials/assets/Dead_eye_bearing.zcad', './tutorials/libs/zea-engine/dist/index.esm.js', './tutorials/libs/zea-pointclouds/dist/index.rawimport.js', './tutorials/libs/socket.io.js'])" download>Download</a>
