import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import {parse} from 'acorn';
import {simple} from 'acorn-walk';
import {createHash} from 'node:crypto';
const map={};for(const n of (await readdir('scripts')).filter(n=>/^english-.*\.json$/.test(n)))Object.assign(map,JSON.parse(await readFile('scripts/'+n,'utf8')));
const pattern=new RegExp(Object.keys(map).sort((a,b)=>b.length-a.length).map(s=>(/^\p{L}/u.test(s)?'(?<![\\p{L}\\p{N}_])':'')+s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+(/\p{L}$/u.test(s)?'(?![\\p{L}\\p{N}_])':'')).join('|'),'gu');
const translate=s=>s.replace(pattern,k=>map[k]);
const sha=s=>createHash('sha256').update(s).digest('hex');
const files=['server.mjs','portable.mjs'];
for(const dir of ['public','lib'])for(const n of await readdir(dir))if(/\.(m?js|html)$/.test(n))files.push(dir+'/'+n);
const changes=[];
for(const file of files){
 const before=await readFile('qa/english-migration/baseline-0.1.14/'+file,'utf8');let after=before;
 if(file.endsWith('.html'))after=translate(before).replace('lang="tr"','lang="en"');
 else{
  const edits=[];
  simple(parse(before,{ecmaVersion:'latest',sourceType:'module'}),{
   Literal(n){if(typeof n.value==='string'){const value=translate(n.value);if(value!==n.value)edits.push({start:n.start,end:n.end,text:JSON.stringify(value)});}},
   TemplateElement(n){const value=translate(n.value.raw);if(value!==n.value.raw)edits.push({start:n.start,end:n.end,text:value});}
  });
  for(const e of edits.sort((a,b)=>b.start-a.start))after=after.slice(0,e.start)+e.text+after.slice(e.end);
  parse(after,{ecmaVersion:'latest',sourceType:'module'});
 }
 if(file==='lib/version.mjs'||file==='public/index.html')after=after.replaceAll('0.1.14','0.2.4');
 if(before!==after){await writeFile(file,after);changes.push({file,before:sha(before),after:sha(after)});}
}
await mkdir('qa/english-migration',{recursive:true});
await writeFile('qa/english-migration/latest-translation-pass.json',JSON.stringify({status:'partial',changes},null,2));
console.log(JSON.stringify({changed:changes.length,status:'partial; residual audit required'}));
