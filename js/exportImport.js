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
