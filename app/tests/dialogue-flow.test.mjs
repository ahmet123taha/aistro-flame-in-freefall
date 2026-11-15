import {providerResponse} from './provider-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {ENVIRONMENT_QUESTION,classifyMessage,cleanScenario,planDialogueTurn,ensureTurnCapacity,appliesToCurrentTurn} from '../public/dialogue-flow.mjs';
import {newConversationContext,modelHistory} from '../public/conversation-panel.mjs';
import {reduceRecommendations} from '../public/recommendations-panel.mjs';
import {validateConversations} from '../lib/conversations.mjs';
import {createAnalyzer,payloadFor} from '../lib/gemini.mjs';
import {createApp} from '../server.mjs';
import {validateResearch} from '../lib/research.mjs';
import {normalizeResearchShape} from '../lib/research-schema.mjs';

const quote='This local experiment investigates flame spread over solid sheets and reports the experimental conditions.';
const corpus={hash:'flow-test',records:[1,2].map(i=>({id:'PSI-'+i,content:{approach:quote},tableReferences:[]}))};
const answer=(stage='conversation')=>({stage,summary:'Please describe the situation you would like to investigate.',questions:[],assessments:[],conditionSuggestions:[],unknowns:[],evidenceGaps:[],recommendations:{action:'keep',items:[]},nextStep:'',emergency:false});
const raw=value=>({...providerResponse(value),id:'TEST_RESPONSE',model:'TEST_MODEL',usage:{input_tokens:123,output_tokens:25,total_tokens:148}});
const request=question=>{const flow=planDialogueTurn({question});return {mode:'research',question,scenario:flow.scenario,flow,replyLanguage:flow.replyLanguage,ids:flow.canRank?['PSI-1','PSI-2']:[],conditions:{}};};

test('reported Turkish language command is not a research scenario',()=>{
 const flow=planDialogueTurn({scenario:'türkçe ya',question:'türkçe ya'});
 assert.equal(flow.scenario,'');assert.equal(flow.intent,'presentation');assert.equal(flow.replyLanguage,'tr');assert.equal(flow.canRank,false);assert.equal(flow.requiredStage,'conversation');
});
test('unambiguous language, style and greeting commands never start ranking',()=>{
 for(const q of ['Türkçe ya','Lütfen Türkçe konuş','Bana Türkçe yanıt ver','Türkçe cevap verebilir misin?','Can you answer in Turkish?','English please','Daha kısa','Hello','Teşekkürler'])assert.equal(planDialogueTurn({question:q}).updateResearch,false,q);
});
test('mixed scientific text and yes/no answers are not discarded by a broad keyword router',()=>{
 for(const q of ['Türkçe anlat: depomda yangın var','English oak panels in storage','No','yes','Hayır','I do not know the pressure'])assert.equal(classifyMessage(q).intent,'research',q);
});
test('legacy scenario cleanup removes control lines without deleting scientific context or transcript',()=>{
 const legacy='türkçe ya\nI store PMMA sheets.\nThanks\nEnvironment submitted';const copy=legacy;
 assert.equal(cleanScenario(legacy),'I store PMMA sheets.');assert.equal(legacy,copy);
 const flow=planDialogueTurn({scenario:legacy,question:'shorter'});assert.equal(flow.scenario,'I store PMMA sheets.');assert.equal(flow.canRank,false);
});
test('environment-only submit asks a scenario question and language preference survives next research turn',()=>{
 assert.equal(planDialogueTurn({question:ENVIRONMENT_QUESTION}).requiredStage,'clarify');
 const flow=planDialogueTurn({scenario:'I store PMMA.',question:'Spacing is unknown.',replyLanguage:'tr'});assert.equal(flow.requiredStage,null);assert.equal(flow.replyLanguage,'tr');assert.equal(flow.scenario,'I store PMMA.\nSpacing is unknown.');
 assert.equal(planDialogueTurn({scenario:flow.scenario,question:'Spacing is unknown.'}).scenario,flow.scenario);
});
test('oversized context is rejected before a user message or API call is needed',()=>{
 assert.throws(()=>planDialogueTurn({scenario:'x'.repeat(7999),question:'science'}),e=>e.code==='SCENARIO_LIMIT');
});
test('a full conversation reserves room for both request and response, including error response',()=>{
 assert.doesNotThrow(()=>ensureTurnCapacity(Array(498)));
 for(const n of [499,500])assert.throws(()=>ensureTurnCapacity(Array(n)),/full/);
});
test('responses for changed input revisions or source focus cannot update current research',()=>{
 assert.equal(appliesToCurrentTurn('1:4','1:4','PSI-1','PSI-1'),true);
 assert.equal(appliesToCurrentTurn('1:4','2:4','PSI-1','PSI-1'),false);
 assert.equal(appliesToCurrentTurn('1:4','1:6','PSI-1','PSI-1'),false);
 assert.equal(appliesToCurrentTurn('1:4','1:4','PSI-1','PSI-2'),false);
});
test('control replies cannot clear stale advice, rewrite candidates or erase an active-incident flag',()=>{
 const old={items:[{title:'Preserved'}],stale:true,emergency:true};
 const r=reduceRecommendations(old,{recommendationsReviewed:false,recommendations:{action:'clear',items:[]},emergency:false});assert.deepEqual(r,old);
 assert.equal(reduceRecommendations(old,{recommendationsReviewed:true,recommendations:{action:'keep',items:[]},emergency:false}).stale,false);
});
test('language preference and stale-answer notice persist, but new chat does not inherit them',()=>{
 const state=validateConversations({revision:0,activeId:'a',conversations:[{id:'a',title:'Test',messages:[{id:'u',role:'assistant',text:'Hello',response:{analysis:answer(),displayNotice:'Inputs changed'}}],context:{replyLanguage:'tr'}}]});
 assert.equal(state.conversations[0].context.replyLanguage,'tr');assert.equal(state.conversations[0].messages[0].response.displayNotice,'Inputs changed');
 assert.ok(!newConversationContext(state.conversations[0].context).replyLanguage);
});
test('generated environment submission label is not offered as user scientific evidence',()=>{
 const history=modelHistory([{role:'user',text:'Environment submitted'},{role:'user',text:'I store sheets.'},{role:'application',text:'Failed'}]);assert.deepEqual(history,[{role:'user',text:'I store sheets.'}]);
});
test('JSON mode carries the authoritative route without a provider-side grammar',()=>{
 const q=request('türkçe ya');
 const p=payloadFor(corpus,q),data=JSON.parse(p.input[0].content[0].text);assert.deepEqual(data.sources,[]);assert.deepEqual(data.evidence,[]);assert.equal(data.replyLanguage,'tr');assert.equal(data.flow.requiredStage,'conversation');assert.equal(p.text.format.type,'json_object');assert.equal(p.text.format.schema,undefined);assert.equal(p.tools,undefined);
});

test('conversation and scenario clarification skip source retrieval; research still enriches all allowed sources',async()=>{
 const lookedUp=[],payloads=[];
 const analyzer=createAnalyzer({corpus,key:'TEST_ONLY',contextProvider:async r=>{
  assert.ok(r.ids.length>0,'An empty source set must not scan the document index');
  lookedUp.push([...r.ids]);return corpus;
 },fetchImpl:async(_url,options)=>{
  const payload=JSON.parse(JSON.parse(options.body).input[0].content[0].text);payloads.push(payload);
  const reply=answer(payload.flow.requiredStage||'rank');if(reply.stage==='rank')reply.nextStep='Review the source.';
  return Response.json(raw(reply));
 }});
 for(const question of ['Hello','English please',ENVIRONMENT_QUESTION]){
  const result=await analyzer.analyze(request(question));
  assert.equal(result.provider.validation,'passed');assert.deepEqual(payloads.at(-1).sources,[]);assert.deepEqual(payloads.at(-1).evidence,[]);
 }
 assert.equal(lookedUp.length,0);
 await analyzer.analyze(request('I store PMMA sheets.'));
 assert.deepEqual(lookedUp,[['PSI-1','PSI-2']]);assert.equal(payloads.at(-1).sources.length,2);
});
test('harmless omitted empty collections recover a conversational reply, not a ranking',()=>{
 const q=request('Hi');const normalized=normalizeResearchShape({stage:'clarify',summary:'Hello',emergency:false},q);
 assert.equal(validateResearch(normalized,corpus,q).stage,'conversation');assert.deepEqual(normalized.assessments,[]);
 const missingRank=normalizeResearchShape({stage:'rank',summary:'Test',questions:[],unknowns:[],nextStep:'Review',emergency:false},request('Storage fire.'));
 assert.throws(()=>validateResearch(missingRank,corpus,request('Storage fire.')),e=>e.code==='RESEARCH_ASSESSMENTS_TYPE');
});
test('validation distinguishes absent list, excessive list, missing scenario and wrong mode',()=>{
 const q=request('Storage fire.'),valid={...answer('rank'),nextStep:'Review'};
 const cases=[{value:{...valid,assessments:null},q,code:'RESEARCH_ASSESSMENTS_TYPE'},{value:{...valid,assessments:Array(13).fill({})},q,code:'RESEARCH_ASSESSMENTS_LIMIT'},{value:valid,q:{...q,scenario:''},code:'RESEARCH_SCENARIO_MISSING'},{value:{...answer('clarify'),assessments:[{}]},q,code:'RESEARCH_STAGE_CONFLICT'},{value:valid,q:{...q,flow:{...q.flow,requiredStage:'conversation'}},code:'RESEARCH_ROUTE_CONFLICT'}];
 for(const c of cases)assert.throws(()=>validateResearch(c.value,corpus,c.q),e=>e.code===c.code,c.code);
 assert.throws(()=>validateResearch({...valid,assessments:[null]},corpus,q),e=>e.code==='RESEARCH_QUOTE_INVALID');
});
test('invalid source evidence remains rejected; errors contain safe shape and hash, not raw model prose',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'flame-flow-'));const value={...answer('rank'),summary:'PRIVATE_RAW_MARKER',nextStep:'Review',assessments:[{sourceId:'PSI-1',evidenceId:'invented'}]};
 const a=createAnalyzer({corpus,key:'TEST_ONLY_SECRET',runtimeDir:dir,fetchImpl:async()=>Response.json(raw(value))});
 await assert.rejects(a.analyze(request('Storage fire.')),e=>{assert.equal(e.code,'RESEARCH_EVIDENCE_INVALID');assert.equal(e.validation.shape.assessmentCount,1);assert.equal(e.validation.responseSha256.length,64);return true;});
 const saved=await readFile(path.join(dir,'last-call.json'),'utf8');assert.ok(!saved.includes('PRIVATE_RAW_MARKER'));assert.ok(!saved.includes('TEST_ONLY_SECRET'));assert.equal(JSON.parse(saved).error.code,'RESEARCH_EVIDENCE_INVALID');assert.equal(a.status().busy,false);
});
test('nonessential receipt/cache write failure cannot turn a valid model reply into a validation rejection',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'flame-flow-'));const file=path.join(dir,'not-directory');await writeFile(file,'keep');
 const a=createAnalyzer({corpus,key:'TEST_ONLY',runtimeDir:file,fetchImpl:async()=>Response.json(raw(answer()))});
 const r=await a.analyze(request('Hi'));assert.equal(r.provider.validation,'passed');assert.ok(r.storageWarning);assert.ok(a.status().persistenceWarnings>0);assert.equal(await readFile(file,'utf8'),'keep');assert.equal(a.status().busy,false);
});
test('HTTP sequence: initial environment, Turkish correction, scenario, focus, failure, manual recovery',async()=>{
 const calls=[];const a=createAnalyzer({corpus,key:'TEST_ONLY',fetchImpl:async(u,o)=>{
  const p=JSON.parse(o.body),d=JSON.parse(p.input[0].content[0].text);calls.push({p,d});
  const v=answer(d.flow.requiredStage||'rank');if(v.stage==='rank')v.nextStep='Inspect the local reports.';
  if(d.question==='bad list')v.assessments={};
  return Response.json(raw(v));
 }});
 const app=createApp({corpus,analyzer:a,sessionToken:'test'});await new Promise(r=>app.listen(0,'127.0.0.1',r));
 const send=body=>fetch('http://127.0.0.1:'+app.address().port+'/api/research',{method:'POST',headers:{'Content-Type':'application/json','X-Flame-Session':'test'},body:JSON.stringify({scenario:'',...body})});
 try{
  assert.equal((await fetch('http://127.0.0.1:'+app.address().port+'/api/research',{method:'POST',headers:{'Content-Type':'application/json','X-Flame-Session':'test'},body:'null'})).status,400);assert.equal(calls.length,0);
  assert.equal((await send({question:ENVIRONMENT_QUESTION,conditions:{gravityMs2:8,temperatureK:300,oxygen:30,airflow:0}})).status,200);assert.equal(calls.at(-1).d.flow.requiredStage,'clarify');
  let r=await send({question:'türkçe ya',scenario:'türkçe ya'});assert.equal(r.status,200);assert.equal((await r.json()).analysis.stage,'conversation');assert.equal(calls.at(-1).d.sources.length,0);assert.equal(calls.at(-1).d.scenario,'');
  r=await send({question:'I store SIBAL sheets.',replyLanguage:'tr'});assert.equal(r.status,200);assert.equal(calls.at(-1).d.sources.length,2);assert.equal(calls.at(-1).d.replyLanguage,'tr');
  r=await send({scenario:'I store sheets.',question:'Explain the selected report.',focusSourceId:'PSI-2',conditions:{oxygen:25}});assert.equal(r.status,200);assert.deepEqual(calls.at(-1).d.sources.map(x=>x.id),['PSI-2']);assert.equal(calls.at(-1).d.conditions.oxygen,25);
  const before=calls.length;r=await send({question:'Read this.',focusSourceId:'PSI-99'});assert.equal(r.status,400);assert.equal(calls.length,before);
  r=await send({question:'bad list'});assert.equal(r.status,502);const failure=await r.json();assert.equal(failure.code,'RESEARCH_ASSESSMENTS_TYPE');assert.equal(failure.validation.shape.assessmentsType,'object');assert.equal(a.status().busy,false);
  r=await send({question:'hello'});assert.equal(r.status,200);assert.equal(calls.length,before+2);assert.equal(a.status().busy,false);
 }finally{await new Promise(r=>app.close(r));}
});

test('research prompt contains only current optional environment units, not unrelated burner controls',()=>{
 const q={...request('Review storage.'),conditions:{material:'pmma',gravityMs2:8,pressure:null,airflow:0,fuelPercent:80,gasConfiguration:'inverse'}};
 const sent=JSON.parse(payloadFor(corpus,q).input[0].content[0].text);assert.equal(sent.conditions.airflow,0);assert.equal(sent.conditions.pressure,null);assert.equal(sent.conditions.gasConfiguration,undefined);assert.equal(sent.conditions.units.fuelPercent,undefined);
});
test('truncated output and request-format rejection are explicit and do not automatically retry',async()=>{
 for(const [response,code] of [[{status:200,body:{object:'response',status:'incomplete',incomplete_details:{reason:'max_output_tokens'},output:[]}},'MODEL_INCOMPLETE'],[{status:400,body:{error:{message:'invalid response schema'}}},'OPENAI_400']]){
  let calls=0;const a=createAnalyzer({corpus,key:'TEST_ONLY',fetchImpl:async()=>{calls++;return Response.json(response.body,{status:response.status});}});
  await assert.rejects(a.analyze(request('Hello')),e=>{assert.equal(e.code,code);if(code==='OPENAI_400')assert.match(e.message,/request format/);return true;});assert.equal(calls,1);assert.equal(a.status().busy,false);
 }
});
