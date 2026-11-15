import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp, readFile, writeFile, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createCredentialStore} from '../lib/credentials.mjs';
import {providerDetails} from '../public/conversation-panel.mjs';
import {createApp} from '../server.mjs';
import {createAnalyzer} from '../lib/openai.mjs';

const SDP='v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n';
const KEY='TEST_ONLY_OPENAI_INTEGRATION';
const corpus={hash:'offline-integration',records:[]};
async function start(options={}) {
 const analyzer=createAnalyzer({corpus,key:'',fetchImpl:async()=>{throw Error('Unexpected research transport');}});
 const app=createApp({corpus,analyzer,sessionToken:'offline-session',...options});
 await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${app.address().port}`;
 return {base,post:(route,body,extra={})=>fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json','X-Flame-Session':'offline-session',Origin:base,...extra},body:JSON.stringify(body)}),close:()=>new Promise(resolve=>{app.close(resolve);app.closeAllConnections();})};
}

test('OpenAI credential lifecycle leaves a legacy Gemini ciphertext untouched',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'flame-openai-isolation-'));
 const legacy=Buffer.from('LEGACY_TEST_CIPHERTEXT');let decryptions=0;
 // Deterministic injected cipher exercises store isolation without opening a real user vault.
 const protect=async(bytes,decrypt=false)=>{if(decrypt){decryptions++;assert.equal(bytes.subarray(0,6).toString(),'MOCK::');return bytes.subarray(6);}return Buffer.concat([Buffer.from('MOCK::'),bytes]);};
 try{
  await writeFile(path.join(dir,'credentials.dpapi'),legacy);
  const store=createCredentialStore(dir,protect);assert.equal(await store.load(),'');assert.equal(decryptions,0);
  await store.save(KEY);assert.equal(await createCredentialStore(dir,protect).load(),KEY);
  assert.deepEqual(await readFile(path.join(dir,'credentials.dpapi')),legacy);
  await store.clear();assert.equal(await store.load(),'');
  assert.deepEqual(await readFile(path.join(dir,'credentials.dpapi')),legacy);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('actual provider receipt renderer labels current and historical responses separately',()=>{
 const openai={requestedModel:'gpt-6.1-sol',modelVersion:'gpt-6.1-sol',httpStatus:200,validation:'passed'};
 const legacy={requestedModel:'gemini-3.1-flash-lite',modelVersion:'gemini-3.1-flash-lite',httpStatus:200,validation:'passed'};
 assert.match(providerDetails(openai),/OpenAI API · response received/);
 assert.match(providerDetails(legacy),/Gemini API · response received/);
 assert.match(providerDetails({...openai,delivery:'cache'}),/Cached OpenAI response · no new API call/);
 assert.match(providerDetails({...legacy,delivery:'cache'}),/Cached Gemini response · no new API call/);
});

test('retired incident routes cannot reach research or incident provider transport',async()=>{
 let providerCalls=0,serviceAccesses=0;
 const analyzer=createAnalyzer({corpus,key:KEY,fetchImpl:async()=>{providerCalls++;throw Error('No upstream request permitted.');}});
 const incidentService=new Proxy({},{get(){serviceAccesses++;throw Error('Retired service must not be used.');}});
 const app=await start({analyzer,incidentService});
 try{
  for(const route of ['/api/incident/session','/api/incident/message','/api/incident/end']){
   const response=await app.post(route,{sdp:SDP,message:'Help',language:'tr'});
   assert.equal(response.status,410);assert.equal((await response.json()).code,'INCIDENT_REMOVED');
  }
  const status=await (await fetch(app.base+'/api/status')).json();assert.equal(Object.hasOwn(status,'incident'),false);
  assert.equal(providerCalls,0);assert.equal(serviceAccesses,0);
 }finally{await app.close();}
});

test('key settings enforce origin and credentials are never served as public assets',async()=>{
 let saved='',calls=0;
 const app=await start({credentialStore:{save:async key=>{calls++;saved=key;},clear:async()=>{saved='';}}});
 try{
  assert.equal((await app.post('/api/settings/key',{key:KEY},{Origin:'https://untrusted.example'})).status,403);assert.equal(calls,0);
  const response=await app.post('/api/settings/key',{key:KEY});assert.equal(response.status,200);assert.ok(!(await response.text()).includes(KEY));assert.equal(saved,KEY);
  for(const route of ['/credentials.openai.dpapi','/credentials.dpapi','/.runtime/credentials.openai.dpapi','/lib/credentials.mjs','/api/settings/key']){
   const result=await fetch(app.base+route);assert.equal(result.status,404,route);assert.ok(!(await result.text()).includes(KEY));
  }
 }finally{await app.close();}
});
