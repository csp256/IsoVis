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

let input, resets=0;const c=context({window:{prompt:()=>input},resetWorker(){resets++;},updateMaterial(){},updateBackground(){}});
load(c,'lib/numeric-1.2.6.js');load(c,'js/params.js');load(c,'js/transforms.js');load(c,'js/exportImport.js');
c.initParams();vm.runInContext('transforms=[plainTransform()];baseOrientation=numeric.identity(n+1);',c);
input=JSON.stringify([{name:'shapeParams',data:{dimensions:7}}]);c.importFromJSON();
assert.equal(c.n,7);assert.equal(c.baseOrientation.length,8);assert.equal(c.transforms[0].s.length,7);
assert.equal(c.transforms[0].s[6],1);assert.equal(c.transforms[0].d[6],0);
const saved=JSON.stringify(c.shapeParams);
for(const data of [{dimensions:2},{dimensions:3.5},{dimensions:7,resolution:-1},{coeff:[1,null]}]) {
 input=JSON.stringify([{name:'shapeParams',data}]);assert.throws(()=>c.importFromJSON());assert.equal(JSON.stringify(c.shapeParams),saved);
}
let t=JSON.parse(JSON.stringify(c.transforms[0]));t.axis1=8;
input=JSON.stringify([{name:'shapeParams',data:{dimensions:4}},{name:'transforms',data:[t]}]);
assert.throws(()=>c.importFromJSON());assert.equal(c.n,7);
input=JSON.stringify([{name:'shapeParams',data:{dimensions:3}}]);c.importFromJSON();
assert.equal(c.n,3);assert.equal(c.baseOrientation.length,4);assert.equal(c.transforms[0].d.length,3);assert.equal(resets,2);

input=JSON.stringify([{name:'shapeParams',data:{coeff:[1,2],coeffCount:2}}]);c.importFromJSON();assert.equal(c.shapeParams.coeffCount,2);
