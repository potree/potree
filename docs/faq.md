
# FAQ

If you encounter any problem in the browser, try to open the developer console (ctrl + shift + i in firefox and chrome) and look for error messages. Some of the messages are covered in this FAQ.

If your problem is not covered in this FAQ, either create a new issue at the [github
repository](https://github.com/potree/potree) or send an email to
mschuetz@potree.org.


## I've uploaded the point cloud to a web server but it is not visible.

### Did it work on a local web server?
If yes and the error console shows the following error, then it is likely that your uploader altered the data/r* files:
```
Uncaught RangeError: byte length of Float32Array should be a multiple of 4
```

To solve this, tell your uploader to treat files as BINARY rather than ASCII.
In Filezilla you can do this here:
Edit -> Settings -> Transfers -> File Types -> Default Transfer Type

Another option is to pack all your data into a zip file, upload it and unpack it on the server.

### Are you using IIS?

IIS may cause problems with files that have no extension, such as the data/r* files for potree format up to 1.3.

In this case, you can try to configure IIS:
http://www.serverintellect.com/support/iis/enable-no-extensions/

## The converted point cloud is black

As of now, the PotreeConvert expects rgb colors in LAS or LAZ files in a range of 0-65536.
If you have colors in a 0-255 range, you will have to upscale them before conversion.
You can use the [lastools](http://rapidlasso.com/lastools/) to do this:

```
las2las -i pointcloud.las -scale_rgb_up
```



## Can I use potree for commercial projects?

Yes, the license allows you to do this free of charge. If you do use potree, please consider supporting this project with a donation.
