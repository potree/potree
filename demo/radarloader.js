

isNan = function(n) {
  return n !== n;
}

function loadRadar(callback) {

  let filename = "csv/radar_tracks_demo.csv";
  let tcol = 3;
  let xcol = 27;
  let ycol = 28;
  let zcol = 29;


  let t0, t1;
  let tstart = performance.now();

  const xhr = new XMLHttpRequest();
  xhr.open("GET", filename);
  xhr.onprogress = function(event) {
    t1 = performance.now();
    console.log("Loaded ["+event.loaded+"] bytes in ["+(t1-t0)+"] ms")
    t0 = t1;
  }
  xhr.onload = function(data) {
    var t0_loop = performance.now();
    var rows = data.target.response.split('\n');

    var geometry = new THREE.BufferGeometry();
    var positions = [];
    var timestamps = [];
    var colors = [];
    var alphas = [];

    let row, cols;
    let t_init = 0;
    let firstTimestamp = true;
    for (let ii = 0, len = rows.length; ii < len-1; ++ii) {
      row = rows[ii];
      cols = row.split(',');

      if (cols.length > 0) {
        t = parseFloat(cols[tcol]);
        x = parseFloat(cols[xcol]);
        y = parseFloat(cols[ycol]);
        z = parseFloat(cols[zcol]);


        if (isNan(t) || isNan(x) || isNan(y) || isNan(z)) {
          // skip
          continue;
        }


        if (firstTimestamp) {
          t_init = t;
          firstTimestamp = false;
        }

        // timestamps.push(t);
        timestamps.push(t-t_init);
        positions.push(x);
        positions.push(y);
        positions.push(z);
        colors.push( Math.random() * 0xffffff );
        colors.push( Math.random() * 0xffffff );
        colors.push( Math.random() * 0xffffff );
        alphas.push( 1.0 );
      }
    }
    // debugger; // timestamp


    if ( positions.length > 0 ) geometry.addAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
    if (timestamps.length > 0) geometry.addAttribute('gpsTime', new THREE.Float32BufferAttribute(timestamps, 1));
    if (colors.length > 0) geometry.addAttribute('color', new THREE.Uint8BufferAttribute(colors, 3));
    if (alphas.length > 0) geometry.addAttribute('alpha', new THREE.Float32BufferAttribute(alphas, 1));

    console.log("timestamps");
    console.log(timestamps);
    console.log(positions);
    console.log("Loop Runtime: "+(performance.now()-t0_loop)+"ms");
    console.log("Full Runtime: "+(performance.now()-tstart)+"ms");

    callback(geometry, t_init);
  };

  t0 = performance.now();
  xhr.send();
}
