const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
function target() {
 const listeners=new Map();
 return {listeners,style:{},clientWidth:800,clientHeight:600,setPointerCapture(){},releasePointerCapture(){},
 addEventListener(t,f){if(!listeners.has(t))listeners.set(t,new Set());listeners.get(t).add(f);},
 removeEventListener(t,f){listeners.get(t)?.delete(f);},count(){return [...listeners.values()].reduce((n,s)=>n+s.size,0);}};
}
(async()=>{
 const THREE=await import('../lib/three-r187/three.module.js');
 // Resolve the browser import-map entry for this test only, without editing the
 // upstream file or introducing a node_modules/package-manager dependency.
 const source=fs.readFileSync('lib/three-r187/OrbitControls.js','utf8').replace("from 'three'",`from ${JSON.stringify(pathToFileURL(path.resolve('lib/three-r187/three.module.js')).href)}`);
 const {OrbitControls}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const dom=target(),document=target(),window=target();dom.ownerDocument=document;
 for(let i=0;i<5;i++) {
  const camera=new THREE.PerspectiveCamera();camera.position.set(15,15,15);
  const ctl=new OrbitControls(camera,dom);ctl.listenToKeyEvents(window);
  assert.equal(dom.count(),4);assert.equal(window.count(),1);assert.equal(document.count(),1);
  [...dom.listeners.get('pointerdown')][0]({pointerId:1,pointerType:'mouse',button:0,clientX:10,clientY:10,preventDefault(){}});
  assert.equal(document.count(),3);ctl.dispose();ctl.dispose();
  assert.equal(dom.count()+document.count()+window.count(),0);
 }
 assert.match(fs.readFileSync('js/camera.js','utf8'),/controls.dispose\(\)/);
})().catch(error=>{console.error(error);process.exitCode=1;});
