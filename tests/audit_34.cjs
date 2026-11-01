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

let input,resets=0,alerts=[];const c=context({window:{prompt:()=>input,alert:m=>alerts.push(m)},reset_worker(){resets++;},update_material(){},update_background(){},
 default_text:()=>'',before_change_callback(){},my_code_mirror:{off(){},on(){},setValue(){}}});
load(c,'lib/numeric-1.2.6.js');load(c,'js/params.js');load(c,'js/transforms.js');load(c,'js/export_import.js');
c.init_params();vm.runInContext('transforms=[plain_transform()];base_orientation=numeric.identity(n+1);active_field_source=null;',c);
const snapshot=()=>vm.runInContext('JSON.stringify([shape_params,camera_params,material_params,transform_params,n,transforms,base_orientation,active_field_source])',c);
const before=snapshot();
const invalid=[
 '{',JSON.stringify([{name:'transform_params',data:{zoom:0}}]),JSON.stringify([{name:'camera_params',data:{fov:'bad'}}]),
 JSON.stringify([{name:'material_params',data:{side:99}}]),JSON.stringify([{name:'shape_params',data:{coeff_count:1}}]),
 JSON.stringify([{name:'camera_params',data:{perspective:'yes'}}]),JSON.stringify([{name:'unknown',data:{}}]),
 '[{"name":"shape_params","data":{"__proto__":{"polluted":true}}}]',
 JSON.stringify([{name:'camera_params',data:{background:'not-a-color'}}]),
 JSON.stringify([{name:'shape_params',data:{memory_overuse:-1}}])
];
for(const text of invalid){assert.throws(()=>c.import_settings(text));assert.equal(snapshot(),before);assert.equal(resets,0);input=text;assert.equal(c.import_from_json(),false);}
assert.equal(alerts.length,invalid.length);
input=JSON.stringify([{name:'shape_params',data:{coeff:[2],coeff_count:1}},{name:'material_params',data:{side:'2'}}]);assert.equal(c.import_from_json(),true);assert.equal(c.shape_params.coeff_count,1);assert.equal(c.material_params.side,2);assert.equal(resets,1);
input=null;assert.equal(c.import_from_json(),false);assert.equal(resets,1);

// GUI enum strings are accepted regardless of the receiving session's state.
c.material_params.side='2';c.material_params.material='4';
c.import_settings(JSON.stringify([{name:'material_params',data:{side:'1',material:'3'}}]));
assert.equal(c.material_params.side,1);assert.equal(c.material_params.material,3);
