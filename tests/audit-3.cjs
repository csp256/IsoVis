const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = (extra = {}) => vm.createContext({console, ...extra});
const load = (c, path) => vm.runInContext(fs.readFileSync(path, 'utf8'), c, {filename: path});
const worker = () => {
 const c = context(); c.self = c;
 const html = fs.readFileSync('IsoVis.html', 'utf8');
 for (const id of ['worker', 'marchingCubes']) {
  vm.runInContext(html.match(new RegExp(`<script type='text/worker' id='${id}'>([\\s\\S]*?)</script>`))[1], c);
 }
 return c;
};

const c = context({setCoordsDirty(){ c.dirty = true; }, buildRightGUI(){}});
load(c, 'lib/numeric-1.2.6.js'); load(c, 'js/params.js'); load(c, 'js/transforms.js');
for (const pop of [true, false]) {
 vm.runInContext(`initParams(); transformParams.popAllOnApply=${pop}; baseOrientation=numeric.identity(n+1);
 transforms=[plainTransform(),plainTransform()]; transforms[0].type='2'; transforms[0].d[0]=2;
 transforms[1].type='0'; transforms[1].axis2=1; transforms[1].degrees=30;`, c);
 const before = JSON.stringify(c.computeFullTransform()); c.dirty=false;
 c.applyTransforms(); assert.equal(JSON.stringify(c.computeFullTransform()), before);
 assert.equal(c.transforms.length, pop ? 1 : 2); assert.equal(c.dirty, true);
 c.applyTransforms(); assert.equal(JSON.stringify(c.computeFullTransform()), before);
}
