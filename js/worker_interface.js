function clear_worker_error() {
 var box = document.getElementById('worker_error');
 if (box) { box.textContent = ''; box.hidden = true; }
}

function report_worker_error(message) {
 var box = document.getElementById('worker_error');
 if (!box) {
  box = document.createElement('div');
  box.id = 'worker_error';
  box.setAttribute('role', 'alert');
  box.style.cssText = 'position:fixed;bottom:0;left:0;z-index:10000;background:#500;color:white;padding:8px';
  document.body.appendChild(box);
 }
 box.hidden = false;
 box.textContent = 'Calculation failed: ' + message + '. The last successful surface is retained. Edit the function and click Update to retry.';
}

function bind_worker_events(worker, octant) {
 var generation = worker_generation;
 worker.onmessage = function(e) {
  if (generation === worker_generation && workers[octant] === worker) handle_worker_message(e);
 };
 function failed(e) {
  if (generation !== worker_generation || workers[octant] !== worker) return;
  if (e.preventDefault) e.preventDefault();
  worker.terminate();
  workers[octant] = make_worker(worker_source_string);
  bind_worker_events(workers[octant], octant);
  vertex_buffer[octant] = new ArrayBuffer(4);
  face_buffer[octant] = new ArrayBuffer(4);
  normal_buffer[octant] = new ArrayBuffer(4);
  waiting_for_web_worker[octant] = false;
  workers_need_init = true;
  if (active_worker_batch) {
   receive_batch_reply({num:octant,batch_id:active_worker_batch.id,error:e.message || 'Worker communication error',
    buffers:[vertex_buffer[octant],face_buffer[octant],normal_buffer[octant]]});
   return;
  }
  report_worker_error(e.message || 'Worker communication error');
  if (!waiting_for_any_web_worker()) document.title = title;
  if (typeof dispatch_pending_work == 'function') dispatch_pending_work();

 }
 worker.onerror = failed;
 worker.onmessageerror = failed;
}

var workers_need_init = false;
var worker_batch_id = 0;
var active_worker_batch = null;
var publishing_worker_batch = false;

// Returned buffers are staged as CPU data, not GPU geometry, until every octant
// succeeds. A partial failure returns all buffers without changing any mesh.
function receive_batch_reply(data) {
 var batch = active_worker_batch;
 if (!batch || data.batch_id !== batch.id || batch.replies[data.num]) return;
 batch.replies[data.num] = data;
 batch.remaining--;
 waiting_for_web_worker[data.num] = false;
 if (data.error) { batch.failed = true; report_worker_error(data.error); }
 if (batch.remaining) return;
 active_worker_batch = null;
 if (batch.failed) {
  for (var i=0; i<8; i++) {
   vertex_buffer[i] = batch.replies[i].buffers[0];
   face_buffer[i] = batch.replies[i].buffers[1];
   normal_buffer[i] = batch.replies[i].buffers[2];
  }
 } else {
  clear_worker_error();
  publishing_worker_batch = true;
  try {
   for (var i=0; i<8; i++) publish_worker_result({data:batch.replies[i]});
  } finally { publishing_worker_batch = false; }
 }
 document.title = title;
 dispatch_pending_work();
}


// WebGL2 guarantees Uint32 element indices. Keep small uploads compact.
function surface_geometry(data) {
 var geometry = new THREE.BufferGeometry();
 var indices = new Uint32Array(data.buffers[1], 0, data.index_count);
 geometry.setIndex(new THREE.BufferAttribute(data.vertex_count <= 65535 ? new Uint16Array(indices) : indices, 1));
 geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(data.buffers[0], 0, data.vertex_count * 3), 3));
 geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(data.buffers[2], 0, data.vertex_count * 3), 3));
 geometry.setDrawRange(0, data.index_count);
 geometry.computeBoundingSphere();
 return geometry;
}
// Submitted source is separate from unsubmitted editor contents.
var active_field_source = null;
var worker_generation = 0;

// Lower stages subsume later work. Latest editor submission wins, never a draft.
var pending_worker_stage = null;
var pending_worker_code = null;
var worker_stages = ['init', 'coords', 'code', 'scalar_field', 'geometry'];

function talk_to_worker(msg) {
 var stage = worker_stages.indexOf(msg);
 if (stage < 0) return false;
 if (msg == 'code') {
  active_field_source = pending_worker_code = my_code_mirror.getRange({line:1,ch:0}, {line:my_code_mirror.lineCount()-2,ch:Infinity});
 }
 if (pending_worker_stage === null || stage < pending_worker_stage) pending_worker_stage = stage;
 dispatch_pending_work();
 return true; // Accepted into the queue, even when workers currently own buffers.
}

function dispatch_pending_work() {
 if (publishing_worker_batch || pending_worker_stage === null || waiting_for_any_web_worker()) return;
 var stage = workers_need_init ? 0 : pending_worker_stage;
 var r;
 try { r = compute_full_transform(); }
 catch (error) {
  pending_worker_stage = pending_worker_code = null;
  report_worker_error(error.message);
  return;
 }
 workers_need_init = false;
 var outgoing = {num:0, batch_id:++worker_batch_id, message_type:worker_stages[stage], r:r, n:n,


  params:shape_params, calc_normals:material_params.calc_normals};
 if (active_field_source !== null) outgoing.code = active_field_source;
 document.title = title_busy;
 console.time('All Workers');
 pending_worker_stage = null;
 pending_worker_code = null;
 active_worker_batch = {id:outgoing.batch_id,replies:new Array(8),remaining:8,failed:false};
 for (var i=0; i<8; i++) waiting_for_web_worker[i] = true;
 for (var i=0; i<8; i++) {
  waiting_for_web_worker[i] = true;
  outgoing.num = i;
  outgoing.vertex_buffer = vertex_buffer[i];
  outgoing.face_buffer = face_buffer[i];
  outgoing.normal_buffer = normal_buffer[i];
  try { workers[i].postMessage(outgoing, [vertex_buffer[i],face_buffer[i],normal_buffer[i]]); }
  catch (error) { workers[i].onerror({message:error.message, preventDefault:function(){}}); }
 }

}


function waiting_for_any_web_worker() {
	for (var i=0; i<8; i++) {
		if (waiting_for_web_worker[i]==true) {
			return true;
		}
	}
	return false;
}

function handle_worker_message(e) {
 if (active_worker_batch) { receive_batch_reply(e.data); return; }
 // Replies carrying an obsolete batch id must never overwrite a newer surface.
 if (e.data.batch_id !== undefined) return;
 publish_worker_result(e);
}

function publish_worker_result(e) {
	var octant = e.data.num;
 if (e.data.error) {
  vertex_buffer[octant] = e.data.buffers[0];
  face_buffer[octant] = e.data.buffers[1];
  normal_buffer[octant] = e.data.buffers[2];
  waiting_for_web_worker[octant] = false;
  report_worker_error(e.data.error);
  if (!waiting_for_any_web_worker()) document.title = title;
  if (typeof dispatch_pending_work == 'function') dispatch_pending_work();

  return;
 }
	vertex_buffer[octant] = meshes[octant].geometry.attributes.position.array.buffer;
	face_buffer[octant] = meshes[octant].userData.face_buffer || new ArrayBuffer(4);
	normal_buffer[octant] = meshes[octant].geometry.attributes.normal.array.buffer;

	var old_geometry = meshes[octant].geometry;
	var buff_geom = surface_geometry(e.data);
	var m = new THREE.Mesh( buff_geom, my_material );
	// Keep the transfer-format buffer separate from the Uint16 GPU upload.
	m.userData.face_buffer = e.data.buffers[1];
	meshes[octant] = m;
	old_geometry.dispose();
	waiting_for_web_worker[octant] = false;
	if (!waiting_for_any_web_worker()) {
		document.title = title;
		console.timeEnd("All Workers");
	}
	update_scene_mesh(octant, m);
	dispatch_pending_work();
}

function init_workers() {
  this.workers = [];
  for (var i=0; i<8; i++) {
    workers.push(new make_worker("worker.js"));
  }
}

function install_worker_handlers(worker, octant, generation) {
 bind_worker_events(worker, octant);
}

function reset_worker(r) {
 active_worker_batch = null;
 worker_generation++;
	shape_params.reset = false;
	shape_params.resolution = r;
	document.title = title;
	for (var i=0; i<8; i++) {
		waiting_for_web_worker[i] = false;
		workers[i].terminate();
		// Terminated workers owned the transferred buffers; never reuse them.
		vertex_buffer[i] = new ArrayBuffer(4);
		face_buffer[i] = new ArrayBuffer(4);
		normal_buffer[i] = new ArrayBuffer(4);
	}
	for (var i=0; i<8; i++) {
		workers[i] = make_worker(worker_source_string);
		install_worker_handlers(workers[i], i, worker_generation);
	}
	talk_to_worker('init');

	build_gui();
}

function reset_worker10() {
	// Not exactly elegant, but I don't know how to pass arguments on callback...
	reset_worker(10);
}

function make_worker(script) {
    var URL = window.URL || window.webkitURL;
    var Blob = window.Blob;
    var Worker = window.Worker;

    if (!URL || !Blob || !Worker || !script) {
        return null;
    }

    var blob = new Blob([script]);
    var script_url = URL.createObjectURL(blob);
    try {
        // Worker construction captures the script URL before returning.
        return new Worker(script_url);
    } finally {
        URL.revokeObjectURL(script_url);
    }
}

function gather_worker_resource(frame_name) {
	var s = document.getElementById(frame_name).text;
	return '//' + frame_name + '\n' + s + '\n';
}
