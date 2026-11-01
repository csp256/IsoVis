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

const c=context({document:{},titleBusy:'Busy',computeFullTransform:()=>[],n:5,shapeParams:{},materialParams:{},
 waitingForWebWorker:Array(8).fill(true),controls:{update(){}},stats:{update(){}},makingGIF:false,
 vertexBuffer:Array.from({length:8},()=>new ArrayBuffer(4)),faceBuffer:Array.from({length:8},()=>new ArrayBuffer(4)),normalBuffer:Array.from({length:8},()=>new ArrayBuffer(4))});
load(c,'js/workerInterface.js');load(c,'js/isovis.js');let sent=[],text='first';
c.workers=Array.from({length:8},()=>({postMessage(data){sent.push({...data});}}));
c.myCodeMirror={lineCount:()=>3,getRange:()=>text};
c.sizeDirty=vm.runInContext('sizeDirty=false;coordsDirty=scalarFieldDirty=meshDirty=true;',c);c.update();
assert.equal(sent.length,0);assert.equal(c.pendingWorkerStage,0);
c.talkToWorker('geometry');c.talkToWorker('code');text='latest submission';c.talkToWorker('code');text='unsubmitted draft';
c.waitingForWebWorker.fill(false);c.dispatchPendingWork();assert.equal(sent.length,8);
assert(sent.every(s=>s.messageType==='init'&&s.code==='latest submission'));
c.dispatchPendingWork();assert.equal(sent.length,8);
vm.runInContext('sizeDirty=false;coordsDirty=scalarFieldDirty=meshDirty=true;',c);c.update();assert.equal(vm.runInContext('pendingWorkerStage',c),1);
c.waitingForWebWorker.fill(false);c.dispatchPendingWork();assert.equal(sent.length,16);
assert.equal(sent[8].messageType,'coords');
const w=worker();w.setup(5,2,0);w.updateFieldFunction({messageType:'init',code:'values.fill(7)'});w.rebuildScalarField([],0);
assert(Array.from(w.values).every(x=>x===7));
