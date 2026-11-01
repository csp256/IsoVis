// Optional real-browser checks. Run sequentially; requires Bun and Chrome.
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve, sep} from 'node:path';
const option=name=>{const i=process.argv.indexOf(name);if(i<0)return null;if(!process.argv[i+1]||process.argv[i+1].startsWith('--'))throw Error('Missing value: '+name);return process.argv[i+1];};
const root=resolve(option('--root') || process.env.ISOVIS_ROOT || '.');
const reportPath=option('--report') || process.env.ISOVIS_REPORT;
const unsupported=process.argv.includes('--unsupported');
const benchmark=process.argv.includes('--benchmark');
const visual=process.argv.includes('--visual');
const profile=mkdtempSync(join(tmpdir(),'isovis-chrome-'));
const server=Bun.serve({hostname:'127.0.0.1',port:0,async fetch(request){
 let pathname;try{pathname=decodeURIComponent(new URL(request.url).pathname);}catch{return new Response('Bad path',{status:400});}
 const path=resolve(root,'.'+pathname);
 if(!path.startsWith(root+sep))return new Response('Forbidden',{status:403});
 const file=Bun.file(path);return await file.exists()?new Response(file):new Response('Not found',{status:404});
}});
const chrome=option('--chrome') || process.env.CHROME_PATH || (process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':'google-chrome');
let ws,proc;
try {
 proc=Bun.spawn([chrome,'--headless=new','--no-first-run','--no-default-browser-check',`--user-data-dir=${profile}`,'--remote-debugging-port=0','--disable-background-networking','--disable-extensions','--disable-sync','--use-angle=swiftshader','--enable-unsafe-swiftshader','--renderer-process-limit=2','about:blank'],{stdout:'ignore',stderr:'ignore'});
 let port;
 for(let i=0;i<100;i++){
  const file=Bun.file(join(profile,'DevToolsActivePort'));
  if(await file.exists()){port=Number((await file.text()).split('\n')[0]);break;}
  await Bun.sleep(100);
 }
 if(!port)throw Error('Chrome did not start; set CHROME_PATH to its executable');
 const tabs=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();
 ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((ok,no)=>{ws.onopen=ok;ws.onerror=no;});
 let id=0;const pending=new Map(),errors=[];
 ws.onmessage=({data})=>{const msg=JSON.parse(data);if(msg.id){const p=pending.get(msg.id);if(!p)return;pending.delete(msg.id);msg.error?p.reject(msg.error):p.resolve(msg.result);}else if(msg.method==='Runtime.exceptionThrown'||(!unsupported&&msg.method==='Runtime.consoleAPICalled'&&msg.params.type==='error')){errors.push(msg.params);console.error(JSON.stringify(msg.params));}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;const timer=setTimeout(()=>{pending.delete(n);reject(Error('Chrome protocol timeout: '+method));},30000);pending.set(n,{resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});ws.send(JSON.stringify({id:n,method,params}));});
 async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
 await send('Runtime.enable');await send('Page.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:1200,height:800,deviceScaleFactor:1,mobile:false});
 if(unsupported)await send('Page.addScriptToEvaluateOnNewDocument',{source:`const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return kind==='webgl2'?null:original.call(this,kind,...args);};window.__createdWorkers=0;window.Worker=new Proxy(Worker,{construct(target,args){window.__createdWorkers++;return Reflect.construct(target,args);}});`});
 await send('Page.navigate',{url:`http://127.0.0.1:${server.port}${benchmark?'/bench/index.html':'/IsoVis.html?resolution=4'}`});
 const ready=unsupported?"!!document.getElementById('startupError')":benchmark?"typeof runIsoVisBenchmark==='function' && !!document.getElementById('app').contentWindow.controls && !document.getElementById('app').contentWindow.waitingForAnyWebWorker()":"typeof controls!=='undefined' && !waitingForAnyWebWorker()";
 let initialized=false;for(let i=0;i<150;i++){if(await evaluate(ready)){initialized=true;break;}await Bun.sleep(100);}
 if(!initialized)throw Error('Application startup timed out');
 if(unsupported){
  const result=await evaluate("({message:document.getElementById('startupError').textContent,workers:__createdWorkers})");
  if(!result.message.includes('WebGL2')||result.workers!==0)throw Error('Unsupported context was not rejected before starting workers');
  console.log(result);
 }else if(benchmark||visual){
  const report=await evaluate(await Bun.file(new URL(benchmark?'./browser-benchmark.js':'./browser-visual.js',import.meta.url)).text());
  if(reportPath)await Bun.write(reportPath,JSON.stringify(report,null,2)+'\n');
  console.log(benchmark?report.cases.map(c=>({field:c.field,resolution:c.resolution,normals:c.normals,roundTripMs:c.roundTripMs,handlingMs:c.replyHandlingMs})):report.map(c=>({name:c.name,counts:c.counts,pixels:c.nonBackgroundPixels})));
 }else{
  async function listenerCounts(){const counts=[];for(const expression of ['renderer.domElement','window','document']){const r=await send('Runtime.evaluate',{expression});const events=await send('DOMDebugger.getEventListeners',{objectId:r.result.objectId});counts.push(events.listeners.length);}return counts;}
  console.log(await evaluate(await Bun.file(new URL('./browser-check.js',import.meta.url)).text()));
  const before=await listenerCounts();await evaluate('for(var j=0;j<3;j++)buildGUI();for(var j=0;j<5;j++)makeCamera();');const after=await listenerCounts();
  if(JSON.stringify(before)!==JSON.stringify(after))throw Error('GUI/camera listener leak');
  console.log('Stable listeners',before,after);

  // Real pointer/wheel events exercise the upstream controls, not DOM mocks.
  const point=await evaluate('(()=>{const r=renderer.domElement.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()');
  const position=await evaluate('camera.position.toArray()');
  await send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',buttons:1,clickCount:1});
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:point.x+30,y:point.y+20,buttons:1});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:point.x+30,y:point.y+20,button:'left',buttons:0,clickCount:1});
  if(JSON.stringify(position)===JSON.stringify(await evaluate('camera.position.toArray()')))throw Error('Pointer orbit did not move camera');
  const distance=await evaluate('camera.position.distanceTo(controls.target)');
  await send('Input.dispatchMouseEvent',{type:'mouseWheel',...point,deltaX:0,deltaY:100});
  if(distance===await evaluate('camera.position.distanceTo(controls.target)'))throw Error('Wheel zoom did not move camera');
  await send('Emulation.setDeviceMetricsOverride',{width:1000,height:700,deviceScaleFactor:1,mobile:false});
  if(!await evaluate('cameraParams.perspective=false;makeCamera();render();camera.projectionMatrix.elements.every(Number.isFinite) && renderer.getContext().getError()===0'))throw Error('Orthographic camera after resize failed');

 }
 if(errors.length)throw Error('Browser reported errors');
 console.log('Chrome checks passed');
}finally{ws?.close();proc?.kill();if(proc)await proc.exited;server.stop(true);rmSync(profile,{recursive:true,force:true});}
