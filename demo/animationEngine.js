
class AnimationEngine {

  constructor() {

    // TODO Use TWEEN.Group()....doesn't work though...why? It's in the documentation
    // this.tweenGroup = TWEEN.Group(); // Tween Group containing all animated objects
    this.tstart = undefined;  // Starting time for animation (reference time, aka GPS Time)
    this.tend = undefined;  // Ending time for animation (reference time, aka GPS Time)
    this.timeline = undefined;
    this.activeWindow = {forward: 0.05, backward: 0.05}; // Defines the size of the window around the current time step
    this.timeRange = undefined;
    this.preStartCallback = undefined; // Callback run before start() executes
    this.preStopCallback = undefined; // Callback run before stop() executes
    this.repeat = true; // Whether to repeat;
    this.playbackRate = 1.0;  // Speed of animation compared to realtime speed
    this.tweenEngine = undefined; // Linear Tween between tstart and tend that controls all other tweens
    this.tweenTargets = []; // List of custom update functions for all targets - called by tweenEngine
    this.isPlaying = false;
  }

  configure(tstart, tend, playbackRate, tweenTargets, repeat) {
    this.tstart = tstart;
    this.tend = tend;
    this.timeline = {t: tstart};
    this.timeRange = Math.abs(tend - tstart);

    // Default Parameters:
    this.playbackRate = playbackRate || this.playbackRate;
    this.tweenTargets = tweenTargets || this.tweenTargets;
    this.repeat = repeat || this.repeat;
  }

  launch() {
    let durationMillis = this.timeRange*1000*this.playbackRate;
    this.tweenEngine = new TWEEN.Tween(this.timeline).to({t:this.tend}, durationMillis);
    this.tweenEngine.easing(TWEEN.Easing.Linear.None);
    this.tweenEngine.onUpdate((t) => this.updateTimeForAll(t));
    this.tweenEngine.onComplete(() => {
      if (this.repeat) {
        this.timeline.t = this.tstart;
        this.launch();
      }
    });
    // this.tweenEngine.start();
  }

  // TODO don't use callback, already exists with onStart()
  start() {
    if (this.preStartCallback) {
      this.preStartCallback();
    }
    this.tweenEngine.start();
    this.isPlaying = true;
  }

  // TODO don't use callback, already exists with onStop()
  stop() {
    if (this.preStopCallback) {
      this.preStopCallback();
    }
    this.tweenEngine.stop();
    this.isPlaying = false;
  }

  update() {
    let t = (this.timeline.t - this.tstart) / this.timeRange;
    this.tweenEngine.update(t);
  }

  updateTimeForAll() {
    // Update all targets with current time
    for (let ii = 0, len = this.tweenTargets.length; ii < len; ii++) {
      this.tweenTargets[ii](this.timeline.t)
    }
  }
}
