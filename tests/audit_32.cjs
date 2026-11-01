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

const c=context({document:{title:'',getElementById:()=>null},title:'IsoVis',title_busy:'Busy',compute_full_transform:()=>[],n:5,shape_params:{},material_params:{},
 waiting_for_web_worker:Array(8).fill(false),vertex_buffer:Array.from({length:8},()=>new ArrayBuffer(4)),face_buffer:Array.from({length:8},()=>new ArrayBuffer(4)),normal_buffer:Array.from({length:8},()=>new ArrayBuffer(4))});
load(c,'js/worker_interface.js');let sent=[],installed=[],errors=[];
c.record=d=>installed.push(d.num);c.error=m=>errors.push(m);
vm.runInContext('publish_worker_result=function(e){record(e.data);};report_worker_error=function(m){error(m);};',c);
c.workers=Array.from({length:8},()=>({postMessage(d){sent.push({...d});}}));
function reply(id,num,error){return {data:{num,batch_id:id,error,buffers:[new ArrayBuffer(4),new ArrayBuffer(4),new ArrayBuffer(4)]}};}
c.talk_to_worker('geometry');let id=sent[0].batch_id;
for(let i=0;i<7;i++)c.handle_worker_message(reply(id,i,i===2?'failed':undefined));assert.deepEqual(installed,[]);
c.handle_worker_message(reply(id,7));assert.deepEqual(installed,[]);assert.equal(errors.length,1);assert(c.waiting_for_web_worker.every(v=>!v));assert(c.vertex_buffer.every(b=>b.byteLength===4));
c.talk_to_worker('geometry');const next=sent[8].batch_id;assert(next>id);
c.handle_worker_message(reply(id,0));assert.deepEqual(installed,[]);
c.talk_to_worker('coords'); // queue while the second batch owns the buffers
for(let i=7;i>=0;i--){c.handle_worker_message(reply(next,i));if(i>0)assert.deepEqual(installed,[]);}
assert.deepEqual(installed,[0,1,2,3,4,5,6,7]);assert.equal(sent.length,24);assert.equal(sent[16].message_type,'coords');
c.handle_worker_message(reply(next,0));assert.equal(installed.length,8);
