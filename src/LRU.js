

/**
 * 
 * @param node
 * @class an item in the lru list. 
 */
function LRUItem(node){
	this.previous = null;
	this.next = null;
	this.node = node;
}

/**
 * 
 * @class A doubly-linked-list of the least recently used elements.
 */
function LRU(){
	// the least recently used item
	this.first = null;
	// the most recently used item
	this.last = null;
	// a list of all items in the lru list
	this.items = {};
	this.elements = 0;
	this.numPoints = 0;
}

/**
 * number of elements in the list
 * 
 * @returns {Number}
 */
LRU.prototype.size = function(){
	return this.elements;
};

LRU.prototype.contains = function(node){
	return this.items[node.id] == null;
};

/**
 * makes node the most recently used item. if the list does not contain node, it will be added.
 * 
 * @param node
 */
LRU.prototype.touch = function(node){
	if(!node.loaded){
		return;
	}

	var item;
	if(this.items[node.id] == null){
		// add to list
		item = new LRUItem(node);
		item.previous = this.last;
		this.last = item;
		if(item.previous !== null){
			item.previous.next = item;
		}
		
		this.items[node.id] = item;
		this.elements++;
		
		if(this.first === null){
			this.first = item;
		}
		this.numPoints += node.numPoints;
	}else{
		// update in list
		item = this.items[node.id];
		if(item.previous === null){
			// handle touch on first element
			if(item.next !== null){
				this.first = item.next;
				this.first.previous = null;
				item.previous = this.last;
				item.next = null;
				this.last = item;
				item.previous.next = item;
			}
		}else if(item.next === null){
			// handle touch on last element
		}else{
			// handle touch on any other element
			item.previous.next = item.next;
			item.next.previous = item.previous;
			item.previous = this.last;
			item.next = null;
			this.last = item;
			item.previous.next = item;
		}
		
		
	}
};

///**
// * removes the least recently used item from the list and returns it. 
// * if the list was empty, null will be returned.
// */
//LRU.prototype.remove = function remove(){
//	if(this.first === null){
//		return null;
//	}
//	var lru = this.first;
//
//	// if the lru list contains at least 2 items, the item after the least recently used elemnt will be the new lru item. 
//	if(lru.next !== null){
//		this.first = lru.next;
//		this.first.previous = null;
//	}else{
//		this.first = null;
//		this.last = null;
//	}
//	
//	delete this.items[lru.node.id];
//	this.elements--;
//	this.numPoints -= lru.node.numPoints;
//	
////	Logger.info("removed node: " + lru.node.id);
//	return lru.node;
//};

LRU.prototype.remove = function remove(node){

	var lruItem = this.items[node.id];
	if(lruItem){
	
		if(this.elements === 1){
			this.first = null;
			this.last = null;
		}else{
			if(!lruItem.previous){
				this.first = lruItem.next;
				this.first.previous = null;
			}
			if(!lruItem.next){
				this.last = lruItem.previous;
				this.last.next = null;
			}
			if(lruItem.previous &&lruItem.next){
				lruItem.previous.next = lruItem.next;
				lruItem.next.previous = lruItem.previous;
			}
		}
	
		delete this.items[node.id];
		this.elements--;
		this.numPoints -= node.numPoints;
	}
	
};

LRU.prototype.getLRUItem = function(){
	if(this.first === null){
		return null;
	}
	var lru = this.first;
	
	return lru.node;
};

LRU.prototype.toString = function(){
	var string = "{ ";
	var curr = this.first;
	while(curr !== null){
		string += curr.node.id;
		if(curr.next !== null){
			string += ", ";
		}
		curr = curr.next;
	}
	string += "}";
	string += "(" + this.size() + ")";
	return string;
};

LRU.prototype.freeMemory = function(){
	if(this.elements <= 1){
		return;
	}

	while(this.numPoints > Potree.pointLoadLimit){
		var element = this.first;
		var node = element.node;
		this.disposeDescendants(node);
	
	}
};

LRU.prototype.disposeDescendants = function(node){
	var stack = [];
	stack.push(node);
	while(stack.length > 0){
		var current = stack.pop();
		
		//console.log(current);
		
		current.dispose();
		this.remove(current);
		
		for(var key in current.children){
			if(current.children.hasOwnProperty(key)){
				var child = current.children[key];
				if(child.loaded){
					stack.push(current.children[key]);
				}
			}
		}
	}
};