
import * as THREE from "../../../libs/three.js/build/three.module.js";
import {MeasurePanel} from "./MeasurePanel.js";

export class ProfilePanel extends MeasurePanel{
	constructor(viewer, measurement, propertiesPanel){
		super(viewer, measurement, propertiesPanel);

		let removeIconPath = Potree.resourcePath + '/icons/remove.svg';
		this.elContent = $(`
			<div class="measurement_content selectable">
				<span class="coordinates_table_container"></span>
				<br>
				<span style="display:flex">
					<span style="display:flex; align-items: center; padding-right: 10px">Width: </span>
					<input id="sldProfileWidth" name="sldProfileWidth" value="5.06" style="flex-grow: 1; width:100%">
				</span>
				<br>

				<li style="margin-top: 10px">
					<input name="download_profile" type="button" value="prepare download" style="width: 100%" />
					<div name="download_message"></div>
				</li>

				<br>

				<input type="button" id="show_2d_profile" value="show 2d profile" style="width: 100%"/>

				<!-- ACTIONS -->
				<div style="display: flex; margin-top: 12px">
					<span></span>
					<span style="flex-grow: 1"></span>
					<img name="remove" class="button-icon" src="${removeIconPath}" style="width: 16px; height: 16px"/>
				</div>
			</div>
		`);

		this.elRemove = this.elContent.find("img[name=remove]");
		this.elRemove.click( () => {
			this.viewer.scene.removeProfile(measurement);
		});

		{ // download
			this.elDownloadButton = this.elContent.find(`input[name=download_profile]`);

			if(this.propertiesPanel.viewer.server){
				this.elDownloadButton.click(() => this.download());
			} else {
				this.elDownloadButton.hide();
			}
		}

		{ // width spinner
			let elWidthSlider = this.elContent.find(`#sldProfileWidth`);

			elWidthSlider.spinner({
				min: 0, max: 10 * 1000 * 1000, step: 0.01,
				numberFormat: 'n',
				start: () => {},
				spin: (event, ui) => {
					let value = elWidthSlider.spinner('value');
					measurement.setWidth(value);
				},
				change: (event, ui) => {
					let value = elWidthSlider.spinner('value');
					measurement.setWidth(value);
				},
				stop: (event, ui) => {
					let value = elWidthSlider.spinner('value');
					measurement.setWidth(value);
				},
				incremental: (count) => {
					let value = elWidthSlider.spinner('value');
					let step = elWidthSlider.spinner('option', 'step');

					let delta = value * 0.05;
					let increments = Math.max(1, parseInt(delta / step));

					return increments;
				}
			});
			elWidthSlider.spinner('value', measurement.getWidth());
			elWidthSlider.spinner('widget').css('width', '100%');

			let widthListener = (event) => {
				let value = elWidthSlider.spinner('value');
				if (value !== measurement.getWidth()) {
					elWidthSlider.spinner('value', measurement.getWidth());
				}
			};
			this.propertiesPanel.addVolatileListener(measurement, "width_changed", widthListener);
		}

		let elShow2DProfile = this.elContent.find(`#show_2d_profile`);
		elShow2DProfile.click(() => {
			this.propertiesPanel.viewer.profileWindow.show();
			this.propertiesPanel.viewer.profileWindowController.setProfile(measurement);
		});

		this.propertiesPanel.addVolatileListener(measurement, "marker_added", this._update);
		this.propertiesPanel.addVolatileListener(measurement, "marker_removed", this._update);
		this.propertiesPanel.addVolatileListener(measurement, "marker_moved", this._update);

		this.update();
	}

	update(){
		let elCoordiantesContainer = this.elContent.find('.coordinates_table_container');
		elCoordiantesContainer.empty();
		elCoordiantesContainer.append(this.createCoordinatesTable(this.measurement.points));
	}

	async download(){

		let profile = this.measurement;

		let regions = [];
		{
			let segments = profile.getSegments();
			let width = profile.width;
			
			for(let segment of segments){
				let start = segment.start.clone().multiply(new THREE.Vector3(1, 1, 0));
				let end = segment.end.clone().multiply(new THREE.Vector3(1, 1, 0));
				let center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
				
				let startEndDir = new THREE.Vector3().subVectors(end, start).normalize();
				let endStartDir = new THREE.Vector3().subVectors(start, end).normalize();
				let upDir = new THREE.Vector3(0, 0, 1);
				let rightDir = new THREE.Vector3().crossVectors(startEndDir, upDir);
				let leftDir = new THREE.Vector3().crossVectors(endStartDir, upDir);
				
				console.log(leftDir);
				
				let right = rightDir.clone().multiplyScalar(width * 0.5).add(center);
				let left = leftDir.clone().multiplyScalar(width * 0.5).add(center);
				
				let planes = [
					new THREE.Plane().setFromNormalAndCoplanarPoint(startEndDir, start),
					new THREE.Plane().setFromNormalAndCoplanarPoint(endStartDir, end),
					new THREE.Plane().setFromNormalAndCoplanarPoint(leftDir, right),
					new THREE.Plane().setFromNormalAndCoplanarPoint(rightDir, left),
				];
				
				let planeQueryParts = [];
				for(let plane of planes){
					let part = [plane.normal.toArray(), plane.constant].join(",");
					part = `[${part}]`;
					planeQueryParts.push(part);
				}
				let region = "[" + planeQueryParts.join(",") + "]";
				regions.push(region);
			}
		}

		let regionsArg = regions.join(",");

		let pointcloudArgs = [];
		for(let pointcloud of this.viewer.scene.pointclouds){
			if(!pointcloud.visible){
				continue;
			}

			let offset = pointcloud.pcoGeometry.offset.clone();
			let negateOffset = new THREE.Matrix4().makeTranslation(...offset.multiplyScalar(-1).toArray());
			let matrixWorld = pointcloud.matrixWorld;

			let transform = new THREE.Matrix4().multiplyMatrices(matrixWorld, negateOffset);

			let path = `${window.location.pathname}/../${pointcloud.pcoGeometry.url}`;

			let arg = {
				path: path,
				transform: transform.elements,
			};
			let argString = JSON.stringify(arg);

			pointcloudArgs.push(argString);
		}
		let pointcloudsArg = pointcloudArgs.join(",");

		let elMessage = this.elContent.find("div[name=download_message]");

		let error = (message) => {
			elMessage.html(`<div style="color: #ff0000">ERROR: ${message}</div>`);
		};

		let info = (message) => {
			elMessage.html(`${message}`);
		};

		let handle = null;
		{ // START FILTER
			let url = `${viewer.server}/create_regions_filter?pointclouds=[${pointcloudsArg}]&regions=[${regionsArg}]`;
			
			//console.log(url);

			info("estimating results ...");

			let response = await fetch(url);
			let jsResponse = await response.json();
			//console.log(jsResponse);

			if(!jsResponse.handle){
				error(jsResponse.message);
				return;
			}else{
				handle = jsResponse.handle;
			}
		}

		{ // WAIT, CHECK PROGRESS, HANDLE FINISH
			let url = `${viewer.server}/check_regions_filter?handle=${handle}`;

			let sleep = (function(duration){
				return new Promise( (res, rej) => {
					setTimeout(() => {
						res();
					}, duration);
				});
			});

			let handleFiltering = (jsResponse) => {
				let {progress, estimate} = jsResponse;

				let progressFract = progress["processed points"] / estimate.points;
				let progressPercents = parseInt(progressFract * 100);

				info(`progress: ${progressPercents}%`);
			};

			let handleFinish = (jsResponse) => {
				let message = "downloads ready: <br>";
				message += "<ul>";

				for(let i = 0; i < jsResponse.pointclouds.length; i++){
					let url = `${viewer.server}/download_regions_filter_result?handle=${handle}&index=${i}`;

					message += `<li><a href="${url}">result_${i}.las</a> </li>\n`;
				}

				let reportURL = `${viewer.server}/download_regions_filter_report?handle=${handle}`;
				message += `<li> <a href="${reportURL}">report.json</a> </li>\n`;
				message += "</ul>";

				info(message);
			};

			let handleUnexpected = (jsResponse) => {
				let message = `Unexpected Response. <br>status: ${jsResponse.status} <br>message: ${jsResponse.message}`;
				info(message);
			};

			let handleError = (jsResponse) => {
				let message = `ERROR: ${jsResponse.message}`;
				error(message);

				throw new Error(message);
			};

			let start = Date.now();

			while(true){
				let response = await fetch(url);
				let jsResponse = await response.json();

				if(jsResponse.status === "ERROR"){
					handleError(jsResponse);
				}else if(jsResponse.status === "FILTERING"){
					handleFiltering(jsResponse);
				}else if(jsResponse.status === "FINISHED"){
					handleFinish(jsResponse);

					break;
				}else{
					handleUnexpected(jsResponse);
				}

				let durationS = (Date.now() - start) / 1000;
				let sleepAmountMS = durationS < 10 ? 100 : 1000;

				await sleep(sleepAmountMS);
			}
		}

	}
};