import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';

export class MeasurementName extends THREE.Object3D {
   constructor(id) {
    super();
    this.measurementDiv = document.createElement('div');
    // this.measurementDiv.className = '__ol-realtime-measurement-tooltip';
    this.measurementDiv.style.marginLeft = '30px';
    this.measurementDiv.style.marginTop = '-30px';
    this.innterText = ``;
    this.measurementDiv.innerText = this.innterText;
    const measurementLabel = new CSS2DObject(this.measurementDiv);
    this.measurementDiv.id = `measurement-${id}`;
    this.add(measurementLabel);
  }

    hide() {
    this.measurementDiv.style.visibility = 'hidden';
  }

    show() {
    this.measurementDiv.style.visibility = 'visible';
  }

    update() {
    // this.measurementDiv.innerText = this.innterText;
  }
}
