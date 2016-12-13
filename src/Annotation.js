Potree.Annotation = function(scene, args){
	var scope = this;
	
	Potree.Annotation.counter++;
	
	this.scene = scene;
	this.ordinal = args.title || Potree.Annotation.counter;
	this.title = args.title || "No Title";
	this.description = args.description || "";
	this.position = args.position || new THREE.Vector3(0,0,0);
	this.cameraPosition = args.cameraPosition;
	this.cameraTarget = args.cameraTarget || this.position;
	this.view = args.view || null;
	this.keepOpen = false;
	this.descriptionVisible = false;
	this.actions = args.actions || null;
	this.appearance = args.appearance || null;
	
	this.domElement = document.createElement("div");
	this.domElement.style.position = "absolute";
	this.domElement.style.opacity = "0.5";
	this.domElement.style.padding = "10px";
	this.domElement.style.whiteSpace = "nowrap";
	this.domElement.className = "annotation";
	
	if(this.appearance !== null){
		this.elOrdinal = document.createElement("div");
		this.elOrdinal.style.position = "relative";
		this.elOrdinal.style.zIndex = "100";
		this.elOrdinal.style.width = "fit-content";
		
		this.elOrdinal.innerHTML = this.appearance;
		this.domElement.appendChild(this.elOrdinal);
	}else{
		this.elOrdinal = document.createElement("div");
		this.elOrdinal.style.position = "relative";
		this.elOrdinal.style.color = "white";
		this.elOrdinal.style.backgroundColor = "black";
		this.elOrdinal.style.borderRadius = "1.5em";
		this.elOrdinal.style.fontSize = "1em";
		this.elOrdinal.style.opacity = "1";
		this.elOrdinal.style.margin = "auto";
		this.elOrdinal.style.zIndex = "100";
		this.elOrdinal.style.width = "fit-content";
		this.domElement.appendChild(this.elOrdinal);
		
		this.elOrdinalText = document.createElement("span");
		this.elOrdinalText.style.display = "inline-block";
		this.elOrdinalText.style.verticalAlign = "middle";
		this.elOrdinalText.style.lineHeight = "1.5em";
		this.elOrdinalText.style.textAlign = "center";
		this.elOrdinalText.style.fontFamily = "Arial";
		this.elOrdinalText.style.fontWeight = "bold";
		this.elOrdinalText.style.padding = "1px 8px 0px 8px";
		this.elOrdinalText.style.cursor = "default";
		this.elOrdinalText.innerHTML = this.ordinal;
		this.elOrdinalText.userSelect = "none";
		this.elOrdinal.appendChild(this.elOrdinalText);
		
		this.elOrdinal.onmouseenter = function(){};
		this.elOrdinal.onmouseleave = function(){};
		this.elOrdinalText.onclick = function(){
			scope.moveHere(scope.scene.camera);
			scope.dispatchEvent({type: "click", target: scope});
		};
	}
	
	this.domDescription = document.createElement("div");
	this.domDescription.style.position = "relative";
	this.domDescription.style.color = "white";
	this.domDescription.style.backgroundColor = "black";
	this.domDescription.style.padding = "10px";
	this.domDescription.style.margin = "5px 0px 0px 0px";
	this.domDescription.style.borderRadius = "4px";
	this.domDescription.style.display = "none";
	this.domDescription.className = "annotation";
	this.domElement.appendChild(this.domDescription);
	
	if(this.actions != null){
		this.elOrdinalText.style.padding = "1px 3px 0px 8px";
		
		for(let action of this.actions){
			let elButton = document.createElement("img");
		
			elButton.src = Potree.scriptPath + action.icon;
			elButton.style.width = "24px";
			elButton.style.height = "24px";
			elButton.style.filter = "invert(1)";
			elButton.style.display = "inline-block";
			elButton.style.verticalAlign = "middle";
			elButton.style.lineHeight = "1.5em";
			elButton.style.textAlign = "center";
			elButton.style.fontFamily = "Arial";
			elButton.style.fontWeight = "bold";
			elButton.style.padding = "1px 3px 0px 3px";
			elButton.style.cursor = "default";	
			
			this.elOrdinal.appendChild(elButton);
			
			elButton.onclick = function(){
				action.onclick();
			};
		}
	}
	
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
		var tween = new TWEEN.Tween(scope.scene.view.position).to(scope.cameraPosition, animationDuration);
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
			//camera.lookAt(target);
			scope.scene.view.target.copy(target);
		});
		tween.onComplete(function(){
			//camera.lookAt(target);
			scope.scene.view.target.copy(target);
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