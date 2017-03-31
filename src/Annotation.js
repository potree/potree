Potree.Annotation = class extends THREE.EventDispatcher{
	
	constructor(args = {}){
		super();
		
		this.scene = null;
		this.title = args.title || "No Title";
		this.description = args.description || "";
		
		if(!args.position){
			//this.position = new THREE.Vector3(0, 0, 0);
			this.position = null;
		}else if(args.position instanceof THREE.Vector3){
			this.position = args.position;
		}else{
			this.position = new THREE.Vector3(...args.position);
		}
		
		this.cameraPosition = (args.cameraPosition instanceof Array) ? 
			new THREE.Vector3().fromArray(args.cameraPosition) : args.cameraPosition;
		this.cameraTarget = (args.cameraTarget instanceof Array) ? 
			new THREE.Vector3().fromArray(args.cameraTarget) : args.cameraTarget;
		this.radius = args.radius;
		this.view = args.view || null;
		this.keepOpen = false;
		this.descriptionVisible = false;
		this.showDescription = true;
		this.actions = args.actions || [];
		this.isHighlighted = false;
		this._visible = true;
		this.__visible = true;
		this.collapseThreshold = [args.collapseThreshold, 100].find(e => e !== undefined);
		
		this.children = [];
		this.parent = null;
		this.boundingBox = new THREE.Box3();
		
		let iconClose = Potree.resourcePath + "/icons/close.svg";
		
		this.domElement = $(`
			<div class="annotation" oncontextmenu="return false;">
				<div class="annotation-titlebar">
					<span class="annotation-label">${this.title}</span>
				</div>
				<div class="annotation-description">
					<span class="annotation-description-close">
						<img src="${iconClose}" width="16px">
					</span>
					<span class="annotation-description-content">${this.description}</span>
				</div>
			</div>
		`);
		
		this.elTitlebar = this.domElement.find(".annotation-titlebar");
		this.elTitle = this.elTitlebar.find(".annotation-label");
		this.elDescription = this.domElement.find(".annotation-description");
		this.elDescriptionClose = this.elDescription.find(".annotation-description-close");
		//this.elDescriptionContent = this.elDescription.find(".annotation-description-content");
		
		this.elTitle.click(() => {
			if(this.hasView()){
				this.moveHere(this.scene.camera);
			}
			this.dispatchEvent({type: "click", target: this});
		});
		
		this.actions = this.actions.map(a => {
			if(a instanceof Potree.Action){
				return a;
			}else{
				return new Potree.Action(a);
			}
		});
		
		for(let action of this.actions){
			action.pairWith(this);
		}
        
		let actions = this.actions.filter(
			a => a.showIn === undefined || a.showIn.includes("scene"));
		
		for(let action of actions){
			this.elTitle.css("padding", "1px 3px 0px 8px");
			
			let elButton = $(`<img src="${action.icon}" class="annotation-action-icon">`);
			this.elTitlebar.append(elButton);
			elButton.click(() => action.onclick({annotation: this}));
		}
		
		this.elDescriptionClose.hover(
			e => this.elDescriptionClose.css("opacity", "1"),
			e => this.elDescriptionClose.css("opacity", "0.5")
		);
		this.elDescriptionClose.click(e => this.setHighlighted(false));
		//this.elDescriptionContent.html(this.description);
		
		this.domElement.mouseenter(e => this.setHighlighted(true));
		this.domElement.mouseleave(e => this.setHighlighted(false));
		
		this.domElement.on("touchstart", e => {
			this.setHighlighted(!this.isHighlighted);
		});
	}
	
	add(annotation){
		if(!this.children.includes(annotation)){
			this.children.push(annotation);
			annotation.parent = this;
			
			let c = this;
			while(c !== null){
				c.dispatchEvent({
					"type": "annotation_added",
					"annotation": annotation
				});
				c = c.parent;
			}
		}
	}
	
	level(){
		if(this.parent === null){
			return 0;
		}else{
			return this.parent.level() + 1;
		}
	}
	
	remove(annotation){
		this.children = this.children.filter(e => e !== annotation);
		annotation.parent = null;
	}
	
	updateBounds(){
		let box = new THREE.Box3();
		
		if(this.position){
			box.expandByPoint(this.position);
		}
		
		for(let child of this.children){
			child.updateBounds();
			
			box.union(child.boundingBox);
		}
		
		this.boundingBox.copy(box);
	}
	
	traverse(callback){
		let expand = callback(this);
		
		if(expand === undefined || expand === true){
			for(let child of this.children){
				child.traverse(callback);
			}
		}
	}
	
	traverseDescendants(callback){
		for(let child of this.children){
			child.traverse(callback);
		}
	}
	
	flatten(){
		let annotations = [];
		
		this.traverse(annotation => {
			annotations.push(annotation);
		});
		
		return annotations;
	}
	
	descendants(){
		let annotations = [];
		
		this.traverse(annotation => {
			if(annotation !== this){
				annotations.push(annotation);
			}
		});
		
		return annotations;
	}
	
	setHighlighted(highlighted){
		if(highlighted){
			this.domElement.css("opacity", "0.8");
			this.elTitlebar.css("box-shadow", "0 0 5px #fff");
			this.domElement.css("z-index", "1000");
			
			if(this.description){
				this.descriptionVisible = true;	
				//this.elDescription.css("display", "block");
				this.elDescription.fadeIn(200);
				this.elDescription.css("position", "relative");
			}
		}else{
			this.domElement.css("opacity", "0.5");
			this.elTitlebar.css("box-shadow", "");
			this.domElement.css("z-index", "100");
			this.descriptionVisible = false;	
			this.elDescription.css("display", "none");
			//this.elDescription.fadeOut(200);
		}
		
		this.isHighlighted = highlighted;
	}
	
	hasView(){
		let hasPosTargetView = this.cameraTarget instanceof THREE.Vector3;
		hasPosTargetView = hasPosTargetView && this.cameraPosition instanceof THREE.Vector3;
		
		let hasRadiusView = this.radius !== undefined;
		
		let hasView = hasPosTargetView || hasRadiusView;
				
		return hasView;
	};
	
	moveHere(camera){		
		if(!this.hasView()){
			return;
		}

		let view = this.scene.view;
		
		var animationDuration = 800;
		var easing = TWEEN.Easing.Quartic.Out;
		
		
		let endTarget;
		if(this.cameraTarget){
			endTarget = this.cameraTarget;
		}else if(this.position){
			endTarget = this.position;
		}else{
			endTarget = this.boundingBox.getCenter();
		}
		
		if(this.cameraPosition){
			
			let endPosition = this.cameraPosition;

			{ // animate camera position
				let tween = new TWEEN.Tween(view.position).to(endPosition, animationDuration);
				tween.easing(easing);
				tween.start();
			}
			
			{ // animate camera target
				var camTargetDistance = camera.position.distanceTo(endTarget);
				var target = new THREE.Vector3().addVectors(
					camera.position, 
					camera.getWorldDirection().clone().multiplyScalar(camTargetDistance)
				);
				var tween = new TWEEN.Tween(target).to(endTarget, animationDuration);
				tween.easing(easing);
				tween.onUpdate(() => {
					view.lookAt(target);
				});
				tween.onComplete(() => {
					view.lookAt(target);
					this.dispatchEvent({type: "focusing_finished", target: this});
				});
				
				this.dispatchEvent({type: "focusing_started", target: this});
				tween.start();
			}
		}else if(this.radius){
			let direction = view.direction;
			let endPosition = endTarget.clone().add(direction.multiplyScalar(-this.radius));
			let startRadius = view.radius;
			let endRadius = this.radius;
			
			{ // animate camera position
				let tween = new TWEEN.Tween(view.position).to(endPosition, animationDuration);
				tween.easing(easing);
				tween.start();
			}
			
			{ // animate radius
				let t = {x: 0};
			
				let tween = new TWEEN.Tween(t)
					.to({x: 1}, animationDuration)
					.onUpdate(function(){
						view.radius = this.x * endRadius + (1 - this.x) * startRadius;
					});
				tween.easing(easing);
				tween.start();
			}
			
		}
	};
	
	dispose(){
		if(this.domElement.parentElement){
			this.domElement.parentElement.removeChild(this.domElement);
		}
    
	};
	
	get visible(){
		return this._visible;
	}
	
	set visible(value){
		if(this._visible === value){
			return;
		}
		
		this._visible = value;
		
		if(!value){
			this.traverse(node => {
				node.__visible = false;
				node.domElement.css("display", "none");
			});
		}else{
			this.traverse(node => {
				node.__visible = true;
			});
		}
		
		this.dispatchEvent({
			type: "visibility_changed",
			annotation: this
		});
	}
	
	toString(){
		return "Annotation: " + this.title;
	}
};
