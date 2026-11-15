import test from 'node:test';
import assert from 'node:assert/strict';
import {extractDialogueConditions,applyDialogueConditions} from '../lib/dialogue-conditions.mjs';
import {parameterSupport} from '../lib/parameter-support.mjs';
import {parameterDiagnostics} from '../lib/parameter-diagnostics.mjs';
import {researchCandidates} from '../lib/research-candidates.mjs';
import {researchRanking} from '../lib/research.mjs';
import {researchScoreHtml} from '../public/environment-panel.mjs';
import {readFile} from 'node:fs/promises';
import {VERSION} from '../lib/version.mjs';
const values=q=>Object.fromEntries(extractDialogueConditions({question:q}).updates.map(x=>[x.key,x.value]));
const fields=['gravityMs2','temperatureK','oxygen','pressure','airflow','thicknessMm'];
const row=(runId,material,values,fileId='f1')=>({sourceId:'PSI-1',runId,values:{material,...values},provenance:{fileId,sha256:'a'.repeat(64)}});
test('release identity agrees across visible header, page title and package metadata',async()=>{
 const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
 const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
 const lock=JSON.parse(await readFile(new URL('../package-lock.json',import.meta.url),'utf8'));
 assert.equal(pkg.version,VERSION);assert.equal(lock.version,VERSION);assert.equal(lock.packages[''].version,VERSION);
 assert.ok(html.includes('<title>AISTRO '+VERSION+' '));assert.ok(html.includes('<small>'+VERSION+' '));
});
test('053 current conditions survive research-discovery wording in both languages',()=>{
 assert.deepEqual(values('I use propane; temperature 300 K; oxygen 21%; pressure 1 bar. Find a study.'),{material:'propane',temperatureK:300,oxygen:21,pressure:100});
 assert.deepEqual(values('I store cotton. Please find an article; temperature 300 K.'),{material:'cotton',temperatureK:300});
 assert.deepEqual(values('Pamuk kullanıyorum; sıcaklık 25 C; basınç 1 bar. Makale bul.'),{material:'cotton',temperatureK:298.15,pressure:100});
});
test('053 reported and quoted values cannot overwrite current values across source clauses',()=>{
 for(const q of ['According to the article, temperature 900 K','In the study, oxygen 90%; pressure 5 bar','The table shows pressure 100 kPa','The source reports temperature 300 K','"temperature 300 K"'])assert.deepEqual(values(q),{},q);
 assert.deepEqual(values('I use cotton; temperature 300 K. The paper reports temperature 900 K.'),{material:'cotton',temperatureK:300});
});
test('053 gas composition binds percentages to the gas name, not to the whole sentence',()=>{
 assert.equal(values('oxygen 21% and nitrogen 79%').oxygen,21);
 assert.equal(values('nitrogen 79% and oxygen 21%').oxygen,21);
 assert.equal(values('oksijen %21 ve azot %79').oxygen,21);
 assert.equal(values('oxygen 21%, CO2 3%').oxygen,21);
 assert.equal(values('21% oxygen and 79% nitrogen').oxygen,21);
});
test('053 material identity keeps explicit composites and fuel names',()=>{
 assert.equal(values('My material is cotton/polyester blend').material,'cotton/polyester blend');
 assert.equal(values('I use methane').material,'methane');
 assert.equal(values('I use PMMA at gravity 0.2 m/s2').material,'pmma');
 assert.equal(values('I store coated cotton').material,undefined);
 assert.equal(values('What are the properties of propane?').material,undefined);
});
test('053 ambient temperature and thickness do not absorb specimen outputs or width',()=>{
 assert.equal(values('specimen temperature 600 K; ambient temperature 300 K').temperatureK,300);
 assert.equal(values('flame temperature 1200 K').temperatureK,undefined);
 assert.equal(values('thickness 2 mm and width 30 mm').thicknessMm,2);
});
test('053 explicit unknown removes stale current values without inventing defaults',()=>{
 const r=applyDialogueConditions({question:'oxygen is unknown',conditions:{oxygen:30,pressure:100},conditionBasis:{oxygen:'user_reported'}});
 assert.equal(r.request.conditions.oxygen,null);assert.equal(r.request.conditions.pressure,100);assert.equal(r.request.conditionBasis.oxygen,undefined);
 assert.deepEqual(values('oxygen unknown; pressure 1 bar'),{oxygen:null,pressure:100});
});
test('053 unspecified material uses one source family and diagnostics agree with awarded evidence',()=>{
 const c={experiments:{rows:[row('a','cotton',{oxygen:21}),row('b','paper',{pressure:100})]}};
 const p=parameterSupport(c,'PSI-1',{oxygen:21,pressure:100},fields);
 assert.equal(p.compared,1);assert.equal(p.points,30);assert.equal(p.selectedSourceMaterial,'cotton');
 const d=parameterDiagnostics(c,'PSI-1',{oxygen:21,pressure:100},fields,p);
 assert.equal(d.comparisons.find(c=>c.key==='pressure').status,'unassessed');
});
test('053 reused run names in different original files do not imply a joint experiment',()=>{
 const c={experiments:{rows:[row('r1','cotton',{oxygen:21},'f1'),row('r1','cotton',{pressure:100},'f2')]}};
 const p=parameterSupport(c,'PSI-1',{material:'cotton',oxygen:21,pressure:100},fields);
 assert.equal(p.jointlyTested,false);assert.equal(p.points,60);
});
test('053 absent user and source material cannot create a synthetic shared material family',()=>{
 const c={experiments:{rows:[row('a','',{oxygen:21}),row('b','',{pressure:100})]}};
 const p=parameterSupport(c,'PSI-1',{oxygen:21,pressure:100},fields);
 assert.equal(p.compared,0);assert.equal(p.points,0);assert.equal(p.percent,null);
 assert.ok(parameterDiagnostics(c,'PSI-1',{oxygen:21,pressure:100},fields,p).comparisons.every(x=>x.status==='unassessed'));
});
test('053 headline follows ranking points instead of displaying sparse evidence as a full 100 percent',()=>{
 const html=researchScoreHtml({total:40,maxPoints:100,assessedMaxPoints:55,parameterSupport:{percent:100},coverage:{provided:4,compared:1},unscoredPoints:45});
 assert.ok(html.startsWith('40.0<small>/ 55 assessed points'));
 assert.match(html,/100.0% of supported inputs only/);assert.match(html,/1 \/ 4 inputs supported/);
});
test('053 close measured material sources survive a crowded candidate shortlist',()=>{
 const records=Array.from({length:20},(_,i)=>({id:'PSI-'+(i+1),title:'Material safety',content:{approach:'PMMA temperature flame'}}));
 const c={records,experiments:{rows:records.map((r,i)=>({...row('r'+i,'pmma',{pressure:i===19?100:10}),sourceId:r.id}))}};
 const request={ids:records.map(r=>r.id),question:'Find PMMA flame research',scenario:'Material safety',conditions:{material:'pmma',pressure:100}};
 assert.equal(researchCandidates(c,request)[0],'PSI-20');
});
test('053 numerical budgets exclude blanks and retain material gates and source limitations',()=>{
 const c={records:[{id:'PSI-1'}],experiments:{rows:[row('a','cotton',{pressure:100,oxygen:21})]}};
 const a={assessments:[{sourceId:'PSI-1',rubric:{objective:1,setting:1,material:1,mechanism:1}}]};
 const m=researchRanking(c,{conditions:{material:'cotton',pressure:99,oxygen:null}},a).matches[0];
 assert.equal(m.numericPoints,59.4);assert.equal(m.coverage.provided,1);
 const other=researchRanking(c,{conditions:{material:'cotton/polyester blend',pressure:99}},a).matches[0];
 assert.equal(other.numericPoints,0);assert.equal(other.numericStatus,'unavailable');
});
