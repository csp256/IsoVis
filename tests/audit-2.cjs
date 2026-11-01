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

const c=context({structuredClone,document:{},title:'IsoVis',titleBusy:'Busy',shapeParams:{},materialParams:{},n:5,
 waitingForWebWorker:Array(8).fill(true),computeFullTransform:()=>[],buildGUI(){},workerSourceString:'source'});
load(c,'js/workerInterface.js');
function detached(){const b=new ArrayBuffer(4);structuredClone(b,{transfer:[b]});return b;}
for(const name of ['vertexBuffer','faceBuffer','normalBuffer'])c[name]=Array.from({length:8},detached);
c.workers=Array.from({length:8},()=>({terminate(){}}));
let dispatches=0, handled=0;
c.makeReplacement=()=>({terminate(){},postMessage(data,transfer){structuredClone(data,{transfer});dispatches++;}});
vm.runInContext('makeWorker = function() {return makeReplacement();}; handleWorkerMessage = function(){handled++;};',c);
// Counters inside the VM avoid relying on cross-context declaration replacement semantics.
c.handled=0;
c.resetWorker(10);assert.equal(dispatches,8);const old=c.workers[0];
c.resetWorker(10);assert.equal(dispatches,16);
old.onmessage({data:{num:0}});assert.equal(c.handled,0);
c.workers[0].onmessage({data:{num:0}});assert.equal(c.handled,1);
