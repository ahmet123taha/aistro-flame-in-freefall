import {providerResponse} from './provider-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {attachSourceFragments} from '../lib/research-source-context.mjs';
import {validateSourceBriefs,BRIEFING_GUIDANCE} from '../lib/source-briefing.mjs';
import {researchEvidence,resolveResearchEvidence} from '../lib/research-evidence.mjs';
import {sourceBriefingHtml,sourceBriefingText} from '../public/source-briefing.mjs';
import {cleanSafetyWorkspace,safetyStepKey,safetyWorkspaceText} from '../public/safety-workspace.mjs';
import {recommendationHtml,reduceRecommendations} from '../public/recommendations-panel.mjs';
import {validateConversations} from '../lib/conversations.mjs';
import {createAnalyzer} from '../lib/gemini.mjs';
import {queryTokens} from '../lib/source-content-terms.mjs';
import {validateResearch} from '../lib/research.mjs';
const quote='TEST ONLY: the measured sample continued burning at the recorded setting. A different atmosphere was not tested; this is not an operational instruction.';
const corpus=attachSourceFragments({hash:'TEST',records:[{id:'PSI-1',title:'Controlled source',content:{objective:'The study aims to examine flame suppression in a controlled specimen configuration.'}}]},{chunks:[{id:'C-abcdef',fileId:'f1',sha256:'a'.repeat(64),sourceIds:['PSI-1'],quote,name:'controlled.pdf',location:{page:7},scope:'literal_extracted_text_not_reviewed_numerical_evidence'}]});
const request={mode:'research',ids:['PSI-1'],scenario:'I want a storage preparation research review.',question:'Explain the findings.',conditions:{},flow:{canRank:true,updateResearch:true}};
const evidenceId=researchEvidence(corpus,request.ids).find(e=>e.provenance).id;
const brief={sourceId:'PSI-1',evidenceId,basis:'reported_result',topic:'suppression',finding:'TEST ONLY: the sample continued burning at the tested setting.',application:'This gives a bounded experimental example for the review.',limitation:'A different atmosphere was not tested.'};
const envelope={stage:'rank',summary:'TEST ONLY concise answer.',questions:[],assessments:[],conditionSuggestions:[],unknowns:[],evidenceGaps:[],nextStep:'Discuss the scope if needed.',emergency:false,recommendations:{action:'keep',items:[]},sourceBriefs:[brief]};
const valid=value=>validateSourceBriefs(resolveResearchEvidence(value,corpus,request),corpus,request);
test('briefings retain original-file page and server-selected literal quotation',()=>{
 const a=valid(envelope);assert.equal(a.sourceBriefs.length,1);assert.equal(a.sourceBriefs[0].quote,quote);assert.equal(a.sourceBriefs[0].evidenceProvenance.page,7);assert.equal(a.sourceBriefs[0].evidenceProvenance.fileId,'f1');
});
test('a bad optional citation is isolated without discarding valid peers, reply or ranking',()=>{
 const a=valid({...envelope,sourceBriefs:[brief,{...brief,evidenceId:'E-forged',quote,field:'fileText'}]});assert.equal(a.sourceBriefs.length,1);assert.equal(a.briefingReview.issues[0].reason,'unverified_passage');assert.equal(a.summary,envelope.summary);
});
test('metadata goals cannot be promoted to reported experimental results',()=>{
 const id=researchEvidence(corpus,request.ids).find(e=>e.field==='objective').id;
 const a=valid({...envelope,sourceBriefs:[{...brief,evidenceId:id}]});assert.equal(a.sourceBriefs.length,0);assert.equal(a.briefingReview.issues[0].reason,'result_requires_original_passage');
 assert.equal(valid({...envelope,sourceBriefs:[{...brief,evidenceId:id,basis:'study_scope'}]}).sourceBriefs[0].basis,'study_scope');
});
test('brief count, types and content bounds cannot break otherwise valid results',()=>{
 for(const raw of [null,{},[{...brief,finding:'x'.repeat(701)}],[{...brief,sourceId:'MAT-1'}]]){const a=valid({...envelope,sourceBriefs:raw});assert.equal(a.sourceBriefs.length,0);assert.ok(a.briefingReview);}
 const a=valid({...envelope,sourceBriefs:Array(8).fill(brief)});assert.equal(a.sourceBriefs.length,1);assert.ok(a.briefingReview.issues.some(x=>x.reason==='too_many_briefs'));
});
test('server-owned review flags and provenance are rebuilt; conversational turns add no new brief',()=>{
 const a=valid({...envelope,briefingReview:{approved:true},sourceBriefs:[{...brief,evidenceProvenance:{page:999}}]});assert.equal(a.briefingReview,undefined);assert.equal(a.sourceBriefs[0].evidenceProvenance.page,7);
 assert.deepEqual(valid({...envelope,stage:'conversation'}).sourceBriefs,[]);
});
test('visible briefings separate results, relevance, limitations and accessible original source',()=>{
 const items=valid(envelope).sourceBriefs,html=sourceBriefingHtml(items);for(const t of ['Reported finding','For your question','Limit:','Original passage','Open report','Tables / graphs','Discuss this source'])assert.ok(html.includes(t),t);
 assert.match(html,/<div class="brief-label"><strong class="brief-ai-label">AI summary<\/strong>/);
 assert.ok(html.indexOf('AI summary')<html.indexOf('PSI-1'));
 assert.match(sourceBriefingText(items),/PSI-1/);assert.match(sourceBriefingText(items),/Source passage:/);
 const malicious=sourceBriefingHtml([{...items[0],finding:'<script>unsafe</script>',sourceTitle:'<img src=x>'}]);assert.doesNotMatch(malicious,/<script>|<img src/);
});
test('incident view hides generated checklist instructions but retains cited experimental background',()=>{
 const state=cleanSafetyWorkspace({manualIncident:true,items:[{sourceId:'PSI-1',title:'FORGED_ACTION',text:'UNVALIDATED_INTERVENTION'}],briefs:valid(envelope).sourceBriefs});
 const html=recommendationHtml(state);assert.doesNotMatch(html,/FORGED_ACTION|UNVALIDATED_INTERVENTION|For your question:/);assert.match(html,/sample continued burning/);assert.match(html,/not an approved incident procedure/);assert.match(html,/Return to planning view/);
 assert.doesNotMatch(safetyWorkspaceText(state),/UNVALIDATED_INTERVENTION/);
});
test('manual incident state cannot be unset by a model reply or failed recommendation update',()=>{
 const state=cleanSafetyWorkspace({manualIncident:true});assert.equal(reduceRecommendations(state,{emergency:false,recommendationsReviewed:true,recommendations:{action:'keep',items:[]}}).manualIncident,true);
 const resolved=resolveResearchEvidence(envelope,corpus,request);assert.equal(validateResearch(resolved,corpus,{...request,incidentMode:true}).emergency,true);
});
test('review marks are source/text-bound and saved per conversation with incident state',()=>{
 const i={sourceId:'PSI-1',title:'Review the scope',text:'Check the tested setting.',quote,limitation:'Controlled example.'},key=safetyStepKey(i);
 const s=cleanSafetyWorkspace({items:[i],reviewed:[key,'forged'],briefs:valid(envelope).sourceBriefs,manualIncident:true});assert.deepEqual(s.reviewed,[key]);assert.notEqual(safetyStepKey({...i,text:'Changed text'}),key);
 const saved=validateConversations({revision:0,activeId:'a',conversations:[{id:'a',title:'A',messages:[],context:{recommendations:s}},{id:'b',title:'B',messages:[],context:{}}]});assert.equal(saved.conversations[0].context.recommendations.manualIncident,true);assert.equal(saved.conversations[1].context.recommendations.manualIncident,false);assert.deepEqual(saved.conversations[1].context.recommendations.briefs,[]);
});
test('Turkish safety questions retrieve English vocabulary without fabricating scientific data',()=>{
 const q=queryTokens({question:'Kumaş yangını, yangın önleme, söndürme ve duman algılama. Oksijen ve akış?',conditions:{}});for(const t of ['fabric','fire','prevention','suppression','smoke','detection','oxygen','airflow'])assert.ok(q.has(t),t);
});
test('single synthetic provider response resolves summaries and manual-incident controls with no second request',async()=>{
 let calls=0,sent;
 const analyzer=createAnalyzer({corpus,key:'TEST_ONLY',fetchImpl:async(_url,options)=>{calls++;sent=JSON.parse(options.body);return Response.json({...providerResponse(envelope,{id:'BRIEF_TEST',model:'TEST_ONLY'})});}});
 const a=await analyzer.analyze({...request,incidentMode:true});assert.equal(a.analysis.sourceBriefs[0].quote,quote);assert.equal(a.analysis.emergency,true);assert.equal(JSON.parse(sent.input[0].content[0].text).incidentMode,true);assert.equal(calls,1);assert.equal(sent.tools,undefined);assert.match(BRIEFING_GUIDANCE,/sourceBriefs/);
 const cached=await analyzer.analyze({...request,incidentMode:true});assert.equal(cached.cached,true);assert.equal(calls,1);
});
