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

const box={hidden:false,textContent:'last failure'};const c=context({document:{getElementById:()=>box,title:''},title:'IsoVis',waiting_for_web_worker:Array(8).fill(true),vertex_buffer:[],face_buffer:[],normal_buffer:[]});
load(c,'js/worker_interface.js');vm.runInContext('dispatch_pending_work=function() {};publish_worker_result=function() {};',c);
function batch(id){c.id=id;vm.runInContext('active_worker_batch={id:id,replies:new Array(8),remaining:8,failed:false};',c);}
function reply(id,num,error){c.receive_batch_reply({num,batch_id:id,error,buffers:[new ArrayBuffer(4),new ArrayBuffer(4),new ArrayBuffer(4)]});}
batch(1);for(let i=0;i<8;i++)reply(1,i,i===3?'current failure':undefined);assert.equal(box.hidden,false);assert.match(box.textContent,/current failure/);
batch(2);for(let i=0;i<7;i++)reply(2,i);assert.equal(box.hidden,false);reply(2,7);assert.equal(box.hidden,true);assert.equal(box.textContent,'');
c.report_worker_error('new error');assert.equal(box.hidden,false);assert.match(box.textContent,/new error/);
