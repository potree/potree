Potree.Annotation = function(viewer, args){
	var scope = this;
	
	Potree.Annotation.counter++;
	
	this.viewer = viewer;
	this.ordinal = args.title || Potree.Annotation.counter;
	this.title = args.title || "No Title";
	this.description = args.description || "";
	this.scene = args.scene || null;
	this.position = args.position || new THREE.Vector3(0,0,0);
	this.cameraPosition = args.cameraPosition;
	this.cameraTarget = args.cameraTarget || this.position;
	this.view = args.view || null;
	this.keepOpen = false;
	this.descriptionVisible = false;
	
	this.domElement = document.createElement("div");
	this.domElement.style.position = "absolute";
	this.domElement.style.opacity = "0.5";
	//this.domElement.style.border = "1px solid red";
	this.domElement.style.padding = "10px";
	this.domElement.style.whiteSpace = "nowrap";
	this.domElement.className = "annotation";
	
	this.elOrdinal = document.createElement("div");
	this.elOrdinal.style.position = "relative";
	//this.elOrdinal.style.width = "1.5em";
	//this.elOrdinal.style.height = "1.5em";
	this.elOrdinal.style.color = "white";
	this.elOrdinal.style.backgroundColor = "black";
	this.elOrdinal.style.borderRadius = "1.5em";
	this.elOrdinal.style.fontSize = "1em";
	this.elOrdinal.style.opacity = "1";
	this.elOrdinal.style.margin = "auto";
	this.elOrdinal.style.zIndex = "100";
	this.elOrdinal.style.width = "fit-content";
	this.domElement.appendChild(this.elOrdinal);
	
	this.domDescription = document.createElement("div");
	this.domDescription.style.position = "relative";
	this.domDescription.style.color = "white";
	this.domDescription.style.backgroundColor = "black";
	this.domDescription.style.padding = "10px";
	this.domDescription.style.margin = "5px 0px 0px 0px";
	this.domDescription.style.borderRadius = "4px";
	this.domDescription.style.display = "none";
	this.domDescription.className = "annotation";
	//this.domDescription.style.top = "20";
	//this.domDescription.style.left = "-100";
	this.domElement.appendChild(this.domDescription);
	
	this.elOrdinal.onmouseenter = function(){
		
	};
	this.elOrdinal.onmouseleave = function(){

	};
	this.elOrdinal.onclick = function(){
		scope.moveHere(scope.viewer.camera);
		scope.dispatchEvent({type: "click", target: scope});
		if(scope.viewer.geoControls){
			scope.viewer.geoControls.setTrack(null);
		}
	};

	
	this.elOrdinalText = document.createElement("span");
	this.elOrdinalText.style.display = "inline-block";
	this.elOrdinalText.style.verticalAlign = "middle";
	this.elOrdinalText.style.lineHeight = "1.5em";
	this.elOrdinalText.style.textAlign = "center";
	//this.elOrdinalText.style.width = "100%";
	this.elOrdinalText.style.fontFamily = "Arial";
	this.elOrdinalText.style.fontWeight = "bold";
	this.elOrdinalText.style.padding = "1px 8px 0px 8px";
	this.elOrdinalText.style.cursor = "default";
	this.elOrdinalText.innerHTML = this.ordinal;
	this.elOrdinalText.userSelect = "none";
	this.elOrdinal.appendChild(this.elOrdinalText);
	
	this.elDescriptionText = document.createElement("span");
	this.elDescriptionText.style.color = "#ffffff";
	this.elDescriptionText.innerHTML = this.description;
	this.domDescription.appendChild(this.elDescriptionText);
	
	this.domElement.onmouseenter = function(){
		scope.domElement.style.opacity = "0.8";
		scope.domElement.style.zIndex = "1000";
		if(scope.description){
			scope.descriptionVisible = true;	
			scope.domDescription.style.display = "block";
		}
	};
	this.domElement.onmouseleave = function(){
		scope.domElement.style.opacity = "0.5";
		scope.domElement.style.zIndex = "100";
		scope.descriptionVisible = true;	
		scope.domDescription.style.display = "none";
	};
	
	this.moveHere = function(camera){		
		var animationDuration = 800;
		var easing = TWEEN.Easing.Quartic.Out;

		// animate camera position
		var tween = new TWEEN.Tween(camera.position).to(scope.cameraPosition, animationDuration);
		tween.easing(easing);
		tween.start();
		
		// animate camera target
		var camTargetDistance = camera.position.distanceTo(scope.cameraTarget);
		var target = new THREE.Vector3().addVectors(
			camera.position, 
			camera.getWorldDirection().clone().multiplyScalar(camTargetDistance)
		);
		var tween = new TWEEN.Tween(target).to(scope.cameraTarget, animationDuration);
		tween.easing(easing);
		tween.onUpdate(function(){
			camera.lookAt(target);
			scope.viewer.orbitControls.target.copy(target);
		});
		tween.onComplete(function(){
			camera.lookAt(target);
			scope.viewer.orbitControls.target.copy(target);
			scope.dispatchEvent({type: "focusing_finished", target: scope});
		});

		scope.dispatchEvent({type: "focusing_started", target: scope});
		tween.start();
	};
	
	this.dispose = function(){

		
		if(this.domElement.parentElement){
			this.domElement.parentElement.removeChild(this.domElement);
		}

	};
};

Potree.Annotation.prototype = Object.create( THREE.EventDispatcher.prototype );

Potree.Annotation.counter = 0;