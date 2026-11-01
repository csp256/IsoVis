async function check_core() {
 const assert=(b,m)=>{if(!b)throw Error(m);};
 const idle=async()=>{for(let i=0;i<100;i++){if(!waiting_for_any_web_worker()&&pending_worker_stage===null)return;await new Promise(r=>setTimeout(r,20));}throw Error('worker timeout');};
 const submit=source=>{my_code_mirror.off('beforeChange',before_change_callback);my_code_mirror.setValue('function field(x, c, size3, n) {\n'+source+'\n}');my_code_mirror.on('beforeChange',before_change_callback);talk_to_worker('code');};
 // Stop continuous animation after one scheduled frame; each check explicitly renders.
 requestAnimationFrame=function(){};camera_params.wobble=false;
 const original_scenes=scenes.slice(),original_lights=scenes.map(s=>s.children.slice(0,8));
 submit('for(var i=0;i<size3;i++) values[i]=coords[i*n]-2;');
 shape_params.iso=0;mesh_dirty=true;update();await idle();render();
 assert(meshes.some(m=>m.geometry.drawRange.count>0),'plane triangles '+JSON.stringify({counts:meshes.map(m=>m.geometry.drawRange.count),error:document.getElementById('worker_error')?.textContent,source:active_field_source}));
 material_params.wireframe=false;update_material();render();assert(renderer.getContext().getError()===0,'solid rendering GL error');
 const before=meshes.slice();submit('missing_function();');await idle();
 assert(meshes.every((m,i)=>m===before[i]),'preserve successful meshes after error');
 assert(document.getElementById('worker_error').textContent.includes('missing_function'),'visible error');
 submit('for(var i=0;i<size3;i++) values[i]=coords[i*n]-3;');
 shape_params.resolution=5;size_dirty=true;coords_dirty=true;scalar_field_dirty=true;mesh_dirty=true;update();await idle();render();
 assert(meshes.some((m,i)=>m!==before[i]),'recover and drain pending work');
 // Abort with buffers actually detached, without allowing replies first.
 talk_to_worker('coords');assert(waiting_for_any_web_worker(),'request busy');
 assert(vertex_buffer.some(b=>b.byteLength===0),'buffers transferred');reset_worker(4);await idle();render();
 assert(active_field_source.includes('-3'),'source survives abort');
 const counts=meshes.map(m=>m.geometry.drawRange.count);
 assert(counts.some(n=>n>0),'abort recovers surface');
 const full=JSON.stringify(compute_full_transform());apply_transforms();assert(JSON.stringify(compute_full_transform())===full,'apply preserves surface');await idle();
 const prompt=window.prompt;let saved;
 window.prompt=(_,value)=>{saved=value;};base_orientation[0][n]=-1;export_to_json();
 base_orientation[0][n]=99;window.prompt=()=>saved;import_from_json();window.prompt=prompt;await idle();
 assert(base_orientation[0][n]===-1,'saved matrix');
 for(const dimensions of [3,4,7]){
  const state=session_from_wire(JSON.parse(saved));state.groups.find(g=>g.name==='shape_params').data.dimensions=dimensions;
  state.groups=state.groups.filter(g=>g.name!=='transforms');
  state.base_orientation=Array.from({length:dimensions+1},(_,i)=>Array.from({length:dimensions+1},(_,j)=>i===j?1:0));
  state.active_field_source=null;window.prompt=()=>JSON.stringify(state);import_from_json();window.prompt=prompt;await idle();
  assert(n===dimensions&&base_orientation.length===n+1,'dimension state');render();
 }
 assert(scenes.every((s,i)=>s===original_scenes[i]),'stable scenes');
 assert(scenes.every((s,i)=>original_lights[i].every((l,j)=>s.children[j]===l)),'stable lights');
 const geometry_count=renderer.info.memory.geometries;
 for(let k=0;k<3;k++){talk_to_worker('geometry');await idle();material_params.material=k%2?4:0;update_material();render();}
 assert(renderer.info.memory.geometries<=geometry_count+8,'bounded GPU geometries');
 return {counts,geometry_count,final_geometry_count:renderer.info.memory.geometries,dimensions:n,stable_scenes:true};
}
async function check_followups() {
 requestAnimationFrame=function(){};camera_params.wobble=false;
 const assert=(v,m)=>{if(!v)throw Error(m);};
 const idle=async()=>{for(let i=0;i<150;i++){if(!waiting_for_any_web_worker()&&pending_worker_stage===null)return;await new Promise(r=>setTimeout(r,20));}throw Error('worker timeout');};
 const submit=source=>{my_code_mirror.off('beforeChange',before_change_callback);my_code_mirror.setValue('function field(x,c,size3,n) {\n'+source+'\n}');my_code_mirror.on('beforeChange',before_change_callback);talk_to_worker('code');};
 // Partial failure must preserve all eight meshes, then a retry clears the error.
 const before=meshes.slice();submit('if(coords[0]>=0)throw Error("partial failure");for(var i=0;i<size3;i++)values[i]=coords[i*n]-2;');await idle();
 assert(meshes.every((m,i)=>m===before[i]),'failed batch altered displayed mesh');assert(!document.getElementById('worker_error').hidden,'missing failure banner');
 submit('for(var i=0;i<size3;i++)values[i]=coords[i*n]-2;');await idle();assert(meshes.every((m,i)=>m!==before[i]),'successful batch not published');assert(document.getElementById('worker_error').hidden,'stale error banner');
 // Both GUI dimension directions, with every retained transform type.
 transforms=Array.from({length:4},(_,i)=>{const t=plain_transform();t.type=String(i);t.axis1=4;return t;});
 shape_params.dimensions=7;dimensions_changed();await idle();assert(transforms.every(t=>t.s.length===7&&t.d.length===7),'dimension expansion');
 shape_params.dimensions=3;dimensions_changed();await idle();assert(compute_full_transform().flat().every(Number.isFinite),'dimension shrink nonfinite');assert(transforms[0].axis1===2,'removed axis not clamped');
 // Invalid GUI numeric edits restore a valid value without throwing.
 const resolution=left_gui.__folders.Shape.__controllers.find(c=>c.property==='resolution');resolution.setValue(NaN);assert(Number.isInteger(shape_params.resolution),'invalid resolution accepted');
 const prior=shape_params.resolution;shape_params.resolution=0;talk_to_worker('geometry');assert(!waiting_for_any_web_worker(),'invalid dispatch owns buffers');shape_params.resolution=prior;
 // Invalid imports report a useful error without state changes.
 const old_prompt=window.prompt,old_alert=window.alert;let alerts=[];window.prompt=()=>JSON.stringify([{name:'camera_params',data:{fov:'bad'}}]);window.alert=m=>alerts.push(m);
 const old_fov=camera_params.fov;assert(import_from_json()===false,'bad import accepted');assert(camera_params.fov===old_fov&&alerts.length===1,'bad import mutated state');window.prompt=old_prompt;window.alert=old_alert;
 shape_params.coeff=[3.5];shape_params.coeff_count=1;shape_params.iso=5;active_field_source=null;reset_worker(4);await idle();assert(meshes.some(m=>m.geometry.drawRange.count>0),'short-coefficient default field empty');
 // Native background picker and repeated GUI/folder rebuilds.
 for(let i=0;i<3;i++)build_gui();shape_params.coeff_count=2;update_coeff();shape_params.coeff_count=1;update_coeff();await idle();
 const color=left_gui.__folders.Camera.__controllers.find(c=>c.property==='background');assert(color.__input.type==='color','native color picker missing');color.__input.value='#abcdef';color.__input.dispatchEvent(new Event('input',{bubbles:true}));assert(camera_params.background==='#abcdef','background not applied');
 render();assert(renderer.getContext().getError()===0,'WebGL error');
 return {atomic_failure:true,recovery_clears_banner:true,gui_dimension_changes:true,invalid_input_rejected:true,short_coefficient_defaults:true,upstream_gui:true};
}
async function check_large_indices() {
 const count=70000,positions=new Float32Array(count*3),normals=new Float32Array(count*3);
 positions.set([-2,0,0]);positions.set([2,0,0],3);positions.set([0,2,0],(count-1)*3);
 const geometry=surface_geometry({vertex_count:count,index_count:3,buffers:[positions.buffer,new Uint32Array([0,1,count-1]).buffer,normals.buffer]});
 if(geometry.index.array.BYTES_PER_ELEMENT!==4)throw Error('Large indices truncated');
 const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),test_scene=new THREE.Scene();test_scene.add(new THREE.Mesh(geometry,material));
 renderer.render(test_scene,camera);if(renderer.getContext().getError()!==0)throw Error('Uint32 draw failed');
 geometry.dispose();material.dispose();render();
 const original_save=window.saveAs;let screenshot;
 try{window.saveAs=(blob,name)=>{screenshot={blob,name};};take_screenshot();}finally{window.saveAs=original_save;}
 if(!screenshot||screenshot.blob.type!=='image/png'||!/^IsoVis\d+\.png$/.test(screenshot.name))throw Error('Screenshot export failed');
 const signature=new Uint8Array(await screenshot.blob.arrayBuffer()).slice(0,8);
 if(String(signature)!=='137,80,78,71,13,10,26,10')throw Error('Invalid PNG screenshot');
 return {uint32_rendering:true,png_export:true};
}
async function check_legacy_session() {
 const legacy=await(await fetch('tests/fixtures/session_v1.json')).json();
 legacy.groups[0].data.resolution=4;
 import_settings(JSON.stringify(legacy));
 for(let i=0;i<150&&(waiting_for_any_web_worker()||pending_worker_stage!==null);i++)await new Promise(r=>setTimeout(r,20));
 if(waiting_for_any_web_worker()||pending_worker_stage!==null)throw Error('Legacy session worker timeout');
 if(active_field_source!==legacy.activeFieldSource||shape_params.coeff_count!==6)throw Error('Legacy session changed user source/settings');
 if(document.getElementById('worker_error')&&!document.getElementById('worker_error').hidden)throw Error('Legacy field failed');
 render();
 const prompt=window.prompt;let saved;
 try{window.prompt=(_,text)=>{saved=JSON.parse(text);};export_to_json();}finally{window.prompt=prompt;}
 if(saved.groups[0].name!=='shapeParams'||saved.groups[0].data.coeffCount!==6||saved.activeFieldSource!==legacy.activeFieldSource)throw Error('Export schema changed');
 return {old_session:true,unchanged_user_source:true,old_export_schema:true};
}
(async()=>({core:await check_core(),followups:await check_followups(),large:await check_large_indices(),legacy:await check_legacy_session()}))()
