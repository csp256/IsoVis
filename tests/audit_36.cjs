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

const w=worker();w.setup(5,3,0);
for(let i=0;i<w.coords.length;i++)w.coords[i]=(i%7)-3;
const defaults=[3.5,3,1.5,3,-1,2];
for(let count=0;count<=6;count++) {
 const coeff=[1,2,3,4,5,6].slice(0,count);const filled=defaults.map((v,i)=>i<count?coeff[i]:v);
 w.default_field()(w.coords,coeff);const actual=Array.from(w.values);
 w.default_field()(w.coords,filled);assert.deepEqual(actual,Array.from(w.values));assert(actual.every(Number.isFinite));assert.equal(coeff.length,count);
}
w.update_field_function({code:'values.fill(c.length);'});w.rebuild_scalar_field([7],0);assert(Array.from(w.values).every(v=>v===1));
const c=context({set_scalar_field_dirty(){c.dirty=true;}});load(c,'js/ui.js');
const folder={closed:false,close(){},open(){},domElement:{parentNode:{parentNode:{removeChild(){}}}},add(){return {onChange(){}};}};
c.shape_params={coeff:[1,2,3],coeff_count:1};c.cached_coeff=[];
c.left_gui={__folders:{Shape:{__folders:{Coefficients:folder},onResize(){},removeFolder(){},addFolder(){return folder;}}}};
c.update_coeff();assert.equal(c.dirty,true);assert.deepEqual(c.shape_params.coeff,[1]);
