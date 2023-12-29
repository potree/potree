class CustomEvent {
  constructor() {
	this._config = new Map();
	this._debugMode = false;
  }
  _getArrayOfEvent(eventName) {
    const value = this._config.get(eventName);
    if (value) {
      return value;
    }
    const arr = [];
    this._config.set(eventName, arr);
    return arr;
  }
  addEventListener(eventName, callback) {

	this._log('addEventListener', eventName)
    if (typeof callback !== "function") {
	this._log('addEventListener failure', eventName)
      return;
    }
    const arr = this._getArrayOfEvent(eventName);
	this._log('addEventListener success', arr)
    arr.push(callback);
    return arr;
  }
  removeEventListener(eventName, callback) {
	this._log('removeEventListener', eventName)
	const arr = this._getArrayOfEvent(eventName);
	this._log('removeEventListener arr', arr)
	const index = arr.indexOf(callback);
	arr.splice(index, 1);
	if(arr.length === 0) {
		console.log('DELETE EVENT');
	}
  }
  setDebugMode(value) {
    this._debugMode = !!value;
  }
  getDebugMode() {
    return this._debugMode;
  }
  emit(eventName, event) {
	this._log('emit', eventName, event)
	const arr = this._getArrayOfEvent(eventName);
	this._log('emit functions', arr)
	for (const fun of arr) {
		fun(event);
	}
  }
  _log(...params) {
	if(!this._debugMode) {
		return;
	}
	console.warn('EVENT', ...params);
  }
}

export const gizilCustomEvent = new CustomEvent();
export const GizilEvent = {
	OCTREE_LOADER: 'OCTREE_LOADER',
	IMAGE_FOCUSED: 'IMAGE_FOCUSED',

}
