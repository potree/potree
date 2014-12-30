
# Converting Point Clouds

This section explains how to use the  [PotreeConverter](https://github.com/potree/PotreeConverter) to convert point clouds.

If you want to get the best out of potree, you might want to consider following points:

* The resulting data/r* files should idealy be smaller than 60k poins (~1mb). Larger files will increase load times and reduce the rendering efficiency.
* There should not be too much very small data/*r files. (like 60% files with <10kb).
A lot of small files will result in a large amount of small nodes being rendered at run time and a large amount of small nodes can decrease performance just as much as a small amount of too large nodes. (large with respect to the amount of points they contain)
* When using the adaptive point size mode, you might get better results if you don't try convert all points, i.e. choose a lower depth or higher spacing. This is because adaptive point size reduces the point size for each node that has been loaded but if a high level node does not have enough points to cover up for the reduced point size, holes will appear.



## Getting Started

For your first conversion, try this:

```
./PotreeConverter.exe pointcloud.las -l 3 --scale 0.01
```

It will create an octree hierarchy with a depth of 0-3. A higher depth will increase the amount of details but it shouldn't be set arbitrarely high. Read about the options to learn about good values.
The scale parameter specifies the coordinate precision.

Somewhere in the command line you'll get this output:
```
spacing calculated from diagonal: 0.5
Last level will have spacing:     0.0625
```

The spacing is the distance between points, not to be confused with coordinate precision. With each level, the distance between points is halved. The final spacing at the lowest level is calculated with (spacing) / 2 ^ levels.
In this case, points at the root level have a distance of 0.5 from each other and at the lowest level their distance is 0.0625. If the unit is meters, this means that your result will have a spacing of 6.25cm. The actual precision of the coordinates is set with the scale parameter and independant of the spacing!


## Options

__-l (octree depth):__ Number of octree levels. Use 3 or 4 for smaller point clouds (~5m) and 8-10 for large point clouds (500m - 18b). With each level, the amount of detail increases. This option should not be set too high and may require some trial and error. __Affects the number of nodes in the output!__. Increase the octree depth to get more details and more files and vice versa. If you get too much small files, decrease this.

__-s (spacing):__ Distance between points at root level. At each level down the hierarchy, the spacing is halved. If this parameter is omitted, a default value is calculated from the diagonal of the bounding box. __Affects the file size of the nodes in the output!__ Lower the spacing to get larger files with more points and vice versa.

__-i (input files and directories):__ If a directory is specified, all files inside the directory will be converted. Multiple files and directories may be specified.

__-o (output directory):__

__--output-format:__ May be either BINARY (default), LAS or LAZ. As of now, BINARY only supports coordinate position and point colors. LAS and LAZ files can also handle intensity, classification, return number and point source id. LAZ is a compressed format that produces the smallest output(~1/3 of binary format) but comes at a higher CPU and memory cost.
