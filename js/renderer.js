// Keep the r73 display convention deliberately: do not silently re-grade saved
// scenes while migrating the renderer. A modern color workflow is separate work.
function createRenderer() {
  var canvas = document.createElement('canvas');
  var context = canvas.getContext('webgl2', {antialias:true, preserveDrawingBuffer:true});
  if (!context) throw new Error('WebGL2 is required. Enable hardware acceleration or use a browser/device with WebGL2 support.');
  THREE.ColorManagement.enabled = false;
  var result = new THREE.WebGLRenderer({canvas:canvas, context:context, antialias:true, preserveDrawingBuffer:true});
  result.outputColorSpace = THREE.LinearSRGBColorSpace;
  result.toneMapping = THREE.NoToneMapping;
  return result;
}

function showStartupError(message) {
  var box = document.getElementById('startupError');
  if (!box) {
    box = document.createElement('div');
    box.id = 'startupError';
    box.setAttribute('role', 'alert');
    box.style.cssText = 'position:fixed;top:0;left:0;z-index:10001;background:#500;color:white;padding:16px';
    document.body.appendChild(box);
  }
  box.textContent = 'IsoVis could not start: ' + message;
}

// MeshDepthMaterial changed its display formula since r73. Preserve the saved
// "Depth" view with a tiny application shader, not a patch to upstream Three.js.
function createDepthDisplayMaterial() {
  var material = new THREE.ShaderMaterial({
    uniforms: {mNear:{value:0.1}, mFar:{value:20000000}, alpha:{value:1}},
    vertexShader: 'void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float mNear; uniform float mFar; uniform float alpha;\n' +
      'void main() { float depth = gl_FragCoord.z / gl_FragCoord.w;\n' +
      'float color = 1.0 - smoothstep(mNear, mFar, depth); gl_FragColor = vec4(vec3(color), alpha); }'
  });
  material.onBeforeRender = function(renderer, scene, camera) {
    this.uniforms.mNear.value = camera.near;
    this.uniforms.mFar.value = camera.far;
    this.uniforms.alpha.value = this.opacity;
    this.uniformsNeedUpdate = true;
  };
  return material;
}
