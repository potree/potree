import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

export class MeasurementName extends THREE.Object3D {
   constructor(id) {
    super();
    this.measurementDiv = document.createElement('div');
    // this.measurementDiv.className = '__ol-realtime-measurement-tooltip';
    this.measurementDiv.style.marginLeft = '30px';
    this.measurementDiv.style.marginTop = '-30px';
    this.innterText = ``;
    this.measurementDiv.innerText = this.innterText;
    this.measurementLabel = new CSS2DObject(this.measurementDiv);
    this.measurementDiv.id = `measurement-${id}`;
    this.add(this.measurementLabel);
  }

    hide() {
    this.measurementDiv.style.visibility = 'hidden';
  }

    show() {
    this.measurementDiv.style.visibility = 'visible';
  }

  // updatePosition(position) {
  //   // console.log({position})
  //   this.measurementLabel.position.set(position.x, position.y, position.z);
  //   // console.log({label: this.measurementLabel});

  //   // this.position.set(x, y, z);
  // }

    update() {
    // this.measurementDiv.innerText = this.innterText;
  }
}
