var tweenPosition;
var tweenTarget;
var tween, tweenBack;

function tweenInitAll() {
  createTarget();
  tweeninit();

}

function createTarget() {

  let position = new THREE.Vector3(300017.837, 4701275.200, 259.077);
  let geom = new THREE.BoxGeometry(10, 10, 10);
  let materialNormal = new THREE.MeshNormalMaterial();

  tweenTarget = new THREE.Mesh(geom, materialNormal);
  tweenTarget.position.copy(position);
  viewer.scene.scene.add(tweenTarget);

  return tweenTarget;
}

function tweeninit() {


  let x = 300017.837;
  let y = 4701275.200;
  let z = 259.077;


  tweenPosition = {x: x, y: y, z:z, rotation: 0};
  // tweenTarget = document.getElementById('tweenTarget');

  tween = new TWEEN.Tween(tweenPosition)
  .to({x: x+70, y: y+20, z: z+10, rotation: 359}, 1000)
  .easing(TWEEN.Easing.Elastic.Out)
  .onUpdate(update);

  tweenBack = new TWEEN.Tween(tweenPosition)
  .to({x: x, y: y, z:z, rotation: 0}, 1000)
  .easing(TWEEN.Easing.Elastic.Out)
  .onUpdate(update);
  tween.chain(tweenBack);
  tweenBack.chain(tween);
  tween.start();
}

function update() {
  let newPosition = new THREE.Vector3(tweenPosition.x, tweenPosition.y, tweenPosition.z);
  tweenTarget.position.copy(newPosition);

}
