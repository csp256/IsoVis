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
 var generation = workerGeneration;
 worker.onmessage = function(e) {
  if (generation === workerGeneration && workers[octant] === worker) handleWorkerMessage(e);
 };
 function failed(e) {
  if (generation !== workerGeneration || workers[octant] !== worker) return;
  if (e.preventDefault) e.preventDefault();
  worker.terminate();
  workers[octant] = makeWorker(workerSourceString);
  bindWorkerEvents(workers[octant], octant);
  vertexBuffer[octant] = new ArrayBuffer(4);
  faceBuffer[octant] = new ArrayBuffer(4);
  normalBuffer[octant] = new ArrayBuffer(4);
  waitingForWebWorker[octant] = false;
  workersNeedInit = true;
  if (activeWorkerBatch) {
   receiveBatchReply({num:octant,batchId:activeWorkerBatch.id,error:e.message || 'Worker communication error',
    buffers:[vertexBuffer[octant],faceBuffer[octant],normalBuffer[octant]]});
   return;
  }
  reportWorkerError(e.message || 'Worker communication error');
  if (!waitingForAnyWebWorker()) document.title = title;
  if (typeof dispatchPendingWork == 'function') dispatchPendingWork();

 }
 worker.onerror = failed;
 worker.onmessageerror = failed;
}

var workersNeedInit = false;
var workerBatchId = 0;
var activeWorkerBatch = null;
var publishingWorkerBatch = false;

// Returned buffers are staged as CPU data, not GPU geometry, until every octant
// succeeds. A partial failure returns all buffers without changing any mesh.
function receiveBatchReply(data) {
 var batch = activeWorkerBatch;
 if (!batch || data.batchId !== batch.id || batch.replies[data.num]) return;
 batch.replies[data.num] = data;
 batch.remaining--;
 waitingForWebWorker[data.num] = false;
 if (data.error) { batch.failed = true; reportWorkerError(data.error); }
 if (batch.remaining) return;
 activeWorkerBatch = null;
 if (batch.failed) {
  for (var i=0; i<8; i++) {
   vertexBuffer[i] = batch.replies[i].buffers[0];
   faceBuffer[i] = batch.replies[i].buffers[1];
   normalBuffer[i] = batch.replies[i].buffers[2];
  }
 } else {
  publishingWorkerBatch = true;
  try {
   for (var i=0; i<8; i++) publishWorkerResult({data:batch.replies[i]});
  } finally { publishingWorkerBatch = false; }
 }
 document.title = title;
 dispatchPendingWork();
}


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
// Submitted source is separate from unsubmitted editor contents.
var activeFieldSource = null;
var workerGeneration = 0;

// Lower stages subsume later work. Latest editor submission wins, never a draft.
var pendingWorkerStage = null;
var pendingWorkerCode = null;
var workerStages = ['init', 'coords', 'code', 'scalarField', 'geometry'];

function talkToWorker(msg) {
 var stage = workerStages.indexOf(msg);
 if (stage < 0) return false;
 if (msg == 'code') {
  activeFieldSource = pendingWorkerCode = myCodeMirror.getRange({line:1,ch:0}, {line:myCodeMirror.lineCount()-2,ch:Infinity});
 }
 if (pendingWorkerStage === null || stage < pendingWorkerStage) pendingWorkerStage = stage;
 dispatchPendingWork();
 return true; // Accepted into the queue, even when workers currently own buffers.
}

function dispatchPendingWork() {
 if (publishingWorkerBatch || pendingWorkerStage === null || waitingForAnyWebWorker()) return;
 var stage = workersNeedInit ? 0 : pendingWorkerStage;
 workersNeedInit = false;
 var outgoing = {num:0, batchId:++workerBatchId, messageType:workerStages[stage], R:computeFullTransform(), n:n,
  params:shapeParams, calcNormals:materialParams.calcNormals};
 if (activeFieldSource !== null) outgoing.code = activeFieldSource;
 document.title = titleBusy;
 console.time('All Workers');
 pendingWorkerStage = null;
 pendingWorkerCode = null;
 activeWorkerBatch = {id:outgoing.batchId,replies:new Array(8),remaining:8,failed:false};
 for (var i=0; i<8; i++) waitingForWebWorker[i] = true;
 for (var i=0; i<8; i++) {
  waitingForWebWorker[i] = true;
  outgoing.num = i;
  outgoing.vertexBuffer = vertexBuffer[i];
  outgoing.faceBuffer = faceBuffer[i];
  outgoing.normalBuffer = normalBuffer[i];
  try { workers[i].postMessage(outgoing, [vertexBuffer[i],faceBuffer[i],normalBuffer[i]]); }
  catch (error) { workers[i].onerror({message:error.message, preventDefault:function(){}}); }
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
 if (activeWorkerBatch) { receiveBatchReply(e.data); return; }
 // Replies carrying an obsolete batch id must never overwrite a newer surface.
 if (e.data.batchId !== undefined) return;
 publishWorkerResult(e);
}

function publishWorkerResult(e) {
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
	faceBuffer[octant] = meshes[octant].userData.faceBuffer || new ArrayBuffer(4);
	normalBuffer[octant] = meshes[octant].geometry.attributes.normal.array.buffer;

	// meshes[octant].geometry.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array(e.data.buffers[0]), 3 ) );
	// meshes[octant].geometry.setIndex(  new THREE.BufferAttribute( new Float32Array(e.data.buffers[1]),3));
	// meshes[octant].geometry.addAttribute( 'normal', new THREE.BufferAttribute( new Float32Array(e.data.buffers[2]), 3 ) );

	var oldGeometry = meshes[octant].geometry;
	var buffGeom = surfaceGeometry(e.data);
	buffGeom.boundingSphere = theBoundingSphere; // This is just to suppress error messages; has no other purpose.
	var m = new THREE.Mesh( buffGeom, myMaterial );
	// Keep the transfer-format buffer separate from the Uint16 GPU upload.
	m.userData.faceBuffer = e.data.buffers[1];
	meshes[octant] = m;
	oldGeometry.dispose();
	waitingForWebWorker[octant] = false;
	if (!waitingForAnyWebWorker()) {
		document.title = title;
		console.timeEnd("All Workers");
	}
	updateSceneMesh(octant, m);
	dispatchPendingWork();
}

function initWorkers() {
  this.workers = [];
  for (var i=0; i<8; i++) {
    workers.push(new makeWorker("worker.js"));
  }
}

function installWorkerHandlers(worker, octant, generation) {
 bindWorkerEvents(worker, octant);
}

function resetWorker(r) {
 activeWorkerBatch = null;
 workerGeneration++;
	shapeParams.reset = false;
	shapeParams.resolution = r;
	document.title = title;
	for (var i=0; i<8; i++) {
		waitingForWebWorker[i] = false;
		workers[i].terminate();
		// Terminated workers owned the transferred buffers; never reuse them.
		vertexBuffer[i] = new ArrayBuffer(4);
		faceBuffer[i] = new ArrayBuffer(4);
		normalBuffer[i] = new ArrayBuffer(4);
	}
	for (var i=0; i<8; i++) {
		workers[i] = makeWorker(workerSourceString);
		installWorkerHandlers(workers[i], i, workerGeneration);
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
