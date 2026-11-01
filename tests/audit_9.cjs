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

let input,exported,editor;
const c=context({window:{prompt:(message,value)=>message.startsWith('Copy')?(exported=value):input},
 reset_worker(){},update_material(){},update_background(){},before_change_callback(){},default_text:()=> 'default',
 my_code_mirror:{off(){},on(){},setValue(t){editor=t;}}});
load(c,'lib/numeric-1.2.6.js');load(c,'js/params.js');load(c,'js/transforms.js');load(c,'js/worker_interface.js');load(c,'js/export_import.js');
vm.runInContext('reset_worker=function() {};',c);c.init_params();vm.runInContext('transforms=[plain_transform()];base_orientation=numeric.identity(n+1);base_orientation[0][5]=-4;active_field_source="values.fill(42);";',c);
c.export_to_json();const saved=c.session_from_wire(JSON.parse(exported));assert.equal(saved.version,1);assert.equal(saved.base_orientation[0][5],-4);
for(const modified of [false,true]) {
 vm.runInContext('base_orientation=numeric.identity(n+1);active_field_source=null;',c);
 if(modified)vm.runInContext('base_orientation[1][5]=99;',c);
 input=exported;c.import_from_json();assert.equal(c.base_orientation[0][5],-4);assert.equal(c.base_orientation[1][5],0);
 assert.equal(vm.runInContext('active_field_source',c),'values.fill(42);');assert(editor.includes('values.fill(42);'));
}
const old=JSON.stringify(c.base_orientation);
input=JSON.stringify({...saved,base_orientation:[[1]]});assert.throws(()=>c.import_settings(input));assert.equal(JSON.stringify(c.base_orientation),old);
input=JSON.stringify({...saved,version:20});assert.throws(()=>c.import_settings(input));
input=JSON.stringify(saved.groups);c.import_from_json();assert.equal(c.base_orientation[0][5],0);assert.equal(editor,'default');
