
# Measuring

if you're missing some functionality in the interface, you can still achieve certain things by using your browsers developer tools as a scripting console. Open the developer tools with ctrl + shift + i, paste code into the console and execute it.


## Height Profile


To get points inside a height profile, use this:
```
var maxOctreeDepth = 2;
var points = pointcloud.getPointsInProfile(profileTool.profiles[0], maxOctreeDepth);
console.log(points);
```
