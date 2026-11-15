import {providerResponse} from './provider-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSafetyStep,validStepCount,SAFETY_STEPS_CONTRACT} from '../lib/safety-steps.mjs';
import {validateRecommendations,recommendationContext} from '../lib/recommendations.mjs';
import {recommendationHtml,reduceRecommendations} from '../public/recommendations-panel.mjs';
import {displayedSafetyCount} from '../public/safety-steps-panel.mjs';
import {validateConversations} from '../lib/conversations.mjs';
import {createAnalyzer} from '../lib/gemini.mjs';
import {researchEvidence} from '../lib/research-evidence.mjs';
import {SCENARIO_CRITERIA} from '../lib/research-scoring.mjs';
const quote='Controlled testing investigated the named material and reported the specific specimen arrangement. The source does not establish an approved response procedure.';
const corpus={records:[{id:'PSI-1',content:{approach:quote}}]},request={ids:['PSI-1']};
const step=(phase='prevention')=>({phase,when:'When planning storage of the named material.',ifUnknown:'Keep the material description unknown and ask the responsible person for its record.',check:'The relevant source location and the remaining gap are recorded.'});
const item=(phase='prevention',n=1)=>({title:'TEST ONLY review step '+n,text:'Compare the recorded specimen arrangement with the planned storage.',relevance:'The arrangement is relevant to the proposed review.',priority:'medium',sourceId:'PSI-1',field:'approach',quote,limitation:'This is controlled test content, not a safety procedure.',step:step(phase)});
const evaluate=items=>validateRecommendations({recommendations:{action:'replace',items}},corpus,request);

test('phase metadata rejects missing, unknown and oversized fields and strips forged approval',()=>{
 assert.equal(normalizeSafetyStep(undefined).ok,true);
 for(const x of [null,[],{...step(),phase:'extinguish_now'},{...step(),when:''},{...step(),ifUnknown:'x'.repeat(501)}])assert.equal(normalizeSafetyStep(x).ok,false);
 assert.deepEqual(normalizeSafetyStep({...step(),approved:true,order:99,url:'javascript:bad'}).step,step());
});
test('twelve structured steps survive validation, but legacy and per-phase caps remain bounded',()=>{
 const items=['prevention','response','avoid'].flatMap(p=>Array.from({length:4},(_,n)=>item(p,n)));
 const result=evaluate(items);assert.equal(result.recommendationsReviewed,true);assert.equal(result.recommendations.items.length,12);
 assert.equal(validStepCount([...items,item()]),false);
 assert.equal(evaluate(Array.from({length:5},(_,n)=>item('prevention',n))).recommendationsReviewed,false);
 const legacy=Array.from({length:7},()=>{const x=item();delete x.step;return x;});assert.equal(evaluate(legacy).recommendationsReviewed,false);
});
test('one malformed step or fabricated citation rejects the complete replacement',()=>{
 for(const bad of [{...item(),step:{...step(),check:''}},{...item(),quote:quote+' Invented benefit.'},{...item(),sourceId:'MAT-1'}]){
  const result=evaluate([item(),bad]);assert.equal(result.recommendationsReviewed,false);assert.equal(result.recommendations.action,'keep');
 }
});
test('the shared response context preserves step branches without promoting old quotes to evidence',()=>{
 const result=recommendationContext([item('response')]);assert.deepEqual(result[0].step,step('response'));assert.equal(result[0].quote,undefined);
});
test('rendering groups and numbers steps with actionable conditions, unknown branches and verification',()=>{
 const html=recommendationHtml({items:evaluate([item('avoid'),item('response'),item('prevention')]).recommendations.items});
 for(const name of ['Prevent a fire','Response planning','Critical things to avoid','When:','If unknown:','Check:','Limit:','Source passage'])assert.ok(html.includes(name),name);
 assert.ok(html.indexOf('Prevent a fire')<html.indexOf('Response planning'));assert.match(html,/data-open="PSI-1"/);
 assert.equal((html.match(/class="safety-step-list"/g)||[]).length,3);
});
test('model HTML and forged identifiers remain escaped',()=>{
 const x=item();x.step.ifUnknown='<script>bad()</script>';x.title='<img src=x>';x.sourceId='" onmouseover="bad';
 const html=recommendationHtml({items:[x]});assert.doesNotMatch(html,/<script>|<img src=x>|data-open="" onmouseover/);assert.match(html,/&lt;script&gt;/);
});
test('active incident hides every model-generated instruction, including disguised prevention and legacy items',()=>{
 const forged=item();forged.text='UNTRUSTED_OPERATIONAL_TEXT';const old={...forged};delete old.step;
 const html=recommendationHtml({items:[forged,old],emergency:true});assert.doesNotMatch(html,/UNTRUSTED_OPERATIONAL_TEXT|TEST ONLY review/);assert.match(html,/approved crew\/site emergency procedures/);assert.match(html,/Do not wait/);assert.equal(displayedSafetyCount({items:[forged],emergency:true}),0);
});
test('unvalidated updates cannot clear an active-incident state or replace previous steps',()=>{
 const old={items:[item()],stale:true,emergency:true};assert.deepEqual(reduceRecommendations(old,{recommendations:{action:'clear',items:[]},emergency:false}),old);
});
test('saved conversations retain all twelve steps and their conditions without truncating to six',()=>{
 const items=['prevention','response','avoid'].flatMap(p=>Array.from({length:4},(_,n)=>item(p,n)));
 const saved=validateConversations({revision:0,activeId:'test',conversations:[{id:'test',title:'Controlled test',messages:[],context:{recommendations:{items,stale:false}}}]});assert.equal(saved.conversations[0].context.recommendations.items.length,12);assert.deepEqual(saved.conversations[0].context.recommendations.items[7].step,step('response'));
});
test('empty categories explain absent evidence; legacy advice is not silently reclassified',()=>{
 const x=item();delete x.step;const html=recommendationHtml({items:[x]});assert.match(html,/Earlier unclassified candidates/);assert.match(html,/No source-supported prevention step yet/);assert.match(html,/procedure and equipment are known/);
});
test('prompt distinguishes prevention, response planning, avoid steps and non-delay emergency handoff',()=>{
 for(const phrase of ['PREVENTION','RESPONSE','AVOID','ACTIVE INCIDENT','ifUnknown','Do the source lookup','material\'s name alone','not an approved crew/site procedure']){
  assert.ok(SAFETY_STEPS_CONTRACT.includes(phrase),phrase);
 }
});

test('controlled provider transport preserves all three phases through evidence resolution and cache',async()=>{
 const data={hash:'SAFETY_TEST_ONLY',records:[{...corpus.records[0],title:'Controlled source fixture',tableReferences:[]}]};
 const req={mode:'research',ids:['PSI-1'],question:'Plan a material-storage review.',scenario:'I want to prepare for possible fire while storing the material.',conditions:{},flow:{intent:'environment',canRank:true,updateResearch:true}};
 const evidenceId=researchEvidence(data,req.ids)[0].id;
 const items=['prevention','response','avoid'].flatMap(p=>Array.from({length:3},(_,n)=>{const x=item(p,n);delete x.quote;delete x.field;return {...x,evidenceId};}));
 const rubric=Object.fromEntries(Object.keys(SCENARIO_CRITERIA).map(k=>[k,.5]));
 const reply={stage:'rank',summary:'Controlled synthetic reply.',questions:[],unknowns:[],conditionSuggestions:[],evidenceGaps:[],nextStep:'Review the source scope.',emergency:false,assessments:[{sourceId:'PSI-1',evidenceId,reason:'A controlled arrangement can inform the review.',limitation:'Not an operational safety prediction.',rubric,rubricReasons:Object.fromEntries(Object.keys(rubric).map(k=>[k,'The controlled specimen passage provides only limited context for '+k]))}],recommendations:{action:'replace',items}};
 let calls=0;
 const analyzer=createAnalyzer({corpus:data,key:'TEST_ONLY',fetchImpl:async()=>{calls++;return Response.json({...providerResponse(reply),id:'SYNTHETIC_ONLY',model:'TEST_ONLY'});}});
 const first=await analyzer.analyze(req),cached=await analyzer.analyze(req);
 assert.equal(first.analysis.recommendationsReviewed,true);assert.equal(first.analysis.recommendations.items.length,9);
 assert.deepEqual(first.analysis.recommendations.items.map(x=>x.step.phase),items.map(x=>x.step.phase));
 assert.equal(first.analysis.recommendations.items[0].quote,quote);assert.equal(cached.cached,true);assert.equal(calls,1);
 const state=reduceRecommendations({items:[],stale:false},first.analysis);
 assert.equal(displayedSafetyCount(state),9);assert.match(recommendationHtml(state),/Critical things to avoid/);
});
