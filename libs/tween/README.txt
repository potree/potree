This directory contains a compressed version of the TweenJS library.

It also includes a minified version of EaselJS, and is included for the Ticker class, which TweenJS uses by default. If you don't wish to use EaselJS, you can  implement your own ticking mechanism, or download the Ticker class on its own from http://github.com/createjs/easeljs/

It is recommended that you use this version in almost all cases, unless you need to modify the original code. It is much smaller, results in less http requests, and you don't have to worry about the order in which you include the js files.

tween.js is a single file that contains compacted versions of all of the TweenJS classes (comments and white space stripped).

You can also gzip the file to further reduce its size (by about 75%). Many servers do this automatically.
