// None of this works quite right yet.
// Didn't help that I didn't know enough about JS to set things up right.

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
  frame(f);
  //fancyLerp(currentFrame/maxFrame, 1-currentFrame/maxFrame);
  updateMaterial();
  updateBackground();
  talkToWorker('coords');
  waitingForNextFrame = false;
}

function frame(f) {
  transforms[0]
}

function fancyLerp(alpha, oneMinusAlpha) {
  for (var i in foo) {
    var group = foo[i];
    switch (group.name) {
      case 'shapeParams':
        objectLerp(shapeParams, group.data);
      break;
      case 'cameraParams':
        objectLerp(cameraParams, group.data);
      break;
      case 'materialParams':
        objectLerp(materialParams, group.data);
      break;
      case 'transformParams':
        objectLerp(transformParams, group.data);
      break;
      case 'transforms':
        transforms = group.data.slice();
      break;
    }
  }
}

function startGIF() {
  // var help = 'Usage information available at github.com/csp256/IsoVis\n\n';
  // this.startFrameParams = JSON.parse(window.prompt(help + "Paste JSON of starting position.", ''));
  // this.finalFrameParams = JSON.parse(window.prompt(help + "Paste JSON of ending configuration.", ''));
  // this.maxFrame = parseInt(window.prompt(help + "Number of frames:", ''));
  // this.currentFrame = parseInt(window.prompt(help + "Resume at frame:", '0'));
  // this.gifName = window.prompt('File name:', 'IsoVis_');

  camera.position.x = 13.801932541815242;
  camera.position.y = 8.67053362580356;
  camera.position.z = 12.602896281212557;
  cameraParams.speed = 0;
  cameraParams.radius = 0;
  makingGIF = true;
  doneWithGIF = false;
  //console.alert('You must configure this feature manually.\nConsult github.com/csp256/IsoVis for documentation.');
}
