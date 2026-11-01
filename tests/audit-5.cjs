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

const c=context();load(c,'lib/three.min.js');load(c,'js/workerInterface.js');
function sample(count,extension) {
 c.renderer={extensions:{get:()=>extension}};
 const p=new Float32Array(count*3);p.set([1,2,3],(count-1)*3);
 const index=new Uint32Array([0,1,count-1,123,456,789]);
 const data={vertexCount:count,indexCount:3,buffers:[p.buffer,index.buffer,new Float32Array(count*3).buffer]};
 const g=c.surfaceGeometry(data); assert.equal(g.drawRange.count,3);
 if(count<=65535)assert.equal(g.index.array.BYTES_PER_ELEMENT,2);
 else if(extension)assert.equal(g.index.array.BYTES_PER_ELEMENT,4);
 else {assert.equal(g.index,null);assert.deepEqual(Array.from(g.attributes.position.array.slice(6)),[1,2,3]);}
 if(g.index)assert.deepEqual(Array.from(g.index.array),[0,1,count-1]);
}
sample(3,false);sample(70000,true);sample(70000,false);
const w=worker();w.setup(5,3,0);w.vertexBuffer=new ArrayBuffer(4);w.faceBuffer=new ArrayBuffer(4);w.normalBuffer=new ArrayBuffer(4);
for(let i=0;i<w.size3;i++)w.values[i]=w.points[i*3]-2;
w.marchingCubes(w.points,w.values,0,true,false,0,0.5);
assert(w.activeVertexCount>0);assert(w.activeIndexCount>0);
const faces=new Uint32Array(w.faceBuffer,0,w.activeIndexCount);
for(const i of faces)assert(i<w.activeVertexCount);
let reply;w.postMessage=data=>reply=data;w.reply(0);
assert.equal(reply.vertexCount,w.activeVertexCount);assert.equal(reply.indexCount,w.activeIndexCount);
