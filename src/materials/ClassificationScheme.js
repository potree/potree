
import * as THREE from "../../libs/three.js/build/three.module.js";

export const ClassificationScheme = {

	DEFAULT: {
		0:       { visible: true, name: 'never classified'  , color: [0.5,  0.5,  0.5,  1.0] },
		1:       { visible: true, name: 'unclassified'      , color: [0.5,  0.5,  0.5,  1.0] },
		2:       { visible: true, name: 'ground'            , color: [0.63, 0.32, 0.18, 1.0] },
		3:       { visible: true, name: 'low vegetation'    , color: [0.0,  1.0,  0.0,  1.0] },
		4:       { visible: true, name: 'medium vegetation' , color: [0.0,  0.8,  0.0,  1.0] },
		5:       { visible: true, name: 'high vegetation'   , color: [0.0,  0.6,  0.0,  1.0] },
		6:       { visible: true, name: 'building'          , color: [1.0,  0.66, 0.0,  1.0] },
		7:       { visible: true, name: 'low point(noise)'  , color: [1.0,  0.0,  1.0,  1.0] },
		8:       { visible: true, name: 'key-point'         , color: [1.0,  0.0,  0.0,  1.0] },
		9:       { visible: true, name: 'water'             , color: [0.0,  0.0,  1.0,  1.0] },
		10:      { visible: true, name: 'rail'              , color: [0.67, 0.0,  0.67, 1.0] },
		11:      { visible: true, name: 'road surface'      , color: [0.0,  0.0,  0.0,  1.0] },
		12:      { visible: true, name: 'overlap'           , color: [1.0,  1.0,  0.0,  1.0] },
		13:      { visible: true, name: 'wire guard'           , color: [1.0,  1.0,  0.33,  1.0] },
		14:      { visible: true, name: 'wire conductor'           , color: [1.0,  1.0,  0.33,  1.0] },
		15:      { visible: true, name: 'transmission tower'           , color: [1.0,  0.33,  1.0,  1.0] },
		16:      { visible: true, name: 'wire insulators'           , color: [1.0,  1.0,  0.33,  1.0] },
		17:      { visible: true, name: 'bridge deck'           , color: [0.33,  0.33,  1.0,  1.0] },
		18:      { visible: true, name: 'high noise'           , color: [0.4,  0.4,  0.4,  1.0] },
		19:      { visible: true, name: 'overhead structure'           , color: [0.5,  0.5,  0.5,  1.0] },
		20:      { visible: true, name: 'ignored ground'           , color: [0.0,  0.0,  0.0,  1.0] },
		21:      { visible: true, name: 'snow'           , color: [1.0,  1.0,  1.0,  1.0] },
		22:      { visible: true, name: 'temporal exclusion'           , color: [0.0,  0.0,  0.5,  1.0] },
		DEFAULT: { visible: true, name: 'default'           , color: [0.3,  0.6,  0.6,  0.5] },
	}
};

Object.defineProperty(ClassificationScheme, 'RANDOM', {
	get: function() { 

		let scheme = {};

		for(let i = 0; i <= 255; i++){
			scheme[i] = new THREE.Vector4(Math.random(), Math.random(), Math.random());
		}

		scheme["DEFAULT"] = new THREE.Vector4(Math.random(), Math.random(), Math.random());

		return scheme;
	}
});
