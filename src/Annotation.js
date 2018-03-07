Potree.Annotation = class extends THREE.EventDispatcher {
	constructor (args = {}) {
		super();

		let valueOrDefault = (a, b) => {
			if(a === null || a === undefined){
				return b;
			}else{
				return a;
			}
		};

		this.scene = null;
		this._title = args.title || 'No Title';
		this._description = args.description || '';

		if (!args.position) {
			this.position = null;
		} else if (args.position instanceof THREE.Vector3) {
			this.position = args.position;
		} else {
			this.position = new THREE.Vector3(...args.position);
		}

		this.cameraPosition = (args.cameraPosition instanceof Array)
			? new THREE.Vector3().fromArray(args.cameraPosition) : args.cameraPosition;
		this.cameraTarget = (args.cameraTarget instanceof Array)
			? new THREE.Vector3().fromArray(args.cameraTarget) : args.cameraTarget;
		this.radius = args.radius;
		this.view = args.view || null;
		this.keepOpen = false;
		this.descriptionVisible = false;
		this.showDescription = true;
		this.actions = args.actions || [];
		this.isHighlighted = false;
		this._visible = true;
		this.__visible = true;
		this._display = true;
		this._expand = false;
		this.collapseThreshold = [args.collapseThreshold, 100].find(e => e !== undefined);

		this.children = [];
		this.parent = null;
		this.boundingBox = new THREE.Box3();

		let iconClose = Potree.resourcePath + '/icons/close.svg';

		this.domElement = $(`
			<div class="annotation" oncontextmenu="return false;">
				<div class="annotation-titlebar">
					<span class="annotation-label"></span>
				</div>
				<div class="annotation-description">
					<span class="annotation-description-close">
						<img src="${iconClose}" width="16px">
					</span>
					<span class="annotation-description-content">${this._description}</span>
				</div>
			</div>
		`);

		this.elTitlebar = this.domElement.find('.annotation-titlebar');
		this.elTitle = this.elTitlebar.find('.annotation-label');
		this.elTitle.append(this._title);
		this.elDescription = this.domElement.find('.annotation-description');
		this.elDescriptionClose = this.elDescription.find('.annotation-description-close');
		// this.elDescriptionContent = this.elDescription.find(".annotation-description-content");

		this.clickTitle = () => {
			if(this.hasView()){
				this.moveHere(this.scene.getActiveCamera());
			}
			this.dispatchEvent({type: 'click', target: this});
		};

		this.elTitle.click(this.clickTitle);

		this.actions = this.actions.map(a => {
			if (a instanceof Potree.Action) {
				return a;
			} else {
				return new Potree.Action(a);
			}
		});

		for (let action of this.actions) {
			action.pairWith(this);
		}

		let actions = this.actions.filter(
			a => a.showIn === undefined || a.showIn.includes('scene'));

		for (let action of actions) {
			let elButton = $(`<img src="${action.icon}" class="annotation-action-icon">`);
			this.elTitlebar.append(elButton);
			elButton.click(() => action.onclick({annotation: this}));
		}

		this.elDescriptionClose.hover(
			e => this.elDescriptionClose.css('opacity', '1'),
			e => this.elDescriptionClose.css('opacity', '0.5')
		);
		this.elDescriptionClose.click(e => this.setHighlighted(false));
		// this.elDescriptionContent.html(this._description);

		this.domElement.mouseenter(e => this.setHighlighted(true));
		this.domElement.mouseleave(e => this.setHighlighted(false));

		this.domElement.on('touchstart', e => {
			this.setHighlighted(!this.isHighlighted);
		});

		this.display = false;
		//this.display = true;

	}

	get visible () {
		return this._visible;
	}

	set visible (value) {
		if (this._visible === value) {
			return;
		}

		this._visible = value;

		//this.traverse(node => {
		//	node.display = value;
		//});

		this.dispatchEvent({
			type: 'visibility_changed',
			annotation: this
		});
	}

	get display () {
		return this._display;
	}

	set display (display) {
		if (this._display === display) {
			return;
		}

		this._display = display;

		if (display) {
			// this.domElement.fadeIn(200);
			this.domElement.show();
		} else {
			// this.domElement.fadeOut(200);
			this.domElement.hide();
		}
	}

	get expand () {
		return this._expand;
	}

	set expand (expand) {
		if (this._expand === expand) {
			return;
		}

		if (expand) {
			this.display = false;
		} else {
			this.display = true;
			this.traverseDescendants(node => {
				node.display = false;
			});
		}

		this._expand = expand;
	}

	get title () {
		return this._title;
	}

	set title (title) {
		if (this._title === title) {
			return;
		}

		this._title = title;
		this.elTitle.empty();
		this.elTitle.append(this._title);
	}

	get description () {
		return this._description;
	}

	set description (description) {
		if (this._description === description) {
			return;
		}

		this._description = description;

		const elDescriptionContent = this.elDescription.find(".annotation-description-content");
		elDescriptionContent.empty();
		elDescriptionContent.append(this._description);
	}

	add (annotation) {
		if (!this.children.includes(annotation)) {
			this.children.push(annotation);
			annotation.parent = this;

			let descendants = [];
			annotation.traverse(a => { descendants.push(a); });

			for (let descendant of descendants) {
				let c = this;
				while (c !== null) {
					c.dispatchEvent({
						'type': 'annotation_added',
						'annotation': descendant
					});
					c = c.parent;
				}
			}
		}
	}

	level () {
		if (this.parent === null) {
			return 0;
		} else {
			return this.parent.level() + 1;
		}
	}

	hasChild(annotation) {
		return this.children.includes(annotation);
	}

	remove (annotation) {
		if (this.hasChild(annotation)) {
			annotation.removeAllChildren();
			annotation.dispose();
			this.children = this.children.filter(e => e !== annotation);
			annotation.parent = null;
		}
	}

	removeAllChildren() {
		this.children.forEach((child) => {
			if (child.children.length > 0) {
				child.removeAllChildren();
			}

			this.remove(child);
		});
	}

	updateBounds () {
		let box = new THREE.Box3();

		if (this.position) {
			box.expandByPoint(this.position);
		}

		for (let child of this.children) {
			child.updateBounds();

			box.union(child.boundingBox);
		}

		this.boundingBox.copy(box);
	}

	traverse (handler) {
		let expand = handler(this);

		if (expand === undefined || expand === true) {
			for (let child of this.children) {
				child.traverse(handler);
			}
		}
	}

	traverseDescendants (handler) {
		for (let child of this.children) {
			child.traverse(handler);
		}
	}

	flatten () {
		let annotations = [];

		this.traverse(annotation => {
			annotations.push(annotation);
		});

		return annotations;
	}

	descendants () {
		let annotations = [];

		this.traverse(annotation => {
			if (annotation !== this) {
				annotations.push(annotation);
			}
		});

		return annotations;
	}

	setHighlighted (highlighted) {
		if (highlighted) {
			this.domElement.css('opacity', '0.8');
			this.elTitlebar.css('box-shadow', '0 0 5px #fff');
			this.domElement.css('z-index', '1000');

			if (this._description) {
				this.descriptionVisible = true;
				this.elDescription.fadeIn(200);
				this.elDescription.css('position', 'relative');
			}
		} else {
			this.domElement.css('opacity', '0.5');
			this.elTitlebar.css('box-shadow', '');
			this.domElement.css('z-index', '100');
			this.descriptionVisible = false;
			this.elDescription.css('display', 'none');
		}

		this.isHighlighted = highlighted;
	}

	hasView () {
		let hasPosTargetView = this.cameraTarget instanceof THREE.Vector3;
		hasPosTargetView = hasPosTargetView && this.cameraPosition instanceof THREE.Vector3;

		let hasRadiusView = this.radius !== undefined;

		let hasView = hasPosTargetView || hasRadiusView;

		return hasView;
	};

	moveHere (camera) {
		if (!this.hasView()) {
			return;
		}

		let view = this.scene.view;
		let animationDuration = 500;
		let easing = TWEEN.Easing.Quartic.Out;

		let endTarget;
		if (this.cameraTarget) {
			endTarget = this.cameraTarget;
		} else if (this.position) {
			endTarget = this.position;
		} else {
			endTarget = this.boundingBox.getCenter();
		}

		if (this.cameraPosition) {
			let endPosition = this.cameraPosition;

			Potree.utils.moveTo(this.scene, endPosition, endTarget);

			//{ // animate camera position
			//	let tween = new TWEEN.Tween(view.position).to(endPosition, animationDuration);
			//	tween.easing(easing);
			//	tween.start();
			//}

			//{ // animate camera target
			//	let camTargetDistance = camera.position.distanceTo(endTarget);
			//	let target = new THREE.Vector3().addVectors(
			//		camera.position,
			//		camera.getWorldDirection().clone().multiplyScalar(camTargetDistance)
			//	);
			//	let tween = new TWEEN.Tween(target).to(endTarget, animationDuration);
			//	tween.easing(easing);
			//	tween.onUpdate(() => {
			//		view.lookAt(target);
			//	});
			//	tween.onComplete(() => {
			//		view.lookAt(target);
			//		this.dispatchEvent({type: 'focusing_finished', target: this});
			//	});

			//	this.dispatchEvent({type: 'focusing_started', target: this});
			//	tween.start();
			//}
		} else if (this.radius) {
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
					.onUpdate(function () {
						view.radius = this.x * endRadius + (1 - this.x) * startRadius;
					});
				tween.easing(easing);
				tween.start();
			}
		}
	};

	dispose () {
		if (this.domElement.parentElement) {
			this.domElement.parentElement.removeChild(this.domElement);
		}
	};

	toString () {
		return 'Annotation: ' + this._title;
	}
};
