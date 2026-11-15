import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createCredentialStore } from '../lib/credentials.mjs';
import { createAnalyzer } from '../lib/gemini.mjs';
import { createApp } from '../server.mjs';

test('Windows user-bound key survives a fresh store and is encrypted on disk; clear removes it',{skip:process.platform!=='win32'},async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'flame-key-test-'));
  try{const key='TEST_ONLY_local_persistence_0123456789';const a=createCredentialStore(dir);assert.equal(await a.load(),'');await a.save(key);assert.equal((await readFile(path.join(dir,'credentials.openai.dpapi'))).includes(Buffer.from(key)),false);const b=createCredentialStore(dir);assert.equal(await b.load(),key);await b.clear();assert.equal(await a.load(),'');}finally{await rm(dir,{recursive:true,force:true});}
});
test('Settings enforce session/origin, never reflect a key and do not call OpenAI',async()=>{
  let saved='',calls=0;
  const analyzer=createAnalyzer({corpus:{hash:'test',records:[]},fetchImpl:()=>{calls++;throw new Error('unexpected');}});
  const store={save:async value=>{saved=value;},clear:async()=>{saved='';}};
  const app=createApp({corpus:{records:[],hash:'test'},analyzer,credentialStore:store,sessionToken:'session'});
  await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${app.address().port}`;
  const key='TEST_ONLY_settings_key_1234567890';
  const headers={'Content-Type':'application/json','X-Flame-Session':'session'};
  try{assert.equal((await fetch(base+'/api/settings/key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key})})).status,403);assert.equal((await fetch(base+'/api/settings/key',{method:'POST',headers:{...headers,Origin:'https://example.com'},body:JSON.stringify({key})})).status,403);const response=await fetch(base+'/api/settings/key',{method:'POST',headers,body:JSON.stringify({key})});const result=await response.text();assert.equal(response.status,200);assert.equal(result.includes(key),false);assert.equal(saved,key);assert.equal(analyzer.status().configured,true);assert.equal(calls,0);await fetch(base+'/api/settings/key',{method:'POST',headers,body:JSON.stringify({clear:true})});assert.equal(analyzer.status().configured,false);assert.equal(saved,'');}finally{await new Promise(resolve=>app.close(resolve));}
});
