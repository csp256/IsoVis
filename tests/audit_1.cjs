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

const c=context({document:{},title_busy:'Busy',compute_full_transform:()=>[],n:5,shape_params:{},material_params:{},
 waiting_for_web_worker:Array(8).fill(true),controls:{update(){}},stats:{update(){}},making_gif:false,
 vertex_buffer:Array.from({length:8},()=>new ArrayBuffer(4)),face_buffer:Array.from({length:8},()=>new ArrayBuffer(4)),normal_buffer:Array.from({length:8},()=>new ArrayBuffer(4))});
load(c,'js/worker_interface.js');load(c,'js/isovis.js');let sent=[],text='first';
c.workers=Array.from({length:8},()=>({postMessage(data){sent.push({...data});}}));
c.my_code_mirror={lineCount:()=>3,getRange:()=>text};
c.size_dirty=vm.runInContext('size_dirty=false;coords_dirty=scalar_field_dirty=mesh_dirty=true;',c);c.update();
assert.equal(sent.length,0);assert.equal(c.pending_worker_stage,0);
c.talk_to_worker('geometry');c.talk_to_worker('code');text='latest submission';c.talk_to_worker('code');text='unsubmitted draft';
c.waiting_for_web_worker.fill(false);c.dispatch_pending_work();assert.equal(sent.length,8);
assert(sent.every(s=>s.message_type==='init'&&s.code==='latest submission'));
c.dispatch_pending_work();assert.equal(sent.length,8);
vm.runInContext('size_dirty=false;coords_dirty=scalar_field_dirty=mesh_dirty=true;',c);c.update();assert.equal(vm.runInContext('pending_worker_stage',c),1);
c.waiting_for_web_worker.fill(false);c.dispatch_pending_work();assert.equal(sent.length,16);
assert.equal(sent[8].message_type,'coords');
const w=worker();w.setup(5,2,0);w.update_field_function({message_type:'init',code:'values.fill(7)'});w.rebuild_scalar_field([],0);
assert(Array.from(w.values).every(x=>x===7));
