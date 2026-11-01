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

const c=context();c.THREE=require('../lib/three-r187/three.module.js');load(c,'js/isovis.js');
c.lights=Array.from({length:8},()=>new c.THREE.PointLight());
c.meshes=Array.from({length:8},()=>new c.THREE.Mesh());c.reset_scenes();
const scenes=c.scenes.slice(), lights=scenes.map(s=>s.children.slice(0,8));
for(let cycle=0;cycle<5;cycle++)for(let i=0;i<8;i++) {
 const m=new c.THREE.Mesh(); c.update_scene_mesh(i,m);c.reset_scenes();
 assert.equal(c.scenes[i],scenes[i]); assert.equal(scenes[i].children.length,9);
 assert.equal(scenes[i].children[8],m); lights[i].forEach((l,k)=>assert.equal(scenes[i].children[k],l));
}
assert.match(fs.readFileSync('js/worker_interface.js','utf8'),/update_scene_mesh\(octant, m\)/);
