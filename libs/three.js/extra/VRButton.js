
// Adapted from three.js VRButton


class VRButton {

	constructor(){
		this.onStartListeners = [];
		this.onEndListeners = [];
		this.element = null;
	}

	onStart(callback){
		this.onStartListeners.push(callback);
	}

	onEnd(callback){
		this.onEndListeners.push(callback);
	}

	static async createButton( renderer, options ) {

		if ( options ) {

			console.error( 'THREE.VRButton: The "options" parameter has been removed. Please set the reference space type via renderer.xr.setReferenceSpaceType() instead.' );

		}

		const button = new VRButton();
		const element = document.createElement( 'button' );

		button.element = element;

		function setEnter(){
			button.element.innerHTML = `
				<div style="font-size: 0.5em;">ENTER</div>
				<div style="font-weight: bold;">VR</div>
			`;
		}

		function setExit(){
			button.element.innerHTML = `
				<div style="font-size: 0.5em;">EXIT</div>
				<div style="font-weight: bold;">VR</div>
			`;
		}

		function showEnterVR( /*device*/ ) {

			let currentSession = null;

			function onSessionStarted( session ) {

				session.addEventListener( 'end', onSessionEnded );

				for(let listener of button.onStartListeners){
					listener();
				}


				renderer.xr.setSession( session );
				setExit();

				currentSession = session;

			}

			function onSessionEnded( /*event*/ ) {

				currentSession.removeEventListener( 'end', onSessionEnded );

				for(let listener of button.onEndListeners){
					listener();
				}

				setEnter();

				currentSession = null;

			}

			//

			button.element.style.display = '';

			button.element.style.cursor = 'pointer';

			setEnter();

			button.element.onmouseenter = function () {

				button.element.style.opacity = '1.0';

			};

			button.element.onmouseleave = function () {

				button.element.style.opacity = '0.7';

			};

			button.element.onclick = function () {

				if ( currentSession === null ) {

					// WebXR's requestReferenceSpace only works if the corresponding feature
					// was requested at session creation time. For simplicity, just ask for
					// the interesting ones as optional features, but be aware that the
					// requestReferenceSpace call will fail if it turns out to be unavailable.
					// ('local' is always available for immersive sessions and doesn't need to
					// be requested separately.)

					const sessionInit = { optionalFeatures: [ 'local-floor', 'bounded-floor', 'hand-tracking' ] };
					navigator.xr.requestSession( 'immersive-vr', sessionInit ).then( onSessionStarted );

				} else {

					currentSession.end();

				}

			};

		}

		function stylizeElement( element ) {

			element.style.position = 'absolute';
			element.style.bottom = '20px';
			element.style.padding = '12px 6px';
			element.style.border = '1px solid #fff';
			element.style.borderRadius = '4px';
			element.style.background = 'rgba(0,0,0,0.1)';
			element.style.color = '#fff';
			element.style.font = 'normal 13px sans-serif';
			element.style.textAlign = 'center';
			element.style.opacity = '0.7';
			element.style.outline = 'none';
			element.style.zIndex = '999';

		}

		if ( 'xr' in navigator ) {

			button.element.id = 'VRButton';
			button.element.style.display = 'none';

			stylizeElement( button.element );

			let supported = await navigator.xr.isSessionSupported( 'immersive-vr' );

			if(supported){
				showEnterVR();

				return button;
			}else{
				return null;
			}

		} else {

			if ( window.isSecureContext === false ) {

				console.log("WEBXR NEEDS HTTPS");

			} else {

				console.log("WEBXR not available");

			}

			return null;



		}

	}

}

export { VRButton };
