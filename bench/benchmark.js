// Optional browser-only harness. Never loaded by IsoVis.html or normal tests.
async function runIsoVisBenchmark(app, options) {
  options = Object.assign({resolutions:[8,16],repetitions:5,warmups:1,pauseMs:150,label:'unlabeled',hardware:'unspecified'}, options);
  if (!options.resolutions.length || options.resolutions.some(r=>!Number.isInteger(r)||r<2||r>24)) throw Error('Benchmark resolutions must be integers 2–24');
  if (!Number.isInteger(options.repetitions)||options.repetitions<1||options.repetitions>20||!Number.isInteger(options.warmups)||options.warmups<1||options.warmups>5) throw Error('Invalid sample counts');
  const sleep = ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const cancelled = ()=>{if(options.signal?.aborted)throw Error('Benchmark cancelled');};
  const ready = async()=>{const limit=performance.now()+15000;while(!app.controls||app.waitingForAnyWebWorker()||app.pendingWorkerStage!==null){cancelled();if(performance.now()>limit)throw Error('Application did not become idle');await sleep(20);}};
  await ready();
  app.cameraParams.wobble=false;
  const gl=app.renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
  const result={label:options.label,hardware:options.hardware,date:new Date().toISOString(),userAgent:navigator.userAgent,
    hardwareConcurrency:navigator.hardwareConcurrency,deviceMemoryGiB:navigator.deviceMemory||null,
    gpu:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):'unavailable',
    viewport:[app.innerWidth,app.innerHeight],workerCount:app.workers.length,
    settings:{resolutions:options.resolutions,repetitions:options.repetitions,warmups:options.warmups,pauseMs:options.pauseMs},cases:[]};
  const fields=[{name:'default',source:app.defaultFieldBody()},{name:'sphere',source:'for(var i=0,j=0;i<size3;i++,j+=n) values[i]=x[j]*x[j]+x[j+1]*x[j+1]+x[j+2]*x[j+2]-9;'}];
  const original=app.handleWorkerMessage;
  let complete=null,handling=0,start=0,frameGaps=[],lastFrame=null,tracking=false,raf=null;
  function tick(time){if(tracking&&lastFrame!==null)frameGaps.push(time-lastFrame);lastFrame=time;raf=requestAnimationFrame(tick);}
  raf=requestAnimationFrame(tick);
  app.handleWorkerMessage=function(e){const before=performance.now();original.call(app,e);handling+=performance.now()-before;
    if(complete&&!app.waitingForAnyWebWorker()&&app.pendingWorkerStage===null){const done=complete;complete=null;done(performance.now()-start);}};
  function calculate(){return new Promise((resolve,reject)=>{
    let timer=setTimeout(()=>{complete=null;reject(Error('Calculation timed out'));},15000);
    complete=elapsed=>{clearTimeout(timer);resolve(elapsed);};handling=0;start=performance.now();
    try{app.talkToWorker('init');}catch(error){clearTimeout(timer);complete=null;reject(error);}
  });}
  try {
    for(const field of fields)for(const resolution of options.resolutions)for(const normals of [false,true]) {
      cancelled();app.activeFieldSource=field.source;app.shapeParams.resolution=resolution;app.shapeParams.iso=field.name==='sphere'?0:5;app.materialParams.calcNormals=normals;
      const latency=[],replyHandling=[],afterReplyFrame=[],memory=[];frameGaps=[];lastFrame=null;
      const sampleMemory=()=>{if(performance.memory)memory.push(performance.memory.usedJSHeapSize);};
      const memoryTimer=setInterval(sampleMemory,25);
      try {
        for(let i=0;i<options.warmups+options.repetitions;i++){
          cancelled();tracking=i>=options.warmups;lastFrame=null;
          const elapsed=await calculate();const finished=performance.now();
          await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
          if(i>=options.warmups){latency.push(elapsed);replyHandling.push(handling);afterReplyFrame.push(performance.now()-finished);sampleMemory();}
          tracking=false;await sleep(options.pauseMs);
        }
      } finally {tracking=false;clearInterval(memoryTimer);}
      const entry={field:field.name,resolution,normals,roundTripMs:IsoVisBenchStats.summarize(latency),
        replyHandlingMs:IsoVisBenchStats.summarize(replyHandling),twoAnimationFramesMs:IsoVisBenchStats.summarize(afterReplyFrame),
        frameGapMs:IsoVisBenchStats.summarize(frameGaps),observedHeapBytes:IsoVisBenchStats.summarize(memory),
        rendererResources:Object.assign({},app.renderer.info.memory)};
      result.cases.push(entry);if(options.onCase)options.onCase(entry);
    }
    return result;
  } finally {
    app.handleWorkerMessage=original;cancelAnimationFrame(raf);
    // The iframe is dedicated to this benchmark, not an existing user session.
    if(options.signal?.aborted)app.resetWorker(4);
  }
}
