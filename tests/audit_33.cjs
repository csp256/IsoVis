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

const c=context({report_worker_error(){c.errors++;}});load(c,'js/params.js');load(c,'js/ui.js');c.errors=0;
for(const x of [0,1,1.5,66,NaN,Infinity,'4'])assert.throws(()=>c.require_resolution(x));
for(const x of [2,4,65])assert.equal(c.require_resolution(x),x);
for(const x of [0,-1,Infinity,NaN,'1'])assert.throws(()=>c.require_zoom(x));
for(const x of [0,Infinity,NaN])assert.throws(()=>c.require_scale(x));assert.equal(c.require_scale(-2),-2);
let callback,changes=0,refreshes=0;
const folder={add(){return {onChange(fn){callback=fn;},updateDisplay(){refreshes++;}};}};
const target={scale:2};c.validated_number_control(folder,target,'scale',c.require_scale,()=>changes++);
target.scale=0;callback(0);assert.equal(target.scale,2);assert.equal(changes,0);assert.equal(refreshes,1);
target.scale=-3;callback(-3);assert.equal(changes,1);target.scale=NaN;callback(NaN);assert.equal(target.scale,-3);
load(c,'lib/numeric-1.2.6.js');load(c,'js/transforms.js');c.init_params();vm.runInContext('transforms=[plain_transform()];base_orientation=numeric.identity(n+1);transform_params.zoom=0;',c);
assert.throws(()=>c.compute_full_transform(),/Zoom/);
// Dispatch failure never sends buffers or leaves a busy request.
load(c,'js/worker_interface.js');vm.runInContext('report_worker_error=function(){errors++;};',c);c.waiting_for_web_worker=Array(8).fill(false);c.workers=[];
c.talk_to_worker('geometry');assert.equal(vm.runInContext('pending_worker_stage',c),null);assert(c.waiting_for_web_worker.every(x=>!x));assert.equal(c.errors,3);

vm.runInContext('workers_need_init=true;',c);c.talk_to_worker('geometry');assert.equal(vm.runInContext('workers_need_init',c),true);

let change,finish,finished=0;const object={resolution:4};
const finish_folder={add(){return {onChange(fn){change=fn;},onFinishChange(fn){finish=fn;},updateDisplay(){}};}};
c.validated_number_control(finish_folder,object,'resolution',c.require_resolution,()=>finished++,true);
object.resolution=NaN;change(NaN);assert.equal(object.resolution,4);finish();assert.equal(finished,0);
object.resolution=5;change(5);assert.equal(finished,0);finish();assert.equal(finished,1);

let arguments_seen;const bounded={add(...args){arguments_seen=args;return {onChange(){},onFinishChange(){}};}};
c.validated_number_control(bounded,object,'resolution',c.require_resolution,()=>{},true,[2,65,1]);
assert.deepEqual(arguments_seen,[object,'resolution',2,65,1]);
