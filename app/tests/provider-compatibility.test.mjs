import {providerResponse} from './provider-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {classifyMessage,planDialogueTurn,ENVIRONMENT_QUESTION} from '../public/dialogue-flow.mjs';
import {createAnalyzer,payloadFor} from '../lib/gemini.mjs';
import {providerErrorDiagnostic} from '../lib/provider-diagnostics.mjs';
import {createApp} from '../server.mjs';

const corpus={hash:'compatibility-test',records:[{id:'PSI-1',content:{approach:'Local report on the spread of a flame over a specimen in an experimental chamber.'},tableReferences:[]}]};
const makeRequest=question=>{const flow=planDialogueTurn({question});return {question,flow,scenario:flow.scenario,replyLanguage:flow.replyLanguage,mode:'research',conditions:{},ids:flow.canRank?['PSI-1']:[]};};
const answer=stage=>({stage,summary:'Hangi durumu araştırmak istiyorsunuz?',questions:[],unknowns:[],assessments:[],conditionSuggestions:[],evidenceGaps:[],recommendations:{action:'keep',items:[]},nextStep:stage==='rank'?'Review sources.':'',emergency:false});
const response=value=>Response.json({...providerResponse(value),id:'TEST_ONLY_RESPONSE',model:'TEST_ONLY_MODEL'});

test('exact reported Turkish request and polite variants change language without source retrieval',()=>{
 for(const question of ['türkçe cevap verir misin','Türkçe cevap verir misiniz?','Lütfen Türkçe olarak yanıt verir misin?','Bana Türkçe cevap verebilir misiniz?','Türkçe konuşabilir misin?','Türkçe yazar mısın?','Could you answer in Turkish please?']){
  const f=planDialogueTurn({scenario:'türkçe cevap verir misin',question});
  assert.equal(f.intent,'presentation',question);assert.equal(f.replyLanguage,'tr');assert.equal(f.scenario,'');assert.equal(f.canRank,false);
 }
});
test('language command never removes the existing scientific scenario or consumes mixed factual questions',()=>{
 const f=planDialogueTurn({scenario:'Fiberglass storage.\ntürkçe cevap verir misin',question:'Türkçe yanıt verir misin?'});
 assert.equal(f.scenario,'Fiberglass storage.');assert.equal(f.updateResearch,false);
 for(const q of ['Türkçe cevap verir misin: fiberglass yanar mı?','Türkçe yaz ve oksijen 30 kabul et','Could you answer in Turkish about my storage?','Türkçe konuş yangın çıktı'])assert.equal(classifyMessage(q).intent,'research',q);
});
test('conversation, environment and research all use JSON mode with no compiled provider schema or tools',()=>{
 for(const question of ['Hello',ENVIRONMENT_QUESTION,'Review fiberglass storage']){
  const p=payloadFor(corpus,makeRequest(question));
  assert.deepEqual(Object.keys(p.text).sort(),['format','verbosity']);
  assert.equal(p.text.format.type,'json_object');assert.equal(p.tools,undefined);
  assert.match(p.instructions,/Return JSON only/);
 }
});
test('HTTP language turn uses zero sources; following research keeps the language and uses real local IDs',async()=>{
 const calls=[];const analyzer=createAnalyzer({corpus,key:'TEST_ONLY',fetchImpl:async(u,o)=>{
  const p=JSON.parse(o.body),d=JSON.parse(p.input[0].content[0].text);calls.push(d);
  assert.equal(p.text.format.schema,undefined);assert.equal(p.response_format,undefined);
  return response(answer(d.flow.requiredStage||'rank'));
 }});
 const app=createApp({corpus,analyzer,sessionToken:'test'});await new Promise(r=>app.listen(0,'127.0.0.1',r));
 const send=body=>fetch(`http://127.0.0.1:${app.address().port}/api/research`,{method:'POST',headers:{'Content-Type':'application/json','X-Flame-Session':'test'},body:JSON.stringify(body)});
 try{
  let r=await send({question:'türkçe cevap verir misin',scenario:'türkçe cevap verir misin',conditions:{gravityMs2:8,temperatureK:320,oxygen:30}});
  assert.equal(r.status,200);let v=await r.json();assert.equal(v.analysis.stage,'conversation');assert.equal(v.analysis.recommendationsReviewed,false);
  assert.equal(calls[0].scenario,'');assert.equal(calls[0].replyLanguage,'tr');assert.deepEqual(calls[0].sources,[]);assert.deepEqual(calls[0].evidence,[]);
  assert.equal(v.provider.requestFormat.contract,'json-local-validation-v1');assert.equal(v.provider.requestFormat.sha256.length,64);
  r=await send({question:'I store fiberglass sheets.',replyLanguage:'tr',scenario:''});assert.equal(r.status,200);
  assert.equal(calls[1].replyLanguage,'tr');assert.deepEqual(calls[1].sources.map(x=>x.id),['PSI-1']);assert.equal(calls.length,2);
 }finally{await new Promise(r=>app.close(r));}
});
test('JSON-only transport still rejects false ranking, fabricated references and oversized arrays',async()=>{
 const values=[{...answer('rank'),assessments:[]},{...answer('rank'),assessments:[{sourceId:'PSI-1',evidenceId:'invented'}]},{...answer('rank'),assessments:Array(13).fill({})}];
 for(const [i,v] of values.entries()){
  const analyzer=createAnalyzer({corpus,key:'TEST_ONLY',fetchImpl:async()=>response(v)});
  await assert.rejects(analyzer.analyze(makeRequest(i===0?'türkçe cevap verir misin':'Review storage')),e=>{assert.equal(e.provider.validation,'rejected');return true;});
 }
});
test('provider diagnostic records supplied field paths but not secret or arbitrary detail bodies',()=>{
 const key='TEST_ONLY_PRIVATE_KEY';const d=providerErrorDiagnostic({error:{message:'Rejected '+key,type:'invalid_request_error',code:'invalid_value',param:'text.format',details:{prompt:'PRIVATE_PROMPT',secret:key}}},key);
 assert.equal(d.providerStatus,'invalid_request_error');assert.deepEqual(d.invalidFields,['text.format']);assert.ok(!JSON.stringify(d).includes(key));assert.ok(!JSON.stringify(d).includes('PRIVATE_PROMPT'));
 assert.deepEqual(providerErrorDiagnostic({error:{message:'Request contains an invalid argument.'}}),{message:'The provider rejected the request.',providerStatus:null,invalidFields:[]});
});
test('a generic 400 remains explicitly uncertain, never retries, and a later manual request can succeed',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'flame-provider-'));let calls=0;
 const analyzer=createAnalyzer({corpus,key:'TEST_ONLY_PRIVATE_KEY',runtimeDir:dir,fetchImpl:async()=>++calls===1?Response.json({error:{message:'Request contains an invalid argument.',type:'invalid_request_error'}},{status:400}):response(answer('conversation'))});
 await assert.rejects(analyzer.analyze(makeRequest('türkçe cevap verir misin')),e=>e.code==='OPENAI_400');assert.equal(calls,1);assert.equal(analyzer.status().busy,false);
 const saved=await readFile(path.join(dir,'last-provider-error.json'),'utf8'),d=JSON.parse(saved);assert.deepEqual(d.invalidFields,[]);assert.equal(d.requestFormat.hasResponseJsonSchema,false);assert.equal(d.requestFormat.contract,'json-local-validation-v1');assert.ok(!saved.includes('TEST_ONLY_PRIVATE_KEY'));assert.ok(!saved.includes('türkçe'));
 const next=await analyzer.analyze(makeRequest('türkçe cevap verir misin'));assert.equal(next.provider.validation,'passed');assert.equal(calls,2);
});
