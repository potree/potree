# Potree Data Format

_Note: This document is written based on the Potree 1.7 data format._

## Overview

The Potree Data Format is …

- … made for loading [PointCloud][PointCloud] data.
- … flexibly optimizable for different kinds of available information
    _(see [PointCloud Data files](#pointcloud-data-files))_.
- … built for the web _(cachable, hostable on simple file storages)_.
- … split into several files & folders _(urls)_.
- … implemented using an [Octree][Octree] file structure.
- … implemented with very little overhead.

## Folder Structure

- `/cloud.js` - [Meta Information](#meta-information)
- `/sources.json` - [Build Information](#build-information)
- `/<octree-dir>/r/**/r**.hrc` - [Index Files](#index-files)
- `/<octree-dir>/r/**/r**.bin` - [PointCloud Data files](#pointcloud-data-files)
- `/<octree-dir>/r/**/r**.las` - [Las Data files](#las-data-files)
- `/<octree-dir>/r/**/r**.laz` - [Laz Data files](#laz-data-files)

## Meta Information

Global structure information about how the other files should be interpreted
will be stored in the `/cloud.js` file which contains [JSON][JSON] formatted
data _(name misleading)_.

- `version` _(String)_ Version number in which this file is written _(1.7)_ is
    the current version.
- `octreeDir` _(String)_ Folder that is used to load additional data.
- `points` _(Number)_ Amount of points contained in the whole pointcloud data
- `projection` _(String)_ This parameter is used to transform the point data to
    the projection system used while visualizing the points. It has to be in a
    format that is parsable by [proj.4][proj4].

- `boundingBox` _(Object)_ Bounding box of the world used to limit the initial
    POV.

    - `lx` _(Number)_ Min X
    - `ly` _(Number)_ Min Y
    - `lz` _(Number)_ Min Z
    - `ux` _(Number)_ Max X
    - `uy` _(Number)_ Max Y
    - `uz` _(Number)_ Max Z

- `tightBoundingBox` _(Object)_ Bounding box of the actual points in the data

    - `lx` _(Number)_ Min X
    - `ly` _(Number)_ Min Y
    - `lz` _(Number)_ Min Z
    - `ux` _(Number)_ Max X
    - `uy` _(Number)_ Max Y
    - `uz` _(Number)_ Max Z

- `pointAttributes` _(String or Array)_ `LAZ` or `LAS` or...

    an _(Array)_ of attributes specifying the order and type of data stored in
    the [Data files](#data-index-files). Its possible to be one of the following
    keys:

    - `POSITION_CARTESIAN`: 3 _(uint32)_ numbers: x, y, z
    - `RGBA_PACKED`: 4 x _(uint8)_ numbers for the color: r, g, b, a
        _(Note: Could it be that this is unused?)_
    - `COLOR_PACKED`: 4 x _(uint8)_ numbers for the color: r, g, b, a
    - `RGB_PACKED`: 3 x _(uint8)_ numbers for the color: r, g, b
        _(Note: Could it be that this is unused?)_
    - `NORMAL_FLOATS`: 3 x _(float)_ numbers: x', y', z'
        _(Note: Could it be that this is unused?)_
    - `FILLER_1B`: _(uint8)_ number
        _(Note: Could it be that this is unused?)_
    - `INTENSITY`: _(uint16)_ number specifying the point's intensity
    - `CLASSIFICATION`: _(uint8)_ id for the class used.
    - `NORMAL_SPHEREMAPPED`: _(Note: might need to be revisited, best don't use)_
    - `NORMAL_OCT16`: _(Note: might need to be revisited, best don't use)_
    - `NORMAL`: 3 x _(float)_ numbers: x', y', z'

    _Note:_ All types mentioned here are in little endian.

- `spacing`: _(Number)_ Space between points at the root node. This value is halved at each octree level.
- `scale`: _(Number)_ Scale applied to convert POSITION_CARTESIAN components from _uint32_ values to floating point values. The full transformation to world coordinates is ```position = (POSITION_CARTESIAN * scale) + boundingBox.min```
- `hierarchyStepSize`: _(Number)_ Amount of Octree levels before a new folder
    hierarchy is expected.
- `hierarchy`: _(Array)_ **(deprecated)** The hierarchy of files, now loaded
    through [index files](#index-files).

## Build Information

When generating Potree data, the generator can **optionally** create a
`sources.json` file to keep information about the source-data that was used to
create the Potree data.

## Data & Index files

Depending on the `pointAttributes` [meta information](#meta-information) the
actual point data is stored in either [`.bin`](#poincloud-data-files),
[`.las`](#las-data-files) or [`.laz`](#laz-data-files) data files.

The path for each file consists of the `octreeDir`
[meta information](#meta-information) followed by a tree structure path.
In an octree there are 8 possible nodes in every hierarchy level.
Potree assumes `0`-`7` for each node in a hierarchy level. The
`hierarchyStepSize` information specifies the hierarchy depth after which
a new folder will be added to the hierarchy with the name of the sub-hiearchies
prefix.

_Example:_ Given `octreeDir` is set to `data` and `pointAttributes` is set to
`laz` and `hierarchyStepSize` is set to `3`. This example shows a very small
, fictive, tree:

```
   r
  / \
 0   3
 |  / \
 1 0   1
       |
       0
```

The resulting data files would need to be stored like this:

```
|- cloud.js
\- data/
  \- r/
    |- r.hrc
    |- r.laz
    |- r0.laz
    |- r01.laz
    |- r3.laz
    |- r30.laz
    |- r31.laz
    \- 310/
      |- r310.hrc
      \- r310.laz
```

- `data/r/r.hrc` and `data/r/310/r310.hrc` are the [index files](#index-files)
    specifying what sub tree nodes are available.
- `data/r/**/*.laz` contains the binary pointcloud data to be loaded
- `data/r/310/` is the subfolder created for the 3rd hierarchy level

### Index Files

As mentioned in the former section, the `.hrc` files contain the index structure
meaning a list of all the files stored within the directory tree.

An index file contains a list of tuple values with the first being a `uint8`
"mask" and the second being `uint32` "number of points" of a hierarchy level
in a [breadth first level order][breadth-first].

Per hierarchy level we have 8 possible nodes. To indicate whether a node exists
a simple binary mask is used:

| Position | Mask | [Binary][bin] |
|----------|------|---------------|
| 0        | 1    | 0b00000001    |
| 1        | 2    | 0b00000010    |
| 2        | 4    | 0b00000100    |
| 3        | 8    | 0b00001000    |
| 4        | 16   | 0b00010000    |
| 5        | 32   | 0b00100000    |
| 6        | 64   | 0b01000000    |
| 7        | 128  | 0b10000000    |

So if in a hierarchy the child node 3 and node 7 exist then the hierarchies
mask has to be `0b00001000 | 0b10000000` → `0b10001000` (=136).

_Example:_ A simple, non-realistic tree:

```
|- r1
|  |
|  \- r14 (2 Points)
|
\- r3
   |
   \- r36 (1 Point)
```

Would have an index looking like this:

| name | mask               | points |
|------|--------------------|--------|
| r    | `0b00001010` (=10) | `3`    |
| r1   | `0b00010000` (=16) | `2`    |
| r3   | `0b01000000` (=64) | `1`    |
| r14  | `0b00000000` (=0)  | `2`    |
| r36  | `0b00000000` (=0)  | `1`    |

### PointCloud Data files

The `.bin` files contains a list of points. For each point it contains a list
of binary data following the `pointAttributes` specified in the
[meta information](#meta-information).

_Example:_ With `pointAttributes=['POSITION_CARTESIAN']`, the `.bin` file is a
sequence of points with each consisting of 3 `uint32` numbers.

_Example2:_ With `pointAttributes=['POSITION_CARTESIAN','INTENSITY']`, the
`.bin` files contain a sequence of points consisting of 3 `uint32` numbers
followed by one `uint16` number.

_Example3:_ With `pointAttributes=['INTENSITY','POSITION_CARTESIAN']`, the
`.bin` files contain a sequence of points consisting of one `uint16` number
followed by 3 `uint32` numbers.

### Las Data files

`.las` data files have to follow the [`las` specification][LasSpec]. Potree
supports up to [version 1.3][LasSpec1.3].

### Laz Data files

Compressed [`.las`](#las-data-files) files. See [LasZip][LasZip].

[PointCloud]: https://en.wikipedia.org/wiki/Point_cloud
[Float]: https://en.wikipedia.org/wiki/IEEE_754#Formats
[JSON]: http://www.json.org/
[proj.4]: http://proj4.org/projections/index.html
[Octree]: https://en.wikipedia.org/wiki/Octree
[LasSpec]: https://www.liblas.org/development/specifications.html#specifications
[LasSpec1.3]: https://www.liblas.org/_static/files/specifications/asprs_las_format_v13.pdf]
[LasZip]: http://www.laszip.org/
[LittleEndian]: https://en.wikipedia.org/wiki/Endianness#Little-endian
[bin]: http://www.javascripttutorial.net/es6/octal-and-binary-literals/
[breadth-first]: https://en.wikipedia.org/wiki/Breadth-first_search
