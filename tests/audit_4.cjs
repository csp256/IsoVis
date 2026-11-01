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

const w=worker();let reply;w.postMessage=data=>reply=data;
const params={dimensions:5,resolution:3,coeff:[1,2,3,4,5,6],iso:0,interpolate:true,memory_overuse:0};
const request=(type,code)=>w.onmessage({data:{num:0,n:5,message_type:type,params,r:Array.from({length:6},(_,i)=>Array.from({length:6},(_,j)=>i===j?1:0)),code,
 vertex_buffer:new ArrayBuffer(4),face_buffer:new ArrayBuffer(4),normal_buffer:new ArrayBuffer(4),calc_normals:false}});
request('init');assert(!reply.error);
request('code','missing_function();');assert.match(reply.error,/missing_function/);assert.equal(reply.buffers.length,3);
request('code','values.fill(3);');assert(!reply.error);assert(Array.from(w.values).every(v=>v===3));
request('code','{');assert(reply.error);request('scalar_field');assert(!reply.error);assert(Array.from(w.values).every(v=>v===3));
const elements={};const doc={title:'Busy',getElementById:id=>elements[id],createElement:()=>({style:{},setAttribute(){}}),body:{appendChild(el){elements[el.id]=el;}}};
const c=context({worker_source_string:'source',document:doc,title:'IsoVis',waiting_for_web_worker:Array(8).fill(false),vertex_buffer:[],face_buffer:[],normal_buffer:[]});
load(c,'js/worker_interface.js');let terminated=0;
c.new_worker=()=>({terminate(){terminated++;}});vm.runInContext('make_worker=function(){return new_worker();};',c);
c.workers=Array.from({length:8},()=>c.new_worker());c.meshes=Array.from({length:8},()=>({geometry:{marker:true}}));
const old=c.meshes[0];c.waiting_for_web_worker[0]=true;c.handle_worker_message({data:{num:0,error:'bad function',buffers:reply.buffers}});
assert.equal(c.meshes[0],old);assert.equal(c.waiting_for_web_worker[0],false);assert.match(elements.worker_error.textContent,/bad function/);
for(const event of ['onerror','onmessageerror']) {
 const worker=c.workers[0];c.bind_worker_events(worker,0);worker[event]({message:'failed',preventDefault(){}});
 assert.notEqual(c.workers[0],worker);assert.equal(c.vertex_buffer[0].byteLength,4);
 assert.equal(c.waiting_for_web_worker[0],false);assert.equal(vm.runInContext('workers_need_init',c),true);
 worker.onmessage({data:{num:0,error:'stale',buffers:[]}});assert(!elements.worker_error.textContent.includes('stale'));
}
assert.equal(terminated,2);
