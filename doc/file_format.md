# File Format

## File Hierarchy

Points are stored in an octree. All nodes, even intermediate nodes, contain a subset of the whole point cloud.

    .cloud.js	Contains bounding box, vertex format and octree hierarchy
    ./data		Contains one file for each octree node.
    ./data/r	The root node.
    ./data/rx	The x.th child of the root. x = 0 to 7
    ./data/rxy	The y.th child of the x.th child of the root.

Each node may have up to 8 child nodes. The numbers from 0 to 7 inside the node name indicate which child it is. For example:
* r is the root node
* r0 is the first child of the root node
* r03 is the fourth child of the first child of the root node

## Octree Hierarchy

Child nodes are arranged like this:

				  3----7
			     /|   /|
    y 			2----6 |
    | -z		| 1--|-5
    |/			|/   |/
    O----x		0----4

This means that node 0 is at the origin, node 1 is translated along the -z axis, node 2 is on top of node 0 and so on.

## cloud.js

Stores information about the pointcloud in JSON format.

The property "pointAttributes" indicates how each point is stored. At the moment, you should stick to the format given in the example below. "POSITION_CARTESIAN" and "COLOR_PACKED" means that each point is stored as 3 32bit floats for x,y and z coordinates and 4 unsigned bytes for r,g,b and a colors.

The hierarchy property contains all nodes and the number of points in each node. The nodes must be stored top to bottom, i.e. root at the beginning and leafs at the end.

    {
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
    	"hierarchy": [
    		["r", 9103],
    		["r0", 7809],
    		["r1", 3491],
    		["r3", 4309],
    		["r03", 8521]
    	]
    }