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

const box={hidden:false,textContent:'last failure'};const c=context({document:{getElementById:()=>box,title:''},title:'IsoVis',waitingForWebWorker:Array(8).fill(true),vertexBuffer:[],faceBuffer:[],normalBuffer:[]});
load(c,'js/workerInterface.js');vm.runInContext('dispatchPendingWork=function() {};publishWorkerResult=function() {};',c);
function batch(id){c.id=id;vm.runInContext('activeWorkerBatch={id:id,replies:new Array(8),remaining:8,failed:false};',c);}
function reply(id,num,error){c.receiveBatchReply({num,batchId:id,error,buffers:[new ArrayBuffer(4),new ArrayBuffer(4),new ArrayBuffer(4)]});}
batch(1);for(let i=0;i<8;i++)reply(1,i,i===3?'current failure':undefined);assert.equal(box.hidden,false);assert.match(box.textContent,/current failure/);
batch(2);for(let i=0;i<7;i++)reply(2,i);assert.equal(box.hidden,false);reply(2,7);assert.equal(box.hidden,true);assert.equal(box.textContent,'');
c.reportWorkerError('new error');assert.equal(box.hidden,false);assert.match(box.textContent,/new error/);
