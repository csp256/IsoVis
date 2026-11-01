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

const w=worker();w.setup(5,4,0);w.vertexBuffer=new ArrayBuffer(4);w.faceBuffer=new ArrayBuffer(4);w.normalBuffer=new ArrayBuffer(4);
for (const axis of [0,1,2]) {
 for(let i=0;i<w.size3;i++)w.values[i]=w.points[i*3+axis]-2;
 w.marchingCubes(w.points,w.values,0,true,true,0,0);
 const n=new Float32Array(w.normalBuffer);let active=0;
 for(let i=0;i<n.length;i+=3) {
  if(n[i]||n[i+1]||n[i+2]) {active++;assert(Math.abs(Math.abs(n[i+axis])-1)<1e-6);
   for(let k=0;k<3;k++)if(k!==axis)assert.equal(n[i+k],0);}
 }
 assert(active>0);
 w.marchingCubes(w.points,w.values,0,true,false,0,0);assert(new Float32Array(w.normalBuffer).every(x=>x===0));
}
