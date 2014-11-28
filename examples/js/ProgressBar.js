

function ProgressBar(){
	this._progress = 0;
	this._message = "";
	
	this.maxOpacity = 0.6;
	
	this.element = document.createElement("div");
	this.element.innerHTML = "";
	this.element.style.position = "fixed";
	this.element.style.bottom = "20px";
	this.element.style.width = "200px";
	this.element.style.marginLeft = "-100px";
	this.element.style.left = "50%";
	this.element.style.borderRadius = "5px";
	this.element.style.border = "1px solid #727678";
	this.element.style.height = "16px";
	this.element.style.padding = "1px";
	//	this.element.style.backgroundColor = "white";
	this.element.style.backgroundImage  = "-webkit-linear-gradient(right, #f2f6f8 0%,#d8e1e7 50%,#b5c6d0 51%,#e0eff9 100%)";
	this.element.style.textAlign = "center";
	this.element.style.opacity = this.maxOpacity;
	
	document.body.appendChild(this.element);
};

ProgressBar.prototype.hide = function(){
	this.element.style.opacity = 0;
	this.element.style.transition = "all 0.2s ease";
};

ProgressBar.prototype.show = function(){
	this.element.style.opacity = this.maxOpacity;
	this.element.style.transition = "all 0.2s ease";
};

Object.defineProperty(ProgressBar.prototype, "progress", {
	get: function(){
		return this._progress;
	},
	set: function(value){
		this._progress = value;
		this.element.style.backgroundImage  = "-webkit-linear-gradient(left, #f2f6f8 0%,#d8e1e7 " + (value * 100) + "%,#b5c6d0 " + (value * 100 + 1) + "%,#e0eff9 100%)";
	}
});

Object.defineProperty(ProgressBar.prototype, "message", {
	get: function(){
		return this._message;
	},
	set: function(message){
		this._message = message;
		this.element.innerHTML = message;
	}
});