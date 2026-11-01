"use strict";
// Generated browser output: edit src/params.ts, then run `just build`.
// Shared numeric invariants for controls, saved settings and dispatch.
function require_resolution(value) {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 2 || value > 65)
        throw new Error('Resolution must be an integer between 2 and 65');
    return value;
}
function require_zoom(value) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0)
        throw new Error('Zoom must be finite and greater than zero');
    return value;
}
function require_scale(value) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value === 0)
        throw new Error('Scale factors must be finite and nonzero');
    return value;
}
function validate_numeric_settings(shape, transform, stack) {
    require_resolution(shape.resolution);
    require_zoom(transform.zoom);
    stack.forEach(function (t) { t.s.forEach(require_scale); });
}
function init_params() {
    globalThis.shape_params = {
        edit_code: false,
        editor_width: 340, //(window.innerWidth*0.25),
        resolution: 30,
        reset: false,
        dimensions: 5,
        memory_overuse: 0.5,
        iso: 5,
        parameters: [],
        interpolate: true,
        max_coeff_count: 32,
        coeff_count: 6,
        coeff: [3.5, 3, 1.5, 3, -1, 2],
    };
    globalThis.n = shape_params.dimensions; // Shared alias retained until the worker/UI migration.
    globalThis.cached_coeff = new Array(shape_params.max_coeff_count);
    for (let i = 0; i < shape_params.max_coeff_count; i++) {
        cached_coeff[i] = 0;
    }
    globalThis.camera_params = {
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
    globalThis.material_params = {
        calc_normals: true,
        material: 4,
        opacity: 0.15,
        side: 0,
        blending: 2,
        equation: 0,
        depth_test: false,
        depth_write: false,
        wireframe: true,
        coordinates: true,
        values: true,
        geometry: true,
    };
    globalThis.transform_params = {
        zoom: 1.4,
        invert_order: false,
        push_transform: false,
        pop_transform: false,
        apply_transforms: false,
        pop_all_on_apply: true,
        reset_orientation: false,
        pop_all_transforms: false,
    };
}
// Numeric URL input is untrusted. Fall back without leaving partial GUI state.
function get_url_resolution(fallback) {
    require_resolution(fallback);
    try {
        const text = getURLParameter('resolution');
        if (text === null)
            return fallback;
        if (!/^\d+$/.test(text))
            throw new Error('Invalid resolution URL parameter');
        return require_resolution(Number(text));
    }
    catch (error) {
        console.warn('Ignoring invalid resolution URL parameter:', error instanceof Error ? error.message : String(error));
        return fallback;
    }
}
