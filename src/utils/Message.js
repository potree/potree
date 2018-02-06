
Potree.Message = class Message{

	constructor(content){
		this.content = content;

		let closeIcon = `${Potree.resourcePath}/icons/close.svg`;

		this.element = $(`
			<div class="potree_message">
				<span name="content_container" style="flex-grow: 1; padding: 5px"></span>
				<img name="close" src="${closeIcon}" class="button-icon" style="width: 16px; height: 16px;">
			</div>`);

		this.elClose = this.element.find("img[name=close]");

		let elContainer = this.element.find("span[name=content_container]");

		if(typeof content === "string"){
			elContainer.append($(`<span>${content}</span>`));
		}else{
			elContainer.append(content);
		}

	}

};