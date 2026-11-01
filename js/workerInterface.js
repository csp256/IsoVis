function reportWorkerError(message) {
 var box = document.getElementById('workerError');
 if (!box) {
  box = document.createElement('div');
  box.id = 'workerError';
  box.setAttribute('role', 'alert');
  box.style.cssText = 'position:fixed;bottom:0;left:0;z-index:10000;background:#500;color:white;padding:8px';
  document.body.appendChild(box);
 }
 box.textContent = 'Calculation failed: ' + message + '. The last successful surface is retained. Edit the function and click Update to retry.';
}

function bindWorkerEvents(worker, octant) {
 worker.onmessage = function(e) {
  if (workers[octant] === worker) handleWorkerMessage(e);
 };
 function failed(e) {
  if (workers[octant] !== worker) return;
  if (e.preventDefault) e.preventDefault();
  worker.terminate();
  workers[octant] = makeWorker(workerSourceString);
  bindWorkerEvents(workers[octant], octant);
  vertexBuffer[octant] = new ArrayBuffer(4);
  faceBuffer[octant] = new ArrayBuffer(4);
  normalBuffer[octant] = new ArrayBuffer(4);
  waitingForWebWorker[octant] = false;
  workersNeedInit = true;
  reportWorkerError(e.message || 'Worker communication error');
  if (!waitingForAnyWebWorker()) document.title = title;
  if (typeof dispatchPendingWork == 'function') dispatchPendingWork();
 }
 worker.onerror = failed;
 worker.onmessageerror = failed;
}

var workersNeedInit = false;

function talkToWorker(msg) {
	if (!waitingForAnyWebWorker()) {
		document.title = titleBusy;
		console.time("All Workers");
		var R = computeFullTransform();
    var outgoing = {num: 0, messageType:msg, R: R, n: n, params: shapeParams, calcNormals: materialParams.calcNormals};
    if (workersNeedInit) outgoing.messageType = 'init';
    if (msg == 'code') {
			// All but the last line... yes the indexing is weird but correct.
      outgoing.code = myCodeMirror.getRange({line: 1, ch: 0}, {line: myCodeMirror.lineCount()-2, ch: Infinity});
    }
		workersNeedInit = false;
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
 if (e.data.error) {
  vertexBuffer[octant] = e.data.buffers[0];
  faceBuffer[octant] = e.data.buffers[1];
  normalBuffer[octant] = e.data.buffers[2];
  waitingForWebWorker[octant] = false;
  reportWorkerError(e.data.error);
  if (!waitingForAnyWebWorker()) document.title = title;
  if (typeof dispatchPendingWork == 'function') dispatchPendingWork();
  return;
 }
	vertexBuffer[octant] = meshes[octant].geometry.attributes.position.array.buffer;
	faceBuffer[octant] = meshes[octant].geometry.index.array.buffer;
	normalBuffer[octant] = meshes[octant].geometry.attributes.normal.array.buffer;

	// meshes[octant].geometry.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array(e.data.buffers[0]), 3 ) );
	// meshes[octant].geometry.setIndex(  new THREE.BufferAttribute( new Float32Array(e.data.buffers[1]),3));
	// meshes[octant].geometry.addAttribute( 'normal', new THREE.BufferAttribute( new Float32Array(e.data.buffers[2]), 3 ) );

	var buffGeom = new THREE.BufferGeometry();
	buffGeom.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array(e.data.buffers[0]), 3 ) );
	buffGeom.setIndex(  new THREE.BufferAttribute( new Float32Array(e.data.buffers[1]),3));
	buffGeom.addAttribute( 'normal', new THREE.BufferAttribute( new Float32Array(e.data.buffers[2]), 3 ) );
	buffGeom.boundingSphere = theBoundingSphere; // This is just to suppress error messages; has no other purpose.
	var m = new THREE.Mesh( buffGeom, myMaterial );
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
		bindWorkerEvents(workers[i], i);
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
