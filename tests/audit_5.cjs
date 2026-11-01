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

const c=context();c.THREE=require('../lib/three-r187/three.module.js');load(c,'js/worker_interface.js');
function sample(count) {
 c.renderer={extensions:{get(){throw Error('WebGL1 extension must not be queried');}}};
 const p=new Float32Array(count*3);p.set([1,2,3],(count-1)*3);
 const index=new Uint32Array([0,1,count-1,123,456,789]);
 const data={vertex_count:count,index_count:3,buffers:[p.buffer,index.buffer,new Float32Array(count*3).buffer]};
 const g=c.surface_geometry(data); assert.equal(g.drawRange.count,3);
 if(count<=65535)assert.equal(g.index.array.BYTES_PER_ELEMENT,2);
 else assert.equal(g.index.array.BYTES_PER_ELEMENT,4);
 if(g.index)assert.deepEqual(Array.from(g.index.array),[0,1,count-1]);
}
sample(3);sample(65535);sample(65536);sample(70000);
const w=worker();w.setup(5,3,0);w.vertex_buffer=new ArrayBuffer(4);w.face_buffer=new ArrayBuffer(4);w.normal_buffer=new ArrayBuffer(4);
for(let i=0;i<w.size3;i++)w.values[i]=w.points[i*3]-2;
w.marching_cubes(w.points,w.values,0,true,false,0,0.5);
assert(w.active_vertex_count>0);assert(w.active_index_count>0);
const faces=new Uint32Array(w.face_buffer,0,w.active_index_count);
for(const i of faces)assert(i<w.active_vertex_count);
let reply;w.postMessage=data=>reply=data;w.reply(0);
assert.equal(reply.vertex_count,w.active_vertex_count);assert.equal(reply.index_count,w.active_index_count);

// Odd triangle counts yield a six-byte Uint16 upload: never recycle that as
// Uint32 storage. Keep/reuse the original worker transfer buffer instead.
c.document={};c.title='IsoVis';c.waiting_for_web_worker=Array(8).fill(false);
c.vertex_buffer=[];c.face_buffer=[];c.normal_buffer=[];c.the_bounding_sphere={};c.my_material=new c.THREE.MeshBasicMaterial();
c.meshes=Array.from({length:8},()=>{const g=new c.THREE.BufferGeometry();
 g.setAttribute('position',new c.THREE.BufferAttribute(new Float32Array(9),3));
 g.setAttribute('normal',new c.THREE.BufferAttribute(new Float32Array(9),3));
 g.setIndex(new c.THREE.BufferAttribute(new Uint16Array([0,1,2]),1));return new c.THREE.Mesh(g);});
vm.runInContext('reset_scenes=function() {}; update_scene_mesh=function() {}; dispatch_pending_work=function() {};',c);
let previous;
for(let i=0;i<3;i++) {
 const faces=new Uint32Array([0,1,2]);
 c.handle_worker_message({data:{num:0,vertex_count:3,index_count:3,buffers:[new Float32Array(9).buffer,faces.buffer,new Float32Array(9).buffer]}});
 assert.equal(c.meshes[0].geometry.index.array.byteLength,6);
 if(previous)assert.equal(c.face_buffer[0],previous);
 assert.doesNotThrow(()=>new Uint32Array(c.face_buffer[0]));previous=faces.buffer;
}
