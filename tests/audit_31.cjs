const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = (extra = {}) => { const c = vm.createContext({console: {log(){},time(){},timeEnd(){}}, ...extra}); c.self=c; return c; };
const load = (c, path) => vm.runInContext(fs.readFileSync(path, 'utf8'), c, {filename: path});
const worker = () => {
 const c = context(); c.self = c;
 const html = fs.readFileSync('isovis.html', 'utf8');
 for (const id of ['default_field_source', 'worker', 'marching_cubes']) {
  if (id === 'default_field_source' && !html.includes("id='default_field_source'")) continue;
  vm.runInContext(html.match(new RegExp(`<script[^>]* id='${id}'>([\\s\\S]*?)</script>`))[1], c);
 }
 return c;
};

let resets=0;const c=context({set_coords_dirty(){},reset_worker(){resets++;},report_worker_error(){},});
load(c,'lib/numeric-1.2.6.js');load(c,'js/params.js');load(c,'js/transforms.js');load(c,'js/ui.js');
vm.runInContext('build_left_gui=function() {};init_params();base_orientation=numeric.identity(n+1);transforms=[plain_transform(),plain_transform(),plain_transform(),plain_transform()];transforms.forEach(function(t,i){t.type=String(i);t.axis1=4;});',c);
vm.runInContext('shape_params.dimensions=7;',c);c.dimensions_changed();assert.equal(c.transforms[1].s.length,7);assert.equal(c.transforms[1].s[6],1);assert.equal(c.transforms[2].d[6],0);
assert(c.compute_full_transform().flat().every(Number.isFinite));
vm.runInContext('shape_params.dimensions=3;',c);c.dimensions_changed();assert.equal(c.transforms[0].axis1,2);assert.equal(c.transforms[1].s.length,3);assert(c.compute_full_transform().flat().every(Number.isFinite));assert.equal(c.base_orientation.length,4);
const before=JSON.stringify(c.transforms);vm.runInContext('shape_params.dimensions=2.5;',c);c.dimensions_changed();assert.equal(c.n,3);assert.equal(c.shape_params.dimensions,3);assert.equal(JSON.stringify(c.transforms),before);assert.equal(resets,2);
assert.match(fs.readFileSync('js/export_import.js','utf8'),/normalized_transform_stack\(stack, dimensions, explicit_stack\)/);
