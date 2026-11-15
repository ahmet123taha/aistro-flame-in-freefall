import test from 'node:test';
import assert from 'node:assert/strict';
import {SIBAL_SOURCE,SIBAL_TABLE,sibalReportRows} from '../lib/sibal-evidence.mjs';
import {compareExperiment,matchExperiments,validateWeights} from '../lib/numeric-matching.mjs';
import {validateRequest} from '../lib/corpus.mjs';
import {renderNumericCard,renderNumericDetails} from '../public/numeric-card.mjs';
const file={id:SIBAL_SOURCE.fileId,sha256:SIBAL_SOURCE.sha256,name:'BASS-II report.pdf'};
const rows=sibalReportRows(file),row=id=>rows.find(r=>r.runId===id);
const conditions={material:'sibal',fabricConstruction:'sibal-75-25',specimenKind:'sheet',widthMm:22,oxygen:16.4,airflow:10};
test('Table7.1 has 27 BASS-II and4 BASS distinct source entries, not fabricated steady stages',()=>{
 assert.equal(rows.length,31);assert.equal(new Set(rows.map(r=>r.runId)).size,31);
 assert.equal(rows.filter(r=>r.observations.series==='BASS-II').length,27);
 assert.equal(rows.filter(r=>r.values.airflow!==undefined).length,14);
 assert.equal(rows.filter(r=>r.observations.outcome==='quenching').length,6);
 assert.equal(rows.filter(r=>r.observations.outcome==='blowoff').length,1);
 assert.equal(rows.filter(r=>r.observations.outcome==='no_blowoff').length,2);
 assert.equal(rows.filter(r=>r.observations.outcome==='no_ignition').length,6);
 assert.deepEqual(sibalReportRows({...file,sha256:'bad'}),[]);
 for(const r of rows){assert.equal(r.provenance.page,104);assert.equal(r.flowDirection,'concurrent');assert.equal(r.values.gravityMs2,undefined);assert.equal(r.values.temperatureK,undefined);}
});
test('Footnote-b oxygen is retained as an observation but excluded from matching',()=>{
 for(const id of ['GMT45-T1','GMT45-T2']){
  const r=row(id);assert.equal(r.observations.reportedOxygen,18.5);assert.equal(r.observations.oxygenQuality,'flagged_inaccurate');assert.equal(r.values.oxygen,undefined);
  const match=compareExperiment(r,{...conditions,oxygen:18.5},validateWeights({oxygen:100}));assert.equal(match.similarity,null);assert.equal(match.comparableWeight,0);
 }
});
test('Units and original construction dimensions are traceable; reused material does not inherit them',()=>{
 const r=row('GMT190-T19');assert.equal(r.values.widthMm,12);assert.equal(r.values.thicknessMm,.32);assert.equal(r.values.arealDensityMgCm2,18.2);assert.equal(r.values.exposedLengthMm,100);assert.equal(r.values.pressure,101.325);assert.equal(r.evidence.thicknessMm.approximate,true);assert.equal(r.evidence.pressure.page,102);
 const reused=rows.filter(r=>r.specimenHistory==='reused');assert.equal(reused.length,8);
 for(const r of reused)for(const key of ['thicknessMm','arealDensityMgCm2','exposedLengthMm'])assert.equal(r.values[key],undefined);
 assert.equal(row('GMT216-T28a').specimenHistory,'reused');assert.equal(row('GMT190-T19').specimenHistory,'not_reported');
});
test('Changed flow endpoints are never averaged, and blank comments do not assert nonflammability',()=>{
 assert.deepEqual(row('GMT190-T21').observations.flowEndpoints,[11,47]);assert.equal(row('GMT190-T21').values.airflow,undefined);
 assert.equal(row('GMT190-T21').observations.outcome,'blowoff');assert.equal(row('GMT178-T17').observations.outcome,'no_blowoff');
 assert.equal(row('GMT100-T5').observations.outcome,'not_reported');assert.equal(row('GMT96-T8').observations.outcome,'not_reported');
 assert.match(row('GMT175-T9').observations.limitations.join(' '),/does not exclude brief flashes/);
});
test('SIBAL composition and known history are identity gates, not tunable weighted credit',()=>{
 const w=validateWeights({oxygen:100}),r=row('GMT175-T9');
 assert.equal(compareExperiment(r,conditions,w).similarity,100);
 assert.equal(compareExperiment(r,{...conditions,fabricConstruction:''},w).similarity,null);
 assert.equal(compareExperiment(r,{...conditions,fabricConstruction:'other'},w).similarity,null);
 assert.equal(compareExperiment(r,{...conditions,specimenHistory:'fresh'},w).similarity,null);
 const reuse=row('GMT216-T28a');assert.equal(compareExperiment(reuse,{...conditions,oxygen:20.7},w).similarity,null);
 assert.equal(compareExperiment(reuse,{...conditions,oxygen:20.7,specimenHistory:'reused'},w).similarity,100);
});
test('Alternative runs retain contrasting outcomes, separate source values and explicit result limits',()=>{
 const corpus={hash:'h',experiments:{rows}},request={ids:['PSI-25'],conditions,weights:{widthMm:100}};
 const m=matchExperiments(corpus,request).matches[0];assert.equal(m.candidateCount,31);assert.equal(m.relatedExperiments.length,30);
 const candidates=[m.experiment,...m.relatedExperiments];assert.ok(candidates.some(r=>r.observations.outcome==='blowoff'));assert.ok(candidates.some(r=>r.observations.outcome==='no_ignition'));
 assert.equal(matchExperiments(corpus,{...request,conditions:{...conditions,material:'cotton'}}).matches.length,0);
 assert.equal(matchExperiments(corpus,{...request,conditions:{...conditions,fabricConstruction:'other'}}).matches.length,0);
 const many={hash:'h',experiments:{rows:Array.from({length:60},(_,i)=>({...rows[8],runId:'r'+i}))}};
 const capped=matchExperiments(many,request).matches[0];assert.equal(capped.candidateCount,60);assert.equal(capped.relatedExperiments.length,50);assert.equal(capped.omittedCandidateCount,9);
});
test('New inputs validate units and reject zero dimensions, invalid enums and numeric strings',()=>{
 const q={ids:['PSI-25'],question:'x',conditions:{gravity:'other',...conditions,arealDensityMgCm2:18.2,exposedLengthMm:100}};
 const c=validateRequest(q,['PSI-25']).conditions;assert.equal(c.arealDensityMgCm2,18.2);assert.equal(c.fabricConstruction,'sibal-75-25');
 for(const patch of [{arealDensityMgCm2:0},{exposedLengthMm:-1},{exposedLengthMm:'100'},{specimenHistory:'fresh-ish'},{fabricConstruction:'cotton'}])assert.throws(()=>validateRequest({...q,conditions:{...q.conditions,...patch}},['PSI-25']));
});
test('Source result UI exposes caveats, alternative trials and source page without risk claims',()=>{
 const m=matchExperiments({hash:'h',experiments:{rows}},{ids:['PSI-25'],conditions,weights:{widthMm:100}}).matches[0];
 const html=renderNumericCard({id:'PSI-25',name:'BASS-II',match:m});
 assert.match(html,/Other trials in this study · 30/);assert.match(html,/GMT190-T21/);assert.match(html,/PDF page 104/);assert.match(html,/questionable; not scored/);assert.match(html,/average velocity/);assert.match(html,/do not establish nonflammability/);
 assert.match(renderNumericDetails({experiment:compareExperiment(row('GMT216-T28a'),conditions,validateWeights({oxygen:100}))}),/reuse status/);
 assert.ok(SIBAL_TABLE.every(r=>html.includes(r[0])));
});
