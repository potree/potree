
# Scripting

If you're missing some functionality in the interface, you can still achieve certain things by using your browsers developer tools as a scripting console. Open the developer tools with ctrl + shift + i, paste code into the console and execute it.

## Get points inside height profile

Use this to get a list of points inside the profile.
Right now, an array of point coordinates will be returned.
In a future version, all point attributes (intensity, classification, ...)
will be returned.

```
var maxOctreeDepth = 2;
var points = pointcloud.getPointsInProfile(profileTool.profiles[0], maxOctreeDepth);
```

The following code will create a sphere at each point location in the profile:

```
var maxOctreeDepth = 2;
var points = pointcloud.getPointsInProfile(profileTool.profiles[0], maxOctreeDepth);

var sg = new THREE.SphereGeometry(1, 8, 8);
for(var i = 0; i < points.length; i++){
  var sphere = new THREE.Mesh(sg);
  sphere.position.copy(points[i]);
  scene.add(sphere);
}
```

![](./images/scripting_profile_spheres.png)

## Set width of height profile

The profile width can be changed either by holding ctrl while dragging one of the
endpoints up and down or using this code:

```
profileTool.profiles[0].setWidth(2);
profileTool.profiles[0].update();
```

(The call to update() is required now but won't be in a future version.)

![](./images/scripting_profile_width.png)
