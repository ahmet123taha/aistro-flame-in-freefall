import {readFile,writeFile,readdir,mkdir,cp} from 'node:fs/promises';
import {parse} from 'acorn';import {simple} from 'acorn-walk';import path from 'node:path';
const map={};for(const n of (await readdir('scripts')).filter(n=>/^english-.*\.json$/.test(n)))Object.assign(map,JSON.parse(await readFile('scripts/'+n,'utf8')));
const pattern=new RegExp(Object.keys(map).sort((a,b)=>b.length-a.length).map(s=>(/^\p{L}/u.test(s)?'(?<![\\p{L}\\p{N}_])':'')+s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+(/\p{L}$/u.test(s)?'(?![\\p{L}\\p{N}_])':'')).join('|'),'gu');
const translate=s=>s.replace(pattern,k=>map[k]);
const plan=JSON.parse(await readFile('qa/english-migration/history-plan.json','utf8')),residual=new Map();
for(const entry of plan){
 const src=entry.sourceRoot,dest=path.join(src,'..','english');await mkdir(dest,{recursive:true});await cp(src,dest,{recursive:true});
 const originalVersion=(await readFile(path.join(src,'lib/version.mjs'),'utf8')).match(/VERSION\s*=\s*['"]([^'"]+)/)?.[1]||entry.oldVersion;
 const files=['server.mjs','portable.mjs'];for(const d of ['lib','public'])try{for(const n of await readdir(path.join(src,d)))if(/\.(m?js|html)$/.test(n))files.push(d+'/'+n);}catch{}
 for(const f of files){let before;try{before=await readFile(path.join(src,f),'utf8');}catch{continue;}let after=before;
  if(f.endsWith('.html'))after=translate(before).replace('lang="tr"','lang="en"');
  else{const edits=[];simple(parse(before,{ecmaVersion:'latest',sourceType:'module'}),{
   Literal(n){if(typeof n.value==='string'){const value=translate(n.value);if(value!==n.value)edits.push({start:n.start,end:n.end,text:JSON.stringify(value)});}},
   TemplateElement(n){const value=translate(n.value.raw);if(value!==n.value.raw)edits.push({start:n.start,end:n.end,text:value});}
  });for(const e of edits.sort((a,b)=>b.start-a.start))after=after.slice(0,e.start)+e.text+after.slice(e.end);}
  if(['lib/version.mjs','public/index.html'].includes(f))after=after.replaceAll(originalVersion,entry.version);
  await writeFile(path.join(dest,f),after);
  function note(s){if(/[çğıöşüÇĞİÖŞÜ]/.test(s)&&!s.includes('Veri_Seti/')&&!s.includes('Destek_Kaynaklar/')){const a=residual.get(s)||[];a.push(entry.version+':'+f);residual.set(s,a);}}
  if(f.endsWith('.html')){for(const s of after.match(/>[^<>]+</g)||[])note(s.slice(1,-1));}
  else simple(parse(after,{ecmaVersion:'latest',sourceType:'module'}),{Literal(n){if(typeof n.value==='string')note(n.value);},TemplateElement(n){note(n.value.raw);}});
 }
 for(const file of ['package.json','package-lock.json'])try{const p=path.join(dest,file),d=JSON.parse(await readFile(p));d.version=entry.version;if(d.packages?.[''])d.packages[''].version=entry.version;await writeFile(p,JSON.stringify(d,null,2)+'\n');}catch{}
}
await writeFile('qa/english-migration/history-residual.json',JSON.stringify([...residual].map(([text,locations])=>({text,locations})),null,2));
console.log(JSON.stringify({versions:plan.length,distinctResiduals:residual.size}));
