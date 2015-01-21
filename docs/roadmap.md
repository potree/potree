

# Roadmap

Goals / TODOs for future updates.  
Latest revision: 21.01.2015



* Performance
    * Reduce cloud.js filesize, for example by loading hierarchy as needed. For very large point clouds (>1billion)
    it can grow up to a few mb which increases initial load times.
    _[ticket](https://github.com/potree/potree/issues/81)_
    __(high priority)__  
    * Improve rendering of a large amount of nodes.
    * Avoid nodes with few points, for example by merging them into their parents. __(high priority)__


* Rendering
    * Improve adaptive point sizes. Right now they work well up to a certain octree depth.
    At a certain point holes appear because additional nodes do not have enough points
    to make up for the decreased point size.
    * Additional Shaders like
    [Gooch Shading](http://artis.imag.fr/~Cyril.Soler/DEA/NonPhotoRealisticRendering/Papers/p447-gooch.pdf)
    or [Eye-Dome Lighting](http://www.kitware.com/source/home/post/9).
    * Shadow / Line of Sight rendering
    _[ticket](https://github.com/potree/potree/issues/74)_


* API
    * pointcloud.getPointsInProfile() should return all point attributes, not just
    position.
    _[ticket](https://github.com/potree/potree/issues/106)_
    * Calling profile.update() should not be necessary.
    _[ticket](https://github.com/potree/potree/issues/111)_


* Converter
    * Add a fast conversion option which may trade quality for speed, for example,
    by not enforcing a certain minimum distance between points.
    * Add an option to convert all points. Currently, points are discarded if
    they are too close to each other.
    * Read geo-projection from input las or laz, if specified.


* Interface & Navigation
    * Add option to delete measurements
    * Add a Google Earth like Navigation where users can drag themselves to or from
    a point. Additionally, they can also rotate and zoom with respect to that point. __(high priority)__
    * Improve georeferencing support. Right now, projection has to be specified
    manually in the code. If no projection is specified, users should be able to
    choose the projection from a list/dropwdown. If a projection is specified,
    the user should be able to open a map.
    * Add blending depth and strength options for the splats shading mode.
    * Orthographic Camera and top view
    _[ticket](https://github.com/potree/potree/issues/102)_


* Others
    * Fix memory management. If too much points are loaded, the oldest unused ones
    must be deleted or the browser will run out of memory.
    Can cause the browser to crash on mobile phones.
    _[ticket](https://github.com/potree/potree/issues/76)_
    __(high priority)__
