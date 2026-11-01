// Optional browser-only harness. Never loaded by isovis.html or normal tests.
async function run_iso_vis_benchmark(app, options) {
  options = Object.assign({resolutions:[8,16],repetitions:5,warmups:1,pause_ms:150,label:'unlabeled',hardware:'unspecified'}, options);
  if (!options.resolutions.length || options.resolutions.some(r=>!Number.isInteger(r)||r<2||r>24)) throw Error('Benchmark resolutions must be integers 2–24');
  if (!Number.isInteger(options.repetitions)||options.repetitions<1||options.repetitions>20||!Number.isInteger(options.warmups)||options.warmups<1||options.warmups>5) throw Error('Invalid sample counts');
  const sleep = ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const cancelled = ()=>{if(options.signal?.aborted)throw Error('Benchmark cancelled');};
  const ready = async()=>{const limit=performance.now()+15000;while(!app.controls||app.waiting_for_any_web_worker()||app.pending_worker_stage!==null){cancelled();if(performance.now()>limit)throw Error('Application did not become idle');await sleep(20);}};
  await ready();
  app.camera_params.wobble=false;
  const gl=app.renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
  const result={label:options.label,hardware:options.hardware,date:new Date().toISOString(),user_agent:navigator.userAgent,
    hardware_concurrency:navigator.hardwareConcurrency,device_memory_gib:navigator.deviceMemory||null,
    gpu:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):'unavailable',
    viewport:[app.innerWidth,app.innerHeight],worker_count:app.workers.length,
    settings:{resolutions:options.resolutions,repetitions:options.repetitions,warmups:options.warmups,pause_ms:options.pause_ms},
    initial_session:JSON.parse(JSON.stringify({shape_params:app.shape_params,camera_params:app.camera_params,
      material_params:app.material_params,transform_params:app.transform_params,transforms:app.transforms,base_orientation:app.base_orientation})),cases:[]};
  const fields=[{name:'default',source:app.default_field_body()},{name:'sphere',source:'for(var i=0,j=0;i<size3;i++,j+=n) values[i]=x[j]*x[j]+x[j+1]*x[j+1]+x[j+2]*x[j+2]-9;'}];
  result.fields=fields.map(field=>({name:field.name,source:field.source}));
  const original=app.handle_worker_message;
  let complete=null,handling=0,start=0,frame_gaps=[],last_frame=null,tracking=false,raf=null;
  function tick(time){if(tracking&&last_frame!==null)frame_gaps.push(time-last_frame);last_frame=time;raf=requestAnimationFrame(tick);}
  raf=requestAnimationFrame(tick);
  app.handle_worker_message=function(e){const before=performance.now();original.call(app,e);handling+=performance.now()-before;
    if(complete&&!app.waiting_for_any_web_worker()&&app.pending_worker_stage===null){const done=complete;complete=null;done(performance.now()-start);}};
  function calculate(){return new Promise((resolve,reject)=>{
    let timer=setTimeout(()=>{complete=null;reject(Error('Calculation timed out'));},15000);
    complete=elapsed=>{clearTimeout(timer);resolve(elapsed);};handling=0;start=performance.now();
    try{app.talk_to_worker('init');}catch(error){clearTimeout(timer);complete=null;reject(error);}
  });}
  try {
    for(const field of fields)for(const resolution of options.resolutions)for(const normals of [false,true]) {
      cancelled();app.active_field_source=field.source;app.shape_params.resolution=resolution;app.shape_params.iso=field.name==='sphere'?0:5;app.material_params.calc_normals=normals;
      const latency=[],reply_handling=[],after_reply_frame=[],memory=[];frame_gaps=[];last_frame=null;
      const sample_memory=()=>{if(performance.memory)memory.push(performance.memory.usedJSHeapSize);};
      const memory_timer=setInterval(sample_memory,25);
      try {
        for(let i=0;i<options.warmups+options.repetitions;i++){
          cancelled();tracking=i>=options.warmups;last_frame=null;
          const elapsed=await calculate();const finished=performance.now();
          await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
          if(i>=options.warmups){latency.push(elapsed);reply_handling.push(handling);after_reply_frame.push(performance.now()-finished);sample_memory();}
          tracking=false;await sleep(options.pause_ms);
        }
      } finally {tracking=false;clearInterval(memory_timer);}
      const entry={field:field.name,resolution,normals,round_trip_ms:isovis_bench_stats.summarize(latency),
        reply_handling_ms:isovis_bench_stats.summarize(reply_handling),two_animation_frames_ms:isovis_bench_stats.summarize(after_reply_frame),
        frame_gap_ms:isovis_bench_stats.summarize(frame_gaps),observed_heap_bytes:isovis_bench_stats.summarize(memory),
        renderer_resources:Object.assign({},app.renderer.info.memory)};
      result.cases.push(entry);if(options.on_case)options.on_case(entry);
    }
    return result;
  } finally {
    app.handle_worker_message=original;cancelAnimationFrame(raf);
    // The iframe is dedicated to this benchmark, not an existing user session.
    if(options.signal?.aborted)app.reset_worker(4);
  }
}
