function buildLeftGUI() {
  if (typeof leftgui == 'undefined') {
    // Default state.
    var closedState = { Shape: false, Camera: true, Material: true };
  } else {
    var closedState = { Shape: leftgui.__folders.Shape.closed, Camera: leftgui.__folders.Camera.closed, Material: leftgui.__folders.Material.closed };
    leftgui.destroy();
  }
	leftgui = new dat.GUI( {autoplace:false, } );
  leftgui.domElement.id = 'leftGUI';

  shapeFolder(leftgui);
  leftgui.__folders.Shape.closed = closedState.Shape;

  cameraFolder(leftgui);
  leftgui.__folders.Camera.closed = closedState.Camera;

  materialFolder(leftgui)
  leftgui.__folders.Material.closed = closedState.Material;

  leftgui.__closeButton.style.position = 'fixed';
  leftgui.__closeButton.style.left = -10000;
}

function updateCoeff() {
  while (shapeParams.coeff.length < shapeParams.coeffCount) {
    shapeParams.coeff.push(cachedCoeff[shapeParams.coeff.length]);
  }
  while (shapeParams.coeffCount < shapeParams.coeff.length) {
    cachedCoeff[shapeParams.coeff.length-1] = shapeParams.coeff.pop();
  }

  var c = leftgui.__folders.Shape.__folders.Coefficients.closed;
  leftgui.__folders.Shape.__folders.Coefficients.close();
  leftgui.__folders.Shape.__folders.Coefficients.domElement.parentNode.parentNode.removeChild(leftgui.__folders.Shape.__folders.Coefficients.domElement.parentNode);
  leftgui.__folders.Shape.__folders.Coefficients = undefined;
  leftgui.__folders.Shape.onResize();
  var subFolder = leftgui.__folders.Shape.addFolder('Coefficients');
  for (var i=0; i<shapeParams.coeffCount; i++) {
    subFolder.add(shapeParams.coeff, i, shapeParams[i]).onChange( setScalarFieldDirty );
  }
  if (!c || typeof c == 'undefined') {
    subFolder.open();
  } else {
    subFolder.close();
  }
}

function dimensionsChanged() {
  n = shapeParams.dimensions;
  resetOrientation();
  resetWorker(shapeParams.resolution);
  buildRightGUI();
}

function shapeFolder(g) {
  var folder = g.addFolder('Shape');
  folder.add(shapeParams, 'editorWidth').min(0).max(window.innerWidth*0.5 /* - Math.min(245, 2*parseInt(leftgui.domElement.style.width)) */).step(1).onFinishChange( updateEditor );
  folder.add(shapeParams, 'resolution').min(0).max(65).step(1).onFinishChange( setSizeDirty );
  folder.add(shapeParams, 'reset').name('Abort').onChange( resetWorker10 );
  folder.add(shapeParams, 'memoryOveruse').min(0).max(1).step(0.01);
  folder.add(shapeParams, 'interpolate').onChange( setMeshDirty );
  folder.add(shapeParams, 'iso').onChange( setMeshDirty );
  folder.add(shapeParams, 'dimensions').min(3).step(1).onFinishChange( dimensionsChanged );
  folder.add(shapeParams, 'coeffCount').min(1).max(shapeParams.maxCoeffCount).step(1).onChange( updateCoeff );
  var subFolder = folder.addFolder('Coefficients');
  for (var i=0; i<shapeParams.coeffCount; i++) {
    subFolder.add(shapeParams.coeff, i, shapeParams[i]).onChange( setScalarFieldDirty );
  }
  subFolder.open();
}

function cameraFolder(g) {
  var folder = g.addFolder('Camera');
  folder.add(cameraParams, 'perspective').onChange( changeCamera );
  if (cameraParams.perspective) {
    folder.add(cameraParams, 'fov').min(0.05).max(179.95).onChange( makeCamera );
  } else {
    folder.add(cameraParams, 'scale').min(0.05).onChange( makeCamera );
  }
  folder.add(cameraParams, 'radius').min(0).max(10).step(0.01);
  folder.add(cameraParams, 'speed').min(0).max(10).step(0.01);
  folder.add(cameraParams, 'axes');
  folder.addColor(cameraParams, 'background').onChange( updateBackground ).listen();
  folder.add(cameraParams, 'fps').onChange( updateStats );
}

function toggleNormals() { // This might make the mesh invisible... best to do that when they click it and not when they change the iso next...
  setMeshDirty();
  updateMaterial();
}

function materialFolder(g) {
  var folder = g.addFolder('Material');
  folder.add(materialParams, 'calcNormals').onChange( toggleNormals );
	folder.add(materialParams, 'material', {Basic:0, Depth:1, /*Face:2,*/ Lambert:3, Normals:4, Phong:5}).onChange( updateMaterial );
	folder.add(materialParams, 'blending', {None:THREE.NoBlending, Standard:THREE.NormalBlending, Additive:THREE.AdditiveBlending, Subtractive:THREE.SubtractiveBlending, Multiplicative:THREE.MultiplyBlending, Custom:THREE.CustomBlending}).onChange( updateMaterial );
	folder.add(materialParams, 'side', {Front:THREE.FrontSide, Back:THREE.BackSide, Both:THREE.DoubleSide}).onChange( updateMaterial );
	folder.add(materialParams, 'wireframe').onChange( updateMaterial );
  folder.add(materialParams, 'opacity').min(0).max(1).step(0.01).onChange( updateMaterial );
	folder.add(materialParams, 'depthTest').onChange( updateMaterial );
	folder.add(materialParams, 'depthWrite').onChange( updateMaterial );
  folder.add(materialParams, 'equation', {Add:THREE.AddEquation, Subtract:THREE.SubtractEquation, ReverseSubtract:THREE.ReverseSubtractEquation, Min:THREE.MinEquation, Max:THREE.MaxEquation}).onChange( updateMaterial );

}

// /////////////////////////////

function buildRightGUI() {
  if (typeof rightgui == 'undefined') {
    var closedState = {Transforms: true};
  } else {
    //for (obj in rightgui.__folders) { ... }
    var closedState = { Transforms: rightgui.__folders.Transforms.closed };
    rightgui.destroy();
  }
  rightgui = new dat.GUI();

  rightgui.add(transformParams, 'zoom').min(0).onChange( setCoordsDirty );

  transformsFolder(rightgui);
  rightgui.__folders.Transforms.closed = closedState.Transforms;

	for (i=0; i<transforms.length; i++) {
		switch (transforms[i].type) {
			case "0": // EULER ROTATION
				var folder = rightgui.addFolder((i+1)+' Euler Rotation');
				folder.add(transforms[i], 'type', {Rotation:0, Scaling:1, Translation:2, Shear:3}).onChange( updateTransformType );
				folder.add(transforms[i], 'axis1').min(0).max(n-1).step(1).onChange( setCoordsDirty );
				folder.add(transforms[i], 'axis2').min(0).max(n-1).step(1).onChange( setCoordsDirty );
				folder.add(transforms[i], 'degrees').min(-180).max(180).onChange( setCoordsDirty );
			break;
			case "1": // SCALE
				var folder = rightgui.addFolder((i+1)+' Scale');
				folder.add(transforms[i], 'type', {Rotation:0, Scaling:1, Translation:2, Shear:3}).onChange( updateTransformType );
        for (var k=0; k<n; k++) folder.add(transforms[i].s, k, transforms[i].s[k]).min(-Infinity).onChange(setCoordsDirty);
			break;
			case "2": // TRANSLATE
				var folder = rightgui.addFolder((i+1)+' Translation');
				folder.add(transforms[i], 'type', {Rotation:0, Scaling:1, Translation:2, Shear:3}).onChange( updateTransformType );
        for (var k=0; k<n; k++) folder.add(transforms[i].d, k, transforms[i].d[k]).min(-Infinity).name('Dimension '+(k+1).toString()).onChange(setCoordsDirty);
			break;
			case "3": // SHEAR
				var folder = rightgui.addFolder((i+1)+' Shear');
				folder.add(transforms[i], 'type', {Rotation:0, Scaling:1, Translation:2, Shear:3}).onChange( updateTransformType );
				folder.add(transforms[i], 'row').min(0).max(n-1).step(1).onChange( setCoordsDirty );
				folder.add(transforms[i], 'col').min(0).max(n-1).step(1).onChange( setCoordsDirty );
				folder.add(transforms[i], 'shear').onChange( setCoordsDirty );
			break;
			default: // error!
				console.log('error in switch in buildGUI()');
		}
		if (i==transforms.length-1) {
			folder.open();
		}
	}

  adjustRightGUI();
}

function transformsFolder(g) {
  var folder = g.addFolder('Transforms');
  folder.add(transformParams, 'invertOrder').onChange( invertOrder );
  folder.add(transformParams, 'pushTransform').onChange( pushTransform );
  folder.add(transformParams, 'popTransform').onChange( popTransform );
  folder.add(transformParams, 'applyTransforms').onChange( applyTransforms );
  folder.add(transformParams, 'popAllOnApply');
  folder.add(transformParams, 'resetOrientation').onChange( resetOrientation );
  folder.add(transformParams, 'popAllTransforms').onChange( popAllTransforms );
}

function adjustRightGUI() {
  rightgui.domElement.style.position = 'fixed';
  rightgui.domElement.style.left = (window.innerWidth - parseInt(rightgui.domElement.style.width)).toString() + 'px';
  rightgui.domElement.style.height = (window.innerHeight - 50).toString() + 'px';
}

// /////////////////////////////

function buildGUI() {
  buildLeftGUI();
  buildRightGUI();
  updateEditor();
}
