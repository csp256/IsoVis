const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = (extra = {}) => { const c = vm.createContext({console: {log(){},time(){},timeEnd(){}}, ...extra}); c.self=c; return c; };
const load = (c, path) => vm.runInContext(fs.readFileSync(path, 'utf8'), c, {filename: path});
const worker = () => {
 const c = context(); c.self = c;
 const html = fs.readFileSync('isovis.html', 'utf8');
 for (const id of ['default_field_source', 'worker', 'marching_cubes']) {
  if (id === 'default_field_source' && !html.includes("id='default_field_source'")) continue;
  vm.runInContext(html.match(new RegExp(`<script[^>]* id='${id}'>([\\s\\S]*?)</script>`))[1], c);
 }
 return c;
};

const c=context({structuredClone,document:{},title:'IsoVis',title_busy:'Busy',shape_params:{},material_params:{},n:5,
 waiting_for_web_worker:Array(8).fill(true),compute_full_transform:()=>[],build_gui(){},worker_source_string:'source'});
load(c,'js/worker_interface.js');
function detached(){const b=new ArrayBuffer(4);structuredClone(b,{transfer:[b]});return b;}
for(const name of ['vertex_buffer','face_buffer','normal_buffer'])c[name]=Array.from({length:8},detached);
c.workers=Array.from({length:8},()=>({terminate(){}}));
let dispatches=0, handled=0;
c.make_replacement=()=>({terminate(){},postMessage(data,transfer){structuredClone(data,{transfer});dispatches++;}});
vm.runInContext('make_worker = function() {return make_replacement();}; handle_worker_message = function(){handled++;};',c);
// Counters inside the VM avoid relying on cross-context declaration replacement semantics.
c.handled=0;
c.reset_worker(10);assert.equal(dispatches,8);const old=c.workers[0];
c.reset_worker(10);assert.equal(dispatches,16);
old.onmessage({data:{num:0}});assert.equal(c.handled,0);
c.workers[0].onmessage({data:{num:0}});assert.equal(c.handled,1);
