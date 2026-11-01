// Workers always transfer Uint32 indices. Use a 16-bit upload where possible;
// without OES_element_index_uint, expand only large meshes to triangle lists.
function surfaceGeometry(data) {
 var positions = new Float32Array(data.buffers[0], 0, data.vertexCount * 3);
 var normals = new Float32Array(data.buffers[2], 0, data.vertexCount * 3);
 var indices = new Uint32Array(data.buffers[1], 0, data.indexCount);
 var geometry = new THREE.BufferGeometry();
 if (data.vertexCount <= 65535) {
  geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));
 } else if (renderer.extensions && renderer.extensions.get('OES_element_index_uint')) {
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
 } else {
  var expandedPositions = new Float32Array(indices.length * 3);
  var expandedNormals = new Float32Array(indices.length * 3);
  for (var i=0; i<indices.length; i++) {
   for (var j=0; j<3; j++) {
    expandedPositions[i*3+j] = positions[indices[i]*3+j];
    expandedNormals[i*3+j] = normals[indices[i]*3+j];
   }
  }
  positions = expandedPositions;
  normals = expandedNormals;
 }
 geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
 geometry.addAttribute('normal', new THREE.BufferAttribute(normals, 3));
 geometry.setDrawRange(0, data.indexCount);
 return geometry;
}

function talkToWorker(msg) {
	if (!waitingForAnyWebWorker()) {
		document.title = titleBusy;
		console.time("All Workers");
		var R = computeFullTransform();
    var outgoing = {num: 0, messageType:msg, R: R, n: n, params: shapeParams, calcNormals: materialParams.calcNormals};
    if (msg == 'code') {
			// All but the last line... yes the indexing is weird but correct.
      outgoing.code = myCodeMirror.getRange({line: 1, ch: 0}, {line: myCodeMirror.lineCount()-2, ch: Infinity});
    }
		for (var i=0; i<8; i++) {
			waitingForWebWorker[i] = true;
			console.time("Worker " + i + " Total");
      outgoing.num = i;
			outgoing.vertexBuffer = vertexBuffer[i];
			outgoing.faceBuffer = faceBuffer[i];
			outgoing.normalBuffer = normalBuffer[i];
			workers[i].postMessage( outgoing, [vertexBuffer[i], faceBuffer[i], normalBuffer[i]] );
		}
	}
}

function waitingForAnyWebWorker() {
	for (var i=0; i<8; i++) {
		if (waitingForWebWorker[i]==true) {
			return true;
		}
	}
	return false;
}

function handleWorkerMessage(e) {
	var octant = e.data.num;
	vertexBuffer[octant] = meshes[octant].geometry.attributes.position.array.buffer;
	faceBuffer[octant] = meshes[octant].userData.faceBuffer || new ArrayBuffer(4);
	normalBuffer[octant] = meshes[octant].geometry.attributes.normal.array.buffer;

	// meshes[octant].geometry.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array(e.data.buffers[0]), 3 ) );
	// meshes[octant].geometry.setIndex(  new THREE.BufferAttribute( new Float32Array(e.data.buffers[1]),3));
	// meshes[octant].geometry.addAttribute( 'normal', new THREE.BufferAttribute( new Float32Array(e.data.buffers[2]), 3 ) );

	var buffGeom = surfaceGeometry(e.data);
	buffGeom.boundingSphere = theBoundingSphere; // This is just to suppress error messages; has no other purpose.
	var m = new THREE.Mesh( buffGeom, myMaterial );
	// Keep the transfer-format buffer separate from the Uint16 GPU upload.
	m.userData.faceBuffer = e.data.buffers[1];
	meshes[octant] = m;
	waitingForWebWorker[octant] = false;
	if (!waitingForAnyWebWorker()) {
		document.title = title;
		console.timeEnd("All Workers");
	}
	resetScenes();
}

function initWorkers() {
  this.workers = [];
  for (var i=0; i<8; i++) {
    workers.push(new makeWorker("worker.js"));
  }
}

function resetWorker(r) {
	shapeParams.reset = false;
	shapeParams.resolution = r;
	document.title = title;
	for (var i=0; i<8; i++) {
		waitingForWebWorker[i] = false;
		workers[i].terminate();
	}
	for (var i=0; i<8; i++) {
		workers[i] = makeWorker(workerSourceString);
		workers[i].onmessage = handleWorkerMessage;
	}
	talkToWorker('init');

	buildGUI();
}

function resetWorker10() {
	// Not exactly elegant, but I don't know how to pass arguments on callback...
	resetWorker(10);
}

function makeWorker(script) {
    var URL = window.URL || window.webkitURL;
    var Blob = window.Blob;
    var Worker = window.Worker;

    if (!URL || !Blob || !Worker || !script) {
        return null;
    }

    var blob = new Blob([script]);
    var worker = new Worker(URL.createObjectURL(blob));
    return worker;
}

function gatherWorkerResource(frameName) {
	var s = document.getElementById(frameName).text;
	return '//' + frameName + '\n' + s + '\n';
}
