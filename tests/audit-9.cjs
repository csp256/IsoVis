const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = (extra = {}) => { const c = vm.createContext({console: {log(){},time(){},timeEnd(){}}, ...extra}); c.self=c; return c; };
const load = (c, path) => vm.runInContext(fs.readFileSync(path, 'utf8'), c, {filename: path});
const worker = () => {
 const c = context(); c.self = c;
 const html = fs.readFileSync('IsoVis.html', 'utf8');
 for (const id of ['defaultFieldSource', 'worker', 'marchingCubes']) {
  if (id === 'defaultFieldSource' && !html.includes("id='defaultFieldSource'")) continue;
  vm.runInContext(html.match(new RegExp(`<script[^>]* id='${id}'>([\\s\\S]*?)</script>`))[1], c);
 }
 return c;
};

let input,exported,editor;
const c=context({window:{prompt:(message,value)=>message.startsWith('Copy')?(exported=value):input},
 resetWorker(){},updateMaterial(){},updateBackground(){},beforeChangeCallback(){},defaultText:()=> 'default',
 myCodeMirror:{off(){},on(){},setValue(t){editor=t;}}});
load(c,'lib/numeric-1.2.6.js');load(c,'js/params.js');load(c,'js/transforms.js');load(c,'js/workerInterface.js');load(c,'js/exportImport.js');
vm.runInContext('resetWorker=function() {};',c);c.initParams();vm.runInContext('transforms=[plainTransform()];baseOrientation=numeric.identity(n+1);baseOrientation[0][5]=-4;activeFieldSource="values.fill(42);";',c);
c.exportToJSON();const saved=JSON.parse(exported);assert.equal(saved.version,1);assert.equal(saved.baseOrientation[0][5],-4);
for(const modified of [false,true]) {
 vm.runInContext('baseOrientation=numeric.identity(n+1);activeFieldSource=null;',c);
 if(modified)vm.runInContext('baseOrientation[1][5]=99;',c);
 input=exported;c.importFromJSON();assert.equal(c.baseOrientation[0][5],-4);assert.equal(c.baseOrientation[1][5],0);
 assert.equal(vm.runInContext('activeFieldSource',c),'values.fill(42);');assert(editor.includes('values.fill(42);'));
}
const old=JSON.stringify(c.baseOrientation);
input=JSON.stringify({...saved,baseOrientation:[[1]]});assert.throws(()=>c.importSettings(input));assert.equal(JSON.stringify(c.baseOrientation),old);
input=JSON.stringify({...saved,version:20});assert.throws(()=>c.importSettings(input));
input=JSON.stringify(saved.groups);c.importFromJSON();assert.equal(c.baseOrientation[0][5],0);assert.equal(editor,'default');
