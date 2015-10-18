Potree.Annotation = function(viewer, args){
	var scope = this;
	
	Potree.Annotation.counter++;
	
	this.viewer = viewer;
	this.ordinal = args.ordinal || Potree.Annotation.counter;
	this.title = args.title || "No Title";
	this.description = args.description || "";
	this.scene = args.scene || null;
	this.position = args.position || new THREE.Vector3(0,0,0);
	this.cameraPosition = args.cameraPosition;
	this.cameraTarget = args.cameraTarget || this.position;
	this.view = args.view || null;
	this.keepOpen = false;
	
	this.domElement = document.createElement("div");
	this.domElement.style.position = "fixed";
	this.domElement.style.opacity = "0.5";
	this.domElement.className = "annotation";

	this.elOrdinal = document.createElement("div");
	this.elOrdinal.style.position = "absolute";
	this.elOrdinal.style.width = "1.5em";
	this.elOrdinal.style.height = "1.5em";
	this.elOrdinal.style.color = "white";
	this.elOrdinal.style.backgroundColor = "black";
	this.elOrdinal.style.borderRadius = "1.5em";
	this.elOrdinal.style.fontSize = "1em";
	this.elOrdinal.style.opacity = "1";
	this.elOrdinal.style.zIndex = "100";
	this.domElement.appendChild(this.elOrdinal);
	this.elOrdinal.onmouseenter = function(){
		//scope.openBar();
	};
	this.elOrdinal.onmouseleave = function(){
		
	};
	this.elOrdinal.onclick = function(){
		scope.moveHere(scope.viewer.camera);
		//scope.openBar();
		//scope.keepOpen = true;
	};
	this.domElement.onmouseleave = function(){
		//scope.closeBar();
	};

	
	this.elOrdinalText = document.createElement("span");
	this.elOrdinalText.style.display = "inline-block";
	this.elOrdinalText.style.verticalAlign = "middle";
	this.elOrdinalText.style.lineHeight = "1.5em";
	this.elOrdinalText.style.textAlign = "center";
	this.elOrdinalText.style.width = "100%";
	//this.elOrdinalText.style.fontWeight = "bold";
	this.elOrdinalText.style.fontFamily = "Arial";
	this.elOrdinalText.style.cursor = "default";
	this.elOrdinalText.innerHTML = this.ordinal;
	this.elOrdinalText.userSelect = "none";
	this.elOrdinal.appendChild(this.elOrdinalText);
	
	
	this.elButtons = document.createElement("div");
	this.elButtons.style.position = "absolute";
	this.elButtons.style.display = "block";
	this.elButtons.style.height = "1.5em";
	this.elButtons.style.backgroundColor = "#333333";
	this.elButtons.style.zIndex = "50";
	this.elButtons.style.borderRadius = "1.5em 1.5em 1.5em 1.5em";
	this.elButtons.style.cursor = "default";
	this.elButtons.style.padding = "0.0em 0.0em 0em 1.5em";
	this.elButtons.style.whiteSpace = "nowrap";
	this.domElement.appendChild(this.elButtons);
	
	
	if(this.description){
		this.elButtonsInfo = document.createElement("img");
		this.elButtonsInfo.src = "../resources/icons/info_32x32.png";
		this.elButtonsInfo.style.width = "1.5em";
		this.elButtonsInfo.style.padding = "0em 0em 0em 0.2em";
		this.elButtons.appendChild(this.elButtonsInfo);
		this.elButtonsInfo.onclick = function(){
			scope.openDescriptionWindow();
		};
	}
	
	if(this.scene){
		this.elButtonsScene = document.createElement("img");
		this.elButtonsScene.src = "../resources/icons/goto_32x32.png";
		this.elButtonsScene.style.width = "1.5em";
		this.elButtonsScene.style.padding = "0em 0em 0em 0.2em";
		this.elButtonsScene.onclick = function(){loadScene(scope.scene)};
		
		this.elButtons.appendChild(this.elButtonsScene);
	}
	
	this.domElement.onmouseenter = function(){
		scope.domElement.style.opacity = "0.8";
	};
	this.domElement.onmouseleave = function(){
		scope.domElement.style.opacity = "0.5";
	};
	
	this.openBar = function(){
		scope.elOrdinal.style.opacity = 0.8;
		scope.elButtons.style.display = "block";
	};
	
	this.closeBar = function(){
		if(!this.keepOpen){
			scope.elOrdinal.style.opacity = 0.5;
			scope.elButtons.style.display = "none";
		}
	};
	
	this.openDescriptionWindow = function(){
		if(this.elDescription){
			this.elDescription.style.display = "block";
		}else{
			this.elDescription = document.createElement("div");
			this.elDescription.className = "description";
			
			this.elDescriptionHeader = document.createElement("div");
			this.elDescriptionHeader.className = "description-header";
			this.elDescription.appendChild(this.elDescriptionHeader);
		
			this.elDescriptionTitle = document.createElement("span");
			this.elDescriptionTitle.className = "description-title";
			this.elDescriptionTitle.innerHTML = scope.title;
			this.elDescriptionHeader.appendChild(this.elDescriptionTitle);
			
			this.elDescriptionButtons = document.createElement("span");
			this.elDescriptionButtons.className = "description-buttons";
			this.elDescriptionHeader.appendChild(this.elDescriptionButtons);
			
			this.elDescriptionClose = document.createElement("img");
			this.elDescriptionClose.src = "../resources/icons/close_32x32_black.png";
			this.elDescriptionClose.onmouseenter = function(){this.src = '../resources/icons/close_32x32_black_shadow.png'};
			this.elDescriptionClose.onmouseleave = function(){this.src = '../resources/icons/close_32x32_black.png'};
			this.elDescriptionClose.style.height = "1.5em";
			this.elDescriptionClose.onclick = function(){
			scope.elDescription.style.display = "none";
			};
			this.elDescriptionButtons.appendChild(this.elDescriptionClose);
			
			this.elDescriptionContent = document.createElement("div");
			this.elDescriptionContent.className = "description-content";
			this.elDescriptionContent.innerHTML = this.description;
			this.elDescription.appendChild(this.elDescriptionContent);
			
			document.body.appendChild(this.elDescription);
		}

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
		});

		tween.start();
	};
	
	this.dispose = function(){
		if(this.descriptionDialog){
			var id = "annotation_description_" + scope.ordinal;
			$( ("#" + id) ).dialog('destroy');
		}
		
		if(this.domElement.parentElement){
				this.domElement.parentElement.removeChild(this.domElement);
			}
		
		if(this.elDescription){
			if(this.elDescription.parentElement){
				this.elDescription.parentElement.removeChild(this.elDescription);
			}
		}
	};
};

Potree.Annotation.counter = 0;