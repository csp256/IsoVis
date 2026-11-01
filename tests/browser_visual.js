(async()=>{
 requestAnimationFrame=function(){};camera_params.wobble=false;
 const idle=async()=>{for(let i=0;i<200;i++){if(!waiting_for_any_web_worker()&&pending_worker_stage===null)return;await new Promise(r=>setTimeout(r,20));}throw Error('Worker timeout');};
 shape_params.resolution=8;shape_params.iso=0;transforms=[plain_transform()];base_orientation=numeric.identity(n+1);transform_params.zoom=1;
 my_code_mirror.off('beforeChange',before_change_callback);my_code_mirror.setValue('function field(x,c,size3,n) {\nfor(var i=0;i<size3;i++)values[i]=coords[i*n]*coords[i*n]+coords[i*n+1]*coords[i*n+1]+coords[i*n+2]*coords[i*n+2]-9;\n}');my_code_mirror.on('beforeChange',before_change_callback);talk_to_worker('code');talk_to_worker('init');await idle();
 camera.position.set(9,7,11);(controls.target||controls.center).set(0,0,0);controls.update();camera.lookAt(new THREE.Vector3());
 renderer.setSize(640,480);camera.aspect=640/480;camera.updateProjectionMatrix();camera_params.axes=false;
 const results=[];
 const capture=name=>{
  render();const gl=renderer.getContext();if(gl.getError()!==0)throw Error('WebGL error in '+name);
  const data=new Uint8Array(640*480*4);gl.readPixels(0,0,640,480,gl.RGBA,gl.UNSIGNED_BYTE,data);
  let non_background_pixels=0;for(let i=0;i<data.length;i+=4)if(data[i]!==0||data[i+1]!==17||data[i+2]!==34)non_background_pixels++;
  if(non_background_pixels<100)throw Error('Empty rendering: '+name);
  // A small RGB grid supports quantitative comparison without huge JSON dumps.
  const samples=[];for(let y=0;y<480;y+=3)for(let x=0;x<640;x+=3){let i=(y*640+x)*4;samples.push(data[i],data[i+1],data[i+2]);}
  results.push({name,revision:THREE.REVISION,counts:meshes.map(m=>m.geometry.drawRange.count),non_background_pixels,samples,png:renderer.domElement.toDataURL('image/png')});
 };
 capture('default-normal-wireframe');
 for(const kind of [0,1,3,4,5]){material_params.material=kind;material_params.wireframe=false;material_params.opacity=0.7;material_params.blending=1;update_material();capture('solid-material-'+kind);}
 material_params.material=4;material_params.opacity=0.4;material_params.blending=5;material_params.equation=THREE.AddEquation;update_material();capture('custom-additive');
 camera_params.perspective=false;make_camera();camera.left=-5;camera.right=5;camera.top=3.75;camera.bottom=-3.75;camera.updateProjectionMatrix();capture('orthographic-normal');
 return results;
})()
