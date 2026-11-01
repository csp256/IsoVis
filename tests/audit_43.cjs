const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = (extra = {}) => { const c = vm.createContext({console: {log(){},time(){},timeEnd(){}}, ...extra}); c.self=c; return c; };
const load = (c, path) => vm.runInContext(fs.readFileSync(path, 'utf8'), c, {filename: path});
const worker = () => {
 const c = context(); c.self = c;
 const html = fs.readFileSync('isovis.html', 'utf8');
 for (const id of ['default_field_source', 'worker', 'marching_cubes']) {
  if (id === 'default_field_source' && !html.includes("id='default_field_source'")) continue;
  vm.runInContext(html.match(new RegExp(`<script[^>]* id='${id}'>([\\s\\S]*?)</script>`))[1], c);
 }
 return c;
};

const c=context();load(c,'bench/stats.js');
assert.equal(c.isovis_bench_stats.summarize([]),null);
const input=[10,1,4,2,3];const result=c.isovis_bench_stats.summarize(input);
assert.equal(result.p50,3);assert.equal(result.p95,10);assert.equal(result.min,1);assert.equal(result.max,10);assert.deepEqual(input,[10,1,4,2,3]);
new vm.Script(fs.readFileSync('bench/benchmark.js','utf8'));
assert(!fs.readFileSync('isovis.html','utf8').includes('bench/'));
