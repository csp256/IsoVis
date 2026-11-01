// Stable external schema: existing saves (including pre-envelope arrays) keep
// their historical keys. Translate structural keys only, never user source text.
var session_wire_names = {
  shape_params:'shapeParams', camera_params:'cameraParams',
  material_params:'materialParams', transform_params:'transformParams'
};
var session_wire_fields = {
  shape_params:{edit_code:'editCode',editor_width:'editorWidth',memory_overuse:'memoryOveruse',max_coeff_count:'maxCoeffCount',coeff_count:'coeffCount'},
  material_params:{calc_normals:'calcNormals',depth_test:'depthTest',depth_write:'depthWrite'},
  transform_params:{invert_order:'invertOrder',push_transform:'pushTransform',pop_transform:'popTransform',apply_transforms:'applyTransforms',pop_all_on_apply:'popAllOnApply',reset_orientation:'resetOrientation',pop_all_transforms:'popAllTransforms'}
};
function translate_record_keys(record, canonical_to_wire, to_wire) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return record;
  var names = Object.create(null), result = Object.create(null);
  Object.keys(canonical_to_wire).forEach(function(key) {
    names[to_wire ? key : canonical_to_wire[key]] = to_wire ? canonical_to_wire[key] : key;
  });
  Object.keys(record).forEach(function(key) {
    var name = Object.prototype.hasOwnProperty.call(names,key) ? names[key] : key;
    if (Object.prototype.hasOwnProperty.call(result,name)) throw new Error('Duplicate settings alias: ' + name);
    result[name] = record[key];
  });
  return result;
}
function translate_session(saved, to_wire) {
  var legacy = Array.isArray(saved);
  var result = legacy ? saved : translate_record_keys(saved, {base_orientation:'baseOrientation',active_field_source:'activeFieldSource'}, to_wire);
  var groups = legacy ? saved : result && result.groups;
  if (!Array.isArray(groups)) return result;
  var translated = groups.map(function(group) {
    if (!group || typeof group !== 'object' || Array.isArray(group)) return group;
    var copy = translate_record_keys(group,{},to_wire);
    var canonical = group.name;
    if (!to_wire) Object.keys(session_wire_names).forEach(function(name) { if (session_wire_names[name] === group.name) canonical = name; });
    copy.name = to_wire && Object.prototype.hasOwnProperty.call(session_wire_names,canonical) ? session_wire_names[canonical] : canonical;
    var fields = Object.prototype.hasOwnProperty.call(session_wire_fields,canonical) ? session_wire_fields[canonical] : {};
    copy.data = translate_record_keys(group.data,fields,to_wire);
    return copy;
  });
  if (legacy) return translated;
  result.groups = translated;
  return result;
}
function session_from_wire(saved) { return translate_session(saved,false); }
function session_to_wire(saved) { return translate_session(saved,true); }

// Prepare a complete session without mutating live objects or touching workers.
function prepare_session(text) {
  var saved = session_from_wire(JSON.parse(text));
  var legacy = Array.isArray(saved);
  if (!legacy) {
    if (!saved || saved.version !== 1 || !Array.isArray(saved.groups)) throw new Error('Unsupported session format');
    check_session_keys(saved, ['version','groups','base_orientation','active_field_source']);
  }
  var groups = legacy ? saved : saved.groups;
  var current = {shape_params:shape_params,camera_params:camera_params,material_params:material_params,transform_params:transform_params};
  var state = {}, seen = Object.create(null);
  Object.keys(current).forEach(function(name) { state[name] = Object.assign({}, current[name]); });
  groups.forEach(function(group) {
    if (!group || typeof group !== 'object' || Array.isArray(group)) throw new Error('Invalid settings group');
    check_session_keys(group, ['name','data']);
    if (typeof group.name !== 'string' || seen[group.name]) throw new Error('Invalid or duplicate settings group');
    seen[group.name] = true;
    if (group.name === 'transforms') {
      if (!Array.isArray(group.data)) throw new Error('Invalid transform stack');
      group.data.forEach(function(t) { check_session_keys(t, Object.keys(plain_transform())); });
    } else {
      if (!Object.prototype.hasOwnProperty.call(current, group.name)) throw new Error('Unknown settings group: ' + group.name);
      check_session_keys(group.data, Object.keys(current[group.name]));
      Object.keys(group.data).forEach(function(key) { state[group.name][key] = group.data[key]; });
    }
  });
  var dimensions = imported_dimension_state(groups);
  state.transforms = dimensions.transforms;
  var shape = state.shape_params, camera = state.camera_params, material = state.material_params, transform = state.transform_params;
  if (seen.shape_params) {
    var patch = groups.filter(function(g) {return g.name === 'shape_params';})[0].data;
    if (patch.coeff !== undefined && patch.coeff_count === undefined) shape.coeff_count = patch.coeff.length;
  }
  var boolean_fields = {
    shape_params:['edit_code','reset','interpolate'],
    camera_params:['perspective','wobble','axes','fps'],
    material_params:['calc_normals','depth_test','depth_write','wireframe','coordinates','values','geometry'],
    transform_params:['invert_order','push_transform','pop_transform','apply_transforms','pop_all_on_apply','reset_orientation','pop_all_transforms']
  };
  Object.keys(current).forEach(function(name) {
    Object.keys(current[name]).forEach(function(key) {
      var expected = name === 'camera_params' && key === 'background' ? 'string' : boolean_fields[name].indexOf(key) >= 0 ? 'boolean' : 'number';
      var actual = state[name][key];
      // GUI enum controllers serialize their values as numeric strings.
      var enum_key = name === 'material_params' && ['material','side','blending','equation'].indexOf(key) >= 0;
      if (enum_key && typeof actual === 'string' && /^\d+$/.test(actual)) actual = state[name][key] = Number(actual);
      if (Array.isArray(current[name][key])) {
        if (!Array.isArray(actual) || !actual.every(Number.isFinite)) throw new Error('Invalid array: ' + key);
        state[name][key] = actual.slice();
      } else if (typeof actual !== expected || (expected === 'number' && !Number.isFinite(actual))) throw new Error('Invalid value: ' + key);
    });
  });
  validate_numeric_settings(shape, transform, state.transforms);
  session_range(shape.editor_width,0,100000,'editor width');
  session_range(shape.memory_overuse,0,1,'memory overhead');
  if (!Number.isInteger(shape.max_coeff_count) || shape.max_coeff_count < 1 || shape.max_coeff_count > 32 ||
      !Number.isInteger(shape.coeff_count) || shape.coeff_count < 0 || shape.coeff_count > shape.max_coeff_count ||
      shape.coeff.length !== shape.coeff_count) throw new Error('Invalid coefficient count');
  session_range(camera.fov,0.05,179.95,'field of view');
  if (camera.scale <= 0) throw new Error('Camera scale must be positive');
  session_range(camera.radius,0,10,'camera radius'); session_range(camera.speed,0,10,'camera speed');
  if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(camera.background)) throw new Error('Invalid background color');
  var enums = {material:[0,1,3,4,5],side:[0,1,2],blending:[0,1,2,3,4,5],equation:[0,100,101,102,103,104]};
  Object.keys(enums).forEach(function(key) { if (enums[key].indexOf(material[key]) < 0) throw new Error('Invalid material ' + key); });
  if (material.equation === 0) material.equation = 100; // Original startup value.
  session_range(material.opacity,0,1,'opacity');
  var matrix = legacy ? numeric.identity(dimensions.dimensions+1) : saved.base_orientation;
  if (!Array.isArray(matrix) || matrix.length !== dimensions.dimensions+1 || !matrix.every(function(row) {
    return Array.isArray(row) && row.length === dimensions.dimensions+1 && row.every(Number.isFinite);
  })) throw new Error('Invalid base orientation');
  state.base_orientation = matrix.map(function(row) {return row.slice();});
  state.active_field_source = legacy ? null : saved.active_field_source;
  if (state.active_field_source !== null) {
    if (typeof state.active_field_source !== 'string') throw new Error('Invalid function source');
    new Function('x','c',state.active_field_source);
  }
  state.groups = groups;
  return state;
}
function check_session_keys(object, allowed) {
  if (!object || typeof object !== 'object' || Array.isArray(object)) throw new Error('Expected settings object');
  Object.keys(object).forEach(function(key) {
    if (key === '__proto__' || key === 'prototype' || key === 'constructor' || allowed.indexOf(key) < 0) throw new Error('Unknown settings field: ' + key);
  });
}
function session_range(value, min, max, name) {
  if (!Number.isFinite(value) || value < min || value > max) throw new Error('Invalid ' + name);
}

// One capture and one advance timer at most. Stopping invalidates both.
var gif_capture_timer = null;
var gif_advance_timer = null;
function stop_gif() {
  if (gif_capture_timer !== null) clearTimeout(gif_capture_timer);
  if (gif_advance_timer !== null) clearTimeout(gif_advance_timer);
  gif_capture_timer = gif_advance_timer = null;
  making_gif = false;
  done_with_gif = true;
  waiting_for_next_frame = false;
  this.frame_number = undefined;
}
function schedule_gif_capture() {
  if (!making_gif || done_with_gif || waiting_for_next_frame || gif_capture_timer !== null) return;
  waiting_for_next_frame = true;
  gif_capture_timer = setTimeout(function() {
    gif_capture_timer = null;
    if (!making_gif || done_with_gif) { stop_gif(); return; }
    if (waiting_for_any_web_worker() || pending_worker_stage !== null) { waiting_for_next_frame = false; return; }
    try { make_gif(); }
    catch (error) { stop_gif(); report_worker_error(error.message); }
  }, 2000);

}

// Validate before mutating live state. Retained transforms are resized when the
// dimension changes; explicitly imported transforms must already be consistent.
function imported_dimension_state(groups) {
 if (!Array.isArray(groups)) throw new Error('Settings must be an array of groups');
 var dimensions = shape_params.dimensions, resolution = shape_params.resolution;
 var stack = transforms, explicit_stack = false, imported_shape = null;
 var seen = {};
 groups.forEach(function(group) {
  if (!group || typeof group.name != 'string' || !group.data || seen[group.name]) throw new Error('Invalid or duplicate settings group');
  seen[group.name] = true;
  if (group.name == 'shape_params') {
   imported_shape = group.data;
   if (group.data.dimensions !== undefined) dimensions = group.data.dimensions;
   if (group.data.resolution !== undefined) resolution = group.data.resolution;
  }
  if (group.name == 'transforms') { stack = group.data; explicit_stack = true; }
 });
 if (!Number.isInteger(dimensions) || dimensions < 3) throw new Error('Dimensions must be an integer of at least 3');
 if (!Number.isInteger(resolution) || resolution < 2 || resolution > 65) throw new Error('Resolution must be between 2 and 65');
 if (imported_shape && imported_shape.coeff !== undefined) {
  if (!Array.isArray(imported_shape.coeff) || !imported_shape.coeff.every(Number.isFinite) ||
      imported_shape.coeff.length > 32 ||
      (imported_shape.coeff_count !== undefined && imported_shape.coeff_count !== imported_shape.coeff.length)) throw new Error('Invalid coefficients');
 }
 stack = normalized_transform_stack(stack, dimensions, explicit_stack);
 return {dimensions:dimensions, transforms:stack};
}

function export_to_json() {
  var foo = [];
  foo.push({name: 'shape_params', data: shape_params});
  foo.push({name: 'camera_params', data: camera_params});
  foo.push({name: 'material_params', data: material_params});
  foo.push({name: 'transform_params', data: transform_params});
  foo.push({name: 'transforms', data: transforms});
  window.prompt("Copy to clipboard: Ctrl+C, Enter.", JSON.stringify(session_to_wire({version:1, groups:foo, base_orientation:base_orientation, active_field_source:active_field_source})));
}

var foo;

function merge(a, b) {
  Object.keys(b).forEach(function(key) { a[key] = b[key]; });
}

function import_from_json() {
  var text = window.prompt("Paste JSON, Enter.", '');
  if (text === null) return false;
  try { import_settings(text); return true; }
  catch (error) { window.alert('Could not import settings: ' + error.message); return false; }
}

function import_settings(text) {
  var state = prepare_session(text);
  merge(shape_params, state.shape_params);
  merge(camera_params, state.camera_params);
  merge(material_params, state.material_params);
  merge(transform_params, state.transform_params);
  n = shape_params.dimensions;
  transforms = state.transforms;
  base_orientation = state.base_orientation;
  active_field_source = state.active_field_source;
  foo = state.groups;
  for (var k=0; k<shape_params.coeff.length; k++) cached_coeff[k] = shape_params.coeff[k];
  my_code_mirror.off('beforeChange', before_change_callback);
  my_code_mirror.setValue(active_field_source === null ? default_text() : 'function field(x, c, size3, n) {\n' + active_field_source + '\n}');
  my_code_mirror.on('beforeChange', before_change_callback);
  reset_worker(shape_params.resolution);
  update_material();
  update_background();
}

function data_url_to_blob(data_url) {
	var base64_marker = ';base64,';
	if (data_url.indexOf(base64_marker) == -1) {
		var parts = data_url.split(',');
		var content_type = parts[0].split(':')[1];
		var raw = decodeURIComponent(parts[1]);

		return new Blob([raw], {type: content_type});
	}

	var parts = data_url.split(base64_marker);
	var content_type = parts[0].split(':')[1];
	var raw = window.atob(parts[1]);
	var raw_length = raw.length;

	var uint8_array = new Uint8Array(raw_length);

	for (var i = 0; i < raw_length; ++i) {
		uint8_array[i] = raw.charCodeAt(i);
	}

	return new Blob([uint8_array], {type: content_type});
}

function get_screenshot_number() {
  if (typeof ss_num == 'undefined') {
    this.ss_num = 0;
  } else {
    ss_num++;
  }
  return pad_with_zeros(ss_num);
}

function pad_with_zeros(s) {
  var out = s.toString();
  if (s < 100000) {
    out = '0' + out;
    if (s < 10000) {
      out = '0' + out;
      if (s < 1000) {
        out = '0' + out;
        if (s < 100) {
          out = '0' + out;
          if (s < 10) {
            out = '0' + out;
          }
        }
      }
    }
  }
  return out;
}

function take_screenshot() {
  saveAs(data_url_to_blob(renderer.domElement.toDataURL('image/png')), "IsoVis" + get_screenshot_number() + ".png");
}

function make_gif() {
  if (typeof this.frame_number == 'undefined') {
    this.frame_number = start_frame;
  } else {
    this.frame_number++;
  }
  if (done_with_gif) {
    stop_gif();
    return;
  }
  var d_url = renderer.domElement.toDataURL('image/png');
  var blob = data_url_to_blob(d_url);
  saveAs(blob, "IsoVis_frame" + pad_with_zeros(frame_number) + ".png");

  waiting_for_next_frame = true;
  gif_advance_timer = setTimeout(function() {
    gif_advance_timer = null;
    if (!making_gif || done_with_gif) { stop_gif(); return; }
    try { do_next_frame(); }
    catch (error) { stop_gif(); report_worker_error(error.message); }
  }, 5000);
}

function do_next_frame() {
  frame(frame_number);
  if (done_with_gif) { stop_gif(); return; }
  talk_to_worker('coords');
  waiting_for_next_frame = false;
}

// Experimental four-phase sequence, inclusive at each ninety-frame boundary.
function frame(f) {
  if (!Number.isInteger(f) || f < 0) throw new Error('Frame must be a nonnegative integer');
  if (f > 360) { this.done_with_gif = true; return; }
  if (transforms.length < 2 || transforms[0].type !== '0' || transforms[1].type !== '0') {
    throw new Error('GIF sequence requires two rotation transforms');
  }
  if (f <= 90) transforms[0].degrees = f;
  else if (f <= 180) transforms[1].degrees = 0.5 * (f - 90);
  else if (f <= 270) transforms[0].degrees = 90 - (f - 180);
  else transforms[1].degrees = 0.5 * (f - 270);
}

function start_gif() {
  stop_gif();
  camera.position.x = 13.801932541815242;
  camera.position.y = 8.67053362580356;
  camera.position.z = 12.602896281212557;
  camera_params.speed = 0;
  camera_params.radius = 0;
  making_gif = true;
  done_with_gif = false;
  //console.alert('You must configure this feature manually.\nConsult github.com/csp256/IsoVis for documentation.');
}
