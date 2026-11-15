import {providerResponse} from './provider-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCorpus, IDS, DEFAULT_QUESTION, DEFAULT_CONDITIONS, validateRequest, validateAnalysis, rankRecords } from '../lib/corpus.mjs';
import { createAnalyzer, payloadFor, MODEL } from '../lib/gemini.mjs';
import { createApp } from '../server.mjs';

const corpus=await loadCorpus(process.env.PSI_METADATA_DIR||'C:\\Users\\Ahmet Taha\\Desktop\\Spaceapps\\Inventory_PSI');
const request=validateRequest({question:DEFAULT_QUESTION,ids:IDS,conditions:DEFAULT_CONDITIONS});
const item={kind:'finding',text:'Bu kayıt mikrogravitedeki damlacık alevlerini modelleyen bir çalışmayı açıklıyor.',sourceId:'PSI-117',field:'approach',quote:corpus.records.find(r=>r.id==='PSI-117').content.approach.split('\n')[0],evidenceType:'reported',limitation:"Tekil deney tableları bu dosyada absent."};
const answer={summary:"Sourcelar soğuk alev çalışmaları için yöntem düzeyinde karşılaştırılabilir.",items:[item],unknowns:['Tekil deney sonuçları eksik.'],nextStep:"İlgili deney tablesu kapsamını inceleyin."};
const goodResponse=()=>new Response(JSON.stringify({...providerResponse(answer),usage:{input_tokens:100,output_tokens:50,total_tokens:150}}),{status:200});

test('Legacy four-record fixture retains provenance; portable external corpus is tested separately',()=>{
  assert.deepEqual(corpus.records.map(r=>r.id),IDS);
  for(const record of corpus.records){assert.match(record.sha256,/^[a-f0-9]{64}$/);assert.equal(record.rowCount,0);}
  assert.equal(corpus.records.reduce((n,r)=>n+r.tableReferences.length,0),2);
});
test('User-approved economical model is explicit',()=>assert.equal(MODEL,'gpt-6.1-sol'));
test('Question and numerical bounds reject ambiguous input; blanks remain unknown',()=>{
  assert.equal(request.conditions.oxygen,null);
  assert.throws(()=>validateRequest({...request,ids:['PSI-999']}));
  assert.throws(()=>validateRequest({...request,ids:[]}));
  assert.throws(()=>validateRequest({...request,conditions:{...request.conditions,oxygen:101}}));
  assert.throws(()=>validateRequest({...request,conditions:{...request.conditions,pressure:0}}));
  assert.throws(()=>validateRequest({...request,conditions:{...request.conditions,airflow:'12'}}));
});
test('Ranking chooses relevant cool-flame metadata without probability scores',()=>{
  assert.equal(rankRecords(corpus.records,request)[0].id,'PSI-117');
  assert.equal(rankRecords(corpus.records,{...request,ids:['PSI-107']}).length,1);
});
test('Provider context contains only selected local source text; no web tools',()=>{
  const body=payloadFor(corpus,{...request,ids:['PSI-107']});
  const parsed=JSON.parse(body.input[0].content[0].text);
  assert.deepEqual(parsed.sources.map(s=>s.id),['PSI-107']);
  assert.equal(body.tools,undefined);
  assert.equal(parsed.sources[0].fields.approach,corpus.records[0].content.approach);
  assert.equal(parsed.sources[0].experimentalTableReferences.length,1);
});
test('Invented quotes, unselected sources, invalid fields and unsupported tested solutions are rejected',()=>{
  assert.deepEqual(validateAnalysis(answer,corpus,request),{...answer,recommendationsReviewed:false});
  for(const patch of [{quote:'This quotation does not occur in the allowed metadata.'},{sourceId:'PSI-999'},{field:'publications'},{kind:'candidate',evidenceType:'reported'}])assert.throws(()=>validateAnalysis({...answer,items:[{...item,...patch}]},corpus,request));
  assert.throws(()=>validateAnalysis(answer,corpus,{...request,ids:['PSI-107']}));
});
test('Same input is cached and secret is sent only in provider header',async()=>{
  let calls=0;
  const analyzer=createAnalyzer({corpus,key:'test-only-not-a-real-key',fetchImpl:async(url,options)=>{calls++;assert.ok(url === 'https://api.openai.com/v1/responses');assert.equal(options.headers.Authorization,'Bearer test-only-not-a-real-key');assert.ok(!options.body.includes('test-only-not-a-real-key'));return goodResponse();}});
  const a=await analyzer.analyze(request),b=await analyzer.analyze(request);
  assert.equal(a.cached,false);assert.equal(b.cached,true);assert.equal(calls,1);assert.equal(analyzer.status().cacheHits,1);assert.ok(!JSON.stringify(analyzer.status()).includes('test-only-not-a-real-key'));
});
test('No automatic retry, expensive fallback, or secret reflection after provider failure',async()=>{
  let calls=0;
  const analyzer=createAnalyzer({corpus,key:'private-key',fetchImpl:async()=>{calls++;return new Response('sensitive provider body private-key',{status:429});}});
  await assert.rejects(()=>analyzer.analyze(request),error=>error.code==='OPENAI_429'&&!error.message.includes('private-key'));
  assert.equal(calls,1);assert.equal(analyzer.status().successes,0);
});
test('Concurrent API calls do not consume a second request',async()=>{
  let complete;const wait=new Promise(resolve=>complete=resolve);
  const analyzer=createAnalyzer({corpus,key:'test',fetchImpl:async()=>{await wait;return goodResponse();}});
  const first=analyzer.analyze(request);
  await assert.rejects(()=>analyzer.analyze({...request,question:"Başka bir source sorusu"}),e=>e.code==='BUSY');
  complete();await first;assert.equal(analyzer.status().requests,1);
});
test('Local HTTP routes deny arbitrary files and cross-origin paid requests; source browsing makes zero provider calls',async()=>{
  const analyzer=createAnalyzer({corpus,key:'secret-test',fetchImpl:async()=>{throw new Error('Should not call provider');}});
  const app=createApp({corpus,analyzer,sessionToken:'test-session'});
  await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${app.address().port}`;
  try{
    assert.equal((await fetch(base+'/')).status,200);
    assert.equal((await fetch(base+'/lib/gemini.mjs')).status,404);
    assert.equal((await fetch(base+'/.runtime/usage.json')).status,404);
    assert.equal((await fetch(base+'/api/sources/PSI-999')).status,404);
    const cat=await(await fetch(base+'/api/catalog')).json();assert.equal(cat.records.length,4);assert.ok(!JSON.stringify(cat).includes('secret-test'));
    assert.equal((await fetch(base+'/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request)})).status,403);
    assert.equal((await fetch(base+'/api/analyze',{method:'POST',headers:{'Content-Type':'application/json','X-Flame-Session':'test-session',Origin:'https://external.example'},body:JSON.stringify(request)})).status,403);
    const rank=await fetch(base+'/api/rank',{method:'POST',headers:{'Content-Type':'application/json','X-Flame-Session':'test-session'},body:JSON.stringify(request)});assert.equal(rank.status,200);assert.equal(analyzer.status().requests,0);
  }finally{await new Promise(resolve=>app.close(resolve));}
});
