import {providerResponse} from './provider-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readdir,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {validateResearch,researchRanking} from '../lib/research.mjs';
import {SCENARIO_CRITERIA} from '../lib/research-scoring.mjs';
import {researchEvidence} from '../lib/research-evidence.mjs';
import {createAnalyzer} from '../lib/gemini.mjs';
import {createApp} from '../server.mjs';
import {validateConversations} from '../lib/conversations.mjs';
import {researchCards} from '../public/environment-panel.mjs';
import {reduceRecommendations} from '../public/recommendations-panel.mjs';

const quote='The local study describes ignition and flame spread in material specimens under specified experimental conditions.';
const corpus={hash:'rubric-recovery-test',records:[1,2].map(i=>({id:'PSI-'+i,title:'Study '+i,content:{approach:quote},tableReferences:[]}))};
const request={mode:'research',ids:['PSI-1','PSI-2'],question:'Review fiberglass storage.',scenario:'I store fiberglass cylinders and want source-supported research.',conditions:{material:'fiberglass'},flow:{intent:'research',updateResearch:true,canRank:true,requiredStage:null}};
const assessment=id=>({sourceId:id,field:'approach',quote,reason:'Source report on material fire research.',limitation:'Experimental evidence, not a storage fire prediction.',rubric:Object.fromEntries(Object.keys(SCENARIO_CRITERIA).map(k=>[k,.75])),rubricReasons:Object.fromEntries(Object.keys(SCENARIO_CRITERIA).map(k=>[k,'Source-specific test explanation for '+k]))});
const response=assessments=>({stage:'rank',summary:'Review the cited local reports.',questions:['How is the material arranged?'],assessments,unknowns:[],conditionSuggestions:[],evidenceGaps:[],recommendations:{action:'keep',items:[]},nextStep:'Inspect source limitations.',emergency:false});
const missing=(id='PSI-1')=>{const a=assessment(id);delete a.rubricReasons.gravity;return a;};
const raw=value=>Response.json({...providerResponse(value),id:'TEST_RUBRIC_RESPONSE',model:'TEST_ONLY_MODEL'});

test('one missing positive explanation does not discard conversation or a valid peer score',()=>{
 const original=response([missing(),assessment('PSI-2')]),before=structuredClone(original),result=validateResearch(original,corpus,request);
 assert.equal(result.summary,original.summary);assert.deepEqual(result.questions,original.questions);assert.deepEqual(original,before);
 assert.deepEqual(result.assessments.map(x=>x.sourceId),['PSI-2']);assert.equal(result.unscoredAssessments[0].sourceId,'PSI-1');assert.equal(result.unscoredAssessments[0].rubric,undefined);
 assert.deepEqual(result.assessmentReview.unscored[0].dimensions,[{dimension:'gravity',issue:'missing'}]);
 const ranking=researchRanking(corpus,request,result);assert.equal(ranking.matches[0].total,30);assert.equal(ranking.unscored[0].id,'PSI-1');assert.equal(ranking.unscored[0].total,undefined);
});
test('all sources with incomplete explanations stay accessible without fabricated totals',()=>{
 const result=validateResearch(response([missing(),missing('PSI-2')]),corpus,request),ranking=researchRanking(corpus,request,result),html=researchCards(ranking,corpus.records);
 assert.equal(ranking.matches.length,0);assert.equal(ranking.unscored.length,2);assert.match(html,/Score unavailable/);assert.match(html,/data-open="PSI-1"/);assert.match(html,/data-data="PSI-2"/);assert.doesNotMatch(html,/No supported source was found|0\.0 \/ 40|100%/);
});
test('a missing zero-point explanation receives only an administrative note and no score change',()=>{
 const a=assessment('PSI-1');a.rubric.gravity=0;delete a.rubricReasons.gravity;
 const result=validateResearch(response([a]),corpus,request);assert.equal(result.assessments[0].rubric.gravity,0);assert.match(result.assessments[0].rubricReasons.gravity,/No scenario points assigned/);assert.equal(result.unscoredAssessments,undefined);assert.equal(result.assessmentReview.zeroExplanations[0].dimensions[0].dimension,'gravity');assert.equal(researchRanking(corpus,request,result).matches[0].total,27);
});
test('null, whitespace, malformed and overlong explanations have bounded field diagnostics',()=>{
 for(const [value,issue] of [[null,'missing'],['   ','empty'],[{},'invalid_type'],['x'.repeat(601),'too_long']]){
  const a=assessment('PSI-1');a.rubricReasons.material=value;const r=validateResearch(response([a]),corpus,request);
  assert.deepEqual(r.assessmentReview.unscored[0].dimensions,[{dimension:'material',issue}]);assert.equal(r.assessments.length,0);
 }
});
test('model-supplied review metadata or unscored sources cannot bypass source validation',()=>{
 const input={...response([assessment('PSI-1')]),unscoredAssessments:[{sourceId:'PSI-999'}],assessmentReview:{unscored:[]}};
 const r=validateResearch(input,corpus,request);assert.equal(r.unscoredAssessments,undefined);assert.equal(r.assessmentReview,undefined);
 const invalid=missing();invalid.quote='A quotation not in the supplied source.';assert.throws(()=>validateResearch({...input,assessments:[invalid]},corpus,request),e=>e.code==='RESEARCH_QUOTE_INVALID');
});
test('out-of-range or missing numeric rubric values and duplicate IDs still fail closed',()=>{
 for(const patch of [{gravity:1.01},{gravity:undefined},{extra:0}])assert.throws(()=>validateResearch(response([{...missing(),rubric:{...missing().rubric,...patch}}]),corpus,request),e=>e.code==='RESEARCH_RUBRIC_INVALID');
 assert.throws(()=>validateResearch(response([missing(),assessment('PSI-1')]),corpus,request),e=>e.code==='RESEARCH_QUOTE_INVALID');
});
test('partial source scoring cannot clear stale recommendations or erase an emergency flag',()=>{
 const old={items:[{title:'Previously reviewed'}],stale:true,emergency:true};
 const r=validateResearch({...response([missing()]),recommendations:{action:'clear',items:[]}},corpus,request);
 assert.equal(r.recommendationsReviewed,false);assert.deepEqual(reduceRecommendations(old,r),old);
 const complete=validateResearch(response([assessment('PSI-1')]),corpus,request);assert.equal(complete.recommendationsReviewed,true);assert.equal(reduceRecommendations(old,complete).stale,false);
});
test('full positive rubric explanations preserve prior scores and normal cache eligibility',()=>{
 for(const number of [0.25,0.5,0.75,1]){
  const a=assessment('PSI-1');for(const key of Object.keys(a.rubric))a.rubric[key]=number;
  const r=validateResearch(response([a]),corpus,request);assert.equal(r.assessmentReview,undefined);assert.equal(researchRanking(corpus,request,r).matches[0].total,40*number);
 }
});
test('partial analyzer replies retain diagnostics, do not retry and cannot return as fully valid from cache',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'flame-rubric-'));let calls=0;
 const analyzer=createAnalyzer({corpus,key:'TEST_ONLY',runtimeDir:dir,fetchImpl:async()=>{calls++;return raw(response([missing()]));}});
 const result=await analyzer.analyze(request);assert.equal(calls,1);assert.equal(result.provider.validation,'partial');assert.equal(result.analysis.unscoredAssessments.length,1);
 const receipt=JSON.parse(await readFile(path.join(dir,'last-call.json'),'utf8'));assert.equal(receipt.assessmentReview.unscored[0].dimensions[0].dimension,'gravity');assert.equal(receipt.provider.validation,'partial');
 assert.equal((await readdir(dir)).filter(f=>/^[a-f0-9]{64}\.json$/.test(f)).length,0);
 await analyzer.analyze(request);assert.equal(calls,2);assert.equal(analyzer.status().cacheHits,0);
});
test('HTTP pipeline returns partial response, valid peer ranking and unscored source with one provider call',async()=>{
 let calls=0;const analyzer=createAnalyzer({corpus,key:'TEST_ONLY',fetchImpl:async()=>{calls++;return raw(response([missing(),assessment('PSI-2')]));}});
 const app=createApp({corpus,analyzer,sessionToken:'test'});await new Promise(r=>app.listen(0,'127.0.0.1',r));
 try{const r=await fetch('http://127.0.0.1:'+app.address().port+'/api/research',{method:'POST',headers:{'Content-Type':'application/json','X-Flame-Session':'test'},body:JSON.stringify(request)});assert.equal(r.status,200);const result=await r.json();assert.equal(result.provider.validation,'partial');assert.equal(result.ranking.matches.length,1);assert.equal(result.ranking.unscored.length,1);assert.equal(calls,1);}finally{await new Promise(r=>app.close(r));}
});
test('history preserves the partial reply, its source limitation and provider origin',()=>{
 const analysis=validateResearch(response([missing()]),corpus,request),state={revision:0,activeId:'a',conversations:[{id:'a',title:'Test',context:{},messages:[{id:'m',role:'assistant',text:analysis.summary,response:{analysis,provider:{httpStatus:200,validation:'partial'}}}]}]};
 const saved=validateConversations(state).conversations[0].messages[0];assert.equal(saved.response.provider.validation,'partial');assert.deepEqual(saved.response.analysis.assessmentReview,analysis.assessmentReview);
});
test('unscored source rendering escapes model text and preserves report/data/AI actions',()=>{
 const a=missing();a.reason='<img src=x onerror=alert(1)>';const r=validateResearch(response([a]),corpus,request),html=researchCards(researchRanking(corpus,request,r),corpus.records);
 assert.ok(!html.includes('<img'));assert.match(html,/&lt;img/);assert.match(html,/data-ai="PSI-1"/);
});
