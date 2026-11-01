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

const c=context({console:{warn(){}},location:{search:''}});load(c,'js/params.js');load(c,'lib/url.js');
for(const [query,expected] of [['',30],['?resolution=4',4],['?resolution=65',65],['?resolution=0',30],['?resolution=1',30],['?resolution=66',30],['?resolution=2.5',30],['?resolution=wat',30],['?resolution=%E0%A4%A',30]]) {
 c.location.search=query;assert.equal(c.getURLResolution(30),expected);assert.equal(typeof c.getURLResolution(30),'number');
}
assert.match(fs.readFileSync('js/isovis.js','utf8'),/resetWorker\(getURLResolution/);
