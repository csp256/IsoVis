const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = (extra = {}) => { const c = vm.createContext({console: {log(){},time(){},timeEnd(){}}, ...extra}); c.self=c; return c; };
const load = (c, path) => vm.runInContext(fs.readFileSync(path, 'utf8'), c, {filename: path});
const worker = () => {
 const c = context(); c.self = c;
 const html = fs.readFileSync('IsoVis.html', 'utf8');
 for (const id of ['worker', 'marchingCubes']) {
  vm.runInContext(html.match(new RegExp(`<script type='text/worker' id='${id}'>([\\s\\S]*?)</script>`))[1], c);
 }
 return c;
};

const c=context({myMaterial:undefined, document:{}, title:'IsoVis', waitingForWebWorker:Array(8).fill(false),
 vertexBuffer:[],faceBuffer:[],normalBuffer:[],resetScenes(){},theBoundingSphere:{}});
load(c,'lib/three.min.js'); load(c,'js/workerInterface.js');load(c,'js/isovis.js');
c.resetScenes=()=>{};c.meshes=Array.from({length:8},()=>new c.THREE.Mesh(new c.THREE.BufferGeometry()));
let disposed=0;
c.meshes.forEach(m=>{m.geometry.addAttribute('position',new c.THREE.BufferAttribute(new Float32Array(3),3));
 m.geometry.setIndex(new c.THREE.BufferAttribute(new Float32Array(3),3));
 m.geometry.addAttribute('normal',new c.THREE.BufferAttribute(new Float32Array(3),3));});
for(let j=0;j<16;j++) {const m=c.meshes[j%8], old=m.geometry, buffer=old.attributes.position.array.buffer;
 old.addEventListener('dispose',()=>disposed++);
 c.handleWorkerMessage({data:{num:j%8,buffers:[new ArrayBuffer(12),new ArrayBuffer(12),new ArrayBuffer(12)]}});
 assert.equal(c.vertexBuffer[j%8],buffer); assert.equal(buffer.byteLength,12);
}
assert.equal(disposed,16);
c.materialParams={material:0};c.updateMaterial();
for(let j=0;j<10;j++){const old=c.myMaterial;old.addEventListener('dispose',()=>disposed++);c.updateMaterial();
 assert(c.meshes.every(m=>m.material===c.myMaterial));}
assert.equal(disposed,26);
