import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRecommendations,recommendationContext} from '../lib/recommendations.mjs';
import {validateResearch} from '../lib/research.mjs';
import {reduceRecommendations,recommendationHtml} from '../public/recommendations-panel.mjs';
import {assessmentReviewHtml} from '../public/conversation-panel.mjs';
import {SCENARIO_CRITERIA} from '../lib/research-scoring.mjs';
import {researchEvidence,resolveResearchEvidence} from '../lib/research-evidence.mjs';
const quote='The local test compared material ignition and flame spread in controlled experiments. These findings describe the tested specimens and conditions.';
const corpus={records:[1,2].map(i=>({id:'PSI-'+i,content:{approach:quote}}))};
const request={ids:['PSI-1','PSI-2'],scenario:'Compare ignition research for fiberglass storage.',flow:{updateResearch:true,canRank:true}};
const item=(sourceId='PSI-2')=>({sourceId,title:'Compare the tested arrangement',text:'Review the specimen shape and test arrangement before using the reported ignition comparison.',relevance:'The storage arrangement may differ from the tested specimens.',priority:'medium',field:'approach',quote,limitation:'The source does not validate the current storage conditions.'});
const a=sourceId=>({sourceId,field:'approach',quote,reason:'Review the source comparison.',limitation:'These tests do not establish storage safety.',rubric:Object.fromEntries(Object.keys(SCENARIO_CRITERIA).map(k=>[k,.75])),rubricReasons:Object.fromEntries(Object.keys(SCENARIO_CRITERIA).map(k=>[k,'The supplied passage provides partial evidence for '+k]))});
const response=recommendations=>({stage:'rank',summary:'Review the cited source.',questions:[],assessments:[a('PSI-1'),a('PSI-2')],conditionSuggestions:[],unknowns:[],evidenceGaps:[],recommendations,nextStep:'Compare the reported arrangement.',emergency:false});
const partial=recommendations=>{const r=response(recommendations);delete r.assessments[0].rubricReasons.gravity;return r;};
const old={items:[item('PSI-1')],stale:true,emergency:true};

test('a malformed peer rubric does not block a fully traceable replacement',()=>{
 const result=validateResearch(partial({action:'replace',items:[item()]}),corpus,request);
 assert.equal(result.assessments.length,1);assert.equal(result.unscoredAssessments.length,1);
 assert.equal(result.recommendationsReviewed,true);assert.equal(result.recommendations.items[0].relevance,item().relevance);
 assert.equal(reduceRecommendations(old,result).items[0].sourceId,'PSI-2');
});
test('a partial rubric cannot mark an unchanged old set reviewed or clear it',()=>{
 for(const action of ['keep','clear']){
  const result=validateResearch(partial({action,items:[]}),corpus,request);
  assert.equal(result.recommendationsReviewed,false);assert.deepEqual(reduceRecommendations(old,result),old);
 }
});
test('recommendations use their evidence independently of rubric formatting',()=>{
 const r=partial({action:'replace',items:[item('PSI-1')]});
 const result=validateResearch(r,corpus,request);assert.equal(result.recommendationsReviewed,true);
 assert.equal(result.recommendations.items[0].sourceId,'PSI-1');
});
test('a forged evidence ID or invalid peer preserves the complete prior set',()=>{
 const input=partial({action:'replace',items:[item(),{...item('PSI-1'),evidenceId:'E-forged'}]});
 const result=validateResearch(resolveResearchEvidence(input,corpus,request),corpus,request);
 assert.equal(result.recommendationsReviewed,false);assert.deepEqual(reduceRecommendations(old,result),old);
});
test('a real supplied evidence ID is resolved before candidate validation',()=>{
 const evidence=researchEvidence(corpus,request.ids).find(e=>e.sourceId==='PSI-2');
 const raw={...item(),field:undefined,quote:undefined,evidenceId:evidence.id};
 const result=validateResearch(resolveResearchEvidence(partial({action:'replace',items:[raw]}),corpus,request),corpus,request);
 assert.equal(result.recommendations.items[0].quote,quote);
});
test('third-party applicability context cannot become a recommendation citation',()=>{
 const source={id:'MAT-1',content:{approach:quote}};
 const result=validateRecommendations({recommendations:{action:'replace',items:[item('MAT-1')]}},{records:[source]},{ids:['MAT-1']});
 assert.equal(result.recommendationsReviewed,false);assert.equal(result.recommendationReview.issues[0].code,'unverified_item');
});
test('an absent server validation flag cannot clear or revalidate saved candidates',()=>{
 for(const action of ['keep','clear','replace'])assert.deepEqual(reduceRecommendations(old,{recommendations:{action,items:action==='replace'?[item()]:[]},emergency:false}),old);
});
test('a positively reviewed keep, clear and replacement each retain explicit semantics',()=>{
 for(const action of ['keep','clear','replace']){
  const result=validateResearch(response({action,items:action==='replace'?[item()]:[]}),corpus,request),next=reduceRecommendations(old,result);
  assert.equal(next.stale,false);assert.equal(next.emergency,false);
  assert.equal(next.items.length,action==='clear'?0:1);
 }
});
test('conversation cannot update recommendations and active-incident notice remains sticky',()=>{
 const r={...response({action:'replace',items:[item()]}),stage:'conversation',assessments:[]};
 assert.deepEqual(reduceRecommendations(old,validateResearch(r,corpus,request)),old);
 assert.equal(reduceRecommendations({items:[],stale:false},{emergency:true,recommendationsReviewed:false}).emergency,true);
});
test('context preserves relevance and limitations but never pretends prior prose is new evidence',()=>{
 const brief=recommendationContext([item()]);assert.equal(brief[0].limitation,item().limitation);assert.equal(brief[0].relevance,item().relevance);assert.equal(brief[0].quote,undefined);
});
test('legacy cards remain readable and new relevance is optional for old saved data',()=>{
 const legacy=item();delete legacy.relevance;
 const result=validateRecommendations({recommendations:{action:'replace',items:[legacy]}},corpus,request);
 assert.equal(result.recommendationsReviewed,true);assert.doesNotMatch(recommendationHtml({items:[legacy]}),/undefined|Why it matters/);
});
test('actions precede numbered source details, with full limits and escaped model HTML',()=>{
 const html=recommendationHtml({items:[{...item(),relevance:'<script>unsafe</script>'}],stale:true,emergency:false});
 const sources=html.indexOf('id="safety-sources-title"');assert.ok(sources>html.indexOf('class="step-action"'));
 assert.ok(html.indexOf('Limit:')>sources);assert.ok(html.indexOf('data-open="PSI-2"')>sources);
 assert.match(html,/Sources and limits for step 1/);assert.match(html,/id="safety-source-step-[a-f0-9]+"/);
 assert.match(html,/current situation/);assert.doesNotMatch(html,/<script>/);
 assert.match(html,/&lt;script&gt;/);assert.match(html,/does not measure fire severity/);
});
test('invalid relevance is contained atomically',()=>{
 const result=validateRecommendations({recommendations:{action:'replace',items:[{...item(),relevance:'x'.repeat(601)}]}},corpus,request);
 assert.equal(result.recommendationsReviewed,false);
});
test('metadata goals and prospective impacts show their source role without calling them results',()=>{
 for(const [field,label] of [['objective','Study objective'],['hypothesis','Study hypothesis'],['researchImpacts','Prospective impact']]){
  const source={id:'PSI-1',content:{[field]:quote}},result=validateRecommendations({recommendations:{action:'replace',items:[{...item('PSI-1'),field}]}},{records:[source]},request);
  assert.equal(result.recommendations.items[0].evidenceType,'inference');
  const html=recommendationHtml({items:result.recommendations.items});assert.ok(html.includes('Source basis: '+label));assert.doesNotMatch(html,/observed result|demonstrated effectiveness/i);
 }
});
test('partial-score notice describes an independent applied replacement without approving science',()=>{
 const result=validateResearch(partial({action:'replace',items:[item()]}),corpus,request),html=assessmentReviewHtml(result);
 assert.match(html,/updated separately/);assert.doesNotMatch(html,/unchanged pending|scientifically valid|approved/i);
 const bad=validateResearch(partial({action:'clear',items:[]}),corpus,request);assert.match(assessmentReviewHtml(bad),/remain pending review/);
 assert.equal(assessmentReviewHtml({}), '');
});
test('literal document excerpts retain source anchors and reject a fabricated passage',()=>{
 const passage='[Source file f12 | SHA256 '+ 'a'.repeat(64)+' | PDF page 8 | section Results]\nThe measured specimen ignition delay varied across the reported oxygen conditions.';
 const documents={records:[{id:'PSI-1',content:{fileText:passage}}]},docRequest={...request,ids:['PSI-1']};
 const evidence=researchEvidence(documents,docRequest.ids)[0];
 const proposed={recommendations:{action:'replace',items:[{...item('PSI-1'),quote:undefined,field:undefined,evidenceId:evidence.id}]}};
 const resolved=resolveResearchEvidence(proposed,documents,docRequest),result=validateRecommendations(resolved,documents,docRequest);
 assert.equal(result.recommendationsReviewed,true);assert.equal(result.recommendations.items[0].field,'fileText');assert.equal(result.recommendations.items[0].quote,passage);
 const html=recommendationHtml({items:result.recommendations.items});assert.match(html,/PDF page 8/);assert.match(html,/Local document excerpt/);
 const fabricated={recommendations:{action:'replace',items:[{...item('PSI-1'),field:'fileText',quote:passage+' A safe oxygen limit was established.'}]}};
 assert.equal(validateRecommendations(fabricated,documents,docRequest).recommendationsReviewed,false);
});
