function initParams() {
  this.n = 5;

  this.shapeParams = {
    editCode: false,
    editorWidth: (window.innerWidth*0.25),
		resolution: 25,
    reset: false,
		iso: 5,
		parameters: [],
    maxCoeffCount: 32,
    coeffCount: 5,
    coeff: [3.5, 3, 1.5, 3, 0],
	};
  this.cachedCoeff = new Array(shapeParams.maxCoeffCount);
  for (var i=0; i<shapeParams.maxCoeffCount; i++) {
    cachedCoeff[i] = 0;
  }

  this.cameraParams = {
    perspective: true,
    fov: 45,
    scale: 1,
    wobble: true,
    radius: 1,
		speed: 1,
    axes: true,
    background: "#001122",
    fps: true,
  };

  this.materialParams = {
    material: 4,
		opacity: 0.15,
		side: 0,
		blending: 2,
		equation: 0,
		depthTest: false,
		depthWrite: false,
		wireframe: true,
		coordinates: true,
		values: true,
		geometry: true,
  }

  this.transformParams = {
    zoom: 1.5,
    invertOrder: false,
    pushTransform: false,
    popTransform: false,
    applyTransforms: false,
    popAllOnApply: true,
    resetOrientation: false,
    popAllTransforms: false,
  };

	//	params[parameters + ] 3 );
	//params.parameters.push( 3.5 );
	//params.parameters.push( 3 );
	//params.parameters.push( 1.5 );
	//params.parameters.push( 0 );
}
