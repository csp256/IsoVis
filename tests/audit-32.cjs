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

const c=context({document:{title:''},title:'IsoVis',titleBusy:'Busy',computeFullTransform:()=>[],n:5,shapeParams:{},materialParams:{},
 waitingForWebWorker:Array(8).fill(false),vertexBuffer:Array.from({length:8},()=>new ArrayBuffer(4)),faceBuffer:Array.from({length:8},()=>new ArrayBuffer(4)),normalBuffer:Array.from({length:8},()=>new ArrayBuffer(4))});
load(c,'js/workerInterface.js');let sent=[],installed=[],errors=[];
c.record=d=>installed.push(d.num);c.error=m=>errors.push(m);
vm.runInContext('publishWorkerResult=function(e){record(e.data);};reportWorkerError=function(m){error(m);};',c);
c.workers=Array.from({length:8},()=>({postMessage(d){sent.push({...d});}}));
function reply(id,num,error){return {data:{num,batchId:id,error,buffers:[new ArrayBuffer(4),new ArrayBuffer(4),new ArrayBuffer(4)]}};}
c.talkToWorker('geometry');let id=sent[0].batchId;
for(let i=0;i<7;i++)c.handleWorkerMessage(reply(id,i,i===2?'failed':undefined));assert.deepEqual(installed,[]);
c.handleWorkerMessage(reply(id,7));assert.deepEqual(installed,[]);assert.equal(errors.length,1);assert(c.waitingForWebWorker.every(v=>!v));assert(c.vertexBuffer.every(b=>b.byteLength===4));
c.talkToWorker('geometry');const next=sent[8].batchId;assert(next>id);
c.handleWorkerMessage(reply(id,0));assert.deepEqual(installed,[]);
c.talkToWorker('coords'); // queue while the second batch owns the buffers
for(let i=7;i>=0;i--){c.handleWorkerMessage(reply(next,i));if(i>0)assert.deepEqual(installed,[]);}
assert.deepEqual(installed,[0,1,2,3,4,5,6,7]);assert.equal(sent.length,24);assert.equal(sent[16].messageType,'coords');
c.handleWorkerMessage(reply(next,0));assert.equal(installed.length,8);
