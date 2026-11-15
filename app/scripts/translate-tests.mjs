import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import {parse} from 'acorn';
import {simple} from 'acorn-walk';
const map={};for(const n of (await readdir('scripts')).filter(n=>/^english-.*\.json$/.test(n)))Object.assign(map,JSON.parse(await readFile('scripts/'+n,'utf8')));
const pattern=new RegExp(Object.keys(map).sort((a,b)=>b.length-a.length).map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'gu');
const translate=s=>s.replace(pattern,k=>map[k]);
await mkdir('qa/english-migration/tests-original',{recursive:true});
for(const file of (await readdir('tests')).filter(n=>n.endsWith('.mjs'))){
 const backup='qa/english-migration/tests-original/'+file;
 let before;try{before=await readFile(backup,'utf8');}catch{before=await readFile('tests/'+file,'utf8');await writeFile(backup,before);}
 const edits=[];
 simple(parse(before,{ecmaVersion:'latest',sourceType:'module'}),{
  Literal(n){if(n.regex){let value=translate(n.regex.pattern).replaceAll('98,5','98\\.5').replaceAll('0,052','0\\.052').replaceAll('0,033','0\\.033');if(value!==n.regex.pattern)edits.push({start:n.start,end:n.end,text:'/'+value+'/'+n.regex.flags});}
   else if(typeof n.value==='string'){const value=translate(n.value);if(value!==n.value)edits.push({start:n.start,end:n.end,text:JSON.stringify(value)});}},
  TemplateElement(n){const value=translate(n.value.raw);if(value!==n.value.raw)edits.push({start:n.start,end:n.end,text:value});}
 });
 let after=before;for(const e of edits.sort((a,b)=>b.start-a.start))after=after.slice(0,e.start)+e.text+after.slice(e.end);
 parse(after,{ecmaVersion:'latest',sourceType:'module'});await writeFile('tests/'+file,after);
}
