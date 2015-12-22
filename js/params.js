function initParams() {
  //this.maxFrameNumber = 180;

  this.shapeParams = {
    editCode: false,
    editorWidth: 340, //(window.innerWidth*0.25),
		resolution: 30,
    reset: false,
    dimensions: 5,
    memoryOveruse: 0.5,
		iso: 5,
		parameters: [],
    interpolate: true,
    maxCoeffCount: 32,
    coeffCount: 6,
    coeff: [3.5, 3, 1.5, 3, -1, 2],
	};
  this.n = shapeParams.dimensions; // n was used in an earlier version, as a constant; consider it a relic that is not worth cleaning up.
  this.cachedCoeff = new Array(shapeParams.maxCoeffCount);
  for (var i=0; i<shapeParams.maxCoeffCount; i++) {
    cachedCoeff[i] = 0;
  }

  this.cameraParams = {
    perspective: true,
    fov: 50,
    scale: 1,
    wobble: true,
    radius: 1,
		speed: 1,
    axes: true,
    background: "#001122",
    fps: true,
  };

  this.materialParams = {
    calcNormals: true,
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
    zoom: 1.4,
    invertOrder: false,
    pushTransform: false,
    popTransform: false,
    applyTransforms: false,
    popAllOnApply: true,
    resetOrientation: false,
    popAllTransforms: false,
  };
}
