import test from 'node:test';
import assert from 'node:assert/strict';
import {parameterSupport} from '../lib/parameter-support.mjs';
import {STUDY_EVIDENCE_SOURCES,reviewedStudyEvidence} from '../lib/study-evidence.mjs';
import {researchCandidates} from '../lib/research-candidates.mjs';
import {researchContext} from '../lib/research-coverage.mjs';
import {researchRanking} from '../lib/research.mjs';
import {researchCards} from '../public/environment-panel.mjs';
const fields=['gravityMs2','temperatureK','oxygen','pressure','airflow','thicknessMm'];
const point=(id,values)=>({sourceId:'PSI-1',runId:id,values,evidence:{},provenance:{fileId:'f1',row:id,sha256:'a'.repeat(64)}});
const study=(material,parameters)=>({sourceId:'PSI-1',material,parameters,scope:'marginal_study_summary',text:'Source-defined material/condition series.',provenance:{fileId:'f2',row:2,sha256:'b'.repeat(64)}});
const corpus=(rows=[],studyEvidence=[])=>({records:[{id:'PSI-1',title:'Source',content:{approach:'Documented source material and environmental conditions.'}}],experiments:{rows,studyEvidence}});
const loaded=reviewedStudyEvidence(STUDY_EVIDENCE_SOURCES.map(s=>({id:s.fileId,sha256:s.sha256})));

test('same-material evidence wins over a perfect different-material environment',()=>{
 const c=corpus([point('paper',{material:'paper',pressure:100}),point('pmma',{material:'pmma',pressure:99})]);const p=parameterSupport(c,'PSI-1',{material:'pmma',pressure:100},fields);
 assert.equal(p.percent,99);assert.equal(p.contributions[0].runId,'pmma');
 assert.equal(parameterSupport(c,'PSI-1',{material:'fiberglass',pressure:100},fields).percent,null);
});
test('different source fragments retain distinct provenance and never create a joint run',()=>{
 const rows=[point('a',{material:'pmma',oxygen:21}),point('b',{material:'pmma',pressure:100})];const c=corpus(rows);const p=parameterSupport(c,'PSI-1',{material:'pmma',oxygen:21,pressure:100},fields);
 assert.equal(p.percent,100);assert.equal(p.jointlyTested,false);assert.deepEqual(p.contributions.map(x=>x.runId),['a','b']);assert.equal(rows[0].values.pressure,undefined);assert.equal(rows[1].values.oxygen,undefined);
});
test('span support is explicitly marginal rather than an interpolated outcome',()=>{
 const c=corpus([],[study('pmma',{airflow:{kind:'range',min:1,max:5,unit:'cm/s'}})]);const p=parameterSupport(c,'PSI-1',{material:'pmma',airflow:3},fields);
 assert.equal(p.percent,100);assert.equal(p.jointlyTested,false);assert.equal(p.contributions[0].withinSpan,true);assert.equal(p.contributions[0].kind,'reported_marginal_span');assert.equal(p.contributions[0].observed,null);
 assert.ok(Math.abs(parameterSupport(c,'PSI-1',{material:'pmma',airflow:5.1},fields).percent-100*5/5.1)<1e-10);
});
test('discrete tested settings do not become a continuous measured interval',()=>{
 const c=corpus([],[study('pmma',{oxygen:{kind:'set',values:[20,40],unit:'% vol'}})]);const p=parameterSupport(c,'PSI-1',{material:'pmma',oxygen:30},fields);
 assert.equal(p.percent,75);assert.notEqual(p.percent,100);assert.equal(p.contributions[0].observed,40);
});
test('blank inputs stay excluded and missing source values are never numeric zeros',()=>{
 const c=corpus([point('a',{material:'pmma',oxygen:21,airflow:0})]);const p=parameterSupport(c,'PSI-1',{material:'pmma',oxygen:21,pressure:100,temperatureK:null},fields);
 assert.equal(p.provided,2);assert.equal(p.compared,1);assert.equal(p.points,30);assert.equal(p.percent,100);assert.equal(p.contributions[1].score,null);
 assert.equal(parameterSupport(c,'PSI-1',{material:'pmma',airflow:0},fields).percent,100);
 assert.equal(parameterSupport(c,'PSI-1',{material:'pmma',airflow:1},fields).percent,0);
});
test('all new source derivatives require the exact original file hash',()=>{
 assert.equal(new Set(loaded.map(f=>f.sourceId)).size,10);assert.equal(reviewedStudyEvidence([]).length,0);
 const invalid=reviewedStudyEvidence(STUDY_EVIDENCE_SOURCES.map(s=>({id:s.fileId,sha256:s.fileId==='f36766'?'0'.repeat(64):s.sha256})));assert.equal(invalid.some(e=>e.sourceId==='PSI-68'),false);
});
test('FLEX-2 explicitly labelled mole-fraction, atm and Celsius columns convert correctly',()=>{
 const f=loaded.find(f=>f.sourceId==='PSI-68'&&f.material==='iso-octane');assert.equal(f.parameters.temperatureK.values[0],298.15);assert.equal(f.parameters.oxygen.values[1],21);assert.equal(f.parameters.pressure.values[1],101.325);
 const p=parameterSupport(corpus([],loaded),'PSI-68',{material:'iso-octane',temperatureK:323.15,oxygen:21.21,pressure:102.33825,airflow:1.01},fields);assert.ok(p.percent>97&&p.percent<99);assert.equal(p.compared,4);assert.equal(p.jointlyTested,false);
});
test('invalid 3400-percent oxygen and burner fuel/controller capacity stay out of ambient scoring',()=>{
 const bre=loaded.filter(f=>f.sourceId==='PSI-20');assert.ok(bre.every(f=>f.parameters.oxygen.values.every(v=>v<=100)));
 for(const id of ['PSI-21','PSI-22','PSI-106','PSI-142'])assert.ok(loaded.filter(f=>f.sourceId===id).every(f=>Object.keys(f.parameters).length===0));
});
test('model and error-bar plot columns are not counted as extra experiments or inputs',()=>{
 const entries=loaded.filter(f=>f.sourceId==='PSI-117');assert.ok(entries.length>0);for(const e of entries){assert.deepEqual(Object.keys(e.parameters),['pressure']);assert.match(e.parameters.pressure.column,/experimental block/);assert.match(e.text,/Extinction diameter is an output/);}
});
test('mixtures, isomers, composites and chemical families are not silently interchanged',()=>{
 const c=corpus([],[study('iso-octane',{pressure:{kind:'set',values:[100]}}),study('sibal',{oxygen:{kind:'set',values:[21]}})]);
 assert.equal(parameterSupport(c,'PSI-1',{material:'n-octane',pressure:100},fields).percent,null);assert.equal(parameterSupport(c,'PSI-1',{material:'fiberglass',oxygen:21},fields).percent,null);
});
test('material-aware candidate selection protects source evidence from generic keyword competition',()=>{
 const c=corpus([point('a',{material:'pmma',pressure:100})]);c.records.push(...Array.from({length:20},(_,i)=>({id:'PSI-'+(i+2),title:'Generic oxygen temperature gravity flame',content:{approach:'Environment temperature gravity oxygen flame spread'}})));
 const ids=c.records.map(r=>r.id),selected=researchCandidates(c,{ids,conditions:{material:'pmma'},question:'temperature oxygen gravity flame',scenario:'Investigate my material.'});assert.equal(selected.length,12);assert.equal(selected[0],'PSI-1');
 assert.equal(researchCandidates(c,{ids,conditions:{material:'unindexed-material'},question:'test'}).length,21);
});
test('local file excerpts survive coverage augmentation and material-only source fragments remain available',()=>{
 const c=corpus([],loaded);c.records=[{id:'PSI-142',content:{fileText:'EXACT VERIFIED LOCAL EXCERPT',approach:'Cool-flame research.'}}];
 const out=researchContext(c,{ids:['PSI-142'],conditions:{material:'n-tetradecane'}});assert.match(out.records[0].content.fileText,/EXACT VERIFIED LOCAL EXCERPT/);assert.match(out.records[0].content.fileText,/Yf/);assert.match(out.records[0].content.fileText,/f11568/);
});
test('rendered proximity exposes coverage, source fragments and the absence of a joint experiment',()=>{
 const c=corpus([point('a',{material:'pmma',oxygen:21}),point('b',{material:'pmma',pressure:100})]);const analysis={assessments:[{sourceId:'PSI-1',rubric:{objective:1,setting:1,material:1,mechanism:1},reason:'Source relevance.',limitation:'No burn equivalence.',quote:'Exact source text.'}]};const result=researchRanking(c,{conditions:{material:'pmma',oxygen:21,pressure:100}},analysis),html=researchCards(result,c.records);
 assert.match(html,/100.0%/);assert.match(html,/Parameter proximity/);assert.match(html,/2 \/ 2 inputs supported/);assert.match(html,/No combined experiment or burning outcome was created/);assert.match(html,/Nearest individual run/);
});
test('large gravity shifts do not get a fabricated high parameter percentage',()=>{
 const c=corpus([point('a',{material:'paper',gravityMs2:.2*9.80665})]);const p=parameterSupport(c,'PSI-1',{material:'paper',gravityMs2:1.6*9.80665},fields);assert.ok(Math.abs(p.percent-12.5)<1e-10);assert.equal(p.compared,1);
});
