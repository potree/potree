
const path = require('path');
const fs = require("fs");
const fsp = fs.promises;


async function createGithubPage(){
	const content = await fsp.readFile("./examples/page.json", 'utf8');
	const settings = JSON.parse(content);

	const files = await fsp.readdir("./examples");

	let unhandledCode = ``;
	let exampleCode = ``;
	let showcaseCode = ``;
	let thirdpartyCode = ``;

	{
		let urls = settings.examples.map(e => e.url);
		let unhandled = [];
		for(let file of files){
			let isHandled = false;
			for(let url of urls){

				if(file.indexOf(url) !== -1){
					isHandled = true;
				}
			}

			if(!isHandled){
				unhandled.push(file);
			}
		}
		unhandled = unhandled
			.filter(file => file.indexOf(".html") > 0)
			.filter(file => file !== "page.html");


		for(let file of unhandled){
			unhandledCode += `
				<a href="${file}" class="unhandled">${file}</a>
			`;
		}
	}

	const rows = [];
	let row = [];
	for(let example of settings.examples){
		row.push(example);

		if(row.length >= 6){
			rows.push(row);
			row = [];
		}
	};
	rows.push(row);

	for(const row of rows){

		let thumbnails = "";
		let labels = "";

		for(let example of row){
			
			thumbnails += `<td>
					<a href="http://potree.org/potree/examples/${example.url}" target="_blank">
						<img src="examples/${example.thumb}" width="100%" />
					</a>
				</td>`;
			
			labels += `<th>${example.label}</th>`;
		}

		exampleCode += `<tr>
				${thumbnails}
			</tr>
			<tr>
				${labels}
			</tr>`;
	}

	let page = `
		<table>
			${exampleCode}
		</table>`;

	fs.writeFile(`examples/github.html`, page, (err) => {
		if(err){
			console.log(err);
		}else{
			console.log(`created examples/github.html`);
		}
	});
}




exports.createGithubPage = createGithubPage;