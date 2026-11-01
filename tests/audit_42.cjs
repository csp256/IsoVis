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

const os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'isovis-ci-'));
try {
 fs.mkdirSync(path.join(dir,'tests'));fs.copyFileSync('tests/run.cjs',path.join(dir,'tests/run.cjs'));
 fs.writeFileSync(path.join(dir,'tests/audit_failure.cjs'),"require('node:assert/strict').equal(1,2);");
 const result=spawnSync(process.execPath,['tests/run.cjs'],{cwd:dir,encoding:'utf8'});assert.equal(result.status,1);
} finally {fs.rmSync(dir,{recursive:true,force:true});}
const workflow=fs.readFileSync('.github/workflows/tests.yml','utf8');
assert(workflow.includes('pull_request:'));assert(workflow.includes('branches: [main]'));assert(workflow.includes('run: just deps'));assert(workflow.includes('run: just check'));assert(workflow.includes('windows-latest'));assert(workflow.includes('contents: read'));assert(!workflow.includes('npm install'));
