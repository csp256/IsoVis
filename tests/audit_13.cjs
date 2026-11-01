const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = (extra = {}) => { const c = vm.createContext({console: {log(){},time(){},timeEnd(){}}, ...extra}); c.self=c; return c; };
const load = (c, path) => vm.runInContext(fs.readFileSync(path, 'utf8'), c, {filename: path});
const worker = () => {
 const c = context(); c.self = c;
 const html = fs.readFileSync('isovis.html', 'utf8');
 for (const id of ['worker', 'marching_cubes']) {
  vm.runInContext(html.match(new RegExp(`<script type='text/worker' id='${id}'>([\\s\\S]*?)</script>`))[1], c);
 }
 return c;
};

const c=context({my_material:undefined, document:{}, title:'IsoVis', waiting_for_web_worker:Array(8).fill(false),
 vertex_buffer:[],face_buffer:[],normal_buffer:[],reset_scenes(){},the_bounding_sphere:{}});
c.THREE=require('../lib/three-r187/three.module.js'); load(c,'js/worker_interface.js');load(c,'js/isovis.js');
vm.runInContext('reset_scenes = function() {}; update_scene_mesh = function() {};',c);c.meshes=Array.from({length:8},()=>new c.THREE.Mesh(new c.THREE.BufferGeometry()));
let disposed=0;
c.meshes.forEach(m=>{m.geometry.setAttribute('position',new c.THREE.BufferAttribute(new Float32Array(3),3));
 m.geometry.setIndex(new c.THREE.BufferAttribute(new Float32Array(3),3));
 m.geometry.setAttribute('normal',new c.THREE.BufferAttribute(new Float32Array(3),3));});
for(let j=0;j<16;j++) {const m=c.meshes[j%8], old=m.geometry, buffer=old.attributes.position.array.buffer;
 old.addEventListener('dispose',()=>disposed++);
 c.handle_worker_message({data:{num:j%8,vertex_count:1,index_count:3,buffers:[new ArrayBuffer(12),new ArrayBuffer(12),new ArrayBuffer(12)]}});
 assert.equal(c.vertex_buffer[j%8],buffer); assert.equal(buffer.byteLength,12);
}
assert.equal(disposed,16);
c.material_params={material:0};c.update_material();
for(let j=0;j<10;j++){const old=c.my_material;old.addEventListener('dispose',()=>disposed++);c.update_material();
 assert(c.meshes.every(m=>m.material===c.my_material));}
assert.equal(disposed,26);
