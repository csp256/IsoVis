const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const conventional=new Set(['README.md','LICENSE']);
function inspect(directory) {
 for(const item of fs.readdirSync(directory,{withFileTypes:true})) {
  if(item.name.startsWith('.')||(directory==='.'&&['lib','css'].includes(item.name)))continue;
  const file=path.join(directory,item.name);
  assert(conventional.has(item.name)||/^[a-z0-9_]+(?:\.[a-z0-9_]+)*$/.test(item.name),'Non-snake_case first-party path: '+file);
  if(item.isDirectory()){inspect(file);continue;}
  if(!/\.(?:js|cjs|mjs|html)$/.test(item.name))continue;
  const source=fs.readFileSync(file,'utf8');
  // A small declaration guard, not a new parser/linter dependency. Native
  // constructor/namespace aliases keep their third-party API spellings.
  for(const [,name]of source.matchAll(/\b(?:function|var|let|const)\s+([A-Za-z_$][\w$]*)/g))
   assert(/^[a-z_][a-z0-9_]*$/.test(name)||['THREE','URL','Blob','Worker'].includes(name),'Non-snake_case declaration '+name+' in '+file);
  for(const [,name]of source.matchAll(/\bclass\s+([A-Za-z_$][\w$]*)/g))
   assert(/^[A-Z][A-Za-z0-9]*$/.test(name),'Type must be CamelCase: '+name);
 }
}
inspect('.');
// The renamed entry point must load actual files, including vendored CSS/JS.
const html=fs.readFileSync('isovis.html','utf8');
for(const [,file]of html.matchAll(/(?:src|href)=["']([^"']+)["']/g))if(!file.includes('://'))assert(fs.existsSync(file),file);
