import {providerResponse} from './provider-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {attachSourceFragments} from '../lib/research-source-context.mjs';
import {researchContext} from '../lib/research-coverage.mjs';
import {researchEvidence,resolveResearchEvidence} from '../lib/research-evidence.mjs';
import {researchCandidates} from '../lib/research-candidates.mjs';
import {validateRecommendations} from '../lib/recommendations.mjs';
import {recommendationHtml,reduceRecommendations} from '../public/recommendations-panel.mjs';
import {parameterSupport} from '../lib/parameter-support.mjs';
import {parameterDiagnostics} from '../lib/parameter-diagnostics.mjs';
import {createAnalyzer} from '../lib/gemini.mjs';
import {PSI26_REPORT_SOURCES,psi26ReportFragments} from '../lib/psi26-report-evidence.mjs';
import {prioritizeStudyFragments} from '../lib/study-evidence-sorting.mjs';
const passage='The extinguishing stream can entrain surrounding oxygen. This source describes an experimental context and does not validate an operational intervention.';
const chunk={id:'C-'+'a'.repeat(24),fileId:'f7',name:'Report.pdf',sha256:'b'.repeat(64),sourceIds:['PSI-21'],location:{page:48,start:720,end:720+passage.length},quote:passage,scope:'literal_extracted_text_not_reviewed_numerical_evidence'};
const records=()=>Array.from({length:21},(_,i)=>({id:'PSI-'+(i+1),title:i===20?'Study hardware':'Generic ignition oxygen flame',content:{approach:'Generic research context.',fileText:'Reviewed local source index. '+'.'.repeat(7000)},tableReferences:[]}));
const corpus=()=>({hash:'test',records:records(),experiments:{rows:[],studyEvidence:[]}});
const request={mode:'research',ids:records().map(r=>r.id),question:'Entrainment during suppression',scenario:'Investigate suppression evidence for stored material.',conditions:{},flow:{requiredStage:'conversation',canRank:false},previousRecommendations:[]};
const withChunk=(c=corpus())=>attachSourceFragments(c,{chunks:[chunk],sourceCandidateIds:['PSI-21'],characters:passage.length,indexHash:'c'.repeat(64),coverage:{coverageComplete:false}});

test('late-page literal passage survives coverage augmentation without 6k truncation',()=>{
 const c=researchContext(withChunk(),request),r=c.records.find(r=>r.id==='PSI-21');
 assert.ok(r.content.fileText.includes(passage));assert.equal(r.sourceFragments[0].location.page,48);
 const e=researchEvidence(c,request.ids).find(e=>e.provenance?.fileId==='f7');assert.equal(e.quote,passage);assert.equal(e.provenance.page,48);assert.match(e.association,/Catalog association/);
});
test('content discovery protects an interior finding despite an unrelated study title',()=>{
 const c=withChunk(),selected=researchCandidates(c,request);
 assert.equal(selected.length,12);assert.equal(selected[0],'PSI-21');
});
test('analyzer enriches all allowed sources before its twelve-source cut, without a real provider',async()=>{
 let contextIds,payload;
 const analyzer=createAnalyzer({corpus:corpus(),key:'TEST_ONLY',contextProvider:async r=>{contextIds=r.ids;return withChunk();},fetchImpl:async(_url,options)=>{
  payload=JSON.parse(JSON.parse(options.body).input[0].content[0].text);
  return new Response(JSON.stringify({...providerResponse({stage:'conversation',summary:'Hello. What would you like to investigate?',questions:[],assessments:[],conditionSuggestions:[],unknowns:[],evidenceGaps:[],recommendations:{action:'keep',items:[]},nextStep:'',emergency:false})}));
 }});
 await analyzer.analyze(request);assert.equal(contextIds.length,21);assert.equal(payload.sources.length,12);assert.ok(payload.evidence.some(e=>e.quote===passage));assert.equal(payload.sourceContentLookup.coverage.coverageComplete,false);assert.equal(payload.tools,undefined);
});
test('shared document aliases retain separate source evidence IDs without creating measurements',()=>{
 const c=attachSourceFragments(corpus(),{chunks:[{...chunk,sourceIds:['PSI-20','PSI-21']}],sourceCandidateIds:['PSI-20','PSI-21']});
 const refs=researchEvidence(researchContext(c,request),request.ids).filter(e=>e.quote===passage);
 assert.equal(refs.length,2);assert.notEqual(refs[0].id,refs[1].id);assert.equal(c.experiments.rows.length,0);
 assert.equal(parameterSupport(c,'PSI-21',{pressure:100},['pressure']).percent,null);
 assert.throws(()=>resolveResearchEvidence({assessments:[{sourceId:refs[1].sourceId,evidenceId:refs[0].id}]},researchContext(c,request),request),/could not be verified/);
});
test('invalid fragments and third-party records cannot become PSI citation passages',()=>{
 const c=corpus();c.records.push({id:'MAT-1',content:{}});
 const out=attachSourceFragments(c,{chunks:[{...chunk,scope:'applicability_only'},{...chunk,id:'C-'+'d'.repeat(24),sourceIds:['MAT-1']}]});
 assert.equal(out.records.some(r=>r.sourceFragments?.length),false);
});
test('source identity is derived from actual supplied chunks, never model-provided provenance',()=>{
 const c=researchContext(withChunk(),request),e=researchEvidence(c,request.ids).find(e=>e.quote===passage);
 const resolved=resolveResearchEvidence({recommendations:{action:'replace',items:[{sourceId:'PSI-21',evidenceId:e.id,evidenceProvenance:{fileId:'f999'},title:'Review the suppression experiment',text:'Compare the test setup with the proposed enclosure.',relevance:'Entrainment can limit transfer of the source example.',priority:'medium',limitation:'This is not an approved intervention.'}]}},c,request);
 const checked=validateRecommendations(resolved,c,request),item=checked.recommendations.items[0];assert.equal(item.evidenceProvenance.fileId,'f7');
 const html=recommendationHtml({items:[item]});assert.match(html,/f7#page=48/);assert.match(html,/Why it matters/);assert.match(html,/Limit:/);assert.match(html,/Original SHA256/);
 const metadata=researchEvidence(c,request.ids).find(e=>e.field==='approach');
 const clean=resolveResearchEvidence({assessments:[{sourceId:metadata.sourceId,evidenceId:metadata.id,evidenceProvenance:{fileId:'f999'}}]},c,request);assert.equal(clean.assessments[0].evidenceProvenance,undefined);
});
test('an unchanged recommendation cannot be marked reviewed when its original source was not supplied',()=>{
 const c=withChunk(),old={items:[{sourceId:'PSI-99'}],stale:true};
 const a=validateRecommendations({recommendations:{action:'keep',items:[]}},c,{...request,previousRecommendations:old.items});
 assert.equal(a.recommendationsReviewed,false);assert.equal(a.recommendationReview.issues[0].code,'prior_source_not_supplied');assert.deepEqual(reduceRecommendations(old,a),{...old,emergency:false});
});
test('per-field provenance is preserved and nonsynchronized references never become a joint trial',()=>{
 const pressure={fileId:'f8',sha256:'d'.repeat(64),sheet:'as run matrix',row:41},flow={fileId:'f9',sha256:'e'.repeat(64),part:'word/document.xml',table:'I',row:7};
 const c={experiments:{rows:[{sourceId:'PSI-26',runId:'linked',jointlyTested:false,values:{material:'sibal',pressure:99,airflow:10},evidence:{pressure:{provenance:pressure},airflow:{provenance:flow}},provenance:flow}],studyEvidence:[]}};
 const p=parameterSupport(c,'PSI-26',{material:'sibal',pressure:99,airflow:10},['pressure','airflow']),d=parameterDiagnostics(c,'PSI-26',{material:'sibal',pressure:99,airflow:10},['pressure','airflow'],p);
 assert.equal(p.percent,100);assert.equal(p.jointlyTested,false);assert.equal(d.comparisons[0].usedReference.provenance.fileId,'f8');assert.equal(d.comparisons[1].usedReference.provenance.fileId,'f9');
});
test('literal table context stays separately anchored and does not forward-fill measured rows',()=>{
 const header={...chunk,id:'C-'+'e'.repeat(24),quote:'Column labels: test identifier and reported oxygen.',location:{sheet:'Tests',row:1},retrievalRole:'first_or_preceding_raw_row_not_inferred_column_header'};
 const c=attachSourceFragments(corpus(),{chunks:[chunk],contextChunks:[header]});const r=c.records.find(r=>r.id==='PSI-21');
 assert.equal(r.sourceFragments.length,2);assert.equal(r.sourceFragments[1].location.row,1);assert.equal(c.experiments.rows.length,0);
});
test('an exact named composite input is recognized without equating pure cotton or unnamed mixtures',()=>{
 const c={experiments:{rows:[{sourceId:'PSI-26',runId:'a',values:{material:'sibal',pressure:99},provenance:{fileId:'f7'},evidence:{}}],studyEvidence:[]}};
 assert.equal(parameterSupport(c,'PSI-26',{material:'Cotton-Fiberglass (SIBAL)',pressure:99},['pressure']).percent,100);
 for(const material of ['cotton','Cotton-Fiberglass','PMMA & Nomex'])assert.equal(parameterSupport(c,'PSI-26',{material,pressure:99},['pressure']).percent,null);
});
test('quarantined thickness is explained as an ambiguous source value rather than a measured mismatch',()=>{
 const c={experiments:{rows:[{sourceId:'PSI-99',runId:'a',values:{material:'sibal'},provenance:{fileId:'f7'},evidence:{},normalizationIssues:[{parameter:'thicknessMm',status:'quarantined',raw:'037 mm',reason:'Source 037 mm is ambiguous; no decimal is inserted.',provenance:{fileId:'f7',row:6,column:'Samle Thickness'}}]}],studyEvidence:[]}};
 const input={material:'sibal',thicknessMm:.37},p=parameterSupport(c,'PSI-99',input,['thicknessMm']),d=parameterDiagnostics(c,'PSI-99',input,['thicknessMm'],p);
 assert.equal(p.percent,null);assert.equal(d.comparisons[0].reasonCode,'source_value_quarantined');assert.equal(d.comparisons[0].rawExamples[0].raw,'037 mm');
});
test('unresolved oxygen marginal context retains its raw basis and receives no invented percentage',()=>{
 const c={experiments:{rows:[],studyEvidence:[{sourceId:'PSI-98',material:'sibal',parameters:{},unscoredParameters:{oxygen:{raw:'21.5 - 21.7',sourceUnit:'percent; basis unresolved'}},text:'Oxygen fraction basis is unresolved.',provenance:{fileId:'f7',row:2}}]}};
 const input={material:'sibal',oxygen:21.6},p=parameterSupport(c,'PSI-98',input,['oxygen']),d=parameterDiagnostics(c,'PSI-98',input,['oxygen'],p);
 assert.equal(p.percent,null);assert.equal(d.comparisons[0].reasonCode,'source_unit_unresolved');assert.equal(d.comparisons[0].rawExamples[0].raw,'21.5 - 21.7');
});
test('reported flow stages are discrete useful settings without extra trials or interval credit',()=>{
 const studyEvidence=psi26ReportFragments(PSI26_REPORT_SOURCES.map(s=>({id:s.fileId,sha256:s.sha256,name:'Pinned original'}))),c={experiments:{rows:[],studyEvidence}};
 assert.equal(studyEvidence.filter(f=>f.scope==='within_trial_reported_settings').length,11);
 const p=parameterSupport(c,'PSI-26',{material:'sibal',airflow:44.44},['airflow']);assert.ok(p.percent>99&&p.percent<100);assert.equal(p.jointlyTested,false);assert.equal(p.contributions[0].observed,44);assert.equal(p.contributions[0].provenance.fileId,'f34124');
 assert.notEqual(parameterSupport(c,'PSI-26',{material:'sibal',airflow:40},['airflow']).percent,100);
 assert.equal(parameterSupport(c,'PSI-26',{material:'cotton',airflow:44},['airflow']).percent,null);
 assert.equal(c.experiments.rows.length,0);
});
test('a matched late reviewed setting is protected before the six-fragment context cut',()=>{
 const studyEvidence=psi26ReportFragments(PSI26_REPORT_SOURCES.map(s=>({id:s.fileId,sha256:s.sha256,name:'Pinned original'})));
 const chosen=prioritizeStudyFragments(studyEvidence,{question:'Report flow',conditions:{material:'sibal',airflow:44}}).slice(0,6);
 assert.ok(chosen[0].parameters.airflow.values.includes(44));assert.match(chosen[0].text,/not independently repeated trials/);
});
