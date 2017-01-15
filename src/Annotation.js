Potree.Annotation = function(scene, args = {}){
	var scope = this;
	
	Potree.Annotation.counter++;
	
	this.scene = scene;
	this.ordinal = args.title || Potree.Annotation.counter;
	this.title = args.title || "No Title";
	this.description = args.description || "";
	this.position = args.position || new THREE.Vector3(0,0,0);
	this.cameraPosition = args.cameraPosition;
	this.cameraTarget = args.cameraTarget;
	this.view = args.view || null;
	this.keepOpen = false;
	this.descriptionVisible = false;
	this.actions = args.actions || [];
	this.appearance = args.appearance || null;
	
	this.domElement = document.createElement("div");
	this.domElement.style.position = "absolute";
	this.domElement.style.opacity = "0.5";
	this.domElement.style.padding = "10px";
	//this.domElement.style.whiteSpace = "nowrap";
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
		this.elOrdinalText.style.userSelect = "none";
		this.elOrdinal.appendChild(this.elOrdinalText);
		
		this.elOrdinal.onmouseenter = function(){};
		this.elOrdinal.onmouseleave = function(){};
		this.elOrdinalText.onclick = () => {
			if(this.hasView()){
				this.moveHere(this.scene.camera);
			}
			this.dispatchEvent({type: "click", target: this});
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
	this.domDescription.style.maxWidth = "500px";
	this.domDescription.className = "annotation";
	this.domElement.appendChild(this.domDescription);
	
	if(this.actions.length > 0){
		this.elOrdinalText.style.padding = "1px 3px 0px 8px";
		
		for(let action of this.actions){
			let elButton = document.createElement("img");
		
			elButton.src = action.icon;
			elButton.style.width = "24px";
			elButton.style.height = "24px";
			elButton.style.filter = "invert(1)";
			elButton.style.display = "inline-block";
			elButton.style.verticalAlign = "middle";
			elButton.style.lineHeight = "1.5em";
			elButton.style.textAlign = "center";
			elButton.style.fontFamily = "Arial";
			elButton.style.fontWeight = "bold";
			elButton.style.padding = "1px 8px 0px 1px";
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
	
	this.domElement.onmouseenter = () => {
		this.setHighlighted(true);
		//this.domElement.style.opacity = "0.8";
		//this.domElement.style.zIndex = "1000";
		//if(this.description){
		//	this.descriptionVisible = true;	
		//	this.domDescription.style.display = "block";
		//}
	};
	
	this.domElement.onmouseleave = () => {
		this.setHighlighted(false);
		//this.domElement.style.opacity = "0.5";
		//this.domElement.style.zIndex = "100";
		//this.descriptionVisible = true;	
		//this.domDescription.style.display = "none";
	};
	
	this.setHighlighted = function(highlighted){
		if(highlighted){
			this.domElement.style.opacity = "1.0";
			this.elOrdinal.style.boxShadow = "0 0 5px #fff";
			this.domElement.style.zIndex = "1000";
			
			if(this.description){
				this.descriptionVisible = true;	
				this.domDescription.style.display = "block";
			}
			
		}else{
			this.domElement.style.opacity = "0.5";
			this.elOrdinal.style.boxShadow = "";
			this.domElement.style.zIndex = "100";
			this.descriptionVisible = true;	
			this.domDescription.style.display = "none";
		}
	};
	
	this.hasView = function(){
		let hasView = this.cameraTarget instanceof THREE.Vector3;
		hasView = hasView && this.cameraPosition instanceof THREE.Vector3;
				
		return hasView;
	};
	
	this.moveHere = function(camera){		
		if(!this.hasView()){
			return;
		}
	
		var animationDuration = 800;
		var easing = TWEEN.Easing.Quartic.Out;

		{ // animate camera position
			let tween = new TWEEN.Tween(scope.scene.view.position).to(scope.cameraPosition, animationDuration);
			tween.easing(easing);
			tween.onUpdate(function(){
				console.log(scope.scene.view.position);
			});
			tween.start();
		}
		
		{ // animate camera target
			var camTargetDistance = camera.position.distanceTo(scope.cameraTarget);
			var target = new THREE.Vector3().addVectors(
				camera.position, 
				camera.getWorldDirection().clone().multiplyScalar(camTargetDistance)
			);
			var tween = new TWEEN.Tween(target).to(scope.cameraTarget, animationDuration);
			tween.easing(easing);
			tween.onUpdate(function(){
				//camera.lookAt(target);
				scope.scene.view.lookAt(target);
			});
			tween.onComplete(function(){
				//camera.lookAt(target);
				scope.scene.view.lookAt(target);
				scope.dispatchEvent({type: "focusing_finished", target: scope});
			});
		}

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