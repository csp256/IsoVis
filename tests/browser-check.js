async function checkCore() {
 const assert=(b,m)=>{if(!b)throw Error(m);};
 const idle=async()=>{for(let i=0;i<100;i++){if(!waitingForAnyWebWorker()&&pendingWorkerStage===null)return;await new Promise(r=>setTimeout(r,20));}throw Error('worker timeout');};
 const submit=source=>{myCodeMirror.off('beforeChange',beforeChangeCallback);myCodeMirror.setValue('function field(x, c, size3, n) {\n'+source+'\n}');myCodeMirror.on('beforeChange',beforeChangeCallback);talkToWorker('code');};
 // Stop continuous animation after one scheduled frame; each check explicitly renders.
 requestAnimationFrame=function(){};cameraParams.wobble=false;
 const originalScenes=scenes.slice(),originalLights=scenes.map(s=>s.children.slice(0,8));
 submit('for(var i=0;i<size3;i++) values[i]=coords[i*n]-2;');
 shapeParams.iso=0;meshDirty=true;update();await idle();render();
 assert(meshes.some(m=>m.geometry.drawRange.count>0),'plane triangles '+JSON.stringify({counts:meshes.map(m=>m.geometry.drawRange.count),error:document.getElementById('workerError')?.textContent,source:activeFieldSource}));
 materialParams.wireframe=false;updateMaterial();render();assert(renderer.getContext().getError()===0,'solid rendering GL error');
 const before=meshes.slice();submit('missingFunction();');await idle();
 assert(meshes.every((m,i)=>m===before[i]),'preserve successful meshes after error');
 assert(document.getElementById('workerError').textContent.includes('missingFunction'),'visible error');
 submit('for(var i=0;i<size3;i++) values[i]=coords[i*n]-3;');
 shapeParams.resolution=5;sizeDirty=true;coordsDirty=true;scalarFieldDirty=true;meshDirty=true;update();await idle();render();
 assert(meshes.some((m,i)=>m!==before[i]),'recover and drain pending work');
 // Abort with buffers actually detached, without allowing replies first.
 talkToWorker('coords');assert(waitingForAnyWebWorker(),'request busy');
 assert(vertexBuffer.some(b=>b.byteLength===0),'buffers transferred');resetWorker(4);await idle();render();
 assert(activeFieldSource.includes('-3'),'source survives abort');
 const counts=meshes.map(m=>m.geometry.drawRange.count);
 assert(counts.some(n=>n>0),'abort recovers surface');
 const full=JSON.stringify(computeFullTransform());applyTransforms();assert(JSON.stringify(computeFullTransform())===full,'apply preserves surface');await idle();
 const prompt=window.prompt;let saved;
 window.prompt=(_,value)=>{saved=value;};baseOrientation[0][n]=-1;exportToJSON();
 baseOrientation[0][n]=99;window.prompt=()=>saved;importFromJSON();window.prompt=prompt;await idle();
 assert(baseOrientation[0][n]===-1,'saved matrix');
 for(const dimensions of [3,4,7]){
  const state=JSON.parse(saved);state.groups.find(g=>g.name==='shapeParams').data.dimensions=dimensions;
  state.groups=state.groups.filter(g=>g.name!=='transforms');
  state.baseOrientation=Array.from({length:dimensions+1},(_,i)=>Array.from({length:dimensions+1},(_,j)=>i===j?1:0));
  state.activeFieldSource=null;window.prompt=()=>JSON.stringify(state);importFromJSON();window.prompt=prompt;await idle();
  assert(n===dimensions&&baseOrientation.length===n+1,'dimension state');render();
 }
 assert(scenes.every((s,i)=>s===originalScenes[i]),'stable scenes');
 assert(scenes.every((s,i)=>originalLights[i].every((l,j)=>s.children[j]===l)),'stable lights');
 const geometryCount=renderer.info.memory.geometries;
 for(let k=0;k<3;k++){talkToWorker('geometry');await idle();materialParams.material=k%2?4:0;updateMaterial();render();}
 assert(renderer.info.memory.geometries<=geometryCount+8,'bounded GPU geometries');
 return {counts,geometryCount,finalGeometryCount:renderer.info.memory.geometries,dimensions:n,stableScenes:true};
}
async function checkFollowups() {
 requestAnimationFrame=function(){};cameraParams.wobble=false;
 const assert=(v,m)=>{if(!v)throw Error(m);};
 const idle=async()=>{for(let i=0;i<150;i++){if(!waitingForAnyWebWorker()&&pendingWorkerStage===null)return;await new Promise(r=>setTimeout(r,20));}throw Error('worker timeout');};
 const submit=source=>{myCodeMirror.off('beforeChange',beforeChangeCallback);myCodeMirror.setValue('function field(x,c,size3,n) {\n'+source+'\n}');myCodeMirror.on('beforeChange',beforeChangeCallback);talkToWorker('code');};
 // Partial failure must preserve all eight meshes, then a retry clears the error.
 const before=meshes.slice();submit('if(coords[0]>=0)throw Error("partial failure");for(var i=0;i<size3;i++)values[i]=coords[i*n]-2;');await idle();
 assert(meshes.every((m,i)=>m===before[i]),'failed batch altered displayed mesh');assert(!document.getElementById('workerError').hidden,'missing failure banner');
 submit('for(var i=0;i<size3;i++)values[i]=coords[i*n]-2;');await idle();assert(meshes.every((m,i)=>m!==before[i]),'successful batch not published');assert(document.getElementById('workerError').hidden,'stale error banner');
 // Both GUI dimension directions, with every retained transform type.
 transforms=Array.from({length:4},(_,i)=>{const t=plainTransform();t.type=String(i);t.axis1=4;return t;});
 shapeParams.dimensions=7;dimensionsChanged();await idle();assert(transforms.every(t=>t.s.length===7&&t.d.length===7),'dimension expansion');
 shapeParams.dimensions=3;dimensionsChanged();await idle();assert(computeFullTransform().flat().every(Number.isFinite),'dimension shrink nonfinite');assert(transforms[0].axis1===2,'removed axis not clamped');
 // Invalid GUI numeric edits restore a valid value without throwing.
 const resolution=leftgui.__folders.Shape.__controllers.find(c=>c.property==='resolution');resolution.setValue(NaN);assert(Number.isInteger(shapeParams.resolution),'invalid resolution accepted');
 const prior=shapeParams.resolution;shapeParams.resolution=0;talkToWorker('geometry');assert(!waitingForAnyWebWorker(),'invalid dispatch owns buffers');shapeParams.resolution=prior;
 // Invalid imports report a useful error without state changes.
 const oldPrompt=window.prompt,oldAlert=window.alert;let alerts=[];window.prompt=()=>JSON.stringify([{name:'cameraParams',data:{fov:'bad'}}]);window.alert=m=>alerts.push(m);
 const oldFov=cameraParams.fov;assert(importFromJSON()===false,'bad import accepted');assert(cameraParams.fov===oldFov&&alerts.length===1,'bad import mutated state');window.prompt=oldPrompt;window.alert=oldAlert;
 shapeParams.coeff=[3.5];shapeParams.coeffCount=1;shapeParams.iso=5;activeFieldSource=null;resetWorker(4);await idle();assert(meshes.some(m=>m.geometry.drawRange.count>0),'short-coefficient default field empty');
 // Native background picker and repeated GUI/folder rebuilds.
 for(let i=0;i<3;i++)buildGUI();shapeParams.coeffCount=2;updateCoeff();shapeParams.coeffCount=1;updateCoeff();await idle();
 const color=leftgui.__folders.Camera.__controllers.find(c=>c.property==='background');assert(color.__input.type==='color','native color picker missing');color.__input.value='#abcdef';color.__input.dispatchEvent(new Event('input',{bubbles:true}));assert(cameraParams.background==='#abcdef','background not applied');
 render();assert(renderer.getContext().getError()===0,'WebGL error');
 return {atomicFailure:true,recoveryClearsBanner:true,guiDimensionChanges:true,invalidInputRejected:true,shortCoefficientDefaults:true,upstreamGUI:true};
}
async function checkLargeIndices() {
 const count=70000,positions=new Float32Array(count*3),normals=new Float32Array(count*3);
 positions.set([-2,0,0]);positions.set([2,0,0],3);positions.set([0,2,0],(count-1)*3);
 const geometry=surfaceGeometry({vertexCount:count,indexCount:3,buffers:[positions.buffer,new Uint32Array([0,1,count-1]).buffer,normals.buffer]});
 if(geometry.index.array.BYTES_PER_ELEMENT!==4)throw Error('Large indices truncated');
 const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),testScene=new THREE.Scene();testScene.add(new THREE.Mesh(geometry,material));
 renderer.render(testScene,camera);if(renderer.getContext().getError()!==0)throw Error('Uint32 draw failed');
 geometry.dispose();material.dispose();render();
 const originalSave=window.saveAs;let screenshot;
 try{window.saveAs=(blob,name)=>{screenshot={blob,name};};takeScreenshot();}finally{window.saveAs=originalSave;}
 if(!screenshot||screenshot.blob.type!=='image/png'||!/^IsoVis\d+\.png$/.test(screenshot.name))throw Error('Screenshot export failed');
 const signature=new Uint8Array(await screenshot.blob.arrayBuffer()).slice(0,8);
 if(String(signature)!=='137,80,78,71,13,10,26,10')throw Error('Invalid PNG screenshot');
 return {uint32Rendering:true,pngExport:true};
}
(async()=>({core:await checkCore(),followups:await checkFollowups(),large:await checkLargeIndices()}))()
