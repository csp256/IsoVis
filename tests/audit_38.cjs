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

for(const fails of [false,true]) {
 let created=0,revoked=0;
 const c=context({window:{URL:{createObjectURL(){created++;return 'blob:test';},revokeObjectURL(url){assert.equal(url,'blob:test');revoked++;}},Blob:class{},Worker:class{constructor(url){assert.equal(url,'blob:test');if(fails)throw Error('construction failed');}}}});
 load(c,'js/worker_interface.js');
 for(let i=0;i<10;i++){if(fails)assert.throws(()=>c.make_worker('source'));else assert(c.make_worker('source'));}
 assert.equal(created,10);assert.equal(revoked,10);
}
