(async()=>{
 const report=await run_iso_vis_benchmark(document.getElementById('app').contentWindow,{resolutions:[8,16],repetitions:3,warmups:1,pause_ms:150,label:'threejs-migration-smoke',hardware:'Same local host, headless Chrome with SwiftShader; NOT a hardware-GPU performance claim'});
 if(report.cases.length!==8||report.cases.some(c=>c.round_trip_ms.count!==3||!Number.isFinite(c.round_trip_ms.p50)))throw Error('Invalid benchmark report');
 return report;
})()
