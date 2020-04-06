"use strict"
class RtkState {

  constructor(t, poseVec3, orientVec3) {
    this.t = t;
    this.pose = poseVec3;
    this.orient = orientVec3;
    // this.x = poseVec3.x;
    // this.y = poseVec3.y;
    // this.z = poseVec3.z;
    // this.roll = orientVec3.x;
    // this.pitch = orientVec3.y;
    // this.yaw = orientVec3.z;
    // this.quaternion = new THREE.Quaternion().setFromRotationMatrix(this.rotationMatrix);
    this.quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(orientVec3.x, orientVec3.y, orientVec3.z, 'ZYX'));
  }

  // get rotationMatrix() {
  //   // NOTE taken from ODC code: double check the math to ensure that this matches with RTK Manual
  //   // NOTE: Checked and confirmed that the rotation matrix below correctly corresponds to THREE.Euler(roll, pitch, yaw, 'XYZ')
  //   // TODO Check if RTK rotation matrices correspond to THREE.Euler(roll, pitch, yaw, 'XYZ')
  //
  //   const sr = Math.sin(this.orient.x);
  //   const sp = Math.sin(this.orient.y);
  //   const sy = Math.sin(this.orient.z);
  //
  //   const cr = Math.cos(this.orient.x);
  //   const cp = Math.cos(this.orient.y);
  //   const cy = Math.cos(this.orient.z);
  //
  //   const s1 = sr;
  //   const s2 = sp;
  //   const s3 = sy;
  //
  //   const c1 = cr;
  //   const c2 = cp;
  //   const c3 = cy;
  //
  //   // const rotMat = new THREE.Matrix4().set(
  //   //   cy*cp,            -sy*cp,             sp,    0,
  //   //   sy*cr + cy*sp*sr,  cy*cr - sy*sp*sr, -cp*sr, 0,
  //   //   sy*sr - cy*sp*cr,  cy*sr + sy*sp*cr,  cp*cr, 0,
  //   //   0,                 0,                 0,     1,
  //   // );
  //
  //   const rotMat = new THREE.Matrix4().set(
  //     c1*c2, c1*s2*s3 - c3*s1, s1*s3+c1*c3*s2, 0,
  //     c2*s1, c1*c3+s1*s2*s3,   c3*s1*s2-c1*s3, 0,
  //     -s2,   c2*s3,            c2*c3,          0,
  //     0,     0,                0,              1
  //   );
  //
  //   return rotMat;
  // }
}




class RtkTrajectory {

  constructor(posesVec3, orientationsVec3, timestamps, samplingFreq) {
    // NOTE: Assumptions are:
    //        -- timestamps are sorted
    //        -- and dt between timestamps is 1/samplingFreq (within some epsilon):

    // Initializations:
    this.samplingFreq = samplingFreq || Infinity;
    this.poses = posesVec3 || []; // Array of THREE.Vector3
    this.orientations = orientationsVec3 || []; // Array of THREE.Vector3
    this.timestamps = timestamps || []; // Array of double
    this.tstart = timestamps[0] || 0;
    this.tend = timestamps[timestamps.length-1] || 0;
    this.timeRange = this.tend - this.tstart;

    // Construct States:
    const epsilon = 5e-3; // seconds
    this.states = []; // Array of states where each state occurs at specified samplingFreq
    this.numStates = 0;

    let lastT;
    // const numStatesInitial = (timestamps[timestamps.length-1] - timestamps[0]) * samplingFreq;
    for (let ii = 0, tt = timestamps[0]; ii < timestamps.length; ii++, tt = timestamps[ii]) {

      // Create new state:
      const state = new RtkState(tt, posesVec3[ii], orientationsVec3[ii]);
      const closestTickTime = Math.round((tt-timestamps[0])*samplingFreq) / samplingFreq + timestamps[0];

      if (ii == 0) { // First state
        this.states.push(state);
        lastT = tt;

      } else if (Math.abs(tt - lastT) < epsilon) { // timestamps are identical

        continue; // skip this state

      } else if (Math.abs(tt-closestTickTime) >= epsilon) { // timestamp is not on a tick mark

        // TODO assuming for now that all points are within epsilon of a tick mark
        debugger; // This is an unhandled case in the RtkTrajectory constructor
        console.error("This is an unhandled case in the RtkTrajectory constructor");
        continue;

      } else if (Math.abs(1/(tt - lastT) - samplingFreq) < epsilon) { // timestamp is on the next sampling 'tick'

        this.states.push(state);
        lastT = tt;

      } else { // timestamp falls on a later tick (missed at least 1 tick)

        // Get lastState and current state
        const lastState = this.states[this.states.length-1];
        const nextState = state;

        // Interpolate between lastState and nextState to get currentState
        const numMissed = Math.round( (tt - lastT)*samplingFreq );
        for (let jj = 1; jj < numMissed; jj++) {
          let currentTimestamp = lastState.t + jj * samplingFreq;
          const interpolatedState = RtkTrajectory.interpolateStates(currentTimestamp, lastState, nextState);
          this.states.push(interpolatedState);
        } // for (jj)

        this.states.push(state);
        lastT = tt;

      } // else

      this.numStates += 1;

    } // for (ii, tt)

  }

  getState(timestamp) {

    // Bounds Checks:
    if (timestamp <= this.tstart) {
      return this.states[0];
    } else if (timestamp >= this.tend) {
      return this.states[this.numStates];
    }

    const tt = timestamp - this.tstart;
    const tickIdxBefore = Math.floor(tt*this.samplingFreq);
    const tickIdxAfter = Math.ceil(tt*this.samplingFreq);

    const state1 = this.states[tickIdxBefore];
    const state2 = this.states[tickIdxAfter];

    return RtkTrajectory.interpolateStates(timestamp, state1, state2);
  }

  // Interpolates using constant velocity/angular velocity assumption between states
  static interpolateStates(timestamp, state1, state2) {

    // Bounds Checks:
    if (state1.t == state2.t) {
      return state1;
    } else if (timestamp <= state1.t) {
      return state1;
    } else if (timestamp >= state2.t) {
      return state2;
    }

    // Assert that State1 is before State2:
    if (state1.t > state2.t) {
      const tmp = state1;
      state1 = state2;
      state2 = tmp;
    }

    const deltaT = Math.abs(state2.t - state1.t);
    const alpha = (timestamp - state1.t) / deltaT;

    // Interpolate Poses (Constant Velocity):
    const x = (1-alpha) * state1.pose.x + (alpha) * state2.pose.x;
    const y = (1-alpha) * state1.pose.y + (alpha) * state2.pose.y;
    const z = (1-alpha) * state1.pose.z + (alpha) * state2.pose.z;
    const pose = new THREE.Vector3(x, y, z);

    // Interpolate Orientations (Constant Angular Velocity):
    const quaternion = new THREE.Quaternion();
    THREE.Quaternion.slerp(state1.quaternion, state2.quaternion, quaternion, alpha);
    const orientation = new THREE.Euler().setFromQuaternion(quaternion, 'ZYX');

    // Return new Interpolated State:
    return new RtkState(timestamp, pose, orientation);
  }
}

export { RtkTrajectory, RtkState }
