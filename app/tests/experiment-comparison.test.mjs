import test from 'node:test';
import assert from 'node:assert/strict';
import {experimentKey,comparisonCandidates,toggleExperiment,createComparisonSnapshot,describeOutcome,comparisonWarnings,renderExperimentComparison} from '../public/experiment-comparison.mjs';
import {BASS_REPORT,bassReportRows} from '../lib/bass-evidence.mjs';
import {sibalReportRows} from '../lib/sibal-evidence.mjs';
import {nomexReportRows} from '../lib/nomex-evidence.mjs';
import {matchExperiments} from '../lib/numeric-matching.mjs';
const file={id:BASS_REPORT.fileId,sha256:BASS_REPORT.sha256,name:'BASS report.pdf'};
const sibal=sibalReportRows(file),nomex=nomexReportRows(file),pmma=bassReportRows(file);
const request={ids:['PSI-25'],conditions:{material:'sibal',specimenKind:'sheet',fabricConstruction:'sibal-75-25',oxygen:17.4},weights:{oxygen:100}};
const response=matchExperiments({hash:'dataset-test',experiments:{rows:sibal}},request);
const choices=comparisonCandidates(response),pick=id=>[...choices].find(([,r])=>r.runId===id)[0];
const snapshot=()=>createComparisonSnapshot({keys:[pick('GMT175-T18'),pick('GMT175-T9')],response,request,createdAt:'2026-11-14T00:00:00Z'});
test('Same investigation permits different physical runs, independent of source-level checkbox',()=>{
 const s=snapshot();assert.equal(s.rows.length,2);assert.equal(new Set(s.rows.map(r=>r.sourceId)).size,1);assert.notEqual(s.rows[0].runId,s.rows[1].runId);
 assert.equal(describeOutcome(s.rows[0]).kind,'quenching');assert.equal(describeOutcome(s.rows[1]).kind,'no_ignition');
});
test('Verified physical-trial links deduplicate while unresolved same names from different documents remain distinct',()=>{
 const a={...nomex[0],physicalTrialKey:'one'},b={...a,provenance:{...a.provenance,fileId:'other'}};
 assert.equal(experimentKey(a),experimentKey(b));
 const x={...a,physicalTrialKey:null},y={...b,physicalTrialKey:null};assert.notEqual(experimentKey(x),experimentKey(y));
 assert.equal(comparisonCandidates({matches:[{experiment:a,relatedExperiments:[b]}]}).size,1);
});
test('Selection toggles, rejects stale keys and caps a table at six real rows',()=>{
 let selected=[];for(const key of [...choices.keys()].slice(0,6))selected=toggleExperiment(selected,key,response);
 assert.equal(selected.length,6);assert.throws(()=>toggleExperiment(selected,[...choices.keys()][6],response));
 assert.equal(toggleExperiment(selected,selected[0],response).length,5);assert.throws(()=>toggleExperiment([],'invented',response));
 assert.throws(()=>createComparisonSnapshot({keys:[selected[0],selected[0]],response,request}));
});
test('Snapshot owns a deep copy of inputs, weights, outcomes and provenance; later editing cannot rewrite it',()=>{
 const copy=JSON.parse(JSON.stringify(response)),q=JSON.parse(JSON.stringify(request));
 const s=createComparisonSnapshot({keys:[pick('GMT175-T18'),pick('GMT175-T9')],response:copy,request:q});
 q.conditions.oxygen=99;q.weights.oxygen=1;copy.matches[0].experiment.observations.label='changed';
 assert.equal(s.request.conditions.oxygen,17.4);assert.equal(s.request.weights.oxygen,100);assert.notEqual(s.rows[0].observations.label,'changed');
 assert.equal(s.datasetHash,'dataset-test');assert.equal(s.rows[0].provenance.sha256,BASS_REPORT.sha256);
});
test('Nomex no-sustained-flame preserves brief ignition and is never called nonflammable',()=>{
 for(const r of nomex)assert.equal(describeOutcome(r).kind,'no_sustained_flame');
 assert.match(describeOutcome(nomex[0]).detail,/present/);assert.match(describeOutcome(nomex[2]).detail,/present/);assert.match(describeOutcome(nomex[1]).detail,/not separately specified/);
});
test('SIBAL no-blowoff, quenching, blowoff, unknown and reused ignition are distinct observations',()=>{
 const kinds=new Set(sibal.map(r=>describeOutcome(r).kind));
 for(const k of ['no_blowoff','quenching','blowoff','not_reported','ignited','one_sided','no_ignition'])assert.ok(kinds.has(k));
 assert.match(describeOutcome(sibal.find(r=>r.observations.outcome==='no_blowoff')).detail,/not a blowoff-boundary measurement/);
 assert.equal(describeOutcome({...sibal[0],observations:undefined}).kind,'unknown');
});
test('Measured PMMA stages do not collapse to a mean, and untracked rates do not turn into zero',()=>{
 const m2=pmma.find(r=>r.runId==='M2'),m6=pmma.find(r=>r.runId==='M6');
 assert.equal(describeOutcome(m2).kind,'measured_spread');assert.equal(describeOutcome(m6).kind,'untracked_spread');
 const h=renderExperimentComparison({rows:[m2,m6],warnings:[],request:{},createdAt:'test'});
 assert.match(h,/20 cm\/s → 0\.052 mm\/s/);assert.match(h,/15 cm\/s → 0\.033 mm\/s/);assert.match(h,/10 cm\/s → Unknown mm\/s/);assert.ok(!h.includes('17,5 cm/s'));
});
test('Differences in material, specimen, flow direction, reuse and oxygen semantics remain explicit',()=>{
 const w=comparisonWarnings([nomex[0],sibal.find(r=>r.specimenHistory==='reused'),pmma[1],{...pmma[0],specimenKind:'rod'}]).join(' ');
 for(const term of ["Different materials","Specimen types differ","Flow/flame directions differ","Specimens are reused","different timing/measurement","probability"])assert.ok(w.includes(term),term);
});
test('Rendered comparison keeps source hash/page, nominal scores, unknowns and frozen-snapshot notice',()=>{
 const h=renderExperimentComparison(snapshot());assert.match(h,/does not update when inputs change later/);assert.match(h,/PDF 104/);assert.match(h,/7.1/);assert.match(h,new RegExp(BASS_REPORT.sha256));assert.match(h,/Oxygen/);assert.match(h,/Quenching as flow decreases/);assert.match(h,/no ignition/);assert.match(h,/Input error interval/);
});
test('Source names and comments are escaped and never become markup or executable buttons',()=>{
 const s=snapshot();s.rows[0].researchName='<script>evil()</script>';s.rows[0].observations.sourceComment='<img src=x onerror=evil()>';s.rows[0].provenance.name='" onclick="evil()';
 const h=renderExperimentComparison(s);assert.ok(!h.includes('<script>'));assert.ok(!h.includes('<img'));assert.match(h,/&lt;script&gt;/);assert.match(h,/&quot; onclick=&quot;/);
});
