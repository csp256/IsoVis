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

let resets=0;const c=context({setCoordsDirty(){},resetWorker(){resets++;},reportWorkerError(){},});
load(c,'lib/numeric-1.2.6.js');load(c,'js/params.js');load(c,'js/transforms.js');load(c,'js/ui.js');
vm.runInContext('buildLeftGUI=function() {};initParams();baseOrientation=numeric.identity(n+1);transforms=[plainTransform(),plainTransform(),plainTransform(),plainTransform()];transforms.forEach(function(t,i){t.type=String(i);t.axis1=4;});',c);
vm.runInContext('shapeParams.dimensions=7;',c);c.dimensionsChanged();assert.equal(c.transforms[1].s.length,7);assert.equal(c.transforms[1].s[6],1);assert.equal(c.transforms[2].d[6],0);
assert(c.computeFullTransform().flat().every(Number.isFinite));
vm.runInContext('shapeParams.dimensions=3;',c);c.dimensionsChanged();assert.equal(c.transforms[0].axis1,2);assert.equal(c.transforms[1].s.length,3);assert(c.computeFullTransform().flat().every(Number.isFinite));assert.equal(c.baseOrientation.length,4);
const before=JSON.stringify(c.transforms);vm.runInContext('shapeParams.dimensions=2.5;',c);c.dimensionsChanged();assert.equal(c.n,3);assert.equal(c.shapeParams.dimensions,3);assert.equal(JSON.stringify(c.transforms),before);assert.equal(resets,2);
assert.match(fs.readFileSync('js/exportImport.js','utf8'),/normalizedTransformStack\(stack, dimensions, explicitStack\)/);
