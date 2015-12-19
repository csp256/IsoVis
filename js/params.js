function initParams() {
  this.n = 5;

  this.shapeParams = {
    editCode: false,
    editorWidth: (window.innerWidth*0.25),
		resolution: 30,
    reset: false,
		iso: 5,
		parameters: [],
    interpolate: true,
    maxCoeffCount: 32,
    coeffCount: 6,
    coeff: [3.5, 3, 1.5, 3, 1, 2],
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
    zoom: 1.5,
    invertOrder: false,
    pushTransform: false,
    popTransform: false,
    applyTransforms: false,
    popAllOnApply: true,
    resetOrientation: false,
    popAllTransforms: false,
  };
}
