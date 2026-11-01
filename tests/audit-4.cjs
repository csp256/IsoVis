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

const w=worker();let reply;w.postMessage=data=>reply=data;
const params={dimensions:5,resolution:3,coeff:[1,2,3,4,5,6],iso:0,interpolate:true,memoryOveruse:0};
const request=(type,code)=>w.onmessage({data:{num:0,n:5,messageType:type,params,R:Array.from({length:6},(_,i)=>Array.from({length:6},(_,j)=>i===j?1:0)),code,
 vertexBuffer:new ArrayBuffer(4),faceBuffer:new ArrayBuffer(4),normalBuffer:new ArrayBuffer(4),calcNormals:false}});
request('init');assert(!reply.error);
request('code','missingFunction();');assert.match(reply.error,/missingFunction/);assert.equal(reply.buffers.length,3);
request('code','values.fill(3);');assert(!reply.error);assert(Array.from(w.values).every(v=>v===3));
request('code','{');assert(reply.error);request('scalarField');assert(!reply.error);assert(Array.from(w.values).every(v=>v===3));
const elements={};const doc={title:'Busy',getElementById:id=>elements[id],createElement:()=>({style:{},setAttribute(){}}),body:{appendChild(el){elements[el.id]=el;}}};
const c=context({workerSourceString:'source',document:doc,title:'IsoVis',waitingForWebWorker:Array(8).fill(false),vertexBuffer:[],faceBuffer:[],normalBuffer:[]});
load(c,'js/workerInterface.js');let terminated=0;
c.newWorker=()=>({terminate(){terminated++;}});vm.runInContext('makeWorker=function(){return newWorker();};',c);
c.workers=Array.from({length:8},()=>c.newWorker());c.meshes=Array.from({length:8},()=>({geometry:{marker:true}}));
const old=c.meshes[0];c.waitingForWebWorker[0]=true;c.handleWorkerMessage({data:{num:0,error:'bad function',buffers:reply.buffers}});
assert.equal(c.meshes[0],old);assert.equal(c.waitingForWebWorker[0],false);assert.match(elements.workerError.textContent,/bad function/);
for(const event of ['onerror','onmessageerror']) {
 const worker=c.workers[0];c.bindWorkerEvents(worker,0);worker[event]({message:'failed',preventDefault(){}});
 assert.notEqual(c.workers[0],worker);assert.equal(c.vertexBuffer[0].byteLength,4);
 assert.equal(c.waitingForWebWorker[0],false);assert.equal(vm.runInContext('workersNeedInit',c),true);
 worker.onmessage({data:{num:0,error:'stale',buffers:[]}});assert(!elements.workerError.textContent.includes('stale'));
}
assert.equal(terminated,2);
