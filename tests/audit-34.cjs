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

let input,resets=0,alerts=[];const c=context({window:{prompt:()=>input,alert:m=>alerts.push(m)},resetWorker(){resets++;},updateMaterial(){},updateBackground(){},
 defaultText:()=>'',beforeChangeCallback(){},myCodeMirror:{off(){},on(){},setValue(){}}});
load(c,'lib/numeric-1.2.6.js');load(c,'js/params.js');load(c,'js/transforms.js');load(c,'js/exportImport.js');
c.initParams();vm.runInContext('transforms=[plainTransform()];baseOrientation=numeric.identity(n+1);activeFieldSource=null;',c);
const snapshot=()=>vm.runInContext('JSON.stringify([shapeParams,cameraParams,materialParams,transformParams,n,transforms,baseOrientation,activeFieldSource])',c);
const before=snapshot();
const invalid=[
 '{',JSON.stringify([{name:'transformParams',data:{zoom:0}}]),JSON.stringify([{name:'cameraParams',data:{fov:'bad'}}]),
 JSON.stringify([{name:'materialParams',data:{side:99}}]),JSON.stringify([{name:'shapeParams',data:{coeffCount:1}}]),
 JSON.stringify([{name:'cameraParams',data:{perspective:'yes'}}]),JSON.stringify([{name:'unknown',data:{}}]),
 '[{"name":"shapeParams","data":{"__proto__":{"polluted":true}}}]',
 JSON.stringify([{name:'cameraParams',data:{background:'not-a-color'}}]),
 JSON.stringify([{name:'shapeParams',data:{memoryOveruse:-1}}])
];
for(const text of invalid){assert.throws(()=>c.importSettings(text));assert.equal(snapshot(),before);assert.equal(resets,0);input=text;assert.equal(c.importFromJSON(),false);}
assert.equal(alerts.length,invalid.length);
input=JSON.stringify([{name:'shapeParams',data:{coeff:[2],coeffCount:1}},{name:'materialParams',data:{side:'2'}}]);assert.equal(c.importFromJSON(),true);assert.equal(c.shapeParams.coeffCount,1);assert.equal(c.materialParams.side,2);assert.equal(resets,1);
input=null;assert.equal(c.importFromJSON(),false);assert.equal(resets,1);
