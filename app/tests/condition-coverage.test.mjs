import {providerResponse} from './provider-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {researchRanking,RESEARCH_SYSTEM} from '../lib/research.mjs';
import {canonicalMaterial,sourceConditionCoverage,researchContext} from '../lib/research-coverage.mjs';
import {researchCards} from '../public/environment-panel.mjs';
import {PMMA_ROD_SOURCE,pmmaRodReferences} from '../lib/pmma-rod-model.mjs';
import {BASS_REPORT} from '../lib/bass-evidence.mjs';
import {createAnalyzer} from '../lib/gemini.mjs';
import {createApp} from '../server.mjs';
const quote='Source experiments report material combustion under varied gas composition and environmental conditions.';
const evidence=(key,value)=>({[key]:{fileId:'f1',row:2,column:key,value}});
const row=(runId,values)=>({sourceId:'PSI-1',runId,values,evidence:Object.assign({},...Object.entries(values).map(([k,v])=>evidence(k,v))),provenance:{fileId:'f1',row:Number(runId.slice(1))||2,sha256:'a'.repeat(64)}});
const record=id=>({id,title:id,content:{approach:quote},tableReferences:[]});
const corpus={hash:'condition-test',records:[record('PSI-1'),record('PSI-2')],experiments:{rows:[row('r1',{material:'pmma',oxygen:20,pressure:100}),row('r2',{material:'pmma',oxygen:40,pressure:80})],summary:{documentAudit:[]}}};
const assessment=id=>({sourceId:id,reason:'Source-supported comparison.',field:'approach',quote,limitation:'Not an ignition prediction.',rubric:{objective:1,setting:.5,material:1,mechanism:1}});
const analysis={stage:'rank',summary:'Review these sources.',nextStep:'Read the original source.',emergency:false,assessments:[assessment('PSI-1'),assessment('PSI-2')],questions:[],unknowns:[],conditionSuggestions:[]};
const request={mode:'research',ids:['PSI-1','PSI-2'],scenario:'I store PMMA and want ignition research.',question:'Review relevant source experiments.',conditions:{material:'pmma',oxygen:30,pressure:null}};

test('nonidentical oxygen still compares with measured rows and retains the whole study',()=>{
 const m=researchRanking(corpus,request,analysis).matches.find(x=>x.id==='PSI-1');assert.equal(m.numericPoints,45);assert.equal(m.trial.runId,'r2');assert.equal(m.numericStatus,'complete');assert.equal(m.coverage.provided,1);assert.ok(m.coverage.excluded.includes('pressure'));
 const range=m.conditionCoverage.series[0].ranges.find(x=>x.key==='oxygen');assert.equal(range.min,20);assert.equal(range.max,40);assert.equal(range.position,'between_reported_values');assert.equal(m.conditionCoverage.usability.status,'same_material_evidence');
});
test('missing material no longer disables environmental comparison',()=>{const m=researchRanking(corpus,{...request,conditions:{oxygen:30}},analysis).matches.find(x=>x.id==='PSI-1');assert.equal(m.numericPoints,45);assert.equal(m.trial.materialRelation,'not_specified');});
test('different material stays contextual without numerical credit for the requested material',()=>{
 const c={...corpus,experiments:{rows:[row('r1',{material:'pmma',oxygen:30,thicknessMm:2})]}};
 const m=researchRanking(c,{...request,conditions:{material:'fiberglass',oxygen:30,thicknessMm:2}},analysis).matches.find(x=>x.id==='PSI-1');assert.equal(m.numericPoints,0);assert.equal(m.coverage.compared,0);assert.equal(m.trial,null);assert.equal(m.conditionCoverage.usability.status,'other_material_context');
});

test('known exact aliases work without treating fiberglass as SIBAL composite',()=>{
 assert.equal(canonicalMaterial('Polymethyl methacrylate'),'pmma');assert.equal(canonicalMaterial('SIBAL fabric'),'sibal');assert.notEqual(canonicalMaterial('fiberglass'),canonicalMaterial('SIBAL fabric'));
});
test('unavailable source fields are displayed differently from measured zero proximity',()=>{
 const missing=researchRanking(corpus,{...request,conditions:{material:'pmma',temperatureK:300}},analysis).matches[0];assert.equal(missing.numericStatus,'unavailable');assert.equal(missing.numericPoints,0);assert.equal(missing.trial,null);const html=researchCards({matches:[missing]},corpus.records);assert.match(html,/Conditions: not comparable/);assert.doesNotMatch(html,/Conditions: 0\.0 \/ 60/);
 const c={...corpus,experiments:{rows:[row('r1',{material:'pmma',airflow:1})]}};const zero=researchRanking(c,{...request,conditions:{material:'pmma',airflow:0}},analysis).matches.find(x=>x.id==='PSI-1');assert.equal(zero.numericPoints,0);assert.equal(zero.numericStatus,'complete');assert.match(researchCards({matches:[zero]},c.records),/Conditions: 0\.0 \/ 60/);
});
test('all supplied fields keep their budget while missing source measurements remain unassessed',()=>{
 const m=researchRanking(corpus,{...request,conditions:{material:'pmma',oxygen:30,gravityMs2:8,temperatureK:320}},analysis).matches.find(x=>x.id==='PSI-1');assert.equal(m.numericPoints,15);assert.equal(m.numericStatus,'partial');assert.equal(m.unscoredPoints,40);assert.equal(m.trial.contributions.find(x=>x.key==='temperatureK').observed,null);
});
test('parameter-wise support does not rewrite the separate closest source row',()=>{
 const m=researchRanking(corpus,{...request,conditions:{material:'pmma',oxygen:20,pressure:80}},analysis).matches.find(x=>x.id==='PSI-1');assert.equal(m.numericPoints,60);assert.equal(m.trial.numericPoints,54);assert.equal(m.trial.runId,'r1');assert.equal(m.parameterSupport.jointlyTested,false);
});
test('series ranges remain separated by material and never imply joint coverage or extrapolation',()=>{
 const c={...corpus,experiments:{rows:[...corpus.experiments.rows,row('r3',{material:'paper',oxygen:99,pressure:1})]}};
 const range=sourceConditionCoverage(c,'PSI-1',{material:'pmma',oxygen:50});assert.equal(range.series.length,2);assert.equal(range.series[0].material,'pmma');assert.equal(range.series[0].ranges.find(x=>x.key==='oxygen').max,40);assert.equal(range.series[0].ranges.find(x=>x.key==='oxygen').position,'above_reported_span');assert.match(range.limitation,/not a jointly tested region/);assert.equal(range.usability.status,'same_material_evidence');
});
test('no-normalized-row source stays available as literature rather than zero-similarity exclusion',()=>{
 const m=researchRanking(corpus,request,analysis).matches.find(x=>x.id==='PSI-2');assert.equal(m.numericStatus,'unavailable');assert.equal(m.conditionCoverage.usability.status,'literature_review');assert.match(researchCards({matches:[m]},corpus.records),/does not mean the report has no useful findings or graphs/);
});
test('reviewed graphs need the verified exact document and stay available outside a sampled point',()=>{
 const c={records:[record('PSI-25')],experiments:{rows:[],summary:{documentAudit:[{...BASS_REPORT,status:'verified'}]}}};let coverage=sourceConditionCoverage(c,'PSI-25',{material:'pmma',oxygen:60});assert.equal(coverage.figures.length,3);assert.equal(coverage.usability.status,'same_material_evidence');assert.equal(coverage.figures[2].model,null);assert.match(coverage.figures[2].fidelity,/No numerical coordinates/);
 c.experiments.summary.documentAudit[0].sha256='changed';assert.equal(sourceConditionCoverage(c,'PSI-25').figures.length,0);
});
test('source physics retains material properties and applicability without assigning them to paper',()=>{
 const c={records:[record('PSI-25')],experiments:{rows:[],summary:{documentAudit:[{...PMMA_ROD_SOURCE,status:'verified'}]}}};
 const p=sourceConditionCoverage(c,'PSI-25',{material:'paper',temperatureK:323.15}).physics;assert.equal(p.status,'different_material_model');assert.equal(p.models[0].applicability.applicable,false);assert.equal(p.models[0].comparison,undefined);assert.equal(p.models[1].evaluation.status,'unavailable');assert.equal(p.models[1].properties.conductivityWcmK,2.09e-3);assert.match(p.models[1].mechanism,/cannot be transferred to paper/);assert.equal(p.tolerance.excludesSource,false);
});
test('different flow and geometry can match a source physical feature within its stated scope',()=>{
 const source={id:PMMA_ROD_SOURCE.fileId,name:'source.pdf',sha256:PMMA_ROD_SOURCE.sha256};const c={records:[record('PSI-25')],experiments:{rows:[],physicalRows:pmmaRodReferences(source),summary:{documentAudit:[{...PMMA_ROD_SOURCE,status:'verified'}]}}};
 const conditions={material:'pmma',materialVariant:'cast-pmma',specimenKind:'rod',tipShape:'hemispherical',flowDirection:'concurrent',gravityRegime:'microgravity',gravityMs2:0,rodDiameterMm:6.36,airflow:2.36*6.36/30};
 const a=sourceConditionCoverage(c,'PSI-25',conditions).physics.models[0];const b=sourceConditionCoverage(c,'PSI-25',{...conditions,rodDiameterMm:12.72/1.01,airflow:conditions.airflow*2/1.01}).physics.models[0];
 assert.equal(a.applicability.applicable,true);assert.equal(b.applicability.applicable,true);assert.ok(Math.abs(a.comparison.closeness-100)<1e-10);assert.ok(Math.abs(b.comparison.closeness-100)<1e-10);assert.match(b.comparison.meaning,/Forced-stretch closeness only/);
});
test('5 to 50 Celsius is not an invented tolerance threshold or automatic source exclusion',()=>{
 const c={...corpus,experiments:{rows:[row('r1',{material:'paper',temperatureK:278.15})]}};const r={...request,conditions:{material:'paper',temperatureK:323.15}};const m=researchRanking(c,r,analysis).matches.find(x=>x.id==='PSI-1');assert.equal(m.conditionCoverage.usability.status,'same_material_evidence');assert.equal(m.conditionCoverage.physics.tolerance.excludesSource,false);assert.equal(m.conditionCoverage.physics.tolerance.status,'not_established');assert.notEqual(m.numericPoints,60*.99);assert.match(RESEARCH_SYSTEM,/Never exclude a potentially useful material study solely/);
});
test('coverage and physics evidence reach the real research analyzer without provider tools',async()=>{
 let sent,calls=0;const analyzer=createAnalyzer({corpus,key:'TEST_ONLY',fetchImpl:async(u,o)=>{calls++;sent=JSON.parse(o.body);const data=JSON.parse(sent.input[0].content[0].text),ev=data.evidence.find(x=>x.sourceId==='PSI-1'&&x.field==='fileText');assert.ok(ev);return Response.json({...providerResponse({...analysis,assessments:[{...assessment('PSI-1'),evidenceId:ev.id}]})});}});
 const result=await analyzer.analyze(request);assert.equal(calls,1);assert.equal(result.analysis.assessments[0].field,'fileText');assert.match(result.analysis.assessments[0].quote,/sourceRowCount/);assert.equal(sent.tools,undefined);assert.match(sent.instructions,/Tolerance is outcome-specific/);
});
test('HTTP research ranks partially comparable sources and retains sources with only literary evidence',async()=>{
 const analyzer=createAnalyzer({corpus,key:'TEST_ONLY',fetchImpl:async()=>Response.json({...providerResponse(analysis)})});const app=createApp({corpus,analyzer,sessionToken:'test'});await new Promise(r=>app.listen(0,'127.0.0.1',r));
 try{const res=await fetch('http://127.0.0.1:'+app.address().port+'/api/research',{method:'POST',headers:{'Content-Type':'application/json','X-Flame-Session':'test'},body:JSON.stringify(request)});assert.equal(res.status,200);const data=await res.json();assert.equal(data.ranking.matches.length,2);assert.equal(data.ranking.matches.find(x=>x.id==='PSI-1').numericPoints,45);assert.equal(data.ranking.matches.find(x=>x.id==='PSI-2').numericStatus,'unavailable');}finally{await new Promise(r=>app.close(r));}
});
test('coverage rendering escapes labels and preserves report/data navigation',()=>{
 const c={...corpus,experiments:{rows:[row('r1',{material:'<script>alert(1)</script>',oxygen:30})]}};const html=researchCards(researchRanking(c,request,analysis),c.records);assert.ok(!html.includes('<script>'));assert.match(html,/&lt;script&gt;/);assert.match(html,/View source series \/ graphs/);assert.match(html,/data-open="PSI-1"/);
});
