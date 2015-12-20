function exportToJSON() {
  var foo = [];
  foo.push({name: 'shapeParams', data: shapeParams});
  foo.push({name: 'cameraParams', data: cameraParams});
  foo.push({name: 'materialParams', data: materialParams});
  foo.push({name: 'transformParams', data: transformParams});
  foo.push({name: 'transforms', data: transforms});
  window.prompt("Copy to clipboard: Ctrl+C, Enter.", JSON.stringify(foo));
}

var foo;

function merge(a, b) {
  for (var i in b) {
    a[i] = b[i];
  }
}

function importFromJSON() {
  var inString = window.prompt("Paste JSON, Enter.", '');
  foo = JSON.parse(inString);
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
  var out = ssNum.toString();
  if (ssNum < 100000) {
    out = '0' + out;
    if (ssNum < 10000) {
      out = '0' + out;
      if (ssNum < 1000) {
        out = '0' + out;
        if (ssNum < 100) {
          out = '0' + out;
          if (ssNum < 10) {
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
