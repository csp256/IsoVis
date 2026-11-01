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

const c=context({waitingForWebWorker:Array(8).fill(false),document:{},titleBusy:'Busy',
 computeFullTransform:()=>[],n:5,shapeParams:{},materialParams:{},
 vertexBuffer:Array.from({length:8},()=>new ArrayBuffer(4)),faceBuffer:Array.from({length:8},()=>new ArrayBuffer(4)),normalBuffer:Array.from({length:8},()=>new ArrayBuffer(4))});
load(c,'js/workerInterface.js');let text='values.fill(17);', sent=[];
c.myCodeMirror={lineCount:()=>3,getRange:()=>text};c.workers=Array.from({length:8},()=>({postMessage(data){sent.push({...data});}}));
c.talkToWorker('code');assert.equal(c.activeFieldSource,text);
text='values.fill(99);';c.waitingForWebWorker.fill(false);c.talkToWorker('init');
assert(sent.every(s=>s.code==='values.fill(17);'));
const w=worker();w.setup(5,2,0);w.updateFieldFunction({messageType:'init',code:sent[8].code});
w.rebuildScalarField([],0);assert(Array.from(w.values).every(v=>v===17));
