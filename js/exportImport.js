// Prepare a complete session without mutating live objects or touching workers.
function prepareSession(text) {
  var saved = JSON.parse(text);
  var legacy = Array.isArray(saved);
  if (!legacy) {
    if (!saved || saved.version !== 1 || !Array.isArray(saved.groups)) throw new Error('Unsupported session format');
    checkSessionKeys(saved, ['version','groups','baseOrientation','activeFieldSource']);
  }
  var groups = legacy ? saved : saved.groups;
  var current = {shapeParams:shapeParams,cameraParams:cameraParams,materialParams:materialParams,transformParams:transformParams};
  var state = {}, seen = Object.create(null);
  Object.keys(current).forEach(function(name) { state[name] = Object.assign({}, current[name]); });
  groups.forEach(function(group) {
    if (!group || typeof group !== 'object' || Array.isArray(group)) throw new Error('Invalid settings group');
    checkSessionKeys(group, ['name','data']);
    if (typeof group.name !== 'string' || seen[group.name]) throw new Error('Invalid or duplicate settings group');
    seen[group.name] = true;
    if (group.name === 'transforms') {
      if (!Array.isArray(group.data)) throw new Error('Invalid transform stack');
      group.data.forEach(function(t) { checkSessionKeys(t, Object.keys(plainTransform())); });
    } else {
      if (!Object.prototype.hasOwnProperty.call(current, group.name)) throw new Error('Unknown settings group: ' + group.name);
      checkSessionKeys(group.data, Object.keys(current[group.name]));
      Object.keys(group.data).forEach(function(key) { state[group.name][key] = group.data[key]; });
    }
  });
  var dimensions = importedDimensionState(groups);
  state.transforms = dimensions.transforms;
  var shape = state.shapeParams, camera = state.cameraParams, material = state.materialParams, transform = state.transformParams;
  if (seen.shapeParams) {
    var patch = groups.filter(function(g) {return g.name === 'shapeParams';})[0].data;
    if (patch.coeff !== undefined && patch.coeffCount === undefined) shape.coeffCount = patch.coeff.length;
  }
  Object.keys(current).forEach(function(name) {
    Object.keys(current[name]).forEach(function(key) {
      var expected = typeof current[name][key], actual = state[name][key];
      // GUI enum controllers serialize their values as numeric strings.
      var enumKey = name === 'materialParams' && ['material','side','blending','equation'].indexOf(key) >= 0;
      if (enumKey && typeof actual === 'string' && /^\d+$/.test(actual)) actual = state[name][key] = Number(actual);
      if (Array.isArray(current[name][key])) {
        if (!Array.isArray(actual) || !actual.every(Number.isFinite)) throw new Error('Invalid array: ' + key);
        state[name][key] = actual.slice();
      } else if (typeof actual !== expected || (expected === 'number' && !Number.isFinite(actual))) throw new Error('Invalid value: ' + key);
    });
  });
  validateNumericSettings(shape, transform, state.transforms);
  sessionRange(shape.editorWidth,0,100000,'editor width');
  sessionRange(shape.memoryOveruse,0,1,'memory overhead');
  if (!Number.isInteger(shape.maxCoeffCount) || shape.maxCoeffCount < 1 || shape.maxCoeffCount > 32 ||
      !Number.isInteger(shape.coeffCount) || shape.coeffCount < 0 || shape.coeffCount > shape.maxCoeffCount ||
      shape.coeff.length !== shape.coeffCount) throw new Error('Invalid coefficient count');
  sessionRange(camera.fov,0.05,179.95,'field of view');
  if (camera.scale <= 0) throw new Error('Camera scale must be positive');
  sessionRange(camera.radius,0,10,'camera radius'); sessionRange(camera.speed,0,10,'camera speed');
  if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(camera.background)) throw new Error('Invalid background color');
  var enums = {material:[0,1,3,4,5],side:[0,1,2],blending:[0,1,2,3,4,5],equation:[0,100,101,102,103,104]};
  Object.keys(enums).forEach(function(key) { if (enums[key].indexOf(material[key]) < 0) throw new Error('Invalid material ' + key); });
  if (material.equation === 0) material.equation = 100; // Original startup value.
  sessionRange(material.opacity,0,1,'opacity');
  var matrix = legacy ? numeric.identity(dimensions.dimensions+1) : saved.baseOrientation;
  if (!Array.isArray(matrix) || matrix.length !== dimensions.dimensions+1 || !matrix.every(function(row) {
    return Array.isArray(row) && row.length === dimensions.dimensions+1 && row.every(Number.isFinite);
  })) throw new Error('Invalid base orientation');
  state.baseOrientation = matrix.map(function(row) {return row.slice();});
  state.activeFieldSource = legacy ? null : saved.activeFieldSource;
  if (state.activeFieldSource !== null) {
    if (typeof state.activeFieldSource !== 'string') throw new Error('Invalid function source');
    new Function('x','c',state.activeFieldSource);
  }
  state.groups = groups;
  return state;
}
function checkSessionKeys(object, allowed) {
  if (!object || typeof object !== 'object' || Array.isArray(object)) throw new Error('Expected settings object');
  Object.keys(object).forEach(function(key) {
    if (key === '__proto__' || key === 'prototype' || key === 'constructor' || allowed.indexOf(key) < 0) throw new Error('Unknown settings field: ' + key);
  });
}
function sessionRange(value, min, max, name) {
  if (!Number.isFinite(value) || value < min || value > max) throw new Error('Invalid ' + name);
}

// Validate before mutating live state. Retained transforms are resized when the
// dimension changes; explicitly imported transforms must already be consistent.
function importedDimensionState(groups) {
 if (!Array.isArray(groups)) throw new Error('Settings must be an array of groups');
 var dimensions = shapeParams.dimensions, resolution = shapeParams.resolution;
 var stack = transforms, explicitStack = false, importedShape = null;
 var seen = {};
 groups.forEach(function(group) {
  if (!group || typeof group.name != 'string' || !group.data || seen[group.name]) throw new Error('Invalid or duplicate settings group');
  seen[group.name] = true;
  if (group.name == 'shapeParams') {
   importedShape = group.data;
   if (group.data.dimensions !== undefined) dimensions = group.data.dimensions;
   if (group.data.resolution !== undefined) resolution = group.data.resolution;
  }
  if (group.name == 'transforms') { stack = group.data; explicitStack = true; }
 });
 if (!Number.isInteger(dimensions) || dimensions < 3) throw new Error('Dimensions must be an integer of at least 3');
 if (!Number.isInteger(resolution) || resolution < 2 || resolution > 65) throw new Error('Resolution must be between 2 and 65');
 if (importedShape && importedShape.coeff !== undefined) {
  if (!Array.isArray(importedShape.coeff) || !importedShape.coeff.every(Number.isFinite) ||
      importedShape.coeff.length > 32 ||
      (importedShape.coeffCount !== undefined && importedShape.coeffCount !== importedShape.coeff.length)) throw new Error('Invalid coefficients');
 }
 if (!Array.isArray(stack)) throw new Error('Invalid transform stack');
 stack = stack.map(function(t) {
  if (!t || ['0','1','2','3'].indexOf(t.type) < 0) throw new Error('Invalid transform type');
  var result = {};
  Object.keys(t).forEach(function(key) { result[key] = t[key]; });
  ['axis1','axis2','row','col'].forEach(function(key) {
   if (!Number.isInteger(t[key]) || t[key] < 0 || (explicitStack && t[key] >= dimensions)) throw new Error('Invalid transform axis');
   result[key] = Math.min(t[key], dimensions-1);
  });
  ['degrees','shear'].forEach(function(key) { if (!Number.isFinite(t[key])) throw new Error('Invalid transform value'); });
  ['s','d'].forEach(function(key) {
   if (!Array.isArray(t[key]) || !t[key].every(Number.isFinite) || (explicitStack && t[key].length !== dimensions)) throw new Error('Invalid transform vector');
   result[key] = Array.from({length:dimensions}, function(_,i) { return i<t[key].length ? t[key][i] : key=='s' ? 1 : 0; });
  });
  if (result.s.some(function(x) {return x===0;})) throw new Error('Scale cannot be zero');
  return result;
 });
 return {dimensions:dimensions, transforms:stack};
}

function exportToJSON() {
  var foo = [];
  foo.push({name: 'shapeParams', data: shapeParams});
  foo.push({name: 'cameraParams', data: cameraParams});
  foo.push({name: 'materialParams', data: materialParams});
  foo.push({name: 'transformParams', data: transformParams});
  foo.push({name: 'transforms', data: transforms});
  window.prompt("Copy to clipboard: Ctrl+C, Enter.", JSON.stringify({version:1, groups:foo, baseOrientation:baseOrientation, activeFieldSource:activeFieldSource}));
}

var foo;

function merge(a, b) {
  Object.keys(b).forEach(function(key) { a[key] = b[key]; });
}

function importFromJSON() {
  var text = window.prompt("Paste JSON, Enter.", '');
  if (text === null) return false;
  try { importSettings(text); return true; }
  catch (error) { window.alert('Could not import settings: ' + error.message); return false; }
}

function importSettings(text) {
  var state = prepareSession(text);
  merge(shapeParams, state.shapeParams);
  merge(cameraParams, state.cameraParams);
  merge(materialParams, state.materialParams);
  merge(transformParams, state.transformParams);
  n = shapeParams.dimensions;
  transforms = state.transforms;
  baseOrientation = state.baseOrientation;
  activeFieldSource = state.activeFieldSource;
  foo = state.groups;
  for (var k=0; k<shapeParams.coeff.length; k++) cachedCoeff[k] = shapeParams.coeff[k];
  myCodeMirror.off('beforeChange', beforeChangeCallback);
  myCodeMirror.setValue(activeFieldSource === null ? defaultText() : 'function field(x, c, size3, n) {\n' + activeFieldSource + '\n}');
  myCodeMirror.on('beforeChange', beforeChangeCallback);
  resetWorker(shapeParams.resolution);
  updateMaterial();
  updateBackground();
}

function dataURLToBlob(dataURL) {
	var BASE64_MARKER = ';base64,';
	if (dataURL.indexOf(BASE64_MARKER) == -1) {
		var parts = dataURL.split(',');
		var contentType = parts[0].split(':')[1];
		var raw = decodeURIComponent(parts[1]);

		return new Blob([raw], {type: contentType});
	}

	var parts = dataURL.split(BASE64_MARKER);
	var contentType = parts[0].split(':')[1];
	var raw = window.atob(parts[1]);
	var rawLength = raw.length;

	var uInt8Array = new Uint8Array(rawLength);

	for (var i = 0; i < rawLength; ++i) {
		uInt8Array[i] = raw.charCodeAt(i);
	}

	return new Blob([uInt8Array], {type: contentType});
}

function getScreenshotNumber() {
  if (typeof ssNum == 'undefined') {
    this.ssNum = 0;
  } else {
    ssNum++;
  }
  return padWithZeros(ssNum);
}

function padWithZeros(s) {
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

function takeScreenshot() {
  saveAs(dataURLToBlob(renderer.domElement.toDataURL('image/png')), "IsoVis" + getScreenshotNumber() + ".png");
}

function makeGIF() {
  if (typeof this.frameNumber == 'undefined') {
    this.frameNumber = startFrame;
  } else {
    this.frameNumber++;
  }
  if (doneWithGIF) {
    frameNumber = 'undefined';
    makingGIF = false;
    return;
  }
  var dURL = renderer.domElement.toDataURL('image/png');
  var blob = dataURLToBlob(dURL);
  saveAs(blob, "IsoVis_frame" + padWithZeros(frameNumber) + ".png");

  waitingForNextFrame = true;
  setTimeout(doNextFrame, 5000);
}

function doNextFrame() {
  frame(frameNumber);
  talkToWorker('coords');
  waitingForNextFrame = false;
}

function frame(f) {
  if (f<=90) {
    var t = f - 0;
    transforms[0].degrees = t;
  } else if (t<=180) {
    var t = f - 90;
    transforms[1].degrees = 0.5 * t;
  } else if (t<=270) {
    var t = f - 180;
    transforms[0].degrees = 90 - t;
  } else if (t<=360) {
    var t = f - 270;
    transforms[1].degrees = 0.5 * t;
  } else {
    this.doneWithGIF = true;
  }
}

function startGIF() {
  camera.position.x = 13.801932541815242;
  camera.position.y = 8.67053362580356;
  camera.position.z = 12.602896281212557;
  cameraParams.speed = 0;
  cameraParams.radius = 0;
  makingGIF = true;
  doneWithGIF = false;
  //console.alert('You must configure this feature manually.\nConsult github.com/csp256/IsoVis for documentation.');
}
