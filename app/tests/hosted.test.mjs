import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {createHostedServer} from '../hosted.mjs';
import {hostedAnalyzer,hostedOrigin} from '../lib/hosted-sessions.mjs';
import {fixture} from './dataset-fixture.mjs';
import {loadDataset} from '../lib/dataset.mjs';

const root=await mkdtemp(path.join(os.tmpdir(),'spaceapps-hosted-'));
await fixture(root);const dataset=await loadDataset(root);
const origin='https://spaceapps.example',host='spaceapps.example';
// Native HTTP preserves the public Host header as nginx does; Node fetch may
// replace that header with the loopback URL authority.
function localFetch(url,options={}){return new Promise((resolve,reject)=>{
  const request=http.request(url,{method:options.method||'GET',headers:options.headers},response=>{const chunks=[];response.on('data',chunk=>chunks.push(chunk));response.on('end',()=>{const headers=new Headers();for(const [name,value] of Object.entries(response.headers))if(value!==undefined)headers.set(name,Array.isArray(value)?value.join(', '):value);resolve(new Response(Buffer.concat(chunks),{status:response.statusCode,headers}));});});
  request.on('error',reject);if(options.body)request.write(options.body);request.end();
});}
const mock=()=>({status:()=>({requests:1,successes:1}),analyze:async request=>({analysis:{answerType:'conversation',summary:'Mock answer',items:[],unknowns:[],nextStep:''},request})});
async function start(options={}){
  const stateDirectory=options.stateDirectory||await mkdtemp(path.join(root,'state-'));
  const app=await createHostedServer({dataset,key:'TEST_ONLY_PRIVATE_KEY',publicOrigin:origin,stateDirectory,analyzerFactory:mock,...options});
  await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+app.address().port;
  const get=(route,headers={})=>localFetch(base+route,{headers:{Host:host,...headers}});
  const post=(route,body,visitor,headers={})=>localFetch(base+route,{method:'POST',headers:{Host:host,Origin:origin,'Content-Type':'application/json',Cookie:visitor.cookie,'X-Flame-Session':visitor.token,...headers},body:JSON.stringify(body)});
  const visitor=async cookie=>{const response=await get('/api/catalog',cookie?{Cookie:cookie}:{});assert.equal(response.status,200);const catalog=await response.json();return {cookie:response.headers.get('set-cookie')?.split(';')[0]||cookie,token:catalog.sessionToken,catalog,response};};
  return {app,base,stateDirectory,get,post,visitor,close:()=>new Promise(resolve=>app.close(resolve))};
}
const history=text=>({revision:0,activeId:'chat-one',conversations:[{id:'chat-one',title:text,messages:[{id:'m1',role:'user',text}],context:{}}]});

test('hosted catalog is anonymous, full-dataset backed, secret-free and browser-isolated',async()=>{
  const s=await start();try{
    const a=await s.visitor(),b=await s.visitor();assert.notEqual(a.cookie,b.cookie);assert.notEqual(a.token,b.token);
    assert.match(a.response.headers.get('set-cookie'),/HttpOnly; SameSite=Lax; Max-Age=31536000; Secure/);
    assert.equal(a.catalog.status.hosted,true);assert.equal(a.catalog.status.canSaveKey,false);assert.equal(a.catalog.status.canShutdown,false);assert.equal(a.catalog.status.applicationDirectory,undefined);
    assert.equal(a.catalog.status.dataset.state,'ready');assert.equal(a.catalog.records.length,dataset.corpus.records.length);
    assert.ok(!JSON.stringify(a.catalog).includes('TEST_ONLY_PRIVATE_KEY'));
    assert.equal((await s.post('/api/conversations',history('PRIVATE_A'),a)).status,200);
    const own=await(await s.get('/api/conversations',{Cookie:a.cookie,'X-Flame-Session':a.token})).json();assert.equal(own.conversations[0].title,'PRIVATE_A');
    const other=await(await s.get('/api/conversations',{Cookie:b.cookie,'X-Flame-Session':b.token})).json();assert.deepEqual(other.conversations,[]);
    assert.equal((await s.get('/api/conversations',{Cookie:b.cookie,'X-Flame-Session':a.token})).status,403);
    assert.equal((await s.post('/api/conversations',history('OVERWRITE'),b,{'X-Flame-Session':a.token})).status,403);
    const file=await s.get('/api/files/f0',{Cookie:a.cookie});assert.equal(file.status,200);assert.match(await file.text(),/21,101.3/);
  }finally{await s.close();}
});

test('anonymous history and CSRF identity survive context eviction and service restart',async()=>{
  let now=100;const stateDirectory=await mkdtemp(path.join(root,'restart-'));
  let s=await start({stateDirectory,sessionOptions:{now:()=>now,idleMs:1000,maxIdleContexts:1}});let a;
  try{a=await s.visitor();assert.equal((await s.post('/api/conversations',history('RESTORE_ME'),a)).status,200);now+=2000;s.app.hostedSessions.prune();assert.equal(s.app.hostedSessions.size,0);const restored=await s.visitor(a.cookie);assert.equal(restored.token,a.token);}finally{await s.close();}
  s=await start({stateDirectory});try{const restored=await s.visitor(a.cookie);assert.equal(restored.token,a.token);const saved=await(await s.get('/api/conversations',{Cookie:a.cookie,'X-Flame-Session':a.token})).json();assert.equal(saved.conversations[0].title,'RESTORE_ME');}finally{await s.close();}
});

test('public origin is explicit; forged cookie, foreign origin and admin calls cannot alter another session',async()=>{
  const s=await start();try{
    const a=await s.visitor();
    assert.equal((await s.get('/api/catalog',{Host:'attacker.example'})).status,403);
    assert.equal((await s.get('/api/catalog',{Origin:'https://attacker.example'})).status,403);
    assert.equal((await s.post('/api/conversations',history('x'),a,{Origin:'null'})).status,403);
    assert.equal((await s.post('/api/settings/key',{key:'evil'},a)).status,404);
    assert.equal((await s.post('/api/shutdown',{},a)).status,404);
    const forged=await s.visitor(a.cookie.slice(0,-1)+(a.cookie.endsWith('0')?'1':'0'));assert.notEqual(forged.token,a.token);
    const health=await s.get('/healthz');assert.equal(health.status,200);assert.equal(health.headers.get('set-cookie'),null);assert.equal((await health.json()).state,'ready');
    assert.equal((await s.get('/.hosted-state/session-secret')).status,404);
    assert.equal((await s.get('/hosted.mjs')).status,404);
  }finally{await s.close();}
  for(const value of ['https://user:password@spaceapps.example','https://spaceapps.example/path','https://spaceapps.example?x=1','file:///tmp'])assert.throws(()=>hostedOrigin(value));
});

test('two visitors analyze concurrently; one visitor cannot overlap paid calls',async()=>{
  const pending=[];let calls=0;
  const s=await start({analyzerFactory:options=>({status:()=>({requests:1}),analyze:async request=>{assert.equal(options.corpus,dataset.corpus);assert.equal(typeof options.contextProvider,'function');calls++;await new Promise(resolve=>pending.push(resolve));return {analysis:{summary:request.question},request};}})});
  try{
    const a=await s.visitor(),b=await s.visitor();const first=s.post('/api/chat',{question:'hello',ids:[]},a);
    while(calls<1)await new Promise(resolve=>setTimeout(resolve,5));
    assert.equal((await s.post('/api/chat',{question:'another',ids:[]},a)).status,409);
    const second=s.post('/api/chat',{question:'hello B',ids:[]},b);
    while(calls<2)await new Promise(resolve=>setTimeout(resolve,5));
    pending.forEach(resolve=>resolve());assert.equal((await first).status,200);assert.equal((await second).status,200);assert.equal(calls,2);
    const statusA=await(await s.get('/api/status',{Cookie:a.cookie})).json();assert.equal(statusA.requests,1);
  }finally{pending.forEach(resolve=>resolve());await s.close();}
});

test('hosted analyzer releases response caches after each call and rejects concurrent context loading',async()=>{
  let builds=0,release;const gate=new Promise(resolve=>release=resolve);
  const analyzer=hostedAnalyzer({options:{key:'TEST_ONLY',model:'mock'},factory:()=>{builds++;return {status:()=>({requests:1,successes:1}),analyze:async()=>{await gate;return {analysis:{summary:'ok'}};}};}});
  const pending=analyzer.analyze({});assert.equal(analyzer.status().busy,true);await assert.rejects(()=>analyzer.analyze({}),error=>error.code==='BUSY');release();await pending;await analyzer.analyze({});assert.equal(builds,2);assert.equal(analyzer.status().requests,2);assert.equal(analyzer.status().busy,false);
});

test('disconnecting a browser does not evict its still-running model request or allow a duplicate call',async()=>{
  let now=100,calls=0,release;const gate=new Promise(resolve=>release=resolve);
  const s=await start({sessionOptions:{now:()=>now,idleMs:1000,maxIdleContexts:0},analyzerFactory:()=>({status:()=>({requests:1}),analyze:async()=>{calls++;await gate;return {analysis:{summary:'completed'}};}})});
  try{
    const a=await s.visitor();const request=http.request(s.base+'/api/chat',{method:'POST',headers:{Host:host,Origin:origin,'Content-Type':'application/json',Cookie:a.cookie,'X-Flame-Session':a.token}});request.on('error',()=>{});request.end(JSON.stringify({question:'hello',ids:[]}));
    while(calls<1)await new Promise(resolve=>setTimeout(resolve,5));request.destroy();await new Promise(resolve=>setTimeout(resolve,10));now+=2000;s.app.hostedSessions.prune();assert.equal(s.app.hostedSessions.size,1);
    assert.equal((await s.post('/api/chat',{question:'duplicate',ids:[]},a)).status,409);assert.equal(calls,1);release();
  }finally{release();await s.close();}
});

test('missing hosted model key leaves source browsing usable without advertising personal key controls',async()=>{
  let calls=0;const s=await start({key:'',analyzerFactory:()=>{calls++;throw Error('Provider must not run');}});
  try{const a=await s.visitor();assert.equal(a.catalog.status.configured,false);const response=await s.post('/api/chat',{question:'hi'},a);assert.equal(response.status,503);assert.match((await response.json()).error,/server/);assert.equal(calls,0);assert.equal((await s.get('/api/sources/PSI-25')).status,200);}finally{await s.close();}
});

test('hosted source errors do not expose filesystem paths',async()=>{
  const broken={...dataset,file:async()=>{throw Object.assign(Error("ENOENT /srv/private/secret-document"),{code:'ENOENT'});}};
  const s=await start({dataset:broken});try{const response=await s.get('/api/files/f0');assert.equal(response.status,502);assert.ok(!(await response.text()).includes('/srv/private'));}finally{await s.close();}
});

test('hosted UI hides personal key controls and labels remote history accurately',async()=>{
  const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');const conversation=await readFile(new URL('../public/conversation-panel.mjs',import.meta.url),'utf8');
  assert.match(app,/\$\('#key-form'\)\.hidden=!s\.canSaveKey/);assert.match(app,/hosted:catalog\.status\?\.hosted===true/);assert.match(conversation,/Saved for this browser on the server/);
});

test('source focus banner stays inside the collapsible grid child',async()=>{
  const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
  assert.match(app,/\$\('#ai-panel \.ai-panel-inner'\)\.prepend\(banner\)/);
  assert.doesNotMatch(app,/\$\('#ai-panel'\)\.prepend\(banner\)/);
});
