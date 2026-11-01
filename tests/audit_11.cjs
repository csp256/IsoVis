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

const c=worker();load(c,'js/editor.js');const coeff=[1,2,3,4,5,6];
for(const n of [3,4,5,7]) {
 c.n=n;c.size3=3;c.values=new Float32Array(3);
 const points=Array.from({length:3},(_,i)=>Array.from({length:n},(_,j)=>i+j+1));
 c.default_field()(Float32Array.from(points.flat()),coeff);
 for(let i=0;i<3;i++) {
  const p=points[i],t=Math.sqrt(Math.abs(p[0]**2+p[1]**2-coeff[0]))-coeff[1];
  const u=Math.sqrt(Math.abs(p[2]**2+(p[3]||0)**2-coeff[2]))-coeff[3];
  assert.equal(c.values[i],Math.fround(t*t+u*u-(n>4?coeff[4]*Math.sin(coeff[5]*p[4]):0)));
  assert(Number.isFinite(c.values[i]));
 }
}
