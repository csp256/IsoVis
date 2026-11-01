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

let input, resets=0;const c=context({default_text:()=> 'default',before_change_callback(){},my_code_mirror:{off(){},on(){},setValue(){}},window:{prompt:()=>input},reset_worker(){resets++;},update_material(){},update_background(){}});
load(c,'lib/numeric-1.2.6.js');load(c,'js/params.js');load(c,'js/transforms.js');load(c,'js/export_import.js');
c.init_params();vm.runInContext('transforms=[plain_transform()];base_orientation=numeric.identity(n+1);',c);
input=JSON.stringify([{name:'shape_params',data:{dimensions:7}}]);c.import_from_json();
assert.equal(c.n,7);assert.equal(c.base_orientation.length,8);assert.equal(c.transforms[0].s.length,7);
assert.equal(c.transforms[0].s[6],1);assert.equal(c.transforms[0].d[6],0);
const saved=JSON.stringify(c.shape_params);
for(const data of [{dimensions:2},{dimensions:3.5},{dimensions:7,resolution:-1},{coeff:[1,null]}]) {
 input=JSON.stringify([{name:'shape_params',data}]);assert.throws(()=>c.import_settings(input));assert.equal(JSON.stringify(c.shape_params),saved);
}
let t=JSON.parse(JSON.stringify(c.transforms[0]));t.axis1=8;
input=JSON.stringify([{name:'shape_params',data:{dimensions:4}},{name:'transforms',data:[t]}]);
assert.throws(()=>c.import_settings(input));assert.equal(c.n,7);
input=JSON.stringify([{name:'shape_params',data:{dimensions:3}}]);c.import_from_json();
assert.equal(c.n,3);assert.equal(c.base_orientation.length,4);assert.equal(c.transforms[0].d.length,3);assert.equal(resets,2);

input=JSON.stringify([{name:'shape_params',data:{coeff:[1,2],coeff_count:2}}]);c.import_from_json();assert.equal(c.shape_params.coeff_count,2);
