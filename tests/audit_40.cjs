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

let id=0,saved=0;const timers=new Map();
const c=context({Blob,setTimeout(fn,delay){timers.set(++id,{fn,delay});return id;},clearTimeout(i){timers.delete(i);},
 waiting_for_any_web_worker:()=>false,pending_worker_stage:null,making_gif:true,done_with_gif:false,waiting_for_next_frame:false,start_frame:0,
 renderer:{domElement:{toDataURL:()=> 'data:text/plain,hello'}},saveAs(){saved++;},report_worker_error(){},camera:{position:{}},camera_params:{}});
load(c,'js/export_import.js');
function fire(){const [i,t]=timers.entries().next().value;timers.delete(i);t.fn();return t.delay;}
c.schedule_gif_capture();c.schedule_gif_capture();assert.equal(timers.size,1);assert.equal(saved,0);assert.equal(fire(),2000);assert.equal(saved,1);assert.equal(timers.size,1);
c.stop_gif();assert.equal(timers.size,0);assert.equal(c.making_gif,false);assert.equal(c.waiting_for_next_frame,false);
c.start_gif();c.schedule_gif_capture();c.stop_gif();assert.equal(timers.size,0);assert.equal(saved,1);
c.start_gif();c.schedule_gif_capture();vm.runInContext('waiting_for_any_web_worker=function(){return true;};',c);fire();assert.equal(saved,1);assert.equal(c.waiting_for_next_frame,false);
assert(!fs.readFileSync('js/isovis.js','utf8').includes('setTimeout(make_gif()'));
