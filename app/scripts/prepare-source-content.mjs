import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {gunzip} from 'node:zlib';
import {promisify} from 'node:util';
import {build,coreSource} from './build-source-content-index.mjs';
const [root,output,phase='documents']=process.argv.slice(2),unzip=promisify(gunzip);
if(!root||!output||!['documents','tables-text','all-supported'].includes(phase))throw Error('Usage: progressive-build.mjs DATASET OUTPUT documents|tables-text|all-supported');
const files=JSON.parse((await unzip(await readFile(path.join(root,'_app/files.json.gz')))).toString('utf8'));
const eligible=files.filter(coreSource).filter(f=>{
 const ext=path.extname(f.name).toLowerCase(),document=['.pdf','.xlsx','.log'].includes(ext)||(['.txt','.md'].includes(ext)&&(/rapor|destek/i.test(f.category)||/read.?me|summary|report|description|instruction/i.test(f.name)));
 return phase==='documents'?document:phase==='tables-text'?['.csv','.tsv','.txt','.md'].includes(ext):document||['.csv','.tsv','.txt','.md'].includes(ext);
});
const started=Date.now();console.log(JSON.stringify({phase,selected:eligible.length,selectedBytes:eligible.reduce((n,f)=>n+f.bytes,0),startedAt:new Date(started).toISOString()}));
const result=await build(root,output,{ids:eligible.map(f=>f.id),diskOnly:true,onProgress:p=>{if(p.completedHashGroups%100===0)console.log(JSON.stringify({completed:p.completedHashGroups,total:p.totalHashGroups,chunks:p.chunks,elapsedSeconds:(Date.now()-started)/1000}));}});
const receipt={phase,selected:eligible.length,chunkCount:result.chunkCount,elapsedSeconds:(Date.now()-started)/1000,counts:result.audit.reduce((o,x)=>(o[x.status]=(o[x.status]||0)+1,o),{}),completedAt:new Date().toISOString()};await writeFile(path.join(output,'build-receipt.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
