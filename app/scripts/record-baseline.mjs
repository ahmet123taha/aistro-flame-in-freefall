import { VERSION } from '../lib/version.mjs';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root=process.cwd(),files=[];
async function collect(relative){for(const entry of await readdir(path.join(root,relative),{withFileTypes:true})){if(entry.name==='__pycache__'||entry.name.endsWith('.pyc'))continue;const file=path.join(relative,entry.name);if(entry.isDirectory())await collect(file);else files.push(file);}}
for(const dir of ['lib','public','tests','scripts','docs'])await collect(dir);
files.push('server.mjs','portable.mjs','hosted.mjs','package.json','package-lock.json','README.md','AGENTS.md','CHANGELOG.md','.gitignore');
const items=[];
for(const file of files.sort()){const bytes=await readFile(path.join(root,file));if(/\.(m?js)$/.test(file))execFileSync(process.execPath,['--check',path.join(root,file)],{stdio:'pipe',windowsHide:true});items.push({path:file.replaceAll('\\','/'),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
const evidence={version:VERSION,createdAt:new Date().toISOString(),node:process.version,syntaxCheck:'passed',files:items,release:JSON.parse(await readFile('qa/portable-build.json','utf8')),portableTest:JSON.parse(await readFile('qa/portable-verification.json','utf8')),unitTestReport:`${process.argv[2]||'qa/release-'+VERSION}/test-results.log`,classCCompliance:'open; baseline only'};
await mkdir('qa/history',{recursive:true});const text=JSON.stringify(evidence,null,2);await writeFile('qa/source-baseline.json',text);await writeFile(path.join('qa/history',evidence.createdAt.replaceAll(':','-')+'-baseline.json'),text);console.log(JSON.stringify({sourceFiles:items.length,syntaxCheck:'passed',releaseMatchesTest:evidence.release.sha256===evidence.portableTest.sha256}));
