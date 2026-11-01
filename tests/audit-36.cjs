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

const w=worker();w.setup(5,3,0);
for(let i=0;i<w.coords.length;i++)w.coords[i]=(i%7)-3;
const defaults=[3.5,3,1.5,3,-1,2];
for(let count=0;count<=6;count++) {
 const coeff=[1,2,3,4,5,6].slice(0,count);const filled=defaults.map((v,i)=>i<count?coeff[i]:v);
 w.defaultField()(w.coords,coeff);const actual=Array.from(w.values);
 w.defaultField()(w.coords,filled);assert.deepEqual(actual,Array.from(w.values));assert(actual.every(Number.isFinite));assert.equal(coeff.length,count);
}
w.updateFieldFunction({code:'values.fill(c.length);'});w.rebuildScalarField([7],0);assert(Array.from(w.values).every(v=>v===1));
const c=context({setScalarFieldDirty(){c.dirty=true;}});load(c,'js/ui.js');
const folder={closed:false,close(){},open(){},domElement:{parentNode:{parentNode:{removeChild(){}}}},add(){return {onChange(){}};}};
c.shapeParams={coeff:[1,2,3],coeffCount:1};c.cachedCoeff=[];
c.leftgui={__folders:{Shape:{__folders:{Coefficients:folder},onResize(){},removeFolder(){},addFolder(){return folder;}}}};
c.updateCoeff();assert.equal(c.dirty,true);assert.deepEqual(c.shapeParams.coeff,[1]);
