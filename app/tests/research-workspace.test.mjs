import test from 'node:test';
import assert from 'node:assert/strict';
import {researchRanking,validateResearch,RESEARCH_SYSTEM} from '../lib/research.mjs';
import {researchCards} from '../public/environment-panel.mjs';
import {SCENARIO_CRITERIA} from '../lib/research-scoring.mjs';
import {validateRecommendations} from '../lib/recommendations.mjs';
import {resolveResearchEvidence,researchEvidence} from '../lib/research-evidence.mjs';
import {reduceRecommendations} from '../public/recommendations-panel.mjs';
import {parseDelimited} from '../public/table-preview.mjs';
import {libraryList} from '../lib/file-library.mjs';
import {validateConversations} from '../lib/conversations.mjs';
const quote='The source describes material samples under controlled experimental conditions.';
const corpus={records:[{id:'PSI-1',content:{approach:quote}}],experiments:{rows:[{sourceId:'PSI-1',runId:'r1',values:{material:'pmma',gravityMs2:4,temperatureK:300},provenance:{fileId:'f1'}}]}};
const request={ids:['PSI-1'],scenario:'I store PMMA.',conditions:{material:'pmma',gravityMs2:3.9,temperatureK:300,pressure:null}};
const rubric=Object.fromEntries(Object.keys(SCENARIO_CRITERIA).map(k=>[k,.8125]));
const a={sourceId:'PSI-1',rubric,rubricReasons:Object.fromEntries(Object.keys(rubric).map(k=>[k,'TEST: partial relevance in '+k])),reason:'Relevant source for review.',field:'approach',quote,limitation:'This is not a prediction.'};
const analysis={stage:'rank',summary:'TEST ONLY',assessments:[a],questions:[],unknowns:[],conditionSuggestions:[],nextStep:'Review evidence.',emergency:false};
test('blank pressure is excluded and all 60 points are shared only by entered values',()=>{
 const m=researchRanking(corpus,request,analysis).matches[0];assert.equal(m.numericPoints,59.25);assert.equal(m.scenarioPoints,32.5);assert.equal(m.total,91.75);assert.equal(m.coverage.provided,2);assert.ok(m.coverage.excluded.includes('pressure'));assert.equal(m.unscoredPoints,0);
 const html=researchCards({matches:[m]},corpus.records);assert.match(html,/91.8/);assert.match(html,/Conditions: 59.3 \/ 60/);assert.match(html,/32.5 \/ 40/);assert.doesNotMatch(html,/Incomplete numeric evidence|Conditions: unknown/);
});
test('zero is a supplied measurement, absent source values are not manufactured',()=>{
 const m=researchRanking(corpus,{...request,conditions:{material:'pmma',airflow:0}},analysis).matches[0];assert.equal(m.coverage.provided,1);assert.equal(m.numericPoints,0);assert.equal(m.unscoredPoints,60);assert.deepEqual(m.coverage.unavailable,['airflow']);
});
test('continuous eight-dimension rubric needs all source-specific reasons and valid ranges',()=>{
 assert.equal(validateResearch(analysis,corpus,request).assessments.length,1);
 for(const bad of [{...a,rubric:{...rubric,gravity:1.1}},{...a,rubric:{...rubric,extra:1}}])assert.throws(()=>validateResearch({...analysis,assessments:[bad]},corpus,request));
 const incomplete=validateResearch({...analysis,assessments:[{...a,rubricReasons:{}}]},corpus,request);assert.equal(incomplete.assessments.length,0);assert.equal(incomplete.unscoredAssessments.length,1);
 assert.match(RESEARCH_SYSTEM,/Do not start every answer/);assert.match(RESEARCH_SYSTEM,/stacking, spacing, container, orientation/);
});
const item={title:'Review the source geometry',text:'Compare the relevant experimental geometry before drawing conclusions.',priority:'high',sourceId:'PSI-1',field:'approach',quote,limitation:'Source-specific research candidate.'};
test('recommendations resolve exact evidence IDs and retain previous candidates on unverified updates',()=>{
 const id=researchEvidence(corpus,request.ids)[0].id;
 const resolved=resolveResearchEvidence({recommendations:{action:'replace',items:[{...item,quote:undefined,field:undefined,evidenceId:id}]}},corpus,request);
 const accepted=validateRecommendations(resolved,corpus,request);assert.equal(accepted.recommendations.items[0].quote,quote);
 const previous={items:[item],stale:true};assert.equal(reduceRecommendations(previous,accepted).items.length,1);
 const rejected=validateRecommendations({recommendations:{action:'replace',items:[{...item,quote:'Not in source; never invent this evidence.'}]}},corpus,request);assert.equal(rejected.recommendations.action,'keep');assert.deepEqual(reduceRecommendations(previous,rejected).items,[item]);assert.equal(reduceRecommendations(previous,rejected).stale,true);
 assert.equal(reduceRecommendations(previous,{recommendationsReviewed:true,recommendations:{action:'keep',items:[]}}).stale,false);
 assert.deepEqual(reduceRecommendations(previous,{recommendationsReviewed:true,recommendations:{action:'clear',items:[]}}).items,[]);
 const conflict=validateRecommendations({recommendations:{action:'keep',items:[item]}},corpus,request);assert.equal(conflict.recommendationsReviewed,false);assert.equal(conflict.recommendationReview.issues[0].code,'action_items_conflict');
});
test('recommendations survive the conversation persistence boundary',()=>{
 const value={revision:0,activeId:'one',conversations:[{id:'one',title:'Test',messages:[],context:{recommendations:{items:[item],stale:true}}}]};
 assert.deepEqual(validateConversations(value).conversations[0].context.recommendations,{items:[item],stale:true,emergency:false,manualIncident:false,briefs:[],reviewed:[],updatedAt:''});
});
test('local CSV preview handles quoted delimiters, newlines, escaped quotes and bounded rows',()=>{
 assert.deepEqual(parseDelimited('name,value\r\n"A,B","two\nlines"\r\nC,"a""b"\r\n').rows,[['name','value'],['A,B','two\nlines'],['C','a"b']]);
 assert.equal(parseDelimited('a\nb\nc\n',',',2).truncated,true);assert.deepEqual(parseDelimited('a\tb\n1\t0','\t').rows,[['a','b'],['1','0']]);
 assert.deepEqual(parseDelimited('sample,value\n1/4" clear rod,0\nnext,2').rows,[['sample','value'],['1/4" clear rod','0'],['next','2']]);
});
test('file library filters source/type, prioritizes report/table and never discloses local paths',()=>{
 const files=[{id:'f1',name:'shared.pdf',path:'secret',accessions:['PSI-1']},{id:'f2',name:'PSI-1_Summary Report.pdf',path:'secret',accessions:['PSI-1']},{id:'f3',name:'PSI-2_Experimental table.csv',path:'secret',accessions:['PSI-2']},{id:'f4',name:'PSI-1_Experimental table.csv',path:'secret',accessions:['PSI-1']}];
 const reports=libraryList(files,{accession:'PSI-1',kind:'report'});assert.deepEqual(reports.items.map(f=>f.id),['f2','f1']);assert.equal(reports.items[0].path,undefined);assert.equal(libraryList(files,{accession:'PSI-1',kind:'table'}).items[0].id,'f4');assert.equal(libraryList(files,{accession:'PSI-1',q:'missing'}).total,0);
});
