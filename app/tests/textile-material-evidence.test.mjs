import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalMaterial} from '../lib/material-identity.mjs';
import {sourceMaterialReview} from '../lib/material-evidence-review.mjs';
import {psi26ReportRows,psi26ReportFragments,PSI26_REPORT_SOURCES} from '../lib/psi26-report-evidence.mjs';
import {parameterSupport} from '../lib/parameter-support.mjs';
import {parameterDiagnostics} from '../lib/parameter-diagnostics.mjs';
import {researchContext,CONDITION_FIELDS} from '../lib/research-coverage.mjs';
import {materialApplicability} from '../lib/material-applicability.mjs';
import {queryTokens} from '../lib/source-content-terms.mjs';
import {retrieve,makeChunks,sha} from '../lib/source-content-index.mjs';
import {localDiscovery} from '../lib/local-discovery.mjs';
import {researchCandidates} from '../lib/research-candidates.mjs';
const verified=PSI26_REPORT_SOURCES.map(s=>({id:s.fileId,sha256:s.sha256,name:'Hash-pinned original'}));
const corpus={records:[{id:'PSI-26',content:{}}],experiments:{rows:psi26ReportRows(verified),studyEvidence:psi26ReportFragments(verified)}};
const diagnose=conditions=>parameterDiagnostics(corpus,'PSI-26',conditions,CONDITION_FIELDS,parameterSupport(corpus,'PSI-26',conditions,CONDITION_FIELDS));

test('explicit textile name aliases work while mixed and unspecified fabrics retain their identity',()=>{
 for(const raw of ['Cotton fabric','cotton cloth','pamuk','Pamuk kumaşı','100% cotton'])assert.equal(canonicalMaterial(raw),'cotton');
 for(const raw of ['SIBAL fabric','SIBAL cloth','Cotton–Fiberglass (SIBAL)','cotton/fiberglass (sibal)'])assert.equal(canonicalMaterial(raw),'sibal');
 for(const raw of ['cotton/polyester','cotton-fiberglass','fabric','polyester fabric'])assert.notEqual(canonicalMaterial(raw),'cotton');
 assert.notEqual(canonicalMaterial('cotton-fiberglass'),'sibal');assert.notEqual(canonicalMaterial('glass-filled PMMA'),'pmma');
});
test('a named SIBAL alias receives the same source pressure and flow comparison',()=>{
 const a=parameterSupport(corpus,'PSI-26',{material:'sibal',pressure:100,airflow:10},CONDITION_FIELDS);
 const b=parameterSupport(corpus,'PSI-26',{material:'Cotton–Fiberglass (SIBAL)',pressure:100,airflow:10},CONDITION_FIELDS);
 assert.equal(b.compared,2);assert.equal(b.percent,a.percent);assert.equal(b.points,a.points);
});
test('material aliases reach literal source retrieval rather than only normalizing later scores',()=>{
 const request={ids:['PSI-1'],question:'',conditions:{material:'polymethylmethacrylate'}};
 assert.ok(queryTokens(request).has('pmma'));
 const chunks=makeChunks({id:'f1',name:'Source',accessions:['PSI-1'],sha256:sha('pmma')},[{location:{page:1},text:'PMMA is the tested specimen material.'}]);
 assert.equal(retrieve({chunks},request).chunks.length,1);
});
test('pure cotton remains unscored against a composite but the constituent link is explained with provenance',()=>{
 const d=diagnose({material:'pamuk kumaşı',gravityMs2:0,oxygen:21,pressure:100,airflow:10});
 assert.equal(d.compared,0);assert.equal(d.materialReview.canonical,'cotton');assert.equal(d.materialReview.status,'related_composite_context');
 assert.ok(d.materialReview.compositeReferences.some(r=>r.provenance.fileId==='f34124'&&/75%/.test(r.description)));
 assert.ok(d.materialReview.compositeReferences.every(r=>r.numericalTransferAllowed===false));
 assert.match(d.comparisons.find(c=>c.key==='pressure').reason,/pure-cotton/);
 assert.equal(d.comparisons.find(c=>c.key==='pressure').contextOnlyReference.material,'sibal');
 assert.equal(d.comparisons.find(c=>c.key==='pressure').contextOnlyReference.arithmeticProximity,null);
 assert.match(d.materialReview.absenceMeaning,/does not establish/);
 const c=researchContext(corpus,{ids:['PSI-26'],conditions:{material:'cotton'}});assert.match(c.records[0].content.fileText,/related_composite_context/);
});
test('provider-unavailable local discovery preserves related composite literature without a manufactured score',()=>{
 const request={ids:['PSI-26'],flow:{canRank:true},conditions:{material:'cotton fabric',gravityMs2:0,pressure:100}},r=localDiscovery(corpus,request);
 assert.equal(r.matches.length,1);const m=r.matches[0];assert.equal(m.materialRelation,'related_composite_context');assert.equal(m.numericPoints,0);assert.equal(m.scenarioPoints,null);assert.equal(m.assessedMaxPoints,0);
 assert.match(m.assessment.reason,/no composite measurement or score is transferred/);assert.equal(m.parameterDiagnostics.materialReview.status,'related_composite_context');
 assert.equal(localDiscovery(corpus,{...request,conditions:{material:'unknown blend',pressure:100}}).matches.length,0);
});
test('related composite survives candidate preselection with only a cotton and pressure query',()=>{
 const c={...corpus,records:[...Array.from({length:20},(_,i)=>({id:'PSI-'+(i+100),title:'Cotton pressure storage',content:{}})),...corpus.records],sourceContentRetrieval:{sourceCandidateIds:Array.from({length:12},(_,i)=>'PSI-'+(i+100))}};
 const q={ids:c.records.map(r=>r.id),question:'Review storage.',scenario:'Cotton storage.',conditions:{material:'cotton fabric',pressure:99}};
 const ids=researchCandidates(c,q);assert.equal(ids.length,12);assert.ok(ids.includes('PSI-26'));assert.equal(parameterSupport(c,'PSI-26',q.conditions,CONDITION_FIELDS).compared,0);
});
test('context references prefer a proven related composite over a numerically nearer unrelated material',()=>{
 const c=structuredClone(corpus),row=structuredClone(c.experiments.rows.find(r=>Number.isFinite(r.values.pressure)));
 row.runId='TEST_ONLY_UNRELATED';row.values.material='pmma';row.values.pressure=99;row.provenance={...row.provenance,fileId:'TEST_ONLY_PMMA'};c.experiments.rows.unshift(row);
 const q={material:'cotton fabric',pressure:99},p=parameterSupport(c,'PSI-26',q,CONDITION_FIELDS),d=parameterDiagnostics(c,'PSI-26',q,CONDITION_FIELDS,p);
 assert.equal(d.comparisons[0].contextOnlyReference.material,'sibal');assert.match(d.comparisons[0].reason,/verified related composite/);assert.equal(d.comparisons[0].awardedPoints,0);
 // If only an unrelated parameter value exists, never describe it as SIBAL.
 c.experiments.rows=c.experiments.rows.filter(r=>r.values.material==='pmma');c.experiments.studyEvidence=c.experiments.studyEvidence.filter(f=>!f.parameters.pressure);
 const r=parameterDiagnostics(c,'PSI-26',q,CONDITION_FIELDS,parameterSupport(c,'PSI-26',q,CONDITION_FIELDS)).comparisons[0];
 assert.equal(r.contextOnlyReference.material,'pmma');assert.doesNotMatch(r.reason,/SIBAL/);
});
test('Figure13 nominal0g/1g is supported only by the exact caption source, never a derived trial measurement',()=>{
 const f=corpus.experiments.studyEvidence.find(f=>f.scope==='figure_nominal_condition_comparison');
 assert.deepEqual(f.parameters.gravityMs2.values,[0,9.80665]);assert.equal(f.parameters.gravityMs2.approximate,true);
 assert.equal(f.provenance.bodyParagraph,77);assert.equal(f.provenance.figure,'13');assert.equal(f.provenance.fileId,'f34124');assert.equal(f.jointlyTested,false);
 assert.equal(psi26ReportFragments(verified.filter(f=>f.id!=='f34124')).length,0);
 assert.equal(psi26ReportFragments(verified.map(f=>f.id==='f34124'?{...f,sha256:'bad'}:f)).length,0);
 // The figure does not require an unrelated as-run matrix to substantiate its caption.
 assert.equal(psi26ReportFragments(verified.filter(f=>f.id==='f34124')).length,1);
 assert.ok(corpus.experiments.rows.every(r=>r.values.gravityMs2===undefined));
});
test('zero is an entered condition, not missing, and nominal gravity is disclosed',()=>{
 const d=diagnose({material:'SIBAL fabric',gravityMs2:0,temperatureK:null,pressure:100});
 assert.equal(d.provided,2);assert.equal(d.compared,2);assert.equal(d.unassessedPoints,0);
 const g=d.comparisons.find(c=>c.key==='gravityMs2');assert.equal(g.usedReference.value,0);assert.equal(g.usedReference.arithmeticProximity,100);assert.equal(g.reasonCode,'nominal_setting');assert.match(g.reason,/not a measured residual/);
 assert.equal(g.usedReference.provenance.figure,'13');assert.ok(d.blankInputs.includes('temperatureK'));assert.equal(d.sourceGravityContext.length,1);
});
test('nominal figure, pressure and flow remain separate evidence; missing ambient temperature does not become zero',()=>{
 const q={material:'sibal',gravityMs2:0,temperatureK:300,pressure:100,airflow:10},p=parameterSupport(corpus,'PSI-26',q,CONDITION_FIELDS),d=diagnose(q);
 assert.equal(p.compared,3);assert.equal(p.provided,4);assert.equal(p.assessedBudget,45);assert.equal(p.jointlyTested,false);
 assert.equal(p.contributions.find(c=>c.key==='temperatureK').score,null);assert.equal(d.comparisons.find(c=>c.key==='temperatureK').reasonCode,'ambient_temperature_not_indexed');
 assert.equal(d.unassessedPoints,15);assert.ok(p.points>44);
});
test('qualitative microgravity alone never becomes a measured zero or scored nominal setting',()=>{
 const c={records:[{id:'PSI-1',content:{approach:'Cotton burned in microgravity.'}}],experiments:{rows:[],studyEvidence:[]}},q={material:'cotton',gravityMs2:0};
 const p=parameterSupport(c,'PSI-1',q,CONDITION_FIELDS),d=parameterDiagnostics(c,'PSI-1',q,CONDITION_FIELDS,p);
 assert.equal(p.compared,0);assert.equal(p.percent,null);assert.equal(d.sourceGravityContext.length,0);assert.equal(d.comparisons[0].reasonCode,'numeric_gravity_not_indexed');
});
test('blank material remains unknown and related-property profiles cannot manufacture condition scores',()=>{
 const q={gravityMs2:0},d=diagnose(q);assert.match(d.comparisons[0].reason,/material was not supplied/);assert.equal(sourceMaterialReview(corpus,'PSI-26',q).status,'not_supplied');
 const c={...corpus,materialSupport:{status:{state:'ready'},profiles:[],coverage:[]}};
 assert.equal(materialApplicability(c,{material:'pamuk'}).numericScoreAdjustment,false);
 assert.equal(parameterSupport(c,'PSI-26',{material:'pamuk',temperatureK:300},CONDITION_FIELDS).percent,null);
});
