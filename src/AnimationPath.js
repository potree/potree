
// 
// TODO 
// 
// - option to look along path during animation
// - 
// 


Potree.AnimationPath = class{
	
	constructor(points = []){
		this.points = points;
		this.spline = new THREE.Spline(points);
		this.spline.reparametrizeByArcLength(1 / this.spline.getLength().total);
		this.tween = null;
	}
	
	get(t){
		return this.spline.getPoint(t);
	}
	
	animate(metersPerSecond = 1){
		
		stop();
		
		let length = this.spline.getLength().total;
		let animationDuration = (1000 * length) / metersPerSecond;

		let progress = {t: 0};
		this.tween = new TWEEN.Tween(progress).to({t: 1}, animationDuration);
		this.tween.easing(TWEEN.Easing.Linear.None);
		this.tween.onUpdate((e) => {
			viewer.scene.view.position.copy(this.spline.getPoint(progress.t));
		});
		
		this.tween.start();
	}
	
	stop(){
		if(this.tween){
			this.tween.stop();
		}
	}
	
	resume(){
		if(this.tween){
			this.tween.start();
		}
	}
	
	getGeometry(){
		let geometry = new THREE.Geometry();
		
		let samples = 100;
		let i = 0;
		for(let u = 0; u <= 1; u += 1 / samples){
			let position = this.spline.getPoint(u);
			geometry.vertices[i] = new THREE.Vector3( position.x, position.y, position.z );
			
			i++;
		}
		
		return geometry;
		
		//let material = new THREE.LineBasicMaterial( { color: 0xffffff, opacity: 1, linewidth: 2 } );
		//let line = new THREE.Line(geometry, material);
		//viewer.scene.scene.add(line);
	}
};



//let target = new THREE.Vector3(589854.34, 231411.19, 692.77)
//let points = [
//	new THREE.Vector3(589815.52, 231738.31, 959.48 ),
//	new THREE.Vector3(589604.73, 231615.00, 968.10 ),
//	new THREE.Vector3(589579.11, 231354.41, 1010.06),
//	new THREE.Vector3(589723.00, 231169.95, 1015.57),
//	new THREE.Vector3(589960.76, 231116.87, 978.60 ),
//	new THREE.Vector3(590139.29, 231268.71, 972.33 )
//]
//
//let path = new Potree.AnimationPath(points);