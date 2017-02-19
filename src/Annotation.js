Potree.Annotation = class extends THREE.EventDispatcher{
	
	constructor(scene, args = {}){
		super();
		
		
		this.scene = scene;
		this.title = args.title || "No Title";
		this.description = args.description || "";
		this.position = args.position || new THREE.Vector3(0,0,0);
		this.cameraPosition = (args.cameraPosition instanceof Array) ? 
			new THREE.Vector3().fromArray(args.cameraPosition) : args.cameraPosition;
		this.cameraTarget = (args.cameraTarget instanceof Array) ? 
			new THREE.Vector3().fromArray(args.cameraTarget) : args.cameraTarget;
		this.view = args.view || null;
		this.keepOpen = false;
		this.descriptionVisible = false;
		this.showDescription = true;
		this.actions = args.actions || [];
		this.isHighlighted = false;
		
		let iconClose = Potree.resourcePath + "/icons/close.svg";
		
		this.domElement = $(`
			<div class="annotation">
				<div class="annotation-titlebar">
					<span class="annotation-label">${this.title}</span>
				</div>
				<div class="annotation-description">
					<span class="annotation-description-close">
						<img src="${iconClose}" width="16px">
					</span>
					<span class="annotation-description-content"></span>
				</div>
			</div>
		`);
		
		this.elTitlebar = this.domElement.find(".annotation-titlebar");
		this.elTitle = this.elTitlebar.find(".annotation-label");
		this.elDescription = this.domElement.find(".annotation-description");
		this.elDescriptionClose = this.elDescription.find(".annotation-description-close");
		this.elDescriptionContent = this.elDescription.find(".annotation-description-content");
		
		this.elTitle.click(() => {
			if(this.hasView()){
				this.moveHere(this.scene.camera);
			}
			this.dispatchEvent({type: "click", target: this});
		});
        
		for(let action of this.actions){
			this.elTitle.css("padding", "1px 3px 0px 8px");
			
			let elButton = $(`<img src="${action.icon}" class="annotation-action-icon">`);
			this.elTitlebar.append(elButton);
			elButton.click(() => action.onclick());
		}
		
		this.elDescriptionClose.hover(
			e => this.elDescriptionClose.css("opacity", "1"),
			e => this.elDescriptionClose.css("opacity", "0.5")
		);
		this.elDescriptionClose.click(e => this.setHighlighted(false));
		this.elDescriptionContent.html(this.description);
		
		this.domElement.mouseenter(e => this.setHighlighted(true));
		this.domElement.mouseleave(e => this.setHighlighted(false));
		
		this.domElement.on("touchstart", e => {
			this.setHighlighted(!this.isHighlighted);
		});
	}
	
	setHighlighted(highlighted){
		if(highlighted){
			this.domElement.css("opacity", "0.8");
			this.elTitlebar.css("box-shadow", "0 0 5px #fff");
			this.domElement.css("z-index", "1000");
			
			if(this.description){
				this.descriptionVisible = true;	
				this.elDescription.css("display", "block");
				this.elDescription.css("position", "relative");
			}
		}else{
			this.domElement.css("opacity", "0.5");
			this.elTitlebar.css("box-shadow", "");
			this.domElement.css("z-index", "100");
			this.descriptionVisible = false;	
			this.elDescription.css("display", "none");
		}
		
		this.isHighlighted = highlighted;
	}
	
	hasView(){
		let hasView = this.cameraTarget instanceof THREE.Vector3;
		hasView = hasView && this.cameraPosition instanceof THREE.Vector3;
				
		return hasView;
	};
	
	moveHere(camera){		
		if(!this.hasView()){
			return;
		}
	
		var animationDuration = 800;
		var easing = TWEEN.Easing.Quartic.Out;
    
		{ // animate camera position
			let tween = new TWEEN.Tween(this.scene.view.position).to(this.cameraPosition, animationDuration);
			tween.easing(easing);
			tween.start();
		}
		
		{ // animate camera target
			var camTargetDistance = camera.position.distanceTo(this.cameraTarget);
			var target = new THREE.Vector3().addVectors(
				camera.position, 
				camera.getWorldDirection().clone().multiplyScalar(camTargetDistance)
			);
			var tween = new TWEEN.Tween(target).to(this.cameraTarget, animationDuration);
			tween.easing(easing);
			tween.onUpdate(() => {
				this.scene.view.lookAt(target);
			});
			tween.onComplete(() => {
				this.scene.view.lookAt(target);
				this.dispatchEvent({type: "focusing_finished", target: this});
			});
		}
    
		this.dispatchEvent({type: "focusing_started", target: this});
		tween.start();
	};
	
	dispose(){
		if(this.domElement.parentElement){
			this.domElement.parentElement.removeChild(this.domElement);
		}
    
	};
};
