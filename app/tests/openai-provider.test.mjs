import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createAnalyzer,payloadFor,MODEL} from '../lib/openai.mjs';
import {extractResponseText,responseRequestOptions,responseUsage,readOpenAIResponse,responseState} from '../lib/openai-response.mjs';
import {providerErrorDiagnostic,requestDiagnostic,validateJsonModeInput} from '../lib/provider-diagnostics.mjs';
const corpus={hash:'openai-test-only',records:[]};
const request={mode:'research',ids:[],question:'Hello',scenario:'',conditions:{},history:[{role:'user',text:'Use Turkish'}],flow:{requiredStage:'conversation',canRank:false}};
const answer={stage:'conversation',summary:'Hello.',questions:[],unknowns:[],assessments:[],conditionSuggestions:[],evidenceGaps:[],recommendations:{action:'keep',items:[]},nextStep:'',emergency:false};
const raw=(value=answer)=>({id:'resp_TEST',model:MODEL,status:'completed',output:[{type:'reasoning',summary:[]},{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify(value)}]}],usage:{input_tokens:120,output_tokens:35,total_tokens:155,input_tokens_details:{cached_tokens:60},output_tokens_details:{reasoning_tokens:10}}});
test('Responses request preserves source-free current context and explicit model controls',()=>{
 const p=payloadFor(corpus,request),data=JSON.parse(p.input[0].content[0].text);
 assert.equal(p.model,'gpt-6.1-sol');assert.equal(p.store,false);assert.deepEqual(p.reasoning,{effort:'medium'});assert.deepEqual(p.text,{format:{type:'json_object'},verbosity:'low'});assert.equal(p.max_output_tokens,2048);assert.equal(p.temperature,undefined);assert.equal(p.tools,undefined);assert.equal(p.previous_response_id,undefined);assert.deepEqual(data.history,request.history);assert.deepEqual(data.sources,[]);assert.match(p.instructions,/Return JSON only/);
 assert.throws(()=>responseRequestOptions('unknown'),{code:'MODEL_UNSUPPORTED'});assert.throws(()=>responseRequestOptions(MODEL,'ultra'),{code:'REASONING_UNSUPPORTED'});
});
test('typed text excludes reasoning and fails closed on refusal, incomplete and tool output',()=>{
 assert.equal(extractResponseText(raw()),JSON.stringify(answer));
 for(const [value,code] of [[{...raw(),status:'incomplete',incomplete_details:{reason:'max_output_tokens'}},'MODEL_INCOMPLETE'],[{...raw(),status:'failed'},'MODEL_FAILED'],[{...raw(),output:[{type:'message',role:'assistant',content:[{type:'refusal',refusal:'Private reason'}]}]},'MODEL_REFUSAL'],[{...raw(),output:[{type:'function_call',name:'unexpected'}]},'MODEL_OUTPUT_INVALID'],[{...raw(),output:[]},'MODEL_JSON_INVALID']])assert.throws(()=>extractResponseText(value),{code});
 assert.equal(responseUsage(raw()).input_tokens_details.cached_tokens,60);assert.equal(responseUsage(raw()).output_tokens_details.reasoning_tokens,10);assert.deepEqual(responseUsage({usage:{input_tokens:-1,output_tokens:'5'}}),{});
});
test('actual analyzer posts once, records real counts and revalidates disk cache without a key',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'flame-openai-'));let calls=0;
 try{
 const a=createAnalyzer({corpus,key:'TEST_ONLY_SECRET',runtimeDir:dir,fetchImpl:async(url,o)=>{calls++;assert.equal(url,'https://api.openai.com/v1/responses');assert.equal(o.headers.Authorization,'Bearer TEST_ONLY_SECRET');assert.ok(!o.body.includes('TEST_ONLY_SECRET'));return Response.json(raw());}});
 const result=await a.analyze(request);assert.equal(result.provider.name,'OpenAI');assert.equal(result.provider.responseId,'resp_TEST');assert.equal(result.provider.usage.promptTokenCount,120);assert.equal(result.provider.usage.output_tokens,35);assert.equal(a.status().outputTokens,35);assert.equal(result.provider.validation,'passed');
 const restarted=createAnalyzer({corpus,runtimeDir:dir,fetchImpl:()=>assert.fail('cache must not call provider')});const cache=await restarted.analyze(request);assert.equal(cache.cached,true);assert.equal(cache.provider.delivery,'cache');assert.equal(calls,1);assert.ok(!(await readFile(path.join(dir,'last-call.json'),'utf8')).includes('TEST_ONLY_SECRET'));
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('HTTP errors redact keys and never retry; model refusal keeps usage and clears busy',async()=>{
 let calls=0;const a=createAnalyzer({corpus,key:'TEST_SECRET',fetchImpl:async()=>{calls++;return Response.json({error:{type:'rate_limit_error',message:'TEST_SECRET',param:'text.format'}},{status:429});}});
 await assert.rejects(a.analyze(request),e=>e.code==='OPENAI_429'&&e.provider.validation==='not_performed'&&!e.message.includes('TEST_SECRET'));assert.equal(calls,1);assert.equal(a.status().busy,false);
 const b=createAnalyzer({corpus,key:'TEST_SECRET',fetchImpl:async()=>Response.json({...raw(),output:[{type:'message',role:'assistant',content:[{type:'refusal',refusal:'Private prose'}]}]})});
 await assert.rejects(b.analyze(request),e=>e.code==='MODEL_REFUSAL'&&e.provider.validation==='rejected'&&e.provider.usage.input_tokens===120);assert.equal(b.status().busy,false);
 const diagnostic=providerErrorDiagnostic({error:{type:'invalid_request_error',message:'bad TEST_SECRET sk-proj-1234567890',param:'text.format',details:{prompt:'PRIVATE'}}},'TEST_SECRET');assert.equal(diagnostic.providerStatus,'invalid_request_error');assert.deepEqual(diagnostic.invalidFields,['text.format']);assert.ok(!JSON.stringify(diagnostic).includes('TEST_SECRET'));assert.ok(!JSON.stringify(diagnostic).includes('PRIVATE'));
});
test('incomplete responses and fabricated scientific envelopes never populate cache',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'flame-openai-reject-'));
 try{let calls=0;const a=createAnalyzer({corpus,key:'TEST',runtimeDir:dir,fetchImpl:async()=>{calls++;return Response.json({...raw(),status:'incomplete'});}});await assert.rejects(a.analyze(request),{code:'MODEL_INCOMPLETE'});await assert.rejects(a.analyze(request),{code:'MODEL_INCOMPLETE'});assert.equal(calls,2);assert.deepEqual((await readdir(dir)).filter(n=>/^[a-f0-9]{64}\.json$/.test(n)),[]);
 const invalid=createAnalyzer({corpus,key:'TEST',fetchImpl:async()=>Response.json(raw({...answer,stage:'rank',assessments:[{sourceId:'PSI-999',evidenceId:'invented'}]}))});await assert.rejects(invalid.analyze(request),e=>e.code==='RESEARCH_EVIDENCE_INVALID'&&e.provider.validation==='rejected');
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('bounded body reader cancels oversized or malformed streams without exposing body text',async()=>{
 let cancelled=0;
 const response=new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('PRIVATE_BODY_TOO_LARGE'));},cancel(){cancelled++;}}));
 await assert.rejects(readOpenAIResponse(response,{maxBytes:4}),e=>e.code==='PROVIDER_RESPONSE_TOO_LARGE'&&!e.message.includes('PRIVATE'));assert.equal(cancelled,1);
 const broken=new Response('{PRIVATE_JSON_MARKER');await assert.rejects(readOpenAIResponse(broken),e=>e.code==='PROVIDER_RESPONSE_INVALID'&&!e.message.includes('PRIVATE'));
 assert.deepEqual(responseState({status:'incomplete',incomplete_details:{reason:'max_output_tokens'}}),{status:'incomplete',incompleteReason:'max_output_tokens'});
 assert.deepEqual(responseState({status:'incomplete',incomplete_details:{reason:'PRIVATE_REASON'}}),{status:'incomplete',incompleteReason:null});
 assert.deepEqual(responseState({status:'failed',error:{code:'PRIVATE_CODE',message:'PRIVATE_ERROR'}}),{status:'failed',failureCode:null});
 assert.deepEqual(providerErrorDiagnostic({error:{message:'PRIVATE_ERROR',param:'PRIVATE_INPUT'}}),{message:'The provider rejected the request.',providerStatus:null,invalidFields:[]});
});
test('analyzer malformed body and fetch exceptions keep safe receipts and never persist raw input',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'flame-openai-safe-'));
 try{const a=createAnalyzer({corpus,key:'TEST',runtimeDir:dir,fetchImpl:async()=>new Response('{PRIVATE_BODY')});await assert.rejects(a.analyze(request),e=>e.code==='PROVIDER_RESPONSE_INVALID'&&e.provider.httpStatus===200);assert.ok(!(await readFile(path.join(dir,'last-call.json'),'utf8')).includes('PRIVATE_BODY'));assert.equal(a.status().provider,'OpenAI');
 const b=createAnalyzer({corpus,key:'TEST',runtimeDir:dir,fetchImpl:async()=>{throw Error('PRIVATE_FETCH_INPUT');}});await assert.rejects(b.analyze(request),{code:'NETWORK'});assert.ok(!(await readFile(path.join(dir,'last-call.json'),'utf8')).includes('PRIVATE_FETCH_INPUT'));
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('every structured request supplies an explicit input JSON instruction; original shape fails preflight',()=>{
 for(const [mode,stage] of [['research','conversation'],['research','clarify'],['research',null],['chat',null],['analysis',null]]){
  const q={...request,mode,history:[],flow:mode==='research'?{requiredStage:stage,canRank:!stage}:undefined};
  const p=payloadFor(corpus,q),data=JSON.parse(p.input[0].content[0].text);
  assert.equal(data.question,'Hello');assert.equal(p.input[0].content.length,2);assert.match(p.input[0].content[1].text,/Return one JSON object/);assert.doesNotThrow(()=>validateJsonModeInput(p));
  const diagnostic=requestDiagnostic(p,JSON.stringify(p));assert.equal(diagnostic.hasJsonInstructionInInput,true);assert.equal(diagnostic.inputMessageCount,1);assert.equal(diagnostic.inputTextBlockCount,2);assert.ok(!JSON.stringify(diagnostic).includes('Hello'));
  const original={...p,input:[{...p.input[0],content:[p.input[0].content[0]]}]};
  assert.equal(requestDiagnostic(original,JSON.stringify(original)).hasJsonInstructionInInput,false);
  assert.throws(()=>validateJsonModeInput(original),{code:'REQUEST_JSON_INSTRUCTION_MISSING'});
 }
});
test('actual analyzer posts fixed input once and retains safe request diagnostics on input rejection',async()=>{
 let calls=0;const a=createAnalyzer({corpus,key:'TEST_PRIVATE',fetchImpl:async(_url,o)=>{
  calls++;const p=JSON.parse(o.body);validateJsonModeInput(p);assert.equal(JSON.parse(p.input[0].content[0].text).question,'Hello');assert.match(p.input[0].content[1].text,/JSON/);
  return Response.json({error:{type:'invalid_request_error',code:'invalid_value',param:'input',message:'PRIVATE_PROMPT TEST_PRIVATE'}},{status:400});
 }});
 await assert.rejects(a.analyze(request),e=>e.code==='OPENAI_400'&&e.provider.requestFormat.hasJsonInstructionInInput===true&&!e.message.includes('PRIVATE'));assert.equal(calls,1);assert.equal(a.status().busy,false);
 const diagnostic=providerErrorDiagnostic({error:{type:'invalid_request_error',code:'invalid_value',param:'input',message:'PRIVATE_PROMPT TEST_PRIVATE'}},'TEST_PRIVATE');assert.equal(diagnostic.providerCode,'invalid_value');assert.deepEqual(diagnostic.invalidFields,['input']);assert.ok(!JSON.stringify(diagnostic).includes('PRIVATE'));assert.equal(providerErrorDiagnostic({error:{code:'PRIVATE_CODE'}}).providerCode,undefined);
});
