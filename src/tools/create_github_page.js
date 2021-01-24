
const path = require('path');
const fs = require("fs");
const fsp = fs.promises;
const JSON5 = require('json5');

function toCode(files, data){

	let code = "";

	{
		let urls = data.map(e => e.url);
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


		// for(let file of unhandled){
		// 	unhandledCode += `
		// 		<a href="${file}" class="unhandled">${file}</a>
		// 	`;
		// }
	}

	const rows = [];
	let row = [];
	for(let example of data){
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

			let url = example.url.startsWith("http") ? 
				example.url : 
				`http://potree.org/potree/examples/${example.url}`;
			
			thumbnails += `<td>
					<a href="${url}" target="_blank">
						<img src="examples/${example.thumb}" width="100%" />
					</a>
				</td>`;
			
			labels += `<th>${example.label}</th>`;
		}

		code += `<tr>
				${thumbnails}
			</tr>
			<tr>
				${labels}
			</tr>`;
	}

	return code;
}


async function createGithubPage(){
	const content = await fsp.readFile("./examples/page.json", 'utf8');
	const settings = JSON5.parse(content);

	const files = await fsp.readdir("./examples");

	let unhandledCode = ``;

	let exampleCode = toCode(files, settings.examples);
	let vrCode = toCode(files, settings.VR);
	let showcaseCode = toCode(files, settings.showcase);
	let thirdpartyCode = toCode(files, settings.thirdparty);

	let page = `

		<h1>Examples</h1>

		<table>
			${exampleCode}
		</table>

		<h1>VR</h1>

		<table>
			${vrCode}
		</table>

		<h1>Showcase</h1>

		<table>
			${showcaseCode}
		</table>

		<h1>Third Party Showcase</h1>

		<table>
			${thirdpartyCode}
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