class HoverMenuItem{

	constructor(icon, callback){
		this.icon = icon;
		this.callback = callback;
		
		this.element = $(`
			<span class="hover_menu_item">
				<img src="${icon}">
			</span>
		`);
		
		this.element.click(function(){
			callback();
		});
	}
};

class HoverMenu{

	constructor(icon){
		let scope = this;
	
		this.items = [];
	
		this.x = 0;
		this.y = 0;
		this.circumference = 32;
		
		this.element = $('<span class="hover_menu"></span>');
		this.elIcon = $(`<span class="hover_menu_icon">
			<img src="${icon}">
		</span>`);
		this.element.append(this.elIcon);
		
		this.element.click(function(){
			$(this).find(".hover_menu_item").fadeIn(200);
			$(this).find(".hover_menu_icon").fadeOut(200);
			
			$(this).css("left", (scope.x - scope.circumference - $(this).width() / 2) + "px");
			$(this).css("top", (scope.y - scope.circumference - $(this).height() / 2) + "px");
			$(this).css("border", scope.circumference + "px solid transparent");
		}).mouseleave(function(){
			$(this).find(".hover_menu_item").fadeOut(200);
			$(this).find(".hover_menu_icon").fadeIn(200);
			
			$(this).css("left", (scope.x - $(this).width() / 2) + "px");
			$(this).css("top", (scope.y - $(this).height() / 2) + "px");
			$(this).css("border", "0px solid black");
		});
	}
	
	addItem(item){
		this.items.push(item);
		this.element.append(item.element);
		item.element.hide();
		
		this.arrange();
	}
	
	removeItem(item){
		this.items = this.items.filter(e => e !== item);
		this.element.remove(item.element);
		
		this.arrange();
	}
	
	arrange(){
		let menuItems = this.element.find(".hover_menu_item");
		menuItems.each(function(index, value){
			let u = (index / menuItems.length) * Math.PI * 2;
			let radius = 22;
			let x = Math.cos(u) * radius;// + offset ;
			let y = Math.sin(u) * radius;// + offset ;
			
			$(this).css("left", x).css("top", y);
			
		});
	}
	
	setPosition(x, y){
		this.x = x;
		this.y = y;
		
		let rect = this.element.get(0).getBoundingClientRect();
		
		this.element.css("left", (this.x - rect.width / 2) + "px");
		this.element.css("top", (this.y - rect.height / 2) + "px");
	}

};