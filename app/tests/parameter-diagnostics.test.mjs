import test from 'node:test';
import assert from 'node:assert/strict';
import {parameterSupport} from '../lib/parameter-support.mjs';
import {parameterDiagnostics} from '../lib/parameter-diagnostics.mjs';
import {renderParameterComparison} from '../public/parameter-comparison.mjs';
import {localDiscovery} from '../lib/local-discovery.mjs';
const fields=['gravityMs2','temperatureK','oxygen','pressure','airflow','thicknessMm'];
const row=(values,other={})=>({sourceId:'PSI-1',runId:'trial-1',values,evidence:{pressure:{cell:'AB4',unit:'kPa'}},provenance:{fileId:'f1',row:4,sha256:'a'.repeat(64)},...other});
const corpus=rows=>({hash:'TEST',records:[{id:'PSI-1',title:'TEST'}],experiments:{rows,studyEvidence:[]}});
const diagnose=(c,q)=>parameterDiagnostics(c,'PSI-1',q,fields,parameterSupport(c,'PSI-1',q,fields));
test('comparable input shows the exact scoring reference, delta, points and source location',()=>{
 const c=corpus([row({material:'pmma',pressure:100})]),d=diagnose(c,{material:'pmma',pressure:101});
 assert.equal(d.compared,1);assert.equal(d.comparisons[0].usedReference.value,100);assert.equal(d.comparisons[0].usedReference.absoluteDifference,1);assert.equal(d.comparisons[0].usedReference.provenance.fileId,'f1');assert.equal(d.comparisons[0].usedReference.evidence.cell,'AB4');assert.ok(d.comparisons[0].awardedPoints>59);
});
test('other-material nearest values are visible as context and never earn points or a percent',()=>{
 const c=corpus([row({material:'sibal',oxygen:21})]),d=diagnose(c,{material:'cotton',oxygen:30}),x=d.comparisons[0];
 assert.equal(x.reasonCode,'material_not_matched');assert.equal(x.usedReference,null);assert.equal(x.contextOnlyReference.value,21);assert.equal(x.contextOnlyReference.material,'sibal');assert.equal(x.contextOnlyReference.arithmeticProximity,null);assert.equal(x.awardedPoints,0);assert.equal(d.unassessedPoints,60);
});
test('unresolved oxygen and instrument settings stay raw, not nearest physical measurements',()=>{
 const c=corpus([row({material:'sibal',pressure:100},{unscoredSourceValues:{oxygen:{raw:'0.221',heading:'O2 % by volume',cell:'AA4'}},instrumentReadings:{airDisplay:'10, 5'}})]),d=diagnose(c,{material:'cotton',oxygen:30,airflow:15});
 assert.equal(d.comparisons[0].reasonCode,'source_unit_unresolved');assert.equal(d.comparisons[0].rawExamples[0].raw,'0.221');assert.equal(d.comparisons[0].usedReference,null);assert.equal(d.comparisons[1].reasonCode,'instrument_setting_not_velocity');assert.equal(d.comparisons[1].rawExamples[0].raw,'10, 5');
});
test('missing gravity/ambient temperature and blank-but-indexed pressure are explained separately',()=>{
 const c=corpus([row({material:'sibal',pressure:100})]),d=diagnose(c,{material:'cotton',gravityMs2:1.96133,temperatureK:300,pressure:null});
 assert.equal(d.comparisons[0].reasonCode,'numeric_gravity_not_indexed');assert.equal(d.comparisons[1].reasonCode,'ambient_temperature_not_indexed');assert.ok(d.blankInputs.includes('pressure'));assert.equal(d.unusedSourceParameters[0].key,'pressure');assert.equal(d.unusedSourceParameters[0].min,100);
 const html=renderParameterComparison(d);assert.match(html,/This is not 0% similarity/);assert.match(html,/1\.96133/);assert.match(html,/0\.2 g/);assert.match(html,/Not entered, so excluded: Pressure/);
});
test('a marginal span remains a span; the nearest discrete point is shown separately',()=>{
 const c=corpus([row({material:'pmma',airflow:1})]);c.experiments.studyEvidence=[{sourceId:'PSI-1',material:'pmma',scope:'marginal_study_summary',parameters:{airflow:{kind:'range',min:1,max:5}},provenance:{fileId:'f2',sha256:'b'.repeat(64)}}];
 const d=diagnose(c,{material:'pmma',airflow:3}),x=d.comparisons[0];assert.deepEqual(x.usedReference.range,[1,5]);assert.equal(x.usedReference.value,null);assert.equal(x.nearestReportedReference.value,1);assert.equal(x.usedReference.absoluteDifference,null);assert.equal(x.awardedPoints,60);assert.match(renderParameterComparison(d),/Nearest reported point/);
});
test('a real zero proximity remains a comparison, while absent inputs are excluded',()=>{
 const d=diagnose(corpus([row({material:'pmma',airflow:5})]),{material:'pmma',airflow:0});assert.equal(d.compared,1);assert.equal(d.comparisons[0].usedReference.arithmeticProximity,0);assert.equal(d.comparisons[0].status,'compared');assert.equal(d.unassessedPoints,0);
 assert.equal(diagnose(corpus([]),{}).provided,0);
});
test('invalid negative values and reversed spans cannot appear as comparable references',()=>{
 const c=corpus([row({material:'pmma',oxygen:-1})]);c.experiments.studyEvidence=[{sourceId:'PSI-1',material:'pmma',parameters:{oxygen:{kind:'range',min:40,max:20}},provenance:{fileId:'f2'}}];
 const d=diagnose(c,{material:'pmma',oxygen:30});assert.equal(d.compared,0);assert.equal(d.comparisons[0].usedReference,null);
});
test('local provider-unavailable recovery has the same diagnostics with no AI score',()=>{
 const c=corpus([row({material:'pmma',pressure:100})]),r=localDiscovery(c,{ids:['PSI-1'],flow:{canRank:true},conditions:{material:'pmma',pressure:101}});
 assert.equal(r.matches[0].scenarioPoints,null);assert.equal(r.matches[0].parameterDiagnostics.comparisons[0].usedReference.value,100);
});
test('unspecified material is disclosed rather than described as a verified family match',()=>{
 const d=diagnose(corpus([row({material:'pmma',pressure:100})]),{pressure:101});assert.equal(d.comparisons[0].status,'compared');assert.equal(d.comparisons[0].reasonCode,'material_not_supplied');assert.equal(d.inputMaterial,null);
});
test('diagnostic text and raw source entries cannot inject HTML',()=>{
 const c=corpus([row({material:'sibal'},{unscoredSourceValues:{oxygen:{raw:'<script>bad</script>',heading:'unknown'}}})]),d=diagnose(c,{material:'<img src=x onerror=bad>',oxygen:30}),html=renderParameterComparison(d);
 assert.doesNotMatch(html,/<script>|<img src=/);assert.match(html,/&lt;script&gt;/);assert.match(html,/&lt;img/);
});
