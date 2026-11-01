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

const c=context({transforms:[{type:'0',degrees:0},{type:'0',degrees:0}]});load(c,'js/exportImport.js');
for(const [frame,slot,expected] of [[0,0,0],[90,0,90],[91,1,.5],[180,1,45],[181,0,89],[270,0,0],[271,1,.5],[360,1,45]]) {
 c.frame(frame);assert.equal(c.transforms[slot].degrees,expected);assert.notEqual(c.doneWithGIF,true);
}
c.frame(361);assert.equal(c.doneWithGIF,true);assert.throws(()=>c.frame(-1));assert.throws(()=>c.frame(1.5));
c.transforms=[];assert.throws(()=>c.frame(0),/two rotation/);
assert(!fs.existsSync('js/gif.js'));
