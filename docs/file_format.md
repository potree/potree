# File Format

The potree file format partitions points into an octree. All octree nodes,
intermediate as well as leaves, contain a sparse subsample of points.

The spacing defines the minimum distance between points in the root node.
With each level, the spacing is halved, e.g. if spacing in the root is 1.0,
then the spacing in its children is 0.5.
Rendering lower level nodes results in a coarse representation of the pointcloud.
The more nodes you load and render, the better the quality.

The following table shows what the content of the root and its children could
look like and how the level of detail increases when they're rendered together.

| ![](./images/r.png "")        | ![](./images/r1.png "") | ![](./images/r_and_r1.png "") | ![](./images/r_and_rx.png "") |
| ------------- |:-------------:| -----:| --- |
| r - root      | r0 - first child of root | root and r0 combined | root and all its children combined |

## File Hierarchy

The potree file format is actually a collection of files:
* ./cloud.js - A JSON file that contains meta data such as bounding box, spacing, hierarchy, etc.
* ./data/ - This directory contains all node files

For each octree nodes, there is one file in the data directory called r,
followed by a number that indicates its position in the hierarchy.
* r is the root node
* r0 is the first child of the root node
* r03 is the fourth child of the first child of the root node

Each node may have up to 8 child nodes. The numbers from 0 to 7 inside the node name
indicate which child it is.


## Octree Hierarchy

Child nodes are arranged like this:

				  3----7
				 /|   /|
    y 			2----6 |
    | -z		| 1--|-5
    |/			|/   |/
    O----x		0----4

This means that node 0 is at the origin, node 1 is translated along the -z axis,
node 2 is on top of node 0 and so on.

## cloud.js

Stores information about the pointcloud in JSON format.

* __version__ - The cloud.js format may change over time. The version number is
necessary so that parsers know how to interpret the data.
* __octreeDir__ - Directory or URL where node data is stored. Usually points to
"data".
* __boundingBox__ - Contains the minimum and maximum of the axis aligned bounding box.
* __pointAttributes__ - Declares the point data format.
 As of now, only ["POSITION_CARTESIAN", "COLOR_PACKED"] is supported which
 stores each point in 16 bytes. The first 12 bytes contain x/y/z coordinates and
 the remaining 4 the r,g,b,a colors.
 * __POSITION_CARTESIAN__ - 3 x 32bit floats for x/y/z coordinates
 * __COLOR_PACKED__ - 4 x unsigned byte for r,g,b,a colors.
* __spacing__ - The minimum distance between points at root level.
* __hiearchy__ - Contains all nodes and the number of points in each node.
The nodes must be stored top to bottom, i.e. root at the beginning and leaf-nodes at the end.


     	{
     	"version": "1.1",
     	"octreeDir": "data",
     	"boundingBox": {
     		"lx": -10.0,
     		"ly": -10.0,
     		"lz": -10.0,
     		"ux": 10.0,
     		"uy": 10.0,
     		"uz": 10.0
     	},
     	"pointAttributes": [
     		"POSITION_CARTESIAN",
     		"COLOR_PACKED"
     	],
     	"spacing": 0.075,
     	"hierarchy": [
     		["r", 9103],
     		["r0", 7809],
     		["r1", 3491],
     		["r3", 4309],
     		["r03", 8521]
     	]
     	}

    
## Node-Files

The node files in the data directory contain the point data.
With point attributes set to "POSITION_CARTESIAN" and "COLOR_PACKED",
each point will be stored as 3x32bit floats for the xyz-coordinates and 4 unsigned bytes to store
rgba data. All data is stored in little endian order.
Other formats are not supported at the moment.
