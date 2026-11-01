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

function target() {
 const listeners = new Map();
 return {listeners, addEventListener(t,f){ if(!listeners.has(t))listeners.set(t,new Set()); listeners.get(t).add(f); },
 removeEventListener(t,f){ listeners.get(t)?.delete(f); }, count(){return [...listeners.values()].reduce((n,s)=>n+s.size,0);}};
}
const dom=target(), document=target(), window=target();
const c=context({document,window}); load(c,'lib/three.min.js');load(c,'lib/OrbitControls.js');
for(let i=0;i<5;i++) {
 const camera=new c.THREE.PerspectiveCamera(); camera.position.set(15,15,15);
 const ctl=new c.THREE.OrbitControls(camera,dom); assert.equal(dom.count(),4);assert.equal(window.count(),2);
 const down=[...dom.listeners.get('mousedown')][0];down({button:0,clientX:0,clientY:0,preventDefault(){}});
 assert.equal(document.count(),2);ctl.dispose();ctl.dispose();
 assert.equal(dom.count()+document.count()+window.count(),0);
}
assert.match(fs.readFileSync('js/camera.js','utf8'), /controls.dispose\(\)/);
