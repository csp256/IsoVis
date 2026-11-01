const fs = require('node:fs');
const {spawnSync} = require('node:child_process');
for (const file of fs.readdirSync('tests').filter(f => /^audit-.*\.cjs$/.test(f)).sort()) {
 console.log(file);
 const result = spawnSync(process.execPath, [`tests/${file}`], {stdio: 'inherit'});
 if (result.status !== 0) process.exit(result.status || 1);
}
