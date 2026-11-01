const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = (extra = {}) => { const c = vm.createContext({console: {log(){},time(){},timeEnd(){}}, ...extra}); c.self=c; return c; };
const load = (c, path) => vm.runInContext(fs.readFileSync(path, 'utf8'), c, {filename: path});
const worker = () => {
 const c = context(); c.self = c;
 const html = fs.readFileSync('IsoVis.html', 'utf8');
 for (const id of ['defaultFieldSource', 'worker', 'marchingCubes']) {
  if (id === 'defaultFieldSource' && !html.includes("id='defaultFieldSource'")) continue;
  vm.runInContext(html.match(new RegExp(`<script[^>]* id='${id}'>([\\s\\S]*?)</script>`))[1], c);
 }
 return c;
};

const c=worker();load(c,'js/editor.js');
c.n=5;c.size3=3;c.values=new Float32Array(3);
const x=new Float32Array([1,2,3,4,1, 2,3,4,5,2, 3,4,5,6,3]), coeff=[1,2,3,4,5,6];
c.defaultField()(x,coeff);const expected=Array.from(c.values);
const text=c.defaultText(), body=text.slice(text.indexOf('{')+1,text.lastIndexOf('}'));
c.values.fill(0);vm.runInContext('submitted = new Function("x","c",'+JSON.stringify(body)+');',c);
c.submitted(x,coeff);assert.deepEqual(Array.from(c.values),expected);
assert.match(fs.readFileSync('js/isovis.js','utf8'),/gatherWorkerResource\('defaultFieldSource'\)/);
