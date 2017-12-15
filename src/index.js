// TODO: Legacy: All this is because all those properties used to be
//       exported to Window. They should be accessed differently.
module.exports = require('./Potree');
window.GLQueries = require('./webgl/GLQueries.js');
window.GreyhoundUtils = require('./loader/GreyhoundUtils');
window.LRUItem = require('./LRUItem');
window.LRU = require('./LRU');
window.PotreeRenderer = require('./viewer/PotreeRenderer');
window.EDLRenderer = require('./viewer/EDLRenderer');
window.initSidebar = require('./viewer/initSidebar');
window.HoverMenuItem = require('./stuff/HoverMenuItem');
window.HoverMenu = require('./stuff/HoverMenu');
// THREE & proj4 used to be exposed, it still is
window.proj4 = require('proj4');
window.THREE = require('three');
window.ProfilePointCloud = require('./ProfilePointCloud');
window.RepRenderer = require('./viewer/RepRenderer');
require('three-ply-loader')(window.THREE);
