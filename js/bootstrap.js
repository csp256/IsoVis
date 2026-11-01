// A narrow bridge lets the existing plain scripts remain unchanged. Upstream
// modules are pristine; there is no package manager, CDN, or bundling step.
async function startIsoVis() {
  try {
    const Three = await import('three');
    const {OrbitControls} = await import('../lib/three-r187/OrbitControls.js');
    window.THREE = {...Three, OrbitControls};
    initParams();
    init();
    animate();
  } catch (error) {
    if (typeof workers !== 'undefined') workers.forEach(worker => worker.terminate());
    if (typeof controls !== 'undefined') controls.dispose();
    if (typeof windowResize !== 'undefined' && windowResize) windowResize.stop();
    if (typeof renderer !== 'undefined' && renderer) renderer.dispose();
    if (typeof keyboard !== 'undefined') keyboard.destroy();
    showStartupError(error.message);
    console.error(error);
  }
}
startIsoVis();
