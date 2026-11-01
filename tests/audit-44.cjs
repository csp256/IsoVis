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

const text=fs.readFileSync('README.md','utf8');
assert(!text.includes('rawgit.com'));assert(!text.includes('Editor is not included in import/export'));
assert(text.includes('unsubmitted drafts are not saved'));assert(text.includes('tests/README.md'));assert(fs.existsSync('tests/README.md'));
assert(text.includes('default branch is `main`'));assert(text.includes('no Node, Bun,'));
