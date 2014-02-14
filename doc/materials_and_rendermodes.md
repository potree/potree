
# Materials And Rendermodes

The default material for point clouds is an instance of PointCloudMaterial with the name "pointCloud".
In order to change its attributes, you have to retrieve it by calling:

    var material = MaterialManager.getMaterial("pointCloud");

There are 3 rendermodes available:

* <b>FIXED_CIRCLE</b>
Render points as circles with a fixed size. The pointSize attribute indicates the pixel diameter.
* <b>WEIGHTED_CIRCLE</b>
Render points as circles with a size depending on the distance to the viewer.  
* <b>FILTERED_SPLAT</b>
Interpolates between overlapping points. High quality but very slow.

You can change the render mode by calling

    material.renderMode = PointCloudRenderMode.FIXED_CIRCLE;
    
| ![](./images/lion_fixed_circles.jpg "") | ![](./images/lion_weighted_circles.jpg "") | ![](./images/lion_filtered_splats.jpg "") |
| --------------------------------------- | ------------------------------------------ | ----------------------------------------- |
| FIXED_CIRCLES with point-size 2. All points have pixel diameter 2.| WEIGHTED_CIRCLES with point-size 1. Size varies depending on distance from camera. | FILTERED_SPLATS with point-size 1. In this mode, points have the same size as with WEIGHTED_CIRCLES, but overlapping points are interpolated. |   
 