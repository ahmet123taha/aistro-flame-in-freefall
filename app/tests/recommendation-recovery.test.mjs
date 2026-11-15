import {providerResponse} from './provider-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readdir,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {validateResearch,researchRanking} from '../lib/research.mjs';
import {validateRecommendations,RECOMMENDATION_CONTRACT} from '../lib/recommendations.mjs';
import {SCENARIO_CRITERIA} from '../lib/research-scoring.mjs';
import {researchEvidence,resolveResearchEvidence} from '../lib/research-evidence.mjs';
import {validateAnalysis} from '../lib/corpus.mjs';
import {createAnalyzer,payloadFor} from '../lib/gemini.mjs';
import {createApp} from '../server.mjs';
import {validateConversations} from '../lib/conversations.mjs';
import {reduceRecommendations} from '../public/recommendations-panel.mjs';
import {recommendationReviewHtml} from '../public/conversation-panel.mjs';

const quote='The local source describes material ignition and flame spread in controlled experiments, with measured conditions and specific limitations.';
const corpus={hash:'recommendation-recovery',records:[1,2].map(i=>({id:'PSI-'+i,title:'Study '+i,content:{approach:quote},tableReferences:[]}))};
const request={mode:'research',ids:['PSI-1','PSI-2'],question:'Review fiberglass storage.',scenario:'I store fiberglass cylinders and want ignition research.',conditions:{material:'fiberglass'},flow:{intent:'environment',updateResearch:true,canRank:true,requiredStage:null}};
const assessment=id=>({sourceId:id,field:'approach',quote,reason:'Source-based experimental comparison.',limitation:'Not a storage fire prediction.',rubric:Object.fromEntries(Object.keys(SCENARIO_CRITERIA).map(k=>[k,.75])),rubricReasons:Object.fromEntries(Object.keys(SCENARIO_CRITERIA).map(k=>[k,'Test source-specific explanation for '+k]))});
const item=(id='PSI-1')=>({sourceId:id,field:'approach',quote,title:'Review source geometry',text:'Compare the reported experimental arrangement.',priority:'medium',limitation:'Research candidate, not operational advice.'});
const response=(update={action:'keep',items:[]})=>({stage:'rank',summary:'The research reply remains available.',questions:[],assessments:[assessment('PSI-1'),assessment('PSI-2')],unknowns:[],conditionSuggestions:[],evidenceGaps:[],recommendations:update,nextStep:'Inspect the local reports.',emergency:false});
const raw=value=>Response.json({...providerResponse(value),id:'TEST_RECOMMENDATION',model:'TEST_ONLY_MODEL'});
const previous={items:[item()],stale:true,emergency:true};

test('reported keep plus two items preserves research and does not replace or revalidate prior advice',()=>{
 const input=response({action:'keep',items:[item(),item('PSI-2')]}),original=structuredClone(input),result=validateResearch(input,corpus,request);
 assert.deepEqual(input,original);assert.equal(result.summary,input.summary);assert.equal(result.assessments.length,2);
 assert.deepEqual(result.recommendations,{action:'keep',items:[]});assert.equal(result.recommendationsReviewed,false);
 assert.deepEqual(result.recommendationReview,{action:'keep',suppliedCount:2,issues:[{code:'action_items_conflict',field:'recommendations.items'}]});
 assert.deepEqual(reduceRecommendations(previous,result),previous);assert.deepEqual(researchRanking(corpus,request,result).matches.map(m=>m.total),[30,30]);
});

test('contradictory clear with items cannot erase previous recommendations',()=>{
 const result=validateResearch(response({action:'clear',items:[item()]}),corpus,request);
 assert.equal(result.recommendations.action,'keep');assert.equal(result.recommendationsReviewed,false);assert.deepEqual(reduceRecommendations(previous,result),previous);
});

test('malformed optional updates are isolated with bounded diagnostics',()=>{
 for(const [update,code] of [[null,'invalid_action'],['bad','invalid_action'],[[],'invalid_action'],[{action:'<script>oops</script>',items:[]},'invalid_action'],[{action:'replace',items:{}},'invalid_items'],[{action:'keep'},'invalid_items'],[{action:'replace',items:Array.from({length:7},()=>item())},'too_many_items']]){
  const result=validateResearch(response(update),corpus,request);assert.equal(result.summary,response().summary);assert.equal(result.recommendationReview.issues[0].code,code);assert.equal(result.recommendationsReviewed,false);assert.ok(!JSON.stringify(result.recommendationReview).includes('<script>'));
 }
});

test('valid keep, clear and full replacement retain their explicit semantics',()=>{
 const keep=validateResearch(response(),corpus,request);assert.equal(keep.recommendationsReviewed,true);assert.equal(keep.recommendationReview,undefined);assert.equal(reduceRecommendations(previous,keep).stale,false);
 const clear=validateResearch(response({action:'clear',items:[]}),corpus,request);assert.deepEqual(reduceRecommendations(previous,clear).items,[]);
 const replace=validateResearch(response({action:'replace',items:[item('PSI-2')]}),corpus,request);const next=reduceRecommendations(previous,replace);assert.equal(next.items[0].sourceId,'PSI-2');assert.equal(next.items[0].evidenceType,'inference');assert.equal(next.stale,false);
});

test('an empty replacement does not infer a clear operation',()=>{
 const result=validateResearch(response({action:'replace',items:[]}),corpus,request);assert.equal(result.recommendationReview.issues[0].code,'empty_replacement');assert.deepEqual(reduceRecommendations(previous,result),previous);
});

test('unverified recommendation content is never applied or copied into diagnostics',()=>{
 for(const patch of [{sourceId:'FORGED'},{quote:'A quotation never supplied by a local source.'},{priority:'urgent'},{title:''},{text:'x'.repeat(1601)},{limitation:null}]){
  const result=validateResearch(response({action:'replace',items:[{...item(),...patch}]}),corpus,request);
  assert.equal(result.assessments.length,2);assert.equal(result.recommendationReview.issues[0].code,'unverified_item');assert.equal(result.recommendationsReviewed,false);assert.deepEqual(result.recommendations.items,[]);assert.ok(!JSON.stringify(result.recommendationReview).includes('FORGED'));assert.ok(!JSON.stringify(result.recommendationReview).includes('never supplied'));
 }
});

test('a replacement is atomic: an invalid peer does not erase old candidates by applying a subset',()=>{
 const result=validateResearch(response({action:'replace',items:[item('PSI-2'),{...item(),quote:'invalid'}]}),corpus,request);
 assert.equal(result.recommendationReview.issues[0].index,1);assert.deepEqual(result.recommendations.items,[]);assert.deepEqual(reduceRecommendations(previous,result),previous);
});

test('bad recommendation evidence is isolated while bad assessment evidence still rejects research',()=>{
 const input=response({action:'replace',items:[{...item(),evidenceId:'E-forged'}]});
 const resolved=resolveResearchEvidence(input,corpus,request),result=validateResearch(resolved,corpus,request);assert.equal(result.recommendationsReviewed,false);assert.equal(result.assessments.length,2);
 input.assessments[0].evidenceId='E-forged';assert.throws(()=>resolveResearchEvidence(input,corpus,request),e=>e.code==='RESEARCH_EVIDENCE_INVALID');
});

test('model-supplied recommendation review or approval flags cannot override the server',()=>{
 const input={...response(),recommendationReview:{issues:[{code:'pretend'}]},recommendationsReviewed:false};const valid=validateResearch(input,corpus,request);assert.equal(valid.recommendationReview,undefined);assert.equal(valid.recommendationsReviewed,true);
 input.recommendations={action:'keep',items:[item()]};input.recommendationsReviewed=true;const rejected=validateResearch(input,corpus,request);assert.equal(rejected.recommendationsReviewed,false);assert.equal(rejected.recommendationReview.issues[0].code,'action_items_conflict');
});

test('an omitted recommendation section leaves previous review status unchanged',()=>{
 const input=response();delete input.recommendations;input.recommendationsReviewed=true;const result=validateResearch(input,corpus,request);
 assert.equal(result.recommendationsReviewed,false);assert.equal(result.recommendationReview,undefined);assert.deepEqual(reduceRecommendations(previous,result),previous);
});

test('clarification and conversation cannot update recommendations even with valid items',()=>{
 for(const stage of ['clarify','conversation']){
  const result=validateResearch({...response({action:'replace',items:[item()]}),stage,assessments:[]},corpus,request);assert.equal(result.recommendationsReviewed,false);assert.deepEqual(result.recommendations,{action:'keep',items:[]});
 }
});

test('legacy source chat shares the same recommendation containment boundary',()=>{
 const input={answerType:'conversation',summary:'Hello.',items:[],unknowns:[],nextStep:'Describe your question.',recommendations:{action:'keep',items:[item()]}};
 const result=validateAnalysis(input,corpus,{...request,mode:'chat'});assert.equal(result.summary,'Hello.');assert.equal(result.recommendationsReviewed,false);
});

test('analyzer records partial diagnostics without automatic retry or a misleading cached approval',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'flame-recommendations-'));let calls=0;
 try{
  const analyzer=createAnalyzer({corpus,key:'TEST_ONLY',runtimeDir:dir,fetchImpl:async()=>{calls++;return raw(response({action:'keep',items:[item(),item('PSI-2')]}));}});
  const first=await analyzer.analyze(request);assert.equal(calls,1);assert.equal(first.provider.validation,'partial');assert.equal(first.analysis.assessments.length,2);
  const receipt=JSON.parse(await readFile(path.join(dir,'last-call.json'),'utf8'));assert.equal(receipt.recommendationReview.action,'keep');assert.equal(receipt.recommendationReview.suppliedCount,2);assert.ok(!JSON.stringify(receipt).includes(item().text));
  assert.equal((await readdir(dir)).filter(f=>/^[a-f0-9]{64}\.json$/.test(f)).length,0);
  await analyzer.analyze(request);assert.equal(calls,2);assert.equal(analyzer.status().cacheHits,0);
 }finally{const resolved=path.resolve(dir);assert.ok(resolved.startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(resolved).startsWith('flame-recommendations-'));await rm(resolved,{recursive:true,force:true});}
});

test('HTTP pipeline permits manual complete recovery after a conflicting update',async()=>{
 let calls=0;const analyzer=createAnalyzer({corpus,key:'TEST_ONLY',fetchImpl:async()=>{calls++;return raw(response(calls===1?{action:'keep',items:[item(),item('PSI-2')]}:{action:'replace',items:[item()]}));}});
 const app=createApp({corpus,analyzer,sessionToken:'test'});await new Promise(r=>app.listen(0,'127.0.0.1',r));
 try{
  const send=async()=>{const res=await fetch('http://127.0.0.1:'+app.address().port+'/api/research',{method:'POST',headers:{'Content-Type':'application/json','X-Flame-Session':'test'},body:JSON.stringify(request)});assert.equal(res.status,200);return res.json();};
  const first=await send();assert.equal(calls,1);assert.equal(first.provider.validation,'partial');assert.equal(first.ranking.matches.length,2);assert.deepEqual(reduceRecommendations(previous,first.analysis),previous);
  const second=await send();assert.equal(calls,2);assert.equal(second.provider.validation,'passed');assert.equal(second.analysis.recommendationsReviewed,true);assert.equal(reduceRecommendations(previous,second.analysis).stale,false);
 }finally{await new Promise(r=>app.close(r));}
});

test('saved history retains the update limitation without rendering rejected model text',()=>{
 const analysis=validateResearch(response({action:'keep',items:[{...item(),title:'<script>unsafe</script>'}]}),corpus,request);
 const value={revision:0,activeId:'a',conversations:[{id:'a',title:'Test',context:{},messages:[{id:'m',role:'assistant',text:analysis.summary,response:{analysis,provider:{validation:'partial',httpStatus:200}}}]}]};
 const saved=validateConversations(value).conversations[0].messages[0];assert.deepEqual(saved.response.analysis.recommendationReview,analysis.recommendationReview);assert.equal(saved.response.provider.validation,'partial');
 const html=recommendationReviewHtml(analysis.recommendationReview);assert.match(html,/Recommendation update not applied/);assert.match(html,/keep\/clear/);assert.ok(!html.includes('<script>'));
});

test('both request modes receive one shared explicit recommendation operation contract',()=>{
 for(const mode of ['research','chat'])assert.ok(payloadFor(corpus,{...request,mode}).instructions.includes(RECOMMENDATION_CONTRACT));
 assert.ok(RECOMMENDATION_CONTRACT.includes('{"action":"keep","items":[]}'));assert.ok(RECOMMENDATION_CONTRACT.includes('{"action":"clear","items":[]}'));
});

test('cached omission cannot be reinterpreted as an explicit completed recommendation review',async()=>{
 let calls=0;const input=response();delete input.recommendations;
 const analyzer=createAnalyzer({corpus,key:'TEST_ONLY',fetchImpl:async()=>{calls++;return raw(input);}});
 const first=await analyzer.analyze(request),cached=await analyzer.analyze(request);
 assert.equal(calls,1);assert.equal(cached.cached,true);assert.equal(first.analysis.recommendations,undefined);assert.equal(cached.analysis.recommendationsReviewed,false);assert.deepEqual(reduceRecommendations(previous,cached.analysis),previous);
 // The on-disk cache path revalidates rather than reuses the in-memory object.
 const revalidated=validateResearch(cached.analysis,corpus,request);assert.equal(revalidated.recommendationsReviewed,false);assert.equal(revalidated.recommendations,undefined);
});
