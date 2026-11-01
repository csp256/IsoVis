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

const c=context({waiting_for_web_worker:Array(8).fill(false),document:{},title_busy:'Busy',
 compute_full_transform:()=>[],n:5,shape_params:{},material_params:{},
 vertex_buffer:Array.from({length:8},()=>new ArrayBuffer(4)),face_buffer:Array.from({length:8},()=>new ArrayBuffer(4)),normal_buffer:Array.from({length:8},()=>new ArrayBuffer(4))});
load(c,'js/worker_interface.js');let text='values.fill(17);', sent=[];
c.my_code_mirror={lineCount:()=>3,getRange:()=>text};c.workers=Array.from({length:8},()=>({postMessage(data){sent.push({...data});}}));
c.talk_to_worker('code');assert.equal(c.active_field_source,text);
text='values.fill(99);';c.waiting_for_web_worker.fill(false);c.talk_to_worker('init');
assert(sent.every(s=>s.code==='values.fill(17);'));
const w=worker();w.setup(5,2,0);w.update_field_function({message_type:'init',code:sent[8].code});
w.rebuild_scalar_field([],0);assert(Array.from(w.values).every(v=>v===17));
