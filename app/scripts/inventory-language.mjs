import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {parse} from 'acorn';
import {simple} from 'acorn-walk';
const files=['server.mjs','portable.mjs'];
for(const dir of ['lib','public'])for(const name of await readdir(dir))if(/\.(m?js|html)$/.test(name))files.push(dir+'/'+name);
const rows=[];
for(const file of files){
 const source=await readFile(file,'utf8');
 if(file.endsWith('.html')){rows.push({file,kind:'html',text:source});continue;}
 simple(parse(source,{ecmaVersion:'latest',sourceType:'module',locations:true}),{
  Literal(n){if(typeof n.value==='string'&&/[çğıöşüÇĞİÖŞÜ]/.test(n.value))rows.push({file,line:n.loc.start.line,kind:'literal',text:n.value});},
  TemplateElement(n){if(/[çğıöşüÇĞİÖŞÜ]/.test(n.value.raw))rows.push({file,line:n.loc.start.line,kind:'template',text:n.value.raw});}
 });
}
await mkdir('qa/english-migration',{recursive:true});
await writeFile('qa/english-migration/runtime-strings.json',JSON.stringify(rows,null,2));
console.log(JSON.stringify({files:files.length,strings:rows.length,characters:rows.reduce((n,r)=>n+r.text.length,0),byFile:files.map(file=>({file,count:rows.filter(r=>r.file===file).length})).filter(x=>x.count)}));
