import {providerResponse} from './provider-fixture.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {createConversationStore,validateConversations} from '../lib/conversations.mjs';
import {createAnalyzer,payloadFor} from '../lib/gemini.mjs';
import {createApp} from '../server.mjs';
import {researchEvidence,resolveResearchEvidence} from '../lib/research-evidence.mjs';
const quote='The local study discusses flame spread over PMMA sheets with reported experiment conditions.';
const corpus={hash:'conversation-test',records:[{id:'PSI-1',content:{approach:quote},tableReferences:[]}]};
const request={mode:'research',ids:['PSI-1'],question:'I store 100 g of PMMA.',scenario:'I store 100 g of PMMA.',conditions:{material:'pmma'}};
const assessment={sourceId:'PSI-1',evidenceId:researchEvidence(corpus,request.ids)[0].id,rubric:{objective:1,setting:.5,material:1,mechanism:.5},reason:'Reported PMMA research.',limitation:'Not a storage fire prediction.'};
const answer={stage:'rank',summary:'A local source discusses this material.',questions:[],assessments:[assessment],conditionSuggestions:[],unknowns:['Geometry is unspecified.'],nextStep:'Review the source.',emergency:false};
const raw=value=>({...providerResponse(value),id:'TEST_RESPONSE',model:'TEST_MODEL_VERSION',usage:{input_tokens:100,output_tokens:40,total_tokens:140}});
const state=()=>({revision:0,activeId:'one',conversations:[{id:'one',title:'PMMA storage',messages:[{id:'u1',role:'user',text:request.question,at:'2026-11-14T10:00:00Z'}],context:{scenario:request.scenario,conditions:{oxygen:30,airflow:0}}}]});

test('evidence references resolve to exact local excerpts; missing/foreign IDs fail closed',()=>{
 const payload=JSON.parse(payloadFor(corpus,request).input[0].content[0].text);assert.equal(payload.evidence[0].quote,quote);
 const resolved=resolveResearchEvidence(answer,corpus,request);assert.equal(resolved.assessments[0].quote,quote);assert.equal(resolved.assessments[0].field,'approach');
 for(const a of [{...assessment,evidenceId:'made-up'},{...assessment,sourceId:'PSI-999'}])assert.throws(()=>resolveResearchEvidence({...answer,assessments:[a]},corpus,request));
 assert.deepEqual(researchEvidence(corpus,[]),[]);
});
test('actual analyzer preserves provider receipts, caches without a call, and sanitizes cache readback',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'flame-receipt-'));let calls=0;
 const analyzer=createAnalyzer({corpus,key:'TEST_ONLY',runtimeDir:dir,fetchImpl:async()=>{calls++;return Response.json(raw(answer));}});
 const r=await analyzer.analyze(request);assert.equal(r.analysis.assessments[0].quote,quote);assert.equal(r.provider.httpStatus,200);assert.equal(r.provider.responseId,'TEST_RESPONSE');assert.equal(r.provider.modelVersion,'TEST_MODEL_VERSION');assert.equal(r.provider.validation,'passed');
 const cached=await analyzer.analyze(request);assert.equal(cached.provider.delivery,'cache');assert.equal(calls,1);
 const restarted=createAnalyzer({corpus,runtimeDir:dir,fetchImpl:()=>{throw Error('No network expected');}});assert.equal((await restarted.analyze(request)).provider.responseId,'TEST_RESPONSE');
 assert.ok(!(await readFile(path.join(dir,'last-call.json'),'utf8')).includes('TEST_ONLY'));
});
test('invalid model quote retains provider receipt but exposes no unvalidated scientific answer',async()=>{
 let calls=0;const a=createAnalyzer({corpus,key:'TEST_ONLY',fetchImpl:async()=>{calls++;return Response.json(raw({...answer,assessments:[{...assessment,evidenceId:'unknown'}]}));}});
 await assert.rejects(a.analyze(request),e=>e.provider?.validation==='rejected'&&e.provider?.responseId==='TEST_RESPONSE'&&e.provider?.httpStatus===200);
 assert.equal(calls,1);assert.equal(a.status().successes,0);
});
test('HTTP validation failures retain receipt; network errors do not pretend a model answered',async()=>{
 const analyzer=createAnalyzer({corpus,key:'TEST_ONLY',fetchImpl:async()=>Response.json(raw({...answer,assessments:[{...assessment,evidenceId:'invalid'}]}))});
 const app=createApp({corpus,analyzer,sessionToken:'test'});await new Promise(r=>app.listen(0,'127.0.0.1',r));
 try{const r=await fetch(`http://127.0.0.1:${app.address().port}/api/research`,{method:'POST',headers:{'Content-Type':'application/json','X-Flame-Session':'test'},body:JSON.stringify({...request,conditions:{gravity:'other',material:'pmma'}})});assert.equal(r.status,502);const d=await r.json();assert.equal(d.provider.responseId,'TEST_RESPONSE');assert.equal(d.analysis,undefined);}finally{await new Promise(r=>app.close(r));}
 const broken=createAnalyzer({corpus,key:'TEST_ONLY',fetchImpl:async()=>{throw Error('fetch failed');}});await assert.rejects(broken.analyze(request),e=>e.code==='NETWORK'&&e.provider.httpStatus===null&&e.provider.responseId===null);
});
test('history survives process-store replacement with environment zero, failed turns and multiple conversations',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'flame-history-'));const store=createConversationStore(dir),s=state();s.conversations[0].messages.push({id:'e1',role:'application',text:'Unverified source.',failed:true,provider:{httpStatus:200,validation:'rejected'}});
 assert.equal((await store.save(s)).revision,1);const restored=await createConversationStore(dir).read();assert.equal(restored.conversations[0].context.conditions.airflow,0);assert.equal(restored.conversations[0].messages[1].role,'application');
 restored.conversations.push({id:'two',title:'New scenario',messages:[],context:{}});restored.activeId='two';await store.save(restored);assert.equal((await store.read()).conversations[0].messages.length,2);
 assert.ok((await readFile(path.join(dir,'conversations.json.bak'),'utf8')).includes('PMMA storage'));
});
test('stale history updates and corrupt files preserve recorded data',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'flame-history-conflict-'));const store=createConversationStore(dir);await store.save(state());await assert.rejects(store.save(state()),e=>e.status===409);assert.equal((await store.read()).revision,1);
 await writeFile(path.join(dir,'conversations.json'),'invalid json');await assert.rejects(store.read());await assert.rejects(store.save(state()));assert.equal(await readFile(path.join(dir,'conversations.json'),'utf8'),'invalid json');
});
test('history allowlist removes arbitrary fields and enforces limits without silent truncation',()=>{
 const s=state();s.key='DO_NOT_SAVE';s.conversations[0].messages[0].html='<script>bad</script>';const safe=validateConversations(s);assert.equal(safe.key,undefined);assert.equal(safe.conversations[0].messages[0].html,undefined);
 assert.throws(()=>validateConversations({...s,activeId:'missing'}));assert.throws(()=>validateConversations({...s,conversations:Array(51).fill(s.conversations[0])}));
});
test('history reads and writes require session authentication',async()=>{
 const app=createApp({corpus,analyzer:{status:()=>({configured:false})},sessionToken:'test'});await new Promise(r=>app.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${app.address().port}/api/conversations`;
 try{assert.equal((await fetch(url)).status,403);assert.equal((await fetch(url,{headers:{'X-Flame-Session':'test'}})).status,200);assert.equal((await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','X-Flame-Session':'test',Origin:'https://invalid.example'},body:JSON.stringify(state())})).status,403);}finally{await new Promise(r=>app.close(r));}
});


test('historical Gemini conversation receipts survive beside new OpenAI receipts without reinterpretation',async()=>{
 const store=createConversationStore(),saved=state();
 const historical={httpStatus:200,responseId:'HISTORICAL_GEMINI_RESPONSE',modelVersion:'gemini-3.1-flash-lite',validation:'passed',usageMetadata:{promptTokenCount:100,candidatesTokenCount:40,totalTokenCount:140}};
 saved.conversations[0].messages.push({id:'historical',role:'assistant',text:'Previously saved source discussion.',response:{analysis:answer,model:'gemini-3.1-flash-lite',provider:historical}});
 const current={httpStatus:200,responseId:'CURRENT_OPENAI_RESPONSE',modelVersion:'gpt-6.1-sol',validation:'passed',usageMetadata:{promptTokenCount:100,candidatesTokenCount:40,totalTokenCount:140}};
 saved.conversations[0].messages.push({id:'current',role:'assistant',text:'New source discussion.',response:{analysis:answer,model:'gpt-6.1-sol',provider:current}});
 await store.save(saved);const restored=await store.read();
 assert.deepEqual(restored.conversations[0].messages[1].response.provider,historical);
 assert.equal(restored.conversations[0].messages[1].response.model,'gemini-3.1-flash-lite');
 assert.deepEqual(restored.conversations[0].messages[2].response.provider,current);
 assert.equal(restored.conversations[0].messages[2].response.model,'gpt-6.1-sol');
});
