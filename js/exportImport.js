// One capture and one advance timer at most. Stopping invalidates both.
var gifCaptureTimer = null;
var gifAdvanceTimer = null;
function stopGIF() {
  if (gifCaptureTimer !== null) clearTimeout(gifCaptureTimer);
  if (gifAdvanceTimer !== null) clearTimeout(gifAdvanceTimer);
  gifCaptureTimer = gifAdvanceTimer = null;
  makingGIF = false;
  doneWithGIF = true;
  waitingForNextFrame = false;
  this.frameNumber = undefined;
}
function scheduleGIFCapture() {
  if (!makingGIF || doneWithGIF || waitingForNextFrame || gifCaptureTimer !== null) return;
  waitingForNextFrame = true;
  gifCaptureTimer = setTimeout(function() {
    gifCaptureTimer = null;
    if (!makingGIF || doneWithGIF) { stopGIF(); return; }
    if (waitingForAnyWebWorker() || pendingWorkerStage !== null) { waitingForNextFrame = false; return; }
    try { makeGIF(); }
    catch (error) { stopGIF(); reportWorkerError(error.message); }
  }, 2000);
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
  for (var i in b) {
    a[i] = b[i];
  }
}

function importFromJSON() {
  var inString = window.prompt("Paste JSON, Enter.", '');
  if (inString === null) return;
  var saved = JSON.parse(inString);
  if (!Array.isArray(saved) && (!saved || saved.version !== 1 || !Array.isArray(saved.groups))) throw new Error('Unsupported session format');
  foo = Array.isArray(saved) ? saved : saved.groups;
  var dimensionState = importedDimensionState(foo);
  var dimensions = dimensionState.dimensions;
  foo.forEach(function(group) {
   if (group.name == 'shapeParams' && group.data.dimensions !== undefined) dimensions = group.data.dimensions;
  });
  if (!Number.isInteger(dimensions) || dimensions < 3) throw new Error('Invalid dimensions');
  var matrix = Array.isArray(saved) ? numeric.identity(dimensions+1) : saved.baseOrientation;
  if (!Array.isArray(matrix) || matrix.length !== dimensions+1 || !matrix.every(function(row) {
   return Array.isArray(row) && row.length === dimensions+1 && row.every(Number.isFinite);
  })) throw new Error('Invalid base orientation');
  var source = Array.isArray(saved) ? null : saved.activeFieldSource;
  if (source !== null && typeof source != 'string') throw new Error('Invalid function source');
  if (source !== null) new Function('x','c',source); // Syntax check before changing state.

  
  for (var i in foo) {
    var group = foo[i];
    switch (group.name) {
      case 'shapeParams':
        merge(shapeParams, group.data);
      break;
      case 'cameraParams':
        merge(cameraParams, group.data);
      break;
      case 'materialParams':
        merge(materialParams, group.data);
      break;
      case 'transformParams':
        merge(transformParams, group.data);
      break;
      case 'transforms':
        transforms = group.data.slice();
      break;
    }
  }
  n = dimensionState.dimensions;
  shapeParams.dimensions = n;
  transforms = dimensionState.transforms;
  shapeParams.coeffCount = shapeParams.coeff.length;
  for (var k=0; k<shapeParams.coeff.length; k++) cachedCoeff[k] = shapeParams.coeff[k];
  baseOrientation = matrix.map(function(row) {return row.slice();});
  activeFieldSource = source;
  // Replace the editor draft too, so the visible session matches the restored one.
  myCodeMirror.off('beforeChange', beforeChangeCallback);
  myCodeMirror.setValue(source === null ? defaultText() : 'function field(x, c, size3, n) {\n' + source + '\n}');
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
    stopGIF();
    return;
  }
  var dURL = renderer.domElement.toDataURL('image/png');
  var blob = dataURLToBlob(dURL);
  saveAs(blob, "IsoVis_frame" + padWithZeros(frameNumber) + ".png");

  waitingForNextFrame = true;
  gifAdvanceTimer = setTimeout(function() {
    gifAdvanceTimer = null;
    if (!makingGIF || doneWithGIF) { stopGIF(); return; }
    try { doNextFrame(); }
    catch (error) { stopGIF(); reportWorkerError(error.message); }
  }, 5000);
}

function doNextFrame() {
  frame(frameNumber);
  if (doneWithGIF) { stopGIF(); return; }
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
  stopGIF();
  camera.position.x = 13.801932541815242;
  camera.position.y = 8.67053362580356;
  camera.position.z = 12.602896281212557;
  cameraParams.speed = 0;
  cameraParams.radius = 0;
  makingGIF = true;
  doneWithGIF = false;
  //console.alert('You must configure this feature manually.\nConsult github.com/csp256/IsoVis for documentation.');
}
