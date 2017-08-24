/**
 *
 * @param node
 * @class an item in the lru list.
 */
function LRUItem (node) {
	this.previous = null;
	this.next = null;
	this.node = node;
}
