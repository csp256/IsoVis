// A narrow bridge lets the existing plain scripts remain unchanged. Upstream
// modules are pristine; there is no package manager, CDN, or bundling step.
async function start_iso_vis() {
  try {
    const three = await import('three');
    const {OrbitControls} = await import('../lib/three-r187/OrbitControls.js');
    window.THREE = {...three, OrbitControls};
    init_params();
    init();
    animate();
  } catch (error) {
    if (typeof workers !== 'undefined') workers.forEach(worker => worker.terminate());
    if (typeof controls !== 'undefined') controls.dispose();
    if (typeof window_resize !== 'undefined' && window_resize) window_resize.stop();
    if (typeof renderer !== 'undefined' && renderer) renderer.dispose();
    if (typeof keyboard !== 'undefined') keyboard.destroy();
    show_startup_error(error.message);
    console.error(error);
  }
}
start_iso_vis();
