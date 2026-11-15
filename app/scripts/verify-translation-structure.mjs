import {parse} from 'acorn';import {readFile,readdir,writeFile} from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const sha=s=>createHash('sha256').update(s).digest('hex');
function structure(node){
 if(Array.isArray(node))return node.map(structure);
 if(!node||typeof node!=='object')return node;
 const out={};for(const [k,v] of Object.entries(node)){
  if(['start','end','loc','raw'].includes(k))continue;
  if(node.type==='Literal'&&k==='value'&&typeof v==='string'){out[k]='<localized-string>';continue;}
  if(node.type==='TemplateElement'&&k==='value'){out[k]='<localized-template>';continue;}
  out[k]=structure(v);
 }return out;
}
const plan=JSON.parse(await readFile('qa/english-migration/history-plan.json','utf8')),results=[];
for(const rec of plan){
 const files=['server.mjs','portable.mjs'];for(const d of ['lib','public'])for(const n of await readdir(path.join(rec.sourceRoot,d)))if(/\.m?js$/.test(n))files.push(d+'/'+n);
 const rows=[];for(const file of files){
  const original=await readFile(path.join(rec.sourceRoot,file),'utf8'),translated=await readFile(path.join(rec.sourceRoot,'..','english',file),'utf8');
  const before=structure(parse(original,{ecmaVersion:'latest',sourceType:'module'})),after=structure(parse(translated,{ecmaVersion:'latest',sourceType:'module'}));
  assert.deepEqual(after,before,rec.version+':'+file);rows.push({file,originalSha256:sha(original),englishSha256:sha(translated)});
 }
 results.push({version:rec.version,passed:true,check:'AST operators, numbers, booleans, regular expressions, identifiers and control flow unchanged; localized string contents excluded.',limitations:'String content semantics are verified by tests and review, not this structural check.',files:rows});
}
await writeFile('qa/english-migration/structural-verification.json',JSON.stringify(results,null,2));console.log(JSON.stringify({passed:true,versions:results.length,files:results.reduce((n,x)=>n+x.files.length,0)}));
