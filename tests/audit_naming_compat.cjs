const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
let exported,editor,reset_count=0;
const c=vm.createContext({window:{prompt:(_,value)=>{exported=value;}},
 reset_worker(){reset_count++;},update_material(){},update_background(){},before_change_callback(){},default_text:()=> 'default',
 my_code_mirror:{off(){},on(){},setValue(value){editor=value;}}});
for(const path of ['lib/numeric-1.2.6.js','js/params.js','js/transforms.js','js/export_import.js'])vm.runInContext(fs.readFileSync(path,'utf8'),c);
c.init_params();vm.runInContext('transforms=[plain_transform()];base_orientation=numeric.identity(n+1);',c);
const original=JSON.parse(fs.readFileSync('tests/fixtures/session_v1.json','utf8'));
const snapshot=JSON.stringify(original);
const canonical=c.session_from_wire(original);
assert.equal(canonical.groups[0].name,'shape_params');
assert.equal(canonical.groups[0].data.coeff_count,6);
assert.equal(JSON.stringify(original),snapshot);
assert.deepEqual(JSON.parse(JSON.stringify(c.session_to_wire(canonical))),original);
c.import_settings(snapshot);assert.equal(reset_count,1);
assert.equal(c.shape_params.editor_width,original.groups[0].data.editorWidth);
assert.equal(c.base_orientation.length,6);assert(editor.includes(original.activeFieldSource));
assert.equal(c.active_field_source,original.activeFieldSource);
c.export_to_json();const saved=JSON.parse(exported);
assert.equal(saved.version,1);assert.equal(saved.groups[0].name,'shapeParams');
assert.equal(saved.groups[0].data.coeffCount,6);assert(!('coeff_count'in saved.groups[0].data));
assert.deepEqual(saved.baseOrientation,original.baseOrientation);assert.equal(saved.activeFieldSource,original.activeFieldSource);
// New exports still use exactly the old structural key sets.
for(let i=0;i<original.groups.length;i++)assert.deepEqual(Object.keys(saved.groups[i].data).sort(),Object.keys(original.groups[i].data).sort());
c.import_settings(fs.readFileSync('tests/fixtures/settings_legacy.json','utf8'));
assert.equal(c.active_field_source,null);assert.equal(editor,'default');
const before=JSON.stringify(c.shape_params),resets=reset_count;
for(const patch of [
 {...original,base_orientation:original.baseOrientation},
 {...original,groups:[{name:'shapeParams',data:{coeffCount:6,coeff_count:6}}]},
 {...original,groups:[{name:'shapeParams',data:{}},{name:'shape_params',data:{}}]},
 JSON.parse('{"version":1,"groups":[{"name":"shapeParams","data":{},"__proto__":{"polluted":true}}],"baseOrientation":[],"activeFieldSource":null}')
])assert.throws(()=>c.import_settings(JSON.stringify(patch)));
assert.equal(JSON.stringify(c.shape_params),before);assert.equal(reset_count,resets);assert.equal({}.polluted,undefined);
// Execute the historical field body unmodified in the renamed worker.
const w=vm.createContext({console:{time(){},timeEnd(){},log(){}}});w.self=w;
const html=fs.readFileSync('isovis.html','utf8');
for(const id of ['default_field_source','worker','marching_cubes'])vm.runInContext(html.match(new RegExp(`<script[^>]* id='${id}'>([\\s\\S]*?)</script>`))[1],w);
let reply;w.postMessage=data=>reply=data;
w.onmessage({data:{num:0,n:5,message_type:'init',r:Array.from({length:6},(_,i)=>Array.from({length:6},(_,j)=>i===j?1:0)),
 params:{dimensions:5,resolution:3,coeff:[1,2,3,4,5,6],iso:0,interpolate:true,memory_overuse:0},calc_normals:false,
 code:original.activeFieldSource,vertex_buffer:new ArrayBuffer(4),face_buffer:new ArrayBuffer(4),normal_buffer:new ArrayBuffer(4)}});
assert(!reply.error,reply.error);assert(Array.from(w.values).every(Number.isFinite));
assert.equal(w.values[0],w.coords[0]-1);
