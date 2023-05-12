
import * as THREE from "../../libs/three.js/build/three.module.js";

export const ClassificationScheme = {

	DEFAULT: {
		0:       { visible: true, name: 'Never Classified'  , color: [0.5,  0.5,  0.5,  1.0] },
		1:       { visible: true, name: 'Unclassified'      , color: [0.5,  0.5,  0.5,  1.0] },
		2:       { visible: true, name: 'Ground'            , color: [0.63, 0.32, 0.18, 1.0] },
		3:       { visible: true, name: 'Low Vegetation'    , color: [0.0,  1.0,  0.0,  1.0] },
		4:       { visible: true, name: 'Medium Vegetation' , color: [0.0,  0.8,  0.0,  1.0] },
		5:       { visible: true, name: 'High Vegetation'   , color: [0.0,  0.6,  0.0,  1.0] },
		6:       { visible: true, name: 'Building'          , color: [1.0,  0.66, 0.0,  1.0] },
		7:       { visible: true, name: 'Low Point(Noise)'  , color: [1.0,  0.0,  1.0,  1.0] },
		/*8:       { visible: true, name: 'Reserved'         , color: [1.0,  0.0,  0.0,  1.0] },*/
		9:       { visible: true, name: 'Water'             , color: [0.0,  0.0,  1.0,  1.0] },
		10:      { visible: true, name: 'Rail'           , color: [1.0,  1.0,  0.0,  1.0] },
		11:      { visible: true, name: 'Road Surface'           , color: [1.0,  1.0,  0.0,  1.0] },
		/*12:      { visible: true, name: 'Reserved'           , color: [1.0,  1.0,  0.0,  1.0] },*/
		13:      { visible: true, name: 'Wire - Guard(Shield)'           , color: [1.0,  1.0,  0.0,  1.0] },
		14:      { visible: true, name: 'Wire - Conductor(Phase)'           , color: [1.0,  1.0,  0.0,  1.0] },
		15:      { visible: true, name: 'Transmission Tower'           , color: [1.0,  1.0,  0.0,  1.0] },
		16:      { visible: true, name: 'Wire-structure Connector'           , color: [1.0,  1.0,  0.0,  1.0] },
		17:      { visible: true, name: 'Bridge Deck'           , color: [1.0,  1.0,  0.0,  1.0] },
		18:      { visible: true, name: 'High Noise'           , color: [1.0,  1.0,  0.0,  1.0] },
		19:      { visible: true, name: 'Overhead Structure'           , color: [1.0,  1.0,  0.0,  1.0] },
		20:      { visible: true, name: 'Ignored Ground'           , color: [1.0,  1.0,  0.0,  1.0] },
		21:      { visible: true, name: 'Snow'           , color: [1.0,  1.0,  0.0,  1.0] },
		22:      { visible: true, name: 'Temporal Exclusion'           , color: [1.0,  1.0,  0.0,  1.0] },
		DEFAULT: { visible: true, name: 'Default'           , color: [0.3,  0.6,  0.6,  0.5] },
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