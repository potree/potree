
const path = require('path');
const fs = require("fs");
const fsp = fs.promises;


function createIconsPage(){
	let iconsPath = "resources/icons";

	fs.readdir(iconsPath, function(err, items) {

		let svgs = items.filter(item => item.endsWith(".svg"));
		let other = items.filter(item => !item.endsWith(".svg"));

		items = [...svgs, ...other];

		let iconsCode = ``;
		for(let item of items){
			let extension = path.extname(item);
			if(![".png", ".svg", ".jpg", ".jpeg"].includes(extension)){
				continue;
			}

			let iconCode = `
			<span class="icon_container" style="position: relative; float: left">
				<center>
				<img src="${item}" style="height: 32px;"/>
				<div style="font-weight: bold">${item}</div>
				</center>
			</span>
			`;

			//iconsCode += `<img src="${item}" />\n`;
			iconsCode += iconCode;
		}

		let page = `
			<html>
				<head>
					<style>
						.icon_container{
							border: 1px solid black;
							margin: 10px;
							padding: 10px;
						}
					</style>
				</head>
				<body>
					<div id="icons_container">
						${iconsCode}
					</div>
				</body>
			</html>
		`;

		fs.writeFile(`${iconsPath}/index.html`, page, (err) => {
			if(err){
				console.log(err);
			}else{
				console.log(`created ${iconsPath}/index.html`);
			}
		});

	});
}




exports.createIconsPage = createIconsPage;