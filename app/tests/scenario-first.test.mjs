import {providerResponse} from './provider-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanConditionRequests,cleanPanelState,receiveConditionRequests} from '../public/condition-requests.mjs';
import {runtimeProfiles} from '../lib/runtime-profile.mjs';
import {newConversationContext} from '../public/conversation-panel.mjs';
import {validateConversations} from '../lib/conversations.mjs';
import {validateResearch} from '../lib/research.mjs';
import {payloadFor,createAnalyzer} from '../lib/gemini.mjs';
import {createApp} from '../server.mjs';
const wanted=[{key:'material',reason:'Material identity helps select relevant papers.'},{key:'pressure',reason:'Known pressure helps compare reported conditions.'}];
test('optional requests never fill values and discard invalid, duplicate, known or unavailable fields',()=>{
 const result=cleanConditionRequests([...wanted,{key:'burnerDiameter',reason:'ignored'},{key:'material',reason:'duplicate'},{key:'airflow',reason:''}],{conditions:{pressure:0}});
 assert.deepEqual(result,[wanted[0]]);assert.deepEqual(cleanConditionRequests(wanted,{unavailableConditions:['material','pressure']}),[]);
 assert.deepEqual(cleanConditionRequests(wanted,{emergency:true}),[]);assert.deepEqual(cleanConditionRequests(wanted,{flow:{updateResearch:false}}),[]);
 assert.deepEqual(cleanConditionRequests('open everything'),[]);assert.deepEqual(cleanConditionRequests([{...wanted[0],value:'invented',mandatory:true}]),[wanted[0]]);
});
test('only newly useful requests auto-expand; a manually collapsed panel stays collapsed',()=>{
 let state=receiveConditionRequests({},wanted);assert.equal(state.expanded,true);
 state=receiveConditionRequests({...state,expanded:false},wanted);assert.equal(state.expanded,false);
 state=receiveConditionRequests(state,[{key:'temperatureK',reason:'Useful optional comparison.'}]);assert.equal(state.expanded,true);
 assert.deepEqual(receiveConditionRequests({...state,expanded:false},wanted,false),{...state,expanded:false});
});
test('skipping unknown fields prevents repeated form requests without blocking other refinements',()=>{
 const state=receiveConditionRequests({unavailable:['material','pressure']},wanted);assert.equal(state.expanded,false);assert.deepEqual(state.requests,[]);
 assert.equal(receiveConditionRequests(state,[{key:'oxygen',reason:'If you know it.'}]).expanded,true);
});
test('panel and unavailable details persist within a chat; new chat does not inherit them',()=>{
 const panel=cleanPanelState({expanded:true,seen:['material'],unavailable:['pressure'],requests:wanted,extra:'discard'});
 const stored=validateConversations({revision:0,activeId:'c',conversations:[{id:'c',title:'Test',messages:[],context:{conditionPanel:panel}}]});
 assert.deepEqual(stored.conversations[0].context.conditionPanel,panel);
 assert.equal(newConversationContext({conditionPanel:panel,conditions:{pressure:0}}).conditionPanel,undefined);
 assert.equal(newConversationContext({conditions:{pressure:0}}).conditions.pressure,0);
});
test('prototype history is isolated from production while retaining the existing credential vault',()=>{
 const proto=runtimeProfiles('vault','0.4.2-prototype.1'),prod=runtimeProfiles('vault','0.4.2');
 assert.notEqual(proto.profile,prod.profile);assert.equal(proto.credentials,prod.credentials);
 assert.equal(runtimeProfiles('vault','0.4.2-prototype.1','temporary').profile,runtimeProfiles('vault','0.4.2-prototype.1','temporary').credentials);
});
const quote='A local material study reports observations under explicitly controlled conditions.';
const corpus={hash:'scenario-prototype-test',records:[{id:'PSI-TEST',title:'Controlled source fixture',content:{approach:quote}}]};
const dimensions=['objective','material','geometry','storage','atmosphere','gravity','flow','mechanism'];
function modelReply(evidenceId,stage='rank',requests=wanted){return {stage,summary:'TEST ONLY: A source can be reviewed before optional measurements are available.',questions:[],assessments:stage==='rank'?[{sourceId:'PSI-TEST',evidenceId,rubric:Object.fromEntries(dimensions.map(k=>[k,.5])),rubricReasons:Object.fromEntries(dimensions.map(k=>[k,'TEST ONLY partial source-context relevance for '+k+'.'])),reason:'TEST ONLY: review this controlled fixture source.',limitation:'Synthetic protocol test, not a scientific finding.'}]:[],conditionRequests:requests,conditionSuggestions:[],unknowns:[],evidenceGaps:[],nextStep:'Review the original source; known measurements are optional.',emergency:false,recommendations:{action:'keep',items:[]}};}
test('malformed optional requests cannot discard a valid conversation or weaken source validation',()=>{
 const answer={...modelReply(null,'clarify'),assessments:[],conditionRequests:{open:true}};
 assert.deepEqual(validateResearch(answer,corpus,{ids:[],scenario:''}).conditionRequests,[]);
 assert.throws(()=>validateResearch({...answer,stage:'rank',assessments:[{sourceId:'MADE-UP'}]},corpus,{ids:['PSI-TEST'],scenario:'Learn about materials'}));
});
test('server prompt carries audience guidance, optional conditions and unknown keys without external tools',()=>{
 const request={mode:'research',ids:['PSI-TEST'],question:'Explain simply',scenario:'I want to learn about fabrics',unavailableConditions:['pressure'],conditions:{},flow:{canRank:true,updateResearch:true}};
 const p=payloadFor(corpus,request),system=p.instructions,data=JSON.parse(p.input[0].content[0].text);
 for(const instruction of ['astronauts','habitat residents','students','zero numerical conditions','conditionRequests','Do not keep reopening a questionnaire','ACTIVE FIRE','No web'])assert.ok(system.includes(instruction),instruction);
 assert.deepEqual(data.unavailableConditions,['pressure']);assert.equal(p.tools,undefined);
});
const audiences=[
 'I store fabrics in a habitat and want prevention literature.',
 'I am a student. Why do flames behave differently in space?',
 'I am an engineer reviewing material selection. I have no sensor readings.',
 'I am an astronaut preparing a literature briefing about fire detection.',
 'I live in a fictional Mars colony and want to learn about material storage.',
 'Uzayda kumaş depolamak hakkında bilgi almak istiyorum. Ölçümlerim yok.',
 'Je voudrais comprendre la combustion en microgravité sans mesures.',
 'Quiero leer estudios sobre incendios en hábitats, sin sensores.',
 'Ich suche Forschung zur Brandausbreitung und kenne den Druck nicht.',
 'I am a teacher looking for introductory research, not an experiment.',
 'I am a technician. Which reports discuss smoke detection?',
 'I am comparing PMMA and fabric studies for design review.',
 'I only know the material is cotton. Help me find useful papers.',
 'I do not know these optional details. Continue with the research.',
 'This is hypothetical. Which work discusses prevention around stored plastics?',
 'Can I read suppression experiments without specifying flame radius?',
 'I want to understand oxygen-related research, not receive a safety verdict.',
 'My sensors are unavailable. I am reviewing evidence after an incident.',
 'The topic is rocket ignition; explain if this library cannot answer it.',
 'I have just changed my question to material fire detection.'
];
test('twenty broad information needs retain zero numeric inputs while explicit chat material avoids a redundant question',async()=>{
 let count=0;const requests=[];
 const analyzer=createAnalyzer({corpus,key:'TEST_ONLY',fetchImpl:async(_u,options)=>{
  count++;const data=JSON.parse(JSON.parse(options.body).input[0].content[0].text);requests.push(data);
  const evidence=data.evidence.find(e=>e.sourceId==='PSI-TEST');assert.ok(evidence);assert.equal(data.flow.canRank,true);
  return Response.json({...providerResponse(modelReply(evidence.id)),id:'OFFLINE_'+count,model:'TEST_ONLY'});
 }});
 const app=createApp({corpus,analyzer,sessionToken:'prototype-test'});await new Promise(r=>app.listen(0,'127.0.0.1',r));
 try{for(const question of audiences){const response=await fetch('http://127.0.0.1:'+app.address().port+'/api/research',{method:'POST',headers:{'Content-Type':'application/json','X-Flame-Session':'prototype-test'},body:JSON.stringify({scenario:'',question,conditions:{},unavailableConditions:['pressure','made_up']})});const result=await response.json();assert.equal(response.status,200,JSON.stringify(result));assert.equal(result.ranking.matches.length,1);assert.equal(result.ranking.matches[0].numericBudget,0);assert.equal(result.ranking.matches[0].maxPoints,40);// Cotton is explicitly supplied in that latest user turn; topic mentions and generic material-selection language are not input measurements.
 const explicitCotton=question==='I only know the material is cotton. Help me find useful papers.';
 assert.deepEqual(result.analysis.conditionRequests,explicitCotton?[]:[wanted[0]],question);
 assert.equal(result.request.conditions.material,explicitCotton?'cotton':'',question);}
 assert.equal(count,20);assert.ok(requests.every(r=>r.unavailableConditions.length===1));
 }finally{await new Promise(r=>app.close(r));}
});
