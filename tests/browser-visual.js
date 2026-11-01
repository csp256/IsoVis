(async()=>{
 requestAnimationFrame=function(){};cameraParams.wobble=false;
 const idle=async()=>{for(let i=0;i<200;i++){if(!waitingForAnyWebWorker()&&pendingWorkerStage===null)return;await new Promise(r=>setTimeout(r,20));}throw Error('Worker timeout');};
 shapeParams.resolution=8;shapeParams.iso=0;transforms=[plainTransform()];baseOrientation=numeric.identity(n+1);transformParams.zoom=1;
 myCodeMirror.off('beforeChange',beforeChangeCallback);myCodeMirror.setValue('function field(x,c,size3,n) {\nfor(var i=0;i<size3;i++)values[i]=coords[i*n]*coords[i*n]+coords[i*n+1]*coords[i*n+1]+coords[i*n+2]*coords[i*n+2]-9;\n}');myCodeMirror.on('beforeChange',beforeChangeCallback);talkToWorker('code');talkToWorker('init');await idle();
 camera.position.set(9,7,11);(controls.target||controls.center).set(0,0,0);controls.update();camera.lookAt(new THREE.Vector3());
 renderer.setSize(640,480);camera.aspect=640/480;camera.updateProjectionMatrix();cameraParams.axes=false;
 const results=[];
 const capture=name=>{
  render();const gl=renderer.getContext();if(gl.getError()!==0)throw Error('WebGL error in '+name);
  const data=new Uint8Array(640*480*4);gl.readPixels(0,0,640,480,gl.RGBA,gl.UNSIGNED_BYTE,data);
  let nonBackgroundPixels=0;for(let i=0;i<data.length;i+=4)if(data[i]!==0||data[i+1]!==17||data[i+2]!==34)nonBackgroundPixels++;
  if(nonBackgroundPixels<100)throw Error('Empty rendering: '+name);
  // A small RGB grid supports quantitative comparison without huge JSON dumps.
  const samples=[];for(let y=0;y<480;y+=3)for(let x=0;x<640;x+=3){let i=(y*640+x)*4;samples.push(data[i],data[i+1],data[i+2]);}
  results.push({name,revision:THREE.REVISION,counts:meshes.map(m=>m.geometry.drawRange.count),nonBackgroundPixels,samples,png:renderer.domElement.toDataURL('image/png')});
 };
 capture('default-normal-wireframe');
 for(const kind of [0,1,3,4,5]){materialParams.material=kind;materialParams.wireframe=false;materialParams.opacity=0.7;materialParams.blending=1;updateMaterial();capture('solid-material-'+kind);}
 materialParams.material=4;materialParams.opacity=0.4;materialParams.blending=5;materialParams.equation=THREE.AddEquation;updateMaterial();capture('custom-additive');
 cameraParams.perspective=false;makeCamera();camera.left=-5;camera.right=5;camera.top=3.75;camera.bottom=-3.75;camera.updateProjectionMatrix();capture('orthographic-normal');
 return results;
})()
