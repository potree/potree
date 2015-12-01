


function Potree(){
	
}

// contains WebWorkers with base64 encoded code
Potree.workers = {};

Potree.Shaders = {};




Potree.WorkerManager = function(code){
	this.code = code;
	this.instances = [];
	this.createdInstances = 0;
}

Potree.WorkerManager.prototype.getWorker = function(){
	var ww = this.instances.pop();
	
	if(ww === undefined){
		ww = Potree.utils.createWorker(this.code);
		this.createdInstances++;
	}
	
	return ww;
}


Potree.WorkerManager.prototype.returnWorker = function(worker){
	this.instances.push(worker);
}

/**
 * urls point to WebWorker code.
 * Code must not contain calls to importScripts, 
 * concatenation is done by this method.
 * 
 */
Potree.WorkerManager.fromUrls = function(urls){

	var code = "";
	for(var i = 0; i < urls.length; i++){
		var url = urls[i];
		var xhr = new XMLHttpRequest();
		xhr.open('GET', url, false);
		xhr.responseType = 'text';
		xhr.overrideMimeType('text/plain; charset=x-user-defined');
		xhr.send(null);
		
		if(xhr.status === 200){
			code += xhr.responseText + "\n";
		}
	}
	
	return new Potree.WorkerManager(code);
}
Potree.workers.binaryDecoder = new Potree.WorkerManager(atob("Ci8vIGh0dHA6Ly9qc3BlcmYuY29tL3VpbnQ4YXJyYXktdnMtZGF0YXZpZXczLzMKZnVuY3Rpb24gQ3VzdG9tVmlldyhidWZmZXIpIHsKCXRoaXMuYnVmZmVyID0gYnVmZmVyOwoJdGhpcy51OCA9IG5ldyBVaW50OEFycmF5KGJ1ZmZlcik7CgkKCXZhciB0bXAgPSBuZXcgQXJyYXlCdWZmZXIoNCk7Cgl2YXIgdG1wZiA9IG5ldyBGbG9hdDMyQXJyYXkodG1wKTsKCXZhciB0bXB1OCA9IG5ldyBVaW50OEFycmF5KHRtcCk7CgkKCXRoaXMuZ2V0VWludDMyID0gZnVuY3Rpb24gKGkpIHsKCQlyZXR1cm4gKHRoaXMudThbaSszXSA8PCAyNCkgfCAodGhpcy51OFtpKzJdIDw8IDE2KSB8ICh0aGlzLnU4W2krMV0gPDwgOCkgfCB0aGlzLnU4W2ldOwoJfQoJCgl0aGlzLmdldFVpbnQxNiA9IGZ1bmN0aW9uIChpKSB7CgkJcmV0dXJuICh0aGlzLnU4W2krMV0gPDwgOCkgfCB0aGlzLnU4W2ldOwoJfQoJCgl0aGlzLmdldEZsb2F0ID0gZnVuY3Rpb24oaSl7CgkJdG1wdThbMF0gPSB0aGlzLnU4W2krMF07CgkJdG1wdThbMV0gPSB0aGlzLnU4W2krMV07CgkJdG1wdThbMl0gPSB0aGlzLnU4W2krMl07CgkJdG1wdThbM10gPSB0aGlzLnU4W2krM107CgkJCgkJcmV0dXJuIHRtcGZbMF07Cgl9CgkKCXRoaXMuZ2V0VWludDggPSBmdW5jdGlvbihpKXsKCQlyZXR1cm4gdGhpcy51OFtpXTsKCX0KfQoKUG90cmVlID0ge307CgoKb25tZXNzYWdlID0gZnVuY3Rpb24oZXZlbnQpewoJdmFyIGJ1ZmZlciA9IGV2ZW50LmRhdGEuYnVmZmVyOwoJdmFyIHBvaW50QXR0cmlidXRlcyA9IGV2ZW50LmRhdGEucG9pbnRBdHRyaWJ1dGVzOwoJdmFyIG51bVBvaW50cyA9IGJ1ZmZlci5ieXRlTGVuZ3RoIC8gcG9pbnRBdHRyaWJ1dGVzLmJ5dGVTaXplOwoJdmFyIGN2ID0gbmV3IEN1c3RvbVZpZXcoYnVmZmVyKTsKCXZhciB2ZXJzaW9uID0gbmV3IFBvdHJlZS5WZXJzaW9uKGV2ZW50LmRhdGEudmVyc2lvbik7Cgl2YXIgbWluID0gZXZlbnQuZGF0YS5taW47Cgl2YXIgbm9kZU9mZnNldCA9IGV2ZW50LmRhdGEub2Zmc2V0OwoJdmFyIHNjYWxlID0gZXZlbnQuZGF0YS5zY2FsZTsKCXZhciB0aWdodEJveE1pbiA9IFsgTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZLCBOdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFksIE51bWJlci5QT1NJVElWRV9JTkZJTklUWV07Cgl2YXIgdGlnaHRCb3hNYXggPSBbIE51bWJlci5ORUdBVElWRV9JTkZJTklUWSAsIE51bWJlci5ORUdBVElWRV9JTkZJTklUWSAsIE51bWJlci5ORUdBVElWRV9JTkZJTklUWSBdOwoJCgl2YXIgYXR0cmlidXRlQnVmZmVycyA9IHt9OwoJCgl2YXIgb2Zmc2V0ID0gMDsKCWZvcih2YXIgaSA9IDA7IGkgPCBwb2ludEF0dHJpYnV0ZXMuYXR0cmlidXRlcy5sZW5ndGg7IGkrKyl7CgkJdmFyIHBvaW50QXR0cmlidXRlID0gcG9pbnRBdHRyaWJ1dGVzLmF0dHJpYnV0ZXNbaV07CgkKCQlpZihwb2ludEF0dHJpYnV0ZS5uYW1lID09PSBQb3RyZWUuUG9pbnRBdHRyaWJ1dGUuUE9TSVRJT05fQ0FSVEVTSUFOLm5hbWUpewoJCQkKCQkJdmFyIGJ1ZmYgPSBuZXcgQXJyYXlCdWZmZXIobnVtUG9pbnRzKjQqMyk7CgkJCXZhciBwb3NpdGlvbnMgPSBuZXcgRmxvYXQzMkFycmF5KGJ1ZmYpOwoJCQkKCQkJZm9yKHZhciBqID0gMDsgaiA8IG51bVBvaW50czsgaisrKXsKCQkJCWlmKHZlcnNpb24ubmV3ZXJUaGFuKCIxLjMiKSl7CgkJCQkJcG9zaXRpb25zWzMqaiswXSA9IChjdi5nZXRVaW50MzIob2Zmc2V0ICsgaipwb2ludEF0dHJpYnV0ZXMuYnl0ZVNpemUrMCkgKiBzY2FsZSkgKyBtaW5bMF07CgkJCQkJcG9zaXRpb25zWzMqaisxXSA9IChjdi5nZXRVaW50MzIob2Zmc2V0ICsgaipwb2ludEF0dHJpYnV0ZXMuYnl0ZVNpemUrNCkgKiBzY2FsZSkgKyBtaW5bMV07CgkJCQkJcG9zaXRpb25zWzMqaisyXSA9IChjdi5nZXRVaW50MzIob2Zmc2V0ICsgaipwb2ludEF0dHJpYnV0ZXMuYnl0ZVNpemUrOCkgKiBzY2FsZSkgKyBtaW5bMl07CgkJCQl9ZWxzZXsKCQkJCQlwb3NpdGlvbnNbMypqKzBdID0gY3YuZ2V0RmxvYXQoaipwb2ludEF0dHJpYnV0ZXMuYnl0ZVNpemUrMCkgKyBub2RlT2Zmc2V0WzBdOwoJCQkJCXBvc2l0aW9uc1szKmorMV0gPSBjdi5nZXRGbG9hdChqKnBvaW50QXR0cmlidXRlcy5ieXRlU2l6ZSs0KSArIG5vZGVPZmZzZXRbMV07CgkJCQkJcG9zaXRpb25zWzMqaisyXSA9IGN2LmdldEZsb2F0KGoqcG9pbnRBdHRyaWJ1dGVzLmJ5dGVTaXplKzgpICsgbm9kZU9mZnNldFsyXTsKCQkJCX0KCQkJCQoJCQkJdGlnaHRCb3hNaW5bMF0gPSBNYXRoLm1pbih0aWdodEJveE1pblswXSwgcG9zaXRpb25zWzMqaiswXSk7CgkJCQl0aWdodEJveE1pblsxXSA9IE1hdGgubWluKHRpZ2h0Qm94TWluWzFdLCBwb3NpdGlvbnNbMypqKzFdKTsKCQkJCXRpZ2h0Qm94TWluWzJdID0gTWF0aC5taW4odGlnaHRCb3hNaW5bMl0sIHBvc2l0aW9uc1szKmorMl0pOwoJCQkJCgkJCQl0aWdodEJveE1heFswXSA9IE1hdGgubWF4KHRpZ2h0Qm94TWF4WzBdLCBwb3NpdGlvbnNbMypqKzBdKTsKCQkJCXRpZ2h0Qm94TWF4WzFdID0gTWF0aC5tYXgodGlnaHRCb3hNYXhbMV0sIHBvc2l0aW9uc1szKmorMV0pOwoJCQkJdGlnaHRCb3hNYXhbMl0gPSBNYXRoLm1heCh0aWdodEJveE1heFsyXSwgcG9zaXRpb25zWzMqaisyXSk7CgkJCX0KCQkJCgkJCWF0dHJpYnV0ZUJ1ZmZlcnNbcG9pbnRBdHRyaWJ1dGUubmFtZV0gPSB7IGJ1ZmZlcjogYnVmZiwgYXR0cmlidXRlOiBwb2ludEF0dHJpYnV0ZX07CgkJCQoJCX1lbHNlIGlmKHBvaW50QXR0cmlidXRlLm5hbWUgPT09IFBvdHJlZS5Qb2ludEF0dHJpYnV0ZS5DT0xPUl9QQUNLRUQubmFtZSl7CgkJCQoJCQl2YXIgYnVmZiA9IG5ldyBBcnJheUJ1ZmZlcihudW1Qb2ludHMqNCozKTsKCQkJdmFyIGNvbG9ycyA9IG5ldyBGbG9hdDMyQXJyYXkoYnVmZik7CgkJCQoJCQlmb3IodmFyIGogPSAwOyBqIDwgbnVtUG9pbnRzOyBqKyspewoJCQkJY29sb3JzWzMqaiswXSA9IGN2LmdldFVpbnQ4KG9mZnNldCArIGoqcG9pbnRBdHRyaWJ1dGVzLmJ5dGVTaXplICsgMCkgLyAyNTU7CgkJCQljb2xvcnNbMypqKzFdID0gY3YuZ2V0VWludDgob2Zmc2V0ICsgaipwb2ludEF0dHJpYnV0ZXMuYnl0ZVNpemUgKyAxKSAvIDI1NTsKCQkJCWNvbG9yc1szKmorMl0gPSBjdi5nZXRVaW50OChvZmZzZXQgKyBqKnBvaW50QXR0cmlidXRlcy5ieXRlU2l6ZSArIDIpIC8gMjU1OwoJCQl9CgkJCQoJCQlhdHRyaWJ1dGVCdWZmZXJzW3BvaW50QXR0cmlidXRlLm5hbWVdID0geyBidWZmZXI6IGJ1ZmYsIGF0dHJpYnV0ZTogcG9pbnRBdHRyaWJ1dGV9OwoJCQkKCQl9ZWxzZSBpZihwb2ludEF0dHJpYnV0ZS5uYW1lID09PSBQb3RyZWUuUG9pbnRBdHRyaWJ1dGUuSU5URU5TSVRZLm5hbWUpewoKCQkJdmFyIGJ1ZmYgPSBuZXcgQXJyYXlCdWZmZXIobnVtUG9pbnRzKjQpOwoJCQl2YXIgaW50ZW5zaXRpZXMgPSBuZXcgRmxvYXQzMkFycmF5KGJ1ZmYpOwoJCQkKCQkJZm9yKHZhciBqID0gMDsgaiA8IG51bVBvaW50czsgaisrKXsKCQkJCXZhciBpbnRlbnNpdHkgPSBjdi5nZXRVaW50MTYob2Zmc2V0ICsgaipwb2ludEF0dHJpYnV0ZXMuYnl0ZVNpemUpOwoJCQkJaW50ZW5zaXRpZXNbal0gPSBpbnRlbnNpdHk7CgkJCX0KCQkJCgkJCWF0dHJpYnV0ZUJ1ZmZlcnNbcG9pbnRBdHRyaWJ1dGUubmFtZV0gPSB7IGJ1ZmZlcjogYnVmZiwgYXR0cmlidXRlOiBwb2ludEF0dHJpYnV0ZX07CgkJCgkJfWVsc2UgaWYocG9pbnRBdHRyaWJ1dGUubmFtZSA9PT0gUG90cmVlLlBvaW50QXR0cmlidXRlLkNMQVNTSUZJQ0FUSU9OLm5hbWUpewoKCQkJdmFyIGJ1ZmYgPSBuZXcgQXJyYXlCdWZmZXIobnVtUG9pbnRzKjQpOwoJCQl2YXIgY2xhc3NpZmljYXRpb25zID0gbmV3IEZsb2F0MzJBcnJheShidWZmKTsKCQkJCgkJCWZvcih2YXIgaiA9IDA7IGogPCBudW1Qb2ludHM7IGorKyl7CgkJCQl2YXIgY2xhc3NpZmljYXRpb24gPSBjdi5nZXRVaW50OChvZmZzZXQgKyBqKnBvaW50QXR0cmlidXRlcy5ieXRlU2l6ZSk7CgkJCQljbGFzc2lmaWNhdGlvbnNbal0gPSBjbGFzc2lmaWNhdGlvbjsKCQkJfQoJCQkKCQkJYXR0cmlidXRlQnVmZmVyc1twb2ludEF0dHJpYnV0ZS5uYW1lXSA9IHsgYnVmZmVyOiBidWZmLCBhdHRyaWJ1dGU6IHBvaW50QXR0cmlidXRlfTsKCQkKCQl9ZWxzZSBpZihwb2ludEF0dHJpYnV0ZS5uYW1lID09PSBQb3RyZWUuUG9pbnRBdHRyaWJ1dGUuTk9STUFMX1NQSEVSRU1BUFBFRC5uYW1lKXsKCgkJCXZhciBidWZmID0gbmV3IEFycmF5QnVmZmVyKG51bVBvaW50cyo0KjMpOwoJCQl2YXIgbm9ybWFscyA9IG5ldyBGbG9hdDMyQXJyYXkoYnVmZik7CgkJCQoJCQlmb3IodmFyIGogPSAwOyBqIDwgbnVtUG9pbnRzOyBqKyspewoJCQkJdmFyIGJ4ID0gY3YuZ2V0VWludDgob2Zmc2V0ICsgaiAqIHBvaW50QXR0cmlidXRlcy5ieXRlU2l6ZSArIDApOwoJCQkJdmFyIGJ5ID0gY3YuZ2V0VWludDgob2Zmc2V0ICsgaiAqIHBvaW50QXR0cmlidXRlcy5ieXRlU2l6ZSArIDEpOwoJCQkKCQkJCXZhciBleCA9IGJ4IC8gMjU1OwoJCQkJdmFyIGV5ID0gYnkgLyAyNTU7CgkJCQkKCQkJCXZhciBueCA9IGV4ICogMiAtIDE7CgkJCQl2YXIgbnkgPSBleSAqIDIgLSAxOwoJCQkJdmFyIG56ID0gMTsKCQkJCXZhciBudyA9IC0xOwoJCQkJCgkJCQl2YXIgbCA9IChueCAqICgtbngpKSArIChueSAqICgtbnkpKSArIChueiAqICgtbncpKTsKCQkJCW56ID0gbDsKCQkJCW54ID0gbnggKiBNYXRoLnNxcnQobCk7CgkJCQlueSA9IG55ICogTWF0aC5zcXJ0KGwpOwoJCQkJCgkJCQlueCA9IG54ICogMjsKCQkJCW55ID0gbnkgKiAyOwoJCQkJbnogPSBueiAqIDIgLSAxOwoJCQkJCgkJCQlub3JtYWxzWzMqaiArIDBdID0gbng7CgkJCQlub3JtYWxzWzMqaiArIDFdID0gbnk7CgkJCQlub3JtYWxzWzMqaiArIDJdID0gbno7CgkJCX0KCQkJCgkJCWF0dHJpYnV0ZUJ1ZmZlcnNbcG9pbnRBdHRyaWJ1dGUubmFtZV0gPSB7IGJ1ZmZlcjogYnVmZiwgYXR0cmlidXRlOiBwb2ludEF0dHJpYnV0ZX07CgkJfWVsc2UgaWYocG9pbnRBdHRyaWJ1dGUubmFtZSA9PT0gUG90cmVlLlBvaW50QXR0cmlidXRlLk5PUk1BTF9PQ1QxNi5uYW1lKXsKCQkJCgkJCXZhciBidWZmID0gbmV3IEFycmF5QnVmZmVyKG51bVBvaW50cyo0KjMpOwoJCQl2YXIgbm9ybWFscyA9IG5ldyBGbG9hdDMyQXJyYXkoYnVmZik7CgkJCWZvcih2YXIgaiA9IDA7IGogPCBudW1Qb2ludHM7IGorKyl7CgkJCQl2YXIgYnggPSBjdi5nZXRVaW50OChvZmZzZXQgKyBqICogcG9pbnRBdHRyaWJ1dGVzLmJ5dGVTaXplICsgMCk7CgkJCQl2YXIgYnkgPSBjdi5nZXRVaW50OChvZmZzZXQgKyBqICogcG9pbnRBdHRyaWJ1dGVzLmJ5dGVTaXplICsgMSk7CgkJCQkKCQkJCXZhciB1ID0gKGJ4IC8gMjU1KSAqIDIgLSAxOwoJCQkJdmFyIHYgPSAoYnkgLyAyNTUpICogMiAtIDE7CgkJCQkKCQkJCXZhciB6ID0gMSAtIE1hdGguYWJzKHUpIC0gTWF0aC5hYnModik7CgkJCQkKCQkJCWlmKHogPj0gMCl7CgkJCQkJdmFyIHggPSB1OwoJCQkJCXZhciB5ID0gdjsKCQkJCX1lbHNlewoJCQkJCXZhciB4ID0gLSAodi9NYXRoLnNpZ24odikgLSAxKSAvIE1hdGguc2lnbih1KTsKCQkJCQl2YXIgeSA9IC0gKHUvTWF0aC5zaWduKHUpIC0gMSkgLyBNYXRoLnNpZ24odik7CgkJCQl9CgkJCQkKCQkJCXZhciBsZW5ndGggPSBNYXRoLnNxcnQoeCp4ICsgeSp5ICsgeip6KTsKCQkJCXggPSB4IC8gbGVuZ3RoOwoJCQkJeSA9IHkgLyBsZW5ndGg7CgkJCQl6ID0geiAvIGxlbmd0aDsKCQkJCQoJCQkJbm9ybWFsc1szKmogKyAwXSA9IHg7CgkJCQlub3JtYWxzWzMqaiArIDFdID0geTsKCQkJCW5vcm1hbHNbMypqICsgMl0gPSB6OwoJCQl9CgkJCWF0dHJpYnV0ZUJ1ZmZlcnNbcG9pbnRBdHRyaWJ1dGUubmFtZV0gPSB7IGJ1ZmZlcjogYnVmZiwgYXR0cmlidXRlOiBwb2ludEF0dHJpYnV0ZX07CgkJfWVsc2UgaWYocG9pbnRBdHRyaWJ1dGUubmFtZSA9PT0gUG90cmVlLlBvaW50QXR0cmlidXRlLk5PUk1BTC5uYW1lKXsKCQkKCQkJdmFyIGJ1ZmYgPSBuZXcgQXJyYXlCdWZmZXIobnVtUG9pbnRzKjQqMyk7CgkJCXZhciBub3JtYWxzID0gbmV3IEZsb2F0MzJBcnJheShidWZmKTsKCQkJZm9yKHZhciBqID0gMDsgaiA8IG51bVBvaW50czsgaisrKXsKCQkJCXZhciB4ID0gY3YuZ2V0RmxvYXQob2Zmc2V0ICsgaiAqIHBvaW50QXR0cmlidXRlcy5ieXRlU2l6ZSArIDApOwoJCQkJdmFyIHkgPSBjdi5nZXRGbG9hdChvZmZzZXQgKyBqICogcG9pbnRBdHRyaWJ1dGVzLmJ5dGVTaXplICsgNCk7CgkJCQl2YXIgeiA9IGN2LmdldEZsb2F0KG9mZnNldCArIGogKiBwb2ludEF0dHJpYnV0ZXMuYnl0ZVNpemUgKyA4KTsKCQkJCQoJCQkJbm9ybWFsc1szKmogKyAwXSA9IHg7CgkJCQlub3JtYWxzWzMqaiArIDFdID0geTsKCQkJCW5vcm1hbHNbMypqICsgMl0gPSB6OwoJCQl9CgkJCWF0dHJpYnV0ZUJ1ZmZlcnNbcG9pbnRBdHRyaWJ1dGUubmFtZV0gPSB7IGJ1ZmZlcjogYnVmZiwgYXR0cmlidXRlOiBwb2ludEF0dHJpYnV0ZX07CgkJfQoJCQoJCW9mZnNldCArPSBwb2ludEF0dHJpYnV0ZS5ieXRlU2l6ZTsKCX0KCQoJdmFyIGluZGljZXMgPSBuZXcgQXJyYXlCdWZmZXIobnVtUG9pbnRzKjQpOwoJdmFyIGlJbmRpY2VzID0gbmV3IFVpbnQzMkFycmF5KGluZGljZXMpOwoJZm9yKHZhciBpID0gMDsgaSA8IG51bVBvaW50czsgaSsrKXsKCQlpSW5kaWNlc1tpXSA9IGk7Cgl9CgkKCXZhciBtZXNzYWdlID0gewoJCWF0dHJpYnV0ZUJ1ZmZlcnM6IGF0dHJpYnV0ZUJ1ZmZlcnMsCgkJdGlnaHRCb3VuZGluZ0JveDogeyBtaW46IHRpZ2h0Qm94TWluLCBtYXg6IHRpZ2h0Qm94TWF4IH0sCgkJaW5kaWNlczogaW5kaWNlcwoJfTsKCQkKCXZhciB0cmFuc2ZlcmFibGVzID0gW107CgkKCWZvcih2YXIgcHJvcGVydHkgaW4gbWVzc2FnZS5hdHRyaWJ1dGVCdWZmZXJzKXsKCQlpZihtZXNzYWdlLmF0dHJpYnV0ZUJ1ZmZlcnMuaGFzT3duUHJvcGVydHkocHJvcGVydHkpKXsKCQkJdHJhbnNmZXJhYmxlcy5wdXNoKG1lc3NhZ2UuYXR0cmlidXRlQnVmZmVyc1twcm9wZXJ0eV0uYnVmZmVyKTsKCQl9Cgl9CgkKCXRyYW5zZmVyYWJsZXMucHVzaChtZXNzYWdlLmluZGljZXMpOwoJCQoJcG9zdE1lc3NhZ2UobWVzc2FnZSwgdHJhbnNmZXJhYmxlcyk7CgkKfTsKUG90cmVlLlZlcnNpb24gPSBmdW5jdGlvbih2ZXJzaW9uKXsKCXRoaXMudmVyc2lvbiA9IHZlcnNpb247Cgl2YXIgdm1MZW5ndGggPSAodmVyc2lvbi5pbmRleE9mKCIuIikgPT09IC0xKSA/IHZlcnNpb24ubGVuZ3RoIDogdmVyc2lvbi5pbmRleE9mKCIuIik7Cgl0aGlzLnZlcnNpb25NYWpvciA9IHBhcnNlSW50KHZlcnNpb24uc3Vic3RyKDAsIHZtTGVuZ3RoKSk7Cgl0aGlzLnZlcnNpb25NaW5vciA9IHBhcnNlSW50KHZlcnNpb24uc3Vic3RyKHZtTGVuZ3RoICsgMSkpOwoJaWYodGhpcy52ZXJzaW9uTWlub3IubGVuZ3RoID09PSAwKXsKCQl0aGlzLnZlcnNpb25NaW5vciA9IDA7Cgl9CgkKfTsKClBvdHJlZS5WZXJzaW9uLnByb3RvdHlwZS5uZXdlclRoYW4gPSBmdW5jdGlvbih2ZXJzaW9uKXsKCXZhciB2ID0gbmV3IFBvdHJlZS5WZXJzaW9uKHZlcnNpb24pOwoJCglpZiggdGhpcy52ZXJzaW9uTWFqb3IgPiB2LnZlcnNpb25NYWpvcil7CgkJcmV0dXJuIHRydWU7Cgl9ZWxzZSBpZiggdGhpcy52ZXJzaW9uTWFqb3IgPT09IHYudmVyc2lvbk1ham9yICYmIHRoaXMudmVyc2lvbk1pbm9yID4gdi52ZXJzaW9uTWlub3IpewoJCXJldHVybiB0cnVlOwoJfWVsc2V7CgkJcmV0dXJuIGZhbHNlOwoJfQp9OwoKUG90cmVlLlZlcnNpb24ucHJvdG90eXBlLmVxdWFsT3JIaWdoZXIgPSBmdW5jdGlvbih2ZXJzaW9uKXsKCXZhciB2ID0gbmV3IFBvdHJlZS5WZXJzaW9uKHZlcnNpb24pOwoJCglpZiggdGhpcy52ZXJzaW9uTWFqb3IgPiB2LnZlcnNpb25NYWpvcil7CgkJcmV0dXJuIHRydWU7Cgl9ZWxzZSBpZiggdGhpcy52ZXJzaW9uTWFqb3IgPT09IHYudmVyc2lvbk1ham9yICYmIHRoaXMudmVyc2lvbk1pbm9yID49IHYudmVyc2lvbk1pbm9yKXsKCQlyZXR1cm4gdHJ1ZTsKCX1lbHNlewoJCXJldHVybiBmYWxzZTsKCX0KfTsKClBvdHJlZS5WZXJzaW9uLnByb3RvdHlwZS51cFRvID0gZnVuY3Rpb24odmVyc2lvbil7CglyZXR1cm4gIXRoaXMubmV3ZXJUaGFuKHZlcnNpb24pOwp9ClBvdHJlZS5Qb2ludEF0dHJpYnV0ZU5hbWVzID0ge307CgpQb3RyZWUuUG9pbnRBdHRyaWJ1dGVOYW1lcy5QT1NJVElPTl9DQVJURVNJQU4gCT0gMDsJLy8gZmxvYXQgeCwgeSwgejsKUG90cmVlLlBvaW50QXR0cmlidXRlTmFtZXMuQ09MT1JfUEFDS0VECQk9IDE7CS8vIGJ5dGUgciwgZywgYiwgYTsgCUkgPSBbMCwxXQpQb3RyZWUuUG9pbnRBdHRyaWJ1dGVOYW1lcy5DT0xPUl9GTE9BVFNfMQkJPSAyOwkvLyBmbG9hdCByLCBnLCBiOyAJCUkgPSBbMCwxXQpQb3RyZWUuUG9pbnRBdHRyaWJ1dGVOYW1lcy5DT0xPUl9GTE9BVFNfMjU1CT0gMzsJLy8gZmxvYXQgciwgZywgYjsgCQlJID0gWzAsMjU1XQpQb3RyZWUuUG9pbnRBdHRyaWJ1dGVOYW1lcy5OT1JNQUxfRkxPQVRTCQk9IDQ7ICAJLy8gZmxvYXQgeCwgeSwgejsKUG90cmVlLlBvaW50QXR0cmlidXRlTmFtZXMuRklMTEVSCQkJCT0gNTsKUG90cmVlLlBvaW50QXR0cmlidXRlTmFtZXMuSU5URU5TSVRZCQkJPSA2OwpQb3RyZWUuUG9pbnRBdHRyaWJ1dGVOYW1lcy5DTEFTU0lGSUNBVElPTgkJPSA3OwpQb3RyZWUuUG9pbnRBdHRyaWJ1dGVOYW1lcy5OT1JNQUxfU1BIRVJFTUFQUEVECT0gODsKUG90cmVlLlBvaW50QXR0cmlidXRlTmFtZXMuTk9STUFMX09DVDE2CQk9IDk7ClBvdHJlZS5Qb2ludEF0dHJpYnV0ZU5hbWVzLk5PUk1BTAkJCQk9IDEwOwoKLyoqCiAqIFNvbWUgdHlwZXMgb2YgcG9zc2libGUgcG9pbnQgYXR0cmlidXRlIGRhdGEgZm9ybWF0cwogKiAKICogQGNsYXNzCiAqLwpQb3RyZWUuUG9pbnRBdHRyaWJ1dGVUeXBlcyA9IHsKCURBVEFfVFlQRV9ET1VCTEUJOiB7b3JkaW5hbCA6IDAsIHNpemU6IDh9LAoJREFUQV9UWVBFX0ZMT0FUCQk6IHtvcmRpbmFsIDogMSwgc2l6ZTogNH0sCglEQVRBX1RZUEVfSU5UOAkJOiB7b3JkaW5hbCA6IDIsIHNpemU6IDF9LAoJREFUQV9UWVBFX1VJTlQ4CQk6IHtvcmRpbmFsIDogMywgc2l6ZTogMX0sCglEQVRBX1RZUEVfSU5UMTYJCToge29yZGluYWwgOiA0LCBzaXplOiAyfSwKCURBVEFfVFlQRV9VSU5UMTYJOiB7b3JkaW5hbCA6IDUsIHNpemU6IDJ9LAoJREFUQV9UWVBFX0lOVDMyCQk6IHtvcmRpbmFsIDogNiwgc2l6ZTogNH0sCglEQVRBX1RZUEVfVUlOVDMyCToge29yZGluYWwgOiA3LCBzaXplOiA0fSwKCURBVEFfVFlQRV9JTlQ2NAkJOiB7b3JkaW5hbCA6IDgsIHNpemU6IDh9LAoJREFUQV9UWVBFX1VJTlQ2NAk6IHtvcmRpbmFsIDogOSwgc2l6ZTogOH0KfTsKCnZhciBpID0gMDsKZm9yKHZhciBvYmogaW4gUG90cmVlLlBvaW50QXR0cmlidXRlVHlwZXMpewoJUG90cmVlLlBvaW50QXR0cmlidXRlVHlwZXNbaV0gPSBQb3RyZWUuUG9pbnRBdHRyaWJ1dGVUeXBlc1tvYmpdOwoJaSsrOwp9CgovKioKICogQSBzaW5nbGUgcG9pbnQgYXR0cmlidXRlIHN1Y2ggYXMgY29sb3Ivbm9ybWFsLy4uIGFuZCBpdHMgZGF0YSBmb3JtYXQvbnVtYmVyIG9mIGVsZW1lbnRzLy4uLiAKICogCiAqIEBjbGFzcwogKiBAcGFyYW0gbmFtZSAKICogQHBhcmFtIHR5cGUKICogQHBhcmFtIHNpemUKICogQHJldHVybnMKICovClBvdHJlZS5Qb2ludEF0dHJpYnV0ZSA9IGZ1bmN0aW9uKG5hbWUsIHR5cGUsIG51bUVsZW1lbnRzKXsKCXRoaXMubmFtZSA9IG5hbWU7Cgl0aGlzLnR5cGUgPSB0eXBlOyAKCXRoaXMubnVtRWxlbWVudHMgPSBudW1FbGVtZW50czsKCXRoaXMuYnl0ZVNpemUgPSB0aGlzLm51bUVsZW1lbnRzICogdGhpcy50eXBlLnNpemU7Cn0KClBvdHJlZS5Qb2ludEF0dHJpYnV0ZS5QT1NJVElPTl9DQVJURVNJQU4gPSBuZXcgUG90cmVlLlBvaW50QXR0cmlidXRlKAoJCVBvdHJlZS5Qb2ludEF0dHJpYnV0ZU5hbWVzLlBPU0lUSU9OX0NBUlRFU0lBTiwKCQlQb3RyZWUuUG9pbnRBdHRyaWJ1dGVUeXBlcy5EQVRBX1RZUEVfRkxPQVQsIDMpOwoKUG90cmVlLlBvaW50QXR0cmlidXRlLlJHQkFfUEFDS0VEID0gbmV3IFBvdHJlZS5Qb2ludEF0dHJpYnV0ZSgKCQlQb3RyZWUuUG9pbnRBdHRyaWJ1dGVOYW1lcy5DT0xPUl9QQUNLRUQsCgkJUG90cmVlLlBvaW50QXR0cmlidXRlVHlwZXMuREFUQV9UWVBFX0lOVDgsIDQpOwoKUG90cmVlLlBvaW50QXR0cmlidXRlLkNPTE9SX1BBQ0tFRCA9IFBvdHJlZS5Qb2ludEF0dHJpYnV0ZS5SR0JBX1BBQ0tFRDsKClBvdHJlZS5Qb2ludEF0dHJpYnV0ZS5SR0JfUEFDS0VEID0gbmV3IFBvdHJlZS5Qb2ludEF0dHJpYnV0ZSgKCQlQb3RyZWUuUG9pbnRBdHRyaWJ1dGVOYW1lcy5DT0xPUl9QQUNLRUQsCgkJUG90cmVlLlBvaW50QXR0cmlidXRlVHlwZXMuREFUQV9UWVBFX0lOVDgsIDMpOwoKUG90cmVlLlBvaW50QXR0cmlidXRlLk5PUk1BTF9GTE9BVFMgPSBuZXcgUG90cmVlLlBvaW50QXR0cmlidXRlKAoJCVBvdHJlZS5Qb2ludEF0dHJpYnV0ZU5hbWVzLk5PUk1BTF9GTE9BVFMsCgkJUG90cmVlLlBvaW50QXR0cmlidXRlVHlwZXMuREFUQV9UWVBFX0ZMT0FULCAzKTsKClBvdHJlZS5Qb2ludEF0dHJpYnV0ZS5GSUxMRVJfMUIgPSBuZXcgUG90cmVlLlBvaW50QXR0cmlidXRlKAoJCVBvdHJlZS5Qb2ludEF0dHJpYnV0ZU5hbWVzLkZJTExFUiwKCQlQb3RyZWUuUG9pbnRBdHRyaWJ1dGVUeXBlcy5EQVRBX1RZUEVfVUlOVDgsIDEpOwoJCQpQb3RyZWUuUG9pbnRBdHRyaWJ1dGUuSU5URU5TSVRZID0gbmV3IFBvdHJlZS5Qb2ludEF0dHJpYnV0ZSgKCQlQb3RyZWUuUG9pbnRBdHRyaWJ1dGVOYW1lcy5JTlRFTlNJVFksCgkJUG90cmVlLlBvaW50QXR0cmlidXRlVHlwZXMuREFUQV9UWVBFX1VJTlQxNiwgMSk7CQkKCQkKUG90cmVlLlBvaW50QXR0cmlidXRlLkNMQVNTSUZJQ0FUSU9OID0gbmV3IFBvdHJlZS5Qb2ludEF0dHJpYnV0ZSgKCQlQb3RyZWUuUG9pbnRBdHRyaWJ1dGVOYW1lcy5DTEFTU0lGSUNBVElPTiwKCQlQb3RyZWUuUG9pbnRBdHRyaWJ1dGVUeXBlcy5EQVRBX1RZUEVfVUlOVDgsIDEpOwkKCQkKUG90cmVlLlBvaW50QXR0cmlidXRlLk5PUk1BTF9TUEhFUkVNQVBQRUQgPSBuZXcgUG90cmVlLlBvaW50QXR0cmlidXRlKAoJCVBvdHJlZS5Qb2ludEF0dHJpYnV0ZU5hbWVzLk5PUk1BTF9TUEhFUkVNQVBQRUQsCgkJUG90cmVlLlBvaW50QXR0cmlidXRlVHlwZXMuREFUQV9UWVBFX1VJTlQ4LCAyKTsJCQoJCQpQb3RyZWUuUG9pbnRBdHRyaWJ1dGUuTk9STUFMX09DVDE2ID0gbmV3IFBvdHJlZS5Qb2ludEF0dHJpYnV0ZSgKCQlQb3RyZWUuUG9pbnRBdHRyaWJ1dGVOYW1lcy5OT1JNQUxfT0NUMTYsCgkJUG90cmVlLlBvaW50QXR0cmlidXRlVHlwZXMuREFUQV9UWVBFX1VJTlQ4LCAyKTsJCgkJClBvdHJlZS5Qb2ludEF0dHJpYnV0ZS5OT1JNQUwgPSBuZXcgUG90cmVlLlBvaW50QXR0cmlidXRlKAoJCVBvdHJlZS5Qb2ludEF0dHJpYnV0ZU5hbWVzLk5PUk1BTCwKCQlQb3RyZWUuUG9pbnRBdHRyaWJ1dGVUeXBlcy5EQVRBX1RZUEVfRkxPQVQsIDMpOwoKLyoqCiAqIE9yZGVyZWQgbGlzdCBvZiBQb2ludEF0dHJpYnV0ZXMgdXNlZCB0byBpZGVudGlmeSBob3cgcG9pbnRzIGFyZSBhbGlnbmVkIGluIGEgYnVmZmVyLgogKiAKICogQGNsYXNzCiAqIAogKi8KUG90cmVlLlBvaW50QXR0cmlidXRlcyA9IGZ1bmN0aW9uKHBvaW50QXR0cmlidXRlcyl7Cgl0aGlzLmF0dHJpYnV0ZXMgPSBuZXcgQXJyYXkoKTsKCXRoaXMuYnl0ZVNpemUgPSAwOwoJdGhpcy5zaXplID0gMDsKCQoJaWYocG9pbnRBdHRyaWJ1dGVzICE9IG51bGwpewkKCQlmb3IodmFyIGkgPSAwOyBpIDwgcG9pbnRBdHRyaWJ1dGVzLmxlbmd0aDsgaSsrKXsKCQkJdmFyIHBvaW50QXR0cmlidXRlTmFtZSA9IHBvaW50QXR0cmlidXRlc1tpXTsKCQkJdmFyIHBvaW50QXR0cmlidXRlID0gUG90cmVlLlBvaW50QXR0cmlidXRlW3BvaW50QXR0cmlidXRlTmFtZV07CgkJCXRoaXMuYXR0cmlidXRlcy5wdXNoKHBvaW50QXR0cmlidXRlKTsKCQkJdGhpcy5ieXRlU2l6ZSArPSBwb2ludEF0dHJpYnV0ZS5ieXRlU2l6ZTsKCQkJdGhpcy5zaXplKys7CgkJfQoJfQp9CgpQb3RyZWUuUG9pbnRBdHRyaWJ1dGVzLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbihwb2ludEF0dHJpYnV0ZSl7Cgl0aGlzLmF0dHJpYnV0ZXMucHVzaChwb2ludEF0dHJpYnV0ZSk7Cgl0aGlzLmJ5dGVTaXplICs9IHBvaW50QXR0cmlidXRlLmJ5dGVTaXplOwoJdGhpcy5zaXplKys7Cn07CgpQb3RyZWUuUG9pbnRBdHRyaWJ1dGVzLnByb3RvdHlwZS5oYXNDb2xvcnMgPSBmdW5jdGlvbigpewoJZm9yKHZhciBuYW1lIGluIHRoaXMuYXR0cmlidXRlcyl7CgkJdmFyIHBvaW50QXR0cmlidXRlID0gdGhpcy5hdHRyaWJ1dGVzW25hbWVdOwoJCWlmKHBvaW50QXR0cmlidXRlLm5hbWUgPT09IFBvdHJlZS5Qb2ludEF0dHJpYnV0ZU5hbWVzLkNPTE9SX1BBQ0tFRCl7CgkJCXJldHVybiB0cnVlOwoJCX0KCX0KCQoJcmV0dXJuIGZhbHNlOwp9OwoKUG90cmVlLlBvaW50QXR0cmlidXRlcy5wcm90b3R5cGUuaGFzTm9ybWFscyA9IGZ1bmN0aW9uKCl7Cglmb3IodmFyIG5hbWUgaW4gdGhpcy5hdHRyaWJ1dGVzKXsKCQl2YXIgcG9pbnRBdHRyaWJ1dGUgPSB0aGlzLmF0dHJpYnV0ZXNbbmFtZV07CgkJaWYoCgkJCXBvaW50QXR0cmlidXRlID09PSBQb3RyZWUuUG9pbnRBdHRyaWJ1dGUuTk9STUFMX1NQSEVSRU1BUFBFRCB8fCAKCQkJcG9pbnRBdHRyaWJ1dGUgPT09IFBvdHJlZS5Qb2ludEF0dHJpYnV0ZS5OT1JNQUxfRkxPQVRTIHx8CgkJCXBvaW50QXR0cmlidXRlID09PSBQb3RyZWUuUG9pbnRBdHRyaWJ1dGUuTk9STUFMIHx8CgkJCXBvaW50QXR0cmlidXRlID09PSBQb3RyZWUuUG9pbnRBdHRyaWJ1dGUuTk9STUFMX09DVDE2KXsKCQkJcmV0dXJuIHRydWU7CgkJfQoJfQoJCglyZXR1cm4gZmFsc2U7Cn07CgoK"));
Potree.Shaders["pointcloud.vs"] = [
 "",
 "// the following is an incomplete list of attributes, uniforms and defines",
 "// which are automatically added through the THREE.ShaderMaterial",
 "",
 "//attribute vec3 position;",
 "//attribute vec3 color;",
 "//attribute vec3 normal;",
 "",
 "//uniform mat4 modelMatrix;",
 "//uniform mat4 modelViewMatrix;",
 "//uniform mat4 projectionMatrix;",
 "//uniform mat4 viewMatrix;",
 "//uniform mat3 normalMatrix;",
 "//uniform vec3 cameraPosition;",
 "",
 "//#define MAX_DIR_LIGHTS 0",
 "//#define MAX_POINT_LIGHTS 1",
 "//#define MAX_SPOT_LIGHTS 0",
 "//#define MAX_HEMI_LIGHTS 0",
 "//#define MAX_SHADOWS 0",
 "//#define MAX_BONES 58",
 "",
 "#define max_clip_boxes 30",
 "",
 "attribute float intensity;",
 "attribute float classification;",
 "attribute float returnNumber;",
 "attribute float numberOfReturns;",
 "attribute float pointSourceID;",
 "attribute vec4 indices;",
 "",
 "uniform float screenWidth;",
 "uniform float screenHeight;",
 "uniform float fov;",
 "uniform float spacing;",
 "uniform float near;",
 "uniform float far;",
 "",
 "#if defined use_clip_box",
 "	uniform mat4 clipBoxes[max_clip_boxes];",
 "#endif",
 "",
 "",
 "uniform float heightMin;",
 "uniform float heightMax;",
 "uniform float intensityMin;",
 "uniform float intensityMax;",
 "uniform float size;				// pixel size factor",
 "uniform float minSize;			// minimum pixel size",
 "uniform float maxSize;			// maximum pixel size",
 "uniform float octreeSize;",
 "uniform vec3 bbSize;",
 "uniform vec3 uColor;",
 "uniform float opacity;",
 "uniform float clipBoxCount;",
 "",
 "",
 "uniform sampler2D visibleNodes;",
 "uniform sampler2D gradient;",
 "uniform sampler2D classificationLUT;",
 "uniform sampler2D depthMap;",
 "",
 "varying float	vOpacity;",
 "varying vec3	vColor;",
 "varying float	vLinearDepth;",
 "varying float	vLogDepth;",
 "varying vec3	vViewPosition;",
 "varying float 	vRadius;",
 "varying vec3	vWorldPosition;",
 "varying vec3	vNormal;",
 "",
 "",
 "// ---------------------",
 "// OCTREE",
 "// ---------------------",
 "",
 "#if (defined(adaptive_point_size) || defined(color_type_tree_depth)) && defined(tree_type_octree)",
 "/**",
 " * number of 1-bits up to inclusive index position",
 " * number is treated as if it were an integer in the range 0-255",
 " *",
 " */",
 "float numberOfOnes(float number, float index){",
 "	float tmp = mod(number, pow(2.0, index + 1.0));",
 "	float numOnes = 0.0;",
 "	for(float i = 0.0; i < 8.0; i++){",
 "		if(mod(tmp, 2.0) != 0.0){",
 "			numOnes++;",
 "		}",
 "		tmp = floor(tmp / 2.0);",
 "	}",
 "	return numOnes;",
 "}",
 "",
 "",
 "/**",
 " * checks whether the bit at index is 1",
 " * number is treated as if it were an integer in the range 0-255",
 " *",
 " */",
 "bool isBitSet(float number, float index){",
 "	return mod(floor(number / pow(2.0, index)), 2.0) != 0.0;",
 "}",
 "",
 "",
 "/**",
 " * find the tree depth at the point position",
 " */",
 "float getLocalTreeDepth(){",
 "	vec3 offset = vec3(0.0, 0.0, 0.0);",
 "	float iOffset = 0.0;",
 "	float depth = 0.0;",
 "	for(float i = 0.0; i <= 1000.0; i++){",
 "		float nodeSizeAtLevel = octreeSize  / pow(2.0, i);",
 "		vec3 index3d = (position - offset) / nodeSizeAtLevel;",
 "		index3d = floor(index3d + 0.5);",
 "		float index = 4.0*index3d.x + 2.0*index3d.y + index3d.z;",
 "		",
 "		vec4 value = texture2D(visibleNodes, vec2(iOffset / 2048.0, 0.0));",
 "		float mask = value.r * 255.0;",
 "		if(isBitSet(mask, index)){",
 "			// there are more visible child nodes at this position",
 "			iOffset = iOffset + value.g * 255.0 + numberOfOnes(mask, index - 1.0);",
 "			depth++;",
 "		}else{",
 "			// no more visible child nodes at this position",
 "			return depth;",
 "		}",
 "		offset = offset + (vec3(1.0, 1.0, 1.0) * nodeSizeAtLevel * 0.5) * index3d;",
 "	}",
 "		",
 "	return depth;",
 "}",
 "",
 "float getPointSizeAttenuation(){",
 "	return pow(1.9, getLocalTreeDepth());",
 "}",
 "",
 "",
 "#endif",
 "",
 "",
 "// ---------------------",
 "// KD-TREE",
 "// ---------------------",
 "",
 "#if (defined(adaptive_point_size) || defined(color_type_tree_depth)) && defined(tree_type_kdtree)",
 "",
 "float getLocalTreeDepth(){",
 "	vec3 offset = vec3(0.0, 0.0, 0.0);",
 "	float iOffset = 0.0;",
 "	float depth = 0.0;",
 "		",
 "		",
 "	vec3 size = bbSize;	",
 "	vec3 pos = position;",
 "		",
 "	for(float i = 0.0; i <= 1000.0; i++){",
 "		",
 "		vec4 value = texture2D(visibleNodes, vec2(iOffset / 2048.0, 0.0));",
 "		",
 "		int children = int(value.r * 255.0);",
 "		float next = value.g * 255.0;",
 "		int split = int(value.b * 255.0);",
 "		",
 "		if(next == 0.0){",
 "		 	return depth;",
 "		}",
 "		",
 "		vec3 splitv = vec3(0.0, 0.0, 0.0);",
 "		if(split == 1){",
 "			splitv.x = 1.0;",
 "		}else if(split == 2){",
 "		 	splitv.y = 1.0;",
 "		}else if(split == 4){",
 "		 	splitv.z = 1.0;",
 "		}",
 "		",
 "		iOffset = iOffset + next;",
 "		",
 "		float factor = length(pos * splitv / size);",
 "		if(factor < 0.5){",
 "		 	// left",
 "		    if(children == 0 || children == 2){",
 "		    	return depth;",
 "		    }",
 "		}else{",
 "		  	// right",
 "		    pos = pos - size * splitv * 0.5;",
 "		    if(children == 0 || children == 1){",
 "		    	return depth;",
 "		    }",
 "		    if(children == 3){",
 "		    	iOffset = iOffset + 1.0;",
 "		    }",
 "		}",
 "		size = size * ((1.0 - (splitv + 1.0) / 2.0) + 0.5);",
 "		",
 "		depth++;",
 "	}",
 "		",
 "		",
 "	return depth;	",
 "}",
 "",
 "float getPointSizeAttenuation(){",
 "	return pow(1.3, getLocalTreeDepth());",
 "}",
 "",
 "#endif",
 "",
 "void main() {",
 "	vec4 worldPosition = modelMatrix * vec4( position, 1.0 );",
 "	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );",
 "	vViewPosition = -mvPosition.xyz;",
 "	vWorldPosition = worldPosition.xyz;",
 "	gl_Position = projectionMatrix * mvPosition;",
 "	vOpacity = opacity;",
 "	vLinearDepth = -mvPosition.z;",
 "	vNormal = normalize(normalMatrix * normal);",
 "	",
 "	#if defined(use_edl)",
 "		vLogDepth = log2(gl_Position.w + 1.0) / log2(far + 1.0);",
 "	#endif",
 "	",
 "	//#if defined(use_logarithmic_depth_buffer)",
 "	//	float logarithmicZ = (2.0 * log2(gl_Position.w + 1.0) / log2(far + 1.0) - 1.0) * gl_Position.w;",
 "	//	gl_Position.z = logarithmicZ;",
 "	//#endif",
 "",
 "	// ---------------------",
 "	// POINT COLOR",
 "	// ---------------------",
 "	",
 "	#ifdef color_type_rgb",
 "		vColor = color;",
 "	#elif defined color_type_height",
 "		vec4 world = modelMatrix * vec4( position, 1.0 );",
 "		float w = (world.y - heightMin) / (heightMax-heightMin);",
 "		vColor = texture2D(gradient, vec2(w,1.0-w)).rgb;",
 "	#elif defined color_type_depth",
 "		float linearDepth = -mvPosition.z ;",
 "		float expDepth = (gl_Position.z / gl_Position.w) * 0.5 + 0.5;",
 "		vColor = vec3(linearDepth, expDepth, 0.0);",
 "	#elif defined color_type_intensity",
 "		float w = (intensity - intensityMin) / (intensityMax - intensityMin);",
 "		vColor = vec3(w, w, w);",
 "	#elif defined color_type_intensity_gradient",
 "		float w = (intensity - intensityMin) / intensityMax;",
 "		vColor = texture2D(gradient, vec2(w,1.0-w)).rgb;",
 "	#elif defined color_type_color",
 "		vColor = uColor;",
 "	#elif defined color_type_tree_depth",
 "		float depth = getLocalTreeDepth();",
 "		float w = depth / 30.0;",
 "		vColor = texture2D(gradient, vec2(w,1.0-w)).rgb;",
 "	#elif defined color_type_point_index",
 "		vColor = indices.rgb;",
 "	#elif defined color_type_classification",
 "		float c = mod(classification, 16.0);",
 "		vec2 uv = vec2(c / 255.0, 0.5);",
 "		vColor = texture2D(classificationLUT, uv).rgb;",
 "		",
 "		// TODO only for testing - removing points with class 7",
 "		if(classification == 7.0){",
 "			gl_Position = vec4(100.0, 100.0, 100.0, 0.0);",
 "		}",
 "	#elif defined color_type_return_number",
 "		//float w = (returnNumber - 1.0) / 4.0 + 0.1;",
 "		//vColor = texture2D(gradient, vec2(w, 1.0 - w)).rgb;",
 "		",
 "		if(numberOfReturns == 1.0){",
 "			vColor = vec3(1.0, 1.0, 0.0);",
 "		}else{",
 "			if(returnNumber == 1.0){",
 "				vColor = vec3(1.0, 0.0, 0.0);",
 "			}else if(returnNumber == numberOfReturns){",
 "				vColor = vec3(0.0, 0.0, 1.0);",
 "			}else{",
 "				vColor = vec3(0.0, 1.0, 0.0);",
 "			}",
 "		}",
 "		",
 "	#elif defined color_type_source",
 "		float w = mod(pointSourceID, 10.0) / 10.0;",
 "		vColor = texture2D(gradient, vec2(w,1.0 - w)).rgb;",
 "	#elif defined color_type_normal",
 "		vColor = (modelMatrix * vec4(normal, 0.0)).xyz;",
 "	#elif defined color_type_phong",
 "		vColor = color;",
 "	#endif",
 "	",
 "	//if(vNormal.z < 0.0){",
 "	//	gl_Position = vec4(1000.0, 1000.0, 1000.0, 1.0);",
 "	//}",
 "	",
 "	// ---------------------",
 "	// POINT SIZE",
 "	// ---------------------",
 "	float pointSize = 1.0;",
 "	",
 "	float projFactor = 1.0 / tan(fov / 2.0);",
 "	projFactor /= vViewPosition.z;",
 "	projFactor *= screenHeight / 2.0;",
 "	float r = spacing * 1.5;",
 "	vRadius = r;",
 "	#if defined fixed_point_size",
 "		pointSize = size;",
 "	#elif defined attenuated_point_size",
 "		pointSize = size * projFactor;",
 "	#elif defined adaptive_point_size",
 "		float worldSpaceSize = size * r / getPointSizeAttenuation();",
 "		pointSize = worldSpaceSize * projFactor;",
 "	#endif",
 "",
 "	pointSize = max(minSize, pointSize);",
 "	pointSize = min(maxSize, pointSize);",
 "	",
 "	vRadius = pointSize / projFactor;",
 "	",
 "	gl_PointSize = pointSize;",
 "	",
 "	",
 "	// ---------------------",
 "	// CLIPPING",
 "	// ---------------------",
 "	",
 "	#if defined use_clip_box",
 "		bool insideAny = false;",
 "		for(int i = 0; i < max_clip_boxes; i++){",
 "			if(i == int(clipBoxCount)){",
 "				break;",
 "			}",
 "		",
 "			vec4 clipPosition = clipBoxes[i] * modelMatrix * vec4( position, 1.0 );",
 "			bool inside = -0.5 <= clipPosition.x && clipPosition.x <= 0.5;",
 "			inside = inside && -0.5 <= clipPosition.y && clipPosition.y <= 0.5;",
 "			inside = inside && -0.5 <= clipPosition.z && clipPosition.z <= 0.5;",
 "			insideAny = insideAny || inside;",
 "		}",
 "		if(!insideAny){",
 "	",
 "			#if defined clip_outside",
 "				gl_Position = vec4(1000.0, 1000.0, 1000.0, 1.0);",
 "			#elif defined clip_highlight_inside && !defined(color_type_depth)",
 "				float c = (vColor.r + vColor.g + vColor.b) / 6.0;",
 "			#endif",
 "		}else{",
 "			#if defined clip_highlight_inside",
 "			vColor.r += 0.5;",
 "			#endif",
 "		}",
 "	",
 "	#endif",
 "	",
 "}",
 "",
].join("\n");

Potree.Shaders["pointcloud.fs"] = [
 "",
 "#if defined use_interpolation",
 "	#extension GL_EXT_frag_depth : enable",
 "#endif",
 "",
 "",
 "// the following is an incomplete list of attributes, uniforms and defines",
 "// which are automatically added through the THREE.ShaderMaterial",
 "",
 "// #define USE_COLOR",
 "// ",
 "// uniform mat4 viewMatrix;",
 "// uniform vec3 cameraPosition;",
 "",
 "",
 "uniform mat4 projectionMatrix;",
 "uniform float opacity;",
 "",
 "",
 "#if defined(color_type_phong)",
 "",
 "	uniform vec3 diffuse;",
 "	uniform vec3 ambient;",
 "	uniform vec3 emissive;",
 "	uniform vec3 specular;",
 "	uniform float shininess;",
 "	uniform vec3 ambientLightColor;",
 "",
 "	#if MAX_POINT_LIGHTS > 0",
 "",
 "		uniform vec3 	pointLightColor[ MAX_POINT_LIGHTS ];",
 "		uniform vec3 	pointLightPosition[ MAX_POINT_LIGHTS ];",
 "		uniform float 	pointLightDistance[ MAX_POINT_LIGHTS ];",
 "		uniform float 	pointLightDecay[ MAX_POINT_LIGHTS ];",
 "",
 "	#endif",
 "",
 "	#if MAX_DIR_LIGHTS > 0",
 "",
 "		uniform vec3 directionalLightColor[ MAX_DIR_LIGHTS ];",
 "		uniform vec3 directionalLightDirection[ MAX_DIR_LIGHTS ];",
 "",
 "	#endif",
 "",
 "#endif",
 "",
 "//#if MAX_SPOT_LIGHTS > 0",
 "//",
 "//	uniform vec3 spotLightColor[ MAX_SPOT_LIGHTS ];",
 "//	uniform vec3 spotLightPosition[ MAX_SPOT_LIGHTS ];",
 "//	uniform vec3 spotLightDirection[ MAX_SPOT_LIGHTS ];",
 "//	uniform float spotLightAngleCos[ MAX_SPOT_LIGHTS ];",
 "//	uniform float spotLightExponent[ MAX_SPOT_LIGHTS ];",
 "//",
 "//	uniform float spotLightDistance[ MAX_SPOT_LIGHTS ];",
 "//",
 "//#endif",
 "",
 "uniform float fov;",
 "uniform float spacing;",
 "uniform float near;",
 "uniform float far;",
 "uniform float pcIndex;",
 "uniform float screenWidth;",
 "uniform float screenHeight;",
 "",
 "uniform sampler2D depthMap;",
 "",
 "varying vec3	vColor;",
 "varying float	vOpacity;",
 "varying float	vLinearDepth;",
 "varying float	vLogDepth;",
 "varying vec3	vViewPosition;",
 "varying float	vRadius;",
 "varying vec3	vWorldPosition;",
 "varying vec3	vNormal;",
 "",
 "float specularStrength = 1.0;",
 "",
 "void main() {",
 "",
 "	vec3 color = vColor;",
 "	float depth = gl_FragCoord.z;",
 "",
 "	#if defined(circle_point_shape) || defined(use_interpolation) || defined (weighted_splats)",
 "		float u = 2.0 * gl_PointCoord.x - 1.0;",
 "		float v = 2.0 * gl_PointCoord.y - 1.0;",
 "	#endif",
 "	",
 "	#if defined(circle_point_shape) || defined (weighted_splats)",
 "		float cc = u*u + v*v;",
 "		if(cc > 1.0){",
 "			discard;",
 "		}",
 "	#endif",
 "	",
 "	#if defined weighted_splats",
 "		vec2 uv = gl_FragCoord.xy / vec2(screenWidth, screenHeight);",
 "		float sDepth = texture2D(depthMap, uv).r;",
 "		if(vLinearDepth > sDepth + vRadius){",
 "			discard;",
 "		}",
 "	#endif",
 "	",
 "	#if defined use_interpolation",
 "		float wi = 0.0 - ( u*u + v*v);",
 "		vec4 pos = vec4(-vViewPosition, 1.0);",
 "		pos.z += wi * vRadius;",
 "		float linearDepth = pos.z;",
 "		pos = projectionMatrix * pos;",
 "		pos = pos / pos.w;",
 "		float expDepth = pos.z;",
 "		depth = (pos.z + 1.0) / 2.0;",
 "		gl_FragDepthEXT = depth;",
 "		",
 "		#if defined(color_type_depth)",
 "			color.r = linearDepth;",
 "			color.g = expDepth;",
 "		#endif",
 "		",
 "	#endif",
 "	",
 "	#if defined color_type_point_index",
 "		gl_FragColor = vec4(color, pcIndex / 255.0);",
 "	#else",
 "		gl_FragColor = vec4(color, vOpacity);",
 "	#endif",
 "	",
 "	#if defined weighted_splats",
 "	    float w = pow(1.0 - (u*u + v*v), 2.0);",
 "		gl_FragColor.rgb = gl_FragColor.rgb * w;",
 "		gl_FragColor.a = w;",
 "	#endif",
 "	",
 "	vec3 normal = normalize( vNormal );",
 "	normal.z = abs(normal.z);",
 "	vec3 viewPosition = normalize( vViewPosition );",
 "	",
 "	#if defined(color_type_phong)",
 "",
 "	// code taken from three.js phong light fragment shader",
 "	",
 "		#if MAX_POINT_LIGHTS > 0",
 "",
 "			vec3 pointDiffuse = vec3( 0.0 );",
 "			vec3 pointSpecular = vec3( 0.0 );",
 "",
 "			for ( int i = 0; i < MAX_POINT_LIGHTS; i ++ ) {",
 "",
 "				vec4 lPosition = viewMatrix * vec4( pointLightPosition[ i ], 1.0 );",
 "				vec3 lVector = lPosition.xyz + vViewPosition.xyz;",
 "",
 "				float lDistance = 1.0;",
 "				if ( pointLightDistance[ i ] > 0.0 )",
 "					lDistance = 1.0 - min( ( length( lVector ) / pointLightDistance[ i ] ), 1.0 );",
 "",
 "				lVector = normalize( lVector );",
 "",
 "						// diffuse",
 "",
 "				float dotProduct = dot( normal, lVector );",
 "",
 "				#ifdef WRAP_AROUND",
 "",
 "					float pointDiffuseWeightFull = max( dotProduct, 0.0 );",
 "					float pointDiffuseWeightHalf = max( 0.5 * dotProduct + 0.5, 0.0 );",
 "",
 "					vec3 pointDiffuseWeight = mix( vec3( pointDiffuseWeightFull ), vec3( pointDiffuseWeightHalf ), wrapRGB );",
 "",
 "				#else",
 "",
 "					float pointDiffuseWeight = max( dotProduct, 0.0 );",
 "",
 "				#endif",
 "",
 "				pointDiffuse += diffuse * pointLightColor[ i ] * pointDiffuseWeight * lDistance;",
 "",
 "						// specular",
 "",
 "				vec3 pointHalfVector = normalize( lVector + viewPosition );",
 "				float pointDotNormalHalf = max( dot( normal, pointHalfVector ), 0.0 );",
 "				float pointSpecularWeight = specularStrength * max( pow( pointDotNormalHalf, shininess ), 0.0 );",
 "",
 "				float specularNormalization = ( shininess + 2.0 ) / 8.0;",
 "",
 "				vec3 schlick = specular + vec3( 1.0 - specular ) * pow( max( 1.0 - dot( lVector, pointHalfVector ), 0.0 ), 5.0 );",
 "				pointSpecular += schlick * pointLightColor[ i ] * pointSpecularWeight * pointDiffuseWeight * lDistance * specularNormalization;",
 "				pointSpecular = vec3(0.0, 0.0, 0.0);",
 "			}",
 "		",
 "		#endif",
 "		",
 "		#if MAX_DIR_LIGHTS > 0",
 "",
 "			vec3 dirDiffuse = vec3( 0.0 );",
 "			vec3 dirSpecular = vec3( 0.0 );",
 "",
 "			for( int i = 0; i < MAX_DIR_LIGHTS; i ++ ) {",
 "",
 "				vec4 lDirection = viewMatrix * vec4( directionalLightDirection[ i ], 0.0 );",
 "				vec3 dirVector = normalize( lDirection.xyz );",
 "",
 "						// diffuse",
 "",
 "				float dotProduct = dot( normal, dirVector );",
 "",
 "				#ifdef WRAP_AROUND",
 "",
 "					float dirDiffuseWeightFull = max( dotProduct, 0.0 );",
 "					float dirDiffuseWeightHalf = max( 0.5 * dotProduct + 0.5, 0.0 );",
 "",
 "					vec3 dirDiffuseWeight = mix( vec3( dirDiffuseWeightFull ), vec3( dirDiffuseWeightHalf ), wrapRGB );",
 "",
 "				#else",
 "",
 "					float dirDiffuseWeight = max( dotProduct, 0.0 );",
 "",
 "				#endif",
 "",
 "				dirDiffuse += diffuse * directionalLightColor[ i ] * dirDiffuseWeight;",
 "",
 "				// specular",
 "",
 "				vec3 dirHalfVector = normalize( dirVector + viewPosition );",
 "				float dirDotNormalHalf = max( dot( normal, dirHalfVector ), 0.0 );",
 "				float dirSpecularWeight = specularStrength * max( pow( dirDotNormalHalf, shininess ), 0.0 );",
 "",
 "				float specularNormalization = ( shininess + 2.0 ) / 8.0;",
 "",
 "				vec3 schlick = specular + vec3( 1.0 - specular ) * pow( max( 1.0 - dot( dirVector, dirHalfVector ), 0.0 ), 5.0 );",
 "				dirSpecular += schlick * directionalLightColor[ i ] * dirSpecularWeight * dirDiffuseWeight * specularNormalization;",
 "			}",
 "",
 "		#endif",
 "		",
 "		vec3 totalDiffuse = vec3( 0.0 );",
 "		vec3 totalSpecular = vec3( 0.0 );",
 "		",
 "		#if MAX_POINT_LIGHTS > 0",
 "",
 "			totalDiffuse += pointDiffuse;",
 "			totalSpecular += pointSpecular;",
 "",
 "		#endif",
 "		",
 "		#if MAX_DIR_LIGHTS > 0",
 "",
 "			totalDiffuse += dirDiffuse;",
 "			totalSpecular += dirSpecular;",
 "",
 "		#endif",
 "		",
 "		gl_FragColor.xyz = gl_FragColor.xyz * ( emissive + totalDiffuse + ambientLightColor * ambient ) + totalSpecular;",
 "",
 "	#endif",
 "	",
 "	",
 "	#if defined(use_edl)",
 "		gl_FragColor.a = vLogDepth;",
 "	#endif",
 "	",
 "}",
 "",
 "",
 "",
].join("\n");

Potree.Shaders["normalize.vs"] = [
 "",
 "varying vec2 vUv;",
 "",
 "void main() {",
 "    vUv = uv;",
 "",
 "    gl_Position =   projectionMatrix * modelViewMatrix * vec4(position,1.0);",
 "}",
].join("\n");

Potree.Shaders["normalize.fs"] = [
 "",
 "#extension GL_EXT_frag_depth : enable",
 "",
 "uniform sampler2D depthMap;",
 "uniform sampler2D texture;",
 "",
 "varying vec2 vUv;",
 "",
 "void main() {",
 "    float depth = texture2D(depthMap, vUv).g; ",
 "	",
 "	if(depth <= 0.0){",
 "		discard;",
 "	}",
 "	",
 "    vec4 color = texture2D(texture, vUv); ",
 "	color = color / color.w;",
 "    ",
 "	gl_FragColor = vec4(color.xyz, 1.0); ",
 "	",
 "	gl_FragDepthEXT = depth;",
 "}",
].join("\n");

Potree.Shaders["edl.vs"] = [
 "",
 "",
 "varying vec2 vUv;",
 "",
 "void main() {",
 "    vUv = uv;",
 "	",
 "	vec4 mvPosition = modelViewMatrix * vec4(position,1.0);",
 "",
 "    gl_Position = projectionMatrix * mvPosition;",
 "}",
].join("\n");

Potree.Shaders["edl.fs"] = [
 "",
 "// ",
 "// adapted from the EDL shader code from Christian Boucheny in cloud compare:",
 "// https://github.com/cloudcompare/trunk/tree/master/plugins/qEDL/shaders/EDL",
 "//",
 "",
 "#define NEIGHBOUR_COUNT 8",
 "",
 "uniform mat4 projectionMatrix;",
 "",
 "uniform float screenWidth;",
 "uniform float screenHeight;",
 "uniform float near;",
 "uniform float far;",
 "uniform vec2 neighbours[NEIGHBOUR_COUNT];",
 "uniform vec3 lightDir;",
 "uniform float expScale;",
 "uniform float radius;",
 "",
 "//uniform sampler2D depthMap;",
 "uniform sampler2D colorMap;",
 "",
 "varying vec2 vUv;",
 "",
 "/**",
 " * transform linear depth to [0,1] interval with 1 beeing closest to the camera.",
 " */",
 "float ztransform(float linearDepth){",
 "	return 1.0 - (linearDepth - near) / (far - near);",
 "}",
 "",
 "float expToLinear(float z){",
 "    z = 2.0 * z - 1.0;",
 "	float linear = (2.0 * near * far) / (far + near - z * (far - near));",
 "",
 "	return linear;",
 "}",
 "",
 "// this actually only returns linear depth values if LOG_BIAS is 1.0",
 "// lower values work out more nicely, though.",
 "#define LOG_BIAS 0.01",
 "float logToLinear(float z){",
 "	return (pow((1.0 + LOG_BIAS * far), z) - 1.0) / LOG_BIAS;",
 "}",
 "",
 "float obscurance(float z, float dist){",
 "	return max(0.0, z) / dist;",
 "}",
 "",
 "float computeObscurance(float linearDepth){",
 "	vec4 P = vec4(0, 0, 1, -ztransform(linearDepth));",
 "	vec2 uvRadius = radius / vec2(screenWidth, screenHeight);",
 "	",
 "	float sum = 0.0;",
 "	",
 "	for(int c = 0; c < NEIGHBOUR_COUNT; c++){",
 "		vec2 N_rel_pos = uvRadius * neighbours[c];",
 "		vec2 N_abs_pos = vUv + N_rel_pos;",
 "		",
 "		float neighbourDepth = logToLinear(texture2D(colorMap, N_abs_pos).a);",
 "		",
 "		if(neighbourDepth != 0.0){",
 "			float Zn = ztransform(neighbourDepth);",
 "			float Znp = dot( vec4( N_rel_pos, Zn, 1.0), P );",
 "			",
 "			sum += obscurance( Znp, 0.05 * linearDepth );",
 "		}",
 "	}",
 "	",
 "	return sum;",
 "}",
 "",
 "void main(){",
 "	float linearDepth = logToLinear(texture2D(colorMap, vUv).a);",
 "	",
 "	float f = computeObscurance(linearDepth);",
 "	f = exp(-expScale * f);",
 "	",
 "	vec4 color = texture2D(colorMap, vUv);",
 "	if(color.a == 0.0 && f >= 1.0){",
 "		discard;",
 "	}",
 "	",
 "	gl_FragColor = vec4(color.rgb * f, 1.0);",
 "}",
 "",
].join("\n");

Potree.Shaders["blur.vs"] = [
 "",
 "varying vec2 vUv;",
 "",
 "void main() {",
 "    vUv = uv;",
 "",
 "    gl_Position =   projectionMatrix * modelViewMatrix * vec4(position,1.0);",
 "}",
].join("\n");

Potree.Shaders["blur.fs"] = [
 "",
 "uniform mat4 projectionMatrix;",
 "",
 "uniform float screenWidth;",
 "uniform float screenHeight;",
 "uniform float near;",
 "uniform float far;",
 "",
 "uniform sampler2D map;",
 "",
 "varying vec2 vUv;",
 "",
 "void main() {",
 "",
 "	float dx = 1.0 / screenWidth;",
 "	float dy = 1.0 / screenHeight;",
 "",
 "	vec3 color = vec3(0.0, 0.0, 0.0);",
 "	color += texture2D(map, vUv + vec2(-dx, -dy)).rgb;",
 "	color += texture2D(map, vUv + vec2(  0, -dy)).rgb;",
 "	color += texture2D(map, vUv + vec2(+dx, -dy)).rgb;",
 "	color += texture2D(map, vUv + vec2(-dx,   0)).rgb;",
 "	color += texture2D(map, vUv + vec2(  0,   0)).rgb;",
 "	color += texture2D(map, vUv + vec2(+dx,   0)).rgb;",
 "	color += texture2D(map, vUv + vec2(-dx,  dy)).rgb;",
 "	color += texture2D(map, vUv + vec2(  0,  dy)).rgb;",
 "	color += texture2D(map, vUv + vec2(+dx,  dy)).rgb;",
 "    ",
 "	color = color / 9.0;",
 "	",
 "	gl_FragColor = vec4(color, 1.0);",
 "	",
 "	",
 "}",
].join("\n");




THREE.PerspectiveCamera.prototype.zoomTo = function( node, factor ){

	if ( !node.geometry && !node.boundingSphere) {
	
		return;
	
	}
	
	if ( node.geometry && node.geometry.boundingSphere === null ) { 
	
		node.geometry.computeBoundingSphere();
	
	}
	
	node.updateMatrixWorld();

	var _factor = factor || 1;
	var bs = node.boundingSphere || node.geometry.boundingSphere;
	bs = bs.clone().applyMatrix4(node.matrixWorld); 
	var radius = bs.radius;
	var fovr = this.fov * Math.PI / 180;
	
	if( this.aspect < 1 ){
	
		fovr = fovr * this.aspect;
		
	}
	
	var distanceFactor = Math.abs( radius / Math.sin( fovr / 2 ) ) * _factor ;
	
	var dir = new THREE.Vector3( 0, 0, -1 ).applyQuaternion( this.quaternion );
	var offset = dir.multiplyScalar( -distanceFactor );
	this.position.copy(bs.center.clone().add( offset ));
	
};



//THREE.PerspectiveCamera.prototype.zoomTo = function(node, factor){
//	if(factor === undefined){
//		factor = 1;
//	}
//
//	node.updateMatrixWorld();
//	this.updateMatrix();
//	this.updateMatrixWorld();
//	
//	var box = Potree.utils.computeTransformedBoundingBox(node.boundingBox, node.matrixWorld);
//	var dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.quaternion);
//	var pos = box.center().sub(dir);
//	
//	var ps = [
//		new THREE.Vector3(box.min.x, box.min.y, box.min.z),
//		new THREE.Vector3(box.min.x, box.min.y, box.min.z),
//		new THREE.Vector3(box.max.x, box.min.y, box.min.z),
//		new THREE.Vector3(box.min.x, box.max.y, box.min.z),
//		new THREE.Vector3(box.min.x, box.min.y, box.max.z),
//		new THREE.Vector3(box.min.x, box.max.y, box.max.z),
//		new THREE.Vector3(box.max.x, box.max.y, box.min.z),
//		new THREE.Vector3(box.max.x, box.min.y, box.max.z),
//		new THREE.Vector3(box.max.x, box.max.y, box.max.z)
//	];
//	
//	var frustum = new THREE.Frustum();
//	frustum.setFromMatrix(new THREE.Matrix4().multiplyMatrices(this.projectionMatrix, this.matrixWorldInverse));
//	
//	var max = Number.MIN_VALUE;
//	for(var i = 0; i < ps.length; i++){
//		var p  = ps[i];
//		
//		var distance = Number.MIN_VALUE;
//		// iterate through left, right, top and bottom planes
//		for(var j = 0; j < frustum.planes.length-2; j++){
//			var plane = frustum.planes[j];
//			var ray = new THREE.Ray(p, dir);
//			var dI = ray.distanceToPlaneWithNegative(plane);
//			distance = Math.max(distance, dI);
//		}
//		max = Math.max(max, distance);
//	}
//	var offset = dir.clone().multiplyScalar(-max);
//	offset.multiplyScalar(factor);
//	pos.add(offset);
//	this.position.copy(pos);
//	
//}
THREE.Ray.prototype.distanceToPlaneWithNegative = function ( plane ) {
	var denominator = plane.normal.dot( this.direction );
	if ( denominator == 0 ) {

		// line is coplanar, return origin
		if( plane.distanceToPoint( this.origin ) == 0 ) {
			return 0;
		}

		// Null is preferable to undefined since undefined means.... it is undefined
		return null;
	}
	var t = - ( this.origin.dot( plane.normal ) + plane.constant ) / denominator;

	return t;
}


/**
 * @class Loads mno files and returns a PointcloudOctree
 * for a description of the mno binary file format, read mnoFileFormat.txt
 * 
 * @author Markus Schuetz
 */
Potree.POCLoader = function(){
	
}
 
/**
 * @return a point cloud octree with the root node data loaded. 
 * loading of descendants happens asynchronously when they're needed
 * 
 * @param url
 * @param loadingFinishedListener executed after loading the binary has been finished
 */
Potree.POCLoader.load = function load(url, callback) {
	try{
		var pco = new Potree.PointCloudOctreeGeometry();
		pco.url = url;
		var xhr = new XMLHttpRequest();
		xhr.open('GET', url, true);
		
		xhr.onreadystatechange = function(){
			if(xhr.readyState === 4 && (xhr.status === 200 || xhr.status === 0)){
				var fMno = JSON.parse(xhr.responseText);
				
				var version = new Potree.Version(fMno.version);
				
				// assume octreeDir is absolute if it starts with http
				if(fMno.octreeDir.indexOf("http") === 0){
					pco.octreeDir = fMno.octreeDir;
				}else{
					pco.octreeDir = url + "/../" + fMno.octreeDir;
				}
				
				pco.spacing = fMno.spacing;
				pco.hierarchyStepSize = fMno.hierarchyStepSize;

				pco.pointAttributes = fMno.pointAttributes;
				
				var min = new THREE.Vector3(fMno.boundingBox.lx, fMno.boundingBox.ly, fMno.boundingBox.lz);
				var max = new THREE.Vector3(fMno.boundingBox.ux, fMno.boundingBox.uy, fMno.boundingBox.uz);
				var boundingBox = new THREE.Box3(min, max);
				var tightBoundingBox = boundingBox.clone();
				
				if(fMno.tightBoundingBox){
					tightBoundingBox.min.copy(new THREE.Vector3(fMno.tightBoundingBox.lx, fMno.tightBoundingBox.ly, fMno.tightBoundingBox.lz));
					tightBoundingBox.max.copy(new THREE.Vector3(fMno.tightBoundingBox.ux, fMno.tightBoundingBox.uy, fMno.tightBoundingBox.uz));
				}

				var offset = new THREE.Vector3(0,0,0);
				
				offset.set(-min.x, -min.y, -min.z);
				
				boundingBox.min.add(offset);
				boundingBox.max.add(offset);
				
				tightBoundingBox.min.add(offset);
				tightBoundingBox.max.add(offset);
				
				pco.boundingBox = boundingBox;
				pco.tightBoundingBox = tightBoundingBox
				pco.boundingSphere = boundingBox.getBoundingSphere();
				pco.tightBoundingSphere = tightBoundingBox.getBoundingSphere();
				pco.offset = offset;
				if(fMno.pointAttributes === "LAS"){
					pco.loader = new Potree.LasLazLoader(fMno.version);
				}else if(fMno.pointAttributes === "LAZ"){
					pco.loader = new Potree.LasLazLoader(fMno.version);
				}else{
					pco.loader = new Potree.BinaryLoader(fMno.version, boundingBox, fMno.scale);
					pco.pointAttributes = new Potree.PointAttributes(pco.pointAttributes);
				}
				
				var nodes = {};
				
				{ // load root
					var name = "r";
					
					var root = new Potree.PointCloudOctreeGeometryNode(name, pco, boundingBox);
					root.level = 0;
					root.hasChildren = true;
					if(version.upTo("1.5")){
						root.numPoints = fMno.hierarchy[0][1];
					}else{
						root.numPoints = 0;
					}
					pco.root = root;
					pco.root.load();
					nodes[name] = root;
				}
				
				// load remaining hierarchy
				if(version.upTo("1.4")){
					for( var i = 1; i < fMno.hierarchy.length; i++){
						var name = fMno.hierarchy[i][0];
						var numPoints = fMno.hierarchy[i][1];
						var index = parseInt(name.charAt(name.length-1));
						var parentName = name.substring(0, name.length-1);
						var parentNode = nodes[parentName];
						var level = name.length-1;
						var boundingBox = Potree.POCLoader.createChildAABB(parentNode.boundingBox, index);
						
						var node = new Potree.PointCloudOctreeGeometryNode(name, pco, boundingBox);
						node.level = level;
						node.numPoints = numPoints;
						parentNode.addChild(node);
						nodes[name] = node;
					}
				}
				
				pco.nodes = nodes;
				
				callback(pco);
			}
		}
		
		xhr.send(null);
	}catch(e){
		console.log("loading failed: '" + url + "'");
		console.log(e);
	}
};

Potree.POCLoader.loadPointAttributes = function(mno){
	
	var fpa = mno.pointAttributes;
	var pa = new Potree.PointAttributes();
	
	for(var i = 0; i < fpa.length; i++){   
		var pointAttribute = Potree.PointAttribute[fpa[i]];
		pa.add(pointAttribute);
	}                                                                     
	
	return pa;
};


Potree.POCLoader.createChildAABB = function(aabb, childIndex){
	var V3 = THREE.Vector3;
	var min = aabb.min;
	var max = aabb.max;
	var dHalfLength = new THREE.Vector3().copy(max).sub(min).multiplyScalar(0.5);
	var xHalfLength = new THREE.Vector3(dHalfLength.x, 0, 0);
	var yHalfLength = new THREE.Vector3(0, dHalfLength.y, 0);
	var zHalfLength = new THREE.Vector3(0, 0, dHalfLength.z);

	var cmin = min;
	var cmax = new THREE.Vector3().add(min).add(dHalfLength);

	var min, max;
	if (childIndex === 1) {
		min = new THREE.Vector3().copy(cmin).add(zHalfLength);
		max = new THREE.Vector3().copy(cmax).add(zHalfLength);
	}else if (childIndex === 3) {
		min = new THREE.Vector3().copy(cmin).add(zHalfLength).add(yHalfLength);
		max = new THREE.Vector3().copy(cmax).add(zHalfLength).add(yHalfLength);
	}else if (childIndex === 0) {
		min = cmin;
		max = cmax;
	}else if (childIndex === 2) {
		min = new THREE.Vector3().copy(cmin).add(yHalfLength);
		max = new THREE.Vector3().copy(cmax).add(yHalfLength);
	}else if (childIndex === 5) {
		min = new THREE.Vector3().copy(cmin).add(zHalfLength).add(xHalfLength);
		max = new THREE.Vector3().copy(cmax).add(zHalfLength).add(xHalfLength);
	}else if (childIndex === 7) {
		min = new THREE.Vector3().copy(cmin).add(dHalfLength);
		max = new THREE.Vector3().copy(cmax).add(dHalfLength);
	}else if (childIndex === 4) {
		min = new THREE.Vector3().copy(cmin).add(xHalfLength);
		max = new THREE.Vector3().copy(cmax).add(xHalfLength);
	}else if (childIndex === 6) {
		min = new THREE.Vector3().copy(cmin).add(xHalfLength).add(yHalfLength);
		max = new THREE.Vector3().copy(cmax).add(xHalfLength).add(yHalfLength);
	}
	
	return new THREE.Box3(min, max);
};




Potree.PointAttributeNames = {};

Potree.PointAttributeNames.POSITION_CARTESIAN 	= 0;	// float x, y, z;
Potree.PointAttributeNames.COLOR_PACKED		= 1;	// byte r, g, b, a; 	I = [0,1]
Potree.PointAttributeNames.COLOR_FLOATS_1		= 2;	// float r, g, b; 		I = [0,1]
Potree.PointAttributeNames.COLOR_FLOATS_255	= 3;	// float r, g, b; 		I = [0,255]
Potree.PointAttributeNames.NORMAL_FLOATS		= 4;  	// float x, y, z;
Potree.PointAttributeNames.FILLER				= 5;
Potree.PointAttributeNames.INTENSITY			= 6;
Potree.PointAttributeNames.CLASSIFICATION		= 7;
Potree.PointAttributeNames.NORMAL_SPHEREMAPPED	= 8;
Potree.PointAttributeNames.NORMAL_OCT16		= 9;
Potree.PointAttributeNames.NORMAL				= 10;

/**
 * Some types of possible point attribute data formats
 * 
 * @class
 */
Potree.PointAttributeTypes = {
	DATA_TYPE_DOUBLE	: {ordinal : 0, size: 8},
	DATA_TYPE_FLOAT		: {ordinal : 1, size: 4},
	DATA_TYPE_INT8		: {ordinal : 2, size: 1},
	DATA_TYPE_UINT8		: {ordinal : 3, size: 1},
	DATA_TYPE_INT16		: {ordinal : 4, size: 2},
	DATA_TYPE_UINT16	: {ordinal : 5, size: 2},
	DATA_TYPE_INT32		: {ordinal : 6, size: 4},
	DATA_TYPE_UINT32	: {ordinal : 7, size: 4},
	DATA_TYPE_INT64		: {ordinal : 8, size: 8},
	DATA_TYPE_UINT64	: {ordinal : 9, size: 8}
};

var i = 0;
for(var obj in Potree.PointAttributeTypes){
	Potree.PointAttributeTypes[i] = Potree.PointAttributeTypes[obj];
	i++;
}

/**
 * A single point attribute such as color/normal/.. and its data format/number of elements/... 
 * 
 * @class
 * @param name 
 * @param type
 * @param size
 * @returns
 */
Potree.PointAttribute = function(name, type, numElements){
	this.name = name;
	this.type = type; 
	this.numElements = numElements;
	this.byteSize = this.numElements * this.type.size;
}

Potree.PointAttribute.POSITION_CARTESIAN = new Potree.PointAttribute(
		Potree.PointAttributeNames.POSITION_CARTESIAN,
		Potree.PointAttributeTypes.DATA_TYPE_FLOAT, 3);

Potree.PointAttribute.RGBA_PACKED = new Potree.PointAttribute(
		Potree.PointAttributeNames.COLOR_PACKED,
		Potree.PointAttributeTypes.DATA_TYPE_INT8, 4);

Potree.PointAttribute.COLOR_PACKED = Potree.PointAttribute.RGBA_PACKED;

Potree.PointAttribute.RGB_PACKED = new Potree.PointAttribute(
		Potree.PointAttributeNames.COLOR_PACKED,
		Potree.PointAttributeTypes.DATA_TYPE_INT8, 3);

Potree.PointAttribute.NORMAL_FLOATS = new Potree.PointAttribute(
		Potree.PointAttributeNames.NORMAL_FLOATS,
		Potree.PointAttributeTypes.DATA_TYPE_FLOAT, 3);

Potree.PointAttribute.FILLER_1B = new Potree.PointAttribute(
		Potree.PointAttributeNames.FILLER,
		Potree.PointAttributeTypes.DATA_TYPE_UINT8, 1);
		
Potree.PointAttribute.INTENSITY = new Potree.PointAttribute(
		Potree.PointAttributeNames.INTENSITY,
		Potree.PointAttributeTypes.DATA_TYPE_UINT16, 1);		
		
Potree.PointAttribute.CLASSIFICATION = new Potree.PointAttribute(
		Potree.PointAttributeNames.CLASSIFICATION,
		Potree.PointAttributeTypes.DATA_TYPE_UINT8, 1);	
		
Potree.PointAttribute.NORMAL_SPHEREMAPPED = new Potree.PointAttribute(
		Potree.PointAttributeNames.NORMAL_SPHEREMAPPED,
		Potree.PointAttributeTypes.DATA_TYPE_UINT8, 2);		
		
Potree.PointAttribute.NORMAL_OCT16 = new Potree.PointAttribute(
		Potree.PointAttributeNames.NORMAL_OCT16,
		Potree.PointAttributeTypes.DATA_TYPE_UINT8, 2);	
		
Potree.PointAttribute.NORMAL = new Potree.PointAttribute(
		Potree.PointAttributeNames.NORMAL,
		Potree.PointAttributeTypes.DATA_TYPE_FLOAT, 3);

/**
 * Ordered list of PointAttributes used to identify how points are aligned in a buffer.
 * 
 * @class
 * 
 */
Potree.PointAttributes = function(pointAttributes){
	this.attributes = new Array();
	this.byteSize = 0;
	this.size = 0;
	
	if(pointAttributes != null){	
		for(var i = 0; i < pointAttributes.length; i++){
			var pointAttributeName = pointAttributes[i];
			var pointAttribute = Potree.PointAttribute[pointAttributeName];
			this.attributes.push(pointAttribute);
			this.byteSize += pointAttribute.byteSize;
			this.size++;
		}
	}
}

Potree.PointAttributes.prototype.add = function(pointAttribute){
	this.attributes.push(pointAttribute);
	this.byteSize += pointAttribute.byteSize;
	this.size++;
};

Potree.PointAttributes.prototype.hasColors = function(){
	for(var name in this.attributes){
		var pointAttribute = this.attributes[name];
		if(pointAttribute.name === Potree.PointAttributeNames.COLOR_PACKED){
			return true;
		}
	}
	
	return false;
};

Potree.PointAttributes.prototype.hasNormals = function(){
	for(var name in this.attributes){
		var pointAttribute = this.attributes[name];
		if(
			pointAttribute === Potree.PointAttribute.NORMAL_SPHEREMAPPED || 
			pointAttribute === Potree.PointAttribute.NORMAL_FLOATS ||
			pointAttribute === Potree.PointAttribute.NORMAL ||
			pointAttribute === Potree.PointAttribute.NORMAL_OCT16){
			return true;
		}
	}
	
	return false;
};




Potree.BinaryLoader = function(version, boundingBox, scale){
	if(typeof(version) === "string"){
		this.version = new Potree.Version(version);
	}else{
		this.version = version;
	}
	
	this.boundingBox = boundingBox;
	this.scale = scale;
};

Potree.BinaryLoader.prototype.load = function(node){
	if(node.loaded){
		return;
	}
	
	var scope = this;

	var url = node.getURL();
	
	if(this.version.equalOrHigher("1.4")){
		url += ".bin";
	}
	
	var xhr = new XMLHttpRequest();
	xhr.open('GET', url, true);
	xhr.responseType = 'arraybuffer';
	xhr.overrideMimeType('text/plain; charset=x-user-defined');
	xhr.onreadystatechange = function() {
		if (xhr.readyState === 4) {
			if (xhr.status === 200 || xhr.status === 0) {
				var buffer = xhr.response;
				scope.parse(node, buffer);
			} else {
				console.log('Failed to load file! HTTP status: ' + xhr.status + ", file: " + url);
			}
		}
	};
	try{
		xhr.send(null);
	}catch(e){
		console.log("fehler beim laden der punktwolke: " + e);
	}
};

Potree.BinaryLoader.prototype.parse = function(node, buffer){

	var numPoints = buffer.byteLength / node.pcoGeometry.pointAttributes.byteSize;
	var pointAttributes = node.pcoGeometry.pointAttributes;
	
	if(this.version.upTo("1.5")){
		node.numPoints = numPoints;
	}
	
	var ww = Potree.workers.binaryDecoder.getWorker();
	ww.onmessage = function(e){
		var data = e.data;
		var buffers = data.attributeBuffers;
		var tightBoundingBox = new THREE.Box3(
			new THREE.Vector3().fromArray(data.tightBoundingBox.min),
			new THREE.Vector3().fromArray(data.tightBoundingBox.max)
		);
		
		Potree.workers.binaryDecoder.returnWorker(ww);
		
		var geometry = new THREE.BufferGeometry();
		
		for(var property in buffers){
			if(buffers.hasOwnProperty(property)){
				var buffer = buffers[property].buffer;
				var attribute = buffers[property].attribute;
				var numElements = attribute.numElements;
				
				if(parseInt(property) === Potree.PointAttributeNames.POSITION_CARTESIAN){
					geometry.addAttribute("position", new THREE.BufferAttribute(new Float32Array(buffer), 3));
				}else if(parseInt(property) === Potree.PointAttributeNames.COLOR_PACKED){
					geometry.addAttribute("color", new THREE.BufferAttribute(new Float32Array(buffer), 3));
				}else if(parseInt(property) === Potree.PointAttributeNames.INTENSITY){
					geometry.addAttribute("intensity", new THREE.BufferAttribute(new Float32Array(buffer), 1));
				}else if(parseInt(property) === Potree.PointAttributeNames.CLASSIFICATION){
					geometry.addAttribute("classification", new THREE.BufferAttribute(new Float32Array(buffer), 1));
				}else if(parseInt(property) === Potree.PointAttributeNames.NORMAL_SPHEREMAPPED){
					geometry.addAttribute("normal", new THREE.BufferAttribute(new Float32Array(buffer), 3));
				}else if(parseInt(property) === Potree.PointAttributeNames.NORMAL_OCT16){
					geometry.addAttribute("normal", new THREE.BufferAttribute(new Float32Array(buffer), 3));
				}else if(parseInt(property) === Potree.PointAttributeNames.NORMAL){
					geometry.addAttribute("normal", new THREE.BufferAttribute(new Float32Array(buffer), 3));
				}
			}
		}
		geometry.addAttribute("indices", new THREE.BufferAttribute(new Float32Array(data.indices), 1));
		
		if(!geometry.attributes.normal){
			var buffer = new Float32Array(numPoints*3);
			geometry.addAttribute("normal", new THREE.BufferAttribute(new Float32Array(buffer), 3));
		}
		
		geometry.boundingBox = node.boundingBox;
		//geometry.boundingBox = tightBoundingBox;
		node.geometry = geometry;
		//node.boundingBox = tightBoundingBox;
		node.tightBoundingBox = tightBoundingBox;
		node.loaded = true;
		node.loading = false;
		node.pcoGeometry.numNodesLoading--;
	}
	
	var message = {
		buffer: buffer,
		pointAttributes: pointAttributes,
		version: this.version.version,
		min: [ node.boundingBox.min.x, node.boundingBox.min.y, node.boundingBox.min.z ],
		offset: [node.pcoGeometry.offset.x, node.pcoGeometry.offset.y, node.pcoGeometry.offset.z],
		scale: this.scale
	};
	ww.postMessage(message, [message.buffer]);

};



/**
 * laslaz code taken and adapted from plas.io js-laslaz
 *	http://plas.io/
 *  https://github.com/verma/plasio
 *
 * Thanks to Uday Verma and Howard Butler
 *
 */

Potree.LasLazLoader = function(version){
	if(typeof(version) === "string"){
		this.version = new Potree.Version(version);
	}else{
		this.version = version;
	}
}

Potree.LasLazLoader.prototype.load = function(node){

	if(node.loaded){
		return;
	}
	
	//var url = node.pcoGeometry.octreeDir + "/" + node.name;
	var pointAttributes = node.pcoGeometry.pointAttributes;
	//var url = node.pcoGeometry.octreeDir + "/" + node.name + "." + pointAttributes.toLowerCase()

	var url = node.getURL();
	
	if(this.version.equalOrHigher("1.4")){
		url += "." + pointAttributes.toLowerCase();
	}
	
	var scope = this;
	
	var xhr = new XMLHttpRequest();
	xhr.open('GET', url, true);
	xhr.responseType = 'arraybuffer';
	xhr.overrideMimeType('text/plain; charset=x-user-defined');
	xhr.onreadystatechange = function() {
		if (xhr.readyState === 4) {
			if (xhr.status === 200) {
				var buffer = xhr.response;
				//LasLazLoader.loadData(buffer, handler);
				scope.parse(node, buffer);
			} else {
				console.log('Failed to load file! HTTP status: ' + xhr.status + ", file: " + url);
			}
		}
	};
	
	xhr.send(null);
}

Potree.LasLazLoader.progressCB = function(arg){

};

Potree.LasLazLoader.prototype.parse = function loadData(node, buffer){
	var lf = new LASFile(buffer);
	var handler = new Potree.LasLazBatcher(node);
	
	return Promise.resolve(lf).cancellable().then(function(lf) {
		return lf.open().then(function() {
			lf.isOpen = true;
			return lf;
		})
		.catch(Promise.CancellationError, function(e) {
			// open message was sent at this point, but then handler was not called
			// because the operation was cancelled, explicitly close the file
			return lf.close().then(function() {
				throw e;
			});
		});
	}).then(function(lf) {
		return lf.getHeader().then(function(h) {
			return [lf, h];
		});
	}).then(function(v) {
		var lf = v[0];
		var header = v[1];
		
		var skip = 1;
		var totalRead = 0;
		var totalToRead = (skip <= 1 ? header.pointsCount : header.pointsCount / skip);
		var reader = function() {
			var p = lf.readData(1000000, 0, skip);
			return p.then(function(data) {
				handler.push(new LASDecoder(data.buffer,
												   header.pointsFormatId,
												   header.pointsStructSize,
												   data.count,
												   header.scale,
												   header.offset,
												   header.mins, header.maxs));

				totalRead += data.count;
				Potree.LasLazLoader.progressCB(totalRead / totalToRead);

				if (data.hasMoreData)
					return reader();
				else {

					header.totalRead = totalRead;
					header.versionAsString = lf.versionAsString;
					header.isCompressed = lf.isCompressed;
					return [lf, header, handler];
				}
			});
		};
		
		return reader();
	}).then(function(v) {
		var lf = v[0];
		// we're done loading this file
		//
		Potree.LasLazLoader.progressCB(1);

		// Close it
		return lf.close().then(function() {
			lf.isOpen = false;
			// Delay this a bit so that the user sees 100% completion
			//
			return Promise.delay(200).cancellable();
		}).then(function() {
			// trim off the first element (our LASFile which we don't really want to pass to the user)
			//
			return v.slice(1);
		});
	}).catch(Promise.CancellationError, function(e) {
		// If there was a cancellation, make sure the file is closed, if the file is open
		// close and then fail
		if (lf.isOpen) 
			return lf.close().then(function() {
				lf.isOpen = false;
				throw e;
			});
		throw e;
	});
};

Potree.LasLazLoader.prototype.handle = function(node, url){

};






Potree.LasLazBatcher = function(node){	
	this.push = function(lasBuffer){
		var ww = Potree.workers.lasdecoder.getWorker();
		var mins = new THREE.Vector3(lasBuffer.mins[0], lasBuffer.mins[1], lasBuffer.mins[2]);
		var maxs = new THREE.Vector3(lasBuffer.maxs[0], lasBuffer.maxs[1], lasBuffer.maxs[2]);
		mins.add(node.pcoGeometry.offset);
		maxs.add(node.pcoGeometry.offset);
		
		ww.onmessage = function(e){
			var geometry = new THREE.BufferGeometry();
			var numPoints = lasBuffer.pointsCount;
			
			var endsWith = function(str, suffix) {
				return str.indexOf(suffix, str.length - suffix.length) !== -1;
			}
			
			var positions = e.data.position;
			var colors = e.data.color;
			var intensities = e.data.intensity;
			var classifications = new Uint8Array(e.data.classification);
			var classifications_f = new Float32Array(classifications.byteLength);
			var returnNumbers = new Uint8Array(e.data.returnNumber);
			var numberOfReturns = new Uint8Array(e.data.numberOfReturns);
			var returnNumbers_f = new Float32Array(returnNumbers.byteLength);
			var numberOfReturns_f = new Float32Array(numberOfReturns.byteLength);
			var pointSourceIDs = new Uint16Array(e.data.pointSourceID);
			var pointSourceIDs_f = new Float32Array(pointSourceIDs.length);
			var indices = new ArrayBuffer(numPoints*4);
			var iIndices = new Uint32Array(indices);
			
			var box = new THREE.Box3();
			
			var fPositions = new Float32Array(positions);
			for(var i = 0; i < numPoints; i++){				
				classifications_f[i] = classifications[i];
				returnNumbers_f[i] = returnNumbers[i];
				numberOfReturns_f[i] = numberOfReturns[i];
				pointSourceIDs_f[i] = pointSourceIDs[i];
				iIndices[i] = i;
				
				box.expandByPoint(new THREE.Vector3(fPositions[3*i+0], fPositions[3*i+1], fPositions[3*i+2]));
			}
			
			geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
			geometry.addAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
			geometry.addAttribute('intensity', new THREE.BufferAttribute(new Float32Array(intensities), 1));
			geometry.addAttribute('classification', new THREE.BufferAttribute(new Float32Array(classifications_f), 1));
			geometry.addAttribute('returnNumber', new THREE.BufferAttribute(new Float32Array(returnNumbers_f), 1));
			geometry.addAttribute('numberOfReturns', new THREE.BufferAttribute(new Float32Array(numberOfReturns_f), 1));
			geometry.addAttribute('pointSourceID', new THREE.BufferAttribute(new Float32Array(pointSourceIDs_f), 1));
			geometry.addAttribute('indices', new THREE.BufferAttribute(indices, 1));
			geometry.addAttribute("normal", new THREE.BufferAttribute(new Float32Array(numPoints*3), 3));
			
			var tightBoundingBox = new THREE.Box3(
				new THREE.Vector3().fromArray(e.data.tightBoundingBox.min),
				new THREE.Vector3().fromArray(e.data.tightBoundingBox.max)
			);
			
			geometry.boundingBox = new THREE.Box3(mins, maxs);
			//geometry.boundingBox = tightBoundingBox;
			//node.boundingBox = geometry.boundingBox;
			node.tightBoundingBox = tightBoundingBox;
			
			node.geometry = geometry;
			node.loaded = true;
			node.loading = false;
			node.pcoGeometry.numNodesLoading--;
			
			Potree.workers.lasdecoder.returnWorker(ww);
		};
		
		var message = {
			buffer: lasBuffer.arrayb,
			numPoints: lasBuffer.pointsCount,
			pointSize: lasBuffer.pointSize,
			pointFormatID: 2,
			scale: lasBuffer.scale,
			offset: lasBuffer.offset,
			mins: [node.pcoGeometry.boundingBox.min.x, node.pcoGeometry.boundingBox.min.y, node.pcoGeometry.boundingBox.min.z],
			maxs: [node.pcoGeometry.boundingBox.max.x, node.pcoGeometry.boundingBox.max.y, node.pcoGeometry.boundingBox.max.z],
			bbOffset: [node.pcoGeometry.offset.x, node.pcoGeometry.offset.y, node.pcoGeometry.offset.z]
		};
		ww.postMessage(message, [message.buffer]);
	}
};


//
//
//
// how to calculate the radius of a projected sphere in screen space
// http://stackoverflow.com/questions/21648630/radius-of-projected-sphere-in-screen-space
// http://stackoverflow.com/questions/3717226/radius-of-projected-sphere
//

Potree.Gradients = {
	RAINBOW: [
		[0, new THREE.Color(0.278, 0, 0.714)],
		[1/6, new THREE.Color(0, 0, 1)],
		[2/6, new THREE.Color(0, 1, 1)],
		[3/6, new THREE.Color(0, 1, 0)],
		[4/6, new THREE.Color(1, 1, 0)],
		[5/6, new THREE.Color(1, 0.64, 0)],
		[1, new THREE.Color(1, 0, 0)]
	],
	GRAYSCALE: [
		[0, new THREE.Color(0,0,0)],
		[1, new THREE.Color(1,1,1)]
	]
};

Potree.Classification = {
	"DEFAULT": {
		0: 			new THREE.Color(0.5, 0.5,0.5),
		1: 			new THREE.Color(0.5, 0.5,0.5),
		2: 			new THREE.Color(0.63, 0.32, 0.18),
		3: 			new THREE.Color(0.0, 1.0, 0.0),
		4: 			new THREE.Color(0.0, 0.8, 0.0),
		5: 			new THREE.Color(0.0, 0.6, 0.0 ),
		6: 			new THREE.Color(1.0, 0.66, 0.0),
		7:			new THREE.Color(1.0, 0, 1.0   ),
		8: 			new THREE.Color(1.0, 0, 0.0   ),
		9: 			new THREE.Color(0.0, 0.0, 1.0 ),
		12:			new THREE.Color(1.0, 1.0, 0.0 ),
		"DEFAULT": 	new THREE.Color(0.3, 0.6, 0.6 )
	}
};



Potree.PointSizeType = {
	FIXED: 		0,
	ATTENUATED: 1,
	ADAPTIVE: 	2
};

Potree.PointShape = {
	SQUARE: 0,
	CIRCLE: 1
};

Potree.PointColorType = {
	RGB: 				0,
	COLOR: 				1,
	DEPTH: 				2,
	HEIGHT: 			3,
	INTENSITY: 			4,
	INTENSITY_GRADIENT:	5,
	TREE_DEPTH: 		6,
	POINT_INDEX: 		7,
	CLASSIFICATION: 	8,
	RETURN_NUMBER: 		9,
	SOURCE: 			10,
	NORMAL: 			11,
	PHONG: 				12,
	TREE_DEPTH: 		13
};

Potree.ClipMode = {
	DISABLED: 			0,
	CLIP_OUTSIDE: 		1,
	HIGHLIGHT_INSIDE:	2
};

Potree.TreeType = {
	OCTREE:				0,
	KDTREE:				1
};

Potree.PointCloudMaterial = function(parameters){
	THREE.Material.call( this );

	parameters = parameters || {};

	var color = new THREE.Color( 0xffffff );
	var map = THREE.ImageUtils.generateDataTexture( 2048, 1, color );
	map.magFilter = THREE.NearestFilter;
	this.visibleNodesTexture = map;
	
	var pointSize = parameters.size || 1.0;
	var minSize = parameters.minSize || 1.0;
	var maxSize = parameters.maxSize || 50.0;
	var treeType = parameters.treeType || Potree.TreeType.OCTREE;
	var nodeSize = 1.0;
	
	this._pointSizeType = Potree.PointSizeType.ATTENUATED;
	this._pointShape = Potree.PointShape.SQUARE;
	this._interpolate = false;
	this._pointColorType = Potree.PointColorType.RGB;
	this._useClipBox = false;
	this.numClipBoxes = 0;
	this._clipMode = Potree.ClipMode.DISABLED;
	this._weighted = false;
	this._depthMap;
	this._gradient = Potree.Gradients.RAINBOW;
	this._classification = Potree.Classification.DEFAULT;
	this.gradientTexture = Potree.PointCloudMaterial.generateGradientTexture(this._gradient);
	this.classificationTexture = Potree.PointCloudMaterial.generateClassificationTexture(this._classification);
	this.lights = true;
	this._treeType = treeType;
	this._useLogarithmicDepthBuffer = false;
	this._useEDL = false;
	
	
	
	
	var attributes = {};
	var uniforms = {
		spacing:			{ type: "f", value: 1.0 },
		fov:				{ type: "f", value: 1.0 },
		screenWidth:		{ type: "f", value: 1.0 },
		screenHeight:		{ type: "f", value: 1.0 },
		near:				{ type: "f", value: 0.1 },
		far:				{ type: "f", value: 1.0 },
		uColor:   			{ type: "c", value: new THREE.Color( 0xffffff ) },
		opacity:   			{ type: "f", value: 1.0 },
		size:   			{ type: "f", value: 10 },
		minSize:   			{ type: "f", value: 2 },
		maxSize:   			{ type: "f", value: 2 },
		octreeSize:			{ type: "f", value: 0 },
		bbSize:				{ type: "fv", value: [0,0,0] },
		heightMin:			{ type: "f", value: 0.0 },
		heightMax:			{ type: "f", value: 1.0 },
		intensityMin:		{ type: "f", value: 0.0 },
		intensityMax:		{ type: "f", value: 1.0 },
		clipBoxCount:		{ type: "f", value: 0 },
		visibleNodes:		{ type: "t", value: this.visibleNodesTexture },
		pcIndex:   			{ type: "f", value: 0 },
		gradient: 			{ type: "t", value: this.gradientTexture },
		classificationLUT: 	{ type: "t", value: this.classificationTexture },
		clipBoxes:			{ type: "Matrix4fv", value: [] },
		depthMap: 			{ type: "t", value: null },
		diffuse:			{ type: "fv", value: [1,1,1]},
		ambient:			{ type: "fv", value: [0.1, 0.1, 0.1]},
		ambientLightColor: 			{ type: "fv", value: [1, 1, 1] },
		directionalLightColor: 		{ type: "fv", value: null },
		directionalLightDirection: 	{ type: "fv", value: null },
		pointLightColor: 			{ type: "fv", value: null },
		pointLightPosition: 		{ type: "fv", value: null },
		pointLightDistance: 		{ type: "fv1", value: null },
		pointLightDecay: 			{ type: "fv1", value: null },
		spotLightColor: 			{ type: "fv", value: null },
		spotLightPosition: 			{ type: "fv", value: null },
		spotLightDistance: 			{ type: "fv1", value: null },
		spotLightDecay: 			{ type: "fv1", value: null },
		spotLightDirection: 		{ type: "fv", value: null },
		spotLightAngleCos: 			{ type: "fv1", value: null },
		spotLightExponent: 			{ type: "fv1", value: null },
		hemisphereLightSkyColor: 	{ type: "fv", value: null },
		hemisphereLightGroundColor: { type: "fv", value: null },
		hemisphereLightDirection: 	{ type: "fv", value: null },
	};
	
	this.defaultAttributeValues.normal = [0,0,0];
	
	this.setValues({
		uniforms: uniforms,
		attributes: attributes,
		vertexShader: this.getDefines() + Potree.Shaders["pointcloud.vs"],
		fragmentShader: this.getDefines() + Potree.Shaders["pointcloud.fs"],
		vertexColors: THREE.VertexColors,
		size: pointSize,
		minSize: minSize,
		maxSize: maxSize,
		nodeSize: nodeSize,
		pcIndex: 0,
		alphaTest: 0.9
	});
};

Potree.PointCloudMaterial.prototype = new THREE.ShaderMaterial();

Potree.PointCloudMaterial.prototype.updateShaderSource = function(){
	
	var attributes = {};
	if(this.pointColorType === Potree.PointColorType.INTENSITY
		|| this.pointColorType === Potree.PointColorType.INTENSITY_GRADIENT){
		attributes.intensity = { type: "f", value: [] };
	}else if(this.pointColorType === Potree.PointColorType.CLASSIFICATION){
		attributes.classification = { type: "f", value: [] };
	}else if(this.pointColorType === Potree.PointColorType.RETURN_NUMBER){
		attributes.returnNumber = { type: "f", value: [] };
		attributes.numberOfReturns = { type: "f", value: [] };
	}else if(this.pointColorType === Potree.PointColorType.SOURCE){
		attributes.pointSourceID = { type: "f", value: [] };
	}else if(this.pointColorType === Potree.PointColorType.NORMAL || this.pointColorType === Potree.PointColorType.PHONG){
		attributes.normal = { type: "f", value: [] };
	}
	
	var vs = this.getDefines() + Potree.Shaders["pointcloud.vs"];
	var fs = this.getDefines() + Potree.Shaders["pointcloud.fs"];
	
	this.setValues({
		attributes: attributes,
		vertexShader: vs,
		fragmentShader: fs
	});
	
	if(this.depthMap){
		this.uniforms.depthMap.value = this.depthMap;
		this.setValues({
			depthMap: this.depthMap,
		});
	}
	
	if(this.opacity === 1.0){
		this.setValues({
			blending: THREE.NoBlending,
			transparent: false,
			depthTest: true,
			depthWrite: true
		});
	}else{
		this.setValues({
			blending: THREE.AdditiveBlending,
			transparent: true,
			depthTest: false,
			depthWrite: true
		});
	}
		
	if(this.weighted){	
		this.setValues({
			blending: THREE.AdditiveBlending,
			transparent: true,
			depthTest: true,
			depthWrite: false
		});	
	}
		
		
		
		
	this.needsUpdate = true;
};

Potree.PointCloudMaterial.prototype.getDefines = function(){

	var defines = "";
	
	if(this.pointSizeType === Potree.PointSizeType.FIXED){
		defines += "#define fixed_point_size\n";
	}else if(this.pointSizeType === Potree.PointSizeType.ATTENUATED){
		defines += "#define attenuated_point_size\n";
	}else if(this.pointSizeType === Potree.PointSizeType.ADAPTIVE){
		defines += "#define adaptive_point_size\n";
	}
	
	if(this.pointShape === Potree.PointShape.SQUARE){
		defines += "#define square_point_shape\n";
	}else if(this.pointShape === Potree.PointShape.CIRCLE){
		defines += "#define circle_point_shape\n";
	}
	
	if(this._interpolate){
		defines += "#define use_interpolation\n";
	}
	
	if(this._useLogarithmicDepthBuffer){
		defines += "#define use_logarithmic_depth_buffer\n";
	}
	
	if(this._useEDL){
		defines += "#define use_edl\n";
	}
	
	if(this._pointColorType === Potree.PointColorType.RGB){
		defines += "#define color_type_rgb\n";
	}else if(this._pointColorType === Potree.PointColorType.COLOR){
		defines += "#define color_type_color\n";
	}else if(this._pointColorType === Potree.PointColorType.DEPTH){
		defines += "#define color_type_depth\n";
	}else if(this._pointColorType === Potree.PointColorType.HEIGHT){
		defines += "#define color_type_height\n";
	}else if(this._pointColorType === Potree.PointColorType.INTENSITY){
		defines += "#define color_type_intensity\n";
	}else if(this._pointColorType === Potree.PointColorType.INTENSITY_GRADIENT){
		defines += "#define color_type_intensity_gradient\n";
	}else if(this._pointColorType === Potree.PointColorType.TREE_DEPTH){
		defines += "#define color_type_tree_depth\n";
	}else if(this._pointColorType === Potree.PointColorType.POINT_INDEX){
		defines += "#define color_type_point_index\n";
	}else if(this._pointColorType === Potree.PointColorType.CLASSIFICATION){
		defines += "#define color_type_classification\n";
	}else if(this._pointColorType === Potree.PointColorType.RETURN_NUMBER){
		defines += "#define color_type_return_number\n";
	}else if(this._pointColorType === Potree.PointColorType.SOURCE){
		defines += "#define color_type_source\n";
	}else if(this._pointColorType === Potree.PointColorType.NORMAL){
		defines += "#define color_type_normal\n";
	}else if(this._pointColorType === Potree.PointColorType.PHONG){
		defines += "#define color_type_phong\n";
	}
	
	if(this.clipMode === Potree.ClipMode.DISABLED){
		defines += "#define clip_disabled\n";
	}else if(this.clipMode === Potree.ClipMode.CLIP_OUTSIDE){
		defines += "#define clip_outside\n";
	}else if(this.clipMode === Potree.ClipMode.HIGHLIGHT_INSIDE){
		defines += "#define clip_highlight_inside\n";
	}
	
	if(this._treeType === Potree.TreeType.OCTREE){
		defines += "#define tree_type_octree\n";
	}else if(this._treeType === Potree.TreeType.KDTREE){
		defines += "#define tree_type_kdtree\n";
	}
	
	if(this.weighted){
		defines += "#define weighted_splats\n";
	}
	
	if(this.numClipBoxes > 0){
		defines += "#define use_clip_box\n";
	}

	return defines;
};

Potree.PointCloudMaterial.prototype.setClipBoxes = function(clipBoxes){
	if(!clipBoxes){
		return;
	}

	this.clipBoxes = clipBoxes;
	var doUpdate = (this.numClipBoxes != clipBoxes.length) && (clipBoxes.length === 0 || this.numClipBoxes === 0);

	this.numClipBoxes = clipBoxes.length;
	this.uniforms.clipBoxCount.value = this.numClipBoxes;
	
	if(doUpdate){
		this.updateShaderSource();
	}
	
	this.uniforms.clipBoxes.value = new Float32Array(this.numClipBoxes * 16);
	
	for(var i = 0; i < this.numClipBoxes; i++){
		var box = clipBoxes[i];
		
		this.uniforms.clipBoxes.value.set(box.elements, 16*i);
	}
};


Object.defineProperty(Potree.PointCloudMaterial.prototype, "gradient", {
	get: function(){
		return this._gradient;
	},
	set: function(value){
		if(this._gradient !== value){
			this._gradient = value;
			this.gradientTexture = Potree.PointCloudMaterial.generateGradientTexture(this._gradient);
			this.uniforms.gradient.value = this.gradientTexture;
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "classification", {
	get: function(){
		return this._classification;
	},
	set: function(value){
		if(this._classification !== value){
			this._classification = value;
			this.classificationTexture = Potree.PointCloudMaterial.generateClassificationTexture(this._classification);
			this.uniforms.classificationLUT.value = this.classificationTexture;
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "spacing", {
	get: function(){
		return this.uniforms.spacing.value;
	},
	set: function(value){
		if(this.uniforms.spacing.value !== value){
			this.uniforms.spacing.value = value;
			//this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "useClipBox", {
	get: function(){
		return this._useClipBox;
	},
	set: function(value){
		if(this._useClipBox !== value){
			this._useClipBox = value;
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "weighted", {
	get: function(){
		return this._weighted;
	},
	set: function(value){
		if(this._weighted !== value){
			this._weighted = value;
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "fov", {
	get: function(){
		return this.uniforms.fov.value;
	},
	set: function(value){
		if(this.uniforms.fov.value !== value){
			this.uniforms.fov.value = value;
			//this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "screenWidth", {
	get: function(){
		return this.uniforms.screenWidth.value;
	},
	set: function(value){
		if(this.uniforms.screenWidth.value !== value){
			this.uniforms.screenWidth.value = value;
			//this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "screenHeight", {
	get: function(){
		return this.uniforms.screenHeight.value;
	},
	set: function(value){
		if(this.uniforms.screenHeight.value !== value){
			this.uniforms.screenHeight.value = value;
			//this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "near", {
	get: function(){
		return this.uniforms.near.value;
	},
	set: function(value){
		if(this.uniforms.near.value !== value){
			this.uniforms.near.value = value;
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "far", {
	get: function(){
		return this.uniforms.far.value;
	},
	set: function(value){
		if(this.uniforms.far.value !== value){
			this.uniforms.far.value = value;
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "opacity", {
	get: function(){
		return this.uniforms.opacity.value;
	},
	set: function(value){
		if(this.uniforms.opacity){
			if(this.uniforms.opacity.value !== value){
				this.uniforms.opacity.value = value;
				this.updateShaderSource();
			}
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "pointColorType", {
	get: function(){
		return this._pointColorType;
	},
	set: function(value){
		if(this._pointColorType !== value){
			this._pointColorType = value;
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "depthMap", {
	get: function(){
		return this._depthMap;
	},
	set: function(value){
		if(this._depthMap !== value){
			this._depthMap = value;
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "pointSizeType", {
	get: function(){
		return this._pointSizeType;
	},
	set: function(value){
		if(this._pointSizeType !== value){
			this._pointSizeType = value;
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "clipMode", {
	get: function(){
		return this._clipMode;
	},
	set: function(value){
		if(this._clipMode !== value){
			this._clipMode = value;
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "interpolate", {
	get: function(){
		return this._interpolate;
	},
	set: function(value){
		if(this._interpolate !== value){
			this._interpolate = value;
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "useEDL", {
	get: function(){
		return this._useEDL;
	},
	set: function(value){
		if(this._useEDL !== value){
			this._useEDL = value;
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "useLogarithmicDepthBuffer", {
	get: function(){
		return this._useLogarithmicDepthBuffer;
	},
	set: function(value){
		if(this._useLogarithmicDepthBuffer !== value){
			this._useLogarithmicDepthBuffer = value;
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "color", {
	get: function(){
		return this.uniforms.uColor.value;
	},
	set: function(value){
		if(this.uniforms.uColor.value !== value){
			this.uniforms.uColor.value.copy(value);
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "pointShape", {
	get: function(){
		return this._pointShape;
	},
	set: function(value){
		if(this._pointShape !== value){
			this._pointShape = value;
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "size", {
	get: function(){
		return this.uniforms.size.value;
	},
	set: function(value){
		this.uniforms.size.value = value;
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "minSize", {
	get: function(){
		return this.uniforms.minSize.value;
	},
	set: function(value){
		this.uniforms.minSize.value = value;
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "maxSize", {
	get: function(){
		return this.uniforms.maxSize.value;
	},
	set: function(value){
		this.uniforms.maxSize.value = value;
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "heightMin", {
	get: function(){
		return this.uniforms.heightMin.value;
	},
	set: function(value){
		this.uniforms.heightMin.value = value;
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "heightMax", {
	get: function(){
		return this.uniforms.heightMax.value;
	},
	set: function(value){
		this.uniforms.heightMax.value = value;
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "intensityMin", {
	get: function(){
		return this.uniforms.intensityMin.value;
	},
	set: function(value){
		this.uniforms.intensityMin.value = value;
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "intensityMax", {
	get: function(){
		return this.uniforms.intensityMax.value;
	},
	set: function(value){
		this.uniforms.intensityMax.value = value;
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "pcIndex", {
	get: function(){
		return this.uniforms.pcIndex.value;
	},
	set: function(value){
		this.uniforms.pcIndex.value = value;
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "treeType", {
	get: function(){
		return this._treeType;
	},
	set: function(value){
		if(this._treeType != value){
			this._treeType = value;
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "bbSize", {
	get: function(){
		return this.uniforms.bbSize.value;
	},
	set: function(value){
		this.uniforms.bbSize.value = value;
	}
});

/**
 * Generates a look-up texture for gradient values (height, intensity, ...)
 *
 */
Potree.PointCloudMaterial.generateGradientTexture = function(gradient) {
	var size = 64;

	// create canvas
	canvas = document.createElement( 'canvas' );
	canvas.width = size;
	canvas.height = size;

	// get context
	var context = canvas.getContext( '2d' );

	// draw gradient
	context.rect( 0, 0, size, size );
	var ctxGradient = context.createLinearGradient( 0, 0, size, size );
	
	for(var i = 0;i < gradient.length; i++){
		var step = gradient[i];
		
		ctxGradient.addColorStop(step[0], "#" + step[1].getHexString());
	} 
    
	context.fillStyle = ctxGradient;
	context.fill();
	
	var texture = new THREE.Texture( canvas );
	texture.needsUpdate = true;
	textureImage = texture.image;

	return texture;
};

/**
 * Generates a look up texture for classification colors
 *
 */
Potree.PointCloudMaterial.generateClassificationTexture  = function(classification){
	var width = 256;
	var height = 256;
	var map = THREE.ImageUtils.generateDataTexture( width, height, new THREE.Color() );
	map.magFilter = THREE.NearestFilter;
	var data = map.image.data;
	
	for(var x = 0; x < width; x++){
		for(var y = 0; y < height; y++){
			var u = 2 * (x / width) - 1;
			var v = 2 * (y / height) - 1;
			
			var i = x + width*y;
			
			var color;
			if(classification[x]){
				color = classification[x];
			}else{
				color = classification.DEFAULT;
			}
			
			
			data[3*i+0] = 255 * color.r;
			data[3*i+1] = 255 * color.g;
			data[3*i+2] = 255 * color.b;
		}
	}
	
	return map;
	
};

//
// Algorithm by Christian Boucheny
// shader code taken and adapted from CloudCompare
//
// see
// https://github.com/cloudcompare/trunk/tree/master/plugins/qEDL/shaders/EDL
// http://www.kitware.com/source/home/post/9
// https://tel.archives-ouvertes.fr/tel-00438464/document p. 115+ (french)




Potree.EyeDomeLightingMaterial = function(parameters){
	THREE.Material.call( this );

	parameters = parameters || {};
	
	var neighbourCount = 8;
	var neighbours = new Float32Array(neighbourCount*2);
	for(var c = 0; c < neighbourCount; c++){
		neighbours[2*c+0] = Math.cos(2 * c * Math.PI / neighbourCount);
		neighbours[2*c+1] = Math.sin(2 * c * Math.PI / neighbourCount);
	}
	
	//var neighbourCount = 32;
	//var neighbours = new Float32Array(neighbourCount*2);
	//for(var c = 0; c < neighbourCount; c++){
	//	var r = (c / neighbourCount) * 4 + 0.1;
	//	neighbours[2*c+0] = Math.cos(2 * c * Math.PI / neighbourCount) * r;
	//	neighbours[2*c+1] = Math.sin(2 * c * Math.PI / neighbourCount) * r;
	//}
	
	var lightDir = new THREE.Vector3(0.0, 0.0, 1.0).normalize();
	
	var uniforms = {
		screenWidth: 	{ type: "f", 	value: 0 },
		screenHeight: 	{ type: "f", 	value: 0 },
		near: 			{ type: "f", 	value: 0 },
		far: 			{ type: "f", 	value: 0 },
		expScale: 		{ type: "f", 	value: 100.0 },
		radius: 		{ type: "f", 	value: 3.0 },
		lightDir:		{ type: "v3",	value: lightDir },
		neighbours:		{ type: "2fv", 	value: neighbours },
		depthMap: 		{ type: "t", 	value: null },
		colorMap: 		{ type: "t", 	value: null }
	};
	
	this.setValues({
		uniforms: uniforms,
		vertexShader: Potree.Shaders["edl.vs"],
		fragmentShader: Potree.Shaders["edl.fs"],
	});
	
};


Potree.EyeDomeLightingMaterial.prototype = new THREE.ShaderMaterial();
















// see http://john-chapman-graphics.blogspot.co.at/2013/01/ssao-tutorial.html



Potree.BlurMaterial = function(parameters){
	THREE.Material.call( this );

	parameters = parameters || {};
	
	var uniforms = {
		near: 			{ type: "f", value: 0 },
		far: 			{ type: "f", value: 0 },
		screenWidth: 	{ type: "f", value: 0 },
		screenHeight: 	{ type: "f", value: 0 },
		map: 			{ type: "t", value: null }
	};
	
	this.setValues({
		uniforms: uniforms,
		vertexShader: Potree.Shaders["blur.vs"],
		fragmentShader: Potree.Shaders["blur.fs"],
	});
	
};


Potree.BlurMaterial.prototype = new THREE.ShaderMaterial();












/**
 * @author mschuetz / http://mschuetz.at
 *
 * adapted from THREE.OrbitControls by 
 *
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 *
 * This set of controls performs first person navigation without mouse lock.
 * Instead, rotating the camera is done by dragging with the left mouse button.
 *
 * move: a/s/d/w or up/down/left/right
 * rotate: left mouse
 * pan: right mouse
 * change speed: mouse wheel
 *
 *
 */



THREE.FirstPersonControls = function ( object, domElement ) {
	this.object = object;
	this.domElement = ( domElement !== undefined ) ? domElement : document;
	
	// Set to false to disable this control
	this.enabled = true;

	this.rotateSpeed = 1.0;
	this.moveSpeed = 10.0;

	this.keys = { 
		LEFT: 37, 
		UP: 38, 
		RIGHT: 39, 
		BOTTOM: 40,
		A: 'A'.charCodeAt(0),
		S: 'S'.charCodeAt(0),
		D: 'D'.charCodeAt(0),
		W: 'W'.charCodeAt(0)
	};

	var scope = this;

	var rotateStart = new THREE.Vector2();
	var rotateEnd = new THREE.Vector2();
	var rotateDelta = new THREE.Vector2();

	var panStart = new THREE.Vector2();
	var panEnd = new THREE.Vector2();
	var panDelta = new THREE.Vector2();
	var panOffset = new THREE.Vector3();

	var offset = new THREE.Vector3();

	var phiDelta = 0;
	var thetaDelta = 0;
	var scale = 1;
	var pan = new THREE.Vector3();

	var lastPosition = new THREE.Vector3();

	var STATE = { NONE : -1, ROTATE : 0, SPEEDCHANGE : 1, PAN : 2 };

	var state = STATE.NONE;

	// for reset
	this.position0 = this.object.position.clone();

	// events

	var changeEvent = { type: 'change' };
	var startEvent = { type: 'start'};
	var endEvent = { type: 'end'};

	this.rotateLeft = function ( angle ) {
		thetaDelta -= angle;
	};

	this.rotateUp = function ( angle ) {
		phiDelta -= angle;
	};

	// pass in distance in world space to move left
	this.panLeft = function ( distance ) {

		var te = this.object.matrix.elements;

		// get X column of matrix
		panOffset.set( te[ 0 ], te[ 1 ], te[ 2 ] );
		panOffset.multiplyScalar( - distance );
		
		pan.add( panOffset );

	};

	// pass in distance in world space to move up
	this.panUp = function ( distance ) {

		var te = this.object.matrix.elements;

		// get Y column of matrix
		panOffset.set( te[ 4 ], te[ 5 ], te[ 6 ] );
		panOffset.multiplyScalar( distance );
		
		pan.add( panOffset );

	};
	
	// pass in distance in world space to move forward
	this.panForward = function ( distance ) {

		var te = this.object.matrix.elements;

		// get Y column of matrix
		panOffset.set( te[ 8 ], te[ 9 ], te[ 10 ] );
		panOffset.multiplyScalar( distance );
		
		pan.add( panOffset );

	};
	
	this.pan = function ( deltaX, deltaY ) {

		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

		if ( scope.object.fov !== undefined ) {
			// perspective
			var position = scope.object.position;
			var offset = position.clone();
			var targetDistance = offset.length();

			// half of the fov is center to top of screen
			targetDistance *= Math.tan( ( scope.object.fov / 2 ) * Math.PI / 180.0 );

			// we actually don't use screenWidth, since perspective camera is fixed to screen height
			scope.panLeft( 2 * deltaX * targetDistance / element.clientHeight );
			scope.panUp( 2 * deltaY * targetDistance / element.clientHeight );
		} else if ( scope.object.top !== undefined ) {

			// orthographic
			scope.panLeft( deltaX * (scope.object.right - scope.object.left) / element.clientWidth );
			scope.panUp( deltaY * (scope.object.top - scope.object.bottom) / element.clientHeight );
		} else {

			// camera neither orthographic or perspective
			console.warn( 'WARNING: FirstPersonControls.js encountered an unknown camera type - pan disabled.' );
		}
	};

	this.update = function (delta) {
		this.object.rotation.order = 'ZYX';
		
		var object = this.object;
		
		this.object = new THREE.Object3D();
		this.object.position.copy(object.position);
		this.object.rotation.copy(object.rotation);
		this.object.updateMatrix();
		this.object.updateMatrixWorld();
	
		var position = this.object.position;
		
		if(delta !== undefined){
			if(this.moveRight){
				this.panLeft(-delta * this.moveSpeed);
			}
			if(this.moveLeft){
				this.panLeft(delta * this.moveSpeed);
			}
			if(this.moveForward){
				this.panForward(-delta * this.moveSpeed);
			}
			if(this.moveBackward){
				this.panForward(delta * this.moveSpeed);
			}
		}
		
		if(!pan.equals(new THREE.Vector3(0,0,0))){
			var event = {
				type: 'move',
				translation: pan.clone()
			};
			this.dispatchEvent(event);
		}
		
		position.add(pan);
		
		if(!(thetaDelta === 0.0 && phiDelta === 0.0)) {
			var event = {
				type: 'rotate',
				thetaDelta: thetaDelta,
				phiDelta: phiDelta
			};
			this.dispatchEvent(event);
		}
		
		this.object.updateMatrix();
		var rot = new THREE.Matrix4().makeRotationY(thetaDelta);
		var res = new THREE.Matrix4().multiplyMatrices(rot, this.object.matrix);
		this.object.quaternion.setFromRotationMatrix(res);
		
		this.object.rotation.x += phiDelta;
		this.object.updateMatrixWorld();
		
		// send transformation proposal to listeners
		var proposeTransformEvent = {
			type: "proposeTransform",
			oldPosition: object.position,
			newPosition: this.object.position,
			objections: 0,
			counterProposals: []
		};
		this.dispatchEvent(proposeTransformEvent);
		
		// check some counter proposals if transformation wasn't accepted
		if(proposeTransformEvent.objections > 0 ){
			if(proposeTransformEvent.counterProposals.length > 0){
				var cp = proposeTransformEvent.counterProposals;
				this.object.position.copy(cp[0]);
				
				proposeTransformEvent.objections = 0;
				proposeTransformEvent.counterProposals = [];
			}
		}
		
		// apply transformation, if accepted
		if(proposeTransformEvent.objections > 0){
			
		}else{
			object.position.copy(this.object.position);
		}
		
		object.rotation.copy(this.object.rotation);
		
		this.object = object;

		thetaDelta = 0;
		phiDelta = 0;
		scale = 1;
		pan.set( 0, 0, 0 );

		if ( lastPosition.distanceTo( this.object.position ) > 0 ) {
			this.dispatchEvent( changeEvent );

			lastPosition.copy( this.object.position );
		}
	};


	this.reset = function () {
		state = STATE.NONE;

		this.object.position.copy( this.position0 );
	};

	function onMouseDown( event ) {
		if ( scope.enabled === false ) return;
		event.preventDefault();

		if ( event.button === 0 ) {
			state = STATE.ROTATE;

			rotateStart.set( event.clientX, event.clientY );
		} else if ( event.button === 2 ) {
			state = STATE.PAN;

			panStart.set( event.clientX, event.clientY );
		}

		scope.domElement.addEventListener( 'mousemove', onMouseMove, false );
		scope.domElement.addEventListener( 'mouseup', onMouseUp, false );
		scope.dispatchEvent( startEvent );
	}

	function onMouseMove( event ) {
		if ( scope.enabled === false ) return;

		event.preventDefault();

		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

		if ( state === STATE.ROTATE ) {
			rotateEnd.set( event.clientX, event.clientY );
			rotateDelta.subVectors( rotateEnd, rotateStart );

			// rotating across whole screen goes 360 degrees around
			scope.rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed );

			// rotating up and down along whole screen attempts to go 360, but limited to 180
			scope.rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed );

			rotateStart.copy( rotateEnd );

		} else if ( state === STATE.PAN ) {
			panEnd.set( event.clientX, event.clientY );
			panDelta.subVectors( panEnd, panStart );
			//panDelta.multiplyScalar(this.moveSpeed).multiplyScalar(0.0001);
			panDelta.multiplyScalar(0.0005).multiplyScalar(scope.moveSpeed);
			
			scope.pan( panDelta.x, panDelta.y );

			panStart.copy( panEnd );
		}
	}

	function onMouseUp() {
		if ( scope.enabled === false ) return;

		scope.domElement.removeEventListener( 'mousemove', onMouseMove, false );
		scope.domElement.removeEventListener( 'mouseup', onMouseUp, false );
		scope.dispatchEvent( endEvent );
		state = STATE.NONE;

	}

	function onMouseWheel(event) {
		if ( scope.enabled === false || scope.noZoom === true ) return;

		event.preventDefault();

		var direction = (event.detail<0 || event.wheelDelta>0) ? 1 : -1;
		scope.moveSpeed += scope.moveSpeed * 0.1 * direction;

		scope.moveSpeed = Math.max(0.1, scope.moveSpeed);

		scope.dispatchEvent( startEvent );
		scope.dispatchEvent( endEvent );
	}

	function onKeyDown( event ) {
		if ( scope.enabled === false) return;
		
		switch ( event.keyCode ) {
			case scope.keys.UP: scope.moveForward = true; break;
			case scope.keys.BOTTOM: scope.moveBackward = true; break;
			case scope.keys.LEFT: scope.moveLeft = true; break;
			case scope.keys.RIGHT: scope.moveRight = true; break;
			case scope.keys.W: scope.moveForward = true; break;
			case scope.keys.S: scope.moveBackward = true; break;
			case scope.keys.A: scope.moveLeft = true; break;
			case scope.keys.D: scope.moveRight = true; break;			
		}
	}
	
	function onKeyUp( event ) {
		switch ( event.keyCode ) {
			case scope.keys.W: scope.moveForward = false; break;
			case scope.keys.S: scope.moveBackward = false; break;
			case scope.keys.A: scope.moveLeft = false; break;
			case scope.keys.D: scope.moveRight = false; break;
			case scope.keys.UP: scope.moveForward = false; break;
			case scope.keys.BOTTOM: scope.moveBackward = false; break;
			case scope.keys.LEFT: scope.moveLeft = false; break;
			case scope.keys.RIGHT: scope.moveRight = false; break;
		}
	}

	this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
	this.domElement.addEventListener( 'mousedown', onMouseDown, false );
	this.domElement.addEventListener( 'mousewheel', onMouseWheel, false );
	this.domElement.addEventListener( 'DOMMouseScroll', onMouseWheel, false ); // firefox

	window.addEventListener( 'keydown', onKeyDown, false );
	window.addEventListener( 'keyup', onKeyUp, false );

};

THREE.FirstPersonControls.prototype = Object.create( THREE.EventDispatcher.prototype );
/**
 * @author mschuetz / http://mschuetz.at/
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 */
/*global THREE, console */

// 
// Adapted from THREE.OrbitControls
// - Smooth movements
// - creates "proposeTransform" events
// 
// 
// This set of controls performs orbiting, dollying (zooming), and panning. It maintains
// the "up" direction as +Y, unlike the TrackballControls. Touch on tablet and phones is
// supported.
//
//    Orbit - left mouse / touch: one finger move
//    Zoom - middle mouse, or mousewheel / touch: two finger spread or squish
//    Pan - right mouse, or arrow keys / touch: three finter swipe
//
// This is a drop-in replacement for (most) TrackballControls used in examples.
// That is, include this js file and wherever you see:
//    	controls = new THREE.TrackballControls( camera );
//      controls.target.z = 150;
// Simple substitute "OrbitControls" and the control should work as-is.

Potree.OrbitControls = function ( object, domElement ) {

	this.object = object;
	this.domElement = ( domElement !== undefined ) ? domElement : document;

	// API

	// Set to false to disable this control
	this.enabled = true;

	// "target" sets the location of focus, where the control orbits around
	// and where it pans with respect to.
	this.target = new THREE.Vector3();

	// center is old, deprecated; use "target" instead
	this.center = this.target;

	// This option actually enables dollying in and out; left as "zoom" for
	// backwards compatibility
	this.noZoom = false;
	this.zoomSpeed = 1.0;

	// Limits to how far you can dolly in and out
	this.minDistance = 0;
	this.maxDistance = Infinity;

	// Set to true to disable this control
	this.noRotate = false;
	this.rotateSpeed = 1.0;

	// Set to true to disable this control
	this.noPan = false;
	this.keyPanSpeed = 7.0;	// pixels moved per arrow key push

	// Set to true to automatically rotate around the target
	this.autoRotate = false;
	this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60
	
	this.fadeFactor = 10;

	// How far you can orbit vertically, upper and lower limits.
	// Range is 0 to Math.PI radians.
	this.minPolarAngle = 0; // radians
	this.maxPolarAngle = Math.PI; // radians

	// Set to true to disable use of the keys
	this.noKeys = false;

	// The four arrow keys
	this.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };

	////////////
	// internals

	var scope = this;

	var EPS = 0.000001;

	var rotateStart = new THREE.Vector2();
	var rotateEnd = new THREE.Vector2();
	var rotateDelta = new THREE.Vector2();

	var panStart = new THREE.Vector2();
	var panEnd = new THREE.Vector2();
	var panDelta = new THREE.Vector2();
	var panOffset = new THREE.Vector3();

	var offset = new THREE.Vector3();

	var dollyStart = new THREE.Vector2();
	var dollyEnd = new THREE.Vector2();
	var dollyDelta = new THREE.Vector2();

	var phiDelta = 0;
	var thetaDelta = 0;
	var scale = 1;
	var pan = new THREE.Vector3();

	var lastPosition = new THREE.Vector3();

	var STATE = { NONE : -1, ROTATE : 0, DOLLY : 1, PAN : 2, TOUCH_ROTATE : 3, TOUCH_DOLLY : 4, TOUCH_PAN : 5 };

	var state = STATE.NONE;

	// for reset

	this.target0 = this.target.clone();
	this.position0 = this.object.position.clone();

	// events

	var changeEvent = { type: 'change' };
	var startEvent = { type: 'start'};
	var endEvent = { type: 'end'};

	this.rotateLeft = function ( angle ) {

		if ( angle === undefined ) {

			angle = getAutoRotationAngle();

		}

		thetaDelta -= angle;

	};

	this.rotateUp = function ( angle ) {

		if ( angle === undefined ) {

			angle = getAutoRotationAngle();

		}

		phiDelta -= angle;

	};

	// pass in distance in world space to move left
	this.panLeft = function ( distance ) {

		var te = this.object.matrix.elements;

		// get X column of matrix
		panOffset.set( te[ 0 ], te[ 1 ], te[ 2 ] );
		panOffset.multiplyScalar( - distance );
		
		pan.add( panOffset );

	};

	// pass in distance in world space to move up
	this.panUp = function ( distance ) {

		var te = this.object.matrix.elements;

		// get Y column of matrix
		panOffset.set( te[ 4 ], te[ 5 ], te[ 6 ] );
		panOffset.multiplyScalar( distance );
		
		pan.add( panOffset );

	};
	
	// pass in x,y of change desired in pixel space,
	// right and down are positive
	this.pan = function ( deltaX, deltaY ) {

		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

		if ( scope.object.fov !== undefined ) {

			// perspective
			var position = scope.object.position;
			var offset = position.clone().sub( scope.target );
			var targetDistance = offset.length();

			// half of the fov is center to top of screen
			targetDistance *= Math.tan( ( scope.object.fov / 2 ) * Math.PI / 180.0 );

			// we actually don't use screenWidth, since perspective camera is fixed to screen height
			scope.panLeft( 2 * deltaX * targetDistance / element.clientHeight );
			scope.panUp( 2 * deltaY * targetDistance / element.clientHeight );

		} else if ( scope.object.top !== undefined ) {

			// orthographic
			scope.panLeft( deltaX * (scope.object.right - scope.object.left) / element.clientWidth );
			scope.panUp( deltaY * (scope.object.top - scope.object.bottom) / element.clientHeight );

		} else {

			// camera neither orthographic or perspective
			console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.' );

		}

	};

	this.dollyIn = function ( dollyScale ) {

		if ( dollyScale === undefined ) {

			dollyScale = getZoomScale();

		}

		scale /= dollyScale;

	};

	this.dollyOut = function ( dollyScale ) {

		if ( dollyScale === undefined ) {

			dollyScale = getZoomScale();

		}

		scale *= dollyScale;

	};

	this.update = function ( delta ) {

		var position = this.object.position.clone();

		offset.copy( position ).sub( this.target );

		// angle from z-axis around y-axis

		var theta = Math.atan2( offset.x, offset.z );

		// angle from y-axis

		var phi = Math.atan2( Math.sqrt( offset.x * offset.x + offset.z * offset.z ), offset.y );

		if ( this.autoRotate ) {

			this.rotateLeft( getAutoRotationAngle() );

		}

		var progression = Math.min(1, this.fadeFactor * delta);
		
		theta += progression * thetaDelta;
		phi +=  progression * phiDelta;

		// restrict phi to be between desired limits
		phi = Math.max( this.minPolarAngle, Math.min( this.maxPolarAngle, phi ) );

		// restrict phi to be betwee EPS and PI-EPS
		phi = Math.max( EPS, Math.min( Math.PI - EPS, phi ) );

		//var radius = offset.length() * scale;
		var radius = offset.length();
		radius += (scale-1) * radius * progression;

		// restrict radius to be between desired limits
		radius = Math.max( this.minDistance, Math.min( this.maxDistance, radius ) );
		
		// move target to panned location
		this.target.add( pan.clone().multiplyScalar( progression ) );

		offset.x = radius * Math.sin( phi ) * Math.sin( theta );
		offset.y = radius * Math.cos( phi );
		offset.z = radius * Math.sin( phi ) * Math.cos( theta );

		position.copy( this.target ).add( offset );
		
		// send transformation proposal to listeners
		var proposeTransformEvent = {
			type: "proposeTransform",
			oldPosition: this.object.position,
			newPosition: position,
			objections: 0,
			counterProposals: []
		};
		this.dispatchEvent(proposeTransformEvent);
		
		// check some counter proposals if transformation wasn't accepted
		if(proposeTransformEvent.objections > 0 ){
			
			if(proposeTransformEvent.counterProposals.length > 0){
				var cp = proposeTransformEvent.counterProposals;
				position.copy(cp[0]);
				
				proposeTransformEvent.objections = 0;
				proposeTransformEvent.counterProposals = [];
			}
		}
		
		
		// apply transformation, if accepted
		if(proposeTransformEvent.objections > 0){
			thetaDelta = 0;
			phiDelta = 0;
			scale = 1;
			pan.set(0,0,0);
		}else{
			this.object.position.copy(position);
			this.object.lookAt( this.target );
			
			var attenuation = Math.max(0, 1 - this.fadeFactor * delta);
			
			thetaDelta *= attenuation;
			phiDelta *= attenuation;
			scale = 1 + (scale-1) * attenuation;
			pan.multiplyScalar( attenuation );
		}

		if ( lastPosition.distanceTo( this.object.position ) > 0 ) {

			this.dispatchEvent( changeEvent );

			lastPosition.copy( this.object.position );

		}

	};


	this.reset = function () {

		state = STATE.NONE;

		this.target.copy( this.target0 );
		this.object.position.copy( this.position0 );

		this.update();

	};

	function getAutoRotationAngle() {

		return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;

	}

	function getZoomScale() {

		return Math.pow( 0.95, scope.zoomSpeed );

	}

	function onMouseDown( event ) {

		if ( scope.enabled === false ) return;
		event.preventDefault();

		if ( event.button === 0 ) {
			if ( scope.noRotate === true ) return;

			state = STATE.ROTATE;

			rotateStart.set( event.clientX, event.clientY );

		} else if ( event.button === 1 ) {
			if ( scope.noZoom === true ) return;

			state = STATE.DOLLY;

			dollyStart.set( event.clientX, event.clientY );

		} else if ( event.button === 2 ) {
			if ( scope.noPan === true ) return;

			state = STATE.PAN;

			panStart.set( event.clientX, event.clientY );

		}

		scope.domElement.addEventListener( 'mousemove', onMouseMove, false );
		scope.domElement.addEventListener( 'mouseup', onMouseUp, false );
		scope.dispatchEvent( startEvent );

	}

	function onMouseMove( event ) {

		if ( scope.enabled === false ) return;

		event.preventDefault();

		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

		if ( state === STATE.ROTATE ) {

			if ( scope.noRotate === true ) return;

			rotateEnd.set( event.clientX, event.clientY );
			rotateDelta.subVectors( rotateEnd, rotateStart );

			// rotating across whole screen goes 360 degrees around
			scope.rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed );

			// rotating up and down along whole screen attempts to go 360, but limited to 180
			scope.rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed );

			rotateStart.copy( rotateEnd );

		} else if ( state === STATE.DOLLY ) {

			if ( scope.noZoom === true ) return;

			dollyEnd.set( event.clientX, event.clientY );
			dollyDelta.subVectors( dollyEnd, dollyStart );

			if ( dollyDelta.y > 0 ) {

				scope.dollyIn();

			} else {

				scope.dollyOut();

			}

			dollyStart.copy( dollyEnd );

		} else if ( state === STATE.PAN ) {

			if ( scope.noPan === true ) return;

			panEnd.set( event.clientX, event.clientY );
			panDelta.subVectors( panEnd, panStart );
			
			scope.pan( panDelta.x, panDelta.y );

			panStart.copy( panEnd );

		}

		//scope.update();

	}

	function onMouseUp( /* event */ ) {

		if ( scope.enabled === false ) return;

		scope.domElement.removeEventListener( 'mousemove', onMouseMove, false );
		scope.domElement.removeEventListener( 'mouseup', onMouseUp, false );
		scope.dispatchEvent( endEvent );
		state = STATE.NONE;

	}

	function onMouseWheel( event ) {

		if ( scope.enabled === false || scope.noZoom === true ) return;

		event.preventDefault();

		var delta = 0;

		if ( event.wheelDelta !== undefined ) { // WebKit / Opera / Explorer 9

			delta = event.wheelDelta;

		} else if ( event.detail !== undefined ) { // Firefox

			delta = - event.detail;

		}

		if ( delta > 0 ) {

			scope.dollyOut();

		} else {

			scope.dollyIn();

		}

		//scope.update();
		scope.dispatchEvent( startEvent );
		scope.dispatchEvent( endEvent );

	}

	function onKeyDown( event ) {

		if ( scope.enabled === false || scope.noKeys === true || scope.noPan === true ) return;
		
		switch ( event.keyCode ) {

			case scope.keys.UP:
				scope.pan( 0, scope.keyPanSpeed );
				//scope.update();
				break;

			case scope.keys.BOTTOM:
				scope.pan( 0, - scope.keyPanSpeed );
				//scope.update();
				break;

			case scope.keys.LEFT:
				scope.pan( scope.keyPanSpeed, 0 );
				//scope.update();
				break;

			case scope.keys.RIGHT:
				scope.pan( - scope.keyPanSpeed, 0 );
				//scope.update();
				break;

		}

	}

	function touchstart( event ) {

		if ( scope.enabled === false ) return;

		switch ( event.touches.length ) {

			case 1:	// one-fingered touch: rotate

				if ( scope.noRotate === true ) return;

				state = STATE.TOUCH_ROTATE;

				rotateStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
				break;

			case 2:	// two-fingered touch: dolly

				if ( scope.noZoom === true ) return;

				state = STATE.TOUCH_DOLLY;

				var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
				var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
				var distance = Math.sqrt( dx * dx + dy * dy );
				dollyStart.set( 0, distance );
				break;

			case 3: // three-fingered touch: pan

				if ( scope.noPan === true ) return;

				state = STATE.TOUCH_PAN;

				panStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
				break;

			default:

				state = STATE.NONE;

		}

		scope.dispatchEvent( startEvent );

	}

	function touchmove( event ) {

		if ( scope.enabled === false ) return;

		event.preventDefault();
		event.stopPropagation();

		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

		switch ( event.touches.length ) {

			case 1: // one-fingered touch: rotate

				if ( scope.noRotate === true ) return;
				if ( state !== STATE.TOUCH_ROTATE ) return;

				rotateEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
				rotateDelta.subVectors( rotateEnd, rotateStart );

				// rotating across whole screen goes 360 degrees around
				scope.rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed );
				// rotating up and down along whole screen attempts to go 360, but limited to 180
				scope.rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed );

				rotateStart.copy( rotateEnd );

				//scope.update();
				break;

			case 2: // two-fingered touch: dolly

				if ( scope.noZoom === true ) return;
				if ( state !== STATE.TOUCH_DOLLY ) return;

				var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
				var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
				var distance = Math.sqrt( dx * dx + dy * dy );

				dollyEnd.set( 0, distance );
				dollyDelta.subVectors( dollyEnd, dollyStart );

				var ew = element.clientWidth;
				var eh = element.clientHeight;
				var diagonal = Math.sqrt(ew * ew + eh * eh);
				var delta = dollyDelta.y / diagonal;

				if ( dollyDelta.y > 0 ) {

					scope.dollyOut(1 - delta);

				} else {

					scope.dollyIn(1 + delta);

				}

				dollyStart.copy( dollyEnd );

				//scope.update();
				break;

			case 3: // three-fingered touch: pan

				if ( scope.noPan === true ) return;
				if ( state !== STATE.TOUCH_PAN ) return;

				panEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
				panDelta.subVectors( panEnd, panStart );
				
				scope.pan( panDelta.x, panDelta.y );

				panStart.copy( panEnd );

				//scope.update();
				break;

			default:

				state = STATE.NONE;

		}

	}

	function touchend( /* event */ ) {

		if ( scope.enabled === false ) return;

		scope.dispatchEvent( endEvent );
		state = STATE.NONE;

	}

	this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
	this.domElement.addEventListener( 'mousedown', onMouseDown, false );
	this.domElement.addEventListener( 'mousewheel', onMouseWheel, false );
	this.domElement.addEventListener( 'DOMMouseScroll', onMouseWheel, false ); // firefox

	this.domElement.addEventListener( 'touchstart', touchstart, false );
	this.domElement.addEventListener( 'touchend', touchend, false );
	this.domElement.addEventListener( 'touchmove', touchmove, false );

	window.addEventListener( 'keydown', onKeyDown, false );

};

Potree.OrbitControls.prototype = Object.create( THREE.EventDispatcher.prototype );


/**
 * @author mschuetz / http://mschuetz.at
 *
 *
 * Navigation similar to Google Earth.
 *
 * left mouse: Drag with respect to intersection
 * wheel: zoom towards/away from intersection
 * right mouse: Rotate camera around intersection
 *
 *
 */

THREE.EarthControls = function ( camera, renderer, scene ) {
	this.camera = camera;
	this.renderer = renderer;
	this.pointclouds = [];
	this.domElement = renderer.domElement;
	this.scene = scene;
	
	// Set to false to disable this control
	this.enabled = true;

	var scope = this;
	

	var STATE = { NONE : -1, DRAG : 0, ROTATE: 1 };

	var state = STATE.NONE;
	
	var dragStart = new THREE.Vector2();
	var dragEnd = new THREE.Vector2();
	
	var sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
	var sphereMaterial = new THREE.MeshNormalMaterial({shading: THREE.SmoothShading, transparent: true, opacity: 0.5});
	this.pivotNode = new THREE.Mesh(sphereGeometry, sphereMaterial);

	var mouseDelta = new THREE.Vector2();
	
	var camStart = null;
	var pivot = null;
	
	
	this.minAngle = (10 / 180) * Math.PI;	// 10°
	this.maxAngle = (70 / 180) * Math.PI;	// 70°

	this.update = function (delta) {
		var position = this.camera.position;
		this.camera.updateMatrixWorld();	
		
		var proposal = new THREE.Object3D();
		proposal.position.copy(this.camera.position);
		proposal.rotation.copy(this.camera.rotation);
		proposal.updateMatrix();
		proposal.updateMatrixWorld();
		
		if(pivot){
			if(state === STATE.DRAG){
				var plane = new THREE.Plane().setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), pivot);
				var mouse = {
					x:   ( dragEnd.x / this.domElement.clientWidth  ) * 2 - 1,
					y: - ( dragEnd.y / this.domElement.clientHeight ) * 2 + 1
				};
				
				var vec = new THREE.Vector3( mouse.x, mouse.y, 0.5 );
				vec.unproject(camStart);
				var dir = vec.sub(camStart.position).normalize();
				
				var ray = new THREE.Ray(camStart.position, dir);
				var distanceToPlane = ray.distanceToPlane(plane);
				
				if(distanceToPlane > 0){
					var newCamPos = new THREE.Vector3().subVectors(pivot, dir.clone().multiplyScalar(distanceToPlane));
					proposal.position.copy(newCamPos);
				}
				
				
			}else if(state === STATE.ROTATE){
				// rotate around pivot point
			
				var diff = mouseDelta.clone().multiplyScalar(delta);
				diff.x *= 0.3;
				diff.y *= 0.2;
			

				// do calculations on fresh nodes 
				var p = new THREE.Object3D();
				var c = new THREE.Object3D();
				p.add(c);
				p.position.copy(pivot);
				c.position.copy(this.camera.position).sub(pivot);
				c.rotation.copy(this.camera.rotation);
				
				
				// rotate left/right
				p.rotation.y += -diff.x;
				
				
				// rotate up/down
				var dir = this.camera.getWorldDirection();
				var up = new THREE.Vector3(0,1,0);
				var side = new THREE.Vector3().crossVectors(up, dir);

				var dirp = c.position.clone();
				dirp.y = 0;
				dirp.normalize();
				var ac = dirp.dot(c.position.clone().normalize());
				var angle = Math.acos(ac);
				if(c.position.y < 0){
					angle = -angle;
				}
				
				var amount = 0;
				if(diff.y > 0){
					// rotate downwards and apply minAngle limit
					amount = diff.y - Math.max(0, this.minAngle - (angle - diff.y));
				}else{
					// rotate upwards and apply maxAngle limit
					amount = diff.y + Math.max(0, (angle - diff.y) - this.maxAngle);
				}
				p.rotateOnAxis(side, -amount);
				
				// apply changes to object
				p.updateMatrixWorld();
				
				proposal.position.copy(c.getWorldPosition());
				proposal.quaternion.copy(c.getWorldQuaternion());

			}
			
			var proposeTransformEvent = {
				type: "proposeTransform",
				oldPosition: this.camera.position,
				newPosition: proposal.position,
				objections: 0
			};
			this.dispatchEvent(proposeTransformEvent);
			
			if(proposeTransformEvent.objections > 0){
				
			}else{
				this.camera.position.copy(proposal.position);
				this.camera.rotation.copy(proposal.rotation);
			}
			
			var wp = this.pivotNode.getWorldPosition().applyMatrix4(this.camera.matrixWorldInverse);
			var w = Math.abs(wp.z  / 30);
			var l = this.pivotNode.scale.length();
			this.pivotNode.scale.multiplyScalar(w / l);
		}
		
		
			
		mouseDelta.set(0,0);
	};


	this.reset = function () {
		state = STATE.NONE;

		this.camera.position.copy( this.position0 );
	};

	function onMouseDown( event ) {
		if ( scope.enabled === false ) return;
		event.preventDefault();
		
		var rect = scope.domElement.getBoundingClientRect();
		
		var mouse =  {
			x: ( (event.clientX - rect.left) / scope.domElement.clientWidth ) * 2 - 1,
			y: - ( (event.clientY - rect.top) / scope.domElement.clientHeight ) * 2 + 1
		};
		var I = getMousePointCloudIntersection(mouse, scope.camera, scope.renderer, scope.pointclouds)
		if(!I){
			return;
		}

		var plane = new THREE.Plane().setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), I);
		
		var vec = new THREE.Vector3( mouse.x, mouse.y, 0.5 );
		vec.unproject(scope.camera);
		var dir = vec.sub(scope.camera.position).normalize();
		
		var ray = new THREE.Ray(scope.camera.position, dir);
		pivot = ray.intersectPlane(plane);
		
		//pivot = I;
		camStart = scope.camera.clone();
		camStart.rotation.copy(scope.camera.rotation);
		dragStart.set( event.clientX - rect.left, event.clientY - rect.top);
		dragEnd.set(event.clientX - rect.left, event.clientY - rect.top);
		
		
		scope.scene.add(scope.pivotNode);
		scope.pivotNode.position.copy(pivot);

		if ( event.button === 0 ) {
			state = STATE.DRAG;
		} else if ( event.button === 2 ) {
			state = STATE.ROTATE;
		}
        
		scope.domElement.addEventListener( 'mousemove', onMouseMove, false );
		scope.domElement.addEventListener( 'mouseup', onMouseUp, false );
	}

	function onMouseMove( event ) {
		if ( scope.enabled === false ) return;

		event.preventDefault();
		
		var rect = scope.domElement.getBoundingClientRect();

		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

		mouseDelta.set(event.clientX - rect.left - dragEnd.x, event.clientY - rect.top - dragEnd.y);
		dragEnd.set(event.clientX - rect.left, event.clientY - rect.top);
		
	}

	function onMouseUp() {
		if ( scope.enabled === false ) return;

		scope.domElement.removeEventListener( 'mousemove', onMouseMove, false );
		scope.domElement.removeEventListener( 'mouseup', onMouseUp, false );
		state = STATE.NONE;
		
		//scope.dragStartIndicator.style.display = "none";
		scope.scene.remove(scope.pivotNode);

	}

	function onMouseWheel(event) {
		if ( scope.enabled === false || scope.noZoom === true ) return;

		event.preventDefault();
		
		var rect = scope.domElement.getBoundingClientRect();

		var amount = (event.detail<0 || event.wheelDelta>0) ? 1 : -1;
		var mouse =  {
			x: ( (event.clientX - rect.left) / scope.domElement.clientWidth ) * 2 - 1,
			y: - ( (event.clientY - rect.top) / scope.domElement.clientHeight ) * 2 + 1
		};
		var I = getMousePointCloudIntersection(mouse, scope.camera, scope.renderer, scope.pointclouds)
		
		if(I){
			var distance = I.distanceTo(scope.camera.position);
			var dir = new THREE.Vector3().subVectors(I, scope.camera.position).normalize();
			scope.camera.position.add(dir.multiplyScalar(distance * 0.1 * amount));	
		}

	}

	this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
	this.domElement.addEventListener( 'mousedown', onMouseDown, false );
	this.domElement.addEventListener( 'mousewheel', onMouseWheel, false );
	this.domElement.addEventListener( 'DOMMouseScroll', onMouseWheel, false ); // firefox
};

THREE.EarthControls.prototype = Object.create( THREE.EventDispatcher.prototype );


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
	
	};
};

LRU.prototype.disposeDescendants = function(node){
	var stack = [];
	stack.push(node);
	while(stack.length > 0){
		var current = stack.pop();
		
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


Potree.PointCloudOctreeNode = function(){
	this.children = {};
	this.sceneNode = null;
};


Potree.PointCloudOctree = function(geometry, material){
	THREE.Object3D.call( this );
	
	Potree.PointCloudOctree.lru = Potree.PointCloudOctree.lru || new LRU();
	
	this.pcoGeometry = geometry;
	this.boundingBox = this.pcoGeometry.tightBoundingBox;
	this.boundingSphere = this.boundingBox.getBoundingSphere();
	this.material = material || new Potree.PointCloudMaterial();
	this.visiblePointsTarget = 2*1000*1000;
	this.minimumNodePixelSize = 150;
	this.level = 0;
	this.position.sub(geometry.offset);
	this.updateMatrix();
	
	this.showBoundingBox = false;
	this.boundingBoxNodes = [];
	this.loadQueue = [];
	this.visibleBounds = new THREE.Box3();	
	this.visibleNodes = [];
	this.visibleGeometry = [];
	this.pickTarget;
	this.generateDEM = false;
	
	this.root = this.pcoGeometry.root;
}

Potree.PointCloudOctree.prototype = Object.create(THREE.Object3D.prototype);

Potree.PointCloudOctree.prototype.updateVisibility = function(camera, renderer){

	this.numVisibleNodes = 0;
	this.numVisiblePoints = 0;
	
	// frustum in object space
	camera.updateMatrixWorld();
	var frustum = new THREE.Frustum();
	var viewI = camera.matrixWorldInverse;
	var world = this.matrixWorld;
	var proj = camera.projectionMatrix;
	var fm = new THREE.Matrix4().multiply(proj).multiply(viewI).multiply(world);
	frustum.setFromMatrix( fm );
	
	// camera position in object space
	var view = camera.matrixWorld;
	var worldI = new THREE.Matrix4().getInverse(world);
	var camMatrixObject = new THREE.Matrix4().multiply(worldI).multiply(view);
	var camObjPos = new THREE.Vector3().setFromMatrixPosition( camMatrixObject );
	
	// traverse nodes with highest weight(depends on node size and distance to camera) first
	var priorityQueue = new BinaryHeap(function(x){return 1 / x.weight});
	priorityQueue.push({node: this.root, weight: 1});
	
	var visibleNodes = [];
	var visibleGeometry = [];
	var unloadedGeometry = [];
	var pointCount = 0;
	
	// first, hide all visible nodes
	if(this.root instanceof Potree.PointCloudOctreeNode){
		this.hideDescendants(this.root.sceneNode);
	}
	for(var i = 0; i < this.boundingBoxNodes.length; i++){
		this.boundingBoxNodes[i].visible = false;
	}
	
	while(priorityQueue.size() > 0){
	
		var element = priorityQueue.pop();
		var node = element.node;
		var parent = element.parent;
		
		var box = node.boundingBox;
		
		var insideFrustum = frustum.intersectsBox(box);
		var visible = insideFrustum;
		visible = visible && !(this.numVisiblePoints + node.numPoints > this.visiblePointsTarget);
		
		if(!visible){
			continue;
		}
		
		this.numVisibleNodes++;
		this.numVisiblePoints += node.numPoints;
		
		// if geometry is loaded, create a scene node
		if(node instanceof Potree.PointCloudOctreeGeometryNode){
			var geometryNode = node;
			var geometry = geometryNode.geometry;
			
			if((typeof parent === "undefined" || parent instanceof Potree.PointCloudOctreeNode) && geometryNode.loaded){
				var pcoNode = new Potree.PointCloudOctreeNode();
				var sceneNode = new THREE.PointCloud(geometry, this.material);
				sceneNode.visible = false;
				
				pcoNode.name = geometryNode.name;
				pcoNode.level = geometryNode.level;
				pcoNode.numPoints = geometryNode.numPoints;
				pcoNode.boundingBox = geometry.boundingBox;
				pcoNode.tightBoundingBox = geometry.tightBoundingBox;
				pcoNode.boundingSphere = pcoNode.boundingBox.getBoundingSphere();
				pcoNode.geometryNode = geometryNode;
				pcoNode.parent = parent;
				pcoNode.children = geometryNode.children;
				sceneNode.boundingBox = pcoNode.boundingBox;
				sceneNode.boundingSphere = pcoNode.boundingSphere;
				sceneNode.numPoints = pcoNode.numPoints;
				sceneNode.level = pcoNode.level;
				
				pcoNode.sceneNode = sceneNode;
				
				if(typeof node.parent === "undefined"){
					this.root = pcoNode;
					this.add(pcoNode.sceneNode);
					
					sceneNode.matrixWorld.multiplyMatrices( this.matrixWorld, sceneNode.matrix );
				}else{
					var childIndex = parseInt(pcoNode.name[pcoNode.name.length - 1]);
					parent.sceneNode.add(sceneNode);
					parent.children[childIndex] = pcoNode;
					
					sceneNode.matrixWorld.multiplyMatrices( parent.sceneNode.matrixWorld, sceneNode.matrix );
				}
				
				node = pcoNode;
			}
			
			if(!geometryNode.loaded){
				unloadedGeometry.push(node);
				visibleGeometry.push(node);
			}
			
		}
		
		if(node instanceof Potree.PointCloudOctreeNode){
			Potree.PointCloudOctree.lru.touch(node.geometryNode);
			node.sceneNode.visible = true;
			node.sceneNode.material = this.material;
			visibleNodes.push(node);
			visibleGeometry.push(node.geometryNode);
			
			if(node.parent){
				node.sceneNode.matrixWorld.multiplyMatrices( node.parent.sceneNode.matrixWorld, node.sceneNode.matrix );
			}else{
				node.sceneNode.matrixWorld.multiplyMatrices( this.matrixWorld, node.sceneNode.matrix );
			}
			
			if(this.showBoundingBox && !node.boundingBoxNode){
				var boxHelper = new THREE.BoxHelper(node.sceneNode);
				this.add(boxHelper);
				this.boundingBoxNodes.push(boxHelper);
				node.boundingBoxNode = boxHelper;
				node.boundingBoxNode.matrixWorld.copy(node.sceneNode.matrixWorld);
			}else if(this.showBoundingBox){
				node.boundingBoxNode.visible = true;
				node.boundingBoxNode.matrixWorld.copy(node.sceneNode.matrixWorld);
			}else if(!this.showBoundingBox && node.boundingBoxNode){
				node.boundingBoxNode.visible = false;
			}
			
			if(this.generateDEM && node.level <= 2){
				if(!node.dem){
					node.dem = this.createDEM(node);
				}
			}
		} 
		
		// add child nodes to priorityQueue
		for(var i = 0; i < 8; i++){
			if(!node.children[i]){
				continue;
			}
			
			var child = node.children[i];
			
			var sphere = child.boundingSphere;
			var distance = sphere.center.distanceTo(camObjPos);
			var radius = sphere.radius;
			
			var fov = camera.fov / 2 * Math.PI / 180.0;
			var pr = 1 / Math.tan(fov) * radius / Math.sqrt(distance * distance - radius * radius);
			
			var screenPixelRadius = renderer.domElement.clientHeight * pr;
			if(screenPixelRadius < this.minimumNodePixelSize){
				continue;
			}
			
			var weight = pr;
			if(distance - radius < 0){
				weight = Number.MAX_VALUE;
			}
			
			priorityQueue.push({node: child, parent: node, weight: weight});
		}
	}
	
	this.visibleNodes = visibleNodes;
	this.visibleGeometry = visibleGeometry;
	
	// load next few unloaded geometries
	for(var i = 0; i < Math.min(5, unloadedGeometry.length); i++){
		unloadedGeometry[i].load();
	}
	
};

Potree.PointCloudOctree.prototype.updateVisibleBounds = function(){

	var leafNodes = [];
	for(var i = 0; i < this.visibleNodes.length; i++){
		var node = this.visibleNodes[i];
		var isLeaf = true;
		
		for(var j = 0; j < node.children.length; j++){
			var child = node.children[j];
			if(child instanceof Potree.PointCloudOctreeNode){
				isLeaf = isLeaf && !child.sceneNode.visible;
			}else if(child instanceof Potree.PointCloudOctreeGeometryNode){
				isLeaf = true;
			}
		}
		
		if(isLeaf){
			leafNodes.push(node);
		}
	}
	
	this.visibleBounds.min = new THREE.Vector3( Infinity, Infinity, Infinity );
	this.visibleBounds.max = new THREE.Vector3( - Infinity, - Infinity, - Infinity );
	for(var i = 0; i < leafNodes.length; i++){
		var node = leafNodes[i];
		
		this.visibleBounds.expandByPoint(node.boundingBox.min);
		this.visibleBounds.expandByPoint(node.boundingBox.max);
	}
	
}

Potree.PointCloudOctree.prototype.updateMaterial = function(material, visibleNodes, camera, renderer){
	material.fov = camera.fov * (Math.PI / 180);
	material.screenWidth = renderer.domElement.clientWidth;
	material.screenHeight = renderer.domElement.clientHeight;
	material.spacing = this.pcoGeometry.spacing;
	material.near = camera.near;
	material.far = camera.far;
	material.uniforms.octreeSize.value = this.pcoGeometry.boundingBox.size().x;
	
	// update visibility texture
	if(material.pointSizeType){
		if(material.pointSizeType === Potree.PointSizeType.ADAPTIVE 
			|| material.pointColorType === Potree.PointColorType.OCTREE_DEPTH){
			
			this.updateVisibilityTexture(material, visibleNodes);
		}
	}
}

Potree.PointCloudOctree.prototype.update = function(camera, renderer){
	
	this.updateVisibility(camera, renderer);
	
	this.updateMaterial(this.material, this.visibleNodes, camera, renderer);
	
	this.updateVisibleBounds();
	
	Potree.PointCloudOctree.lru.freeMemory();
	
	// TODO bounds
	// TODO free memory
	
};


Potree.PointCloudOctree.prototype.updateVisibilityTexture = function(material, visibleNodes){

	if(!material){
		return;
	}
	
	var texture = material.visibleNodesTexture;
    var data = texture.image.data;
	
	// copy array
	visibleNodes = visibleNodes.slice();
	
	// sort by level and index, e.g. r, r0, r3, r4, r01, r07, r30, ...
	var sort = function(a, b){
		var na = a.name;
		var nb = b.name;
		if(na.length != nb.length) return na.length - nb.length;
		if(na < nb) return -1;
		if(na > nb) return 1;
		return 0;
	};
	visibleNodes.sort(sort);

	
	for(var i = 0; i < visibleNodes.length; i++){
		var node = visibleNodes[i];
		
		var children = [];
		for(var j = 0; j < 8; j++){
			var child = node.children[j];
			if(child instanceof Potree.PointCloudOctreeNode && child.sceneNode.visible){
				children.push(child);
			}
		}
		children.sort(function(a, b){
			if(a.name < b.name) return -1;
			if(a.name > b.name) return 1;
			return 0;
		});
		
		data[i*3 + 0] = 0;
		data[i*3 + 1] = 0;
		data[i*3 + 2] = 0;
		for(var j = 0; j < children.length; j++){
			var child = children[j];
			var index = parseInt(child.name.substr(-1));
			data[i*3 + 0] += Math.pow(2, index);
			
			if(j === 0){
				var vArrayIndex = visibleNodes.indexOf(child);
				data[i*3 + 1] = vArrayIndex - i;
			}
			
		}
	}
	
	
	texture.needsUpdate = true;
}




























Potree.PointCloudOctree.prototype.nodesOnRay = function(nodes, ray){
	var nodesOnRay = [];

	var _ray = ray.clone();
	for(var i = 0; i < nodes.length; i++){
		var node = nodes[i];
		//var inverseWorld = new THREE.Matrix4().getInverse(node.matrixWorld);
		var sphere = node.boundingSphere.clone().applyMatrix4(node.sceneNode.matrixWorld);
		
		if(_ray.isIntersectionSphere(sphere)){
			nodesOnRay.push(node);
		}
	}
	
	return nodesOnRay;
};

Potree.PointCloudOctree.prototype.updateMatrixWorld = function( force ){
	//node.matrixWorld.multiplyMatrices( node.parent.matrixWorld, node.matrix );
	
	if ( this.matrixAutoUpdate === true ) this.updateMatrix();

	if ( this.matrixWorldNeedsUpdate === true || force === true ) {

		if ( this.parent === undefined ) {

			this.matrixWorld.copy( this.matrix );

		} else {

			this.matrixWorld.multiplyMatrices( this.parent.matrixWorld, this.matrix );

		}

		this.matrixWorldNeedsUpdate = false;

		force = true;

	}
};

Potree.PointCloudOctree.prototype.hideDescendants = function(object){
	var stack = [];
	for(var i = 0; i < object.children.length; i++){
		var child = object.children[i];
		if(child.visible){
			stack.push(child);
		}
	}
	
	while(stack.length > 0){
		var object = stack.shift();
		
		object.visible = false;
		
		for(var i = 0; i < object.children.length; i++){
			var child = object.children[i];
			if(child.visible){
				stack.push(child);
			}
		}
	}
}

Potree.PointCloudOctree.prototype.moveToOrigin = function(){
    this.position.set(0,0,0);
    this.updateMatrixWorld(true);
    var box = this.boundingBox;
    var transform = this.matrixWorld;
    var tBox = Potree.utils.computeTransformedBoundingBox(box, transform);
    this.position.set(0,0,0).sub(tBox.center());
}

Potree.PointCloudOctree.prototype.moveToGroundPlane = function(){
    this.updateMatrixWorld(true);
    var box = this.boundingBox;
    var transform = this.matrixWorld;
    var tBox = Potree.utils.computeTransformedBoundingBox(box, transform);
    this.position.y += -tBox.min.y;
}

Potree.PointCloudOctree.prototype.getBoundingBoxWorld = function(){
	this.updateMatrixWorld(true);
    var box = this.boundingBox;
    var transform = this.matrixWorld;
    var tBox = Potree.utils.computeTransformedBoundingBox(box, transform);
	
	return tBox;
}

/**
 * returns points inside the profile points
 *
 * maxDepth:		search points up to the given octree depth
 *
 *
 * The return value is an array with all segments of the profile path
 *  var segment = {
 * 		start: 	THREE.Vector3,
 * 		end: 	THREE.Vector3,
 * 		points: {}
 * 		project: function()
 *  };
 *
 * The project() function inside each segment can be used to transform
 * that segments point coordinates to line up along the x-axis.
 *
 *
 */
Potree.PointCloudOctree.prototype.getPointsInProfile = function(profile, maxDepth){
	var points = {
		segments: [],
		boundingBox: new THREE.Box3(),
		projectedBoundingBox: new THREE.Box2()
	};
	
	// evaluate segments
	for(var i = 0; i < profile.points.length - 1; i++){
		var start = profile.points[i];
		var end = profile.points[i+1];
		var ps = this.getProfile(start, end, profile.width, maxDepth);
		
		var segment = {
			start: start,
			end: end,
			points: ps,
			project: null
		};
		
		points.segments.push(segment);
		
		points.boundingBox.expandByPoint(ps.boundingBox.min);
		points.boundingBox.expandByPoint(ps.boundingBox.max);
	}
	
	// add projection functions to the segments
	var mileage = new THREE.Vector3();
	for(var i = 0; i < points.segments.length; i++){
		var segment = points.segments[i];
		var start = segment.start;
		var end = segment.end;
		
		var project = function(_start, _end, _mileage, _boundingBox){
			var start = _start;
			var end = _end;
			var mileage = _mileage;
			var boundingBox = _boundingBox;
			
			var xAxis = new THREE.Vector3(1,0,0);
			var dir = new THREE.Vector3().subVectors(end, start);
			dir.y = 0;
			dir.normalize();
			var alpha = Math.acos(xAxis.dot(dir));
			if(dir.z > 0){
				alpha = -alpha;
			}
			
			
			return function(position){
						
				var toOrigin = new THREE.Matrix4().makeTranslation(-start.x, -boundingBox.min.y, -start.z);
				var alignWithX = new THREE.Matrix4().makeRotationY(-alpha);
				var applyMileage = new THREE.Matrix4().makeTranslation(mileage.x, 0, 0);

				var pos = position.clone();
				pos.applyMatrix4(toOrigin);
				pos.applyMatrix4(alignWithX);
				pos.applyMatrix4(applyMileage);
				
				return pos;
			};
			
		}(start, end, mileage.clone(), points.boundingBox.clone());
		
		segment.project = project;
		
		mileage.x += new THREE.Vector3(start.x, 0, start.z).distanceTo(new THREE.Vector3(end.x, 0, end.z));
		mileage.y += end.y - start.y;
	}
	
	points.projectedBoundingBox.min.x = 0;
	points.projectedBoundingBox.min.y = points.boundingBox.min.y;
	points.projectedBoundingBox.max.x = mileage.x;
	points.projectedBoundingBox.max.y = points.boundingBox.max.y;
	
	return points;
};

/**
 * returns points inside the given profile bounds.
 *
 * start: 	
 * end: 	
 * width:	
 * depth:		search points up to the given octree depth
 * callback:	if specified, points are loaded before searching
 *				
 *
 */
Potree.PointCloudOctree.prototype.getProfile = function(start, end, width, depth, callback){
	if(callback !== undefined){
		this.profileRequests.push(new Potree.ProfileRequest(start, end, width, depth, callback));
	}else{
		var stack = [];
		stack.push(this);
		
		var center = new THREE.Vector3().addVectors(end, start).multiplyScalar(0.5);
		var length = new THREE.Vector3().subVectors(end, start).length();
		var side = new THREE.Vector3().subVectors(end, start).normalize();
		var up = new THREE.Vector3(0, 1, 0);
		var forward = new THREE.Vector3().crossVectors(side, up).normalize();
		var N = forward;
		var cutPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(N, start);
		var halfPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(side, center);
		
		var inside = null;
		
		var boundingBox = new THREE.Box3();
		
		
		while(stack.length > 0){
			var object = stack.shift();
			
			
			var pointsFound = 0;
			
			if(object instanceof THREE.PointCloud){
				var geometry = object.geometry;
				var positions = geometry.attributes.position;
				var p = positions.array;
				var numPoints = object.numPoints;
				
				if(!inside){
					inside = {};
					
					for (var property in geometry.attributes) {
						if (geometry.attributes.hasOwnProperty(property)) {
							if(property === "indices"){
							
							}else{
								inside[property] = [];
							}
						}
					}
				}
				
				for(var i = 0; i < numPoints; i++){
					var pos = new THREE.Vector3(p[3*i], p[3*i+1], p[3*i+2]);
					pos.applyMatrix4(this.matrixWorld);
					var distance = Math.abs(cutPlane.distanceToPoint(pos));
					var centerDistance = Math.abs(halfPlane.distanceToPoint(pos));
					
					if(distance < width / 2 && centerDistance < length / 2){
						boundingBox.expandByPoint(pos);
						
						for (var property in geometry.attributes) {
							if (geometry.attributes.hasOwnProperty(property)) {
							
								if(property === "position"){
									inside[property].push(pos);
								}else if(property === "indices"){
									// skip indices
								}else{
									var values = geometry.attributes[property];
									if(values.itemSize === 1){
										inside[property].push(values.array[i + j]);
									}else{
										var value = [];
										for(var j = 0; j < values.itemSize; j++){
											value.push(values.array[i*values.itemSize + j]);
										}
										inside[property].push(value);
									}
								}
								
							}
						}
						
						
						pointsFound++;
					}
				}
			}
			
			//console.log("traversing: " + object.name + ", #points found: " + pointsFound);
			
			if(object == this || object.level < depth){
				for(var i = 0; i < object.children.length; i++){
					var child = object.children[i];
					if(child instanceof THREE.PointCloud){
						var sphere = child.boundingSphere.clone().applyMatrix4(child.matrixWorld);
						if(cutPlane.distanceToSphere(sphere) < sphere.radius){
							stack.push(child);	
						}			
					}
				}
			}
		}
		
		inside.numPoints = inside.position.length;
		
		var project = function(_start, _end){
			var start = _start;
			var end = _end;
			
			var xAxis = new THREE.Vector3(1,0,0);
			var dir = new THREE.Vector3().subVectors(end, start);
			dir.y = 0;
			dir.normalize();
			var alpha = Math.acos(xAxis.dot(dir));
			if(dir.z > 0){
				alpha = -alpha;
			}
			
			
			return function(position){
						
				var toOrigin = new THREE.Matrix4().makeTranslation(-start.x, -start.y, -start.z);
				var alignWithX = new THREE.Matrix4().makeRotationY(-alpha);

				var pos = position.clone();
				pos.applyMatrix4(toOrigin);
				pos.applyMatrix4(alignWithX);
				
				return pos;
			};
			
		}(start, end)
		
		inside.project = project;
		inside.boundingBox = boundingBox;
		
		return inside;
	}
}

Potree.PointCloudOctree.prototype.getVisibleExtent = function(){
	return this.visibleBounds.applyMatrix4(this.matrixWorld);
};

/**
 *
 *
 *
 * params.pickWindowSize:	Look for points inside a pixel window of this size.
 * 							Use odd values: 1, 3, 5, ...
 * 
 * 
 * TODO: only draw pixels that are actually read with readPixels(). 
 * 
 */
Potree.PointCloudOctree.prototype.pick = function(renderer, camera, ray, params){
	// this function finds intersections by rendering point indices and then checking the point index at the mouse location.
	// point indices are 3 byte and rendered to the RGB component.
	// point cloud node indices are 1 byte and stored in the ALPHA component.
	// this limits picking capabilities to 256 nodes and 2^24 points per node. 

	var params = params || {};
	var pickWindowSize = params.pickWindowSize || 17;
	
	var nodes = this.nodesOnRay(this.visibleNodes, ray);
	
	if(nodes.length === 0){
		return null;
	}
	
	var width = Math.ceil(renderer.domElement.clientWidth);
	var height = Math.ceil(renderer.domElement.clientHeight);
	
	var pixelPos = new THREE.Vector3().addVectors(camera.position, ray.direction).project(camera);
	pixelPos.addScalar(1).multiplyScalar(0.5);
	pixelPos.x *= width;
	pixelPos.y *= height
	
	if(!this.pickTarget){
		this.pickTarget = new THREE.WebGLRenderTarget( 
			1, 1, 
			{ minFilter: THREE.LinearFilter, 
			magFilter: THREE.NearestFilter, 
			format: THREE.RGBAFormat } 
		);
	}else if(this.pickTarget.width != width || this.pickTarget.height != height){
		this.pickTarget.dispose();
		this.pickTarget = new THREE.WebGLRenderTarget( 
			1, 1, 
			{ minFilter: THREE.LinearFilter, 
			magFilter: THREE.NearestFilter, 
			format: THREE.RGBAFormat } 
		);
	}
	this.pickTarget.setSize(width, height);
	
	// setup pick material.
	// use the same point size functions as the main material to get the same point sizes.
	if(!this.pickMaterial){
		this.pickMaterial = new Potree.PointCloudMaterial();
		this.pickMaterial.pointColorType = Potree.PointColorType.POINT_INDEX;
	}
	
	this.pickMaterial.pointSizeType = this.material.pointSizeType;
	this.pickMaterial.size = this.material.size;
	this.pickMaterial.pointShape = this.material.pointShape;
	this.pickMaterial.interpolate = this.material.interpolate;
	this.pickMaterial.minSize = this.material.minSize;
	this.pickMaterial.maxSize = this.material.maxSize;
	
	this.updateMaterial(this.pickMaterial, nodes, camera, renderer);

	var _gl = renderer.context;
	
	_gl.enable(_gl.SCISSOR_TEST);
	_gl.scissor(pixelPos.x - (pickWindowSize - 1) / 2, pixelPos.y - (pickWindowSize - 1) / 2,pickWindowSize,pickWindowSize);
	_gl.disable(_gl.SCISSOR_TEST);
	
	var material = this.pickMaterial;
	
	renderer.setRenderTarget( this.pickTarget );
	
	renderer.state.setDepthTest( material.depthTest );
	renderer.state.setDepthWrite( material.depthWrite )
	renderer.state.setBlending( THREE.NoBlending );
	
	renderer.clear( renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil );
	
	//TODO: UGLY HACK CHAMPIONSHIP SUBMISSION!! drawing first node does not work properly so we draw it twice.
	if(nodes.length > 0){
		nodes.push(nodes[0]);
	}
	
	for(var i = 0; i < nodes.length; i++){
		var object = nodes[i].sceneNode;
		var geometry = object.geometry;
		
		if(!geometry.attributes.indices.buffer){
			continue;
		}
		
		material.pcIndex = i;
		
		if(material.program){
			var program = material.program.program;
			_gl.useProgram( program );
			//_gl.disable( _gl.BLEND );
			
			var attributePointer = _gl.getAttribLocation(program, "indices");
			var attributeSize = 4;
			_gl.bindBuffer( _gl.ARRAY_BUFFER, geometry.attributes.indices.buffer );
			//if(!bufferSubmitted){
			//	_gl.bufferData( _gl.ARRAY_BUFFER, new Uint8Array(geometry.attributes.indices.array), _gl.STATIC_DRAW );
			//	bufferSubmitted = true;
			//}
			_gl.enableVertexAttribArray( attributePointer );
			_gl.vertexAttribPointer( attributePointer, attributeSize, _gl.UNSIGNED_BYTE, true, 0, 0 ); 
		
			_gl.uniform1f(material.program.uniforms.pcIndex, material.pcIndex);
		}	
		
		renderer.renderBufferDirect(camera, [], null, material, geometry, object);
		
		var program = material.program.program;
		_gl.useProgram( program );
		var attributePointer = _gl.getAttribLocation(program, "indices");
		_gl.disableVertexAttribArray( attributePointer );
	}
	
	var pixelCount = pickWindowSize * pickWindowSize;
	var buffer = new ArrayBuffer(pixelCount*4);
	var pixels = new Uint8Array(buffer);
	var ibuffer = new Uint32Array(buffer);
	renderer.context.readPixels(
		pixelPos.x - (pickWindowSize-1) / 2, pixelPos.y - (pickWindowSize-1) / 2, 
		pickWindowSize, pickWindowSize, 
		renderer.context.RGBA, renderer.context.UNSIGNED_BYTE, pixels);
		
	// find closest hit inside pixelWindow boundaries
	var min = Number.MAX_VALUE;
	var hit = null;
	//console.log("finding closest hit");
	for(var u = 0; u < pickWindowSize; u++){
		for(var v = 0; v < pickWindowSize; v++){
			var offset = (u + v*pickWindowSize);
			var distance = Math.pow(u - (pickWindowSize-1) / 2, 2) + Math.pow(v - (pickWindowSize-1) / 2, 2);
			
			var pcIndex = pixels[4*offset + 3];
			pixels[4*offset + 3] = 0;
			var pIndex = ibuffer[offset];
			
			if((pIndex !== 0 || pcIndex !== 0) && distance < min){
				
				hit = {
					pIndex: pIndex,
					pcIndex: pcIndex
				};
				min = distance;
			}
		}
	}	
	
	if(hit){
		var point = {};
		
		var pc = nodes[hit.pcIndex].sceneNode;
		var attributes = pc.geometry.attributes;
		
		for (var property in attributes) {
			if (attributes.hasOwnProperty(property)) {
				var values = geometry.attributes[property];
			
				if(property === "position"){
					var positionArray = pc.geometry.attributes.position.array;
					var x = positionArray[3*hit.pIndex+0];
					var y = positionArray[3*hit.pIndex+1];
					var z = positionArray[3*hit.pIndex+2];
					var position = new THREE.Vector3(x, y, z);
					position.applyMatrix4(this.matrixWorld);
				
					point[property] = position;
				}else if(property === "indices"){
				
				}else{
					if(values.itemSize === 1){
						point[property] = values.array[i + j];
					}else{
						var value = [];
						for(var j = 0; j < values.itemSize; j++){
							value.push(values.array[i*values.itemSize + j]);
						}
						point[property] = value;
					}
				}
			}
		}
		
		
		return point;
	}else{
		return null;
	}
}

var demTime = 0;

Potree.PointCloudOctree.prototype.createDEM = function(node){	
	var start = new Date().getTime();

	var sceneNode = node.sceneNode;

	var world = sceneNode.matrixWorld;

	var boundingBox = sceneNode.boundingBox.clone().applyMatrix4(world);
	var bbSize = boundingBox.size();
	var positions = sceneNode.geometry.attributes.position.array;
	var demSize = 64;
	var demMArray = new Array(demSize*demSize);
	var dem = new Float32Array(demSize*demSize);
	var n = positions.length / 3;
	
	var toWorld = function(dx, dy){
		var x = (dx * bbSize.x) / (demSize - 1) + boundingBox.min.x;
		var y = dem[dx + dy * demSize];
		var z = (dy * bbSize.z) / (demSize - 1)+ boundingBox.min.z;
		
		return [x, y, z];
	};
	
	var toDem = function(x, y){
		var dx = parseInt(demSize * (x - boundingBox.min.x) / bbSize.x);
		var dy = parseInt(demSize * (z - boundingBox.min.z) / bbSize.z);
		dx = Math.min(dx, demSize - 1);
		dy = Math.min(dy, demSize - 1);
		
		return [dx, dy];
	};

	for(var i = 0; i < n; i++){
		var x = positions[3*i + 0];
		var y = positions[3*i + 1];
		var z = positions[3*i + 2];
		
		var worldPos = new THREE.Vector3(x,y,z).applyMatrix4(world);
		
		var dx = parseInt(demSize * (worldPos.x - boundingBox.min.x) / bbSize.x);
		var dy = parseInt(demSize * (worldPos.z - boundingBox.min.z) / bbSize.z);
		dx = Math.min(dx, demSize - 1);
		dy = Math.min(dy, demSize - 1);
		
		var index = dx + dy * demSize;
		if(!demMArray[index]){
			demMArray[index] = [];
		}
		demMArray[index].push(worldPos.y);
		
		//if(dem[dx + dy * demSize] === 0){
		//	dem[dx + dy * demSize] = worldPos.y;
		//}else{
		//	dem[dx + dy * demSize] = Math.max(dem[dx + dy * demSize], worldPos.y);
		//}
	}
	
	for(var i = 0; i < demMArray.length; i++){
		var values = demMArray[i];
		
		if(!values){
			dem[i] = 0;
		}else if(values.length === 0){
			dem[i] = 0;
		}else{
			var medianIndex = parseInt((values.length-1) / 2); 
			dem[i] = values[medianIndex];
		}
	}
	
	var box2 = new THREE.Box2();
	box2.expandByPoint(new THREE.Vector3(boundingBox.min.x, boundingBox.min.z));
	box2.expandByPoint(new THREE.Vector3(boundingBox.max.x, boundingBox.max.z));
	
	var result = {
		boundingBox: boundingBox,
		boundingBox2D: box2,
		dem: dem,
		demSize: demSize
	};
	
	
	
	
	//if(node.level == 2){
	//	var geometry = new THREE.BufferGeometry();
	//	var vertices = new Float32Array((demSize-1)*(demSize-1)*2*3*3);
	//	var offset = 0;
	//	for(var i = 0; i < demSize-1; i++){
	//		for(var j = 0; j < demSize-1; j++){
	//			//var offset = 18*i + 18*j*demSize;
	//			
	//			var dx = i;
	//			var dy = j;
	//			
	//			var v1 = toWorld(dx, dy);
	//			var v2 = toWorld(dx+1, dy);
	//			var v3 = toWorld(dx+1, dy+1);
	//			var v4 = toWorld(dx, dy+1);
	//			
	//			vertices[offset+0] = v3[0];
	//			vertices[offset+1] = v3[1];
	//			vertices[offset+2] = v3[2];
	//			
	//			vertices[offset+3] = v2[0];
	//			vertices[offset+4] = v2[1];
	//			vertices[offset+5] = v2[2];
	//			
	//			vertices[offset+6] = v1[0];
	//			vertices[offset+7] = v1[1];
	//			vertices[offset+8] = v1[2];
	//			
	//			
	//			vertices[offset+9 ] = v3[0];
	//			vertices[offset+10] = v3[1];
	//			vertices[offset+11] = v3[2];
	//			
	//			vertices[offset+12] = v1[0];
	//			vertices[offset+13] = v1[1];
	//			vertices[offset+14] = v1[2];
	//			
	//			vertices[offset+15] = v4[0];
	//			vertices[offset+16] = v4[1];
	//			vertices[offset+17] = v4[2];
	//					 
	//					
	//			
	//			//var x = (dx * bbSize.min.x) / demSize + boundingBox.min.x;
	//			//var y = (dy * bbSize.min.y) / demSize + boundingBox.min.y;
	//			//var z = dem[dx + dy * demSize];
	//			
	//			offset += 18;
	//			
	//		}
	//	}
	//	
	//	geometry.addAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
	//	geometry.computeFaceNormals();
	//	geometry.computeVertexNormals();
	//	
	//	var material = new THREE.MeshNormalMaterial( { color: 0xff0000, shading: THREE.SmoothShading } );
	//	var mesh = new THREE.Mesh( geometry, material );
	//	scene.add(mesh);
	//}
	//
	//
	//if(node.level == 0){
	//	scene.add(mesh);
	//	
	//	var demb = new Uint8Array(demSize*demSize*4);
	//	for(var i = 0; i < demSize*demSize; i++){
	//		demb[4*i + 0] = 255 * dem[i] / 300;
	//		demb[4*i + 1] = 255 * dem[i] / 300;
	//		demb[4*i + 2] = 255 * dem[i] / 300;
	//		demb[4*i + 3] = 255;
	//	}
	//
	//	var img = pixelsArrayToImage(demb, demSize, demSize);
	//	img.style.boder = "2px solid red";
	//	img.style.position = "absolute";
	//	img.style.top  = "0px";
	//	img.style.width = "400px";
	//	img.style.height = "200px";
	//	var txt = document.createElement("div");
	//	txt.innerHTML = node.name;
	//	//document.body.appendChild(txt);
	//	document.body.appendChild(img);
	//}
	
	
	
	var end = new Date().getTime();
	var duration = end - start;
	
	demTime += duration;

	return result;
}

Potree.PointCloudOctree.prototype.getDEMHeight = function(position){
	var pos2 = new THREE.Vector2(position.x, position.z);
	
	var demHeight = function(dem){
		var demSize = dem.demSize;
		var box = dem.boundingBox2D;
		var insideBox = box.containsPoint(pos2);
		if(box.containsPoint(pos2)){
			var uv = pos2.clone().sub(box.min).divide(box.size());
			var xy = uv.clone().multiplyScalar(demSize);
			
			var demHeight = 0;
			
			if((xy.x > 0.5 && xy.x < demSize - 0.5) && (xy.y > 0.5 && xy.y < demSize - 0.5)){
				var i = Math.floor(xy.x - 0.5);
				var j = Math.floor(xy.y - 0.5);
				i = (i === demSize - 1) ? (demSize-2) : i;
				j = (j === demSize - 1) ? (demSize-2) : j;
				
				var u = xy.x - i - 0.5;
				var v = xy.y - j - 0.5; 
				
				var index00 = i + j * demSize;
				var index10 = (i+1) + j * demSize;
				var index01 = i + (j+1) * demSize;
				var index11 = (i+1) + (j+1) * demSize;
				
				var height00 = dem.dem[index00];
				var height10 = dem.dem[index10];
				var height01 = dem.dem[index01];
				var height11 = dem.dem[index11];
				
				if(height00 === 0 || height10 === 0 || height01 === 0 || height11 === 0){
					demHeight = null;
				}else{
				
					var hx1 = height00 * (1-u) + height10 * u;
					var hx2 = height01 * (1-u) + height11 * u;
					
					demHeight = hx1 * (1-v) + hx2 * v;
				}
				
				var bla;
			}else{
				xy.x = Math.min(parseInt(Math.min(xy.x, demSize)), demSize-1);
				xy.y = Math.min(parseInt(Math.min(xy.y, demSize)), demSize-1);
			
				var index = xy.x + xy.y * demSize;
				demHeight = dem.dem[index];
			}
			
			
			return demHeight;
		}
		
		return null;
	};
	
	var height = null;
	
	var stack = [];
	var chosenNode = null;
	if(this.root.dem){
		stack.push(this.root);
	}
	while(stack.length > 0){
		var node = stack.shift();
		var dem = node.dem;
		
		var demSize = dem.demSize;
		var box = dem.boundingBox2D;
		var insideBox = box.containsPoint(pos2);
		if(!box.containsPoint(pos2)){
			continue;
		}
		
		var dh = demHeight(dem);
		if(!height){
			height = dh;
		}else if(dh != null && dh > 0){
			height = dh;
		}

		if(node.level <= 2){
			for(var i = 0; i < node.children.length; i++){
				var child = node.children[i];
				if(child.dem){
					stack.push(child);
				}
			}
		}
	}
	
	
	
	return height;
}

Potree.PointCloudOctree.prototype.generateTerain = function(){
	var bb = this.boundingBox.clone().applyMatrix4(this.matrixWorld);
	
	var width = 300;
	var height = 300;
	var geometry = new THREE.BufferGeometry();
	var vertices = new Float32Array(width*height*3);
	
	var offset = 0;
	for(var i = 0; i < width; i++){
		for( var j = 0; j < height; j++){
			var u = i / width;
			var v = j / height;
			
			var x = u * bb.size().x + bb.min.x;
			var z = v * bb.size().z + bb.min.z;
			
			var y = this.getDEMHeight(new THREE.Vector3(x, 0, z));
			if(!y){
				y = 0;
			}
			
			vertices[offset + 0] = x;
			vertices[offset + 1] = y;
			vertices[offset + 2] = z;
			
			//var sm = new THREE.Mesh(sg);
			//sm.position.set(x,y,z);
			//scene.add(sm);
			
			offset += 3;
		}
	}
	
	geometry.addAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
	var material = new THREE.PointCloudMaterial({size: 20, color: 0x00ff00});
	
	var pc = new THREE.PointCloud(geometry, material);
	scene.add(pc);
	
};

Object.defineProperty(Potree.PointCloudOctree.prototype, "progress", {
	get: function(){
		return this.visibleNodes.length / this.visibleGeometry.length;
	}
});

var nodesLoadTimes = {};

Potree.PointCloudOctreeGeometry = function(){
	Potree.PointCloudOctree.lru = Potree.PointCloudOctree.lru || new LRU();

	this.url = null;
	this.octreeDir = null;
	this.spacing = 0;
	this.boundingBox = null;
	this.root = null;
	this.numNodesLoading = 0;
	this.nodes = null;
	this.pointAttributes = null;
	this.hierarchyStepSize = -1;
	this.loader = null;
}

Potree.PointCloudOctreeGeometryNode = function(name, pcoGeometry, boundingBox){
	this.id = Potree.PointCloudOctreeGeometryNode.IDCount++;
	this.name = name;
	this.index = parseInt(name.charAt(name.length-1));
	this.pcoGeometry = pcoGeometry;
	this.geometry = null;
	this.boundingBox = boundingBox;
	this.boundingSphere = boundingBox.getBoundingSphere();
	this.children = {};
	this.numPoints = 0;
	this.level = null;
}

Potree.PointCloudOctreeGeometryNode.IDCount = 0;

Potree.PointCloudOctreeGeometryNode.prototype.getURL = function(){
	var url = "";
	
	var version = this.pcoGeometry.loader.version;
	
	if(version.equalOrHigher("1.5")){
		url = this.pcoGeometry.octreeDir + "/" + this.getHierarchyPath() + "/" + this.name;
	}else if(version.equalOrHigher("1.4")){
		url = this.pcoGeometry.octreeDir + "/" + this.name;
	}else if(version.upTo("1.3")){
		url = this.pcoGeometry.octreeDir + "/" + this.name;
	}
	
	return url;
}

Potree.PointCloudOctreeGeometryNode.prototype.getHierarchyPath = function(){
	var path = "r/";

	var hierarchyStepSize = this.pcoGeometry.hierarchyStepSize;
	var indices = this.name.substr(1);
	
	var numParts = Math.floor(indices.length / hierarchyStepSize);
	for(var i = 0; i < numParts; i++){
		path += indices.substr(i * hierarchyStepSize, hierarchyStepSize) + "/";
	}
	
	path = path.slice(0,-1);

	return path;
}

Potree.PointCloudOctreeGeometryNode.prototype.addChild = function(child){
	this.children[child.index] = child;
	child.parent = this;
}

Potree.PointCloudOctreeGeometryNode.prototype.load = function(){
	if(this.loading === true || this.pcoGeometry.numNodesLoading > 3){
		return;
	}
	
	this.loading = true;
	
	//if(Potree.PointCloudOctree.lru.numPoints + this.numPoints >= Potree.pointLoadLimit){
	//	Potree.PointCloudOctree.disposeLeastRecentlyUsed(this.numPoints);
	//}
	
	this.pcoGeometry.numNodesLoading++;
	
	
	if(this.pcoGeometry.loader.version.equalOrHigher("1.5")){
		if((this.level % this.pcoGeometry.hierarchyStepSize) === 0 && this.hasChildren){
			this.loadHierachyThenPoints();
		}else{
			this.loadPoints();
		}
	}else{
		this.loadPoints();
	}
	
	
}

Potree.PointCloudOctreeGeometryNode.prototype.loadPoints = function(){
	this.pcoGeometry.loader.load(this);
};


Potree.PointCloudOctreeGeometryNode.prototype.loadHierachyThenPoints = function(){

	var node = this;

	// load hierarchy
	var callback = function(node, hbuffer){
		var count = hbuffer.byteLength / 5;
		var view = new DataView(hbuffer);
		
		var stack = [];
		var children = view.getUint8(0);
		var numPoints = view.getUint32(1, true);
		node.numPoints = numPoints;
		stack.push({children: children, numPoints: numPoints, name: node.name});
		
		var decoded = [];
		
		var offset = 5;
		while(stack.length > 0){
		
			var snode = stack.shift();
			var mask = 1;
			for(var i = 0; i < 8; i++){
				if((snode.children & mask) !== 0){
					var childIndex = i;
					var childName = snode.name + i;
					
					var childChildren = view.getUint8(offset);
					var childNumPoints = view.getUint32(offset + 1, true);
					
					stack.push({children: childChildren, numPoints: childNumPoints, name: childName});
					
					decoded.push({children: childChildren, numPoints: childNumPoints, name: childName});
					
					offset += 5;
				}
				
				mask = mask * 2;
			}
			
			if(offset === hbuffer.byteLength){
				break;
			}
			
		}
		
		//console.log(decoded);
		
		var nodes = {};
		nodes[node.name] = node;
		var pco = node.pcoGeometry;
		
		
		for( var i = 0; i < decoded.length; i++){
			var name = decoded[i].name;
			var numPoints = decoded[i].numPoints;
			var index = parseInt(name.charAt(name.length-1));
			var parentName = name.substring(0, name.length-1);
			var parentNode = nodes[parentName];
			var level = name.length-1;
			var boundingBox = Potree.POCLoader.createChildAABB(parentNode.boundingBox, index);
			
			var currentNode = new Potree.PointCloudOctreeGeometryNode(name, pco, boundingBox);
			currentNode.level = level;
			currentNode.numPoints = numPoints;
			currentNode.hasChildren = decoded[i].children > 0;
			parentNode.addChild(currentNode);
			nodes[name] = currentNode;
		}
		
		node.loadPoints();
		
	};
	if((node.level % node.pcoGeometry.hierarchyStepSize) === 0){
		//var hurl = node.pcoGeometry.octreeDir + "/../hierarchy/" + node.name + ".hrc";
		var hurl = node.pcoGeometry.octreeDir + "/" + node.getHierarchyPath() + "/" + node.name + ".hrc";
		
		var xhr = new XMLHttpRequest();
		xhr.open('GET', hurl, true);
		xhr.responseType = 'arraybuffer';
		xhr.overrideMimeType('text/plain; charset=x-user-defined');
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4) {
				if (xhr.status === 200 || xhr.status === 0) {
					var hbuffer = xhr.response;
					callback(node, hbuffer);
				} else {
					console.log('Failed to load file! HTTP status: ' + xhr.status + ", file: " + url);
				}
			}
		};
		try{
			xhr.send(null);
		}catch(e){
			console.log("fehler beim laden der punktwolke: " + e);
		}
	}

};



Potree.PointCloudOctreeGeometryNode.prototype.dispose = function(){
	if(this.geometry){
		this.geometry.dispose();
		this.geometry = null;
		this.loaded = false;
	}
}



Potree.utils = function(){
	
};

Potree.utils.pathExists = function(url){
	var req = new XMLHttpRequest();
	req.open('GET', url, false);
	req.send(null);
	if (req.status !== 200) {
		return false;
	}
	return true;
}

/**
 * adapted from mhluska at https://github.com/mrdoob/three.js/issues/1561
 */
Potree.utils.computeTransformedBoundingBox = function (box, transform) {

	var vertices = [
        new THREE.Vector3(box.min.x, box.min.y, box.min.z).applyMatrix4(transform),
        new THREE.Vector3(box.min.x, box.min.y, box.min.z).applyMatrix4(transform),
        new THREE.Vector3(box.max.x, box.min.y, box.min.z).applyMatrix4(transform),
        new THREE.Vector3(box.min.x, box.max.y, box.min.z).applyMatrix4(transform),
        new THREE.Vector3(box.min.x, box.min.y, box.max.z).applyMatrix4(transform),
        new THREE.Vector3(box.min.x, box.max.y, box.max.z).applyMatrix4(transform),
        new THREE.Vector3(box.max.x, box.max.y, box.min.z).applyMatrix4(transform),
        new THREE.Vector3(box.max.x, box.min.y, box.max.z).applyMatrix4(transform),
        new THREE.Vector3(box.max.x, box.max.y, box.max.z).applyMatrix4(transform)
    ];
	
	var boundingBox = new THREE.Box3();
	boundingBox.setFromPoints( vertices );
	
	return boundingBox;
}

/**
 * add separators to large numbers
 * 
 * @param nStr
 * @returns
 */
Potree.utils.addCommas = function(nStr){
	nStr += '';
	x = nStr.split('.');
	x1 = x[0];
	x2 = x.length > 1 ? '.' + x[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	}
	return x1 + x2;
}

/**
 * create worker from a string
 *
 * code from http://stackoverflow.com/questions/10343913/how-to-create-a-web-worker-from-a-string
 */
Potree.utils.createWorker = function(code){
	 var blob = new Blob([code], {type: 'application/javascript'});
	 var worker = new Worker(URL.createObjectURL(blob));
	 
	 return worker;
}

Potree.utils.loadSkybox = function(path){
	var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 100000 );
    var scene = new THREE.Scene();

    var format = ".jpg";
    var urls = [
        path + 'px' + format, path + 'nx' + format,
        path + 'py' + format, path + 'ny' + format,
        path + 'pz' + format, path + 'nz' + format
    ];

    var textureCube = THREE.ImageUtils.loadTextureCube(urls, THREE.CubeRefractionMapping );

    var shader = {
        uniforms: {
            "tCube": {type: "t", value: textureCube},
            "tFlip": {type: "f", value: -1}
        },
        vertexShader: THREE.ShaderLib["cube"].vertexShader,
        fragmentShader: THREE.ShaderLib["cube"].fragmentShader
    };

    var material = new THREE.ShaderMaterial({
        fragmentShader: shader.fragmentShader,
        vertexShader: shader.vertexShader,
        uniforms: shader.uniforms,
        depthWrite: false,
        side: THREE.BackSide
    });
    var mesh = new THREE.Mesh(new THREE.BoxGeometry(100, 100, 100), material);
    scene.add(mesh);

    return {"camera": camera, "scene": scene};
}

Potree.utils.createGrid = function createGrid(width, length, spacing, color){
	var material = new THREE.LineBasicMaterial({
		color: color || 0x888888
	});
	
	var geometry = new THREE.Geometry();
	for(var i = 0; i <= length; i++){
		 geometry.vertices.push(new THREE.Vector3(-(spacing*width)/2, 0, i*spacing-(spacing*length)/2));
		 geometry.vertices.push(new THREE.Vector3(+(spacing*width)/2, 0, i*spacing-(spacing*length)/2));
	}
	
	for(var i = 0; i <= width; i++){
		 geometry.vertices.push(new THREE.Vector3(i*spacing-(spacing*width)/2, 0, -(spacing*length)/2));
		 geometry.vertices.push(new THREE.Vector3(i*spacing-(spacing*width)/2, 0, +(spacing*length)/2));
	}
	
	var line = new THREE.Line(geometry, material, THREE.LinePieces);
	line.receiveShadow = true;
	return line;
}


Potree.utils.createBackgroundTexture = function(width, height){

	function gauss(x, y){
		return (1 / (2 * Math.PI)) * Math.exp( - (x*x + y*y) / 2);
	};

	var map = THREE.ImageUtils.generateDataTexture( width, height, new THREE.Color() );
	map.magFilter = THREE.NearestFilter;
	var data = map.image.data;

	//var data = new Uint8Array(width*height*4);
	var chroma = [1, 1.5, 1.7];
	var max = gauss(0, 0);

	for(var x = 0; x < width; x++){
		for(var y = 0; y < height; y++){
			var u = 2 * (x / width) - 1;
			var v = 2 * (y / height) - 1;
			
			var i = x + width*y;
			var d = gauss(2*u, 2*v) / max;
			var r = (Math.random() + Math.random() + Math.random()) / 3;
			r = (d * 0.5 + 0.5) * r * 0.03;
			r = r * 0.4;
			
			//d = Math.pow(d, 0.6);
			
			data[3*i+0] = 255 * (d / 15 + 0.05 + r) * chroma[0];
			data[3*i+1] = 255 * (d / 15 + 0.05 + r) * chroma[1];
			data[3*i+2] = 255 * (d / 15 + 0.05 + r) * chroma[2];
			
			//data[4*i+3] = 255;
		
		}
	}
	
	return map;
};



function getMousePointCloudIntersection(mouse, camera, renderer, pointclouds){
	var vector = new THREE.Vector3( mouse.x, mouse.y, 0.5 );
	vector.unproject(camera);

	var direction = vector.sub(camera.position).normalize();
	var ray = new THREE.Ray(camera.position, direction);
	
	var closestPoint = null;
	var closestPointDistance = null;
	
	for(var i = 0; i < pointclouds.length; i++){
		var pointcloud = pointclouds[i];
		var point = pointcloud.pick(renderer, camera, ray);
		
		if(!point){
			continue;
		}
		
		var distance = camera.position.distanceTo(point.position);
		
		if(!closestPoint || distance < closestPointDistance){
			closestPoint = point;
			closestPointDistance = distance;
		}
	}
	
	return closestPoint ? closestPoint.position : null;
}
	
	
function pixelsArrayToImage(pixels, width, height){
    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    var context = canvas.getContext('2d');
	
	pixels = new pixels.constructor(pixels);
	
	for(var i = 0; i < pixels.length; i++){
		pixels[i*4 + 3] = 255;
	}

    var imageData = context.createImageData(width, height);
    imageData.data.set(pixels);
    context.putImageData(imageData, 0, 0);

    var img = new Image();
    img.src = canvas.toDataURL();
	img.style.transform = "scaleY(-1)";
	
    return img;
}

function projectedRadius(radius, fov, distance, screenHeight){
	var projFactor =  (1 / Math.tan(fov / 2)) / distance;
	projFactor = projFactor * screenHeight / 2;
	
	return radius * projFactor;
};
	
	
Potree.utils.topView = function(camera, controls, pointcloud){
	camera.position.set(0, 1, 0);
	camera.rotation.set(-Math.PI / 2, 0, 0);
	camera.zoomTo(pointcloud, 1);

	if(controls.target){
		var sg = pointcloud.boundingSphere.clone().applyMatrix4(pointcloud.matrixWorld);
		var target = new THREE.Vector3(camera.position.x, sg.center.y, camera.position.z);
		controls.target.copy(target);
	}	
}

Potree.utils.frontView = function(camera, controls, pointcloud){
	camera.position.set(0, 0, 1);
	camera.rotation.set(0, 0, 0);
	camera.zoomTo(pointcloud, 1);

	if(controls.target){
		var sg = pointcloud.boundingSphere.clone().applyMatrix4(pointcloud.matrixWorld);
		var target = new THREE.Vector3(camera.position.x, camera.position.y, sg.center.z);
		controls.target.copy(target);
	}
}


Potree.utils.leftView = function(camera, controls, pointcloud){
	camera.position.set(-1, 0, 0);
	camera.rotation.set(0, -Math.PI / 2, 0);
	camera.zoomTo(pointcloud, 1);

	if(controls.target){
		var sg = pointcloud.boundingSphere.clone().applyMatrix4(pointcloud.matrixWorld);
		var target = new THREE.Vector3(sg.center.x, camera.position.y, camera.position.z);
		controls.target.copy(target);
	}
}

Potree.utils.rightView = function(camera, controls, pointcloud){
	camera.position.set(1, 0, 0);
	camera.rotation.set(0, Math.PI / 2, 0);
	camera.zoomTo(pointcloud, 1);

	if(controls.target){
		var sg = pointcloud.boundingSphere.clone().applyMatrix4(pointcloud.matrixWorld);
		var target = new THREE.Vector3(sg.center.x, camera.position.y, camera.position.z);
		controls.target.copy(target);
	}
}
	
/**
 *  
 * 0: no intersection
 * 1: intersection
 * 2: fully inside
 */
Potree.utils.frustumSphereIntersection = function(frustum, sphere){
	var planes = frustum.planes;
	var center = sphere.center;
	var negRadius = - sphere.radius;

	var minDistance = Number.MAX_VALUE;
	
	for ( var i = 0; i < 6; i ++ ) {

		var distance = planes[ i ].distanceToPoint( center );

		if ( distance < negRadius ) {

			return 0;

		}
		
		minDistance = Math.min(minDistance, distance);

	}

	return (minDistance >= sphere.radius) ? 2 : 1;
};
	
	
Potree.utils.screenPass = new function(){

	this.screenScene = new THREE.Scene();
	this.screenQuad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2, 0));
	this.screenQuad.material.depthTest = true;
	this.screenQuad.material.depthWrite = true;
	this.screenQuad.material.transparent = true;
	this.screenScene.add(this.screenQuad);
	this.camera = new THREE.Camera();
	
	this.render = function(renderer, material, target){
		this.screenQuad.material = material;
		
		if(typeof target === undefined){
			renderer.render(this.screenScene, this.camera);
		}else{
			renderer.render(this.screenScene, this.camera, target);
		}
	}
}();
	
	
	

Potree.Features = function(){

	var ftCanvas = document.createElement("canvas");
	var gl = ftCanvas.getContext("webgl") || ftCanvas.getContext("experimental-webgl");
	if (gl === null)
		return null;

	// -- code taken from THREE.WebGLRenderer --
	var _vertexShaderPrecisionHighpFloat = gl.getShaderPrecisionFormat( gl.VERTEX_SHADER, gl.HIGH_FLOAT );
	var _vertexShaderPrecisionMediumpFloat = gl.getShaderPrecisionFormat( gl.VERTEX_SHADER, gl.MEDIUM_FLOAT );
	var _vertexShaderPrecisionLowpFloat = gl.getShaderPrecisionFormat( gl.VERTEX_SHADER, gl.LOW_FLOAT );

	var _fragmentShaderPrecisionHighpFloat = gl.getShaderPrecisionFormat( gl.FRAGMENT_SHADER, gl.HIGH_FLOAT );
	var _fragmentShaderPrecisionMediumpFloat = gl.getShaderPrecisionFormat( gl.FRAGMENT_SHADER, gl.MEDIUM_FLOAT );
	var _fragmentShaderPrecisionLowpFloat = gl.getShaderPrecisionFormat( gl.FRAGMENT_SHADER, gl.LOW_FLOAT );

	var highpAvailable = _vertexShaderPrecisionHighpFloat.precision > 0 && _fragmentShaderPrecisionHighpFloat.precision > 0;
	var mediumpAvailable = _vertexShaderPrecisionMediumpFloat.precision > 0 && _fragmentShaderPrecisionMediumpFloat.precision > 0;
	// -----------------------------------------

	var precision;
	if(highpAvailable){
		precision = "highp";
	}else if(mediumpAvailable){
		precision = "mediump";
	}else{
		precision = "lowp";
	}

	return {
		SHADER_INTERPOLATION: {
			isSupported: function(){

				//if(typeof this.shaderInterpolationSupported === "undefined"){
				//	var material = new Potree.PointCloudMaterial();
				//	material.interpolate = true;
				//
				//	var vs = gl.createShader(gl.VERTEX_SHADER);
				//	var fs = gl.createShader(gl.FRAGMENT_SHADER);
				//	gl.shaderSource(vs, material.vertexShader);
				//	gl.shaderSource(fs, material.fragmentShader);
				//
				//	gl.compileShader(vs);
				//	gl.compileShader(fs);
				//
				//	var successVS = gl.getShaderParameter(vs, gl.COMPILE_STATUS);
				//	var successFS = gl.getShaderParameter(fs, gl.COMPILE_STATUS);
				//	this.shaderInterpolationSupported = successVS && successFS;
				//}
				//
				//return this.shaderInterpolationSupported;


				var supported = true;

				supported = supported && gl.getExtension("EXT_frag_depth");
				supported = supported && gl.getParameter(gl.MAX_VARYING_VECTORS) >= 8;

				return supported;
			}
		},
		SHADER_SPLATS: {
			isSupported: function(){

				var supported = true;

				supported = supported && gl.getExtension("EXT_frag_depth");
				supported = supported && gl.getExtension("OES_texture_float");
				supported = supported && gl.getParameter(gl.MAX_VARYING_VECTORS) >= 8;

				return supported;

			}

		},
		SHADER_EDL: {
			isSupported: function(){
				
				var supported = true;
				
				supported = supported && gl.getExtension("EXT_frag_depth");
				supported = supported && gl.getExtension("OES_texture_float");
				supported = supported && gl.getParameter(gl.MAX_VARYING_VECTORS) >= 8;
				
				return supported;
				
			}
		
		},
		precision: precision
	}

}();

/**
 * adapted from http://stemkoski.github.io/Three.js/Sprite-Text-Labels.html
 */

Potree.TextSprite = function(text){

	THREE.Object3D.call(this);

	var texture = new THREE.Texture();
	texture.minFilter = THREE.LinearFilter;
	texture.magFilter = THREE.LinearFilter;
	var spriteMaterial = new THREE.SpriteMaterial( 
		{ map: texture, useScreenCoordinates: false} );
	
	this.material = spriteMaterial;
	this.sprite = new THREE.Sprite(spriteMaterial);
	this.add(this.sprite);
	
	//THREE.Sprite.call(this, spriteMaterial);
	
	this.borderThickness = 4;
	this.fontface = "Arial";
	this.fontsize = 28;
	this.borderColor = { r:0, g:0, b:0, a:1.0 };
	this.backgroundColor = { r:255, g:255, b:255, a:1.0 };
	this.textColor = {r: 255, g: 255, b: 255, a: 1.0};
	this.text = "";
	
	this.setText(text);
};

Potree.TextSprite.prototype = new THREE.Object3D();

Potree.TextSprite.prototype.setText = function(text){
	this.text = text;
	
	this.update();
}

Potree.TextSprite.prototype.setTextColor = function(color){
	this.textColor = color;
	
	this.update();
}

Potree.TextSprite.prototype.setBorderColor = function(color){
	this.borderColor = color;
	
	this.update();
}

Potree.TextSprite.prototype.setBackgroundColor = function(color){
	this.backgroundColor = color;
	
	this.update();
}

Potree.TextSprite.prototype.update = function(){

	var canvas = document.createElement('canvas');
	var context = canvas.getContext('2d');
	context.font = "Bold " + this.fontsize + "px " + this.fontface;
	
	// get size data (height depends only on font size)
	var metrics = context.measureText( this.text );
	var textWidth = metrics.width;
	var spriteWidth = textWidth + 2 * this.borderThickness;
	var spriteHeight = this.fontsize * 1.4 + 2 * this.borderThickness;
	
	var canvas = document.createElement('canvas');
	var context = canvas.getContext('2d');
	context.canvas.width = spriteWidth;
	context.canvas.height = spriteHeight;
	context.font = "Bold " + this.fontsize + "px " + this.fontface;
	
	// background color
	context.fillStyle   = "rgba(" + this.backgroundColor.r + "," + this.backgroundColor.g + ","
								  + this.backgroundColor.b + "," + this.backgroundColor.a + ")";
	// border color
	context.strokeStyle = "rgba(" + this.borderColor.r + "," + this.borderColor.g + ","
								  + this.borderColor.b + "," + this.borderColor.a + ")";
								  
	context.lineWidth = this.borderThickness;
	this.roundRect(context, this.borderThickness/2, this.borderThickness/2, 
		textWidth + this.borderThickness, this.fontsize * 1.4 + this.borderThickness, 6);						  
		
	// text color
	context.strokeStyle = "rgba(0, 0, 0, 1.0)";
	context.strokeText( this.text, this.borderThickness, this.fontsize + this.borderThickness);
	
	context.fillStyle = "rgba(" + this.textColor.r + "," + this.textColor.g + ","
								  + this.textColor.b + "," + this.textColor.a + ")";
	context.fillText( this.text, this.borderThickness, this.fontsize + this.borderThickness);
	
								  
	var texture = new THREE.Texture(canvas); 
	texture.minFilter = THREE.LinearFilter;
	texture.magFilter = THREE.LinearFilter;
	texture.needsUpdate = true;	
	
	//var spriteMaterial = new THREE.SpriteMaterial( 
	//	{ map: texture, useScreenCoordinates: false } );
	this.sprite.material.map = texture;
		
	this.sprite.scale.set(spriteWidth*0.01,spriteHeight*0.01,1.0);
		
	//this.material = spriteMaterial;						  
}

Potree.TextSprite.prototype.roundRect = function(ctx, x, y, w, h, r) {
	ctx.beginPath();
	ctx.moveTo(x+r, y);
	ctx.lineTo(x+w-r, y);
	ctx.quadraticCurveTo(x+w, y, x+w, y+r);
	ctx.lineTo(x+w, y+h-r);
	ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
	ctx.lineTo(x+r, y+h);
	ctx.quadraticCurveTo(x, y+h, x, y+h-r);
	ctx.lineTo(x, y+r);
	ctx.quadraticCurveTo(x, y, x+r, y);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();   
}




Potree.Version = function(version){
	this.version = version;
	var vmLength = (version.indexOf(".") === -1) ? version.length : version.indexOf(".");
	this.versionMajor = parseInt(version.substr(0, vmLength));
	this.versionMinor = parseInt(version.substr(vmLength + 1));
	if(this.versionMinor.length === 0){
		this.versionMinor = 0;
	}
	
};

Potree.Version.prototype.newerThan = function(version){
	var v = new Potree.Version(version);
	
	if( this.versionMajor > v.versionMajor){
		return true;
	}else if( this.versionMajor === v.versionMajor && this.versionMinor > v.versionMinor){
		return true;
	}else{
		return false;
	}
};

Potree.Version.prototype.equalOrHigher = function(version){
	var v = new Potree.Version(version);
	
	if( this.versionMajor > v.versionMajor){
		return true;
	}else if( this.versionMajor === v.versionMajor && this.versionMinor >= v.versionMinor){
		return true;
	}else{
		return false;
	}
};

Potree.Version.prototype.upTo = function(version){
	return !this.newerThan(version);
}

Potree.Measure = function(){
	var scope = this;
	
	THREE.Object3D.call( this );
	
	this.points = [];
	this._showDistances = true;
	this._showArea = true;
	this._closed = true;
	this.maxMarkers = Number.MAX_SAFE_INTEGER;
	
	this.spheres = [];
	this.edges = [];
	this.sphereLabels = [];
	this.edgeLabels = [];
	this.angleLabels = [];
	
	this.areaLabel = new Potree.TextSprite("");
	this.areaLabel.setBorderColor({r:0, g:255, b:0, a:0.0});
	this.areaLabel.setBackgroundColor({r:0, g:255, b:0, a:0.0});
	this.areaLabel.setTextColor({r:180, g:220, b:180, a:1.0});
	this.areaLabel.material.depthTest = false;
	this.areaLabel.material.opacity = 1;
	this.add(this.areaLabel);
	
	var sphereGeometry = new THREE.SphereGeometry(0.4, 10, 10);
	this.color = new THREE.Color( 0xff0000 );
	
	var createSphereMaterial = function(){
		var sphereMaterial = new THREE.MeshLambertMaterial({
			shading: THREE.SmoothShading, 
			color: scope.color, 
			ambient: 0xaaaaaa,
			depthTest: false, 
			depthWrite: false}
		);
		
		return sphereMaterial;
	};
	
	var moveEvent = function(event){
		event.target.material.emissive.setHex(0x888888);
	};
	
	var leaveEvent = function(event){
		event.target.material.emissive.setHex(0x000000);
	};
	
	var dragEvent = function(event){
		var tool = event.tool;
		var dragstart = tool.dragstart;
		var mouse = tool.mouse;
	
		var I = tool.getMousePointCloudIntersection();
			
		if(I){
			var index = scope.spheres.indexOf(tool.dragstart.object);
			scope.setPosition(index, I);
		}
		
		//event.event.stopImmediatePropagation();
	};
	
	var dropEvent = function(event){
	
	};
	
	this.addMarker = function(point){
		this.points.push(point);
		
		// sphere
		var sphere = new THREE.Mesh(sphereGeometry, createSphereMaterial());
		sphere.addEventListener("move", moveEvent);
		sphere.addEventListener("leave", leaveEvent);
		sphere.addEventListener("drag", dragEvent);
		sphere.addEventListener("drop", dropEvent);
		
		this.add(sphere);
		this.spheres.push(sphere);
		
		{ // edges
			var lineGeometry = new THREE.Geometry();
			lineGeometry.vertices.push(new THREE.Vector3(), new THREE.Vector3());
			lineGeometry.colors.push(this.color, this.color, this.color);
			var lineMaterial = new THREE.LineBasicMaterial( { 
				linewidth: 1
			});
			lineMaterial.depthTest = false;
			var edge = new THREE.Line(lineGeometry, lineMaterial);
			edge.visible = true;
			
			this.add(edge);
			this.edges.push(edge);
		}
		
		{ // edge labels
			var edgeLabel = new Potree.TextSprite(0);
			edgeLabel.setBorderColor({r:0, g:255, b:0, a:0.0});
			edgeLabel.setBackgroundColor({r:0, g:255, b:0, a:0.0});
			edgeLabel.material.depthTest = false;
			edgeLabel.visible = false;
			this.edgeLabels.push(edgeLabel);
			this.add(edgeLabel);
		}
		
		{ // angle labels
			var angleLabel = new Potree.TextSprite();
            angleLabel.setBorderColor({r:0, g:255, b:0, a:0.0});
            angleLabel.setBackgroundColor({r:0, g:255, b:0, a:0.0});
            angleLabel.material.depthTest = false;
            angleLabel.material.opacity = 1;
			angleLabel.visible = false;
			this.angleLabels.push(angleLabel);
			this.add(angleLabel);
		}

		
		
		var event = {
			type: "marker_added",
			measurement: this
		};
		this.dispatchEvent(event);
		
		this.setPosition(this.points.length-1, point);
	};
	
	this.removeMarker = function(index){
		this.points.splice(index, 1);
		
		this.remove(this.spheres[index]);
		
		var edgeIndex = (index == 0) ? 0 : (index - 1);
		this.remove(this.edges[edgeIndex]);
		this.edges.splice(edgeIndex, 1);
		
		this.remove(this.edgeLabels[edgeIndex]);
		this.edgeLabels.splice(edgeIndex, 1);
		
		this.spheres.splice(index, 1);
		
		this.update();
	};
	
	this.setPosition = function(index, position){
		var point = this.points[index];			
		point.copy(position);
		
		var event = {
			type: 		'marker_moved',
			measure:	this,
			index:		index,
			position: 	position.clone()
		};
		this.dispatchEvent(event);
		
		this.update();
	};
	
	this.getArea = function(){
		var area = 0;
		var j = this.points.length - 1;
		
		for(var i = 0; i < this.points.length; i++){
			var p1 = this.points[i];
			var p2 = this.points[j];
			area += (p2.x + p1.x) * (p1.z - p2.z);
			j = i;
		}
		
		return Math.abs(area / 2);
	};
	
	this.getAngleBetweenLines = function(cornerPoint, point1, point2) {
        var v1 = new THREE.Vector3().subVectors(point1, cornerPoint);
        var v2 = new THREE.Vector3().subVectors(point2, cornerPoint);
        return v1.angleTo(v2);
    };
	
	this.update = function(){
	
		if(this.points.length === 0){
			return;
		}else if(this.points.length === 1){
			var point = this.points[0];
			this.spheres[0].position.copy(point);
			
			return;
		}
		
		var lastIndex = this.points.length - 1;
		
		var centroid = new THREE.Vector3();
		for(var i = 0; i <= lastIndex; i++){
			var point = this.points[i];
			centroid.add(point);
		}
		centroid.divideScalar(this.points.length);
		
		for(var i = 0; i <= lastIndex; i++){
			var index = i;
			var nextIndex = ( i + 1 > lastIndex ) ? 0 : i + 1;
			var previousIndex = (i === 0) ? lastIndex : i - 1;
		
			var point = this.points[index];
			var nextPoint = this.points[nextIndex];
			var previousPoint = this.points[previousIndex];
			
			var sphere = this.spheres[index];
			
			// spheres
			sphere.position.copy(point);
			sphere.material.color = scope.color;

			{// edges
				var edge = this.edges[index];
				
				edge.material.color = this.color;
				
				edge.geometry.vertices[0].copy(point);
				edge.geometry.vertices[1].copy(nextPoint);
				
				edge.geometry.verticesNeedUpdate = true;
				edge.geometry.computeBoundingSphere();
				edge.visible = index < lastIndex || this.closed;
			}
			
			{// edge labels
				var edgeLabel = this.edgeLabels[i];
			
				var center = new THREE.Vector3().add(point);
				center.add(nextPoint);
				center = center.multiplyScalar(0.5);
				var distance = point.distanceTo(nextPoint);
				
				edgeLabel.position.copy(center);
				edgeLabel.setText(distance.toFixed(2));
				edgeLabel.visible = this.showDistances && (index < lastIndex || this.closed) && this.points.length >= 2 && distance > 0;
			}
			
			{// angle labels
				var angleLabel = this.angleLabels[i];
				var angle = this.getAngleBetweenLines(point, previousPoint, nextPoint);
				
				var dir = nextPoint.clone().sub(previousPoint);
				dir.multiplyScalar(0.5);
				dir = previousPoint.clone().add(dir).sub(point).normalize();
				
				var dist = Math.min(point.distanceTo(previousPoint), point.distanceTo(nextPoint));
				dist = dist / 9;
				
				var labelPos = point.clone().add(dir.multiplyScalar(dist));
				angleLabel.position.copy(labelPos);
				
				var msg = Potree.utils.addCommas((angle*(180.0/Math.PI)).toFixed(1)) + '\u00B0';
				angleLabel.setText(msg);
				
				angleLabel.visible = this.showAngles && (index < lastIndex || this.closed) && this.points.length >= 3 && angle > 0;
			}
		}
		
		// update area label
		this.areaLabel.position.copy(centroid);
		this.areaLabel.visible = this.showArea && this.points.length >= 3;
		var msg = Potree.utils.addCommas(this.getArea().toFixed(1)) + "²";
		this.areaLabel.setText(msg);
	};
	
	this.raycast = function(raycaster, intersects){
		
		for(var i = 0; i < this.points.length; i++){
			var sphere = this.spheres[i];
			
			sphere.raycast(raycaster, intersects);
		}
		
		// recalculate distances because they are not necessarely correct
		// for scaled objects.
		// see https://github.com/mrdoob/three.js/issues/5827
		// TODO: remove this once the bug has been fixed
		for(var i = 0; i < intersects.length; i++){
			var I = intersects[i];
			I.distance = raycaster.ray.origin.distanceTo(I.point);
		}
		intersects.sort( function ( a, b ) { return a.distance - b.distance;} );
	}
};

Potree.Measure.prototype = Object.create( THREE.Object3D.prototype );

Object.defineProperty(Potree.Measure.prototype, "showArea", {
	get: function(){
		return this._showArea;
	},
	set: function(value){
		this._showArea = value;
		this.update();
	}
});

Object.defineProperty(Potree.Measure.prototype, "closed", {
	get: function(){
		return this._closed;
	},
	set: function(value){
		this._closed = value;
		this.update();
	}
});

Object.defineProperty(Potree.Measure.prototype, "showDistances", {
	get: function(){
		return this._showDistances;
	},
	set: function(value){
		this._showDistances = value;
		this.update();
	}
});

Potree.MeasuringTool = function(scene, camera, renderer){
	
	var scope = this;
	this.enabled = false;
	
	this.scene = scene;
	this.camera = camera;
	this.renderer = renderer;
	this.domElement = renderer.domElement;
	this.mouse = {x: 0, y: 0};
	
	var STATE = {
		DEFAULT: 0,
		INSERT: 1
	};
	
	var state = STATE.DEFAULT;
	
	this.activeMeasurement;
	this.measurements = [];
	this.sceneMeasurement = new THREE.Scene();
	this.sceneRoot = new THREE.Object3D();
	this.sceneMeasurement.add(this.sceneRoot);
	
	this.light = new THREE.DirectionalLight( 0xffffff, 1 );
	this.light.position.set( 0, 0, 10 );
	this.light.lookAt(new THREE.Vector3(0,0,0));
	this.sceneMeasurement.add( this.light );
	
	this.hoveredElement = null;
	
	function onClick(event){
		if(state === STATE.INSERT){
			var I = scope.getMousePointCloudIntersection();
			if(I){
				var pos = I.clone();
				
				scope.activeMeasurement.addMarker(pos);
				
				var event = {
					type: 'newpoint',
					position: pos.clone()
				};
				scope.dispatchEvent(event);
				
				if(scope.activeMeasurement.points.length > scope.activeMeasurement.maxMarkers){
					scope.finishInsertion();
				}
				
			}
		}
	};
	
	function onMouseMove(event){
	
		var rect = scope.domElement.getBoundingClientRect();
		scope.mouse.x = ((event.clientX - rect.left) / scope.domElement.clientWidth) * 2 - 1;
        scope.mouse.y = -((event.clientY - rect.top) / scope.domElement.clientHeight) * 2 + 1;
		
		if(scope.dragstart){
			var arg = {
				type: "drag", 
				event: event, 
				tool: scope
			};
			scope.dragstart.object.dispatchEvent(arg);
			
		}else if(state == STATE.INSERT && scope.activeMeasurement){
			var I = scope.getMousePointCloudIntersection();
			
			if(I){
			
				var lastIndex = scope.activeMeasurement.points.length-1;
				scope.activeMeasurement.setPosition(lastIndex, I);
			}
			
		}else{
			var I = getHoveredElement();
			
			if(I){
				
				I.object.dispatchEvent({type: "move", target: I.object, event: event});
				
				if(scope.hoveredElement && scope.hoveredElement !== I.object){
					scope.hoveredElement.dispatchEvent({type: "leave", target: scope.hoveredElement, event: event});
				}
				
				scope.hoveredElement = I.object;
				
			}else{
			
				if(scope.hoveredElement){
					scope.hoveredElement.dispatchEvent({type: "leave", target: scope.hoveredElement, event: event});
				}
				
				scope.hoveredElement = null;
			
			}
		}
	};
	
	function onRightClick(event){
		if(state == STATE.INSERT){			
			scope.finishInsertion();
		}
	}
	
	this.getState = function(){
		// TODO remove
	
		return state;
	}
	
	function onMouseDown(event){

		if(event.which === 1){
		
			if(state !== STATE.DEFAULT){
				event.stopImmediatePropagation();
			}
			
			var I = getHoveredElement();
			
			if(I){
				
				scope.dragstart = {
					object: I.object, 
					sceneClickPos: I.point,
					sceneStartPos: scope.sceneRoot.position.clone(),
					mousePos: {x: scope.mouse.x, y: scope.mouse.y}
				};
				
				event.stopImmediatePropagation();
				
			}
			
		}else if(event.which === 3){	
			onRightClick(event);
		}
	}
	
	function onDoubleClick(event){
		
		// fix move event after double click
		// see: http://stackoverflow.com/questions/8125165/event-listener-for-dblclick-causes-event-for-mousemove-to-not-work-and-show-a-ci
		if (window.getSelection){
			window.getSelection().removeAllRanges();
		}else if (document.selection){
			document.selection.empty();
		}
		
		
		if(scope.activeMeasurement && state === STATE.INSERT){
			scope.activeMeasurement.removeMarker(scope.activeMeasurement.points.length-1);
			scope.finishInsertion();
		}
	}
	
	function onMouseUp(event){

		if(scope.dragstart){
			scope.dragstart.object.dispatchEvent({type: "drop", event: event});
			scope.dragstart = null;
		}
		
	}
	
	function getHoveredElement(){
			
		var vector = new THREE.Vector3( scope.mouse.x, scope.mouse.y, 0.5 );
		vector.unproject(scope.camera);
		
		var raycaster = new THREE.Raycaster();
		raycaster.ray.set( scope.camera.position, vector.sub( scope.camera.position ).normalize() );
		
		var spheres = [];
		for(var i = 0; i < scope.measurements.length; i++){
			var m = scope.measurements[i];
			
			for(var j = 0; j < m.spheres.length; j++){
				spheres.push(m.spheres[j]);
			}
		}
		
		var intersections = raycaster.intersectObjects(spheres, true);
		if(intersections.length > 0){
			return intersections[0];
		}else{
			return false;
		}
	};
	
	this.getMousePointCloudIntersection = function(){
		var vector = new THREE.Vector3( scope.mouse.x, scope.mouse.y, 0.5 );
		vector.unproject(scope.camera);

		var direction = vector.sub(scope.camera.position).normalize();
		var ray = new THREE.Ray(scope.camera.position, direction);
		
		var pointClouds = [];
		scope.scene.traverse(function(object){
			if(object instanceof Potree.PointCloudOctree || object instanceof Potree.PointCloudArena4D){
				pointClouds.push(object);
			}
		});
		
		var closestPoint = null;
		var closestPointDistance = null;
		
		for(var i = 0; i < pointClouds.length; i++){
			var pointcloud = pointClouds[i];
			var point = pointcloud.pick(scope.renderer, scope.camera, ray);
			
			if(!point){
				continue;
			}
			
			var distance = scope.camera.position.distanceTo(point.position);
			
			if(!closestPoint || distance < closestPointDistance){
				closestPoint = point;
				closestPointDistance = distance;
			}
		}
		
		return closestPoint ? closestPoint.position : null;
	}	
	
	this.startInsertion = function(args){
		state = STATE.INSERT;
		
		var args = args || {};
		var showDistances = (typeof args.showDistances != "undefined") ? args.showDistances : true;
		var showArea = (typeof args.showArea != "undefined") ? args.showArea : false;
		var showAngles = (typeof args.showAngles != "undefined") ? args.showAngles : false;
		var closed = (typeof args.closed != "undefined") ? args.closed : false;
		var maxMarkers = args.maxMarkers || Number.MAX_SAFE_INTEGER;
		
		var measurement = new Potree.Measure();
		measurement.showDistances = showDistances;
		measurement.showArea = showArea;
		measurement.showAngles = showAngles;
		measurement.closed = closed;
		measurement.maxMarkers = maxMarkers;

		this.addMeasurement(measurement);
		measurement.addMarker(new THREE.Vector3(0,0,0));
		
		this.activeMeasurement = measurement;
	};
	
	this.finishInsertion = function(){
		this.activeMeasurement.removeMarker(this.activeMeasurement.points.length-1);
		
		var event = {
			type: "insertion_finished",
			measurement: this.activeMeasurement
		};
		this.dispatchEvent(event);
		
		this.activeMeasurement = null;
		state = STATE.DEFAULT;
	};
	
	this.addMeasurement = function(measurement){
		this.sceneMeasurement.add(measurement);
		this.measurements.push(measurement);
		
		this.dispatchEvent({"type": "measurement_added", measurement: measurement});
		measurement.addEventListener("marker_added", function(event){
			scope.dispatchEvent(event);
		});
		measurement.addEventListener("marker_removed", function(event){
			scope.dispatchEvent(event);
		});
		measurement.addEventListener("marker_moved", function(event){
			scope.dispatchEvent(event);
		});
	};
	
	this.removeMeasurement = function(measurement){
		this.sceneMeasurement.remove(measurement);
		var index = this.measurements.indexOf(measurement);
		if(index >= 0){
			this.measurements.splice(index, 1);
		}
	};
	
	this.reset = function(){
		for(var i = this.measurements.length - 1; i >= 0; i--){
			var measurement = this.measurements[i];
			this.removeMeasurement(measurement);
		}
	};
	
	this.update = function(){
		var measurements = [];
		for(var i = 0; i < this.measurements.length; i++){
			measurements.push(this.measurements[i]);
		}
		if(this.activeMeasurement){
			measurements.push(this.activeMeasurement);
		}
		
		// make sizes independant of distance and fov
		for(var i = 0; i < measurements.length; i++){
			var measurement = measurements[i];
			
			// spheres
			for(var j = 0; j < measurement.spheres.length; j++){
				var sphere = measurement.spheres[j];
				
				var distance = scope.camera.position.distanceTo(sphere.getWorldPosition());
				var pr = projectedRadius(1, scope.camera.fov * Math.PI / 180, distance, renderer.domElement.clientHeight);
				var scale = (15 / pr);
				sphere.scale.set(scale, scale, scale);
				
			}
			
			// edgeLabels
			for(var j = 0; j < measurement.edgeLabels.length; j++){
				var label = measurement.edgeLabels[j];
				
				var distance = scope.camera.position.distanceTo(label.getWorldPosition());
				var pr = projectedRadius(1, scope.camera.fov * Math.PI / 180, distance, renderer.domElement.clientHeight);
				var scale = (70 / pr);
				label.scale.set(scale, scale, scale);
			}
			
			// angle labels
			for(var j = 0; j < measurement.edgeLabels.length; j++){
				var label = measurement.angleLabels[j];
				
				var distance = scope.camera.position.distanceTo(label.getWorldPosition());
				var pr = projectedRadius(1, scope.camera.fov * Math.PI / 180, distance, renderer.domElement.clientHeight);
				var scale = (70 / pr);
				label.scale.set(scale, scale, scale);
			}
			
			// areaLabel
			var distance = scope.camera.position.distanceTo(measurement.areaLabel.getWorldPosition());
			var pr = projectedRadius(1, scope.camera.fov * Math.PI / 180, distance, renderer.domElement.clientHeight);
			var scale = (80 / pr);
			measurement.areaLabel.scale.set(scale, scale, scale);
		}
	
		this.light.position.copy(this.camera.position);
		this.light.lookAt(this.camera.getWorldDirection().add(this.camera.position));
		
	};
	
	this.render = function(){
		this.update();
		this.renderer.render(this.sceneMeasurement, this.camera);
	};
	
	this.domElement.addEventListener( 'click', onClick, false);
	this.domElement.addEventListener( 'dblclick', onDoubleClick, false);
	this.domElement.addEventListener( 'mousemove', onMouseMove, false );
	this.domElement.addEventListener( 'mousedown', onMouseDown, false );
	this.domElement.addEventListener( 'mouseup', onMouseUp, true );
};


Potree.MeasuringTool.prototype = Object.create( THREE.EventDispatcher.prototype );



Potree.HeightProfile = function(){
	var scope = this;
	
	THREE.Object3D.call( this );

	this.points = [];
	this.spheres = [];
	this.edges = [];
	this.boxes = [];
	this.width = 1;
	this.height = 20;
	this._modifiable = true;
	
	var sphereGeometry = new THREE.SphereGeometry(0.4, 10, 10);
	var lineColor = new THREE.Color( 0xff0000 );
	
	var createSphereMaterial = function(){
		var sphereMaterial = new THREE.MeshLambertMaterial({
			shading: THREE.SmoothShading, 
			color: 0xff0000, 
			ambient: 0xaaaaaa,
			depthTest: false, 
			depthWrite: false}
		);
		
		return sphereMaterial;
	};
	
	var moveEvent = function(event){
		event.target.material.emissive.setHex(0x888888);
	};
	
	var leaveEvent = function(event){
		event.target.material.emissive.setHex(0x000000);
	};
	
	var dragEvent = function(event){
	
		var tool = event.tool;
		var dragstart = tool.dragstart;
		var mouse = tool.mouse;
	
		if(event.event.ctrlKey){
		
			var mouseStart = new THREE.Vector3(dragstart.mousePos.x, dragstart.mousePos.y, 0);
			var mouseEnd = new THREE.Vector3(mouse.x, mouse.y, 0);
			var widthStart = dragstart.widthStart;
			
			var scale = 1 - 10 * (mouseStart.y - mouseEnd.y);
			scale = Math.max(0.01, scale);
			if(widthStart){
				scope.setWidth(widthStart *  scale);
			}
		
		}else{
	
			var I = tool.getMousePointCloudIntersection();
				
			if(I){
				var index = scope.spheres.indexOf(tool.dragstart.object);
				scope.setPosition(index, I);
			}
		}
		
		event.event.stopImmediatePropagation();
	};
	
	var dropEvent = function(event){
	
	};
	
	this.addMarker = function(point){	
		
		this.points.push(point);

		// sphere
		var sphere = new THREE.Mesh(sphereGeometry, createSphereMaterial());
		sphere.addEventListener("mousemove", moveEvent);
		sphere.addEventListener("mouseleave", leaveEvent);
		sphere.addEventListener("mousedrag", dragEvent);
		sphere.addEventListener("drop", dropEvent);
		
		this.add(sphere);
		this.spheres.push(sphere);
		
		// edges & boxes
		if(this.points.length > 1){
		
			var lineGeometry = new THREE.Geometry();
			lineGeometry.vertices.push(new THREE.Vector3(), new THREE.Vector3());
			lineGeometry.colors.push(lineColor, lineColor, lineColor);
			var lineMaterial = new THREE.LineBasicMaterial( { 
				vertexColors: THREE.VertexColors, 
				linewidth: 2, 
				transparent: true, 
				opacity: 0.4 
			});
			lineMaterial.depthTest = false;
			var edge = new THREE.Line(lineGeometry, lineMaterial);
			edge.visible = false;
			
			this.add(edge);
			this.edges.push(edge);
			
			
			var boxGeometry = new THREE.BoxGeometry(1, 1, 1);
			var boxMaterial = new THREE.MeshBasicMaterial({color: 0xff0000, transparent: true, opacity: 0.2});
			var box = new THREE.Mesh(boxGeometry, boxMaterial);
			box.visible = false;
			
			this.add(box);
			this.boxes.push(box);
			
		}

		
		var event = {
			"type": "marker_added",
			"profile": this
		};
		this.dispatchEvent(event);
		
		this.setPosition(this.points.length-1, point);
	};
	
	this.removeMarker = function(index){
		this.points.splice(index, 1);
		
		this.remove(this.spheres[index]);
		
		var edgeIndex = (index == 0) ? 0 : (index - 1);
		this.remove(this.edges[edgeIndex]);
		this.edges.splice(edgeIndex, 1);
		this.remove(this.boxes[edgeIndex]);
		this.boxes.splice(edgeIndex, 1);
		
		this.spheres.splice(index, 1);
		
		this.update();
		
		var event = {
			"type": "marker_removed",
			"profile": this
		};
		this.dispatchEvent(event);
	};
	
	/**
	 * see http://www.mathopenref.com/coordpolygonarea2.html
	 */
	this.getArea = function(){
		var area = 0;
		var j = this.points.length - 1;
		
		for(var i = 0; i < this.points.length; i++){
			var p1 = this.points[i];
			var p2 = this.points[j];
			area += (p2.x + p1.x) * (p1.z - p2.z);
			j = i;
		}
		
		return Math.abs(area / 2);
	};
	
	this.setPosition = function(index, position){
		var point = this.points[index];			
		point.copy(position);
		
		var event = {
			type: 		'marker_moved',
			profile:	this,
			index:		index,
			position: 	position.clone()
		};
		this.dispatchEvent(event);
		
		this.update();
	};
	
	this.setWidth = function(width){
		this.width = width;
		
		this.update();
	};
	
	this.update = function(){
	
		if(this.points.length === 0){
			return;
		}else if(this.points.length === 1){
			var point = this.points[0];
			this.spheres[0].position.copy(point);
			
			return;
		}
		
		var min = this.points[0].clone();
		var max = this.points[0].clone();
		var centroid = new THREE.Vector3();
		var lastIndex = this.points.length - 1;
		for(var i = 0; i <= lastIndex; i++){
			var point = this.points[i];
			var sphere = this.spheres[i];
			var leftIndex = (i === 0) ? lastIndex : i - 1;
			var rightIndex = (i === lastIndex) ? 0 : i + 1;
			var leftVertex = this.points[leftIndex];
			var rightVertex = this.points[rightIndex];
			var leftEdge = this.edges[leftIndex];
			var rightEdge = this.edges[i];
			var leftBox = this.boxes[leftIndex];
			var rightBox = this.boxes[i];
			
			var leftEdgeLength = point.distanceTo(leftVertex);
			var rightEdgeLength = point.distanceTo(rightVertex);
			var leftEdgeCenter = new THREE.Vector3().addVectors(leftVertex, point).multiplyScalar(0.5);
			var rightEdgeCenter = new THREE.Vector3().addVectors(point, rightVertex).multiplyScalar(0.5);
			
			sphere.position.copy(point);
			
			if(this._modifiable){
				sphere.visible = true;
			}else{
				sphere.visible = false;
			}
			
			if(leftEdge){
				leftEdge.geometry.vertices[1].copy(point);
				leftEdge.geometry.verticesNeedUpdate = true;
				leftEdge.geometry.computeBoundingSphere();
			}
			
			if(rightEdge){
				rightEdge.geometry.vertices[0].copy(point);
				rightEdge.geometry.verticesNeedUpdate = true;
				rightEdge.geometry.computeBoundingSphere();
			}
			
			if(leftBox){
				var start = leftVertex;
				var end = point;
				var length = start.clone().setY(0).distanceTo(end.clone().setY(0));
				leftBox.scale.set(length, this.height, this.width);
				
				var center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
				var diff = new THREE.Vector3().subVectors(end, start);
				var target = new THREE.Vector3(diff.z, 0, -diff.x);
				
				leftBox.position.set(0,0,0);
				leftBox.lookAt(target);
				leftBox.position.copy(center);
			}
			
			
			
			
			centroid.add(point);
			min.min(point);
			max.max(point);
		}
		centroid.multiplyScalar(1 / this.points.length);
		
		for(var i = 0; i < this.boxes.length; i++){
			var box = this.boxes[i];
			
			box.position.y = min.y + (max.y - min.y) / 2;
			//box.scale.y = max.y - min.y + 50;
			box.scale.y = 1000000;
		}
		
	};
	
	this.raycast = function(raycaster, intersects){
		
		for(var i = 0; i < this.points.length; i++){
			var sphere = this.spheres[i];
			
			sphere.raycast(raycaster, intersects);
		}
		
		// recalculate distances because they are not necessarely correct
		// for scaled objects.
		// see https://github.com/mrdoob/three.js/issues/5827
		// TODO: remove this once the bug has been fixed
		for(var i = 0; i < intersects.length; i++){
			var I = intersects[i];
			I.distance = raycaster.ray.origin.distanceTo(I.point);
		}
		intersects.sort( function ( a, b ) { return a.distance - b.distance;} );
	}
	
	
}

Potree.HeightProfile.prototype = Object.create( THREE.Object3D.prototype );

Object.defineProperty(Potree.HeightProfile.prototype, "modifiable", {
	get: function(){
		return this.modifiable;
	},
	set: function(value){
		this._modifiable = value;
		this.update();
	}
});





//
// calculating area of a polygon:
// http://www.mathopenref.com/coordpolygonarea2.html
//
//
//

Potree.ProfileTool = function(scene, camera, renderer){
	
	var scope = this;
	this.enabled = false;
	
	this.scene = scene;
	this.camera = camera;
	this.renderer = renderer;
	this.domElement = renderer.domElement;
	this.mouse = {x: 0, y: 0};
	
	var STATE = {
		DEFAULT: 0,
		INSERT: 1
	};
	
	var state = STATE.DEFAULT;
	
	var sphereGeometry = new THREE.SphereGeometry(0.4, 10, 10);
	
	this.activeProfile;
	this.profiles = [];
	this.sceneProfile = new THREE.Scene();
	this.sceneRoot = new THREE.Object3D();
	this.sceneProfile.add(this.sceneRoot);
	
	this.light = new THREE.DirectionalLight( 0xffffff, 1 );
	this.light.position.set( 0, 0, 10 );
	this.light.lookAt(new THREE.Vector3(0,0,0));
	this.sceneProfile.add( this.light );
	
	this.hoveredElement = null;
	
	function createSphereMaterial(){
		var sphereMaterial = new THREE.MeshLambertMaterial({
			shading: THREE.SmoothShading, 
			color: 0xff0000, 
			ambient: 0xaaaaaa,
			depthTest: false, 
			depthWrite: false}
		);
		
		return sphereMaterial;
	};

	
	function onClick(event){
	
		if(state === STATE.INSERT){
			var I = scope.getMousePointCloudIntersection();
			if(I){
				var pos = I.clone();
				
				scope.activeProfile.addMarker(pos);
				
				var event = {
					type: 'newpoint',
					position: pos.clone()
				};
				scope.dispatchEvent(event);
				
			}
		}
	};
	
	function onMouseMove(event){
		var rect = scope.domElement.getBoundingClientRect();
		scope.mouse.x = ((event.clientX - rect.left) / scope.domElement.clientWidth) * 2 - 1;
        scope.mouse.y = -((event.clientY - rect.top) / scope.domElement.clientHeight) * 2 + 1;
		
		if(scope.dragstart){
			var arg = {
				type: "mousedrag", 
				event: event, 
				tool: scope
			};
			scope.dragstart.object.dispatchEvent(arg);
			
		}else if(state == STATE.INSERT && scope.activeProfile){
			var I = scope.getMousePointCloudIntersection();
			
			if(I){
			
				var lastIndex = scope.activeProfile.points.length-1;
				scope.activeProfile.setPosition(lastIndex, I);
			}
			
		}else{
			var I = getHoveredElement();
			
			if(I){
				
				I.object.dispatchEvent({type: "mousemove", target: I.object, event: event});
				
				if(scope.hoveredElement && scope.hoveredElement !== I.object){
					scope.hoveredElement.dispatchEvent({type: "mouseleave", target: scope.hoveredElement, event: event});
				}
				
				scope.hoveredElement = I.object;
				
			}else{
			
				if(scope.hoveredElement){
					scope.hoveredElement.dispatchEvent({type: "mouseleave", target: scope.hoveredElement, event: event});
				}
				
				scope.hoveredElement = null;
			
			}
		}
	};
	
	function onRightClick(event){
		if(state == STATE.INSERT){			
			scope.finishInsertion();
		}
	}
	
	function onMouseDown(event){
	
		if(state !== STATE.DEFAULT){
			event.stopImmediatePropagation();
		}
	
		if(event.which === 1){
			
			var I = getHoveredElement();
			
			if(I){
			
				var widthStart = null;
				for(var i = 0; i < scope.profiles.length; i++){
					var profile = scope.profiles[i];
					for(var j = 0; j < profile.spheres.length; j++){
						var sphere = profile.spheres[j];
						
						if(sphere === I.object){
							widthStart = profile.width;
						}
					}
				}
				
				scope.dragstart = {
					object: I.object, 
					sceneClickPos: I.point,
					sceneStartPos: scope.sceneRoot.position.clone(),
					mousePos: {x: scope.mouse.x, y: scope.mouse.y},
					widthStart: widthStart
				};
				event.stopImmediatePropagation();
				
			}
			
		}else if(event.which === 3){	
			onRightClick(event);
		}
	}
	
	function onDoubleClick(event){
		
		// fix move event after double click
		// see: http://stackoverflow.com/questions/8125165/event-listener-for-dblclick-causes-event-for-mousemove-to-not-work-and-show-a-ci
		if (window.getSelection){
			window.getSelection().removeAllRanges();
		}else if (document.selection){
			document.selection.empty();
		}
	
		if(scope.activeProfile && state === STATE.INSERT){
			scope.activeProfile.removeMarker(scope.activeProfile.points.length-1);
			scope.finishInsertion();
		}
	}
	
	function onMouseUp(event){
		
		if(scope.dragstart){
			scope.dragstart.object.dispatchEvent({type: "drop", event: event});
			scope.dragstart = null;
		}
		
	}
	
	function getHoveredElement(){
			
		var vector = new THREE.Vector3( scope.mouse.x, scope.mouse.y, 0.5 );
		vector.unproject(scope.camera);
		
		var raycaster = new THREE.Raycaster();
		raycaster.ray.set( scope.camera.position, vector.sub( scope.camera.position ).normalize() );
		
		var intersections = raycaster.intersectObjects(scope.profiles);
		
		if(intersections.length > 0){
			return intersections[0];
		}else{
			return false;
		}
	};
	
	this.getMousePointCloudIntersection = function(){
		var vector = new THREE.Vector3( scope.mouse.x, scope.mouse.y, 0.5 );
		vector.unproject(scope.camera);

		var direction = vector.sub(scope.camera.position).normalize();
		var ray = new THREE.Ray(scope.camera.position, direction);
		
		var pointClouds = [];
		scope.scene.traverse(function(object){
			if(object instanceof Potree.PointCloudOctree || object instanceof Potree.PointCloudArena4D){
				pointClouds.push(object);
			}
		});
		
		var closestPoint = null;
		var closestPointDistance = null;
		
		for(var i = 0; i < pointClouds.length; i++){
			var pointcloud = pointClouds[i];
			var point = pointcloud.pick(scope.renderer, scope.camera, ray);
			
			if(!point){
				continue;
			}
			
			var distance = scope.camera.position.distanceTo(point.position);
			
			if(!closestPoint || distance < closestPointDistance){
				closestPoint = point;
				closestPointDistance = distance;
			}
		}
		
		return closestPoint ? closestPoint.position : null;
	}	
	
	this.startInsertion = function(args){
		state = STATE.INSERT;
		
		var args = args || {};
		var clip = args.clip || false;
		var width = args.width || 1.0;
		
		this.activeProfile = new Potree.HeightProfile();
		this.activeProfile.clip = clip;
		this.activeProfile.setWidth(width);
		this.addProfile(this.activeProfile);
		this.activeProfile.addMarker(new THREE.Vector3(0,0,0));
		
		return this.activeProfile;
	};
	
	this.finishInsertion = function(){
		this.activeProfile.removeMarker(this.activeProfile.points.length-1);
		
		var event = {
			type: "insertion_finished",
			profile: this.activeProfile
		};
		this.dispatchEvent(event);
		
		this.activeProfile = null;
		state = STATE.DEFAULT;
	};
	
	this.addProfile = function(profile){
		this.profiles.push(profile);
		this.sceneProfile.add(profile);
		profile.update();
		
		this.dispatchEvent({"type": "profile_added", profile: profile});
		profile.addEventListener("marker_added", function(event){
			scope.dispatchEvent(event);
		});
		profile.addEventListener("marker_removed", function(event){
			scope.dispatchEvent(event);
		});
		profile.addEventListener("marker_moved", function(event){
			scope.dispatchEvent(event);
		});
	};
	
	this.removeProfile = function(profile){
		this.sceneProfile.remove(profile);
		var index = this.profiles.indexOf(profile);
		if(index >= 0){
			this.profiles.splice(index, 1);
		}
		
		this.dispatchEvent({"type": "profile_removed", profile: profile});
	}
	
	this.reset = function(){
		for(var i = this.profiles.length - 1; i >= 0; i--){
			var profile = this.profiles[i];
			this.removeProfile(profile);
		}
	}
	
	this.update = function(){
		
		for(var i = 0; i < this.profiles.length; i++){
			var profile = this.profiles[i];
			for(var j = 0; j < profile.spheres.length; j++){
				var sphere = profile.spheres[j];
				
				var distance = scope.camera.position.distanceTo(sphere.getWorldPosition());
				var pr = projectedRadius(1, scope.camera.fov * Math.PI / 180, distance, renderer.domElement.clientHeight);
				var scale = (15 / pr);
				sphere.scale.set(scale, scale, scale);
			}
		}
	
		this.light.position.copy(this.camera.position);
		this.light.lookAt(this.camera.getWorldDirection().add(this.camera.position));
		
	};
	
	this.render = function(){
		this.update();
		renderer.render(this.sceneProfile, this.camera);
	};
	
	this.domElement.addEventListener( 'click', onClick, false);
	this.domElement.addEventListener( 'dblclick', onDoubleClick, false);
	this.domElement.addEventListener( 'mousemove', onMouseMove, false );
	this.domElement.addEventListener( 'mousedown', onMouseDown, false );
	this.domElement.addEventListener( 'mouseup', onMouseUp, true );
	
};


Potree.ProfileTool.prototype = Object.create( THREE.EventDispatcher.prototype );


Potree.TransformationTool = function(scene, camera, renderer){

	var scope = this;
	this.enabled = false;
	
	this.scene = scene;
	this.camera = camera;
	this.renderer = renderer;
	this.domElement = renderer.domElement;
	this.mouse = {x: 0, y: 0};
	this.dragstart = null;
	
	this.sceneTransformation = new THREE.Scene();
	this.sceneRoot = new THREE.Object3D();
	this.sceneTransformation.add(this.sceneRoot);
	
	this.sceneRotation = new THREE.Scene();
	
	this.translationNode = new THREE.Object3D();
	this.rotationNode = new THREE.Object3D();
	this.scaleNode = new THREE.Object3D();
	
	this.sceneRoot.add(this.translationNode);
	this.sceneRoot.add(this.rotationNode);
	this.sceneRoot.add(this.scaleNode);
	
	this.sceneRoot.visible = false;
	
	this.hoveredElement = null;
	
	this.STATE = {
		DEFAULT: 0,
		TRANSLATE_X: 1,
		TRANSLATE_Y: 2,
		TRANSLATE_Z: 3,
		SCALE_X: 1,
		SCALE_Y: 2,
		SCALE_Z: 3
	};
	
	this.parts = {
		ARROW_X : 	{name: "arrow_x", 	object: undefined, color: new THREE.Color( 0xff0000 ), state: this.STATE.TRANSLATE_X},
		ARROW_Z : 	{name: "arrow_z", 	object: undefined, color: new THREE.Color( 0x0000ff ), state: this.STATE.TRANSLATE_Z},
		ARROW_Y : 	{name: "arrow_y", 	object: undefined, color: new THREE.Color( 0x00ff00 ), state: this.STATE.TRANSLATE_Y},
		SCALE_X : 	{name: "scale_x", 	object: undefined, color: new THREE.Color( 0xff0000 ), state: this.STATE.SCALE_X},
		SCALE_Z : 	{name: "scale_z", 	object: undefined, color: new THREE.Color( 0x0000ff ), state: this.STATE.SCALE_Z},
		SCALE_Y : 	{name: "scale_y", 	object: undefined, color: new THREE.Color( 0x00ff00 ), state: this.STATE.SCALE_Y},
		ROTATE_X : 	{name: "rotate_x", 	object: undefined, color: new THREE.Color( 0xff0000 ), state: this.STATE.ROTATE_X},
		ROTATE_Z : 	{name: "rotate_z", 	object: undefined, color: new THREE.Color( 0x0000ff ), state: this.STATE.ROTATE_Z},
		ROTATE_Y : 	{name: "rotate_y", 	object: undefined, color: new THREE.Color( 0x00ff00 ), state: this.STATE.ROTATE_Y}
	}

	this.buildTranslationNode = function(){
		var arrowX = scope.createArrow(scope.parts.ARROW_X, scope.parts.ARROW_X.color);
		arrowX.rotation.z = -Math.PI/2;
		
		var arrowY = scope.createArrow(scope.parts.ARROW_Y, scope.parts.ARROW_Y.color);
		
		var arrowZ = scope.createArrow(scope.parts.ARROW_Z, scope.parts.ARROW_Z.color);
		arrowZ.rotation.x = -Math.PI/2;
		
		this.translationNode.add(arrowX);
		this.translationNode.add(arrowY);
		this.translationNode.add(arrowZ);
	};
	
	this.buildScaleNode = function(){
		var xHandle = this.createScaleHandle(scope.parts.SCALE_X, 0xff0000);
		xHandle.rotation.z = -Math.PI/2;
		
		var yHandle = this.createScaleHandle(scope.parts.SCALE_Y, 0x00ff00);
		
		var zHandle = this.createScaleHandle(scope.parts.SCALE_Z, 0x0000ff);
		zHandle.rotation.x = -Math.PI/2;
		
		this.scaleNode.add(xHandle);
		this.scaleNode.add(yHandle);
		this.scaleNode.add(zHandle);
	}
	
	this.buildRotationNode = function(){
		var xHandle = this.createRotationCircle(scope.parts.ROTATE_X, 0xff0000);
		xHandle.rotation.y = -Math.PI/2;
		
		var yHandle = this.createRotationCircle(scope.parts.ROTATE_Y, 0x00ff00);
		
		var zHandle = this.createRotationCircle(scope.parts.ROTATE_Z, 0x0000ff);
		yHandle.rotation.x = -Math.PI/2;
		
		this.rotationNode.add(xHandle);
		this.rotationNode.add(yHandle);
		this.rotationNode.add(zHandle);
		
		
		var sg = new THREE.SphereGeometry(2.9, 24, 24);
		var sphere = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({color: 0xaaaaaa, transparent: true, opacity: 0.4}));
		
		this.sceneRotation.add(sphere);
		
		var moveEvent = function(event){
			sphere.material.color.setHex(0x555555);
		};
		
		var leaveEvent = function(event){
			sphere.material.color.setHex(0xaaaaaa);
		};
		
		var dragEvent = function(event){
			event.event.stopImmediatePropagation();
		
			var mouseStart = new THREE.Vector3(scope.dragstart.mousePos.x, scope.dragstart.mousePos.y, 0.1);
			var mouseEnd = new THREE.Vector3(scope.mouse.x, scope.mouse.y, 0.1);
			var mouseDiff = new THREE.Vector3().subVectors(mouseEnd, mouseStart);
			
			var sceneStart = mouseStart.clone().unproject(scope.camera);
			var sceneEnd = mouseEnd.clone().unproject(scope.camera);
			var sceneDiff = new THREE.Vector3().subVectors(sceneEnd, sceneStart);
			var sceneDir = sceneDiff.clone().normalize();
			var toCamDir = new THREE.Vector3().subVectors(scope.camera.position, sceneStart).normalize();
			var rotationAxis = toCamDir.clone().cross(sceneDir);
			var rotationAmount = 6 * mouseDiff.length();
			
			for(var i = 0; i < scope.targets.length; i++){
				var target = scope.targets[i];
				var startRotation = scope.dragstart.rotations[i];
				
				target.rotation.copy(startRotation);

				var q = new THREE.Quaternion();

				q.setFromAxisAngle( rotationAxis, rotationAmount );
				target.quaternion.multiplyQuaternions( q, target.quaternion );

			}
		};
		
		var dropEvent = function(event){
		
		};
		
		sphere.addEventListener("mousemove", moveEvent);
		sphere.addEventListener("mouseleave", leaveEvent);
		sphere.addEventListener("mousedrag", dragEvent);
		sphere.addEventListener("drop", dropEvent);
		
	}
	
	
	
	this.createBox = function(color){
		var boxGeometry = new THREE.BoxGeometry(1, 1, 1);
		var boxMaterial = new THREE.MeshBasicMaterial({color: color, transparent: true, opacity: 0.5});
		var box = new THREE.Mesh(boxGeometry, boxMaterial);
		
		return box;
	};
	
	var sph1, sph2, sph3;
	
	this.createRotationCircle = function(partID, color){
		//var geometry = new THREE.TorusGeometry(3, 0.1, 12, 48);
		//var material = new THREE.MeshBasicMaterial({color: color});
		//
		//var ring = new THREE.Mesh(geometry, material);
		
		var vertices = [];
		var segments = 128;
		for(var i = 0; i <= segments; i++){
			var u = (2 * Math.PI * i) / segments;
			var x = 3 * Math.cos(u);
			var y = 3 * Math.sin(u);
			
			vertices.push(new THREE.Vector3(x, y, 0));
		}
		var geometry = new THREE.Geometry();
		for(var i = 0; i < vertices.length; i++){
			geometry.vertices.push(vertices[i]);
		}
		var material = new THREE.LineBasicMaterial({color: color});
		var ring = new THREE.Line( geometry, material);
		ring.mode = THREE.LineStrip;
		ring.scale.set(1, 1, 1);
		//this.rotationNode.add(ring);
		
		
		var moveEvent = function(event){
			material.color.setRGB(1, 1, 0);
		};
		
		var leaveEvent = function(event){
			material.color.setHex(color);
		};
		
		var dragEvent = function(event){
		
			event.event.stopImmediatePropagation();
		
			var normal = new THREE.Vector3();
			if(partID === scope.parts.ROTATE_X){
				normal.x = 1;
			}else if(partID === scope.parts.ROTATE_Y){
				normal.y = 1;
			}else if(partID === scope.parts.ROTATE_Z){
				normal.z = -1;
			}
			
			var sceneClickPos = scope.dragstart.sceneClickPos.clone();
			var sceneOrigin = scope.sceneRoot.position.clone();
			var sceneNormal = sceneClickPos.clone().sub(sceneOrigin).normalize();
			
			var screenClickPos = sceneClickPos.clone().project(scope.camera);
			var screenOrigin = sceneOrigin.clone().project(scope.camera);
			var screenNormal = screenClickPos.clone().sub(screenOrigin).normalize();
			var screenTangent = new THREE.Vector3(screenNormal.y, screenNormal.x, 0);
			
			var mouseStart = new THREE.Vector3(scope.dragstart.mousePos.x, scope.dragstart.mousePos.y, 0);
			var mouseEnd = new THREE.Vector3(scope.mouse.x, scope.mouse.y, 0);
			
			var plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, scope.sceneRoot.position);
			var camOrigin = scope.camera.position;
			var camDirection = new THREE.Vector3( 0, 0, -1 ).applyQuaternion( scope.camera.quaternion );
			var direction = new THREE.Vector3( mouseEnd.x, mouseEnd.y, 0.5 ).unproject(scope.camera).sub( scope.camera.position ).normalize();
			var ray = new THREE.Ray( camOrigin, direction);
			var I = ray.intersectPlane(plane);
			
			if(!I){
				return;
			}
			
			sceneTargetNormal = I.clone().sub(sceneOrigin).normalize();
			
			var angleToClick;
			var angleToTarget;
			
			if(partID === scope.parts.ROTATE_X){
				angleToClick = 2 * Math.PI + Math.atan2(sceneNormal.y, -sceneNormal.z);
				angleToTarget = 4 * Math.PI + Math.atan2(sceneTargetNormal.y, -sceneTargetNormal.z);
			}else if(partID === scope.parts.ROTATE_Y){
				angleToClick = 2 * Math.PI + Math.atan2(-sceneNormal.z, sceneNormal.x);
				angleToTarget = 4 * Math.PI + Math.atan2(-sceneTargetNormal.z, sceneTargetNormal.x);
			}else if(partID === scope.parts.ROTATE_Z){
				angleToClick = 2 * Math.PI + Math.atan2(sceneNormal.x, sceneNormal.y);
				angleToTarget = 4 * Math.PI + Math.atan2(sceneTargetNormal.x, sceneTargetNormal.y);
			}
			
			var diff = angleToTarget - angleToClick;
			
			for(var i = 0; i < scope.targets.length; i++){
				var target = scope.targets[i];
				var startRotation = scope.dragstart.rotations[i];
				
				target.rotation.copy(startRotation);

				var q = new THREE.Quaternion();

				q.setFromAxisAngle( normal, diff ); // axis must be normalized, angle in radians
				target.quaternion.multiplyQuaternions( q, target.quaternion );

			}
			
			
			
			
		};
		
		var dropEvent = function(event){
		
		};
		
		ring.addEventListener("mousemove", moveEvent);
		ring.addEventListener("mouseleave", leaveEvent);
		ring.addEventListener("mousedrag", dragEvent);
		ring.addEventListener("drop", dropEvent);
		
		return ring;
	};
	
	this.createScaleHandle = function(partID, color){
		var boxGeometry = new THREE.BoxGeometry(1, 1, 1);
		var material = new THREE.MeshBasicMaterial({color: color, depthTest: false, depthWrite: false});
		
		var box = new THREE.Mesh(boxGeometry, material);
		box.scale.set(0.3, 0.3, 0.3);
		box.position.set(0, 3, 0);
		
		var shaftGeometry = new THREE.Geometry();
		shaftGeometry.vertices.push(new THREE.Vector3(0, 0, 0));
		shaftGeometry.vertices.push(new THREE.Vector3(0, 3, 0));
		var shaftMaterial = new THREE.LineBasicMaterial({color: color, depthTest: false, depthWrite: false});
		var shaft = new THREE.Line(shaftGeometry, shaftMaterial);
		
		var handle = new THREE.Object3D();
		handle.add(box);
		handle.add(shaft);
		
		handle.partID = partID;
		
		
		var moveEvent = function(event){
			shaftMaterial.color.setRGB(1, 1, 0);
			material.color.setRGB(1, 1, 0);
		};
		
		var leaveEvent = function(event){
			shaftMaterial.color.setHex(color);
			material.color.setHex(color);
		};
		
		var dragEvent = function(event){
		
			var sceneDirection = new THREE.Vector3();
			if(partID === scope.parts.SCALE_X){
				sceneDirection.x = 1;
			}else if(partID === scope.parts.SCALE_Y){
				sceneDirection.y = 1;
			}else if(partID === scope.parts.SCALE_Z){
				sceneDirection.z = -1;
			}
			
			var sceneClickPos = scope.dragstart.sceneClickPos.clone();
			sceneClickPos.multiply(sceneDirection);
			sceneClickPos.z *= -1;
		
			var lineStart = scope.dragstart.sceneStartPos.clone().project(scope.camera);
			var lineEnd = scope.dragstart.sceneStartPos.clone().add(sceneDirection).project(scope.camera);
			
			var origin = lineStart.clone();
			var screenDirection = lineEnd.clone().sub(lineStart);
			screenDirection.normalize();
			
			var mouseStart = new THREE.Vector3(scope.dragstart.mousePos.x, scope.dragstart.mousePos.y, 0);
			var mouseEnd = new THREE.Vector3(scope.mouse.x, scope.mouse.y, 0);
	
			var directionDistance = new THREE.Vector3().subVectors(mouseEnd, mouseStart).dot(screenDirection);
			var pointOnLine = screenDirection.clone().multiplyScalar(directionDistance).add(origin);
			
			pointOnLine.unproject(scope.camera);
			
			var diff = scope.sceneRoot.position.clone().sub(pointOnLine);
			diff.multiply(new THREE.Vector3(-1, -1, 1));
			
			for(var i = 0; i < scope.targets.length; i++){
				var target = scope.targets[i];
				var startScale = scope.dragstart.scales[i];
				target.scale.copy(startScale).add(diff);
				target.scale.x = Math.max(target.scale.x, 0.01);
				target.scale.y = Math.max(target.scale.y, 0.01);
				target.scale.z = Math.max(target.scale.z, 0.01);
			}

			event.event.stopImmediatePropagation();

		};
		
		var dropEvent = function(event){
			material.color.set(color);
		};
		
		box.addEventListener("mousemove", moveEvent);
		box.addEventListener("mouseleave", leaveEvent);
		box.addEventListener("mousedrag", dragEvent);
		box.addEventListener("drop", dropEvent);
		shaft.addEventListener("mousemove", moveEvent);
		shaft.addEventListener("mouseleave", leaveEvent);
		shaft.addEventListener("mousedrag", dragEvent);
		shaft.addEventListener("drop", dropEvent);
		
		return handle;
	};
	
	this.createArrow = function(partID, color){
		var material = new THREE.MeshBasicMaterial({color: color, depthTest: false, depthWrite: false});
		
		//var shaftGeometry = new THREE.CylinderGeometry(0.05, 0.05, 3, 10, 1, false);
		//var shaftMaterial  = material;
		//var shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
		//shaft.position.y = 1.5;
		
		var shaftGeometry = new THREE.Geometry();
		shaftGeometry.vertices.push(new THREE.Vector3(0, 0, 0));
		shaftGeometry.vertices.push(new THREE.Vector3(0, 3, 0));
		var shaftMaterial = new THREE.LineBasicMaterial({color: color, depthTest: false, depthWrite: false});
		var shaft = new THREE.Line(shaftGeometry, shaftMaterial);
		
		
		
		var headGeometry = new THREE.CylinderGeometry(0, 0.2, 0.5, 10, 1, false);
		var headMaterial  = material;
		var head = new THREE.Mesh(headGeometry, headMaterial);
		head.position.y = 3;
		
		var arrow = new THREE.Object3D();
		arrow.add(shaft);
		arrow.add(head);
		arrow.partID = partID;
		arrow.material = material;
		
		var moveEvent = function(event){
			headMaterial.color.setRGB(1, 1, 0);
			shaftMaterial.color.setRGB(1, 1, 0);
		};
		
		var leaveEvent = function(event){
			headMaterial.color.set(color);
			shaftMaterial.color.set(color);
		};
		
		var dragEvent = function(event){
		
			var sceneDirection = new THREE.Vector3();
			if(partID === scope.parts.ARROW_X){
				sceneDirection.x = 1;
			}else if(partID === scope.parts.ARROW_Y){
				sceneDirection.y = 1;
			}else if(partID === scope.parts.ARROW_Z){
				sceneDirection.z = -1;
			}
			
			var sceneClickPos = scope.dragstart.sceneClickPos.clone();
			sceneClickPos.multiply(sceneDirection);
			sceneClickPos.z *= -1;
		
			//var lineStart = new THREE.Vector3();
			//lineStart.x = scope.dragstart.mousePos.x;			
			//lineStart.y = scope.dragstart.mousePos.y;
			var lineStart = scope.dragstart.sceneStartPos.clone().project(scope.camera);
			var lineEnd = scope.dragstart.sceneStartPos.clone().add(sceneDirection).project(scope.camera);
			
			var origin = lineStart.clone();
			var screenDirection = lineEnd.clone().sub(lineStart);
			screenDirection.normalize();
			
			
			
			var mouseStart = new THREE.Vector3(scope.dragstart.mousePos.x, scope.dragstart.mousePos.y, 0);
			var mouseEnd = new THREE.Vector3(scope.mouse.x, scope.mouse.y, 0);
			
			//var htmlStart = mouseStart.clone().addScalar(1).multiplyScalar(0.5);
			//htmlStart.x *= scope.domElement.clientWidth;
			//htmlStart.y *= scope.domElement.clientHeight;
			//
			//var htmlEnd = mouseEnd.clone().addScalar(1).multiplyScalar(0.5);
			//htmlEnd.x *= scope.domElement.clientWidth;
			//htmlEnd.y *= scope.domElement.clientHeight;
			//
			//var el = document.getElementById("testDiv");
			//el.style.left = htmlStart.x;
			//el.style.width = htmlEnd.x - htmlStart.x;
			//el.style.bottom = htmlStart.y;
			//el.style.top = scope.domElement.clientHeight - htmlEnd.y;
			
			
			
			
			//var directionDistance = new THREE.Vector3().subVectors(mouseEnd, origin).dot(screenDirection);
			var directionDistance = new THREE.Vector3().subVectors(mouseEnd, mouseStart).dot(screenDirection);
			var pointOnLine = screenDirection.clone().multiplyScalar(directionDistance).add(origin);
			
			pointOnLine.unproject(scope.camera);
			
			var diff = scope.sceneRoot.position.clone();
			//scope.position.copy(pointOnLine);
			var offset = sceneClickPos.clone().sub(scope.dragstart.sceneStartPos);
			scope.sceneRoot.position.copy(pointOnLine);
			//scope.sceneRoot.position.sub(offset);
			diff.sub(scope.sceneRoot.position);
			
			for(var i = 0; i < scope.targets.length; i++){
				var target = scope.targets[i];
				target.position.sub(diff);
			}
			
			//if(!sph1){
			//	var g = new THREE.SphereGeometry(0.2);
			//	
			//	var m1 = new THREE.MeshBasicMaterial({color: 0xff0000});
			//	var m2 = new THREE.MeshBasicMaterial({color: 0x00ff00});
			//	var m3 = new THREE.MeshBasicMaterial({color: 0x0000ff});
			//	
			//	sph1 = new THREE.Mesh(g, m1);
			//	sph2 = new THREE.Mesh(g, m2);
			//	sph3 = new THREE.Mesh(g, m3);
			//	
			//	scope.scene.add(sph1);
			//	scope.scene.add(sph2);
			//	scope.scene.add(sph3);
			//}
			//sph1.position.copy(scope.dragstart.sceneStartPos);
			//sph2.position.copy(scope.dragstart.sceneClickPos);
			//sph3.position.copy(pointOnLine);

			event.event.stopImmediatePropagation();

		};
		
		var dropEvent = function(event){
			shaftMaterial.color.set(color);
		};
		
		shaft.addEventListener("mousemove", moveEvent);
		head.addEventListener("mousemove", moveEvent);
		
		shaft.addEventListener("mouseleave", leaveEvent);
		head.addEventListener("mouseleave", leaveEvent);
		
		shaft.addEventListener("mousedrag", dragEvent);
		head.addEventListener("mousedrag", dragEvent);
		
		shaft.addEventListener("drop", dropEvent);
		head.addEventListener("drop", dropEvent);
		
		
		
		return arrow;
	};
	
	function onMouseMove(event){
		scope.mouse.x = ( event.clientX / scope.domElement.clientWidth ) * 2 - 1;
		scope.mouse.y = - ( event.clientY / scope.domElement.clientHeight ) * 2 + 1;
	
	
		if(scope.dragstart){
			
			scope.dragstart.object.dispatchEvent({
				type: "mousedrag", 
				event: event
			});
			
		}else{
	
	
			var I = getHoveredElement();
			if(I){
				var object = I.object;
				
				//var g = new THREE.SphereGeometry(2);
				//var m = new THREE.Mesh(g);
				//scope.scene.add(m);
				//m.position.copy(I.point);
				
				object.dispatchEvent({type: "mousemove", event: event});
				
				if(scope.hoveredElement && scope.hoveredElement !== object){
					scope.hoveredElement.dispatchEvent({type: "mouseleave", event: event});
				}
				
				scope.hoveredElement = object;
				
			}else{
				if(scope.hoveredElement){
					scope.hoveredElement.dispatchEvent({type: "mouseleave", event: event});
				}
			
				scope.hoveredElement = null;
			}
		
		}
		
		
	};
	
	function onMouseDown(event){
	
	
		if(event.which === 1){
			// left click
			var I = getHoveredElement();
			if(I){
				
				var scales = [];
				var rotations = [];
				for(var i = 0; i < scope.targets.length; i++){
					scales.push(scope.targets[i].scale.clone());
					rotations.push(scope.targets[i].rotation.clone());
				}
			
				scope.dragstart = {
					object: I.object, 
					sceneClickPos: I.point,
					sceneStartPos: scope.sceneRoot.position.clone(),
					mousePos: {x: scope.mouse.x, y: scope.mouse.y},
					scales: scales,
					rotations: rotations
				};
				event.stopImmediatePropagation();
			}
		}else if(event.which === 3){
			// right click
			
			scope.setTargets([]);
		}
	};
	
	function onMouseUp(event){
	
		if(scope.dragstart){
			scope.dragstart.object.dispatchEvent({type: "drop", event: event});
			scope.dragstart = null;
		}
	};
	
	function getHoveredElement(){
	
		if(scope.targets.length === 0){
			return;
		}
			
		var vector = new THREE.Vector3( scope.mouse.x, scope.mouse.y, 0.5 );
		vector.unproject(scope.camera);
		
		var raycaster = new THREE.Raycaster();
		raycaster.ray.set( scope.camera.position, vector.sub( scope.camera.position ).normalize() );
		raycaster.linePrecision = 0.2;
		
		var objects = [];
		if(scope.translationNode.visible){
			objects.push(scope.translationNode);
		}else if(scope.scaleNode.visible){
			objects.push(scope.scaleNode);
		}else if(scope.rotationNode.visible){
			objects.push(scope.rotationNode);
			objects.push(scope.sceneRotation);
		}
		
		var intersections = raycaster.intersectObjects(objects, true);
		
		// recalculate distances because they are not necessarely correct
		// for scaled objects.
		// see https://github.com/mrdoob/three.js/issues/5827
		// TODO: remove this once the bug has been fixed
		for(var i = 0; i < intersections.length; i++){
			var I = intersections[i];
			I.distance = scope.camera.position.distanceTo(I.point);
		}
		intersections.sort( function ( a, b ) { return a.distance - b.distance;} );
		
		if(intersections.length > 0){
			return intersections[0];
		}else{
			return false;
		}
	};
	
	this.setTargets = function(targets){
		scope.targets = targets;
		
		if(scope.targets.length === 0){
			this.sceneRoot.visible = false;
			this.sceneRotation.visible = false;
		
			return;
		}else{
			this.sceneRoot.visible = true;
		}
		
		//TODO calculate centroid of all targets
		var target = targets[0];
		var bb;
		if(target.geometry && target.geometry.boundingBox){
			bb = target.geometry.boundingBox;
		}else{
			bb = target.boundingBox;
		}
		
		if(bb){
			var centroid = bb.clone().applyMatrix4(target.matrixWorld).center();
			scope.sceneRoot.position.copy(centroid);
		}
		
		//for(var i = 0; i < targets.length; i++){
		//	var target = targets[i];
		//}
		
		
	}
	
	this.update = function(){
		var node = this.sceneRoot;
		var wp = node.getWorldPosition().applyMatrix4(this.camera.matrixWorldInverse);
		var pp = new THREE.Vector4(wp.x, wp.y, wp.z).applyMatrix4(camera.projectionMatrix);
		var w = Math.abs((wp.z  / 20)); // * (2 - pp.z / pp.w);
		node.scale.set(w, w, w);
		
		if(this.targets && this.targets.length === 1){
			this.scaleNode.rotation.copy(this.targets[0].rotation);
		}
		
		this.sceneRotation.scale.set(w,w,w);
	};
	
	this.render = function(){
		this.update();
		this.sceneRotation.position.copy(this.sceneRoot.position);
		this.sceneRotation.visible = this.rotationNode.visible && this.sceneRoot.visible;
		
		renderer.render(this.sceneRotation, this.camera);
		renderer.render(this.sceneTransformation, this.camera);
	};
	
	this.translate = function(){
		this.translationNode.visible = true;
		this.scaleNode.visible = false;
		this.rotationNode.visible = false;
	};
	
	this.scale = function(){
		this.translationNode.visible = false;
		this.scaleNode.visible = true;
		this.rotationNode.visible = false;
	};
	
	this.rotate = function(){
		this.translationNode.visible = false;
		this.scaleNode.visible = false;
		this.rotationNode.visible = true;
	};
	
	this.buildTranslationNode();
	this.buildScaleNode();
	this.buildRotationNode();
	
	//this.translate();
	this.rotate();
	
	this.setTargets([]);
	
	//this.domElement.addEventListener( 'click', onClick, false);
	this.domElement.addEventListener( 'mousemove', onMouseMove, true );
	this.domElement.addEventListener( 'mousedown', onMouseDown, true );
	this.domElement.addEventListener( 'mouseup', onMouseUp, true );
};

Potree.Volume = function(args){

	THREE.Object3D.call( this );

	args = args || {};
	this._clip = args.clip || false;
	this._modifiable = args.modifiable || true;
	
	var boxGeometry = new THREE.BoxGeometry(1, 1, 1);
	boxGeometry.computeBoundingBox();
	
	var boxFrameGeometry = new THREE.Geometry();
	// bottom
	boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, 0.5));
	boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, 0.5));
	boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, 0.5));
	boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, -0.5));
	boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, -0.5));
	boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, -0.5));
	boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, -0.5));
	boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, 0.5));
	// top
	boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, 0.5));
	boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, 0.5));
	boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, 0.5));
	boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, -0.5));
	boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, -0.5));
	boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, -0.5));
	boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, -0.5));
	boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, 0.5));
	// sides
	boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, 0.5));
	boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, 0.5));
	boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, 0.5));
	boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, 0.5));
	boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, -0.5));
	boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, -0.5));
	boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, -0.5));
	boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, -0.5));

	this.dimension = new THREE.Vector3(1,1,1);
	var material = new THREE.MeshBasicMaterial( {color: 0x00ff00, transparent: true, opacity: 0.3} );
	this.box = new THREE.Mesh( boxGeometry, material);
	this.box.geometry.computeBoundingBox();
	this.boundingBox = this.box.geometry.boundingBox;
	this.add(this.box);
	
	this.frame = new THREE.Line( boxFrameGeometry, new THREE.LineBasicMaterial({color: 0x000000}));
	this.frame.mode = THREE.LinePieces;
	this.add(this.frame);
	
	this.label = new Potree.TextSprite("0");
	this.label.setBorderColor({r:0, g:255, b:0, a:0.0});
	this.label.setBackgroundColor({r:0, g:255, b:0, a:0.0});
	this.label.material.depthTest = false;
	this.label.position.y -= 0.5;
	this.add(this.label);
	
	var v = this;
	this.label.updateMatrixWorld = function(){
		var volumeWorldPos = new THREE.Vector3();
		volumeWorldPos.setFromMatrixPosition( v.matrixWorld );
		v.label.position.copy(volumeWorldPos);
		v.label.updateMatrix();
		v.label.matrixWorld.copy(v.label.matrix);
		v.label.matrixWorldNeedsUpdate = false;
		
		for ( var i = 0, l = v.label.children.length; i < l; i ++ ) {
			v.label.children[ i ].updateMatrixWorld( true );
		}
	};
	
	this.setDimension = function(x,y,z){
		this.dimension.set(x,y,z);
		this.box.scale.set(x,y,z);
		this.frame.scale.set(x,y,z);
	};

	this.volume = function(){
		return Math.abs(this.scale.x * this.scale.y * this.scale.z);
		//return Math.abs(this.dimension.x * this.dimension.y * this.dimension.z);
	};
	
	this.update = function(){
		this.boundingBox = this.box.geometry.boundingBox;
		
		if(this._clip){
			this.box.visible = false;
			this.label.visible = false;
		}else{
			this.box.visible = true;
			this.label.visible = true;
		}
	};
	
	this.raycast = function(raycaster, intersects){
		
		var is = [];
		this.box.raycast(raycaster, is);
	
		if(is.length > 0){
			var I = is[0];
			intersects.push({
				distance: I.distance,
				object: this,
				point: I.point.clone()
			});
		}
	};
	
	this.update();
	
};

Potree.Volume.prototype = Object.create( THREE.Object3D.prototype );

Object.defineProperty(Potree.Volume.prototype, "clip", {
	get: function(){
		return this._clip;
	},
	
	set: function(value){
		this._clip = value;
		
		this.update();
	}
});

Object.defineProperty(Potree.Volume.prototype, "modifiable", {
	get: function(){
		return this._modifiable;
	},
	
	set: function(value){
		this._modifiable = value;
		
		this.update();
	}
});


Potree.VolumeTool = function(scene, camera, renderer){
	
	var scope = this;
	this.enabled = false;
	
	this.scene = scene;
	this.sceneVolume = new THREE.Scene();
	this.camera = camera;
	this.renderer = renderer;
	this.domElement = renderer.domElement;
	this.mouse = {x: 0, y: 0};
	
	this.volumes = [];
	
	var STATE = {
		DEFAULT: 0,
		INSERT_VOLUME: 1
		
	};
	
	var state = STATE.DEFAULT;	
	
	
	function onMouseMove(event){
		var rect = scope.domElement.getBoundingClientRect();
		scope.mouse.x = ((event.clientX - rect.left) / scope.domElement.clientWidth) * 2 - 1;
        scope.mouse.y = -((event.clientY - rect.top) / scope.domElement.clientHeight) * 2 + 1;
	};
	
	function onMouseClick(event){
		
		//if(state === STATE.INSERT_VOLUME){
		//	scope.finishInsertion();
		//}else if(event.which === 1){
		//	var I = getHoveredElement();
		//	
		//	if(I){
		//		transformationTool.setTargets([I.object]);
		//	}
		//}
	};
	
	function onMouseDown(event){
	
		if(state !== STATE.DEFAULT){
			event.stopImmediatePropagation();
		}
	
		if(state === STATE.INSERT_VOLUME){
			scope.finishInsertion();
		}else if(event.which === 1){
			var I = getHoveredElement();
			
			if(I && I.object.modifiable){
				transformationTool.setTargets([I.object]);
			}
		}
	
	
		if(event.which === 3){
			// open context menu
			
			//var element = getHoveredElement();
			//
			//if(element){
			//	var menu = document.createElement("div");
			//	menu.style.position = "fixed";
			//	menu.style.backgroundColor = "#bbbbbb";
			//	menu.style.top = event.clientY + "px";
			//	menu.style.left = event.clientX + "px";
			//	menu.style.width = "200px";
			//	menu.style.height = "100px";
			//	menu.innerHTML = "abc";
			//	menu.addEventListener("contextmenu", function(event){
			//		event.preventDefault();
			//		return false;
			//	}, false);
			//	
			//	scope.renderer.domElement.parentElement.appendChild(menu);
			//}
		}
	};
	
	function onContextMenu(event){
		event.preventDefault();
		return false;
	}
	
	function getHoveredElement(){
			
		var vector = new THREE.Vector3( scope.mouse.x, scope.mouse.y, 0.5 );
		vector.unproject(scope.camera);
		
		var raycaster = new THREE.Raycaster();
		raycaster.ray.set( scope.camera.position, vector.sub( scope.camera.position ).normalize() );
		
		var objects = [];
		for(var i = 0; i < scope.volumes.length; i++){
			var object = scope.volumes[i];
			objects.push(object);
		}
		
		var intersections = raycaster.intersectObjects(objects, false);
		if(intersections.length > 0){
			return intersections[0];
		}else{
			return false;
		}
	};
	
	function getMousePointCloudIntersection(){
		var vector = new THREE.Vector3( scope.mouse.x, scope.mouse.y, 0.5 );
		vector.unproject(scope.camera);

		var direction = vector.sub(scope.camera.position).normalize();
		var ray = new THREE.Ray(scope.camera.position, direction);
		
		var pointClouds = [];
		scope.scene.traverse(function(object){
			if(object instanceof Potree.PointCloudOctree || object instanceof Potree.PointCloudArena4D){
				pointClouds.push(object);
			}
		});
		
		var closestPoint = null;
		var closestPointDistance = null;
		
		for(var i = 0; i < pointClouds.length; i++){
			var pointcloud = pointClouds[i];
			var point = pointcloud.pick(scope.renderer, scope.camera, ray);
			
			if(!point){
				continue;
			}
			
			var distance = scope.camera.position.distanceTo(point.position);
			
			if(!closestPoint || distance < closestPointDistance){
				closestPoint = point;
				closestPointDistance = distance;
			}
		}
		
		return closestPoint ? closestPoint.position : null;
	}
	
	this.update = function(delta){
	
		if(state === STATE.INSERT_VOLUME){
			var I = getMousePointCloudIntersection();
			
			if(I){
				this.activeVolume.position.copy(I);
				
				var wp = this.activeVolume.getWorldPosition().applyMatrix4(this.camera.matrixWorldInverse);
				var pp = new THREE.Vector4(wp.x, wp.y, wp.z).applyMatrix4(this.camera.projectionMatrix);
				var w = Math.abs((wp.z  / 10)); 
				//this.activeVolume.setDimension(w, w, w);
				this.activeVolume.scale.set(w,w,w);
			}
		}
		
		var volumes = [];
		for(var i = 0; i < this.volumes.length; i++){
			volumes.push(this.volumes[i]);
		}
		if(this.activeVolume){
			volumes.push(this.activeVolume);
		}
		
		for(var i = 0; i < volumes.length; i++){
			var volume = volumes[i];
			var box = volume.box;
			var label = volume.label;
			
			var capacity = volume.volume();
			var msg = Potree.utils.addCommas(capacity.toFixed(1)) + "³";
			label.setText(msg);
			
			var distance = scope.camera.position.distanceTo(label.getWorldPosition());
			var pr = projectedRadius(1, scope.camera.fov * Math.PI / 180, distance, renderer.domElement.clientHeight);
			var scale = (70 / pr);
			label.scale.set(scale, scale, scale);
		}
		
	};
	
	this.startInsertion = function(args){
		state = STATE.INSERT_VOLUME;
		
		var args = args || {};
		var clip = args.clip || false;
		
		this.activeVolume = new Potree.Volume();
		this.activeVolume.clip = clip;
		this.sceneVolume.add(this.activeVolume);
		this.volumes.push(this.activeVolume);
	}
	
	this.finishInsertion = function(){
		transformationTool.setTargets([this.activeVolume]);
		
		var event = {
			type: "insertion_finished",
			volume: this.activeVolume
		};
		this.dispatchEvent(event);
		
		this.activeVolume = null;
		state = STATE.DEFAULT;
	}
	
	this.addVolume = function(volume){
		this.sceneVolume.add(volume);
		this.volumes.push(volume);
	};
	
	this.removeVolume = function(volume){
		this.sceneVolume.remove(volume);
		var index = this.volumes.indexOf(volume);
		if(index >= 0){
			this.volumes.splice(index, 1);
		}
	};
	
	this.reset = function(){
		for(var i = this.volumes.length - 1; i >= 0; i--){
			var volume = this.volumes[i];
			this.removeVolume(volume);
		}
	}
	
	
	this.render = function(){
	
		renderer.render(this.sceneVolume, this.camera);
		
	};
	
	this.domElement.addEventListener( 'click', onMouseClick, false );
	this.domElement.addEventListener( 'mousedown', onMouseDown, false );
	this.domElement.addEventListener( 'mousemove', onMouseMove, false );
	this.domElement.addEventListener( 'contextmenu', onContextMenu, false );
};

Potree.VolumeTool.prototype = Object.create( THREE.EventDispatcher.prototype );

Potree.PointCloudArena4DProxyNode = function(geometryNode){
	THREE.Object3D.call( this );
	
	this.geometryNode = geometryNode;
	this.pcoGeometry = geometryNode;
	this.boundingBox = geometryNode.boundingBox;
	this.boundingSphere = geometryNode.boundingSphere;
	this.number = geometryNode.name;
	this.numPoints = geometryNode.numPoints;
	this.level = geometryNode.level;
}

Potree.PointCloudArena4DProxyNode.prototype = Object.create(THREE.Object3D.prototype);



Potree.PointCloudArena4D = function(geometry){
	THREE.Object3D.call( this );
	
	this.root = null;
	
	this.visiblePointsTarget = 2*1000*1000;
	this.minimumNodePixelSize = 150;
	
	this.position.sub(geometry.offset);
	this.updateMatrix();
	
	this.numVisibleNodes = 0;
	this.numVisiblePoints = 0;
	
	this.boundingBoxNodes = [];
	this.loadQueue = [];
	this.visibleNodes = [];
	
	this.pcoGeometry = geometry;
	this.boundingBox = this.pcoGeometry.boundingBox;
	this.boundingSphere = this.pcoGeometry.boundingSphere;
	this.material = new Potree.PointCloudMaterial({vertexColors: THREE.VertexColors, size: 0.05, treeType: Potree.TreeType.KDTREE});
	this.material.sizeType = Potree.PointSizeType.ATTENUATED;
	this.material.size = 0.05;
	
	this.pickTarget;
	this.pickMaterial;
	
	this.updateMatrixWorld();
};

Potree.PointCloudArena4D.prototype = Object.create(THREE.Object3D.prototype);

Potree.PointCloudArena4D.prototype.updateMaterial = function(camera, renderer){
	this.material.fov = camera.fov * (Math.PI / 180);
	this.material.screenWidth = renderer.domElement.clientWidth;
	this.material.screenHeight = renderer.domElement.clientHeight;
	this.material.spacing = this.pcoGeometry.spacing;
	this.material.near = camera.near;
	this.material.far = camera.far;
	this.material.minSize = 3;
	
	var bbSize = this.boundingBox.size();
	this.material.bbSize = [bbSize.x, bbSize.y, bbSize.z];
};

Potree.PointCloudArena4D.prototype.hideDescendants = function(object){
	var stack = [];
	for(var i = 0; i < object.children.length; i++){
		var child = object.children[i];
		if(child.visible){
			stack.push(child);
		}
	}
	
	while(stack.length > 0){
		var object = stack.shift();
		
		object.visible = false;
		if(object.boundingBoxNode){
			object.boundingBoxNode.visible = false;
		}
		
		for(var i = 0; i < object.children.length; i++){
			var child = object.children[i];
			if(child.visible){
				stack.push(child);
			}
		}
	}
}

Potree.PointCloudArena4D.prototype.updateMatrixWorld = function( force ){
	//node.matrixWorld.multiplyMatrices( node.parent.matrixWorld, node.matrix );
	
	if ( this.matrixAutoUpdate === true ) this.updateMatrix();

	if ( this.matrixWorldNeedsUpdate === true || force === true ) {

		if ( this.parent === undefined ) {

			this.matrixWorld.copy( this.matrix );

		} else {

			this.matrixWorld.multiplyMatrices( this.parent.matrixWorld, this.matrix );

		}

		this.matrixWorldNeedsUpdate = false;

		force = true;

	}
};

var dbgFullyInside = 0;

Potree.PointCloudArena4D.prototype.update = function(camera, renderer){
	var geometry = this.pcoGeometry;

	if(!geometry.root){
		return;
	}else if(!this.rootProxyGenerated){
		var rootProxy = new Potree.PointCloudArena4DProxyNode(this.pcoGeometry.root);
		this.add(rootProxy);
		this.rootProxyGenerated = true;
	}
	
	this.updateMatrixWorld(true);
	
	this.loadQueue = [];
	this.visibleNodes = [];
	this.numVisibleNodes = 0;
	this.numVisiblePoints = 0;
	dbgFullyInside = 0;
	
	if(!this.showBoundingBox){
		for(var i = 0; i < this.boundingBoxNodes.length; i++){
			var bbNode = this.boundingBoxNodes[i];
			this.remove(bbNode);
			bbNode.geometry.dispose();
		}
	}
	
	this.updateMaterial(camera, renderer);
	
	this.hideDescendants(this.children[0]);
	
	// create frustum in object space
	camera.updateMatrixWorld();
	var frustum = new THREE.Frustum();
	var viewI = camera.matrixWorldInverse;
	var world = this.matrixWorld;
	var proj = camera.projectionMatrix;
	var fm = new THREE.Matrix4().multiply(proj).multiply(viewI).multiply(world);
	frustum.setFromMatrix( fm );
	
	// calculate camera position in object space
	var view = camera.matrixWorld;
	var worldI = new THREE.Matrix4().getInverse(world);
	var camMatrixObject = new THREE.Matrix4().multiply(worldI).multiply(view);
	var camObjPos = new THREE.Vector3().setFromMatrixPosition( camMatrixObject );
	
	var stack = [];
	stack.push({node: this.children[0], weight: 1});
	while(stack.length > 0){
		var element = stack.shift();
		var node = element.node;
		var weight = element.weight;

		//if(node.level > 3){
		//	continue;
		//}
		
		node.matrixWorld.multiplyMatrices( this.matrixWorld, node.matrix );
		
		var box = node.boundingBox.clone();
		//box.min.sub(this.boundingBox.min);
		//box.max.sub(this.boundingBox.min);
		var insideFrustum = frustum.intersectsBox(box);
		
		var visible = insideFrustum;	
		node.visible = visible;
		
		
		
		if(!visible){
			continue;
		}
		
		var pointsInside = 0;
		//pointsInside += frustum.containsPoint(new THREE.Vector3(box.min.x, box.min.y, box.min.z)) ? 1 : 0;
		//pointsInside += frustum.containsPoint(new THREE.Vector3(box.min.x, box.min.y, box.max.z)) ? 1 : 0;
		//pointsInside += frustum.containsPoint(new THREE.Vector3(box.min.x, box.max.y, box.min.z)) ? 1 : 0;
		//pointsInside += frustum.containsPoint(new THREE.Vector3(box.min.x, box.max.y, box.max.z)) ? 1 : 0;
		//pointsInside += frustum.containsPoint(new THREE.Vector3(box.max.x, box.min.y, box.min.z)) ? 1 : 0;
		//pointsInside += frustum.containsPoint(new THREE.Vector3(box.max.x, box.min.y, box.max.z)) ? 1 : 0;
		//pointsInside += frustum.containsPoint(new THREE.Vector3(box.max.x, box.max.y, box.min.z)) ? 1 : 0;
		//pointsInside += frustum.containsPoint(new THREE.Vector3(box.max.x, box.max.y, box.max.z)) ? 1 : 0;
		
		if(pointsInside === 8){
			dbgFullyInside++;
		}
		
	
		if (node instanceof Potree.PointCloudArena4DProxyNode) {
			var geometryNode = node.geometryNode;
			if(geometryNode.loaded === true){
				this.replaceProxy(node);
			}else{
				this.loadQueue.push(element);
			}
		}else if(node instanceof THREE.PointCloud){
			if(this.numVisiblePoints + node.pcoGeometry.numPoints > pointcloud.visiblePointsTarget){
				break;
			}
			this.numVisibleNodes++;
			this.numVisiblePoints += node.pcoGeometry.numPoints;
			this.visibleNodes.push({node: node, weight: weight});

			if(this.showBoundingBox && !node.boundingBoxNode){
				var boxHelper = new THREE.BoxHelper(node);
				this.add(boxHelper);
				this.boundingBoxNodes.push(boxHelper);
				node.boundingBoxNode = boxHelper;
				node.boundingBoxNode.matrixWorld.copy(node.matrixWorld);
			}else if(this.showBoundingBox && node.boundingBoxNode){
				node.boundingBoxNode.visible = true;
			}else if(!this.showBoundingBox){
				delete node.boundingBoxNode;
			}
			
			for(var i = 0; i < node.children.length; i++){
				var child = node.children[i];
				//var box = child.geometryNode.boundingBox;
				var sphere = child.boundingSphere;
				var distance = sphere.center.distanceTo(camObjPos);
				
				var radius = box.size().length() / 2;
				var fov = camera.fov / 2 * Math.PI / 180.0;
				var pr = 1 / Math.tan(fov) * radius / Math.sqrt(distance * distance - radius * radius);
				
				if(distance < radius){
					pr = Number.MAX_VALUE;
				}
				
				var screenPixelRadius = renderer.domElement.clientHeight * pr;
				if(screenPixelRadius < this.minimumNodePixelSize){
					continue;
				}
				
				var weight = pr;
				
				if(stack.length === 0){
					stack.push({node: child, weight: weight});
				}else{
					var ipos = 0;
				
					for(var j = 0; j < stack.length; j++){
						if(weight > stack[j].weight){
							var ipos = j;
							break;
						}else if(j == stack.length -1){
							ipos = stack.length;
							break;
						}
						
						
					}
					
					stack.splice(ipos, 0, {node: child, weight: weight});
				}
				
				//stack.push({node: child, weight: 1});
			}
		}
	}
	
	
	
	this.updateLoadQueue();
	
	this.maxLevel = 0;
	for(var i = 0; i < this.visibleNodes.length; i++){
		this.maxLevel = Math.max(this.visibleNodes[i].node.pcoGeometry.level, this.maxLevel);
	}
	
	var vn = [];
	for(var i = 0; i < this.visibleNodes.length; i++){
		vn.push(this.visibleNodes[i].node);
	}
	this.updateVisibilityTexture(this.material, vn);
	
	//{ // only show nodes on ray
	//	var vector = new THREE.Vector3( mouse.x, mouse.y, 0.5 );
	//	vector.unproject(camera);
    //
	//	var direction = vector.sub(camera.position).normalize();
	//	var ray = new THREE.Ray(camera.position, direction);
	//		
	//		
	//	var nodesOnRay = pointcloud.nodesOnRay(pointcloud.visibleNodes, ray);	
	//	
	//	for(var i = 0; i < this.visibleNodes.length; i++){
	//		var node = this.visibleNodes[i].node;
	//		
	//		node.visible = false;
	//		if(node.boundingBoxNode){
	//			node.boundingBoxNode.visible = false;
	//		}
	//	}
	//	
	//	for(var i = 0; i < nodesOnRay.length; i++){
	//		var node = nodesOnRay[i];
	//	
	//		node.visible = true;
	//		this.numVisiblePoints += node.pcoGeometry.numPoints;
	//		if(node.boundingBoxNode){
	//			node.boundingBoxNode.visible = true;
	//		}
	//	}
	//	this.numVisibleNodes = nodesOnRay.length;
	//	
	//	var pickPos = this.pick(renderer, camera, ray, {});
	//	if(pickPos){
	//		var sg = new THREE.SphereGeometry(0.2);
	//		var sm = new THREE.Mesh(sg);
	//		sm.position.copy(pickPos.position);
	//		scene.add(sm);
	//	}
	//}
	
};

Potree.PointCloudArena4D.prototype.replaceProxy = function(proxy){
	
	var geometryNode = proxy.geometryNode;
	if(geometryNode.loaded === true){
		var geometry = geometryNode.geometry;
		var node = new THREE.PointCloud(geometry, this.material);
		node.number = proxy.number;
		node.numPoints = proxy.numPoints;
		node.boundingBox = geometryNode.boundingBox;
		node.boundingSphere = geometryNode.boundingSphere;
		node.pcoGeometry = geometryNode;
		var parent = proxy.parent;
		parent.remove(proxy);
		parent.add(node);
		//node.position.copy(node.boundingBox.min);
		//node.position.sub(this.pcoGeometry.boundingBox.min);
		//var current = parent;
		//while(!(current instanceof Potree.PointCloudArena4D)){
		//	node.position.sub(current.boundingBox.min);
		//	
		//	current = current.parent;
		//}
		
		node.updateMatrix();
		
		//console.log(geometryNode.number + ": " + node.position.x + ", " + node.position.y + ", " + node.position.z);
		
		node.matrixWorld.multiplyMatrices( this.matrixWorld, node.matrix );
		
		if(geometryNode.left){
			var child = geometryNode.left;
			var childProxy = new Potree.PointCloudArena4DProxyNode(child);
			node.add(childProxy);
		}
		if(geometryNode.right){
			var child = geometryNode.right;
			var childProxy = new Potree.PointCloudArena4DProxyNode(child);
			node.add(childProxy);
		}
		
		return node;
	}
}

Potree.PointCloudArena4D.prototype.updateLoadQueue = function(vn){
	if(this.loadQueue.length > 0){
		if(this.loadQueue.length >= 2){
			this.loadQueue.sort(function(a,b){return b.weight - a.weight});
		}
		
		for(var i = 0; i < Math.min(5, this.loadQueue.length); i++){
			this.loadQueue[i].node.geometryNode.load();
		}
	}
}

Potree.PointCloudArena4D.prototype.getVisibleGeometry = function(camera){
	var visibleGeometry = [];
	
	// create frustum in object space
	camera.updateMatrixWorld();
	var frustum = new THREE.Frustum();
	var viewI = camera.matrixWorldInverse;
	var world = this.matrixWorld;
	var proj = camera.projectionMatrix;
	var fm = new THREE.Matrix4().multiply(proj).multiply(viewI).multiply(world);
	frustum.setFromMatrix( fm );
	
	var stack = [];
	var pointCount = 0;
	
	stack.push(this.pcoGeometry.root);
	while(stack.length > 0){
		if(visibleGeometry.length > 12){
			break;
		}
	
		var node = stack.shift();
		
		var box = node.boundingBox.clone();
		box.max.sub(box.min);
		box.min.sub(box.min);
		var insideFrustum = frustum.intersectsBox(box);
		
		var visible = insideFrustum;
		
		if(!visible){
			continue;
		}
		
		if(pointCount + node.numPoints > this.visiblePointsTarget){
			break;
		}
		
		pointCount += node.numPoints;
		
		visibleGeometry.push(node);
		
		if(node.loaded){
			if(node.left){
				stack.push(node.left);
			}
			
			if(node.right){
				stack.push(node.right);
			}
		}
	}
	
	return visibleGeometry;
	
};

Potree.PointCloudArena4D.prototype.nodesOnRay = function(nodes, ray){
	var nodesOnRay = [];

	var _ray = ray.clone();
	for(var i = 0; i < nodes.length; i++){
		var node = nodes[i].node;
		//var inverseWorld = new THREE.Matrix4().getInverse(node.matrixWorld);
		var sphere = node.boundingSphere.clone().applyMatrix4(node.matrixWorld);
		var box = node.boundingBox.clone().applyMatrix4(node.matrixWorld);
		
		
		if(_ray.isIntersectionBox(box)){
		//if(_ray.isIntersectionSphere(sphere)){
			nodesOnRay.push(node);
		}
	}
	
	return nodesOnRay;
};

Potree.PointCloudArena4D.prototype.pick = function(renderer, camera, ray, params){

	var params = params || {};
	var pickWindowSize = params.pickWindowSize || 17;
	
	var nodes = this.nodesOnRay(this.visibleNodes, ray);
	
	if(nodes.length === 0){
		return null;
	}
	
	var width = Math.ceil(renderer.domElement.clientWidth);
	var height = Math.ceil(renderer.domElement.clientHeight);
	
	var pixelPos = new THREE.Vector3().addVectors(camera.position, ray.direction).project(camera);
	pixelPos.addScalar(1).multiplyScalar(0.5);
	pixelPos.x *= width;
	pixelPos.y *= height
	
	if(!this.pickTarget){
		this.pickTarget = new THREE.WebGLRenderTarget( 
			1, 1, 
			{ minFilter: THREE.LinearFilter, 
			magFilter: THREE.NearestFilter, 
			format: THREE.RGBAFormat } 
		);
	}else if(this.pickTarget.width != width || this.pickTarget.height != height){
		this.pickTarget.dispose();
		this.pickTarget = new THREE.WebGLRenderTarget( 
			1, 1, 
			{ minFilter: THREE.LinearFilter, 
			magFilter: THREE.NearestFilter, 
			format: THREE.RGBAFormat } 
		);
	}
	this.pickTarget.setSize(width, height);
	
	// setup pick material.
	// use the same point size functions as the main material to get the same point sizes.
	if(!this.pickMaterial){
		this.pickMaterial = new Potree.PointCloudMaterial({treeType: Potree.TreeType.KDTREE});
		this.pickMaterial.pointColorType = Potree.PointColorType.POINT_INDEX;
		this.pickMaterial.pointSizeType = Potree.PointSizeType.FIXED;
	}
	
	this.pickMaterial.pointSizeType = this.material.pointSizeType;
	this.pickMaterial.size 			= this.material.size;
	this.pickMaterial.fov 			= this.material.fov;
	this.pickMaterial.screenWidth 	= this.material.screenWidth;
	this.pickMaterial.screenHeight 	= this.material.screenHeight;
	this.pickMaterial.spacing 		= this.material.spacing;
	this.pickMaterial.near 			= this.material.near;
	this.pickMaterial.far 			= this.material.far;
	this.pickMaterial.interpolate 	= this.material.interpolate;
	this.pickMaterial.minSize 		= this.material.minSize;
	this.pickMaterial.maxSize 		= this.material.maxSize;
	this.pickMaterial.bbSize 		= this.material.bbSize;
	
	if(this.pickMaterial.pointSizeType === Potree.PointSizeType.ADAPTIVE){
		this.updateVisibilityTexture(this.pickMaterial, nodes);
	}

	var _gl = renderer.context;
	
	_gl.enable(_gl.SCISSOR_TEST);
	_gl.scissor(pixelPos.x - (pickWindowSize - 1) / 2, pixelPos.y - (pickWindowSize - 1) / 2,pickWindowSize,pickWindowSize);
	_gl.disable(_gl.SCISSOR_TEST);
	
	var material = this.pickMaterial;
	
	renderer.setRenderTarget( this.pickTarget );
	
	renderer.state.setDepthTest( material.depthTest );
	renderer.state.setDepthWrite( material.depthWrite )
	renderer.state.setBlending( THREE.NoBlending );
	
	renderer.clear( renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil );
	
	//TODO: UGLY HACK CHAMPIONSHIP SUBMISSION!! drawing first node does not work properly so we draw it twice.
	if(nodes.length > 0){
		nodes.push(nodes[0]);
	}
	
	for(var i = 0; i < nodes.length; i++){
		var object = nodes[i];
		var geometry = object.geometry;
		
		if(!geometry.attributes.indices.buffer){
			continue;
		}
		
		material.pcIndex = i;
		
		if(material.program){
			var program = material.program.program;
			_gl.useProgram( program );
			//_gl.disable( _gl.BLEND );
			
			var attributePointer = _gl.getAttribLocation(program, "indices");
			var attributeSize = 4;
			_gl.bindBuffer( _gl.ARRAY_BUFFER, geometry.attributes.indices.buffer );
			//if(!bufferSubmitted){
			//	_gl.bufferData( _gl.ARRAY_BUFFER, new Uint8Array(geometry.attributes.indices.array), _gl.STATIC_DRAW );
			//	bufferSubmitted = true;
			//}
			_gl.enableVertexAttribArray( attributePointer );
			_gl.vertexAttribPointer( attributePointer, attributeSize, _gl.UNSIGNED_BYTE, true, 0, 0 ); 
		
			_gl.uniform1f(material.program.uniforms.pcIndex, material.pcIndex);
		}	
		
		renderer.renderBufferDirect(camera, [], null, material, geometry, object);
	}
	
	
	
	var pickWindowSize = 17;
	var pixelCount = pickWindowSize * pickWindowSize;
	var buffer = new ArrayBuffer(pixelCount*4);
	var pixels = new Uint8Array(buffer);
	var ibuffer = new Uint32Array(buffer);
	renderer.context.readPixels(
		pixelPos.x - (pickWindowSize-1) / 2, pixelPos.y - (pickWindowSize-1) / 2, 
		pickWindowSize, pickWindowSize, 
		renderer.context.RGBA, renderer.context.UNSIGNED_BYTE, pixels);
		
		
	//{ // show big render target for debugging purposes
	//	var br = new ArrayBuffer(width*height*4);
	//	var bp = new Uint8Array(br);
	//	renderer.context.readPixels( 0, 0, width, height, 
	//		renderer.context.RGBA, renderer.context.UNSIGNED_BYTE, bp);
	//
	//	var img = pixelsArrayToImage(bp, width, height);
	//	img.style.boder = "2px solid red";
	//	img.style.position = "absolute";
	//	img.style.top  = "0px";
	//	img.style.width = width + "px";
	//	img.style.height = height + "px";
	//	img.onclick = function(){document.body.removeChild(img)};
	//	document.body.appendChild(img);
	//}
		
	// find closest hit inside pixelWindow boundaries
	var min = Number.MAX_VALUE;
	var hit = null;
	//console.log("finding closest hit");
	for(var u = 0; u < pickWindowSize; u++){
		for(var v = 0; v < pickWindowSize; v++){
			var offset = (u + v*pickWindowSize);
			var distance = Math.pow(u - (pickWindowSize-1) / 2, 2) + Math.pow(v - (pickWindowSize-1) / 2, 2);
			
			var pcIndex = pixels[4*offset + 3];
			pixels[4*offset + 3] = 0;
			var pIndex = ibuffer[offset];
			
			if((pIndex !== 0 || pcIndex !== 0) && distance < min){
				
				hit = {
					pIndex: pIndex,
					pcIndex: pcIndex
				};
				min = distance;
			}
		}
	}	
	
	if(hit){
		var point = {};
		
		var pc = nodes[hit.pcIndex];
		var attributes = pc.geometry.attributes;
		
		for (var property in attributes) {
			if (attributes.hasOwnProperty(property)) {
				var values = geometry.attributes[property];
			
				if(property === "position"){
					var positionArray = pc.geometry.attributes.position.array;
					var x = positionArray[3*hit.pIndex+0];
					var y = positionArray[3*hit.pIndex+1];
					var z = positionArray[3*hit.pIndex+2];
					var position = new THREE.Vector3(x, y, z);
					position.applyMatrix4(this.matrixWorld);
				
					point[property] = position;
				}else if(property === "indices"){
				
				}else{
					if(values.itemSize === 1){
						point[property] = values.array[i + j];
					}else{
						var value = [];
						for(var j = 0; j < values.itemSize; j++){
							value.push(values.array[i*values.itemSize + j]);
						}
						point[property] = value;
					}
				}
			}
		}
		
		
		return point;
	}else{
		return null;
	}
};


Potree.PointCloudArena4D.prototype.updateVisibilityTexture = function(material, visibleNodes){

	if(!material){
		return;
	}
	
	var texture = material.visibleNodesTexture;
    var data = texture.image.data;
	
	// copy array
	visibleNodes = visibleNodes.slice();
	
	// sort by level and number
	var sort = function(a, b){
		var la = a.pcoGeometry.level;
		var lb = b.pcoGeometry.level;
		var na = a.pcoGeometry.number;
		var nb = b.pcoGeometry.number;
		if(la != lb) return la - lb;
		if(na < nb) return -1;
		if(na > nb) return 1;
		return 0;
	};
	visibleNodes.sort(sort);
	
	var visibleNodeNames = [];
	for(var i = 0; i < visibleNodes.length; i++){
		//visibleNodeNames[visibleNodes[i].pcoGeometry.number] = true;
		visibleNodeNames.push(visibleNodes[i].pcoGeometry.number);
	}
	
	for(var i = 0; i < visibleNodes.length; i++){
		var node = visibleNodes[i];
		
		var b1 = 0;	// children
		var b2 = 0;	// offset to first child
		var b3 = 0;	// split 
		
		if(node.pcoGeometry.left && visibleNodeNames.indexOf(node.pcoGeometry.left.number) > 0){
			b1 += 1;
			b2 = visibleNodeNames.indexOf(node.pcoGeometry.left.number) - i;
		}
		if(node.pcoGeometry.right && visibleNodeNames.indexOf(node.pcoGeometry.right.number) > 0){
			b1 += 2;
			b2 = (b2 === 0) ? visibleNodeNames.indexOf(node.pcoGeometry.right.number) - i : b2;
		}
		
		if(node.pcoGeometry.split === "X"){
			b3 = 1;
		}else if(node.pcoGeometry.split === "Y"){
			b3 = 2;
		}else if(node.pcoGeometry.split === "Z"){
			b3 = 4;
		}
		
		
		data[i*3+0] = b1;
		data[i*3+1] = b2;
		data[i*3+2] = b3;
	}
	
	
	texture.needsUpdate = true;
}



Object.defineProperty(Potree.PointCloudArena4D.prototype, "progress", {
	get: function(){
		if(this.pcoGeometry.root){
			return Potree.PointCloudArena4DGeometryNode.nodesLoading > 0 ? 0 : 1;
		}else{
			return 0;
		}
	}
});

//Potree.PointCloudArena4D.prototype.updateMatrixWorld = function( force ){
//	//node.matrixWorld.multiplyMatrices( node.parent.matrixWorld, node.matrix );
//	
//	if ( this.matrixAutoUpdate === true ) this.updateMatrix();
//
//	if ( this.matrixWorldNeedsUpdate === true || force === true ) {
//
//		if ( this.parent === undefined ) {
//
//			this.matrixWorld.copy( this.matrix );
//
//		} else {
//
//			this.matrixWorld.multiplyMatrices( this.parent.matrixWorld, this.matrix );
//
//		}
//
//		this.matrixWorldNeedsUpdate = false;
//
//		force = true;
//
//	}
//};


Potree.PointCloudArena4DGeometryNode = function(){
	var scope = this;

	this.left = null;
	this.right = null;
	this.boundingBox = null;
	this.number = null;
	this.pcoGeometry = null;
	this.loaded = false;
	this.numPoints = 0;
	this.level = 0;
};

Potree.PointCloudArena4DGeometryNode.nodesLoading = 0;

Potree.PointCloudArena4DGeometryNode.prototype.load = function(){

	if(this.loaded || this.loading){
		return;
	}
	
	if(Potree.PointCloudArena4DGeometryNode.nodesLoading >= 5){
		return;
	}
	
	this.loading = true;
	
	Potree.PointCloudArena4DGeometryNode.nodesLoading++;
	
	var url = this.pcoGeometry.url + "?node=" + this.number;
	var xhr = new XMLHttpRequest();
	xhr.open("GET", url, true);
	xhr.responseType = "arraybuffer";
	
	var scope = this;
	
	xhr.onreadystatechange = function(){
		if(!(xhr.readyState === 4 && xhr.status === 200)){
			return;
		}
		
		var buffer = xhr.response;
		var view = new DataView(buffer);
		var numPoints = buffer.byteLength / 17;
		
		var positions = new Float32Array(numPoints*3);
		var colors = new Float32Array(numPoints*3);
		var indices = new Uint32Array(numPoints);
		
		for(var i = 0; i < numPoints; i++){
			var x = view.getFloat32(i*17 + 0, true) + scope.boundingBox.min.x;
			var y = view.getFloat32(i*17 + 4, true) + scope.boundingBox.min.y;
			var z = view.getFloat32(i*17 + 8, true) + scope.boundingBox.min.z;
			var r = view.getUint8(i*17 + 12, true) / 256;
			var g = view.getUint8(i*17 + 13, true) / 256;
			var b = view.getUint8(i*17 + 14, true) / 256;
			
			positions[i*3+0] = x;
			positions[i*3+1] = y;
			positions[i*3+2] = z;
			
			colors[i*3+0] = r;
			colors[i*3+1] = g;
			colors[i*3+2] = b;
			
			indices[i] = i;
		}
		
		var geometry = new THREE.BufferGeometry();
		geometry.addAttribute("position", new THREE.BufferAttribute(positions, 3));
		geometry.addAttribute("color", new THREE.BufferAttribute(colors, 3));
		geometry.addAttribute("indices", new THREE.BufferAttribute(indices, 1));
		geometry.addAttribute("normal", new THREE.BufferAttribute(new Float32Array(numPoints*3), 3));
		
		scope.geometry = geometry;
		scope.loaded = true;
		Potree.PointCloudArena4DGeometryNode.nodesLoading--;
		
		geometry.boundingBox = scope.boundingBox;
		geometry.boundingSphere = scope.boundingSphere;
		
		scope.numPoints = numPoints;
		
		scope.loading = false;
	};
	
	xhr.send(null);
};


Potree.PointCloudArena4DGeometry = function(){
	var scope = this;

	this.numPoints = 0;
	this.version = 0;
	this.boundingBox = null;
	this.numNodes = 0;
	this.name = null;
	this.provider = null;
	this.url = null;
	this.root = null;
	this.levels = 0;
	this._spacing = null;
	this.pointAttributes = new Potree.PointAttributes([
		"POSITION_CARTESIAN",
		"COLOR_PACKED"
	]);
};

Potree.PointCloudArena4DGeometry.load = function(url, callback){

	var xhr = new XMLHttpRequest();
	xhr.open('GET', url + "?info", true);
	
	xhr.onreadystatechange = function(){
		try{
			if(xhr.readyState === 4 && xhr.status === 200){
				var response = JSON.parse(xhr.responseText);
				
				var geometry = new Potree.PointCloudArena4DGeometry();
				geometry.url = url;
				geometry.name = response.Name;
				geometry.provider = response.Provider;
				geometry.numNodes = response.Nodes;
				geometry.numPoints = response.Points;
				geometry.version = response.Version;
				geometry.boundingBox = new THREE.Box3(
					new THREE.Vector3().fromArray(response.BoundingBox.slice(0,3)),
					new THREE.Vector3().fromArray(response.BoundingBox.slice(3,6))
				);
				if(response.Spacing){
					geometry.spacing = response.Spacing;
				}
				
				var offset = geometry.boundingBox.min.clone().multiplyScalar(-1);
				
				geometry.boundingBox.min.add(offset)
				geometry.boundingBox.max.add(offset);
				geometry.offset = offset;
				
				var center = geometry.boundingBox.center();
				var radius = geometry.boundingBox.size().length() / 2;
				geometry.boundingSphere = new THREE.Sphere(center, radius);
				
				geometry.loadHierarchy();
				
				callback(geometry);
			}else if(xhr.readyState === 4){
				callback(null);
			}
		}catch(e){
			callback(null);
		}
	};
		
	xhr.send(null);

};

Potree.PointCloudArena4DGeometry.prototype.loadHierarchy = function(){
	var url = this.url + "?tree"; 
	var xhr = new XMLHttpRequest();
	xhr.open("GET", url, true);
	xhr.responseType = "arraybuffer";
	
	var scope = this;
	
	xhr.onreadystatechange = function(){
		if(!(xhr.readyState === 4 && xhr.status === 200)){
			return;
		}
	
		var buffer = xhr.response;
		var numNodes = buffer.byteLength /	3;
		var view = new DataView(buffer);
		var stack = [];
		var root = null;
		
		var levels = 0;
		
		var start = new Date().getTime();
		// read hierarchy
		for(var i = 0; i < numNodes; i++){
			var mask = view.getUint8(i*3+0, true);
			var numPoints = view.getUint16(i*3+1, true);
		
			
			var hasLeft = (mask & 1) > 0;
			var hasRight = (mask & 2) > 0;
			var splitX = (mask & 4) > 0;
			var splitY = (mask & 8) > 0;
			var splitZ = (mask & 16) > 0;
			var split = null;
			if(splitX){
				split = "X";
			}else if(splitY){
				split = "Y";
			}if(splitZ){
				split = "Z";
			}
			
			
			var node = new Potree.PointCloudArena4DGeometryNode();
			node.hasLeft = hasLeft;
			node.hasRight = hasRight;
			node.split = split;
			node.isLeaf = !hasLeft && !hasRight;
			node.number = i;
			node.left = null;
			node.right = null;
			node.pcoGeometry = scope;
			node.level = stack.length;
			levels = Math.max(levels, node.level);
			
			if(stack.length > 0){
				var parent = stack[stack.length-1];
				node.boundingBox = parent.boundingBox.clone();
				var parentBBSize = parent.boundingBox.size();
				
				if(parent.hasLeft && !parent.left){
					parent.left = node;
					
					if(parent.split === "X"){
						node.boundingBox.max.x = node.boundingBox.min.x + parentBBSize.x / 2;
					}else if(parent.split === "Y"){
						node.boundingBox.max.y = node.boundingBox.min.y + parentBBSize.y / 2;
					}else if(parent.split === "Z"){
						node.boundingBox.max.z = node.boundingBox.min.z + parentBBSize.z / 2;
					}
					
					var center = node.boundingBox.center();
					var radius = node.boundingBox.size().length() / 2;
					node.boundingSphere = new THREE.Sphere(center, radius);
					
				}else{
					parent.right = node;
					
					if(parent.split === "X"){
						node.boundingBox.min.x = node.boundingBox.min.x + parentBBSize.x / 2;
					}else if(parent.split === "Y"){
						node.boundingBox.min.y = node.boundingBox.min.y + parentBBSize.y / 2;
					}else if(parent.split === "Z"){
						node.boundingBox.min.z = node.boundingBox.min.z + parentBBSize.z / 2;
					}
					
					var center = node.boundingBox.center();
					var radius = node.boundingBox.size().length() / 2;
					node.boundingSphere = new THREE.Sphere(center, radius);
				}
			}else{
				root = node;
				root.boundingBox = scope.boundingBox.clone();
				var center = root.boundingBox.center();
				var radius = root.boundingBox.size().length() / 2;
				root.boundingSphere = new THREE.Sphere(center, radius);
			}
			
			var bbSize = node.boundingBox.size();
			node.spacing = ((bbSize.x + bbSize.y + bbSize.z) / 3) / 75;
			
			stack.push(node);
			
			if(node.isLeaf){
				var done = false;
				while(!done && stack.length > 0){
					stack.pop();
					
					var top = stack[stack.length-1];
					
					done = stack.length > 0 && top.hasRight && top.right == null;
				}
			}
		}
		var end = new Date().getTime();
		var parseDuration = end - start;
		var msg = parseDuration;
		//document.getElementById("lblDebug").innerHTML = msg;
		
		scope.root = root;
		scope.levels = levels;
		//console.log(this.root);
		
	}
	
	xhr.send(null);
	
	
};

Object.defineProperty(Potree.PointCloudArena4DGeometry.prototype, "spacing", {
	get: function(){
		if(this._spacing){
			return this._spacing;
		}else if(this.root){
			return this.root.spacing;
		}else{
			null;
		}
	},
	set: function(value){
		this._spacing = value;
	}
});


