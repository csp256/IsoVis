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

const c=context({reportWorkerError(){c.errors++;}});load(c,'js/params.js');load(c,'js/ui.js');c.errors=0;
for(const x of [0,1,1.5,66,NaN,Infinity,'4'])assert.throws(()=>c.requireResolution(x));
for(const x of [2,4,65])assert.equal(c.requireResolution(x),x);
for(const x of [0,-1,Infinity,NaN,'1'])assert.throws(()=>c.requireZoom(x));
for(const x of [0,Infinity,NaN])assert.throws(()=>c.requireScale(x));assert.equal(c.requireScale(-2),-2);
let callback,changes=0,refreshes=0;
const folder={add(){return {onChange(fn){callback=fn;},updateDisplay(){refreshes++;}};}};
const target={scale:2};c.validatedNumberControl(folder,target,'scale',c.requireScale,()=>changes++);
target.scale=0;callback(0);assert.equal(target.scale,2);assert.equal(changes,0);assert.equal(refreshes,1);
target.scale=-3;callback(-3);assert.equal(changes,1);target.scale=NaN;callback(NaN);assert.equal(target.scale,-3);
load(c,'lib/numeric-1.2.6.js');load(c,'js/transforms.js');c.initParams();vm.runInContext('transforms=[plainTransform()];baseOrientation=numeric.identity(n+1);transformParams.zoom=0;',c);
assert.throws(()=>c.computeFullTransform(),/Zoom/);
// Dispatch failure never sends buffers or leaves a busy request.
load(c,'js/workerInterface.js');vm.runInContext('reportWorkerError=function(){errors++;};',c);c.waitingForWebWorker=Array(8).fill(false);c.workers=[];
c.talkToWorker('geometry');assert.equal(vm.runInContext('pendingWorkerStage',c),null);assert(c.waitingForWebWorker.every(x=>!x));assert.equal(c.errors,3);

vm.runInContext('workersNeedInit=true;',c);c.talkToWorker('geometry');assert.equal(vm.runInContext('workersNeedInit',c),true);

let change,finish,finished=0;const object={resolution:4};
const finishFolder={add(){return {onChange(fn){change=fn;},onFinishChange(fn){finish=fn;},updateDisplay(){}};}};
c.validatedNumberControl(finishFolder,object,'resolution',c.requireResolution,()=>finished++,true);
object.resolution=NaN;change(NaN);assert.equal(object.resolution,4);finish();assert.equal(finished,0);
object.resolution=5;change(5);assert.equal(finished,0);finish();assert.equal(finished,1);
