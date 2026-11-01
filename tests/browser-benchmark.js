(async()=>{
 const report=await runIsoVisBenchmark(document.getElementById('app').contentWindow,{resolutions:[8,16],repetitions:3,warmups:1,pauseMs:150,label:'threejs-migration-smoke',hardware:'Same local host, headless Chrome with SwiftShader; NOT a hardware-GPU performance claim'});
 if(report.cases.length!==8||report.cases.some(c=>c.roundTripMs.count!==3||!Number.isFinite(c.roundTripMs.p50)))throw Error('Invalid benchmark report');
 return report;
})()
