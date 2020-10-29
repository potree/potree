
/**
 * @author mrdoob / http://mrdoob.com/ https://github.com/mrdoob/eventdispatcher.js
 * 
 * with slight modifications by mschuetz, http://potree.org
 * 
 */

// The MIT License
// 
// Copyright (c) 2011 Mr.doob
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.





export class EventDispatcher{

	constructor(){
		this._listeners = {};
	}

	addEventListener(type, listener){

		const listeners = this._listeners;

		if(listeners[type] === undefined){
			listeners[type] = [];
		}

		if(listeners[type].indexOf(listener) === - 1){
			listeners[type].push( listener );
		}

	}

	hasEventListener(type, listener){

		const listeners = this._listeners;

		return listeners[type] !== undefined && listeners[type].indexOf(listener) !== - 1;
	}

	removeEventListener(type, listener){

		let listeners = this._listeners;
		let listenerArray = listeners[type];

		if (listenerArray !== undefined){

			let index = listenerArray.indexOf(listener);

			if(index !== - 1){
				listenerArray.splice(index, 1);
			}
		}

	}

	removeEventListeners(type){
		if(this._listeners[type] !== undefined){
			delete this._listeners[type];
		}
	};

	dispatchEvent(event){

		let listeners = this._listeners;
		let listenerArray = listeners[event.type];

		if ( listenerArray !== undefined ) {
			event.target = this;

			for(let listener of listenerArray.slice(0)){
				listener.call(this, event);
			}
		}

	}

}