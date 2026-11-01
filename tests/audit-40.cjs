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

let id=0,saved=0;const timers=new Map();
const c=context({Blob,setTimeout(fn,delay){timers.set(++id,{fn,delay});return id;},clearTimeout(i){timers.delete(i);},
 waitingForAnyWebWorker:()=>false,pendingWorkerStage:null,makingGIF:true,doneWithGIF:false,waitingForNextFrame:false,startFrame:0,
 renderer:{domElement:{toDataURL:()=> 'data:text/plain,hello'}},saveAs(){saved++;},reportWorkerError(){},camera:{position:{}},cameraParams:{}});
load(c,'js/exportImport.js');
function fire(){const [i,t]=timers.entries().next().value;timers.delete(i);t.fn();return t.delay;}
c.scheduleGIFCapture();c.scheduleGIFCapture();assert.equal(timers.size,1);assert.equal(saved,0);assert.equal(fire(),2000);assert.equal(saved,1);assert.equal(timers.size,1);
c.stopGIF();assert.equal(timers.size,0);assert.equal(c.makingGIF,false);assert.equal(c.waitingForNextFrame,false);
c.startGIF();c.scheduleGIFCapture();c.stopGIF();assert.equal(timers.size,0);assert.equal(saved,1);
c.startGIF();c.scheduleGIFCapture();vm.runInContext('waitingForAnyWebWorker=function(){return true;};',c);fire();assert.equal(saved,1);assert.equal(c.waitingForNextFrame,false);
assert(!fs.readFileSync('js/isovis.js','utf8').includes('setTimeout(makeGIF()'));
